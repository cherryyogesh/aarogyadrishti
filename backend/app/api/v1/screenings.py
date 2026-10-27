import random
import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import mask_phone_number
from app.models.entities import (
    Screening, ScreeningImage, ImageProcessingResult, AIAnalysis,
    Patient, PHC, User, UserRole, ScreeningStatus, OralSite, LesionType,
    NotificationLog, AuditEvent
)
from app.schemas.all_schemas import (
    ScreeningCreate, ScreeningResponse, ScreeningImageResponse,
    AIAnalysisResponse, ClinicalReviewResponse
)
from app.integrations.sms.adapter import sms_adapter, format_screening_sms
from app.integrations.ai.hf_client import hf_client
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/screenings", tags=["Oral Screenings (Module B & C)"])

def generate_screening_ref(db: Session) -> str:
    while True:
        num = random.randint(10000, 99999)
        ref = f"SCR-2026-{num}"
        existing = db.query(Screening).filter(Screening.reference_id == ref).first()
        if not existing:
            return ref

@router.post("", response_model=ScreeningResponse, status_code=status.HTTP_201_CREATED)
async def create_screening(
    payload: ScreeningCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.CHW, UserRole.PHC_STAFF, UserRole.ADMIN]))
):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    phc = db.query(PHC).filter(PHC.id == payload.phc_id).first()
    if not phc:
        raise HTTPException(status_code=404, detail="PHC not found.")

    try:
        oral_site_enum = OralSite(payload.oral_site.lower())
    except ValueError:
        oral_site_enum = OralSite.BUCCAL_MUCOSA

    try:
        lesion_type_enum = LesionType(payload.lesion_type.lower())
    except ValueError:
        lesion_type_enum = LesionType.LEUKOPLAKIA

    ref_id = generate_screening_ref(db)

    screening = Screening(
        reference_id=ref_id,
        patient_id=patient.id,
        phc_id=phc.id,
        category="mouth",
        oral_site=oral_site_enum,
        lesion_type=lesion_type_enum,
        symptoms=payload.symptoms.strip(),
        duration_days=payload.duration_days,
        mouth_opening_mm=payload.mouth_opening_mm,
        pain_score=payload.pain_score,
        bleeding=payload.bleeding,
        burning_sensation=payload.burning_sensation,
        severity=payload.severity,
        status=ScreeningStatus.UNDER_PHC_REVIEW,
        created_by_user_id=current_user.id
    )
    db.add(screening)
    db.flush()

    # Link Image if uploaded
    image_resp_list = []
    has_image = False
    img_quality_state = "acceptable"
    if payload.image_id:
        img_rec = db.query(ScreeningImage).filter(ScreeningImage.id == payload.image_id).first()
        if img_rec:
            img_rec.screening_id = screening.id
            img_rec.body_site = oral_site_enum.value
            has_image = True
            proc = img_rec.processing_results
            if proc:
                img_quality_state = proc.quality_state
            image_resp_list.append(ScreeningImageResponse(
                id=img_rec.id,
                original_filename=img_rec.original_filename,
                file_size_bytes=img_rec.file_size_bytes,
                width=img_rec.width,
                height=img_rec.height,
                preview_url=f"/api/v1/images/{img_rec.id}/file",
                enhanced_url=f"/api/v1/images/{img_rec.id}/enhanced" if proc and proc.enhanced_path else None,
                quality_state=proc.quality_state if proc else "acceptable",
                guidance_message=proc.guidance_message if proc else None,
                body_site=img_rec.body_site
            ))

    # Run AI Triage Engine (Module C: Nonclinical demonstration structured schema)
    ai_result = await hf_client.generate_response(
        prompt=payload.symptoms,
        category="mouth",
        language=patient.preferred_language or "te",
        has_attachment=has_image
    )

    demo_analysis_id = f"DEMO-AI-{random.randint(100, 999)}"
    ai_analysis = AIAnalysis(
        screening_id=screening.id,
        analysis_id=demo_analysis_id,
        model_name="IISc TANUH Research Concept Adapter",
        model_version="mock-v1",
        research_label="suspicious_example" if payload.severity in ["moderate", "severe"] or payload.lesion_type in ["leukoplakia", "erythroplakia", "osmf"] else "no_suspicious_finding_identified",
        image_quality=img_quality_state,
        visual_observations=f"Oral screening on {oral_site_enum.value}. Presenting {lesion_type_enum.value}.",
        triage_urgency=ai_result.get("urgency", "priority"),
        requires_clinician_review=True,
        clinical_use=False,
        warning="NOT FOR CLINICAL USE — RESEARCH DEMO ONLY",
        confidence_disclaimer="Non-negotiable: Demonstration research model. It does not independently confirm or stage cancer.",
        recommendations=ai_result.get("content", ""),
        is_real_inference=ai_result.get("is_real_inference", False)
    )
    db.add(ai_analysis)

    # Queue SMS confirmation to patient
    sms_content = format_screening_sms(ref_id)
    sms_res = await sms_adapter.send_sms(patient.phone, sms_content, message_type="screening_confirmation")

    notification = NotificationLog(
        recipient_phone=patient.phone,
        message_type="screening_confirmation",
        content=sms_content,
        provider=sms_res["provider"],
        provider_message_id=sms_res.get("provider_message_id"),
        delivery_status=sms_res["delivery_status"],
        error_message=sms_res.get("error")
    )
    db.add(notification)

    # Audit event
    audit = AuditEvent(
        user_id=current_user.id,
        action="CREATE_ORAL_SCREENING",
        entity_type="Screening",
        entity_id=ref_id,
        details=f"Recorded oral screening {ref_id} ({oral_site_enum.value} - {lesion_type_enum.value}) for {patient.full_name}."
    )
    db.add(audit)
    db.commit()
    db.refresh(screening)

    return ScreeningResponse(
        id=screening.id,
        reference_id=screening.reference_id,
        patient_id=patient.id,
        patient_id_display=patient.patient_id_display,
        patient_name=patient.full_name,
        patient_phone_masked=mask_phone_number(patient.phone),
        patient_age=patient.age,
        patient_gender=patient.gender,
        mandal=patient.mandal,
        phc_id=phc.id,
        phc_name=phc.name,
        oral_site=screening.oral_site.value,
        lesion_type=screening.lesion_type.value,
        symptoms=screening.symptoms,
        duration_days=screening.duration_days,
        mouth_opening_mm=screening.mouth_opening_mm,
        pain_score=screening.pain_score,
        bleeding=screening.bleeding,
        burning_sensation=screening.burning_sensation,
        severity=screening.severity,
        status=screening.status.value,
        created_at=screening.created_at,
        images=image_resp_list,
        ai_analysis=AIAnalysisResponse(
            id=ai_analysis.id,
            analysis_id=ai_analysis.analysis_id,
            model_name=ai_analysis.model_name,
            model_version=ai_analysis.model_version,
            research_label=ai_analysis.research_label,
            image_quality=ai_analysis.image_quality,
            visual_observations=ai_analysis.visual_observations,
            triage_urgency=ai_analysis.triage_urgency,
            requires_clinician_review=ai_analysis.requires_clinician_review,
            clinical_use=ai_analysis.clinical_use,
            warning=ai_analysis.warning,
            confidence_disclaimer=ai_analysis.confidence_disclaimer,
            recommendations=ai_analysis.recommendations,
            is_real_inference=ai_analysis.is_real_inference
        ),
        clinical_reviews=[]
    )

