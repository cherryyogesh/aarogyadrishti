import pytest
import os
import io
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

from app.integrations.ai.gemini_provider import GeminiProvider, gemini_provider
from app.integrations.ai.gemini_chat_engine import GeminiChatEngine, gemini_chat_engine
from app.integrations.ai.image_scope_registry import scope_registry
from app.integrations.ai.medical_rag import medical_rag
from app.integrations.ai.clinical_safety import clinical_safety
from app.integrations.ai.analysis_pipeline import MedicalImageAnalysisPipeline

def create_test_image(blurry: bool = False, dark: bool = False) -> str:
    tmp_path = os.path.join(os.path.dirname(__file__), "temp_test_image.jpg")
    img = Image.new("RGB", (640, 480), color=(240, 240, 240))
    if not blurry:
        draw = ImageDraw.Draw(img)
        for i in range(0, 640, 30):
            draw.line([(i, 0), (i, 480)], fill=(0, 0, 0), width=4)
            draw.rectangle([(i, 50), (i + 20, 250)], fill=(180, 20, 20))
    img.save(tmp_path, "JPEG")
    return tmp_path

# ----------------- 1. Provider Interface & Gemini Health -----------------
@pytest.mark.anyio
async def test_gemini_unconfigured_behavior():
    provider = GeminiProvider(api_key="", model_name="gemini-3.6-flash")
    assert provider.is_configured() is False
    health = await provider.check_provider_health()
    assert health["status"] == "unconfigured"
    assert health["is_healthy"] is False

    # Analyze must report clear not configured message, NEVER fake inference
    res = await provider.analyze_image(b"fakebytes", "mouth_oral", {})
    assert res["success"] is False
    assert "not configured" in res["error_message"]

@pytest.mark.anyio
async def test_gemini_provider_metadata():
    provider = GeminiProvider(api_key="AQ.testkey_placeholder", model_name="gemini-3.6-flash")
    meta = provider.get_model_metadata()
    assert meta["model_name"] == "Google Gemini Multimodal AI"
    assert meta["model_id"] == "gemini-3.6-flash"
    assert meta["provider_type"] == "google_gemini_api"
    assert "Mandatory clinician review" in meta["clinical_oversight"]

# ----------------- 2. Gemini Dialogue & Safety Engine -----------------
@pytest.mark.anyio
async def test_gemini_chat_emergency_triage():
    engine = GeminiChatEngine()
    # Test emergency red flag detection
    res = await engine.generate_chat_response_async("patient is choking cannot breathe and bleeding heavily", language="en")
    assert res["is_emergency"] is True
    assert res["urgency"] == "emergency"
    assert "108" in res["content"]

@pytest.mark.anyio
async def test_gemini_chat_telugu_knowledge_fallback():
    engine = GeminiChatEngine()
    res = await engine.generate_chat_response_async("నోటి పూత తగ్గడానికి తీసుకోవలసిన జాగ్రత్తలు ఏమిటి?", language="te")
    assert res["is_emergency"] is False
    assert "పూత" in res["content"] or "నోటి" in res["content"]
    assert len(res["content"]) > 50

# ----------------- 3. Image Scope Registry -----------------
def test_image_scope_registry_categories():
    categories = scope_registry.get_supported_categories()
    cat_ids = [c["category_id"] for c in categories]
    assert "mouth_oral" in cat_ids
    assert "skin_lesion" in cat_ids
    assert "eye_anterior" in cat_ids
    assert "wound_ulcer" in cat_ids

def test_image_scope_registry_unsupported_refusal():
    refusal = scope_registry.get_unsupported_refusal("general_unknown_body_part")
    assert refusal["can_analyze"] is False
    assert "Automated assessment is not available" in refusal["status_message"]
    assert "healthcare professional review" in refusal["status_message"]

