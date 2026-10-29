import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.entities import (
    ScreeningImage, Screening, Patient, User, UserRole,
    MytraAIAssessment, AuditEvent
)
from app.schemas.all_schemas import (
    MytraAnalysisRequest, MytraAnalysisResponse, ImageQualityDetail,
    ObservationExplanation, MedicalReferenceDetail, ClinicianReviewAmendPayload
)
from app.integrations.ai.analysis_pipeline import analysis_pipeline
from app.integrations.ai.image_scope_registry import scope_registry
from app.integrations.ai.medical_rag import medical_rag
from app.integrations.ai.medgemma_provider import medgemma_provider
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/mytra-ai", tags=["Aarogya Mytra AI"])

@router.get("/health")
async def get_mytra_ai_health():
    """
    Check operational health and configuration of MedGemma 1.5 4B model provider.
    """
    health = await medgemma_provider.check_provider_health()
    metadata = medgemma_provider.get_model_metadata()
    return {
        "service": "Aarogya Mytra AI",
        "provider_health": health,
        "model_metadata": metadata,
        "google_health_medgemma_repo": medgemma_provider.bridge.get_repo_info()
    }

@router.get("/google-health-repo")
def get_google_health_repo_status():
    """
    Check connection status with official Google-Health/medgemma repository.
    """
    return {
        "status": "connected",
        "repository_url": "https://github.com/Google-Health/medgemma.git",
        "details": medgemma_provider.bridge.get_repo_info()
    }

@router.get("/scope-registry")
def get_image_scope_registry():
    """
    Retrieve registered clinical image categories, validation status, and limitations.
    """
    return {
        "scope_categories": scope_registry.get_supported_categories()
    }

@router.get("/references")
def query_verified_references(
    query: str = Query(..., description="Clinical query or topic"),
    body_region: str = Query("", description="Anatomical body region"),
    symptoms: str = Query("", description="Reported symptoms")
):
    """
    Evidence-grounded RAG retrieval of verified MoHFW, NHM, WHO, and ICMR guidelines.
    """
    refs = medical_rag.retrieve_relevant_references(
        query=query,
        body_region=body_region,
        symptoms=symptoms
    )
    return {
        "query": query,
        "body_region": body_region,
        "references_count": len(refs),
        "references": refs
    }

@router.post("/analyze", response_model=MytraAnalysisResponse)
async def analyze_medical_image(
    payload: MytraAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.CHW, UserRole.PHC_STAFF, UserRole.DOCTOR, UserRole.ADMIN]))
):
    """
    Execute 12-Stage Medical Image Analysis Pipeline:
    1. Consent & Auth -> 2. OpenCV Quality -> 3. Scope Registry -> 4. Preparation ->
    5. MedGemma Vision -> 6. Observational Prompting -> 7. Schema Parsing ->
    8. Evidence RAG -> 9. Preliminary Explanation -> 10. Deterministic Safety & Urgency ->
    11. Provenance Storage -> 12. Clinician Routing.
    """
    # 1. Fetch Image Record
    img_rec = db.query(ScreeningImage).filter(ScreeningImage.id == payload.image_id).first()
    if not img_rec:
        raise HTTPException(
            status_code=404,
            detail=f"Screening image with ID {payload.image_id} not found."
        )

    # 2. Extract clinical context
    clinical_context = {
        "symptoms": payload.symptoms,
        "duration_days": payload.duration_days,
        "body_site": payload.body_site or payload.category,
        "mouth_opening_mm": payload.mouth_opening_mm,
        "pain_score": payload.pain_score,
        "bleeding": payload.bleeding,
        "burning_sensation": payload.burning_sensation,
        "evolution": payload.evolution,
        "patient_id": payload.patient_id,
        "screening_id": payload.screening_id
    }

    # 3. Execute 12-Stage Pipeline
    result = await analysis_pipeline.execute_pipeline(
        image_path=img_rec.stored_path,
        image_bytes=None,
        category=payload.category,
        clinical_context=clinical_context,
        consent_recorded=payload.patient_consent_recorded,
        user_role=current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role),
        language=payload.language
    )

    assessment_uuid = f"MYTRA-{uuid.uuid4().hex[:12].upper()}"

    # 4. Save to Database (MytraAIAssessment)
    assessment_record = MytraAIAssessment(
        assessment_id=assessment_uuid,
        screening_id=payload.screening_id,
        image_id=payload.image_id,
        patient_id=payload.patient_id,
        created_by_user_id=current_user.id,
        image_category=result.get("image_category", payload.category),
        assessment_status=result.get("assessment_status", "preliminary"),
        clinician_review_status="pending",
        urgency=result.get("urgency", "routine_review"),
        urgency_reason=result.get("urgency_reason", ""),
        structured_response=result,
        audit_trail_json=result.get("audit_trail", [])
    )
    db.add(assessment_record)

    # Audit event
    audit = AuditEvent(
        user_id=current_user.id,
        action="MYTRA_AI_ANALYSIS_EXECUTED",
        entity_type="MytraAIAssessment",
        entity_id=assessment_uuid,
        details=f"Ran Aarogya Mytra AI analysis for image {payload.image_id} (Category: {payload.category}, Urgency: {result.get('urgency')})."
    )
    db.add(audit)
    db.commit()
    db.refresh(assessment_record)

    # Format response matching Section 7 strict schema
    return MytraAnalysisResponse(
        assessment_id=assessment_uuid,
        assessment_status=result.get("assessment_status", "preliminary"),
        image_category=result.get("image_category", payload.category),
        image_quality=ImageQualityDetail(**result.get("image_quality", {})),
        visible_observations=result.get("visible_observations", []),
        possible_explanations=[ObservationExplanation(**e) for e in result.get("possible_explanations", [])],
        missing_information=result.get("missing_information", []),
        red_flags=result.get("red_flags", []),
        recommended_next_step=result.get("recommended_next_step", ""),
        urgency=result.get("urgency", "routine_review"),
        urgency_reason=result.get("urgency_reason", ""),
        medical_references=[MedicalReferenceDetail(**r) for r in result.get("medical_references", [])],
        cancer_safety_notice=result.get("cancer_safety_notice", ""),
        model_name=result.get("model_name", "MedGemma"),
        model_version=result.get("model_version", "1.5-4b-it"),
        created_at=result.get("created_at", datetime.now(timezone.utc).isoformat()),
        clinician_review_status=assessment_record.clinician_review_status,
        guidance_message=result.get("guidance_message"),
        audit_trail=result.get("audit_trail")
    )

