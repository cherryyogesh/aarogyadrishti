from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import ChatMessage, ScreeningImage
from app.schemas.all_schemas import ChatMessagePayload, ChatMessageResponse
from app.integrations.ai.hf_client import hf_client
from app.integrations.ai.medgemma_chat_engine import medgemma_chat_engine
from app.integrations.ai.triage import detect_emergency_symptoms, check_cancer_claim_guard
from app.integrations.ai.medical_rag import medical_rag
from app.integrations.ai.clinical_safety import clinical_safety
from app.integrations.ai.analysis_pipeline import analysis_pipeline

router = APIRouter(prefix="/chat", tags=["Medical AI Chatbot"])

@router.post("/message", response_model=ChatMessageResponse)
async def send_chat_message(
    payload: ChatMessagePayload,
    db: Session = Depends(get_db)
):
    text = payload.message.strip()
    session_id = payload.session_id.strip()
    is_te = payload.language == "te"
    is_hi = payload.language == "hi"

    attachment_path = None
    preview_url = None
    quality_feedback = None
    has_attachment = False

    if payload.attachment_image_id:
        img_rec = db.query(ScreeningImage).filter(ScreeningImage.id == payload.attachment_image_id).first()
        if img_rec:
            has_attachment = True
            attachment_path = img_rec.stored_path
            preview_url = f"/api/v1/images/{img_rec.id}/file"
            if img_rec.processing_results:
                quality_feedback = img_rec.processing_results.guidance_message

    # Save user message
    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=text,
        language=payload.language,
        has_attachment=has_attachment,
        attachment_path=attachment_path,
        quality_feedback=quality_feedback
    )
    db.add(user_msg)
    db.flush()

    # 1. If an image is attached, execute the 12-stage medical vision pipeline
    image_analysis_report = None
    if has_attachment and attachment_path:
        pipeline_res = await analysis_pipeline.execute_pipeline(
            image_path=attachment_path,
            image_bytes=None,
            category="mouth_oral",
            clinical_context={
                "symptoms": text if text and text != "Attached photograph for review." else "Oral lesion visual inspection",
                "duration_days": 14,
                "body_site": "tongue_or_oral_mucosa",
                "language": payload.language
            },
            consent_recorded=True,
            language=payload.language
        )

        if pipeline_res.get("assessment_status") == "preliminary":
            sh = pipeline_res.get("stakeholder_views") or {}
            patient_view = sh.get("patient") or {}
            asha_view = sh.get("asha") or {}
            doctor_view = sh.get("doctor") or {}

            # Tier 1: Patient & Family (Simple, Caring, Plain Local Language)
            patient_sec = ""
            if patient_view:
                home_care_list = "\n".join([f"  • {item}" for item in patient_view.get("home_care", [])])
                patient_sec = (
                    f"### {patient_view.get('title', '🗣️ రోగి & కుటుంబ సభ్యులకు సులభమైన వివరణ')}\n\n"
                    f"**ఏమి కనిపిస్తోంది (What is seen):**\n{patient_view.get('summary', '')}\n\n"
                    f"**మీరు ఇంట్లో చేయవలసిన తక్షణ జాగ్రత్తలు (Immediate Self-Care):**\n{home_care_list}\n\n"
                    f"👉 **డాక్టర్‌ను ఎందుకు సంప్రదించాలి:** {patient_view.get('doctor_reason', '')}\n\n"
                    f"---\n"
                )

            # Tier 2: ASHA Worker & PHC Staff (Field Checklist, Priority, Next Steps)
            asha_sec = ""
            if asha_view:
                checklist_items = "\n".join([f"  ✓ {item}" for item in asha_view.get("field_checklist", [])])
                asha_sec = (
                    f"### {asha_view.get('title', '👩‍⚕️ ఆశా కార్యకర్తలు & PHC సిబ్బందికి మార్గదర్శకాలు')}\n\n"
                    f"**అత్యవసర ప్రాధాన్యత (Priority Level):** `{asha_view.get('action_urgency', '')}`\n\n"
                    f"**ఫీల్డ్ చెక్‌లిస్ట్ (రోగిని అడగవలసిన ప్రశ్నలు):**\n{checklist_items}\n\n"
                    f"**తదుపరి చర్య (Action Step):** {asha_view.get('referral_step', '')}\n\n"
                    f"---\n"
                )

            # Tier 3: Doctors & Specialists (Objective Morphological Features, Differential Diagnoses, Protocols)
            obs_lines = "\n".join([f"• {obs}" for obs in pipeline_res.get("visible_observations", [])])
            expl_lines = "\n".join([f"• **{e['name']}**: {e['reasoning']}" for e in pipeline_res.get("possible_explanations", [])])
            citations = medical_rag.format_citations_markdown(pipeline_res.get("medical_references", []), language=payload.language)

            doctor_sec = (
                f"### {'🩺 వైద్యులు & స్పెషలిస్టుల క్లినికల్ నివేదిక (Doctor & Specialist Clinical Report)' if is_te else '🩺 Clinical Report for Doctors & Specialists'}\n\n"
                f"**Visible Morphology & Feature Extraction:**\n{obs_lines}\n\n"
                f"**Differential Considerations (MoHFW & ICMR Protocols):**\n{expl_lines}\n\n"
                f"**Clinical Next Step:** {pipeline_res.get('recommended_next_step')}\n\n"
                f"**Urgency & Triage Classification:** `{pipeline_res.get('urgency').upper()}` — {pipeline_res.get('urgency_reason')}\n\n"
                f"---\n"
                f"### 📚 {'ప్రామాణిక వైద్య మార్గదర్శకాలు (Verified Clinical Guidelines)' if is_te else 'Verified Clinical Guidelines & Evidence'}\n"
                f"{citations}\n\n"
                f"> ⚠️ *{pipeline_res.get('cancer_safety_notice')}*\n"
                f"> *Preliminary AI-assisted assessment — clinician review pending.*"
            )

            image_analysis_report = (
                f"{patient_sec}"
                f"{asha_sec}"
                f"{doctor_sec}"
            )

        elif pipeline_res.get("assessment_status") == "quality_check_failed":
            image_analysis_report = (
                f"### ⚠️ {'ఫొటో నాణ్యత పరిమితి (Image Quality Warning)' if is_te else 'Image Quality Warning'}\n\n"
                f"{pipeline_res.get('guidance_message')}\n\n"
                f"> {'మంచి వెలుతురులో, కెమెరాను కదలకుండా ప్రభావిత ప్రాంతం స్పష్టంగా కనిపించేలా మరో ఫొటో తీయండి.' if is_te else 'Please retake a steady photo under bright lighting with the lesion clearly framed.'}"
            )

    # 2. Retrieve verified medical references for textual query
    retrieved_refs = medical_rag.retrieve_relevant_references(query=text, symptoms=text, max_results=2)
    rag_citations = medical_rag.format_citations_markdown(retrieved_refs, language=payload.language) if retrieved_refs else ""

    # Generate AI response using MedGemma Unified Clinical LLM & Dialogue Engine
    ai_resp = await medgemma_chat_engine.generate_chat_response_async(
        user_message=text,
        language=payload.language,
        has_attachment=has_attachment
    )

    warning_flag = None
    if ai_resp.get("is_emergency"):
        warning_flag = "EMERGENCY_RED_FLAG"

    final_content = ai_resp.get("content", "")
    if image_analysis_report:
        # If user only uploaded a photograph without a specific question, use the image analysis report directly
        is_generic_caption = not text or text.strip().lower() in [
            "attached photograph for review.",
            "photo", "photograph", "image", "review this photo",
            "దయచేసి ఈ ఫొటోను సమీక్షించండి", "ఫోటో సమీక్ష", "ఫొటో"
        ]
        if is_generic_caption:
            final_content = image_analysis_report
        else:
            final_content = f"{image_analysis_report}\n\n---\n### 💬 {'మీ ప్రశ్నకు సమాధానం (Clinical Response)' if is_te else 'Clinical Response to Specific Question'}\n{final_content}"
    elif rag_citations and not ai_resp.get("is_emergency"):
        final_content = f"{final_content}\n\n---\n### 📚 {'ప్రామాణిక మార్గదర్శకాలు' if is_te else 'Verified Clinical Guidelines'}\n{rag_citations}"

    # Save assistant message
    asst_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=final_content,
        language=payload.language,
        has_attachment=False
    )
    db.add(asst_msg)
    db.commit()
    db.refresh(asst_msg)

    return ChatMessageResponse(
        id=asst_msg.id,
        session_id=session_id,
        role="assistant",
        content=asst_msg.content,
        language=asst_msg.language,
        has_attachment=has_attachment,
        attachment_preview_url=preview_url,
        warning_flag=warning_flag,
        disclaimer=ai_resp.get("disclaimer", "Non-diagnostic guidance."),
        created_at=asst_msg.created_at
    )

@router.get("/history/{session_id}", response_model=List[ChatMessageResponse])
def get_chat_history(session_id: str, db: Session = Depends(get_db)):
    msgs = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.asc()).all()

    results = []
    for m in msgs:
        results.append(ChatMessageResponse(
            id=m.id,
            session_id=m.session_id,
            role=m.role,
            content=m.content,
            language=m.language,
            has_attachment=m.has_attachment,
            attachment_preview_url=None,
            warning_flag=None,
            disclaimer="This information is informational only and not a medical diagnosis.",
            created_at=m.created_at
        ))
    return results
