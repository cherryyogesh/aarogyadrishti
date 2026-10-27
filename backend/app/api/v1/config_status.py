from fastapi import APIRouter, Depends
from app.core.config import settings
from app.integrations.sms.adapter import sms_adapter
from app.integrations.ai.hf_client import hf_client
from app.api.deps import get_current_user
from app.models.entities import User

router = APIRouter(prefix="/config", tags=["Configuration Status"])

@router.get("/status")
def get_system_config_status(current_user: User = Depends(get_current_user)):
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
            "model_id": settings.AI_MODEL_ID,
            "is_configured": hf_client.is_configured(),
            "provider": "Hugging Face Inference API" if hf_client.is_configured() else "Local Deterministic Clinical Safety & Triage Engine (HF Unconfigured)",
            "safety_guardrails_active": True
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
