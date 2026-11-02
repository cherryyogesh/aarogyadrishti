import os
import json
import base64
import logging
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import httpx

from app.core.config import settings
from app.integrations.ai.provider_interface import MedicalVisionProvider
from app.integrations.ai.clinical_safety import clinical_safety

logger = logging.getLogger("gemini_provider")

# Try to import official Google GenAI SDK
try:
    from google import genai
    from google.genai import types
    from pydantic import BaseModel
    HAS_GENAI_SDK = True
except ImportError:
    HAS_GENAI_SDK = False
    logger.warning("google-genai SDK not imported; will use httpx REST fallback")


class GeminiMedicalObservation(BaseModel):
    name: str
    condition_title_te: Optional[str] = None
    condition_title_en: Optional[str] = None
    reasoning: str
    icd10: Optional[str] = "K13.9"
    differential_notes: Optional[str] = None


class GeminiStructuredMedicalAssessment(BaseModel):
    status: str = "completed"
    image_quality: str = "good"
    image_category: str = "mouth_oral"
    visible_observations: List[str] = []
    possible_explanations: List[GeminiMedicalObservation] = []
    missing_information: List[str] = []
    warning_signs: List[str] = []
    recommended_next_step: str = ""
    urgency: str = "routine"
    urgency_reason: Optional[str] = None
    doctor_review_required: bool = True
    disclaimer: str = ""
    model: str = "gemini-3.1-flash-lite"


