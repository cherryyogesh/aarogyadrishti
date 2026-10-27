from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import mask_phone_number
from app.models.entities import (
    Screening, ClinicalReview, User, UserRole, ScreeningStatus, AuditEvent
)
from app.schemas.all_schemas import (
    ClinicalReviewCreate, ClinicalReviewResponse, ScreeningResponse,
    ScreeningImageResponse, AIAnalysisResponse
)
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/phc", tags=["PHC Case Management"])

@router.get("/cases", response_model=List[ScreeningResponse])
def get_phc_cases(
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.PHC_STAFF, UserRole.DOCTOR, UserRole.ADMIN]))
):
    query = db.query(Screening)
    if current_user.role == UserRole.PHC_STAFF and current_user.phc_id:
        query = query.filter(Screening.phc_id == current_user.phc_id)

    if status_filter:
        query = query.filter(Screening.status == status_filter)
    else:
        # Default to cases pending action
        query = query.filter(Screening.status.in_([
            ScreeningStatus.UNDER_PHC_REVIEW,
            ScreeningStatus.QUALITY_REVIEW,
            ScreeningStatus.SUBMITTED
        ]))

    screenings = query.order_by(Screening.created_at.desc()).all()

    results = []
    for s in screenings:
        p = s.patient
        imgs = []
        for img in s.images:
            proc = img.processing_results
            imgs.append(ScreeningImageResponse(
                id=img.id,
                original_filename=img.original_filename,
                file_size_bytes=img.file_size_bytes,
                width=img.width,
                height=img.height,
                preview_url=f"/api/v1/images/{img.id}/file",
                enhanced_url=f"/api/v1/images/{img.id}/enhanced" if proc and proc.enhanced_path else None,
                quality_state=proc.quality_state if proc else None,
                guidance_message=proc.guidance_message if proc else None
            ))

        ai_resp = None
        if s.ai_analyses:
            latest_ai = s.ai_analyses[-1]
            ai_resp = AIAnalysisResponse(
                id=latest_ai.id,
                model_name=latest_ai.model_name,
                model_version=latest_ai.model_version,
                visual_observations=latest_ai.visual_observations,
                triage_urgency=latest_ai.triage_urgency,
                confidence_disclaimer=latest_ai.confidence_disclaimer,
                recommendations=latest_ai.recommendations,
                is_real_inference=latest_ai.is_real_inference
            )

        reviews = []
        for cr in s.clinical_reviews:
            reviews.append(ClinicalReviewResponse(
                id=cr.id,
                reviewer_name=cr.reviewer.full_name if cr.reviewer else None,
                review_decision=cr.review_decision,
                clinical_notes=cr.clinical_notes,
                action_plan=cr.action_plan,
                reviewed_at=cr.reviewed_at
            ))

        results.append(ScreeningResponse(
            id=s.id,
            reference_id=s.reference_id,
            patient_id=p.id,
            patient_id_display=p.patient_id_display,
            patient_name=p.full_name,
            patient_phone_masked=mask_phone_number(p.phone),
            patient_age=p.age,
            patient_gender=p.gender,
            mandal=p.mandal if hasattr(p, "mandal") and p.mandal else "Paderu",
            phc_id=s.phc_id,
            phc_name=s.phc.name if s.phc else "",
            oral_site=s.oral_site.value if hasattr(s.oral_site, "value") else str(s.oral_site or "buccal_mucosa"),
            lesion_type=s.lesion_type.value if hasattr(s.lesion_type, "value") else str(s.lesion_type or "leukoplakia"),
            symptoms=s.symptoms,
            duration_days=s.duration_days,
            mouth_opening_mm=s.mouth_opening_mm,
            pain_score=s.pain_score or 0,
            bleeding=bool(s.bleeding),
            burning_sensation=bool(s.burning_sensation),
            severity=s.severity,
            status=s.status.value if hasattr(s.status, "value") else str(s.status),
            created_at=s.created_at,
            images=imgs,
            ai_analysis=ai_resp,
            clinical_reviews=reviews
        ))
    return results

@router.post("/cases/{id}/review", response_model=ClinicalReviewResponse)
def record_case_review(
    id: int,
    payload: ClinicalReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.PHC_STAFF, UserRole.DOCTOR, UserRole.ADMIN]))
):
    screening = db.query(Screening).filter(Screening.id == id).first()
    if not screening:
        raise HTTPException(status_code=404, detail="Screening case not found.")

    review = ClinicalReview(
        screening_id=screening.id,
        doctor_id=current_user.id,
        doctor_agrees_with_ai=payload.doctor_agrees_with_ai,
        review_decision=payload.review_decision,
        clinical_notes=payload.clinical_notes,
        action_plan=payload.action_plan
    )
    db.add(review)

    # Update screening status based on clinical decision
    if payload.review_decision in ["consultation_booked", "referral_made", "biopsy_advised"]:
        screening.status = ScreeningStatus.CONSULTATION_RECOMMENDED
    elif payload.review_decision == "repeat_photo":
        screening.status = ScreeningStatus.REPEAT_PHOTO_REQUESTED
    elif payload.review_decision == "safe_observation":
        screening.status = ScreeningStatus.CLOSED

    # Audit event
    audit = AuditEvent(
        user_id=current_user.id,
        action="REVIEW_SCREENING",
        entity_type="Screening",
        entity_id=screening.reference_id,
        details=f"Clinician {current_user.full_name} reviewed case: {payload.review_decision}."
    )
    db.add(audit)
    db.commit()
    db.refresh(review)

    return ClinicalReviewResponse(
        id=review.id,
        reviewer_name=current_user.full_name,
        review_decision=review.review_decision,
        doctor_agrees_with_ai=review.doctor_agrees_with_ai,
        clinical_notes=review.clinical_notes,
        action_plan=review.action_plan,
        signed_at=review.signed_at or review.reviewed_at,
        reviewed_at=review.reviewed_at
    )
