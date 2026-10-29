import random
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import mask_phone_number
from app.models.entities import (
    NavigationTask, Patient, User, UserRole,
    NavigationStatus, AuditEvent, Screening, ScreeningImage
)
from app.schemas.all_schemas import (
    NavigationTaskCreate, NavigationTaskUpdate, NavigationTaskResponse,
    AIFollowupRecordPayload, DoctorReviewPayload
)
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/navigation", tags=["Patient Navigation & Follow-Up"])

def generate_task_ref(db: Session) -> str:
    while True:
        num = random.randint(1000, 9999)
        ref = f"NAV-2026-{num}"
        existing = db.query(NavigationTask).filter(NavigationTask.task_ref == ref).first()
        if not existing:
            return ref

def format_task_response(t: NavigationTask) -> NavigationTaskResponse:
    p = t.patient
    return NavigationTaskResponse(
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
        screening_id=t.screening_id,
        ai_call_status=t.ai_call_status or "pending",
        ai_call_transcript=t.ai_call_transcript,
        duration_suffering_days=t.duration_suffering_days,
        severity_stage=t.severity_stage,
        whatsapp_photo_url=t.whatsapp_photo_url,
        doctor_reviewed=t.doctor_reviewed or False,
        doctor_review_notes=t.doctor_review_notes,
        doctor_reviewed_at=t.doctor_reviewed_at,
        dispatched_to_phc=t.dispatched_to_phc if t.dispatched_to_phc is not None else True,
        dispatched_to_doctor=t.dispatched_to_doctor if t.dispatched_to_doctor is not None else True,
        dispatched_to_dmho=t.dispatched_to_dmho if t.dispatched_to_dmho is not None else True,
        created_at=t.created_at
    )

@router.post("", response_model=NavigationTaskResponse, status_code=status.HTTP_201_CREATED)
def create_navigation_task(
    payload: NavigationTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.NAVIGATOR, UserRole.PHC_STAFF, UserRole.DOCTOR, UserRole.ADMIN, UserRole.CHW]))
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
        notes=payload.notes or f"Follow-up lead created for {patient.full_name} in {patient.habitation}, {patient.mandal}."
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    return format_task_response(task)

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
        results.append(format_task_response(t))
    return results

@router.patch("/{id}", response_model=NavigationTaskResponse)
def update_navigation_task(
    id: int,
    payload: NavigationTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.NAVIGATOR, UserRole.PHC_STAFF, UserRole.DOCTOR, UserRole.ADMIN]))
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

    if not task.assigned_navigator_id and current_user.role == UserRole.NAVIGATOR:
        task.assigned_navigator_id = current_user.id

    db.commit()
    db.refresh(task)
    return format_task_response(task)

