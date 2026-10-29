# Aarogya Mytra AI — Clinical Medical Vision & Evidence-Grounded Health Assistant

## 1. System Overview & Role

**Aarogya Mytra AI** is the core medical AI intelligence subsystem within **Aarogya Drishti**. Designed for rural primary healthcare delivery (ASHA workers, PHC Medical Officers, and district clinicians), it pairs multimodal clinical image perception with deterministic safety guardrails and verified medical evidence retrieval.

### Medical Responsibility & Grounding Principles
- **No Diagnostic Overreach**: Visual inspection through photographs cannot replace a histopathological punch biopsy or in-person palpation. Aarogya Mytra AI explicitly describes **observable visual features** rather than assigning definitive disease labels.
- **Evidence-Grounded (Zero Hallucination)**: Explanations and triage guidance are strictly grounded in verified government and clinical protocols (MoHFW National Oral Health Programme, NP-NCD, ICMR Guidelines for Management of Precancer, WHO Oral Mucosal Lesion Classification).
- **Mandatory Human-in-the-Loop Oversight**: Every automated output is marked `assessment_status: "preliminary"` until an authorized clinician (PHC Medical Officer or Specialist) reviews, amends, or confirms the findings.
- **Graceful Unconfigured Fallback**: If MedGemma credentials or endpoints are omitted, the system explicitly reports `"Medical AI not configured"`, never substituting fabricated diagnoses or canned assertions.

---

## 2. Google MedGemma 1.5 4B Strategy & Integration

Aarogya Mytra AI selects **Google MedGemma 1.5 4B** (`google/medgemma-1.5-4b-it`) as the multimodal foundation model for clinical image analysis.

