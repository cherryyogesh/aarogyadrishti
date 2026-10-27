from app.integrations.ai.triage import (
    detect_emergency_symptoms, check_cancer_claim_guard, generate_safe_triage_guidance
)

def test_emergency_red_flag_detection():
    # English emergency detection
    assert detect_emergency_symptoms("I am experiencing severe chest pain and breath shortness") is not None
    # Telugu emergency detection
    assert detect_emergency_symptoms("నాకు ఛాతీ నొప్పి వస్తోంది") is not None
    # Routine symptoms should NOT trigger emergency
    assert detect_emergency_symptoms("Mild dry skin rash on elbow") is None

def test_cancer_claim_guard():
    assert check_cancer_claim_guard("Does this black spot look like skin cancer?") is True
    assert check_cancer_claim_guard("క్యాన్సర్ లక్షణాలు ఉన్నాయా?") is True
    assert check_cancer_claim_guard("Normal insect bite itch") is False

def test_safe_triage_guidance_cancer_refusal():
    result = generate_safe_triage_guidance(
        category="skin",
        symptoms="Is this cancer on my arm?",
        language="en"
    )
    # Must refuse to diagnose cancer from photo/symptoms alone
    assert "Cancer cannot be diagnosed nor ruled out based on symptoms or photographic screening alone" in result["recommendations"]
    assert "biopsy" in result["recommendations"]
    assert "Disclaimer" in result["disclaimer"]

def test_chat_api_endpoint(client):
    resp = client.post("/api/v1/chat/message", json={
        "session_id": "test-session-123",
        "message": "I have a sore throat and mild cough for 2 days. What should I do?",
        "language": "en"
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["role"] == "assistant"
    assert len(data["content"]) > 10
    assert "disclaimer" in data
