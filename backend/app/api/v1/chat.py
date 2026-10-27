from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import ChatMessage, ScreeningImage
from app.schemas.all_schemas import ChatMessagePayload, ChatMessageResponse
from app.integrations.ai.hf_client import hf_client
from app.integrations.ai.triage import detect_emergency_symptoms, check_cancer_claim_guard

router = APIRouter(prefix="/chat", tags=["Medical AI Chatbot"])

@router.post("/message", response_model=ChatMessageResponse)
async def send_chat_message(
    payload: ChatMessagePayload,
    db: Session = Depends(get_db)
):
    text = payload.message.strip()
    session_id = payload.session_id.strip()

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

    # Generate AI response with medical guardrails
    ai_resp = await hf_client.generate_response(
        prompt=text,
        category="general",
        language=payload.language,
        has_attachment=has_attachment
    )

    warning_flag = None
    if ai_resp.get("is_emergency"):
        warning_flag = "EMERGENCY_RED_FLAG"

    # Save assistant message
    asst_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=ai_resp.get("content", ""),
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
