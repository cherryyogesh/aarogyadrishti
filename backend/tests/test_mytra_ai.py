import pytest
import os
import io
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

from app.integrations.ai.medgemma_provider import MedGemmaProvider
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

# ----------------- 1. Provider Interface & MedGemma Health -----------------
@pytest.mark.anyio
async def test_medgemma_unconfigured_behavior():
    provider = MedGemmaProvider(provider_type="none", endpoint_url="", api_key="")
    assert provider.is_configured() is False
    health = await provider.check_provider_health()
    assert health["status"] == "not_configured"

    # Analyze must return clear not configured message, NEVER fake inference
    res = await provider.analyze_image(b"fakebytes", "mouth_oral", {})
    assert res["success"] is False
    assert res["error_type"] == "NOT_CONFIGURED"
    assert "Medical AI not configured" in res["error_message"]

@pytest.mark.anyio
async def test_medgemma_mock_test_provider():
    provider = MedGemmaProvider(provider_type="mock_test")
    assert provider.is_configured() is True
    res = await provider.analyze_image(
        b"mockbytes",
        "mouth_oral",
        {"symptoms": "white patch on cheek for 3 weeks", "body_site": "buccal_mucosa"}
    )
    assert res["success"] is True
    assert len(res["visible_observations"]) > 0
    assert len(res["possible_explanations"]) > 0
    assert "Leukoplakia" in res["possible_explanations"][0]["name"]

# ----------------- 2. Image Scope Registry -----------------
def test_image_scope_registry_categories():
    categories = scope_registry.get_supported_categories()
    cat_ids = [c["category_id"] for c in categories]
    assert "mouth_oral" in cat_ids
    assert "skin_lesion" in cat_ids
    assert "eye_anterior" in cat_ids
    assert "wound_ulcer" in cat_ids

def test_image_scope_registry_unsupported_refusal():
    # Unsupported category must produce explicit standard refusal
    refusal = scope_registry.get_unsupported_refusal("general_unknown_body_part")
    assert refusal["can_analyze"] is False
    assert "Automated assessment is not available" in refusal["status_message"]
    assert "healthcare professional review" in refusal["status_message"]

# ----------------- 3. Medical Evidence RAG -----------------
def test_medical_rag_retrieval_and_citations():
    # Oral Leukoplakia query
    refs = medical_rag.retrieve_relevant_references(
        query="white patch leukoplakia",
        body_region="mouth_oral",
        symptoms="persisting patch"
    )
    assert len(refs) > 0
    top_ref = refs[0]
    assert "MoHFW" in top_ref["publisher"] or "Ministry of Health" in top_ref["publisher"]
    assert top_ref["source_url"].startswith("http")
    assert top_ref["review_status"] == "official_national_guideline"

    # Format citations test
    formatted = medical_rag.format_citations_markdown(refs)
    assert "National Oral Health Programme" in formatted or "MoHFW" in formatted

# ----------------- 4. Clinical Safety & Urgency Guardrails -----------------
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
        clinical_context={"duration_days": 21, "mouth_opening_mm": 40, "symptoms": "white plaque"},
        visible_observations=["White plaque noted"]
    )
    assert urgency == "prompt_assessment"
    assert "PERSISTENT_LESION_OVER_14_DAYS" in red_flags

def test_severe_trismus_under_20mm_urgency():
    urgency, reason, red_flags = clinical_safety.calculate_urgency(
        category="mouth_oral",
        clinical_context={"duration_days": 10, "mouth_opening_mm": 16, "symptoms": "burning"},
        visible_observations=["Mucosal blanching"]
    )
    assert urgency == "urgent_care"
    assert "SEVERE_TRISMUS_UNDER_20MM" in red_flags