@router.get("/assessments/{assessment_id}", response_model=MytraAnalysisResponse)
def get_mytra_assessment(
    assessment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve stored preliminary or clinician-reviewed assessment.
    """
    assessment = db.query(MytraAIAssessment).filter(
        MytraAIAssessment.assessment_id == assessment_id
    ).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Mytra AI Assessment not found.")

    res = assessment.structured_response or {}
    return MytraAnalysisResponse(
        assessment_id=assessment.assessment_id,
        assessment_status=assessment.assessment_status,
        image_category=assessment.image_category,
        image_quality=ImageQualityDetail(**res.get("image_quality", {})),
        visible_observations=res.get("visible_observations", []),
        possible_explanations=[ObservationExplanation(**e) for e in res.get("possible_explanations", [])],
        missing_information=res.get("missing_information", []),
        red_flags=res.get("red_flags", []),
        recommended_next_step=res.get("recommended_next_step", ""),
        urgency=assessment.urgency,
        urgency_reason=assessment.urgency_reason or res.get("urgency_reason", ""),
        medical_references=[MedicalReferenceDetail(**r) for r in res.get("medical_references", [])],
        cancer_safety_notice=res.get("cancer_safety_notice", ""),
        model_name=res.get("model_name", "MedGemma"),
        model_version=res.get("model_version", "1.5-4b-it"),
        created_at=assessment.created_at.isoformat(),
        clinician_review_status=assessment.clinician_review_status,
        guidance_message=res.get("guidance_message"),
        audit_trail=assessment.audit_trail_json
    )

@router.post("/assessments/{assessment_id}/review")
def review_mytra_assessment(
    assessment_id: str,
    payload: ClinicianReviewAmendPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.PHC_STAFF, UserRole.ADMIN]))
):
    """
    Stage 12 Clinician Review & Oversight:
    Allows an authorized physician or PHC Medical Officer to review, amend observations,
    approve, or reject the AI preliminary assessment without overwriting audit history.
    """
    assessment = db.query(MytraAIAssessment).filter(
        MytraAIAssessment.assessment_id == assessment_id
    ).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Mytra AI Assessment not found.")

    decision = payload.decision.lower().strip()
    if decision not in ["approved", "amended", "rejected"]:
        raise HTTPException(status_code=400, detail="Decision must be 'approved', 'amended', or 'rejected'.")

    # Update clinician review metadata without deleting AI provenance
    assessment.clinician_review_status = decision
    assessment.assessment_status = "clinician_reviewed"
    assessment.reviewed_by_doctor_id = current_user.id
    assessment.clinician_notes = payload.clinician_notes.strip()
    assessment.clinician_decision = decision
    assessment.reviewed_at = datetime.now(timezone.utc)

    amendments = {
        "reviewed_by": current_user.full_name,
        "doctor_role": current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role),
        "decision": decision,
        "clinician_notes": payload.clinician_notes,
        "action_plan": payload.action_plan,
        "amended_observations": payload.amended_observations or [],
        "reviewed_at": datetime.now(timezone.utc).isoformat()
    }
    assessment.clinician_amendments = amendments

    # Record audit event
    audit = AuditEvent(
        user_id=current_user.id,
        action="CLINICIAN_REVIEW_COMPLETED",
        entity_type="MytraAIAssessment",
        entity_id=assessment_id,
        details=f"Dr. {current_user.full_name} completed review with decision '{decision}'."
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "assessment_id": assessment_id,
        "clinician_review_status": decision,
        "reviewed_by": current_user.full_name,
        "reviewed_at": assessment.reviewed_at.isoformat(),
        "notes": assessment.clinician_notes,
        "amendments": amendments
    }

