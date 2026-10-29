import os
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
        # Local DeepSeek V3 Flash / Ollama support
        self.local_ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
        self.local_model_name = os.getenv("LOCAL_DEEPSEEK_MODEL", "deepseek-r1:8b")

    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 5)

    async def generate_response(self, prompt: str, category: str = "general", language: str = "te", has_attachment: bool = False) -> Dict[str, Any]:
        """
        Attempts:
        1. Local Ollama / DeepSeek V3 Flash (100% offline, local private execution)
        2. Hugging Face Inference API if configured
        3. Fallback to expert deterministic clinical rule-based triage
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

        # 1. Primary Engine: Local Google MedGemma 1.5 4B Clinical Engine (100% on-device private CPU execution)
        try:
            from app.integrations.ai.local_medgemma_engine import local_medgemma
            medgemma_res = await local_medgemma.execute_local_inference(
                question=prompt,
                category=category,
                language=language,
                task_type="clinical_qa"
            )
            if medgemma_res.get("success"):
                content = medgemma_res.get("summary_te") if language == "te" else medgemma_res.get("summary_en")
                if content:
                    return {
                        "content": content,
                        "disclaimer": medgemma_res.get("disclaimer", ""),
                        "urgency": medgemma_res.get("urgency", "routine_review"),
                        "is_real_inference": True,
                        "provider": "local_medgemma_1.5_4b",
                        "is_emergency": False
                    }
        except Exception as e:
            logger.warning(f"Local MedGemma clinical QA notice: {e}")

        system_prompt = (
            "You are Arogya Mitra AI, an expert clinical healthcare assistant for tribal and community health in Andhra Pradesh. "
            "You have comprehensive medical knowledge on oral medicine, mucosal lesions, leukoplakia, OSMF, canker sores, and skin conditions. "
            "CRITICAL MANDATORY SAFETY RULE: "
            "1. NEVER confirm directly that a lesion is cancer. Never diagnose cancer. "
            "2. If a lesion looks suspicious, ulcerated, firm, non-healing, or potentially malignant, you MUST clearly state: "
            "'Immediate in-person doctor consultation is mandatory. Neither AI nor photographic images can diagnose or confirm cancer. An in-person physical clinical exam, punch biopsy, and histopathological staging are mandatory.' "
            "3. Answer compassionately and clearly in the patient's language (Telugu or English)."
        )

        # 1. Check for Local DeepSeek V3 / Ollama
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                ollama_payload = {
                    "model": self.local_model_name,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 400
                }
                res = await client.post(f"{self.local_ollama_url}/chat/completions", json=ollama_payload)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices and "message" in choices[0]:
                        content = choices[0]["message"].get("content", "").strip()
                        if content:
                            triage = generate_safe_triage_guidance(category, prompt, language=language, has_image=has_attachment)
                            return {
                                "content": content,
                                "disclaimer": triage["disclaimer"],
                                "urgency": triage["urgency"],
                                "is_real_inference": True,
                                "provider": f"local_deepseek/{self.local_model_name}",
                                "is_emergency": False
                            }
        except Exception as e:
            # Local Ollama not running or timed out; continue to next options
            pass

        # 2. Try Hugging Face if configured
        if self.is_configured():
            try:
                payload = {
                    "inputs": f"<|system|>\n{system_prompt}\n<|user|>\n{prompt}\n<|assistant|>\n",
                    "parameters": {"max_new_tokens": 300, "temperature": 0.4}
                }
                headers = {"Authorization": f"Bearer {self.api_key}"}
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(self.api_url, json=payload, headers=headers)
                    if resp.status_code == 200:
                        res_data = resp.json()
                        generated = ""
                        if isinstance(res_data, list) and len(res_data) > 0:
                            generated = res_data[0].get("generated_text", "")
                        elif isinstance(res_data, dict):
                            generated = res_data.get("generated_text", "")

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

        # 3. Fallback to deterministic expert clinical triage rules
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