@router.get("", response_model=List[ScreeningResponse])
def list_screenings(
    phc_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    oral_site: Optional[str] = Query(None),
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Screening)

    if current_user.role in [UserRole.CHW, UserRole.PHC_STAFF] and current_user.phc_id:
        query = query.filter(Screening.phc_id == current_user.phc_id)
    elif phc_id:
        query = query.filter(Screening.phc_id == phc_id)

    if status:
        query = query.filter(Screening.status == status)
    if oral_site:
        query = query.filter(Screening.oral_site == oral_site)

    screenings = query.order_by(Screening.created_at.desc()).limit(limit).all()

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
                guidance_message=proc.guidance_message if proc else None,
                body_site=img.body_site
            ))

        ai_resp = None
        if s.ai_analyses:
            latest_ai = s.ai_analyses[-1]
            ai_resp = AIAnalysisResponse(
                id=latest_ai.id,
                analysis_id=latest_ai.analysis_id or "DEMO-AI-001",
                model_name=latest_ai.model_name,
                model_version=latest_ai.model_version,
                research_label=latest_ai.research_label or "suspicious_example",
                image_quality=latest_ai.image_quality or "acceptable",
                visual_observations=latest_ai.visual_observations,
                triage_urgency=latest_ai.triage_urgency,
                requires_clinician_review=latest_ai.requires_clinician_review,
                clinical_use=latest_ai.clinical_use,
                warning=latest_ai.warning or "NOT FOR CLINICAL USE",
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
                doctor_agrees_with_ai=cr.doctor_agrees_with_ai,
                clinical_notes=cr.clinical_notes,
                action_plan=cr.action_plan,
                signed_at=cr.signed_at or cr.reviewed_at,
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
            mandal=p.mandal,
            phc_id=s.phc_id,
            phc_name=s.phc.name if s.phc else "",
            oral_site=s.oral_site.value if s.oral_site else "buccal_mucosa",
            lesion_type=s.lesion_type.value if s.lesion_type else "leukoplakia",
            symptoms=s.symptoms,
            duration_days=s.duration_days,
            mouth_opening_mm=s.mouth_opening_mm,
            pain_score=s.pain_score,
            bleeding=s.bleeding,
            burning_sensation=s.burning_sensation,
            severity=s.severity,
            status=s.status.value,
            created_at=s.created_at,
            images=imgs,
            ai_analysis=ai_resp,
            clinical_reviews=reviews
        ))

    return results

