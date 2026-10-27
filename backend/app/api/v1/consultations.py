from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import (
    Appointment, Consultation, Referral, AppointmentStatus, AppointmentEvent,
    User, UserRole, AuditEvent
)
from app.schemas.all_schemas import ConsultationCompletePayload
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/consultations", tags=["Consultation Workspace"])

@router.get("/{appointment_id}")
def get_consultation(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    consultation = db.query(Consultation).filter(Consultation.appointment_id == appointment_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation session not found.")
    return consultation

@router.post("/{appointment_id}/complete")
def complete_consultation(
    appointment_id: int,
    payload: ConsultationCompletePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN]))
):
    consultation = db.query(Consultation).filter(Consultation.appointment_id == appointment_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation session not found.")

    apt = consultation.appointment
    now = datetime.now(timezone.utc)

    # Save doctor's clinical notes
    consultation.clinical_findings = payload.clinical_findings.strip()
    consultation.prescription_notes = payload.prescription_notes.strip() if payload.prescription_notes else None
    consultation.follow_up_instructions = payload.follow_up_instructions.strip() if payload.follow_up_instructions else None
    consultation.referral_specialty = payload.referral_specialty if payload.referral_needed else None
    consultation.status = "completed"
    consultation.ended_at = now

    # Update appointment state machine
    prev_status = apt.status.value
    apt.status = AppointmentStatus.COMPLETED
    apt.consultation_end_time = now

    event = AppointmentEvent(
        appointment_id=apt.id,
        previous_status=prev_status,
        new_status=AppointmentStatus.COMPLETED.value,
        changed_by_user_id=current_user.id,
        reason=f"Consultation completed by Dr. {current_user.full_name}."
    )
    db.add(event)

    # If referral requested, create formal Referral record
    if payload.referral_needed and payload.referral_specialty:
        import random
        ref_num = f"REF-ASR-{random.randint(10000, 99999)}"
        referral = Referral(
            referral_slip_number=ref_num,
            patient_id=apt.patient_id,
            originating_phc_id=apt.phc_id,
            specialty_needed=payload.referral_specialty,
            urgency=payload.referral_urgency or "priority",
            target_hospital=payload.target_hospital or "District Hospital Paderu",
            status="confirmed",
            reason_for_referral=payload.clinical_findings or "Referred for specialist evaluation",
            clinical_notes=payload.clinical_findings,
            created_by_id=current_user.id
        )
        db.add(referral)

    audit = AuditEvent(
        user_id=current_user.id,
        action="COMPLETE_CONSULTATION",
        entity_type="Consultation",
        entity_id=str(consultation.id),
        details=f"Dr. {current_user.full_name} finalized consultation notes for {apt.patient.full_name}."
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": "Consultation finalized and clinical records saved.",
        "appointment_id": apt.id,
        "status": "completed",
        "referral_created": payload.referral_needed
    }
