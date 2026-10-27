import random
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import mask_phone_number
from app.models.entities import (
    Appointment, AppointmentEvent, Patient, PHC, User, UserRole,
    AppointmentStatus, NotificationLog, AuditEvent, Screening
)
from app.schemas.all_schemas import (
    AppointmentCreate, AppointmentResponse, AppointmentReschedule, AppointmentCancel
)
from app.integrations.sms.adapter import (
    sms_adapter, format_appointment_sms, format_reschedule_sms, format_cancellation_sms
)
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/appointments", tags=["Appointments"])

def calculate_arrival_time(scheduled_time_str: str) -> str:
    """Calculates arrival time 30 minutes prior to scheduled time (e.g. 11:00 -> 10:30)."""
    try:
        t = datetime.strptime(scheduled_time_str.strip(), "%H:%M")
        arr = t - timedelta(minutes=30)
        return arr.strftime("%H:%M")
    except Exception:
        return scheduled_time_str

def generate_appointment_ref(db: Session) -> str:
    while True:
        num = random.randint(10000, 99999)
        ref = f"APT-2026-{num}"
        existing = db.query(Appointment).filter(Appointment.reference_id == ref).first()
        if not existing:
            return ref

@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    payload: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.PHC_STAFF, UserRole.DOCTOR, UserRole.ADMIN]))
):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    phc = db.query(PHC).filter(PHC.id == payload.phc_id).first()
    if not phc:
        raise HTTPException(status_code=404, detail="PHC not found.")

    # Prevent doctor double-booking if doctor specified
    if payload.doctor_id:
        existing_conflict = db.query(Appointment).filter(
            Appointment.doctor_id == payload.doctor_id,
            Appointment.scheduled_date == payload.scheduled_date,
            Appointment.scheduled_time == payload.scheduled_time,
            Appointment.status.in_([AppointmentStatus.SCHEDULED, AppointmentStatus.WAITING_FOR_DOCTOR, AppointmentStatus.IN_CONSULTATION])
        ).first()
        if existing_conflict:
            raise HTTPException(status_code=400, detail="Doctor already has an active appointment at this date and time.")

    arrival_time = calculate_arrival_time(payload.scheduled_time)
    ref_id = generate_appointment_ref(db)

    appointment = Appointment(
        reference_id=ref_id,
        patient_id=patient.id,
        phc_id=phc.id,
        doctor_id=payload.doctor_id,
        screening_id=payload.screening_id,
        scheduled_date=payload.scheduled_date,
        scheduled_time=payload.scheduled_time,
        expected_arrival_time=arrival_time,
        appointment_type=payload.appointment_type,
        status=AppointmentStatus.SCHEDULED
    )
    db.add(appointment)
    db.flush()

    # Log Appointment Event
    event = AppointmentEvent(
        appointment_id=appointment.id,
        previous_status=None,
        new_status=AppointmentStatus.SCHEDULED.value,
        changed_by_user_id=current_user.id,
        reason="Initial booking created by staff."
    )
    db.add(event)

    # Queue SMS confirmation
    sms_text = format_appointment_sms(payload.scheduled_date, payload.scheduled_time, phc.name)
    sms_res = await sms_adapter.send_sms(patient.phone, sms_text, message_type="appointment_scheduled")

    notif = NotificationLog(
        recipient_phone=patient.phone,
        message_type="appointment_scheduled",
        content=sms_text,
        provider=sms_res["provider"],
        provider_message_id=sms_res.get("provider_message_id"),
        delivery_status=sms_res["delivery_status"],
        error_message=sms_res.get("error")
    )
    db.add(notif)

    # Audit event
    audit = AuditEvent(
        user_id=current_user.id,
        action="BOOK_APPOINTMENT",
        entity_type="Appointment",
        entity_id=ref_id,
        details=f"Booked appointment {ref_id} for {patient.full_name} on {payload.scheduled_date} at {payload.scheduled_time}."
    )
    db.add(audit)
    db.commit()
    db.refresh(appointment)

    return AppointmentResponse(
        id=appointment.id,
        reference_id=appointment.reference_id,
        patient_id=patient.id,
        patient_id_display=patient.patient_id_display,
        patient_name=patient.full_name,
        patient_phone_masked=mask_phone_number(patient.phone),
        phc_id=phc.id,
        phc_name=phc.name,
        doctor_id=appointment.doctor_id,
        doctor_name=appointment.doctor.full_name if appointment.doctor else None,
        screening_id=appointment.screening_id,
        scheduled_date=appointment.scheduled_date,
        scheduled_time=appointment.scheduled_time,
        expected_arrival_time=appointment.expected_arrival_time,
        appointment_type=appointment.appointment_type,
        status=appointment.status.value,
        checkin_time=appointment.checkin_time,
        created_at=appointment.created_at
    )

