import os
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import ChatMessage, ScreeningImage
from app.schemas.all_schemas import ChatMessagePayload, ChatMessageResponse
from app.integrations.ai.hf_client import hf_client
from app.integrations.ai.gemini_chat_engine import gemini_chat_engine
from app.integrations.ai.triage import detect_emergency_symptoms, check_cancer_claim_guard
from app.integrations.ai.medical_rag import medical_rag
from app.integrations.ai.clinical_safety import clinical_safety
from app.integrations.ai.analysis_pipeline import analysis_pipeline
from app.integrations.image.quality import analyze_image_quality_bytes

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

    # Fetch recent conversation context (last 6 messages) for multi-turn coherence
    past_msgs = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id,
        ChatMessage.id != user_msg.id
    ).order_by(ChatMessage.created_at.desc()).limit(6).all()
    history = [{"role": m.role, "content": m.content} for m in reversed(past_msgs)]

    # 1. If an image is attached, execute the 12-stage medical vision pipeline
    warning_flag = None

    if has_attachment and attachment_path and os.path.exists(attachment_path):
        # 1. Read attached image bytes
        with open(attachment_path, "rb") as f:
            attached_bytes = f.read()

        mime_type = "image/jpeg"
        if attached_bytes.startswith(b"\x89PNG"):
            mime_type = "image/png"
        elif attached_bytes.startswith(b"RIFF") and b"WEBP" in attached_bytes[:16]:
            mime_type = "image/webp"

        # 2. Check photographic quality
        q_eval = analyze_image_quality_bytes(attached_bytes)
        if q_eval.get("is_blurry") and q_eval.get("blur_score", 100) < 20.0:
            if is_te:
                final_content = (
                    "నమస్కారం! మీరు పంపిన ఫొటో చాలా అస్పష్టంగా (Blurry) ఉంది. సమస్య లేదా వ్యాధిని ఖచ్చితంగా పరిశీలించడానికి వివరాలు స్పష్టంగా కనిపించడం లేదు.\n\n"
                    "📸 **మంచి ఫలితం కోసం:** మంచి వెలుతురులో, కెమెరాను కదలకుండా సమస్య ఉన్న భాగాన్ని దగ్గరగా కేంద్రీకరించి మరో స్పష్టమైన ఫొటో పంపండి.\n\n"
                    "ఈలోగా మీకు నొప్పి, మంట లేదా ఇతర లక్షణాలు ఎంతకాలంగా ఉన్నాయో ఇక్కడ మెసేజ్ ద్వారా తెలియజేయండి."
                )
            else:
                final_content = (
                    "Hello! The photo you uploaded appears quite blurry or out of focus. To provide an accurate and reliable assessment of the condition, clearer visual details are needed.\n\n"
                    "📸 **Recommendation:** Please capture a clearer photograph under good, bright lighting, holding the camera steady close to the affected area.\n\n"
                    "In the meantime, feel free to describe your symptoms, how long you have had this, and if you have any pain or discomfort."
                )
        else:
            # 3. Multimodal Analysis: Pass image directly to Google Gemini
            ai_query = text if text and text.strip().lower() not in [
                "attached photograph for review.", "photo", "photograph", "image", "review this photo",
                "దయచేసి ఈ ఫొటోను సమీక్షించండి", "ఫోటో సమీక్ష", "ఫొటో", "photo review"
            ] else (
                "దయచేసి నేను పంపిన ఈ ఫొటోను క్షుణ్ణంగా పరిశీలించి, ఇది ఏ వ్యాధి లేదా సమస్య, దీనికి గల కారణాలు, జాగ్రత్తలు మరియు తదుపరి చర్యలను మానవీయంగా మరియు వివరంగా తెలియజేయండి."
                if is_te else
                "Please analyze this medical photograph carefully. Identify what condition or disease this appears to be, explain its causes, what reliable care to take, and what next steps are needed."
            )

            ai_resp = await gemini_chat_engine.generate_chat_response_async(
                user_message=ai_query,
                language=payload.language,
                has_attachment=True,
                image_bytes=attached_bytes,
                image_mime_type=mime_type,
                conversation_history=history
            )

            if ai_resp.get("is_emergency"):
                warning_flag = "EMERGENCY_RED_FLAG"

            final_content = ai_resp.get("content", "")

    else:
        # 2. Text-only Query - Query Google Gemini Clinical Dialogue Engine
        ai_resp = await gemini_chat_engine.generate_chat_response_async(
            user_message=text,
            language=payload.language,
            has_attachment=False,
            conversation_history=history
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
