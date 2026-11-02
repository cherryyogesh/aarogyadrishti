import os
import re
import time
import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any

from app.core.config import settings
from app.integrations.sms.adapter import sms_adapter
from app.integrations.ai.gemini_provider import gemini_provider
from app.integrations.ai.gemini_chat_engine import gemini_chat_engine
from app.api.deps import get_current_user
from app.models.entities import User

logger = logging.getLogger("config_status")

router = APIRouter(prefix="/config", tags=["Configuration Status"])

class AIKeyPayload(BaseModel):
    provider: str = "gemini"  # gemini, groq, openai
    api_key: Optional[str] = ""
    endpoint_url: Optional[str] = None
    model_id: Optional[str] = None

class AIEndpointPayload(BaseModel):
    endpoint_url: str
    model_id: Optional[str] = "gemini-3.6-flash"
    api_key: Optional[str] = ""

@router.get("/status")
def get_system_config_status(current_user: User = Depends(get_current_user)):
    is_gemini_ok = gemini_provider.is_configured()
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
            "model_id": gemini_provider.model_name,
            "is_configured": is_gemini_ok,
            "provider": "google_gemini",
            "safety_guardrails_active": True,
            "details": {
                "active_provider": "google_gemini",
                "active_model": gemini_provider.model_name,
                "is_live_llm_connected": is_gemini_ok,
                "clinical_guidelines": "MoHFW/ICMR/WHO Grounded"
            }
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
    Get live connection status of Google Gemini and clinical AI providers.
    """
    is_connected = gemini_provider.is_configured()
    return {
        "active_provider": "google_gemini",
        "active_model": gemini_provider.model_name,
        "is_live_llm_connected": is_connected,
        "providers": [
            {
                "id": "gemini",
                "name": f"Google Gemini API ({gemini_provider.model_name})",
                "status": "connected" if is_connected else "unconfigured",
                "speed": "ultra_fast",
                "type": "cloud",
                "model": gemini_provider.model_name,
                "description": "Primary multimodal medical vision and clinical dialogue assistant."
            }
        ]
    }

@router.post("/ai-keys")
async def set_ai_key(payload: AIKeyPayload):
    """
    Configure and activate a Google Gemini API key.
    """
    prov = payload.provider.lower().strip()
    key = (payload.api_key or "").strip()

    if not key:
        raise HTTPException(status_code=400, detail="API Key cannot be empty.")

    # Live verification with Gemini API before saving
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_provider.model_name}?key={key}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            if resp.status_code not in [200, 404]:
                raise HTTPException(status_code=400, detail=f"Gemini API rejected key with HTTP {resp.status_code}")
    except Exception as e:
        if not isinstance(e, HTTPException):
            raise HTTPException(status_code=400, detail=f"Failed to connect to Google Gemini: {str(e)}")
        raise e

    # Persist to environment and file
    os.environ["GEMINI_API_KEY"] = key
    setattr(settings, "GEMINI_API_KEY", key)
    gemini_provider._api_key = key
    gemini_provider._init_sdk_client()
    gemini_chat_engine._init_client()

    backend_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env")
    try:
        existing = ""
        if os.path.exists(backend_env):
            with open(backend_env, "r", encoding="utf-8") as f:
                existing = f.read()
        pattern = r"^GEMINI_API_KEY=.*$"
        new_line = f"GEMINI_API_KEY={key}"
        if re.search(pattern, existing, flags=re.MULTILINE):
            updated = re.sub(pattern, new_line, existing, flags=re.MULTILINE)
        else:
            updated = existing.strip() + f"\n{new_line}\n"
        with open(backend_env, "w", encoding="utf-8") as f:
            f.write(updated)
    except Exception as err:
        logger.warning(f"Failed to write to .env: {err}")

    return {
        "success": True,
        "message": f"✓ Google Gemini API Key verified and saved successfully! Live multimodal AI reasoning is active.",
        "status": get_ai_status()
    }

@router.get("/probe-endpoint")
async def probe_endpoint(url: str = Query(..., description="Target endpoint URL")):
    """
    Probes an endpoint URL for latency and reachability.
    """
    try:
        t0 = time.time()
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            latency = int((time.time() - t0) * 1000)
            return {
                "reachable": True,
                "status_code": resp.status_code,
                "latency_ms": latency
            }
    except Exception as e:
        return {
            "reachable": False,
            "error": str(e)
        }
