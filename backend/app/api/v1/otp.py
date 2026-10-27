import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import generate_secure_otp, hash_otp, verify_otp_hash, mask_phone_number
from app.models.entities import (
    Appointment, OTPVerification, Patient, AppointmentEvent, AppointmentStatus,
    NotificationLog, AuditEvent, User, UserRole
)
from app.schemas.all_schemas import (
    OTPRequestPayload, OTPRequestResponse, OTPVerifyPayload, OTPVerifyResponse
)
from app.integrations.sms.adapter import sms_adapter, format_otp_sms
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/otp", tags=["OTP Check-in"])

@router.post("/request", response_model=OTPRequestResponse)
async def request_checkin_otp(
    payload: OTPRequestPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.CHW, UserRole.PHC_STAFF, UserRole.DOCTOR, UserRole.ADMIN]))
):
    pid_clean = payload.patient_id_display.strip().upper()
    patient = db.query(Patient).filter(Patient.patient_id_display == pid_clean).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"No patient record found with ID '{pid_clean}'.")

    # Find appointment for patient (either by explicit ID or active scheduled/rescheduled appointment)
    if payload.appointment_id:
        appointment = db.query(Appointment).filter(
            Appointment.id == payload.appointment_id,
            Appointment.patient_id == patient.id
        ).first()
    else:
        appointment = db.query(Appointment).filter(
            Appointment.patient_id == patient.id,
            Appointment.status.in_([
                AppointmentStatus.SCHEDULED,
                AppointmentStatus.RESCHEDULED,
                AppointmentStatus.CHECKIN_INITIATED
            ])
        ).order_by(Appointment.scheduled_date.asc()).first()

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail=f"No eligible appointment found for patient '{patient.full_name}' ({pid_clean}) requiring check-in."
        )

    now = datetime.now(timezone.utc)

    # Check for existing OTP record to enforce cooldown
    existing_otp = db.query(OTPVerification).filter(OTPVerification.appointment_id == appointment.id).first()
    if existing_otp and existing_otp.resend_available_at:
        resend_time = existing_otp.resend_available_at
        if resend_time.tzinfo is None:
            resend_time = resend_time.replace(tzinfo=timezone.utc)
        if resend_time > now:
            remaining_secs = max(1, int((resend_time - now).total_seconds()))
            raise HTTPException(
                status_code=429,
                detail=f"OTP resend cooldown active. Please wait {remaining_secs} seconds before requesting a new code."
            )

    # Generate secure 6-digit cryptographic OTP
    otp_code = generate_secure_otp()
    salt = uuid.uuid4().hex
    hashed_code = hash_otp(otp_code, salt)

    expires_at = now + timedelta(minutes=5)
    resend_cooldown = now + timedelta(seconds=60)

    if existing_otp:
        existing_otp.hashed_otp = hashed_code
        existing_otp.salt = salt
        existing_otp.attempts = 0
        existing_otp.expires_at = expires_at
        existing_otp.resend_available_at = resend_cooldown
        existing_otp.verified = False
        existing_otp.verified_at = None
    else:
        new_otp = OTPVerification(
            appointment_id=appointment.id,
            patient_id=patient.id,
            hashed_otp=hashed_code,
            salt=salt,
            attempts=0,
            max_attempts=3,
            expires_at=expires_at,
            resend_available_at=resend_cooldown,
            verified=False
        )
        db.add(new_otp)

    appointment.status = AppointmentStatus.CHECKIN_INITIATED

    # Dispatch SMS
    sms_text = format_otp_sms(otp_code)
    sms_res = await sms_adapter.send_sms(patient.phone, sms_text, message_type="otp")

    notif = NotificationLog(
        recipient_phone=patient.phone,
        message_type="otp",
        content="Aarogya Drishti OTP verification message dispatched.",  # Redacted in logs for privacy
        provider=sms_res["provider"],
        provider_message_id=sms_res.get("provider_message_id"),
        delivery_status=sms_res["delivery_status"],
        error_message=sms_res.get("error")
    )
    db.add(notif)

    # Audit event
    audit = AuditEvent(
        user_id=current_user.id,
        action="REQUEST_CHECKIN_OTP",
        entity_type="Appointment",
        entity_id=appointment.reference_id,
        details=f"Staff initiated check-in OTP for appointment {appointment.reference_id}."
    )
    db.add(audit)
    db.commit()

    return OTPRequestResponse(
        success=True,
        message="Verification OTP dispatched to registered mobile number.",
        appointment_id=appointment.id,
        patient_name=patient.full_name,
        masked_phone=mask_phone_number(patient.phone),
        resend_cooldown_seconds=60,
        expires_in_minutes=5,
        dev_otp_preview=otp_code if sms_res.get("is_synthetic") else None
    )

@router.post("/verify", response_model=OTPVerifyResponse)
def verify_checkin_otp(
    payload: OTPVerifyPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.CHW, UserRole.PHC_STAFF, UserRole.DOCTOR, UserRole.ADMIN]))
):
    appointment = db.query(Appointment).filter(Appointment.id == payload.appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    otp_record = db.query(OTPVerification).filter(OTPVerification.appointment_id == appointment.id).first()
    if not otp_record:
        raise HTTPException(status_code=400, detail="No active OTP found for this appointment. Please request a new OTP.")

    now = datetime.now(timezone.utc)

    # Check expiry
    # Make timezone aware if needed
    exp = otp_record.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)

    if exp < now:
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a fresh code.")

    # Check attempt limit
    if otp_record.attempts >= otp_record.max_attempts:
        raise HTTPException(
            status_code=400,
            detail="Maximum OTP verification attempts exceeded (3/3). This code is locked. Please request a new OTP."
        )

    # Validate OTP Code
    clean_code = payload.otp_code.strip()
    is_valid = verify_otp_hash(clean_code, otp_record.salt, otp_record.hashed_otp)

    if not is_valid:
        otp_record.attempts += 1
        db.commit()
        remaining = otp_record.max_attempts - otp_record.attempts
        raise HTTPException(
            status_code=400,
            detail=f"Incorrect verification code. {remaining} attempt(s) remaining."
        )

    # Verification Succeeded!
    otp_record.verified = True
    otp_record.verified_at = now

    prev_status = appointment.status.value
    appointment.status = AppointmentStatus.WAITING_FOR_DOCTOR
    appointment.checkin_time = now

    event = AppointmentEvent(
        appointment_id=appointment.id,
        previous_status=prev_status,
        new_status=AppointmentStatus.WAITING_FOR_DOCTOR.value,
        changed_by_user_id=current_user.id,
        reason="Patient physically verified via secure OTP check-in."
    )
    db.add(event)

    audit = AuditEvent(
        user_id=current_user.id,
        action="VERIFY_OTP_SUCCESS",
        entity_type="Appointment",
        entity_id=appointment.reference_id,
        details=f"Patient {appointment.patient.full_name} verified. Moved to waiting queue."
    )
    db.add(audit)
    db.commit()

    return OTPVerifyResponse(
        success=True,
        message="Patient arrived and verified — added to doctor waiting queue.",
        appointment_id=appointment.id,
        status="waiting_for_doctor",
        checkin_time=now
    )
