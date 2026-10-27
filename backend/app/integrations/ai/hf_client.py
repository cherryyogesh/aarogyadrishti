import logging
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings
from app.integrations.ai.triage import generate_safe_triage_guidance, detect_emergency_symptoms

logger = logging.getLogger("hf_client")

class HuggingFaceClient:
    def __init__(self):
        self.api_key = settings.HUGGINGFACE_API_KEY
        self.model_id = settings.AI_MODEL_ID
        self.api_url = f"https://api-inference.huggingface.co/models/{self.model_id}"

    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 5)

    async def generate_response(self, prompt: str, category: str = "general", language: str = "te", has_attachment: bool = False) -> Dict[str, Any]:
        """
        Attempts Hugging Face Inference API call if configured.
        Falls back to local clinical rule-based triage if unconfigured or error occurs.
        """
        # Emergency check always runs first
        emergency = detect_emergency_symptoms(prompt)
        if emergency:
            triage_res = generate_safe_triage_guidance(category, prompt, language=language, has_image=has_attachment)
            return {
                "content": triage_res["recommendations"],
                "disclaimer": triage_res["disclaimer"],
                "urgency": "urgent_warning",
                "is_real_inference": False,
                "provider": "clinical_safety_guardrails",
                "is_emergency": True
            }

        # Try Hugging Face if configured
        if self.is_configured():
            try:
                system_prompt = (
                    "You are Aarogya Drishti Healthcare AI, a triage and health education assistant. "
                    "Rules: Never claim to diagnose cancer, infections, or serious illness from photos or symptoms alone. "
                    "Never prescribe antibiotics or prescription dosages. "
                    "Always recommend PHC doctor examination. Answer clearly and compassionately in the patient's language."
                )
                payload = {
                    "inputs": f"<|system|>\n{system_prompt}\n<|user|>\n{prompt}\n<|assistant|>\n",
                    "parameters": {"max_new_tokens": 300, "temperature": 0.4}
                }
                headers = {"Authorization": f"Bearer {self.api_key}"}
                async with httpx.AsyncClient(timeout=12.0) as client:
                    resp = await client.post(self.api_url, json=payload, headers=headers)
                    if resp.status_code == 200:
                        res_data = resp.json()
                        generated = ""
                        if isinstance(res_data, list) and len(res_data) > 0:
                            generated = res_data[0].get("generated_text", "")
                        elif isinstance(res_data, dict):
                            generated = res_data.get("generated_text", "")

                        # Clean output
                        if "<|assistant|>\n" in generated:
                            generated = generated.split("<|assistant|>\n")[-1].strip()

                        triage = generate_safe_triage_guidance(category, prompt, language=language, has_image=has_attachment)
                        return {
                            "content": generated or triage["recommendations"],
                            "disclaimer": triage["disclaimer"],
                            "urgency": triage["urgency"],
                            "is_real_inference": True,
                            "provider": f"huggingface/{self.model_id}",
                            "is_emergency": False
                        }
            except Exception as e:
                logger.warning(f"Hugging Face call failed: {e}. Falling back to clinical safety rules.")

        # Fallback to deterministic clinical triage rules
        triage = generate_safe_triage_guidance(category, prompt, language=language, has_image=has_attachment)
        return {
            "content": triage["recommendations"],
            "disclaimer": triage["disclaimer"],
            "urgency": triage["urgency"],
            "is_real_inference": False,
            "provider": "clinical_rule_engine",
            "is_emergency": False
        }

hf_client = HuggingFaceClient()