# ----------------- 5. 12-Stage Pipeline Execution -----------------
@pytest.mark.anyio
async def test_full_pipeline_execution():
    test_img = create_test_image()
    mock_provider = MedGemmaProvider(provider_type="mock_test")
    pipeline = MedicalImageAnalysisPipeline(provider=mock_provider)

    result = await pipeline.execute_pipeline(
        image_path=test_img,
        image_bytes=None,
        category="mouth_oral",
        clinical_context={
            "symptoms": "white patch for 25 days with burning sensation",
            "duration_days": 25,
            "body_site": "buccal_mucosa",
            "mouth_opening_mm": 28
        },
        consent_recorded=True,
        language="en"
    )

    if os.path.exists(test_img):
        os.remove(test_img)

    assert result["assessment_status"] == "preliminary"
    assert result["image_category"] == "mouth_oral"
    assert len(result["visible_observations"]) > 0
    assert len(result["possible_explanations"]) > 0
    assert len(result["medical_references"]) > 0
    assert result["urgency"] in ["prompt_assessment", "urgent_care"]
    assert result["clinician_review_status"] == "pending"
    assert len(result["audit_trail"]) >= 10

# ----------------- 6. API Endpoint Integration -----------------
def test_mytra_ai_endpoints(client: TestClient, chw_token: str, doctor_token: str):
    headers = {"Authorization": f"Bearer {chw_token}"}
    doc_headers = {"Authorization": f"Bearer {doctor_token}"}

    # 1. Health endpoint
    resp = client.get("/api/v1/mytra-ai/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "Google MedGemma" in data["model_metadata"]["model_name"]

    # 2. Scope registry
    reg_resp = client.get("/api/v1/mytra-ai/scope-registry")
    assert reg_resp.status_code == 200
    assert len(reg_resp.json()["scope_categories"]) >= 5

    # 3. References query
    ref_resp = client.get("/api/v1/mytra-ai/references?query=leukoplakia&body_region=mouth_oral")
    assert ref_resp.status_code == 200
    assert ref_resp.json()["references_count"] > 0

    # 4. Local MedGemma status endpoint (Zero External APIs)
    status_resp = client.get("/api/v1/mytra-ai/local/status", headers=headers)
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert "Google MedGemma 1.5 4B" in status_data["model_name"]
    assert status_data["is_local_only"] is True
    assert status_data["external_api_calls"] is False
    assert "step1" in status_data["access_requirements"]
    assert "step2" in status_data["access_requirements"]

    # 5. Local MedGemma inference - Report Explanation
    report_resp = client.post(
        "/api/v1/mytra-ai/local/analyze",
        headers=headers,
        data={
            "question": "Explain this biopsy report showing squamous cell hyperplasia",
            "task_type": "report_explanation",
            "category": "mouth_oral",
            "language": "en"
        }
    )
    assert report_resp.status_code == 200
    report_data = report_resp.json()
    assert report_data["task_type"] == "report_explanation"
    assert report_data["is_local_only"] is True
    assert report_data["external_api_calls"] is False
    assert len(report_data["observations"]) > 0
    assert "disclaimer" in report_data
    assert "NOT constitute a confirmed medical diagnosis" in report_data["disclaimer"]
    assert report_data["summary_en"] != ""
    assert report_data["summary_te"] != ""

    # 6. Local MedGemma inference - Multimodal lesion analysis with image upload
    test_img_path = create_test_image(blurry=False)
    with open(test_img_path, "rb") as f:
        img_resp = client.post(
            "/api/v1/mytra-ai/local/analyze",
            headers=headers,
            data={
                "question": "Evaluate this white lesion on the left buccal mucosa with burning sensation",
                "task_type": "lesion_assessment",
                "category": "mouth_oral",
                "body_site": "Left Buccal Mucosa",
                "language": "te"
            },
            files={"file": ("lesion_test.jpg", f, "image/jpeg")}
        )
    if os.path.exists(test_img_path):
        os.remove(test_img_path)

    assert img_resp.status_code == 200
    img_data = img_resp.json()
    assert img_data["task_type"] == "lesion_assessment"
    assert img_data["is_local_only"] is True
    assert len(img_data["observations"]) > 0
    assert len(img_data["differentials"]) > 0
    assert "నిర్ధారిత వైద్య నిర్ధారణ" in img_data["disclaimer"]  # Telugu disclaimer
