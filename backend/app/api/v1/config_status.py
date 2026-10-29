from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.config import settings
from app.integrations.sms.adapter import sms_adapter
from app.integrations.ai.hf_client import hf_client
from app.integrations.ai.llm_clinical_engine import llm_clinical_engine
from app.api.deps import get_current_user
from app.models.entities import User

router = APIRouter(prefix="/config", tags=["Configuration Status"])

class AIKeyPayload(BaseModel):
    provider: str = "gemini"  # gemini, groq, huggingface, openai
    api_key: str
    model_id: Optional[str] = None

@router.get("/status")
def get_system_config_status(current_user: User = Depends(get_current_user)):
    ai_status = llm_clinical_engine.get_status()
    return {
        "app_name": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "database": {
            "type": "SQLite (Local Persistent ACID)" if "sqlite" in settings.DATABASE_URL else "PostgreSQL",
            "url_configured": True
        },
        "sms_provider": {
            "provider": settings.SMS_PROVIDER,
            "is_configured": sms_adapter.is_real_provider_configured(),
            "synthetic_dev_mode": not sms_adapter.is_real_provider_configured(),
            "label": "Configured Live SMS Gateway" if sms_adapter.is_real_provider_configured() else "Synthetic Development Mode Active (Simulated Gateway with Full DB Audit)"
        },
        "ai_service": {
            "model_id": ai_status.get("active_model", settings.AI_MODEL_ID),
            "is_configured": ai_status.get("is_live_llm_connected", False),
            "provider": ai_status.get("active_provider", "autonomous_knowledge_engine"),
            "safety_guardrails_active": True,
            "details": ai_status
        },
        "telemedicine": {
            "webrtc_support": True,
            "stun_server": settings.STUN_SERVER_URL,
            "turn_configured": bool(settings.TURN_SERVER_URL)
        },
        "storage": {
            "directory": settings.STORAGE_DIR,
            "max_upload_mb": settings.MAX_UPLOAD_SIZE_MB
        }
    }

@router.get("/ai-status")
def get_ai_status():
    """
    Get live connection status of MedGemma and LLM providers.
    """
    return llm_clinical_engine.get_status()

@router.post("/ai-keys")
def set_ai_key(payload: AIKeyPayload):
    """
    Configure and activate a Fast API Key for MedGemma (Google Gemini, Groq, HF, OpenAI).
    """
    key = payload.api_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="API Key cannot be empty.")
    
    status = llm_clinical_engine.set_api_key(
        provider=payload.provider,
        api_key=key,
        model_id=payload.model_id
    )
    return {
        "success": True,
        "message": f"Fast API Key for {payload.provider.upper()} activated successfully.",
        "status": status
    }
