import os
import json
import base64
import logging
from typing import Dict, Any, List, Optional
import httpx

from app.core.config import settings
from app.integrations.ai.provider_interface import MedicalVisionProvider
from app.integrations.ai.google_health_medgemma_bridge import GoogleHealthMedGemmaBridge

logger = logging.getLogger("medgemma_provider")

class MedGemmaProvider(MedicalVisionProvider):
    """
    Google MedGemma 1.5 4B Multimodal Medical AI Provider.
    Official Model Reference: https://developers.google.com/health-ai-developer-foundations/medgemma
    Official GitHub Repository: https://github.com/Google-Health/medgemma.git
    Supports Local/Self-hosted (e.g. vLLM, Ollama, Triton) and Managed deployment (Vertex AI, HF Inference).
    """

    def __init__(
        self,
        provider_type: Optional[str] = None,
        endpoint_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model_id: Optional[str] = None,
        timeout: Optional[int] = None
    ):
        self.provider_type = provider_type or getattr(settings, "MEDGEMMA_PROVIDER_TYPE", "auto")
        self.endpoint_url = endpoint_url or getattr(settings, "MEDGEMMA_ENDPOINT_URL", "")
        self.api_key = api_key or getattr(settings, "MEDGEMMA_API_KEY", "")
        self.model_id = model_id or getattr(settings, "MEDGEMMA_MODEL_ID", "google/medgemma-1.5-4b-it")
        self.timeout = timeout or getattr(settings, "MEDGEMMA_TIMEOUT_SECONDS", 30)
        self.bridge = GoogleHealthMedGemmaBridge(repo_path=getattr(settings, "GOOGLE_HEALTH_MEDGEMMA_SUBMODULE", None))

    def is_configured(self) -> bool:
        """
        Check if an active deployment is configured.
        """
        if self.provider_type == "mock_test":
            return True
        if self.provider_type == "none":
            return False
        if self.provider_type == "local":
            return bool(self.endpoint_url)
        if self.provider_type == "managed":
            return bool(self.endpoint_url or self.api_key)
        # auto mode
        return bool(self.endpoint_url or self.api_key)

    def get_model_metadata(self) -> Dict[str, Any]:
        return {
            "model_name": "Google MedGemma",
            "model_version": "1.5-4b-it",
            "model_id": self.model_id,
            "provider_type": self.provider_type,
            "intended_use": "Preliminary multimodal assistance in visual observation and clinical symptom synthesis for healthcare staff review.",
            "is_configured": self.is_configured(),
            "documentation_url": "https://developers.google.com/health-ai-developer-foundations/medgemma",
            "github_repository": "https://github.com/Google-Health/medgemma",
            "license": "Health AI Developer Foundations Community License",
            "clinical_oversight": "Mandatory clinician review required before any clinical decision.",
            "google_health_repo": self.bridge.get_repo_info()
        }

    async def check_provider_health(self) -> Dict[str, Any]:
        """
        Check connectivity and operational readiness.
        """
        repo_info = self.bridge.get_repo_info()
        if not self.is_configured():
            return {
                "status": "not_configured",
                "message": "Medical AI not configured. Set MEDGEMMA_ENDPOINT_URL or MEDGEMMA_API_KEY in environment variables.",
                "model_id": self.model_id,
                "provider_type": self.provider_type,
                "google_health_submodule": repo_info
            }

        if self.provider_type == "mock_test":
            return {
                "status": "healthy",
                "message": "MedGemma mock/test provider operational for regression validation.",
                "model_id": self.model_id,
                "provider_type": "mock_test",
                "google_health_submodule": repo_info
            }

        target_url = self.endpoint_url or "https://api-inference.huggingface.co/models/" + self.model_id
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                headers = {}
                if self.api_key:
                    headers["Authorization"] = f"Bearer {self.api_key}"
                resp = await client.get(target_url, headers=headers)
                if resp.status_code in [200, 401, 403, 404, 405]:
                    return {
                        "status": "reachable",
                        "status_code": resp.status_code,
                        "endpoint": target_url,
                        "model_id": self.model_id,
                        "provider_type": self.provider_type
                    }
                return {
                    "status": "degraded",
                    "status_code": resp.status_code,
                    "endpoint": target_url
                }
        except Exception as e:
            return {
                "status": "unreachable",
                "error": str(e),
                "endpoint": target_url,
                "provider_type": self.provider_type
            }

    async def analyze_image(
        self,
        image_bytes: bytes,
        body_region: str,
        clinical_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Perform MedGemma multimodal visual analysis.
        Strictly asks for observable features, uncertainty, and limitations.
        """
        if not self.is_configured():
            return {
                "success": False,
                "error_type": "NOT_CONFIGURED",
                "error_message": "Medical AI not configured. Automated assessment is unavailable. Please route this case for appropriate healthcare professional review.",
                "visible_observations": [],
                "possible_explanations": [],
                "missing_information": [],
                "model_name": self.model_id,
                "model_version": "1.5-4b-it"
            }

        # Handle Mock Test Provider
        if self.provider_type == "mock_test":
            return self._generate_test_observations(body_region, clinical_context)

        # Build standard MedGemma clinical observation prompt
        symptoms = clinical_context.get("symptoms", "")
        duration = clinical_context.get("duration_days", "unknown")
        site = clinical_context.get("body_site", body_region)

        system_instruction = (
            "You are Google MedGemma 1.5 4B, an expert clinical multimodal assistant. "
            "Analyze this medical photograph objectively for observable morphological features. "
            "STRICT CLINICAL RULES:\n"
            "1. Describe only directly visible visual features (color, margins, texture, swelling, ulceration).\n"
            "2. Never declare a definitive diagnosis or state that a lesion confirms or rules out cancer.\n"
            "3. If any area is unclear, blurry, or ambiguous, state that it is 'uncertain' or 'not assessable'.\n"
            "4. Return valid JSON with keys: visible_observations (list of strings), "
            "possible_explanations (list of objects with name, reasoning, supporting_observations, limitations), "
            "missing_information (list of strings), and limitations (list of strings)."
        )

        user_content = (
            f"Image Category: {body_region}\n"
            f"Anatomical Site: {site}\n"
            f"Reported Symptoms: {symptoms}\n"
            f"Symptom Duration: {duration} days\n"
            "Provide objective visual observations and possible preliminary clinical explanations."
        )

        b64_image = base64.b64encode(image_bytes).decode("utf-8") if image_bytes else ""

        # Build payload according to official Google-Health/medgemma schema
        payload = self.bridge.build_medgemma_chat_payload(
            image_bytes=image_bytes,
            body_region=body_region,
            clinical_context=clinical_context,
            model_id=self.model_id
        )

        # Perform HTTP call to configured MedGemma endpoint
        try:
            async with httpx.AsyncClient(timeout=float(self.timeout)) as client:
                headers = {"Content-Type": "application/json"}
                if self.api_key:
                    headers["Authorization"] = f"Bearer {self.api_key}"

                endpoint = self.endpoint_url or f"https://api-inference.huggingface.co/models/{self.model_id}"
                resp = await client.post(endpoint, json=payload, headers=headers)

                if resp.status_code == 200:
                    data = resp.json()
                    raw_text = self._extract_response_text(data)
                    # Extract thinking trace (<unused94>thought ... <unused95>) from MedGemma 1.5 4B
                    thought, response_text = self.bridge.parse_thinking_trace(raw_text)
                    parsed = self._parse_medgemma_json(response_text, body_region, clinical_context)
                    if thought:
                        parsed["thinking_trace"] = thought
                    parsed["google_health_repo"] = self.bridge.get_repo_info()
                    parsed["success"] = True
                    parsed["model_name"] = self.model_id
                    parsed["model_version"] = "1.5-4b-it"
                    return parsed
                else:
                    logger.warning(f"MedGemma inference endpoint returned HTTP {resp.status_code}: {resp.text[:200]}")
                    return {
                        "success": False,
                        "error_type": "INFERENCE_ERROR",
                        "error_message": f"MedGemma service returned HTTP {resp.status_code}. Case preserved for clinician review.",
                        "model_name": self.model_id
                    }
        except httpx.TimeoutException:
            logger.error("MedGemma inference call timed out.")
            return {
                "success": False,
                "error_type": "TIMEOUT",
                "error_message": f"MedGemma inference timed out after {self.timeout}s. Case queued for manual clinical review.",
                "model_name": self.model_id
            }
        except Exception as e:
            logger.error(f"MedGemma inference exception: {e}")
            return {
                "success": False,
                "error_type": "CONNECTION_FAILED",
                "error_message": f"Failed to connect to MedGemma provider: {e}",
                "model_name": self.model_id
            }

    async def explain_observations(
        self,
        observations: List[str],
        clinical_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Explain validated visible observations.
        """
        return {
            "observations_summary": " ".join(observations),
            "context_considered": clinical_context,
            "provenance": self.get_model_metadata()
        }

    def _extract_response_text(self, data: Any) -> str:
        if isinstance(data, dict):
            if "choices" in data and len(data["choices"]) > 0:
                msg = data["choices"][0].get("message", {})
                return msg.get("content", "")
            if "generated_text" in data:
                return data["generated_text"]
        elif isinstance(data, list) and len(data) > 0:
            if isinstance(data[0], dict) and "generated_text" in data[0]:
                return data[0]["generated_text"]
        return str(data)

    def _parse_medgemma_json(
        self,
        raw_text: str,
        body_region: str,
        clinical_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Extract and validate JSON schema from model response.
        """
        # Try extracting JSON block
        try:
            start_idx = raw_text.find("{")
            end_idx = raw_text.rfind("}")
            if start_idx != -1 and end_idx != -1:
                json_str = raw_text[start_idx : end_idx + 1]
                data = json.loads(json_str)
                return {
                    "visible_observations": data.get("visible_observations", []),
                    "possible_explanations": data.get("possible_explanations", []),
                    "missing_information": data.get("missing_information", []),
                    "limitations": data.get("limitations", [])
                }
        except Exception:
            pass

        # Fallback parsing if output was free-form text
        return {
            "visible_observations": [line.strip("- ") for line in raw_text.splitlines() if line.strip().startswith(("-", "*", "1.", "2."))][:4],
            "possible_explanations": [
                {
                    "name": "Clinical observation awaiting review",
                    "reasoning": raw_text[:280].strip(),
                    "supporting_observations": [],
                    "limitations": ["Visual observation only. Dysplasia requires tissue biopsy."]
                }
            ],
            "missing_information": ["Complete clinical history and in-person palpation."],
            "limitations": ["Model did not produce strict schema; review original image."]
        }

    def _generate_test_observations(
        self,
        body_region: str,
        clinical_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Deterministic test implementation used for automated regression test suites.
        """
        symptoms = clinical_context.get("symptoms", "").lower()
        site = clinical_context.get("body_site", body_region)

        if "white" in symptoms or "patch" in symptoms or "leukoplakia" in symptoms:
            return {
                "success": True,
                "visible_observations": [
                    f"Well-circumscribed whitish plaque noted over the {site}.",
                    "No spontaneous bleeding visible at the lesion surface.",
                    "Surrounding mucosal tissue demonstrates mild vascular injection."
                ],
                "possible_explanations": [
                    {
                        "name": "Oral Leukoplakia / Keratosis",
                        "reasoning": "Homogeneous white plaque adherent to oral mucosal surface, frequently associated with local mechanical irritation or tobacco/areca nut exposure.",
                        "supporting_observations": [f"Well-circumscribed whitish plaque noted over the {site}."],
                        "limitations": ["Dysplasia or cellular atypia cannot be determined from photographs alone without punch biopsy."]
                    },
                    {
                        "name": "Hyperkeratotic Friction Lesion",
                        "reasoning": "Benign mucosal response to localized friction or dental contact.",
                        "supporting_observations": ["Localized focal nature without irregular elevated borders."],
                        "limitations": ["Requires clinical dental occlusion check."]
                    }
                ],
                "missing_information": [
                    "Duration of tobacco, betel quid, or gutkha use",
                    "Whether plaque detaches on gentle scraping with sterile gauze"
                ],
                "limitations": [
                    "Ordinary external photography cannot evaluate submucosal induration.",
                    "Visual inspection alone cannot definitively confirm or exclude pre-malignant dysplasia."
                ],
                "model_name": self.model_id,
                "model_version": "1.5-4b-it"
            }
        elif "burning" in symptoms or "spicy" in symptoms or "trismus" in symptoms or "opening" in symptoms:
            return {
                "success": True,
                "visible_observations": [
                    f"Diffuse mucosal blanching with mottled pale-marble appearance on {site}.",
                    "Reduced mucosal elasticity and visible pallor.",
                    "No exophytic vegetative mass detected."
                ],
                "possible_explanations": [
                    {
                        "name": "Oral Submucous Fibrosis (OSMF)",
                        "reasoning": "Blanching of buccal mucosa and mucosal pallor are hallmarks of collagen deposition in OSMF, commonly accompanied by restricted interincisal opening.",
                        "supporting_observations": [f"Diffuse mucosal blanching with mottled pale-marble appearance on {site}."],
                        "limitations": ["Clinical palpation of fibrous bands and millimeter interincisal caliper measurement required."]
                    }
                ],
                "missing_information": [
                    "Accurate millimeter mouth opening measurement using caliper",
                    "History of raw areca nut chewing"
                ],
                "limitations": [
                    "Photograph cannot assess vertical fibrous band palpability or soft palate motility."
                ],
                "model_name": self.model_id,
                "model_version": "1.5-4b-it"
            }
        else:
            return {
                "success": True,
                "visible_observations": [
                    f"Surface photograph of {site} captured for clinical review.",
                    "Morphological appearance noted with localized mucosal variation.",
                    "No acute destructive tissue breakdown visible on surface view."
                ],
                "possible_explanations": [
                    {
                        "name": "Mucosal / Cutaneous Variation Requiring Evaluation",
                        "reasoning": "Visible presentation requires in-person medical examination and clinical correlation.",
                        "supporting_observations": [f"Localized surface variation on {site}."],
                        "limitations": ["Visual observation only. Cannot confirm specific etiology without clinician exam."]
                    }
                ],
                "missing_information": [
                    "Complete duration and evolution of lesion",
                    "Systemic medical history and current medications"
                ],
                "limitations": [
                    "Preliminary observation only; physical examination is required."
                ],
                "model_name": self.model_id,
                "model_version": "1.5-4b-it"
            }

medgemma_provider = MedGemmaProvider()