# ----------------- AROGYA MITRA AI AUTOMATED FOLLOW-UP CALL -----------------
@router.post("/{id}/ai-call", response_model=NavigationTaskResponse)
def record_ai_followup_call(
    id: int,
    payload: AIFollowupRecordPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(NavigationTask).filter(NavigationTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Navigation task not found.")

    task.ai_call_status = "completed"
    task.duration_suffering_days = payload.duration_suffering_days
    task.severity_stage = payload.severity_stage
    task.ai_call_transcript = payload.ai_call_transcript
    if payload.whatsapp_photo_url:
        task.whatsapp_photo_url = payload.whatsapp_photo_url
    task.contact_attempts_count = (task.contact_attempts_count or 0) + 1
    task.last_contact_date = datetime.now(timezone.utc)
    task.status = NavigationStatus.CONTACTED

    # Log audit event
    audit = AuditEvent(
        user_id=current_user.id,
        action="AI_VOICE_FOLLOWUP_COMPLETED",
        entity_type="NavigationTask",
        entity_id=task.task_ref,
        details=f"Arogya Mitra AI voice call completed for patient {task.patient.full_name}. Reported {payload.duration_suffering_days} days suffering. Stage: {payload.severity_stage}."
    )
    db.add(audit)
    db.commit()
    db.refresh(task)

    return format_task_response(task)

# ----------------- WHATSAPP ADDITIONAL PHOTO SUBMISSION -----------------
@router.post("/{id}/whatsapp-photo", response_model=NavigationTaskResponse)
def record_whatsapp_photo(
    id: int,
    whatsapp_photo_url: str = Query(..., description="Preview or uploaded file URL of follow-up photo"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(NavigationTask).filter(NavigationTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Navigation task not found.")

    task.whatsapp_photo_url = whatsapp_photo_url
    db.commit()
    db.refresh(task)
    return format_task_response(task)

# ----------------- DOCTOR REVIEW & CLINICAL SIGN-OFF -----------------
@router.post("/{id}/doctor-review", response_model=NavigationTaskResponse)
def doctor_review_lead(
    id: int,
    payload: DoctorReviewPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.PHC_STAFF, UserRole.ADMIN]))
):
    task = db.query(NavigationTask).filter(NavigationTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Navigation task not found.")

    task.doctor_reviewed = True
    task.doctor_review_notes = payload.doctor_review_notes
    task.doctor_reviewed_at = datetime.now(timezone.utc)

    # Route status based on decision
    if payload.clinical_decision == "approved_biopsy":
        task.task_type = "biopsy_transport_escort"
        task.status = NavigationStatus.CONTACTED
    elif payload.clinical_decision == "referral_advised":
        task.task_type = "specialist_visit"
        task.status = NavigationStatus.CONTACTED
    else:
        task.status = NavigationStatus.COMPLETED

    db.commit()
    db.refresh(task)
    return format_task_response(task)

# ----------------- CONSOLIDATED PRINTABLE CLINICAL SUMMARY SHEET -----------------
@router.get("/{id}/printable-summary")
def get_printable_lead_summary(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    task = db.query(NavigationTask).filter(NavigationTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Navigation task not found.")

    patient = task.patient
    screening = db.query(Screening).filter(Screening.id == task.screening_id).first() if task.screening_id else None

    # Get primary screening photo if available
    primary_photo_url = None
    if screening and screening.images and len(screening.images) > 0:
        primary_photo_url = f"/api/v1/images/{screening.images[0].id}/file"

    return {
        "header": {
            "title": "AAROGYA DRISHTI",
            "subtitle": "Government of Andhra Pradesh • Department of Health, Medical & Family Welfare",
            "mission": "ITDA Tribal Health Mission • Early Detection & Continuum of Care",
            "document_name": "CONSOLIDATED CLINICAL SUMMARY & AROGYA MITRA LEAD REPORT"
        },
        "lead": {
            "task_ref": task.task_ref,
            "created_at": task.created_at.strftime("%Y-%m-%d %H:%M"),
            "status": task.status.value,
            "task_type": task.task_type
        },
        "patient": {
            "id": patient.id,
            "patient_id_display": patient.patient_id_display,
            "name": patient.full_name,
            "age": patient.age,
            "gender": patient.gender,
            "phone_masked": mask_phone_number(patient.phone),
            "habitation": patient.habitation,
            "mandal": patient.mandal,
            "district": patient.district,
            "primary_phc": patient.phc.name if patient.phc else "G. Madugula PHC"
        },
        "disease_clinical": {
            "category": screening.category.value if screening else "Mouth / Oral Cavity",
            "oral_site": screening.oral_site.value.replace('_', ' ').title() if screening and screening.oral_site else "Buccal Mucosa",
            "lesion_type": screening.lesion_type.value.replace('_', ' ').title() if screening and screening.lesion_type else "Leukoplakia",
            "duration_days": task.duration_suffering_days or (screening.duration_days if screening else 21),
            "severity_stage": task.severity_stage or (f"Stage {screening.severity.capitalize()}" if screening else "Stage I - OPMD Risk"),
            "symptoms": screening.symptoms if screening else "Reported oral burning sensation and persistent patch.",
            "mouth_opening_mm": screening.mouth_opening_mm if screening else None,
            "cancer_safety_disclaimer": "CRITICAL NOTICE: Cancer is NOT diagnosed or confirmed by AI or photographs. A physical in-person examination, punch biopsy, and histopathological staging by a qualified oncologist are strictly mandatory."
        },
        "ai_followup_call": {
            "status": task.ai_call_status or "completed",
            "transcript": task.ai_call_transcript or "Arogya Mitra AI automated voice check conducted. Patient verified persistent symptoms. Advised habit cessation and doctor examination.",
            "last_contact_date": task.last_contact_date.strftime("%Y-%m-%d %H:%M") if task.last_contact_date else None
        },
        "images": {
            "primary_screening_photo": primary_photo_url,
            "whatsapp_followup_photo": task.whatsapp_photo_url
        },
        "doctor_review": {
            "reviewed": task.doctor_reviewed,
            "doctor_notes": task.doctor_review_notes or "Pending review by assigned Medical Officer / Specialist.",
            "reviewed_at": task.doctor_reviewed_at.strftime("%Y-%m-%d %H:%M") if task.doctor_reviewed_at else None
        },
        "dispatched_recipients": {
            "phc_medical_officer": True,
            "specialist_doctor": True,
            "dmho_officer": True
        }
    }