@router.get("", response_model=List[AppointmentResponse])
def list_appointments(
    date: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    phc_id: Optional[int] = Query(None),
    doctor_id: Optional[int] = Query(None),
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Appointment)

    if current_user.role in [UserRole.CHW, UserRole.PHC_STAFF] and current_user.phc_id:
        query = query.filter(Appointment.phc_id == current_user.phc_id)
    elif phc_id:
        query = query.filter(Appointment.phc_id == phc_id)

    if doctor_id:
        query = query.filter(Appointment.doctor_id == doctor_id)
    if date:
        query = query.filter(Appointment.scheduled_date == date)
    if status:
        query = query.filter(Appointment.status == status)

    appointments = query.order_by(Appointment.scheduled_date.asc(), Appointment.scheduled_time.asc()).limit(limit).all()

    results = []
    for a in appointments:
        p = a.patient
        results.append(AppointmentResponse(
            id=a.id,
            reference_id=a.reference_id,
            patient_id=p.id,
            patient_id_display=p.patient_id_display,
            patient_name=p.full_name,
            patient_phone_masked=mask_phone_number(p.phone),
            phc_id=a.phc_id,
            phc_name=a.phc.name if a.phc else "",
            doctor_id=a.doctor_id,
            doctor_name=a.doctor.full_name if a.doctor else None,
            screening_id=a.screening_id,
            scheduled_date=a.scheduled_date,
            scheduled_time=a.scheduled_time,
            expected_arrival_time=a.expected_arrival_time,
            appointment_type=a.appointment_type,
            status=a.status.value,
            checkin_time=a.checkin_time,
            created_at=a.created_at
        ))
    return results

@router.put("/{id}/reschedule", response_model=AppointmentResponse)
async def reschedule_appointment(
    id: int,
    payload: AppointmentReschedule,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.PHC_STAFF, UserRole.DOCTOR, UserRole.ADMIN]))
):
    apt = db.query(Appointment).filter(Appointment.id == id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    if not payload.reason or len(payload.reason.strip()) < 5:
        raise HTTPException(status_code=400, detail="Mandatory documented reason required for rescheduling.")

    prev_status = apt.status.value
    apt.scheduled_date = payload.new_date
    apt.scheduled_time = payload.new_time
    apt.expected_arrival_time = calculate_arrival_time(payload.new_time)
    apt.status = AppointmentStatus.RESCHEDULED
    apt.reschedule_reason = payload.reason.strip()

    event = AppointmentEvent(
        appointment_id=apt.id,
        previous_status=prev_status,
        new_status=AppointmentStatus.RESCHEDULED.value,
        changed_by_user_id=current_user.id,
        reason=f"Rescheduled to {payload.new_date} {payload.new_time}. Reason: {payload.reason}"
    )
    db.add(event)

    # Queue Reschedule SMS
    sms_text = format_reschedule_sms(payload.new_date, payload.new_time, apt.phc.name, payload.reason)
    await sms_adapter.send_sms(apt.patient.phone, sms_text, message_type="appointment_rescheduled")

    db.commit()
    db.refresh(apt)

    p = apt.patient
    return AppointmentResponse(
        id=apt.id,
        reference_id=apt.reference_id,
        patient_id=p.id,
        patient_id_display=p.patient_id_display,
        patient_name=p.full_name,
        patient_phone_masked=mask_phone_number(p.phone),
        phc_id=apt.phc_id,
        phc_name=apt.phc.name,
        doctor_id=apt.doctor_id,
        doctor_name=apt.doctor.full_name if apt.doctor else None,
        screening_id=apt.screening_id,
        scheduled_date=apt.scheduled_date,
        scheduled_time=apt.scheduled_time,
        expected_arrival_time=apt.expected_arrival_time,
        appointment_type=apt.appointment_type,
        status=apt.status.value,
        checkin_time=apt.checkin_time,
        created_at=apt.created_at
    )

@router.put("/{id}/cancel", response_model=AppointmentResponse)
async def cancel_appointment(
    id: int,
    payload: AppointmentCancel,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.PHC_STAFF, UserRole.DOCTOR, UserRole.ADMIN]))
):
    apt = db.query(Appointment).filter(Appointment.id == id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    if not payload.reason or len(payload.reason.strip()) < 5:
        raise HTTPException(status_code=400, detail="Documented reason required for cancellation.")

    prev_status = apt.status.value
    apt.status = AppointmentStatus.CANCELLED
    apt.cancellation_reason = payload.reason.strip()

    event = AppointmentEvent(
        appointment_id=apt.id,
        previous_status=prev_status,
        new_status=AppointmentStatus.CANCELLED.value,
        changed_by_user_id=current_user.id,
        reason=f"Cancelled: {payload.reason}"
    )
    db.add(event)

    # Queue Cancellation SMS
    sms_text = format_cancellation_sms(apt.phc.name, payload.reason)
    await sms_adapter.send_sms(apt.patient.phone, sms_text, message_type="appointment_cancelled")

    db.commit()
    db.refresh(apt)

    p = apt.patient
    return AppointmentResponse(
        id=apt.id,
        reference_id=apt.reference_id,
        patient_id=p.id,
        patient_id_display=p.patient_id_display,
        patient_name=p.full_name,
        patient_phone_masked=mask_phone_number(p.phone),
        phc_id=apt.phc_id,
        phc_name=apt.phc.name,
        doctor_id=apt.doctor_id,
        doctor_name=apt.doctor.full_name if apt.doctor else None,
        screening_id=apt.screening_id,
        scheduled_date=apt.scheduled_date,
        scheduled_time=apt.scheduled_time,
        expected_arrival_time=apt.expected_arrival_time,
        appointment_type=apt.appointment_type,
        status=apt.status.value,
        checkin_time=apt.checkin_time,
        created_at=apt.created_at
    )
