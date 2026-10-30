from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from app.core.config import settings
from app.integrations.sms.adapter import sms_adapter
from app.integrations.ai.hf_client import hf_client
from app.integrations.ai.llm_clinical_engine import llm_clinical_engine
from app.integrations.ai.google_health_medgemma_bridge import google_health_medgemma_bridge
from app.api.deps import get_current_user
from app.models.entities import User

router = APIRouter(prefix="/config", tags=["Configuration Status"])

class AIKeyPayload(BaseModel):
    provider: str = "gemini"  # gemini, groq, huggingface, openai, vllm, medgemma_local
    api_key: Optional[str] = ""
    endpoint_url: Optional[str] = None
    model_id: Optional[str] = None

class AIEndpointPayload(BaseModel):
    endpoint_url: str
    model_id: Optional[str] = "google/medgemma-1.5-4b-it"
    api_key: Optional[str] = ""

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
    Get live connection status of MedGemma and LLM providers, including submodule and custom endpoints.
    """
    return llm_clinical_engine.get_status()

@router.post("/ai-keys")
async def set_ai_key(payload: AIKeyPayload):
    """
    Configure and activate an AI provider key (Gemini, Groq, HF, OpenAI, or local submodule).
    """
    prov = payload.provider.lower().strip()
    key = (payload.api_key or payload.endpoint_url or "").strip()

    # Special handling for activating local MedGemma submodule (Zero API Key)
    if prov in ["medgemma_local", "local", "submodule", "zero_key"]:
        status = llm_clinical_engine.set_api_key(
            provider="medgemma_local",
            api_key="",
            model_id=payload.model_id
        )
        return {
            "success": True,
            "message": "Local Google Health MedGemma submodule activated in Zero API Key mode.",
            "status": status
        }

    # Special handling for custom vLLM / endpoint
    if prov in ["vllm", "custom_endpoint", "medgemma_endpoint"]:
        if not key:
            raise HTTPException(status_code=400, detail="Endpoint URL cannot be empty.")
        status = llm_clinical_engine.set_endpoint(
            endpoint_url=key,
            model_id=payload.model_id,
            api_key=None
        )
        return {
            "success": True,
            "message": f"Custom MedGemma / vLLM Endpoint saved and connected.",
            "status": status
        }

    if not key:
        raise HTTPException(status_code=400, detail="API Key cannot be empty.")

    # Live verification of the key before saving
    val = await llm_clinical_engine.validate_api_key(prov, key)
    if not val.get("valid"):
        raise HTTPException(status_code=400, detail=val.get("error", "Invalid API key provided."))

    status = llm_clinical_engine.set_api_key(
        provider=payload.provider,
        api_key=key,
        model_id=payload.model_id
    )
    return {
        "success": True,
        "message": f"✓ {payload.provider.upper()} API Key verified and connected successfully! Live AI reasoning is now active.",
        "status": status
    }

@router.post("/ai-endpoint")
async def set_ai_endpoint(payload: AIEndpointPayload):
    """
    Connect to a custom self-hosted MedGemma / vLLM / Ollama endpoint without cloud API keys.
    """
    url = payload.endpoint_url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="Endpoint URL cannot be empty.")

    probe_res = await google_health_medgemma_bridge.probe_endpoint(url, payload.api_key)

    status = llm_clinical_engine.set_endpoint(
        endpoint_url=url,
        model_id=payload.model_id or "google/medgemma-1.5-4b-it",
        api_key=payload.api_key or ""
    )
    return {
        "success": True,
        "message": "Custom MedGemma / vLLM Endpoint connected.",
        "probe": probe_res,
        "status": status
    }

@router.get("/probe-endpoint")
async def probe_endpoint(url: str = Query(..., description="Target vLLM or Ollama endpoint URL")):
    """
    Probes an endpoint URL for live latency, connectivity, and detected model IDs.
    """
    return await google_health_medgemma_bridge.probe_endpoint(url)
