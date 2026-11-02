# Aarogya Mytra AI — Clinical Medical Vision & Evidence-Grounded Health Assistant

## 1. System Overview & Role

**Aarogya Mytra AI** is the primary clinical AI subsystem within **Aarogya Drishti**. Engineered for primary rural healthcare delivery across Community Health Workers (ASHAs), Primary Health Centre (PHC) Medical Officers, and district clinicians, it pairs multimodal medical perception with deterministic clinical safety guardrails, multi-turn dialogue, and verified MoHFW/ICMR/WHO medical evidence.

### Medical Grounding Principles
- **Assistance, Not Replacement**: Visual inspection of photographs cannot replace physical in-person examination or histopathological punch biopsy. Aarogya Mytra AI provides preliminary clinical guidance and observable features.
- **Evidence-Grounded (Zero Hallucination)**: Explanations and triage guidance are strictly grounded in verified guidelines from the Ministry of Health and Family Welfare (MoHFW National Oral Health Programme), NP-NCD, and ICMR.
- **Mandatory Clinician Oversight**: Every automated assessment is flagged as `assessment_status: "preliminary"` and `doctor_review_required: true` until an authorized clinician reviews or confirms it.
- **14-Day Protocol**: Any oral ulcer, patch, or suspicious lesion persisting beyond 14 days mandates an in-person physical examination by a registered PHC Doctor or Dental Specialist.
- **No Cancer Claims**: The system explicitly never confirms, stages, or rules out cancer from a photograph or chat query alone.

---

## 2. Google Gemini API Architecture & Model Selection

Aarogya Mytra AI uses the official **Google Gemini API** as its primary multimodal AI provider.

### Model Selection
- **Active Model**: `gemini-3.6-flash` (Configurable via `GEMINI_MODEL`)
- **Capabilities**: Multimodal image understanding (JPEG, PNG, WEBP), multi-turn dialogue, structured JSON output (`application/json`), low latency (<2s), high accuracy across Indian rural languages.
- **Official Documentation**: [https://ai.google.dev/gemini-api/docs](https://ai.google.dev/gemini-api/docs)

### Secure Key Management
- The API key is stored strictly on the server in `backend/.env` under `GEMINI_API_KEY`.
- The key is **never** exposed to React frontend, browser bundles, network responses, HTML, or Git repository.
- `.gitignore` protects all `.env` files. A safe `backend/.env.example` provides non-sensitive template placeholders.

---

## 3. 12-Stage Medical Image Analysis Pipeline

When an ASHA worker captures a photograph:
1. **Consent Verification**: Confirms patient consent is formally recorded before analysis.
2. **Quality & Suitability Assessment**: OpenCV checks blur (Laplacian focus variance), illumination (luminance), and resolution. If inadequate, prompts retake.
3. **Scope Registry Check**: Confirms image category (`mouth_oral`, `skin_lesion`, `eye_anterior`, `ear_auricular`, `wound_ulcer`).
4. **Input Preparation**: Normalizes and pre-processes image bytes.
5. **Gemini Multimodal Inference**: Sends image bytes with patient symptoms, duration, and clinical context to Gemini API.
6. **Structured Schema Enforcement**: Uses Pydantic JSON schema to receive structured observations, differential considerations, and next steps.
7. **Clinical Safety Sanitization**: Strips any unauthorized diagnostic assertions or hallucinated statistics.
8. **Evidence RAG Retrieval**: Fetches MoHFW/ICMR guidelines relevant to observed findings.
9. **Preliminary Explanation**: Generates objective clinical synthesis.
10. **Deterministic Safety Triage**: Evaluates duration (>14 days escalation) and emergency red flags (108).
11. **Audit Provenance Logging**: Logs timestamp, model identifier, and stages into database.
12. **Clinician Queue Routing**: Stores in patient case record for PHC doctor examination.

---

## 4. Multilingual Capabilities

Aarogya Mytra AI communicates fluently across 6 languages:
- **Telugu (తెలుగు)**
- **English**
- **Hindi (हिन्दी)**
- **Tamil (தமிழ்)**
- **Malayalam (മലയാളം)**
- **Kannada (ಕನ್ನಡ)**

Responses use respectful, rural-accessible phrasing, avoiding intimidating jargon while explaining necessary medical context.

---

## 5. Environment Configuration

```bash
# backend/.env
GEMINI_API_KEY=your_gemini_api_key_from_google_ai_studio
GEMINI_MODEL=gemini-3.6-flash
GEMINI_TIMEOUT_SECONDS=30
GEMINI_MAX_RETRIES=3
```
