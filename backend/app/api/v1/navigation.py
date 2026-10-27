import random
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import mask_phone_number
from app.models.entities import (
    NavigationTask, Patient, User, UserRole,
    NavigationStatus, AuditEvent
)
from app.schemas.all_schemas import (
    NavigationTaskCreate, NavigationTaskUpdate, NavigationTaskResponse
)
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/navigation", tags=["Patient Navigation & Follow-Up (Module I)"])

def generate_task_ref(db: Session) -> str:
    while True:
        num = random.randint(1000, 9999)
        ref = f"NAV-2026-{num}"
        existing = db.query(NavigationTask).filter(NavigationTask.task_ref == ref).first()
        if not existing:
            return ref

@router.post("", response_model=NavigationTaskResponse, status_code=status.HTTP_201_CREATED)
def create_navigation_task(
    payload: NavigationTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.NAVIGATOR, UserRole.PHC_STAFF, UserRole.DOCTOR, UserRole.ADMIN]))
):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    ref_id = generate_task_ref(db)

    task = NavigationTask(
        task_ref=ref_id,
        patient_id=patient.id,
        assigned_navigator_id=current_user.id if current_user.role == UserRole.NAVIGATOR else None,
        task_type=payload.task_type,
        status=NavigationStatus.PENDING,
        due_date=payload.due_date,
        notes=payload.notes or f"Follow-up task created for {patient.full_name} in {patient.habitation}, {patient.mandal}."
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    return NavigationTaskResponse(
        id=task.id,
        task_ref=task.task_ref,
        patient_id=patient.id,
        patient_id_display=patient.patient_id_display,
        patient_name=patient.full_name,
        habitation=patient.habitation,
        mandal=patient.mandal,
        patient_phone_masked=mask_phone_number(patient.phone),
        task_type=task.task_type,
        status=task.status.value,
        due_date=task.due_date,
        contact_attempts_count=task.contact_attempts_count,
        transport_support_arranged=task.transport_support_arranged,
        feeder_ambulance_notified=task.feeder_ambulance_notified,
        missed_visit_reason=task.missed_visit_reason,
        notes=task.notes,
        navigator_name=current_user.full_name if task.assigned_navigator_id else None,
        created_at=task.created_at
    )

@router.get("", response_model=List[NavigationTaskResponse])
def list_navigation_tasks(
    status_filter: Optional[str] = Query(None),
    mandal_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(NavigationTask)
    if status_filter:
        query = query.filter(NavigationTask.status == status_filter)

    tasks = query.order_by(NavigationTask.created_at.desc()).all()

    results = []
    for t in tasks:
        p = t.patient
        if mandal_filter and p.mandal.lower() != mandal_filter.lower():
            continue

        results.append(NavigationTaskResponse(
            id=t.id,
            task_ref=t.task_ref,
            patient_id=p.id,
            patient_id_display=p.patient_id_display,
            patient_name=p.full_name,
            habitation=p.habitation,
            mandal=p.mandal,
            patient_phone_masked=mask_phone_number(p.phone),
            task_type=t.task_type,
            status=t.status.value,
            due_date=t.due_date,
            contact_attempts_count=t.contact_attempts_count,
            transport_support_arranged=t.transport_support_arranged,
            feeder_ambulance_notified=t.feeder_ambulance_notified,
            missed_visit_reason=t.missed_visit_reason,
            notes=t.notes,
            navigator_name=t.navigator.full_name if t.navigator else None,
            created_at=t.created_at
        ))
    return results

@router.patch("/{id}", response_model=NavigationTaskResponse)
def update_navigation_task(
    id: int,
    payload: NavigationTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.NAVIGATOR, UserRole.PHC_STAFF, UserRole.ADMIN]))
):
    task = db.query(NavigationTask).filter(NavigationTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Navigation task not found.")

    task.status = NavigationStatus(payload.status.lower())
    if payload.contact_attempts_count is not None:
        task.contact_attempts_count = payload.contact_attempts_count
        task.last_contact_date = datetime.now(timezone.utc)
    if payload.transport_support_arranged is not None:
        task.transport_support_arranged = payload.transport_support_arranged
    if payload.feeder_ambulance_notified is not None:
        task.feeder_ambulance_notified = payload.feeder_ambulance_notified
    if payload.missed_visit_reason:
        task.missed_visit_reason = payload.missed_visit_reason
    if payload.notes:
        task.notes = payload.notes

    # Assign navigator if unassigned
    if not task.assigned_navigator_id and current_user.role == UserRole.NAVIGATOR:
        task.assigned_navigator_id = current_user.id

    db.commit()
    db.refresh(task)

    p = task.patient
    return NavigationTaskResponse(
        id=task.id,
        task_ref=task.task_ref,
        patient_id=p.id,
        patient_id_display=p.patient_id_display,
        patient_name=p.full_name,
        habitation=p.habitation,
        mandal=p.mandal,
        patient_phone_masked=mask_phone_number(p.phone),
        task_type=task.task_type,
        status=task.status.value,
        due_date=task.due_date,
        contact_attempts_count=task.contact_attempts_count,
        transport_support_arranged=task.transport_support_arranged,
        feeder_ambulance_notified=task.feeder_ambulance_notified,
        missed_visit_reason=task.missed_visit_reason,
        notes=task.notes,
        navigator_name=task.navigator.full_name if task.navigator else None,
        created_at=task.created_at
    )