@router.get("/{id}", response_model=ScreeningResponse)
def get_screening_detail(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(Screening).filter(Screening.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Screening not found.")

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
            guidance_message=proc.guidance_message if proc else None,
            body_site=img.body_site
        ))

    ai_resp = None
    if s.ai_analyses:
        latest_ai = s.ai_analyses[-1]
        ai_resp = AIAnalysisResponse(
            id=latest_ai.id,
            analysis_id=latest_ai.analysis_id or "DEMO-AI-001",
            model_name=latest_ai.model_name,
            model_version=latest_ai.model_version,
            research_label=latest_ai.research_label or "suspicious_example",
            image_quality=latest_ai.image_quality or "acceptable",
            visual_observations=latest_ai.visual_observations,
            triage_urgency=latest_ai.triage_urgency,
            requires_clinician_review=latest_ai.requires_clinician_review,
            clinical_use=latest_ai.clinical_use,
            warning=latest_ai.warning or "NOT FOR CLINICAL USE",
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
            doctor_agrees_with_ai=cr.doctor_agrees_with_ai,
            clinical_notes=cr.clinical_notes,
            action_plan=cr.action_plan,
            signed_at=cr.signed_at or cr.reviewed_at,
            reviewed_at=cr.reviewed_at
        ))

    return ScreeningResponse(
        id=s.id,
        reference_id=s.reference_id,
        patient_id=p.id,
        patient_id_display=p.patient_id_display,
        patient_name=p.full_name,
        patient_phone_masked=mask_phone_number(p.phone),
        patient_age=p.age,
        patient_gender=p.gender,
        mandal=p.mandal,
        phc_id=s.phc_id,
        phc_name=s.phc.name if s.phc else "",
        oral_site=s.oral_site.value if s.oral_site else "buccal_mucosa",
        lesion_type=s.lesion_type.value if s.lesion_type else "leukoplakia",
        symptoms=s.symptoms,
        duration_days=s.duration_days,
        mouth_opening_mm=s.mouth_opening_mm,
        pain_score=s.pain_score,
        bleeding=s.bleeding,
        burning_sensation=s.burning_sensation,
        severity=s.severity,
        status=s.status.value,
        created_at=s.created_at,
        images=imgs,
        ai_analysis=ai_resp,
        clinical_reviews=reviews
    )