# ----------------- 4. Medical Evidence RAG -----------------
def test_medical_rag_retrieval_and_citations():
    refs = medical_rag.retrieve_relevant_references(
        query="white patch leukoplakia",
        body_region="mouth_oral",
        symptoms="persisting patch"
    )
    assert len(refs) > 0
    top_ref = refs[0]
    assert "MoHFW" in top_ref["publisher"] or "Ministry of Health" in top_ref["publisher"]
    assert top_ref["source_url"].startswith("http")

    formatted = medical_rag.format_citations_markdown(refs)
    assert "National Oral Health Programme" in formatted or "MoHFW" in formatted

# ----------------- 5. Clinical Safety & Urgency Guardrails -----------------
def test_emergency_red_flags():
    emergency_text = "patient has severe chest pain and coughing blood"
    flag = clinical_safety.evaluate_emergency_flags(emergency_text)
    assert flag is not None
    assert flag["urgency"] == "urgent_care"

def test_cancer_claim_sanitization():
    dirty_text = "The model proves cancer stage II with 95% confidence."
    sanitized = clinical_safety.sanitize_model_output(dirty_text)
    assert "proves cancer" not in sanitized
    assert "95% confidence" not in sanitized
    assert "in-person clinical biopsy" in sanitized

def test_14_day_persistence_urgency_escalation():
    urgency, reason, red_flags = clinical_safety.calculate_urgency(
        category="mouth_oral",
        clinical_context={"duration_days": 21, "symptoms": "non-healing mucosal ulcer"},
        visible_observations=["firm non-healing ulceration with indurated margins"]
    )
    assert urgency in ["prompt_assessment", "urgent_care"]
    assert "14" in reason or "14" in str(red_flags) or "persistent" in reason.lower()

# ----------------- 6. 12-Stage Pipeline Validation -----------------
@pytest.mark.anyio
async def test_pipeline_consent_requirement():
    pipeline = MedicalImageAnalysisPipeline()
    res = await pipeline.execute_pipeline(
        image_path="nonexistent.jpg",
        image_bytes=None,
        category="mouth_oral",
        clinical_context={},
        consent_recorded=False
    )
    assert res["assessment_status"] == "failed"
    assert res["error_type"] == "CONSENT_NOT_RECORDED"
    assert "consent has not been recorded" in res["error_message"].lower()

@pytest.mark.anyio
async def test_pipeline_unsupported_category():
    test_img = create_test_image()
    try:
        pipeline = MedicalImageAnalysisPipeline()
        res = await pipeline.execute_pipeline(
            image_path=test_img,
            image_bytes=None,
            category="abdominal_ct",
            clinical_context={"symptoms": "pain"},
            consent_recorded=True
        )
        assert res["assessment_status"] == "unsupported_category"
        assert res["doctor_review_required"] is True
    finally:
        if os.path.exists(test_img):
            os.remove(test_img)

# ----------------- 7. API Endpoint Integration -----------------
def test_mytra_ai_endpoints(client: TestClient, chw_token: str, doctor_token: str):
    headers = {"Authorization": f"Bearer {chw_token}"}

    # 1. Health endpoint
    resp = client.get("/api/v1/mytra-ai/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "Google Gemini" in data["model_metadata"]["model_name"]
    assert data["provider"] == "google_gemini"

    # 2. Scope registry
    reg_resp = client.get("/api/v1/mytra-ai/scope-registry")
    assert reg_resp.status_code == 200
    assert len(reg_resp.json()["scope_categories"]) >= 5

    # 3. References query
    ref_resp = client.get("/api/v1/mytra-ai/references?query=leukoplakia&body_region=mouth_oral")
    assert ref_resp.status_code == 200
    assert ref_resp.json()["references_count"] > 0

    # 4. AI Provider Status endpoint
    provider_resp = client.get("/api/v1/mytra-ai/ai-provider-status")
    assert provider_resp.status_code == 200
    pdata = provider_resp.json()
    assert pdata["provider"] == "google_gemini"