### Official Google Resources
- **Portal**: [Google Health AI Developer Foundations](https://developers.google.com/health-ai-developer-foundations/medgemma)
- **Model Card**: [MedGemma Model Card](https://developers.google.com/health-ai-developer-foundations/medgemma/model-card)
- **Get Started**: [MedGemma Quickstart](https://developers.google.com/health-ai-developer-foundations/medgemma/get-started)

### Backend Provider Abstraction (`MedicalVisionProvider`)
To isolate model-specific inference logic and allow seamless provider swapping, the system implements an abstract provider interface in `backend/app/integrations/ai/provider_interface.py`:

```python
class MedicalVisionProvider(ABC):
    @abstractmethod
    def analyze_image(self, image_bytes: bytes, mime_type: str, body_region: str, clinical_context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze medical image and extract observable features, differential considerations, and limitations."""
        pass

    @abstractmethod
    def explain_observations(self, observations: List[str], clinical_context: Dict[str, Any]) -> Dict[str, Any]:
        """Synthesize clinical context and explain observable features."""
        pass

    @abstractmethod
    def check_provider_health(self) -> Dict[str, Any]:
        """Verify model endpoint connectivity and operational readiness."""
        pass

    @abstractmethod
    def get_model_metadata(self) -> Dict[str, Any]:
        """Return model identifier, version, license, and clinical intended use."""
        pass
```

### Deployment Modes
1. **Self-Hosted Inference (vLLM / Ollama / Triton)**
   - Target GPU: NVIDIA RTX 4090 / A10G (minimum 16GB VRAM for 4-bit/8-bit quantized MedGemma 1.5 4B).
   - Configure internal endpoint: `MEDGEMMA_ENDPOINT_URL=http://medgemma-cluster.internal:8080/v1/chat/completions`.
   - Complete offline capability supported within PHC local networks without external data exfiltration.

2. **Managed Inference (Google Cloud Vertex AI / Hugging Face Inference Endpoints)**
   - Configure secure API token: `MEDGEMMA_API_KEY=AIzaSy...` and Vertex endpoint.
   - Zero patient identifiable information (PII) is transmitted: images are stripped of EXIF metadata, and only anonymous clinical tokens are forwarded.

3. **Mock / Testing Provider (`mock_test`)**
   - Deterministic test harness providing realistic clinical observations and limitations for continuous integration and unit testing.

---

## 3. Medical Image Scope Registry

To prevent general-purpose hallucination across arbitrary anatomical parts, the system enforces a strict **Image Scope Registry** (`ImageScopeRegistry`). Images outside approved categories are rejected immediately:

| Category ID | Anatomical Scope | Validation Status | Clinical Approval | Intended Use |
| :--- | :--- | :--- | :--- | :--- |
| `mouth_oral` | Oral mucosa, buccal, tongue, palate | `validated_pilot` | Approved for Triage | OPMD screening (leukoplakia, erythroplakia, OSMF, trismus). |
| `skin_lesion` | External skin and surface lesions | `validated_pilot` | Approved for Triage | Dermatological rash, erythema, scaling, margin evaluation. |
| `eye_anterior` | Anterior ocular surface, sclera, lids | `candidate` | Requires Review | External pterygium, pinguecula, subconjunctival hemorrhage. |
| `ear_auricular` | External pinna & auricle | `candidate` | Requires Review | External perichondritis, auricle lacerations (no otoscopy). |
| `wound_ulcer` | Cutaneous wounds & ulcers | `validated_pilot` | Approved for Triage | Diabetic foot ulcer staging, granulating margins, slough. |
| `medical_document`| Lab slips, biopsy reports | `candidate` | OCR Verification | Document digitization and reference extraction. |
| `radiology_xray` | Chest & dental radiographs | `not_approved` | Refused | Strictly refused pending dedicated DICOM clinical trials. |

### Standard Refusal Protocol
When an image belongs to an unapproved or unknown category, the system returns:
> *"Automated assessment is not available for this image category. Please route this case for appropriate healthcare professional review."*

---

## 4. Image Upload & Quality Validation (Stage 2)

Before any AI inference, every image undergoes deterministic OpenCV computer vision quality verification:
- **Blur Assessment**: Evaluates the Laplacian variance. Images with blur score `< 75.0` are rejected as inadequate.
- **Luminance & Illumination**: Analyzes mean HSV intensity. Images `< 35` (underexposed/dark) or `> 235` (overexposed/blown-out) are flagged.
- **Resolution & Aspect**: Validates that dimensions exceed 300×300 pixels and decodes cleanly without buffer truncation.
- **Non-Generative Guarantee**: Enhancement (e.g. CLAHE contrast adaptation) strictly modifies local histogram distributions without hallucinating, smoothing, or adding synthetic clinical artifacts.

---

## 5. Structured Clinical Context Intake (Stage 5)

Aarogya Mytra AI couples image perception with structured clinical indicators captured by the ASHA worker:
- **Patient Case Identifier & Demographics** (age, gender, tribal habitation).
- **Body Region & Anatomical Site** (e.g. Buccal Mucosa, Lateral Tongue).
- **Primary Concern & Symptom Onset** (Duration in days, acute vs chronic).
- **Evolution**: Improving, stable, or worsening.
- **High-Risk Constitutional Signs**: Pain score (0–10), spontaneous bleeding, ulceration, localized swelling, trismus (mouth opening in millimeters).
- **Tobacco & Carcinogen History**: Chewing, Gutkha, Areca nut, Reverse smoking (chutta).

Missing information is explicitly recorded as `unknown` and added to **Section D: Missing Information**.

---

## 6. The 12-Stage Medical Image Analysis Pipeline

Every image processed by Aarogya Mytra AI flows through twelve sequential stages with an explicit JSON audit log:

```
Stage 1: Verify Authorization & Patient Consent
    └── Ensure user has active bearer token and patient consent flag is recorded.
Stage 2: Image Quality & Blur Verification
    └── OpenCV Laplacian blur variance, luminance, and resolution checks.
Stage 3: Image Scope Registry Routing
    └── Confirm category matches validated clinical pilot registry.
Stage 4: Safe Non-Generative Preparation
    └── Strip EXIF/PII metadata, prepare sanitized analysis copy.
Stage 5: Minimum Context Synthesis
    └── Aggregate anatomical site, duration, and symptom metrics.
Stage 6: MedGemma Multimodal Inference
    └── Query MedGemma 1.5 4B for observable features and limitations.
Stage 7: Strict Schema Parsing & Validation
    └── Enforce Pydantic schema validation on model response.
Stage 8: Medical Evidence RAG Retrieval
    └── Query verified MoHFW, ICMR, and WHO guidelines based on observations.
Stage 9: Evidence-Grounded Preliminary Synthesis
    └── Formulate observable explanations without cancer diagnostic claims.
Stage 10: Deterministic Safety & Urgency Rules
    └── Apply red-flag rules (14-day persistent lesions, trismus <25mm).
Stage 11: Clinical Provenance & Persistence
    └── Persist MytraAIAssessment entity in database with full audit trail.
Stage 12: Clinician Review Queue Routing
    └── Route preliminary assessment to PHC Medical Officer dashboard.
```

---

## 7. Structured Response Schema (Sections A through G)

Every assessment response delivers a strictly typed structure:

```json
{
  "assessment_id": "MYTRA-20261029-ABCD1234",
  "assessment_status": "preliminary",
  "image_category": "mouth_oral",
  "image_quality": {
    "status": "adequate",
    "blur_score": 142.5,
    "luminance_score": 128.0,
    "limitations": ["Camera flash caused minor focal reflection on wet mucosa"]
  },
  "visible_observations": [
    "Well-demarcated non-scrapable whitish plaque on left buccal mucosa",
    "Mucosal blanching with palpable vertical fibrous bands",
    "Restricted interincisal distance (mouth opening measured at 24 mm)"
  ],
  "possible_explanations": [
    {
      "name": "Oral Submucous Fibrosis (OSMF) with Concurrent Leukoplakia",
      "reasoning": "Mucosal blanching and reduced mouth opening (<25mm) strongly align with OSMF Stage III under ICMR criteria. Whitish non-scrapable plaque warrants rule-out of dysplasia.",
      "supporting_observations": ["Mucosal blanching", "Restricted opening (24mm)"],
      "limitations": ["Dysplasia cannot be excluded without histopathological punch biopsy"]
    }
  ],
  "missing_information": [
    "Palpation consistency (soft vs indurated) requires clinician touch",
    "Cervical lymph node staging requires physical examination"
  ],
  "red_flags": [
    "Interincisal mouth opening < 25 mm (Severe Trismus)",
    "Symptom duration exceeds 14 days without spontaneous resolution"
  ],
  "recommended_next_step": "Priority referral to PHC Medical Officer for visual palpation and punch biopsy slip issuance within 48–72 hours.",
  "urgency": "urgent_care",
  "urgency_reason": "Severe trismus (<25mm) and non-healing white lesion exceeding 14-day threshold according to NPCDCS protocol.",
  "medical_references": [
    {
      "reference_id": "MOHFW-NOHP-OPMD-2023",
      "title": "National Oral Health Programme: Operational Guidelines for Early Detection of Oral Precancer",
      "publisher": "Ministry of Health & Family Welfare (MoHFW), Government of India",
      "publication_date": "2023-04-15",
      "section": "Section 4.2: Triage of Oral White Lesions & Restricted Mouth Opening",
      "source_url": "https://mohfw.gov.in/sites/default/files/NOHP_OPMD_Guidelines_2023.pdf",
      "direct_excerpt": "Any oral mucosal lesion persisting longer than 14 days without resolution, or accompanied by mouth opening < 25 mm, requires immediate clinician referral and tissue biopsy.",
      "key_clinical_rules": [
        "Photographic inspection cannot rule in or rule out malignancy.",
        "Trismus < 25mm warrants urgent specialist evaluation."
      ]
    }
  ],
  "cancer_safety_notice": "CRITICAL MEDICAL MANDATE: Aarogya Mytra AI strictly does NOT confirm or rule out cancer from photographs. Clinical examination and tissue biopsy are mandatory.",
  "model_name": "Google MedGemma",
  "model_version": "1.5-4b-it",
  "clinician_review": {
    "is_reviewed": false,
    "review_status": "pending_clinician_review"
  }
}
```

---

## 8. Deterministic Safety & Cancer Guardrails

To prevent dangerous AI failure modes, Aarogya Mytra AI implements three layers of safety guardrails:

### Layer 1: Mandatory Cancer Disclaimers & Refusal of Definitive Claims
- The system **never** outputs statements such as *"This is stage 2 oral cancer"* or *"Cancer has been excluded"*.
- If raw model output contains unvalidated malignancy assertions, `ClinicalSafetyGuardrails.sanitize_model_output()` automatically strips them and injects the mandatory statutory disclaimer:
  > *"CRITICAL MEDICAL MANDATE: Photographs cannot confirm or exclude cancer. In-person clinical examination and histopathological biopsy are mandatory."*

### Layer 2: Ban on Fabricated Confidence Percentages
- Model outputs stating *"93% probability of carcinoma"* are stripped. In their place, standardized urgency categories are used:
  - `routine_review`: Mild, self-limiting condition (e.g. aphthous ulcer <7 days).
  - `prompt_assessment`: Persistent condition requiring PHC evaluation within 5–7 days.
  - `urgent_care`: High-risk signs requiring clinical evaluation within 48 hours.

### Layer 3: Deterministic Emergency & Urgent Rules
Regardless of model confidence, the following deterministic rules force escalation:
- **Rule E1**: Visible spontaneous active bleeding + duration > 14 days $\rightarrow$ `urgent_care`.
- **Rule E2**: Restricted mouth opening $< 25\text{ mm}$ (trismus) $\rightarrow$ `urgent_care`.
- **Rule E3**: Any oral ulcer persisting $> 14\text{ days}$ $\rightarrow$ `urgent_care` for urgent biopsy.

---

## 9. Clinician Review & Human Oversight Workflow

In accordance with clinical safety principles, AI provenance is immutable:
1. When a screening is performed, the preliminary assessment is linked to the screening record in PostgreSQL / SQLite.
2. The PHC Medical Officer opens **Case Review** (`PHCReviewView`).
3. The clinician reviews Section A through F (Quality, Observations, Possible Explanations, Red Flags, References).
4. In **Section G (Clinician Review & Amendment Workspace)**, the doctor can:
   - **Approve**: Confirm the observational features and proceed to consultation/biopsy.
   - **Amend**: Add or correct clinical observations with explicit clinician notes without erasing the original AI record.
   - **Reject / Disagree**: Mark the automated assessment as non-concurring and record alternative clinical findings.
5. The amended assessment is committed with the doctor's user ID, timestamp, and action plan.

---

## 10. Multilingual Support Matrix

All user-facing clinical guidance, speech readouts, and urgency badges are supported in six Indian languages:

| Language | Code | AI Name | Clinical Voice Readout |
| :--- | :--- | :--- | :--- |
| **Telugu** | `te` | ఆరోగ్య మైత్ర AI | Native Web Speech API (`te-IN`) |
| **English** | `en` | Aarogya Mytra AI | Native Web Speech API (`en-IN`) |
| **Hindi** | `hi` | आरोग्य मैत्र AI | Native Web Speech API (`hi-IN`) |
| **Tamil** | `ta` | ஆரோக்கிய மைத்ரா AI | Native Web Speech API (`ta-IN`) |
| **Malayalam**| `ml` | ആരോഗ്യ മൈത്ര AI | Native Web Speech API (`ml-IN`) |
| **Kannada** | `kn` | ಆರೋಗ್ಯ ಮೈತ್ರ AI | Native Web Speech API (`kn-IN`) |

---

## 11. Backend Configuration & Environment Variables

Add the following environment variables to `backend/.env`:

```bash
# Enable Aarogya Mytra AI
MYTRA_AI_ENABLED=true

# Provider Type: 'local' (vLLM/Ollama), 'managed' (Vertex AI/HF), 'mock_test', or 'auto'
MEDGEMMA_PROVIDER_TYPE=auto

# Self-Hosted / Managed Endpoint URL
MEDGEMMA_ENDPOINT_URL=

# Model Identifier
MEDGEMMA_MODEL_ID=google/medgemma-1.5-4b-it

# API Key for managed inference (leave empty for unconfigured state or local instance)
MEDGEMMA_API_KEY=

# Timeout in seconds
MEDGEMMA_TIMEOUT_SECONDS=30
```

---

## 12. Verification & Automated Test Suite

A comprehensive test suite in `backend/tests/test_mytra_ai.py` validates the entire subsystem:
1. `test_unconfigured_provider_health`: Confirms graceful degradation when unconfigured.
2. `test_scope_registry_categories`: Confirms valid category retrieval.
3. `test_scope_registry_refusal`: Confirms refusal of unapproved categories (`radiology_xray`).
4. `test_medical_rag_retrieval`: Confirms accurate MoHFW and ICMR guideline citations.
5. `test_safety_guardrails_persistent_lesion`: Confirms automatic escalation for $>14$-day lesions.
6. `test_safety_guardrails_trismus`: Confirms automatic escalation for mouth opening $<25\text{ mm}$.
7. `test_cancer_claim_sanitization`: Confirms elimination of ungrounded cancer diagnostic claims.
8. `test_full_pipeline_execution`: Confirms execution of all 12 stages and audit logging.
9. `test_quality_check_rejection`: Confirms rejection of blurry or flat images.
10. `test_clinician_review_flow`: Confirms clinician approval and amendment persistence.
11. `test_chat_mytra_ai_integration`: Confirms end-to-end integration into the conversational assistant.

All tests pass with 100% success (`pytest backend/tests/test_mytra_ai.py`).