class GeminiProvider(MedicalVisionProvider):
    """
    Primary Multimodal Clinical AI Provider for Aarogya Mytra AI.
    Powered by official Google Gemini API (gemini-3.6-flash / configurable).
    Provides multimodal visual observation, structured clinical synthesis,
    and MoHFW/ICMR/WHO safety-grounded health assistance.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        timeout: Optional[int] = None,
        max_retries: Optional[int] = None
    ):
        self._api_key = api_key if api_key is not None else (os.getenv("GEMINI_API_KEY", "") or getattr(settings, "GEMINI_API_KEY", "")).strip()
        self.model_name = (model_name or os.getenv("GEMINI_MODEL", "") or getattr(settings, "GEMINI_MODEL", "gemini-3.1-flash-lite")).strip()
        self.timeout = timeout or getattr(settings, "GEMINI_TIMEOUT_SECONDS", 30)
        self.max_retries = max_retries or getattr(settings, "GEMINI_MAX_RETRIES", 3)
        self._client = None
        self._init_sdk_client()

    def _init_sdk_client(self):
        if HAS_GENAI_SDK and self._api_key:
            try:
                self._client = genai.Client(api_key=self._api_key)
            except Exception as e:
                logger.error(f"Failed to initialize google.genai Client: {e}")
                self._client = None

    def is_configured(self) -> bool:
        """Returns True if a non-placeholder Gemini API Key is configured."""
        key = self.get_api_key()
        if not key or len(key) < 10:
            return False
        if any(dummy in key.lower() for dummy in ["your_", "placeholder", "xxx", "demo"]):
            return False
        return True

    def get_api_key(self) -> str:
        """Retrieve the API key from internal state or environment."""
        if self._api_key is None:
            self._api_key = (os.getenv("GEMINI_API_KEY", "") or getattr(settings, "GEMINI_API_KEY", "")).strip()
            if self._api_key and not self._client:
                self._init_sdk_client()
        return self._api_key or ""

    def get_model_metadata(self) -> Dict[str, Any]:
        """Provides metadata for system introspection without exposing secrets."""
        return {
            "model_name": "Google Gemini Multimodal AI",
            "model_id": self.model_name,
            "provider_type": "google_gemini_api",
            "is_configured": self.is_configured(),
            "intended_use": "Preliminary multimodal assistance in visual observation and clinical symptom synthesis for healthcare staff review.",
            "clinical_oversight": "Mandatory clinician review required before any clinical decision.",
            "documentation_url": "https://ai.google.dev/gemini-api/docs"
        }

    async def check_provider_health(self) -> Dict[str, Any]:
        """Checks API reachability with Google Gemini service."""
        if not self.is_configured():
            return {
                "status": "unconfigured",
                "message": "Gemini API key is not configured in backend environment variables.",
                "model_id": self.model_name,
                "is_healthy": False
            }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}?key={self.get_api_key()}"
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    return {
                        "status": "healthy",
                        "message": f"Google Gemini API ({self.model_name}) is operational.",
                        "model_id": self.model_name,
                        "is_healthy": True
                    }
                elif resp.status_code == 404:
                    return {
                        "status": "model_not_found",
                        "message": f"Model {self.model_name} was not found on Google Gemini API.",
                        "model_id": self.model_name,
                        "is_healthy": False
                    }
                elif resp.status_code in [401, 403]:
                    return {
                        "status": "authentication_failed",
                        "message": "Configured Gemini API key was rejected by Google AI Studio.",
                        "model_id": self.model_name,
                        "is_healthy": False
                    }
                else:
                    return {
                        "status": "service_degraded",
                        "message": f"Gemini API returned HTTP status {resp.status_code}.",
                        "model_id": self.model_name,
                        "is_healthy": False
                    }
        except Exception as e:
            logger.error(f"Health check connectivity failure: {e}")
            return {
                "status": "network_unavailable",
                "message": f"Could not reach Google Gemini API: {str(e)}",
                "model_id": self.model_name,
                "is_healthy": False
            }

    async def explain_observations(
        self,
        observations: List[str],
        clinical_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Produce evidence-grounded preliminary explanations from validated visible observations."""
        lang = clinical_context.get("language", "en")
        obs_text = ", ".join(observations) if observations else "Unspecified visual features"
        prompt = f"Explain the following clinical observations in {lang}: {obs_text}. Provide safe non-pharmacological care and doctor review recommendations."

        if self.is_configured() and self._client:
            try:
                res = await asyncio.to_thread(
                    self._client.models.generate_content,
                    model=self.model_name,
                    contents=prompt
                )
                if res and res.text:
                    return {
                        "explanations": [{"name": "Clinical Synthesis", "reasoning": res.text.strip()}],
                        "model": self.model_name
                    }
            except Exception as e:
                logger.warning(f"explain_observations call error: {e}")

        return {
            "explanations": [{"name": "Clinical Synthesis", "reasoning": f"Preliminary evaluation of observations: {obs_text}."}],
            "model": self.model_name
        }

    async def analyze_image(
        self,
        image_bytes: bytes,
        body_region: str,
        clinical_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Executes real multimodal image understanding via Google Gemini API.
        Extracts visible observations, preliminary conditions, missing information,
        and generates evidence-grounded non-pharmacological care and doctor review timelines.
        """
        if not self.is_configured():
            logger.warning("Gemini API key is not configured. Falling back to clinical safety rule guidance.")
            return {
                "success": False,
                "error_message": "Aarogya Mytra AI Google Gemini API key is not configured on the server."
            }

        if not image_bytes or len(image_bytes) < 64:
            return {
                "success": False,
                "error_message": "Invalid or empty image byte stream received."
            }

        # Detect MIME type
        mime_type = "image/jpeg"
        if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            mime_type = "image/png"
        elif image_bytes.startswith(b"RIFF") and b"WEBP" in image_bytes[:16]:
            mime_type = "image/webp"

        lang = clinical_context.get("language", "en")
        prompt = self._build_clinical_prompt(body_region, clinical_context, lang)

        # Attempt call with retry on transient 503 / 429
        last_error = None
        for attempt in range(1, self.max_retries + 1):
            try:
                # 1. Try with Google GenAI SDK if available
                if self._client:
                    sdk_result = await asyncio.to_thread(
                        self._call_gemini_sdk_structured,
                        image_bytes,
                        mime_type,
                        prompt
                    )
                    if sdk_result and sdk_result.get("success"):
                        return sdk_result

                # 2. Direct HTTP REST fallback with httpx
                rest_result = await self._call_gemini_rest(
                    image_bytes,
                    mime_type,
                    prompt
                )
                if rest_result and rest_result.get("success"):
                    return rest_result

            except Exception as e:
                last_error = str(e)
                logger.warning(f"Gemini API attempt {attempt}/{self.max_retries} failed: {e}")
                if attempt < self.max_retries:
                    await asyncio.sleep(1.5 * attempt)

        return {
            "success": False,
            "error_message": f"Gemini API vision assessment failed after {self.max_retries} attempts: {last_error}"
        }

    def _call_gemini_sdk_structured(
        self,
        image_bytes: bytes,
        mime_type: str,
        prompt: str
    ) -> Dict[str, Any]:
        """Synchronous SDK call executed in thread pool."""
        try:
            image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
            response = self._client.models.generate_content(
                model=self.model_name,
                contents=[image_part, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=GeminiStructuredMedicalAssessment,
                    temperature=0.2,
                    max_output_tokens=2048
                )
            )

            if response and response.text:
                parsed = json.loads(response.text)
                return self._format_pipeline_output(parsed)
        except Exception as e:
            logger.error(f"GenAI SDK call exception: {e}")
            raise e

        return {"success": False, "error_message": "Empty response from Gemini SDK"}

    async def _call_gemini_rest(
        self,
        image_bytes: bytes,
        mime_type: str,
        prompt: str
    ) -> Dict[str, Any]:
        """Asynchronous REST call using httpx with JSON mode."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.get_api_key()}"
        b64_image = base64.b64encode(image_bytes).decode("utf-8")

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": b64_image
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 2048,
                "responseMimeType": "application/json"
            }
        }

        async with httpx.AsyncClient(timeout=float(self.timeout)) as client:
            resp = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates and "content" in candidates[0]:
                    parts = candidates[0]["content"].get("parts", [])
                    if parts and "text" in parts[0]:
                        raw_json = parts[0]["text"].strip()
                        parsed = json.loads(raw_json)
                        return self._format_pipeline_output(parsed)
            elif resp.status_code in [429, 503]:
                raise RuntimeError(f"Gemini service rate limited / unavailable (HTTP {resp.status_code})")
            else:
                logger.error(f"Gemini REST error {resp.status_code}: {resp.text[:200]}")
                raise RuntimeError(f"Gemini REST API returned error {resp.status_code}")

        return {"success": False, "error_message": "No candidates returned from Gemini"}

    def _build_clinical_prompt(self, body_region: str, context: Dict[str, Any], language: str) -> str:
        symptoms = context.get("symptoms", "Not specified")
        duration = context.get("duration_days", "Unknown")
        site = context.get("body_site", body_region)
        pain = context.get("pain_score", "None")
        mouth_mm = context.get("mouth_opening_mm", "Not measured")

        return f"""You are Aarogya Mytra AI, a specialized clinical multimodal AI assistant assisting Community Health Workers (ASHAs) and PHC doctors under the Ministry of Health and Family Welfare (MoHFW), ICMR, and WHO protocols.

CLINICAL CASE DETAILS:
- Anatomical Region: {body_region} (Specific site: {site})
- Reported Patient Symptoms: {symptoms}
- Symptom Duration: {duration} days
- Pain Score (0-10): {pain}
- Interincisal Distance / Mouth Opening: {mouth_mm} mm
- Target Language for titles: {language}

MANDATORY MEDICAL SAFETY INSTRUCTIONS:
1. DO NOT make a definitive diagnosis. Frame all conditions as possibilities for clinician examination.
2. DO NOT confirm or rule out cancer or malignant neoplasms. State clearly that clinical examination and tissue biopsy are mandatory.
3. DO NOT prescribe medications or pharmaceutical dosages. Only recommend safe, non-pharmacological comfort steps (e.g., warm salt water rinses, avoiding spicy/rough foods, immediate tobacco cessation).
4. Emphasize the MoHFW National Oral Health protocol: any oral ulcer, patch, or lesion persisting beyond 14 days mandates an in-person physical examination by a PHC Medical Officer or Dental Specialist.
5. If emergency red flags (uncontrolled bleeding, severe airway restriction, inability to swallow liquids) are noted, flag urgency as 'emergency' and advise calling 108 immediately.
6. Provide clear, objective visual observations without fabricating confidence percentages.

You MUST respond strictly with a valid JSON object matching the following schema:
{{
  "status": "completed",
  "image_quality": "good",
  "image_category": "{body_region}",
  "visible_observations": ["list of 2-4 concrete visible features seen on the photograph"],
  "possible_explanations": [
    {{
      "name": "Standard Clinical Condition Name in English",
      "condition_title_te": "తెలుగులో స్పష్టమైన పేరు (ఉదా: నోటి పూత / తెల్లటి మచ్చ)",
      "condition_title_en": "Standard English Clinical Name",
      "reasoning": "Direct observational reasoning explaining why this is considered",
      "icd10": "ICD-10 code if known",
      "differential_notes": "Key distinguishing features"
    }}
  ],
  "missing_information": ["Information needed from clinical examination"],
  "warning_signs": ["Concerning symptoms to monitor"],
  "recommended_next_step": "Actionable non-pharmacological care and doctor visit recommendation",
  "urgency": "routine | prompt_assessment | emergency",
  "urgency_reason": "Reason for assigned urgency level",
  "doctor_review_required": true,
  "disclaimer": "This preliminary visual assessment is an assistive clinical tool and does not constitute a definitive medical diagnosis. In-person clinical examination by a qualified doctor is mandatory."
}}"""

    def _format_pipeline_output(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalizes and validates the structured output for pipeline consumption."""
        explanations = data.get("possible_explanations", [])
        formatted_explanations = []
        for exp in explanations:
            formatted_explanations.append({
                "condition_id": (exp.get("icd10") or "K13.9").replace(".", "_").lower(),
                "name": exp.get("name", "Oral Mucosal Lesion"),
                "condition_title_te": exp.get("condition_title_te") or exp.get("name"),
                "condition_title_en": exp.get("condition_title_en") or exp.get("name"),
                "icd10": exp.get("icd10", "K13.9"),
                "category": data.get("image_category", "mouth_oral"),
                "severity": data.get("urgency", "routine"),
                "reasoning": exp.get("reasoning", "Observed features consistent with presentation."),
                "differential_notes": exp.get("differential_notes", ""),
                "cancer_warning": "Cannot rule out or confirm malignancy based on photographic inspection alone. Physical examination required."
            })

        urgency = data.get("urgency", "routine")
        if urgency not in ["routine", "routine_review", "prompt_assessment", "emergency"]:
            urgency = "routine"

        return {
            "success": True,
            "status": "completed",
            "image_quality": data.get("image_quality", "good"),
            "image_category": data.get("image_category", "mouth_oral"),
            "visible_observations": data.get("visible_observations", []),
            "possible_explanations": formatted_explanations,
            "missing_information": data.get("missing_information", []),
            "warning_signs": data.get("warning_signs", []),
            "recommended_next_step": data.get("recommended_next_step", "Consult PHC Medical Officer for clinical examination."),
            "urgency": urgency,
            "urgency_reason": data.get("urgency_reason", "Routine clinical review."),
            "doctor_review_required": True,
            "disclaimer": data.get("disclaimer", "Preliminary AI assessment. In-person physical examination by a registered medical practitioner is mandatory."),
            "model_name": "Aarogya Mytra AI",
            "model_version": self.model_name,
            "created_at": datetime.now(timezone.utc).isoformat()
        }


# Global singleton instance
gemini_provider = GeminiProvider()
