import random
import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import mask_phone_number
from app.models.entities import (
    Screening, ScreeningImage, ImageProcessingResult, AIAnalysis, MytraAIAssessment,
    Patient, PHC, User, UserRole, ScreeningStatus, OralSite, LesionType,
    NotificationLog, AuditEvent, NavigationTask, NavigationStatus
)
from app.schemas.all_schemas import (
    ScreeningCreate, ScreeningResponse, ScreeningImageResponse,
    AIAnalysisResponse, ClinicalReviewResponse, MytraAnalysisResponse,
    ImageQualityDetail, ObservationExplanation, MedicalReferenceDetail
)
from app.integrations.sms.adapter import sms_adapter, format_screening_sms
from app.integrations.ai.hf_client import hf_client
from app.integrations.ai.analysis_pipeline import analysis_pipeline
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/screenings", tags=["Oral Screenings"])

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

    # Aarogya Mytra AI 12-Stage Evidence-Grounded Analysis Execution
    if payload.image_id and img_rec:
        mytra_res = await analysis_pipeline.execute_pipeline(
            image_path=img_rec.stored_path,
            image_bytes=None,
            category="mouth_oral",
            clinical_context={
                "symptoms": payload.symptoms,
                "duration_days": payload.duration_days,
                "body_site": oral_site_enum.value,
                "mouth_opening_mm": payload.mouth_opening_mm,
                "pain_score": payload.pain_score,
                "bleeding": payload.bleeding,
                "burning_sensation": payload.burning_sensation,
                "patient_id": patient.id,
                "screening_id": screening.id
            },
            consent_recorded=True,
            language=patient.preferred_language or "te"
        )
        mytra_assessment = MytraAIAssessment(
            assessment_id=f"MYTRA-{uuid.uuid4().hex[:12].upper()}",
            screening_id=screening.id,
            image_id=img_rec.id,
            patient_id=patient.id,
            created_by_user_id=current_user.id,
            image_category="mouth_oral",
            assessment_status=mytra_res.get("assessment_status", "preliminary"),
            clinician_review_status="pending",
            urgency=mytra_res.get("urgency", "routine_review"),
            urgency_reason=mytra_res.get("urgency_reason", ""),
            structured_response=mytra_res,
            audit_trail_json=mytra_res.get("audit_trail", [])
        )
        db.add(mytra_assessment)

    # Queue SMS confirmation to patient
    sms_content = format_screening_sms(ref_id, patient_name=patient.full_name)
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

    # Auto-create Arogya Mitra Care Lead for end-to-end follow-up
    lead_ref = f"LEAD-2026-{random.randint(1000, 9999)}"
    lead_task = NavigationTask(
        task_ref=lead_ref,
        patient_id=patient.id,
        screening_id=screening.id,
        task_type="ai_screening_lead",
        status=NavigationStatus.PENDING,
        ai_call_status="pending",
        duration_suffering_days=payload.duration_days,
        severity_stage=f"Stage {payload.severity.capitalize()} - {lesion_type_enum.value.replace('_', ' ').title()}",
        notes=f"Arogya Mitra AI Care Lead created from screening {ref_id}. Preliminary evaluation: {lesion_type_enum.value} on {oral_site_enum.value}."
    )
    db.add(lead_task)

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

@router.get("/{id}/mytra-assessment", response_model=Optional[MytraAnalysisResponse])
def get_screening_mytra_assessment(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve evidence-grounded Aarogya Mytra AI assessment associated with this screening.
    """
    screening = db.query(Screening).filter(Screening.id == id).first()
    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found.")

    mytra = db.query(MytraAIAssessment).filter(
        MytraAIAssessment.screening_id == id
    ).order_by(MytraAIAssessment.created_at.desc()).first()

    if not mytra:
        return None

    res = mytra.structured_response or {}
    return MytraAnalysisResponse(
        assessment_id=mytra.assessment_id,
        assessment_status=mytra.assessment_status,
        image_category=mytra.image_category,
        image_quality=ImageQualityDetail(**res.get("image_quality", {})),
        visible_observations=res.get("visible_observations", []),
        possible_explanations=[ObservationExplanation(**e) for e in res.get("possible_explanations", [])],
        missing_information=res.get("missing_information", []),
        red_flags=res.get("red_flags", []),
        recommended_next_step=res.get("recommended_next_step", ""),
        urgency=mytra.urgency,
        urgency_reason=mytra.urgency_reason or res.get("urgency_reason", ""),
        medical_references=[MedicalReferenceDetail(**r) for r in res.get("medical_references", [])],
        cancer_safety_notice=res.get("cancer_safety_notice", ""),
        model_name=res.get("model_name", "MedGemma"),
        model_version=res.get("model_version", "1.5-4b-it"),
        created_at=mytra.created_at.isoformat(),
        clinician_review_status=mytra.clinician_review_status,
        guidance_message=res.get("guidance_message"),
        audit_trail=mytra.audit_trail_json
    )
