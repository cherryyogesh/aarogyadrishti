import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.entities import (
    Appointment, Consultation, AppointmentStatus, AppointmentEvent,
    User, UserRole, AuditEvent
)
from app.schemas.all_schemas import DoctorQueueItem, ConsultationAcceptResponse
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/doctor", tags=["Doctor Queue & Telemedicine"])

@router.get("/waiting-queue", response_model=List[DoctorQueueItem])
def get_doctor_waiting_queue(
    phc_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.PHC_STAFF, UserRole.ADMIN]))
):
    query = db.query(Appointment).filter(
        Appointment.status.in_([
            AppointmentStatus.WAITING_FOR_DOCTOR,
            AppointmentStatus.IN_CONSULTATION
        ])
    )

    if current_user.role == UserRole.DOCTOR:
        # Show cases assigned to this doctor or unassigned waiting cases at PHC
        if current_user.phc_id:
            query = query.filter((Appointment.doctor_id == current_user.id) | (Appointment.doctor_id.is_(None)))
    elif phc_id:
        query = query.filter(Appointment.phc_id == phc_id)

    appointments = query.order_by(Appointment.checkin_time.asc()).all()
    now = datetime.now(timezone.utc)

    queue = []
    for apt in appointments:
        p = apt.patient
        waiting_mins = 0
        if apt.checkin_time:
            chk = apt.checkin_time
            if chk.tzinfo is None:
                chk = chk.replace(tzinfo=timezone.utc)
            waiting_mins = max(0, int((now - chk).total_seconds() // 60))

        scr = apt.screening
        queue.append(DoctorQueueItem(
            appointment_id=apt.id,
            reference_id=apt.reference_id,
            patient_id=p.id,
            patient_id_display=p.patient_id_display,
            patient_name=p.full_name,
            patient_age=p.age,
            patient_gender=p.gender,
            mandal=getattr(p, 'mandal', 'G. Madugula') or 'G. Madugula',
            phc_name=apt.phc.name if apt.phc else "",
            scheduled_time=apt.scheduled_time,
            checkin_time=apt.checkin_time or now,
            waiting_minutes=waiting_mins,
            oral_site=scr.oral_site.value if scr and hasattr(scr, 'oral_site') and scr.oral_site else None,
            lesion_type=scr.lesion_type.value if scr and hasattr(scr, 'lesion_type') and scr.lesion_type else None,
            screening_category=getattr(scr, 'category', 'mouth') if scr else "mouth",
            screening_symptoms=scr.symptoms if scr else None,
            status=apt.status.value
        ))

    return queue

@router.post("/accept/{appointment_id}", response_model=ConsultationAcceptResponse)
def accept_patient_case(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.PHC_STAFF, UserRole.ADMIN]))
):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    valid_statuses = [
        AppointmentStatus.SCHEDULED,
        AppointmentStatus.WAITING_FOR_DOCTOR,
        AppointmentStatus.IN_CONSULTATION,
        AppointmentStatus.CHECKED_IN,
        AppointmentStatus.RESCHEDULED
    ]
    if apt.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot start video conference in current status '{apt.status.value}'."
        )

    now = datetime.now(timezone.utc)
    if not apt.checkin_time:
        apt.checkin_time = now

    # Assign doctor if not already assigned and current user is doctor
    if current_user.role == UserRole.DOCTOR:
        apt.doctor_id = current_user.id
    elif not apt.doctor_id:
        doc = db.query(User).filter(User.role == UserRole.DOCTOR).first()
        if doc:
            apt.doctor_id = doc.id

    prev_status = apt.status.value
    apt.status = AppointmentStatus.IN_CONSULTATION
    if not apt.consultation_start_time:
        apt.consultation_start_time = now

    event = AppointmentEvent(
        appointment_id=apt.id,
        previous_status=prev_status,
        new_status=AppointmentStatus.IN_CONSULTATION.value,
        changed_by_user_id=current_user.id,
        reason=f"Telemedicine video conference connected between PHC and Doctor by {current_user.full_name} ({current_user.role.value})."
    )
    db.add(event)

    # Create or retrieve Consultation entity
    consultation = db.query(Consultation).filter(Consultation.appointment_id == apt.id).first()
    if not consultation:
        consultation = Consultation(
            appointment_id=apt.id,
            doctor_id=apt.doctor_id or current_user.id,
            patient_id=apt.patient_id,
            session_token=uuid.uuid4().hex,
            webrtc_room_id=f"ad-telemed-{apt.reference_id.lower()}",
            started_at=now,
            status="in_progress"
        )
        db.add(consultation)

    audit = AuditEvent(
        user_id=current_user.id,
        action="DOCTOR_ACCEPT_PATIENT",
        entity_type="Appointment",
        entity_id=apt.reference_id,
        details=f"{current_user.full_name} joined teleconsultation video conference for {apt.patient.full_name}."
    )
    db.add(audit)
    db.commit()
    db.refresh(consultation)

    screening_info = None
    if apt.screening:
        s = apt.screening
        mytra_assessment_data = None
        if s.mytra_assessments:
            mytra_assessment_data = s.mytra_assessments[-1].structured_response
        screening_info = {
            "id": s.id,
            "reference_id": s.reference_id,
            "category": s.category.value if hasattr(s.category, "value") else str(s.category),
            "oral_site": s.oral_site.value if hasattr(s.oral_site, "value") else str(s.oral_site),
            "lesion_type": s.lesion_type.value if hasattr(s.lesion_type, "value") else str(s.lesion_type),
            "mouth_opening_mm": s.mouth_opening_mm,
            "symptoms": s.symptoms,
            "duration_days": s.duration_days,
            "severity": s.severity,
            "bleeding": s.bleeding,
            "burning_sensation": s.burning_sensation,
            "images": [
                {
                    "preview_url": f"/api/v1/images/{img.id}/file",
                    "enhanced_url": f"/api/v1/images/{img.id}/enhanced" if img.processing_results and img.processing_results.enhanced_path else None,
                    "quality_state": img.processing_results.quality_state if img.processing_results else "acceptable",
                    "blur_score": img.processing_results.blur_score if img.processing_results else None,
                    "luminance_score": img.processing_results.luminance_score if img.processing_results else None,
                    "guidance_message": img.processing_results.guidance_message if img.processing_results else None
                } for img in s.images
            ],
            "ai_analysis": {
                "observations": s.ai_analyses[-1].visual_observations,
                "urgency": s.ai_analyses[-1].triage_urgency,
                "recommendations": s.ai_analyses[-1].recommendations
            } if s.ai_analyses else None,
            "mytra_assessment": mytra_assessment_data
        }

    return ConsultationAcceptResponse(
        consultation_id=consultation.id,
        appointment_id=apt.id,
        session_token=consultation.session_token,
        webrtc_room_id=consultation.webrtc_room_id,
        stun_server=settings.STUN_SERVER_URL,
        patient_name=apt.patient.full_name,
        patient_age=apt.patient.age,
        patient_id=apt.patient.id,
        patient_id_display=apt.patient.patient_id_display,
        phc_name=apt.phc.name if apt.phc else "PHC Clinic",
        doctor_name=apt.doctor.full_name if apt.doctor else "Dr. Priya Sundaram (Specialist Oncologist)",
        mandal=getattr(apt.patient, 'mandal', 'G. Madugula') or 'G. Madugula',
        screening_details=screening_info
    )
