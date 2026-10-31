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
    warning_flag = None

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
            explanations = pipeline_res.get("possible_explanations", [])
            primary_expl = explanations[0] if explanations else {}
            cond_title_te = primary_expl.get("condition_title_te") or primary_expl.get("name", "నోటి శ్లేష్మ పొర సమస్య (Oral Lesion)")
            cond_title_en = primary_expl.get("condition_title_en") or primary_expl.get("name", "Oral Mucosal Lesion")
            condition_display = cond_title_te if is_te else cond_title_en

            obs_list = pipeline_res.get("visible_observations", [])
            obs_lines = "\n".join([f"• {obs}" for obs in obs_list[:2]]) if obs_list else (
                "• ప్రభావిత ప్రాంతంలో శ్లేష్మ పొర ఉపరితల మార్పులు గమనించబడ్డాయి." if is_te else "• Observable mucosal surface changes identified on photograph."
            )

            is_generic_caption = not text or text.strip().lower() in [
                "attached photograph for review.",
                "photo", "photograph", "image", "review this photo",
                "దయచేసి ఈ ఫొటోను సమీక్షించండి", "ఫోటో సమీక్ష", "ఫొటో", "photo review"
            ]

            user_query_answer = ""
            if not is_generic_caption:
                ai_resp = await medgemma_chat_engine.generate_chat_response_async(
                    user_message=text,
                    language=payload.language,
                    has_attachment=True
                )
                if ai_resp.get("is_emergency"):
                    warning_flag = "EMERGENCY_RED_FLAG"
                user_query_answer = ai_resp.get("content", "").strip()

            if is_te:
                final_content = (
                    "### 🔬 ఫొటో విశ్లేషణ ఫలితం (AI Image Analysis)\n\n"
                    "🩺 **గుర్తించిన వ్యాధి / పరిస్థితి (Identified Disease):**\n"
                    f"**{condition_display}**\n\n"
                    "📸 **ఫొటోలో కనిపించిన ముఖ్య పరిశీలనలు (Visual Findings):**\n"
                    f"{obs_lines}\n\n"
                )
                if user_query_answer:
                    final_content += (
                        "💬 **మీ ప్రశ్నకు సమాధానం (Clinical Response):**\n"
                        f"{user_query_answer}\n\n"
                    )
                final_content += (
                    "💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య (Care & Next Steps):**\n"
                    "• **గోరువెచ్చని ఉప్పునీటి పుక్కిలింత:** రోజుకు 2-3 సార్లు గోరువెచ్చని నీటిలో అర చెంచా ఉప్పు వేసి నెమ్మదిగా పుక్కిలించండి.\n"
                    "• **ఆహార జాగ్రత్తలు:** కారం, ఎక్కువ వేడి, పులుపు మరియు ఘాటైన మసాలాలను నివారించండి.\n"
                    "• **పొగాకు నిలిపివేత:** పొగాకు, గుట్కా, ఖైనీ, చుట్ట లేదా మద్యం అలవాట్లు ఉంటే తక్షణమే ఆపండి.\n"
                    "• **డాక్టర్ సంప్రదింపు:** ఏదైనా పుండు లేదా మచ్చ **14 రోజుల కంటే ఎక్కువ రోజులు తగ్గకపోతే**, సమీప PHC మెడికల్ ఆఫీసర్ లేదా డెంటల్ డాక్టర్‌ను సంప్రదించాలి.\n\n"
                    "> ⚠️ *గమనిక: ఈ AI ఫలితం ప్రాథమిక పరిశీలన మాత్రమే. ఫోటో ఆధారంగా క్యాన్సర్‌ను నిర్ధారించడం లేదా తోసిపుచ్చడం జరగదు. ఖచ్చితమైన నిర్ధారణకు డాక్టర్ గారి ప్రత్యక్ష పరీక్ష మరియు బయాప్సీ తప్పనిసరి.*"
                )
            else:
                final_content = (
                    "### 🔬 AI Image Analysis Result\n\n"
                    "🩺 **Identified Disease / Condition:**\n"
                    f"**{condition_display}**\n\n"
                    "📸 **Visual Findings on Photograph:**\n"
                    f"{obs_lines}\n\n"
                )
                if user_query_answer:
                    final_content += (
                        "💬 **Clinical Response to Your Question:**\n"
                        f"{user_query_answer}\n\n"
                    )
                final_content += (
                    "💡 **Recommended Care & Next Steps:**\n"
                    "• **Warm Salt Water Rinse:** Dissolve 1/2 tsp salt in warm water and rinse gently 2–3 times daily.\n"
                    "• **Dietary Precautions:** Avoid rough, spicy, acidic, or very hot foods that irritate mucosal tissues.\n"
                    "• **Habit Cessation:** Cease all gutkha, areca nut, tobacco, and smoking immediately.\n"
                    "• **Doctor Consultation:** Under MoHFW national protocols, any oral sore persisting **beyond 14 days** mandates an in-person clinical examination by a PHC Doctor or Dental Specialist.\n\n"
                    "> ⚠️ *Notice: This preliminary visual assessment cannot rule in or rule out cancer. In-person physical examination and biopsy are mandatory.*"
                )

        elif pipeline_res.get("assessment_status") == "quality_check_failed":
            is_te = payload.language == "te"
            final_content = (
                f"### ⚠️ {'ఫొటో నాణ్యత సరిపోలేదు (Image Quality Warning)' if is_te else 'Image Quality Warning'}\n\n"
                f"{pipeline_res.get('guidance_message')}\n\n"
                f"> {'మంచి వెలుతురులో, కెమెరాను కదలకుండా ప్రభావిత ప్రాంతం స్పష్టంగా కనిపించేలా మరో ఫొటో తీయండి.' if is_te else 'Please retake a steady photo under bright lighting with the lesion clearly framed.'}"
            )
        else:
            final_content = pipeline_res.get("guidance_message", "Photo review pending doctor examination.")

    else:
        # 2. Text-only Query - Query MedGemma Unified Clinical LLM & Dialogue Engine
        ai_resp = await medgemma_chat_engine.generate_chat_response_async(
            user_message=text,
            language=payload.language,
            has_attachment=False
        )

        if ai_resp.get("is_emergency"):
            warning_flag = "EMERGENCY_RED_FLAG"

        final_content = ai_resp.get("content", "")

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
        disclaimer="Aarogya Mytra AI Clinical Guidance",
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
