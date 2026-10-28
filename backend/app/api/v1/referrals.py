import random
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import (
    Referral, Patient, PHC, User, UserRole, AuditEvent
)
from app.schemas.all_schemas import ReferralSlipResponse
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/referrals", tags=["Hospital Referrals & Referral Slip"])

def generate_slip_number(db: Session) -> str:
    while True:
        num = random.randint(10000, 99999)
        ref = f"REF-ASR-{num}"
        existing = db.query(Referral).filter(Referral.referral_slip_number == ref).first()
        if not existing:
            return ref

@router.post("", response_model=ReferralSlipResponse, status_code=status.HTTP_201_CREATED)
def create_hospital_referral(
    patient_id: int,
    specialty_needed: str = "Head & Neck Surgical Oncology",
    target_hospital: str = "District Hospital Paderu / KGH Visakhapatnam",
    urgency: str = "priority",
    reason_for_referral: str = "Suspected Oral Potentially Malignant Disorder (Leukoplakia / OSMF) requiring biopsy",
    clinical_notes: Optional[str] = None,
    scheduled_appointment_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.PHC_STAFF, UserRole.ADMIN]))
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    slip_no = generate_slip_number(db)

    referral = Referral(
        referral_slip_number=slip_no,
        patient_id=patient.id,
        originating_phc_id=patient.phc_id,
        specialty_needed=specialty_needed,
        urgency=urgency,
        target_hospital=target_hospital,
        reason_for_referral=reason_for_referral,
        clinical_notes=clinical_notes,
        status="confirmed",
        scheduled_appointment_date=scheduled_appointment_date or (datetime.now(timezone.utc)).strftime("%Y-%m-%d"),
        attendance_confirmed=False,
        created_by_id=current_user.id
    )
    db.add(referral)

    audit = AuditEvent(
        user_id=current_user.id,
        action="GENERATE_REFERRAL_SLIP",
        entity_type="Referral",
        entity_id=slip_no,
        details=f"Generated hospital referral slip {slip_no} for {patient.full_name} to {target_hospital}."
    )
    db.add(audit)
    db.commit()
    db.refresh(referral)

    return ReferralSlipResponse(
        id=referral.id,
        referral_slip_number=referral.referral_slip_number,
        patient_id_display=patient.patient_id_display,
        patient_name=patient.full_name,
        age=patient.age,
        gender=patient.gender,
        habitation=patient.habitation,
        mandal=patient.mandal,
        district=patient.district,
        originating_phc=patient.phc.name if patient.phc else "G. Madugula PHC",
        target_hospital=referral.target_hospital,
        specialty_needed=referral.specialty_needed,
        urgency=referral.urgency,
        reason_for_referral=referral.reason_for_referral,
        clinical_notes=referral.clinical_notes,
        scheduled_appointment_date=referral.scheduled_appointment_date,
        attendance_confirmed=referral.attendance_confirmed,
        created_at=referral.created_at
    )

@router.get("", response_model=List[ReferralSlipResponse])
def list_referrals(
    patient_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Referral)
    if patient_id:
        query = query.filter(Referral.patient_id == patient_id)

    referrals = query.order_by(Referral.created_at.desc()).all()

    results = []
    for r in referrals:
        p = r.patient
        results.append(ReferralSlipResponse(
            id=r.id,
            referral_slip_number=r.referral_slip_number,
            patient_id_display=p.patient_id_display,
            patient_name=p.full_name,
            age=p.age,
            gender=p.gender,
            habitation=p.habitation,
            mandal=p.mandal,
            district=p.district,
            originating_phc=p.phc.name if p.phc else "G. Madugula PHC",
            target_hospital=r.target_hospital,
            specialty_needed=r.specialty_needed,
            urgency=r.urgency,
            reason_for_referral=r.reason_for_referral,
            clinical_notes=r.clinical_notes,
            scheduled_appointment_date=r.scheduled_appointment_date,
            attendance_confirmed=r.attendance_confirmed,
            created_at=r.created_at
        ))
    return results

@router.patch("/{id}/attendance", response_model=ReferralSlipResponse)
def confirm_referral_attendance(
    id: int,
    attendance_confirmed: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.NAVIGATOR, UserRole.PHC_STAFF, UserRole.ADMIN]))
):
    referral = db.query(Referral).filter(Referral.id == id).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral record not found.")

    referral.attendance_confirmed = attendance_confirmed
    referral.status = "attendance_verified" if attendance_confirmed else "missed"
    db.commit()
    db.refresh(referral)

    p = referral.patient
    return ReferralSlipResponse(
        id=referral.id,
        referral_slip_number=referral.referral_slip_number,
        patient_id_display=p.patient_id_display,
        patient_name=p.full_name,
        age=p.age,
        gender=p.gender,
        habitation=p.habitation,
        mandal=p.mandal,
        district=p.district,
        originating_phc=p.phc.name if p.phc else "G. Madugula PHC",
        target_hospital=referral.target_hospital,
        specialty_needed=referral.specialty_needed,
        urgency=referral.urgency,
        reason_for_referral=referral.reason_for_referral,
        clinical_notes=referral.clinical_notes,
        scheduled_appointment_date=referral.scheduled_appointment_date,
        attendance_confirmed=referral.attendance_confirmed,
        created_at=referral.created_at
    )
