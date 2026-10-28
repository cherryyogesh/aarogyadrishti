import random
import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import (
    Investigation, Patient, Screening, User, UserRole,
    InvestigationState, AuditEvent
)
from app.schemas.all_schemas import (
    InvestigationCreate, InvestigationUpdate, InvestigationResponse
)
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/investigations", tags=["Diagnostic Investigations & Biopsy"])

def generate_investigation_ref(db: Session) -> str:
    while True:
        num = random.randint(1000, 9999)
        ref = f"BIO-2026-{num}"
        existing = db.query(Investigation).filter(Investigation.investigation_ref == ref).first()
        if not existing:
            return ref

@router.post("", response_model=InvestigationResponse, status_code=status.HTTP_201_CREATED)
def create_investigation(
    payload: InvestigationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.PHC_STAFF, UserRole.ADMIN]))
):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    ref_id = generate_investigation_ref(db)

    investigation = Investigation(
        investigation_ref=ref_id,
        patient_id=patient.id,
        screening_id=payload.screening_id,
        appointment_id=payload.appointment_id,
        kind=payload.kind,
        biopsy_site=payload.biopsy_site,
        state=InvestigationState(payload.state.lower()),
        ordered_by_doctor_id=current_user.id,
        specimen_date=datetime.now(timezone.utc) if payload.state in ["sample_collected", "report_pending", "report_received"] else None,
        pathology_finding=payload.pathology_finding,
        diagnosis_category=payload.diagnosis_category,
        histopathology_summary=payload.histopathology_summary or "Specimen received for punch/incisional histopathological evaluation.",
        report_file_url=payload.report_file_url
    )
    db.add(investigation)

    audit = AuditEvent(
        user_id=current_user.id,
        action="ORDER_BIOPSY",
        entity_type="Investigation",
        entity_id=ref_id,
        details=f"Dr. {current_user.full_name} ordered {payload.kind} on {payload.biopsy_site} for {patient.full_name}."
    )
    db.add(audit)
    db.commit()
    db.refresh(investigation)

    return InvestigationResponse(
        id=investigation.id,
        investigation_ref=investigation.investigation_ref,
        patient_id=patient.id,
        patient_id_display=patient.patient_id_display,
        patient_name=patient.full_name,
        kind=investigation.kind,
        biopsy_site=investigation.biopsy_site,
        state=investigation.state.value,
        diagnosis_category=investigation.diagnosis_category,
        pathology_finding=investigation.pathology_finding,
        histopathology_summary=investigation.histopathology_summary,
        report_file_url=investigation.report_file_url,
        doctor_name=current_user.full_name,
        created_at=investigation.created_at
    )

@router.get("", response_model=List[InvestigationResponse])
def list_investigations(
    patient_id: Optional[int] = Query(None),
    state: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Investigation)
    if patient_id:
        query = query.filter(Investigation.patient_id == patient_id)
    if state:
        query = query.filter(Investigation.state == state)

    items = query.order_by(Investigation.created_at.desc()).all()

    results = []
    for inv in items:
        p = inv.patient
        results.append(InvestigationResponse(
            id=inv.id,
            investigation_ref=inv.investigation_ref,
            patient_id=p.id,
            patient_id_display=p.patient_id_display,
            patient_name=p.full_name,
            kind=inv.kind,
            biopsy_site=inv.biopsy_site,
            state=inv.state.value,
            diagnosis_category=inv.diagnosis_category,
            pathology_finding=inv.pathology_finding,
            histopathology_summary=inv.histopathology_summary,
            report_file_url=inv.report_file_url,
            doctor_name=inv.doctor.full_name if inv.doctor else None,
            created_at=inv.created_at
        ))
    return results

@router.put("/{id}", response_model=InvestigationResponse)
def update_investigation(
    id: int,
    payload: InvestigationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.PHC_STAFF, UserRole.ADMIN]))
):
    inv = db.query(Investigation).filter(Investigation.id == id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation record not found.")

    inv.state = InvestigationState(payload.state.lower())
    if payload.pathology_finding:
        inv.pathology_finding = payload.pathology_finding
    if payload.diagnosis_category:
        inv.diagnosis_category = payload.diagnosis_category
    if payload.histopathology_summary:
        inv.histopathology_summary = payload.histopathology_summary
    if payload.report_file_url:
        inv.report_file_url = payload.report_file_url

    if inv.state == InvestigationState.CLINICIAN_REVIEWED:
        inv.clinician_reviewed_at = datetime.now(timezone.utc)

    audit = AuditEvent(
        user_id=current_user.id,
        action="UPDATE_BIOPSY_STATE",
        entity_type="Investigation",
        entity_id=inv.investigation_ref,
        details=f"Updated biopsy {inv.investigation_ref} state to {inv.state.value} ({inv.diagnosis_category})."
    )
    db.add(audit)
    db.commit()
    db.refresh(inv)

    p = inv.patient
    return InvestigationResponse(
        id=inv.id,
        investigation_ref=inv.investigation_ref,
        patient_id=p.id,
        patient_id_display=p.patient_id_display,
        patient_name=p.full_name,
        kind=inv.kind,
        biopsy_site=inv.biopsy_site,
        state=inv.state.value,
        diagnosis_category=inv.diagnosis_category,
        pathology_finding=inv.pathology_finding,
        histopathology_summary=inv.histopathology_summary,
        report_file_url=inv.report_file_url,
        doctor_name=inv.doctor.full_name if inv.doctor else None,
        created_at=inv.created_at
    )
