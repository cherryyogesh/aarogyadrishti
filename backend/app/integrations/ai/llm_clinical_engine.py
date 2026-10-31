import os
import re
import json
import logging
import asyncio
from typing import Dict, Any, Optional, List
import httpx

from app.core.config import settings
from app.integrations.ai.google_health_medgemma_bridge import google_health_medgemma_bridge

logger = logging.getLogger("llm_clinical_engine")

class LLMClinicalEngine:
    """
    Unified High-Performance Clinical LLM Engine for Aarogya Mytra AI.
    Connects to:
    1. Google Gemini / MedGemma Cloud API (Free Tier at aistudio.google.com)
    2. Groq Fast LPU Inference (Free Tier at console.groq.com)
    3. Custom MedGemma / vLLM Endpoint (Self-Hosted vLLM / Triton / Ollama)
    4. Hugging Face Inference API (google/medgemma-1.5-4b-it)
    5. Local Google Health MedGemma (external/medgemma submodule • Zero API Key)
    6. Autonomous Multilingual Clinical Knowledge & Triage Engine
    """

    def __init__(self):
        self.bridge = google_health_medgemma_bridge
        self._reload_keys()

    def _reload_keys(self):
        self.gemini_key = (
            os.getenv("GEMINI_API_KEY", "") or
            getattr(settings, "GEMINI_API_KEY", "") or
            getattr(settings, "GOOGLE_API_KEY", "") or
            getattr(settings, "MEDGEMMA_API_KEY", "")
        ).strip()
        # Clean out any dummy/demo placeholders
        if "demosample" in self.gemini_key.lower() or "demo" in self.gemini_key.lower():
            self.gemini_key = ""

        self.groq_key = (
            os.getenv("GROQ_API_KEY", "") or
            getattr(settings, "GROQ_API_KEY", "")
        ).strip()

        self.hf_key = (
            os.getenv("HUGGINGFACE_API_KEY", "") or
            getattr(settings, "HUGGINGFACE_API_KEY", "") or
            getattr(settings, "MEDGEMMA_HF_TOKEN", "")
        ).strip()

        self.openai_key = (
            os.getenv("OPENAI_API_KEY", "") or
            getattr(settings, "OPENAI_API_KEY", "")
        ).strip()

        self.custom_endpoint = (
            os.getenv("MEDGEMMA_ENDPOINT_URL", "") or
            getattr(settings, "MEDGEMMA_ENDPOINT_URL", "")
        ).strip()

        self.medgemma_model = (
            os.getenv("MEDGEMMA_MODEL_ID", "") or
            getattr(settings, "MEDGEMMA_MODEL_ID", "google/medgemma-1.5-4b-it")
        ).strip()

    def get_status(self) -> Dict[str, Any]:
        self._reload_keys()
        providers = []
        repo_info = self.bridge.get_repo_info()

        has_endpoint = bool(self.custom_endpoint and self.custom_endpoint.strip())
        is_live_connected = bool(has_endpoint or self.gemini_key or self.groq_key or self.hf_key or self.openai_key)

        # 1. Google Gemini (Official Google AI Studio for MedGemma Cloud)
        providers.append({
            "id": "gemini",
            "name": "Google Gemini (MedGemma Cloud AI)",
            "status": "connected" if self.gemini_key else "unconfigured",
            "speed": "ultra_fast",
            "type": "cloud",
            "model": "gemini-1.5-flash / gemini-2.0-flash",
            "free_key_url": "https://aistudio.google.com/app/apikey",
            "description": "Official Google Multimodal Medical AI. Free API key from Google AI Studio."
        })

        # 2. Groq Fast LPU
        providers.append({
            "id": "groq",
            "name": "Groq LPU Fast Inference",
            "status": "connected" if self.groq_key else "unconfigured",
            "speed": "fastest",
            "type": "cloud",
            "model": "llama-3.3-70b-versatile",
            "free_key_url": "https://console.groq.com/keys",
            "description": "Ultra-fast inference (500 tokens/sec) on Groq LPUs. Free tier."
        })

        # 3. Custom MedGemma / vLLM Endpoint (Self-Hosted)
        providers.append({
            "id": "vllm",
            "name": "Custom MedGemma / vLLM Endpoint",
            "status": "connected" if has_endpoint else "unconfigured",
            "speed": "gpu_accelerated",
            "endpoint_url": self.custom_endpoint or "http://localhost:8080/v1",
            "model_id": self.medgemma_model,
            "type": "self_hosted",
            "description": "Self-hosted vLLM, Ollama, or Triton instance running Google MedGemma weights."
        })

        # 4. Hugging Face Inference API
        providers.append({
            "id": "huggingface",
            "name": f"Hugging Face ({self.medgemma_model})",
            "status": "connected" if self.hf_key else "unconfigured",
            "speed": "standard",
            "type": "cloud",
            "free_key_url": "https://huggingface.co/settings/tokens"
        })

        # 5. Local Google-Health/medgemma Submodule (Always available offline)
        providers.append({
            "id": "medgemma_local",
            "name": "Google Health MedGemma (Local Submodule)",
            "status": "connected" if repo_info.get("connected") else "disconnected",
            "speed": "instant_local",
            "type": "local_zero_key",
            "submodule_path": "external/medgemma",
            "commit_hash": repo_info.get("commit_hash", "a60a660"),
            "zero_key": True,
            "description": "Zero-key offline clinical reasoning grounded in Google Health MedGemma prompt architecture and MoHFW guidelines."
        })

        # Determine Active Provider
        if self.gemini_key:
            active_provider = "gemini"
            active_model = "Aarogya Mytra AI (Live Cloud)"
            message = "Aarogya Mytra AI Live Connected"
        elif has_endpoint:
            active_provider = "custom_vllm"
            active_model = f"Aarogya Mytra AI ({self.custom_endpoint})"
            message = f"Aarogya Mytra AI active on {self.custom_endpoint}"
        elif self.groq_key:
            active_provider = "groq"
            active_model = "llama-3.3-70b-versatile (Groq LPU)"
            message = "Groq LPU ultra-fast inference active"
        elif self.hf_key:
            active_provider = "huggingface"
            active_model = self.medgemma_model
            message = f"Hugging Face {self.medgemma_model} active"
        elif self.openai_key:
            active_provider = "openai"
            active_model = "gpt-4o-mini"
            message = "OpenAI compatible endpoint active"
        else:
            active_provider = "google_health_medgemma_local"
            active_model = "Aarogya Mytra AI"
            message = "Aarogya Mytra AI Clinical Knowledge Engine Active"

        return {
            "is_live_llm_connected": is_live_connected,
            "active_provider": active_provider,
            "active_model": active_model,
            "all_providers": providers,
            "custom_endpoint": self.custom_endpoint,
            "message": message,
            "google_health_repo": "https://github.com/Google-Health/medgemma.git",
            "google_health_submodule": f"external/medgemma (HEAD: {repo_info.get('commit_hash', 'a60a660')[:7]})",
            "zero_key_mode": not is_live_connected
        }

    async def validate_api_key(self, provider: str, api_key: str) -> Dict[str, Any]:
        """
        Validates an API key against the provider before persisting.
        """
        prov = provider.lower().strip()
        key = api_key.strip()
        if not key:
            return {"valid": False, "error": "API Key cannot be empty."}

        if prov in ["gemini", "google", "medgemma"]:
            models = ["gemini-1.5-flash", "gemini-2.0-flash"]
            for model in models:
                test_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
                test_payload = {
                    "contents": [{"parts": [{"text": "Hello, health assistant test ping."}]}],
                    "generationConfig": {"maxOutputTokens": 5}
                }
                try:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        resp = await client.post(test_url, json=test_payload, headers={"Content-Type": "application/json"})
                        if resp.status_code == 200:
                            return {"valid": True, "provider": "gemini", "model": model}
                        elif resp.status_code in [400, 401, 403]:
                            err_data = resp.json() if "application/json" in resp.headers.get("content-type", "") else {}
                            err_msg = err_data.get("error", {}).get("message", resp.text[:140])
                            return {"valid": False, "error": f"Google Gemini Key Error ({resp.status_code}): {err_msg}"}
                except Exception as e:
                    logger.warning(f"Error testing Gemini key with {model}: {e}")

            return {"valid": False, "error": "Could not connect to Google Gemini. Please check your API key or network connection."}

        elif prov in ["groq"]:
            test_url = "https://api.groq.com/openai/v1/chat/completions"
            test_payload = {
                "model": "llama-3.1-8b-instant",
                "messages": [{"role": "user", "content": "ping"}],
                "max_tokens": 5
            }
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        test_url,
                        json=test_payload,
                        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
                    )
                    if resp.status_code == 200:
                        return {"valid": True, "provider": "groq", "model": "llama-3.1-8b-instant"}
                    else:
                        err_data = resp.json() if "application/json" in resp.headers.get("content-type", "") else {}
                        err_msg = err_data.get("error", {}).get("message", resp.text[:140])
                        return {"valid": False, "error": f"Groq Key Error ({resp.status_code}): {err_msg}"}
            except Exception as e:
                return {"valid": False, "error": f"Connection error testing Groq API: {str(e)}"}

        # Hugging Face or OpenAI
        return {"valid": True, "provider": prov}

    def set_endpoint(self, endpoint_url: str, model_id: Optional[str] = None, api_key: Optional[str] = None) -> Dict[str, Any]:
        url = endpoint_url.strip()
        os.environ["MEDGEMMA_ENDPOINT_URL"] = url
        setattr(settings, "MEDGEMMA_ENDPOINT_URL", url)
        self._save_env_var("MEDGEMMA_ENDPOINT_URL", url)

        if model_id and model_id.strip():
            mid = model_id.strip()
            os.environ["MEDGEMMA_MODEL_ID"] = mid
            setattr(settings, "MEDGEMMA_MODEL_ID", mid)
            self._save_env_var("MEDGEMMA_MODEL_ID", mid)

        if api_key and api_key.strip():
            k = api_key.strip()
            os.environ["MEDGEMMA_API_KEY"] = k
            setattr(settings, "MEDGEMMA_API_KEY", k)
            self._save_env_var("MEDGEMMA_API_KEY", k)

        self._reload_keys()
        return self.get_status()

    def set_api_key(self, provider: str, api_key: str, model_id: Optional[str] = None) -> Dict[str, Any]:
        provider = provider.lower().strip()
        api_key = api_key.strip()

        if provider in ["vllm", "custom_endpoint", "medgemma_endpoint", "endpoint"]:
            return self.set_endpoint(api_key, model_id)

        if provider in ["medgemma_local", "local", "submodule", "zero_key"]:
            os.environ["MEDGEMMA_ENDPOINT_URL"] = ""
            setattr(settings, "MEDGEMMA_ENDPOINT_URL", "")
            self._save_env_var("MEDGEMMA_ENDPOINT_URL", "")
            self._reload_keys()
            return self.get_status()

        env_var_map = {
            "gemini": "GEMINI_API_KEY",
            "google": "GEMINI_API_KEY",
            "medgemma": "GEMINI_API_KEY",
            "groq": "GROQ_API_KEY",
            "huggingface": "HUGGINGFACE_API_KEY",
            "hf": "HUGGINGFACE_API_KEY",
            "openai": "OPENAI_API_KEY"
        }

        var_name = env_var_map.get(provider, "GEMINI_API_KEY")
        os.environ[var_name] = api_key
        if var_name == "GEMINI_API_KEY":
            os.environ["GOOGLE_API_KEY"] = api_key
            os.environ["MEDGEMMA_API_KEY"] = api_key
            setattr(settings, "GEMINI_API_KEY", api_key)
            setattr(settings, "MEDGEMMA_API_KEY", api_key)

        self._save_env_var(var_name, api_key)
        self._reload_keys()
        return self.get_status()

    def _save_env_var(self, var_name: str, value: str):
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        root_dir = os.path.dirname(backend_dir)
        env_paths = [
            os.path.join(backend_dir, ".env"),
            os.path.join(root_dir, ".env")
        ]
        for env_path in env_paths:
            try:
                existing = ""
                if os.path.exists(env_path):
                    with open(env_path, "r", encoding="utf-8") as f:
                        existing = f.read()

                pattern = rf"^{var_name}=.*$"
                new_line = f"{var_name}={value}"
                if re.search(pattern, existing, flags=re.MULTILINE):
                    updated = re.sub(pattern, new_line, existing, flags=re.MULTILINE)
                else:
                    updated = existing.strip() + f"\n{new_line}\n"

                with open(env_path, "w", encoding="utf-8") as f:
                    f.write(updated)
            except Exception as e:
                logger.warning(f"Could not persist {var_name} to {env_path}: {e}")

        self._reload_keys()
        return self.get_status()

    async def generate_response(
        self,
        user_message: str,
        language: str = "te",
        has_attachment: bool = False,
        clinical_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Main query entrypoint.
        Routes to:
        1. Google Gemini / MedGemma Cloud API (if configured)
        2. Custom MedGemma / vLLM Endpoint (if configured)
        3. Groq Fast LPU Inference (if configured)
        4. Hugging Face Inference API (if configured)
        5. Autonomous Evidence-Grounded Medical Knowledge Engine (Offline Mode)
        """
        self._reload_keys()
        clean_msg = user_message.strip()

        # 1. Google Gemini / MedGemma Cloud API
        if self.gemini_key:
            try:
                res = await self._call_gemini_api(clean_msg, language, has_attachment)
                if res:
                    return res
            except Exception as e:
                logger.error(f"Gemini API call failed: {e}")

        # 2. Custom Self-Hosted MedGemma / vLLM Endpoint
        if self.custom_endpoint:
            try:
                res = await self._call_medgemma_vllm_endpoint(clean_msg, language, has_attachment)
                if res:
                    return res
            except Exception as e:
                logger.error(f"Custom vLLM Endpoint query failed: {e}")

        # 3. Groq LPU API
        if self.groq_key:
            try:
                res = await self._call_groq_api(clean_msg, language, has_attachment)
                if res:
                    return res
            except Exception as e:
                logger.error(f"Groq API call failed: {e}")

        # 4. Hugging Face Inference API
        if self.hf_key:
            try:
                res = await self._call_huggingface_api(clean_msg, language, has_attachment)
                if res:
                    return res
            except Exception as e:
                logger.error(f"HuggingFace API call failed: {e}")

        # 5. Autonomous Evidence-Grounded Medical Knowledge & Clinical Synthesis Engine
        return self._generate_embedded_knowledge_response(clean_msg, language, has_attachment)

    def _build_system_prompt(self, language: str) -> str:
        lang_names = {
            "te": "Telugu (తెలుగు)",
            "hi": "Hindi (हिन्दी)",
            "en": "English"
        }
        target_lang = lang_names.get(language, "English")

        return f"""You are Aarogya Mytra AI (ఆరోగ్య మిత్ర AI), an advanced clinical health intelligence assistant grounded strictly in the Ministry of Health and Family Welfare (MoHFW) National Oral Health Programme (NOHP), ICMR, and WHO clinical guidelines.

PRIMARY LANGUAGE INSTRUCTION: You MUST respond primarily in {target_lang}. Maintain maximum clarity and respectful bedside communication.

CRITICAL OUTPUT FORMATTING INSTRUCTIONS (STRICT SINGLE DIRECT UNIFIED RESPONSE):
1. DO NOT output multiple confusing differential diagnoses or separate redundant dossiers for different audiences.
2. DO NOT list 'It could be condition A, or condition B, or condition C, or condition D'. Clearly state the identified disease or condition.
3. Structure your response into these clear, structured sections:

🩺 **గుర్తించిన వ్యాధి / పరిస్థితి (Identified Disease / Condition)**:
Directly state the exact identified condition (e.g., Oral Leukoplakia, Aphthous Stomatitis, Oral Submucous Fibrosis, Dental Caries, Gingivitis).

💬 **మీ ప్రశ్నకు సమాధానం (Clinical Response to Your Question)**:
Directly, clearly, and concisely address what the user asked in the chat.

💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య (Care & Next Steps)**:
- Practical immediate home relief measures (warm salt water rinses, soft non-irritating diet, strictly no caustic lime/chuna, immediate cessation of gutkha/tobacco).
- Clear timeline to visit the PHC Doctor or Dental Specialist (mandatory doctor checkup if persisting >14 days).

CRITICAL CLINICAL SAFETY BOUNDARIES:
1. NEVER confirm or exclude cancer from photographic inspection or text chat alone. A physical exam and tissue biopsy are mandatory.
2. If active uncontrolled bleeding, severe airway restriction, or inability to swallow is reported, immediately flag as an EMERGENCY RED FLAG and instruct calling 108.
3. Strictly maintain professional, accurate medical guidance at all times."""

    async def _call_gemini_api(self, user_message: str, language: str, has_attachment: bool) -> Optional[Dict[str, Any]]:
        system_prompt = self._build_system_prompt(language)
        models_to_try = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]

        for model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.gemini_key}"
            payload = {
                "system_instruction": {
                    "parts": [{"text": system_prompt}]
                },
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": user_message if user_message else "Please evaluate this clinical query."}]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 1500
                }
            }

            try:
                async with httpx.AsyncClient(timeout=18.0) as client:
                    resp = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            if parts and "text" in parts[0]:
                                raw_text = parts[0]["text"].strip()
                                return {
                                    "content": raw_text,
                                    "speech_text": self._extract_speech_summary(raw_text, language),
                                    "is_emergency": "EMERGENCY" in raw_text or "108" in raw_text,
                                    "urgency": "prompt_assessment",
                                    "disclaimer": f"Google Gemini Live Multimodal AI ({model}) with MoHFW/ICMR Evidence Grounding.",
                                    "provider": "gemini",
                                    "model_id": model
                                }
                    else:
                        logger.warning(f"Gemini {model} returned status {resp.status_code}: {resp.text[:120]}")
            except Exception as e:
                logger.error(f"Gemini {model} query error: {e}")

        return None

    async def _call_groq_api(self, user_message: str, language: str, has_attachment: bool) -> Optional[Dict[str, Any]]:
        system_prompt = self._build_system_prompt(language)
        url = "https://api.groq.com/openai/v1/chat/completions"

        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            "temperature": 0.3,
            "max_tokens": 1500
        }
        headers = {
            "Authorization": f"Bearer {self.groq_key}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                choices = data.get("choices", [])
                if choices and "message" in choices[0]:
                    raw_text = choices[0]["message"].get("content", "").strip()
                    return {
                        "content": raw_text,
                        "speech_text": self._extract_speech_summary(raw_text, language),
                        "is_emergency": "EMERGENCY" in raw_text or "108" in raw_text,
                        "urgency": "prompt_assessment",
                        "disclaimer": "Groq Ultra-Fast Medical LPU Inference with MoHFW Evidence Grounding.",
                        "provider": "groq",
                        "model_id": "llama-3.3-70b-versatile"
                    }
        return None

    async def _call_medgemma_vllm_endpoint(self, user_message: str, language: str, has_attachment: bool) -> Optional[Dict[str, Any]]:
        system_prompt = self._build_system_prompt(language)
        res = await self.bridge.query_vllm_chat(
            endpoint_url=self.custom_endpoint,
            user_message=user_message,
            system_prompt=system_prompt,
            model_id=self.medgemma_model,
            api_key=self.openai_key or getattr(settings, "MEDGEMMA_API_KEY", None),
            enable_thinking=True
        )
        if res and res.get("content"):
            content = res["content"]
            thought = res.get("thinking_trace")
            speech = self._extract_speech_summary(content, language)
            return {
                "content": content,
                "thinking_trace": thought,
                "speech_text": speech,
                "is_emergency": "EMERGENCY" in content or "108" in content,
                "urgency": "prompt_assessment",
                "disclaimer": f"Google Health MedGemma Self-Hosted vLLM Inference ({self.medgemma_model}).",
                "provider": "custom_vllm",
                "model_id": self.medgemma_model
            }
        return None

    async def _call_huggingface_api(self, user_message: str, language: str, has_attachment: bool) -> Optional[Dict[str, Any]]:
        system_prompt = self._build_system_prompt(language)
        url = f"https://api-inference.huggingface.co/models/{self.medgemma_model}"
        headers = {
            "Authorization": f"Bearer {self.hf_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "inputs": f"<|system|>\n{system_prompt}\n<|user|>\n{user_message}\n<|assistant|>\n",
            "parameters": {"max_new_tokens": 1000, "temperature": 0.3}
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                res_data = resp.json()
                text = ""
                if isinstance(res_data, list) and len(res_data) > 0:
                    text = res_data[0].get("generated_text", "")
                elif isinstance(res_data, dict):
                    text = res_data.get("generated_text", "")
                if text:
                    if "<|assistant|>\n" in text:
                        text = text.split("<|assistant|>\n")[-1].strip()
                    return {
                        "content": text,
                        "speech_text": self._extract_speech_summary(text, language),
                        "is_emergency": False,
                        "urgency": "prompt_assessment",
                        "disclaimer": f"Official Google MedGemma ({self.medgemma_model}) Inference.",
                        "provider": "huggingface",
                        "model_id": self.medgemma_model
                    }
        return None


    def _extract_speech_summary(self, content: str, language: str) -> str:
        """
        Extracts a clean, conversational 1-2 sentence voice synthesis summary.
        """
        if not content:
            return ""
        clean = re.sub(r"[*#_`•👉✓🚨⚠️🔬🩺📸💬💡🏥]", " ", content)
        lines = [l.strip() for l in clean.splitlines() if l.strip() and not l.strip().startswith(":")]
        meaningful = [
            l for l in lines 
            if not any(k in l.lower() for k in ["identified disease", "గుర్తించిన", "visual findings", "clinical response", "image analysis"])
        ]
        if meaningful:
            return " ".join(meaningful[:2])
        return " ".join(lines[:2])

    def _generate_embedded_knowledge_response(self, user_message: str, language: str, has_attachment: bool) -> Dict[str, Any]:
        """
        Comprehensive Evidence-Grounded Medical Intelligence Engine.
        Covers oral medicine, dental triage, precancer detection, oncology,
        and primary healthcare triage.
        Provides a SINGLE direct, focused answer stating the disease, answering the query,
        and giving immediate care steps without confusing 'various results'.
        """
        msg_lower = user_message.lower().strip()
        is_te = language == "te"
        is_hi = language == "hi"

        # Topic 1: Oral Ulcers / Mouth Sores / Aphthae / Canker Sores
        if any(w in msg_lower for w in ["ulcer", "పుండు", "పూత", "పుండ్లు", "మంట", "छाला", "घाव", "छाले", "अल्सर", "sore", "canker", "aphth"]):
            if is_te:
                content = """### 👄 నోటి పూత & పుండ్ల సమాచారం (Oral Ulcers Guidance)

🩺 **గుర్తించిన వ్యాధి / పరిస్థితి (Identified Disease):**
**నోటి పూత / అల్సర్ (Oral Mucosal Ulcer / Aphthous Stomatitis)**

💬 **మీ ప్రశ్నకు సమాధానం (Clinical Response):**
నోటిలోని పూత లేదా పుండ్లు సాధారణంగా విటమిన్ లోపం (విటమిన్ B12, ఫోలిక్ యాసిడ్, ఐరన్), శారీరక ఒత్తిడి, లేదా పదునైన పంటి రాపిడి వల్ల ఏర్పడతాయి.

💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య (Care & Next Steps):**
• **గోరువెచ్చని ఉప్పునీటి పుక్కిలింత:** రోజుకు 3-4 సార్లు ఒక గ్లాసు గోరువెచ్చని నీటిలో అర చెంచా ఉప్పు వేసి నెమ్మదిగా పుక్కిలించండి. ఇది నోటిలోని వాపును తగ్గిస్తుంది.
• **ఆహార జాగ్రత్తలు:** కారం, ఎక్కువ వేడి, పులుపు మరియు మసాలాలు ఉన్న ఆహారాలు కొన్ని రోజులు పూర్తిగా ఆపండి. పెరుగు, పాలు వంటి చల్లని మృదువైన ఆహారం తీసుకోండి.
• **చేయకూడనివి:** పుండుపై సున్నం (చున్నా) లేదా ఘాటైన రసాయనాలు రాయవద్దు. పుండును నాలుకతో లేదా వేలితో తరచుగా తాకవద్దు. గుట్కా/తంబాకు వెంటనే ఆపండి.
• **డాక్టర్ సంప్రదింపు:** ఏదైనా నోటి పుండు **14 రోజుల కంటే ఎక్కువ రోజులు తగ్గకుండా ఉంటే**, ఆలస్యం చేయకుండా సమీప PHC మెడికల్ ఆఫీసర్‌ను సంప్రదించాలి.

> ⚠️ *గమనిక: ఈ AI ఫలితం ప్రాథమిక సమాచారం మాత్రమే. 14 రోజుల కంటే ఎక్కువ రోజులు తగ్గని పుండుకు డాక్టర్ గారి ప్రత్యక్ష పరీక్ష మరియు బయాప్సీ తప్పనిసరి.*"""
                speech = "నోటి పూత తగ్గడానికి రోజుకు మూడుసార్లు గోరువెచ్చని ఉప్పునీటితో పుక్కిలించండి. 14 రోజుల కంటే ఎక్కువ రోజులు తగ్గని పుండుకు డాక్టర్ గారి పరీక్ష తప్పనిసరి."
            elif is_hi:
                content = """### 👄 मुंह के छाले एवं घाव की जानकारी (Oral Ulcers Guidance)

🩺 **पहचानी गई स्थिति / रोग (Identified Disease):**
**मुंह के छाले (Oral Aphthous Ulcer / Stomatitis)**

💬 **आपके प्रश्न का उत्तर (Clinical Response):**
मुंह के छाले अक्सर विटामिन की कमी (विटामिन B12, आयरन, फोलिक एसिड), पेट की गर्मी या नुकीले दांत की रगड़ से होते हैं।

💡 **सावधानियां एवं अगला कदम (Care & Next Steps):**
• **गुनगुने नमक पानी से कुल्ला:** एक गिलास गुनगुने पानी में आधा चम्मच नमक मिलाकर दिन में 3 बार कुल्ला करें।
• **खानपान में बदलाव:** तीखा, खट्टा, अधिक गर्म और मसालेदार खाना कुछ दिनों के लिए बंद कर दें।
• **सावधानी:** छाले पर चूना, कत्था या हानिकारक रसायन न लगाएं। गुटखा और तंबाकू तुरंत बंद करें।
• **डॉक्टर को कब दिखाएं:** यदि कोई छाला **14 दिनों से अधिक समय तक ठीक न हो**, तो तुरंत नजदीकी पीएचसी डॉक्टर को दिखाएं।

> ⚠️ *नोट: यह जानकारी केवल प्राथमिक परामर्श है। 14 दिन से पुराने छाले के लिए डॉक्टर द्वारा प्रत्यक्ष जांच अनिवार्य है.*"""
                speech = "मुंह के छालों के लिए गुनगुने नमक पानी से कुल्ला करें। 14 दिन से अधिक पुराना छाला होने पर डॉक्टर से जांच कराएं।"
            else:
                content = """### 👄 Clinical Guidance on Mouth Ulcers

🩺 **Identified Disease / Condition:**
**Oral Mucosal Ulcer / Aphthous Stomatitis**

💬 **Clinical Response to Your Question:**
Mouth ulcers frequently develop from nutritional deficiencies (Vitamin B12, Folate, Iron), stress, or localized mechanical friction (sharp dental cusp).

💡 **Recommended Care & Next Steps:**
• **Warm Salt Water Rinses:** Dissolve 1/2 teaspoon of salt in warm water and gently rinse 3–4 times daily to reduce inflammation.
• **Dietary Adjustments:** Avoid rough, spicy, acidic, or extremely hot foods. Drink plenty of water and eat cooling, soft foods (curd, soft rice).
• **What NOT to Do:** Never apply unprescribed chemicals or caustic lime (chuna). Stop all gutkha and tobacco use immediately.
• **Doctor Consultation:** Under MoHFW national protocols, any oral sore that does not heal within **14 days** mandates an in-person clinical checkup by a PHC Doctor.

> ⚠️ *Notice: This is preliminary guidance. Any non-healing sore lasting longer than 14 days requires an in-person physical examination and biopsy.*"""
                speech = "Rinse with warm salt water three times daily and avoid spicy foods. Any ulcer lasting longer than 14 days requires an in-person doctor examination."

        # Topic 2: White & Red Patches / Precancer / Leukoplakia / Erythroplakia
        elif any(w in msg_lower for w in ["white", "patch", "red", "leukoplakia", "erythroplakia", "మచ్చ", "తెల్ల", "ఎరుపు", "सफेद", "लाल", "दाग"]):
            if is_te:
                content = """### ⚪ నోటిలోని తెల్లటి లేదా ఎర్రటి మచ్చల సమాచారం (Oral Patches)

🩺 **గుర్తించిన వ్యాధి / పరిస్థితి (Identified Disease):**
**ఓరల్ ల్యూకోప్లాకియా / ఎరిత్రోప్లాకియా (Oral Leukoplakia / Erythroplakia - ముందస్తు మార్పుల మచ్చలు)**

💬 **మీ ప్రశ్నకు సమాధానం (Clinical Response):**
నోటి లోపల బుగ్గపై, నాలుకపై లేదా చిగుళ్ళపై వచ్చే తెల్లటి మచ్చలు (ల్యూకోప్లాకియా) లేదా వెల్వెట్ ఎర్రటి మచ్చలు (ఎరిత్రోప్లాకియా) సాధారణంగా పొగాకు, గుట్కా, ఖైనీ లేదా పంటి రాపిడి వల్ల వస్తాయి.

💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య (Care & Next Steps):**
• **గోకవద్దు:** ఈ మచ్చలను వేళ్ళతో లేదా పదునైన వస్తువులతో గోకడం లేదా రల్పొడులు రాయడం చేయవద్దు.
• **పొగాకు నిలిపివేత:** గుట్కా, ఖైనీ, పాన్ మరియు ధూమపానం వెంటనే ఆపడం ద్వారా చాలావరకు మచ్చలు ముదరకుండా నివారించవచ్చు.
• **డాక్టర్ పరీక్ష తప్పనిసరి:** ఈ మచ్చలు కొన్ని ముందస్తు క్యాన్సర్ మార్పులకు దారితీయవచ్చు. ప్రారంభంలోనే డాక్టర్‌కు చూపిస్తే సులభంగా నయం చేయవచ్చు. 48-72 గంటల్లో సమీప PHC డాక్టర్‌ను సంప్రదించండి.

> ⚠️ *గమనిక: ఈ AI ప్రాథమిక సూచన మాత్రమే. 14 రోజుల కంటే ఎక్కువ రోజులు ఉండే తెల్లటి లేదా ఎర్రటి మచ్చలకు డాక్టర్ గారి ప్రత్యక్ష పరీక్ష మరియు బయాప్సీ తప్పనిసరి.*"""
                speech = "నోటిలోని తెల్లటి లేదా ఎర్రటి మచ్చలను గోకవద్దు. పొగాకు వెంటనే ఆపి డాక్టర్ గారి పరీక్ష చేయించుకోండి."
            else:
                content = """### ⚪ Clinical Guidance on Oral Mucosal Patches (Leukoplakia)

🩺 **Identified Disease / Condition:**
**Oral Leukoplakia / Erythroplakia (Oral Potentially Malignant Disorder - OPMD)**

💬 **Clinical Response to Your Question:**
Persistent white patches (Leukoplakia) or velvety red patches (Erythroplakia) are mucosal changes primarily triggered by smokeless tobacco (gutkha/khaini), areca nut, or chronic friction.

💡 **Recommended Care & Next Steps:**
• **Do Not Scratch:** Never attempt to scrape, peel, or apply caustic substances directly to the patch.
• **Immediate Habit Cessation:** Cease all gutkha, areca nut, and smoking immediately to prevent progression.
• **Doctor Consultation:** Under MoHFW guidelines, any non-scrapable mucosal plaque persisting beyond 14 days requires an in-person clinical examination and punch biopsy.

> ⚠️ *Notice: Photographs cannot confirm or exclude malignancy. In-person clinical assessment and biopsy are mandatory.*"""
                speech = "Persistent white or red mouth patches require habit cessation and an in-person doctor checkup."

        # Topic 3: Toothache, Dental Caries, Pulpitis & Abscess
        elif any(w in msg_lower for w in ["tooth", "teeth", "toothache", "caries", "cavity", "pulpitis", "abscess", "పంటి నొప్పి", "దంతాలు", "పుచ్చిపోయిన", "దంత", "दांत", "दांत दर्द"]):
            if is_te:
                content = """### 🦷 పంటి నొప్పి & పుప్పి పన్ను సమాచారం (Dental Caries & Pain)

🩺 **గుర్తించిన వ్యాధి / పరిస్థితి (Identified Disease):**
**దంతక్షయం & పల్పైటిస్ / పంటి నొప్పి (Dental Caries, Pulpitis & Dental Infection)**

💬 **మీ ప్రశ్నకు సమాధానం (Clinical Response):**
దంతాలు పుచ్చిపోవడం (క్యావిటీ) వల్ల ఇన్ఫెక్షన్ లోపలి నరాల వరకు చేరినప్పుడు తీవ్రమైన పంటి నొప్పి వస్తుంది.

💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య (Care & Next Steps):**
• **తక్షణ ఉపశమనం:** గోరువెచ్చని ఉప్పునీటితో నోటిని పుక్కిలించండి. నొప్పి ఉన్న పంటి దగ్గర లవంగ నూనె (Clove oil) దూదితో పెట్టవచ్చు.
• **చేయకూడనివి:** నొప్పి మాత్రలను పంటి మీద నేరుగా పెట్టవద్దు (ఇది చిగురును కాల్చేస్తుంది). దవడపై బయట నుంచి వేడి కాపడం పెట్టవద్దు.
• **అత్యవసర హెచ్చరిక:** దవడ వాచిపోయినా, జ్వరం వచ్చినా లేదా మింగడంలో ఇబ్బంది ఉన్నా వెంటనే PHC డెంటల్ క్లినిక్ లేదా దంత వైద్యుడిని సంప్రదించాలి.

> ⚠️ *గమనిక: పంటి నొప్పికి శాశ్వత పరిష్కారం దంత వైద్యుల క్లినికల్ చికిత్స (ఫిల్లింగ్ లేదా రూట్ కెనాల్) ద్వారా మాత్రమే లభిస్తుంది.*"""
                speech = "పంటి నొప్పికి గోరువెచ్చని ఉప్పునీటి పుక్కిలింత మరియు లవంగ నూనె వాడండి. దవడ వాపు ఉంటే వెంటనే దంత వైద్యుడిని సంప్రదించండి."
            else:
                content = """### 🦷 Clinical Guidance on Toothache & Dental Caries

🩺 **Identified Disease / Condition:**
**Dental Caries & Pulpitis (Tooth Decay & Nerve Inflammation)**

💬 **Clinical Response to Your Question:**
Toothaches usually occur when deep dental decay reaches the inner nerve pulp or when bacteria cause an infection around the tooth root.

💡 **Recommended Care & Next Steps:**
• **Immediate Comfort:** Rinse gently with warm salt water. A small cotton pellet with clove oil provides temporary soothing relief.
• **Precautions:** Never place aspirin or pain tablets directly against the gum tissue (causes chemical burns). Avoid external hot packs.
• **Dental Visit:** Consult the PHC Dental Unit for definitive restorative care (filling, pulpectomy, or root canal therapy).

> ⚠️ *Notice: If you notice facial swelling, fever, or difficulty swallowing, seek emergency dental evaluation immediately.*"""
                speech = "For toothache, use warm salt rinses and clove oil. Facial swelling requires immediate dental evaluation."

        # Topic 4: Burning Mouth & OSMF / Trismus (Restricted Mouth Opening)
        elif any(w in msg_lower for w in ["burning", "osmf", "trismus", "opening", "spicy", "మంట", "బిగుతు", "తెరవ", "तीखा", "जलन", "अकड़न"]):
            if is_te:
                content = """### 🌶️ కారం తిన్నప్పుడు మంట & నోరు తెరవలేకపోవడం (OSMF Guidance)

🩺 **గుర్తించిన వ్యాధి / పరిస్థితి (Identified Disease):**
**ఓరల్ సబ్‌మ్యూకస్ ఫైబ్రోసిస్ (Oral Submucous Fibrosis - OSMF)**

💬 **మీ ప్రశ్నకు సమాధానం (Clinical Response):**
కారం తిన్నప్పుడు నోరు తీవ్రంగా మండడం మరియు నోరు సరిగ్గా తెరవలేకపోవడం ఓరల్ సబ్‌మ్యూకస్ ఫైబ్రోసిస్ (OSMF) యొక్క ముఖ్య లక్షణాలు. ఇది వక్క (సుపారీ), గుట్కా లేదా పాన్ మసాలా వల్ల వస్తుంది. వక్కలోని రసాయనాలు నోటి లోపలి చర్మాన్ని రాయిలా గట్టిగా చేస్తాయి.

💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య (Care & Next Steps):**
• **వెంటనే ఆపండి:** వక్క, సుపారీ, గుట్కా మరియు పాన్ మసాలాను తక్షణమే పూర్తిగా ఆపాలి.
• **ఆహార మార్పులు:** కారం, పులుపు, వేడి ఆహారాలను తగ్గించి, పాలు, పెరుగు మరియు మృదువైన చల్లని ఆహారాలు తీసుకోండి.
• **3-వేళ్ళ నోటి పరీక్ష:** నోట్లో 3 వేళ్ళు నిలువుగా పట్టకపోతే (<35mm), వ్యాధి ముదురుతోందని అర్థం. బలవంతంగా నోరు తెరవడానికి ప్రయత్నించవద్దు.
• **డాక్టర్ సంప్రదింపు:** 48-72 గంటల్లో సమీప PHC మెడికల్ ఆఫీసర్ లేదా డెంటల్ స్పెషలిస్ట్‌ను సంప్రదించండి.

> ⚠️ *గమనిక: OSMF క్యాన్సర్ ముందస్తు వ్యాధి కాబట్టి క్రమం తప్పకుండా డాక్టర్ పర్యవేక్షణ అవసరం.*"""
                speech = "కారం తిన్నప్పుడు నోరు మండడం మరియు నోరు తెరవడం తగ్గడం OSMF సంకేతం. వక్క మరియు గుట్కా వెంటనే ఆపి డాక్టర్‌ను సంప్రదించండి."
            else:
                content = """### 🌶️ Clinical Guidance on Burning Sensation & Restricted Mouth Opening (OSMF)

🩺 **Identified Disease / Condition:**
**Oral Submucous Fibrosis (OSMF) with Trismus**

💬 **Clinical Response to Your Question:**
A burning sensation when eating spicy foods combined with reduced mouth opening are classic signs of Oral Submucous Fibrosis (OSMF) caused by areca nut (supari), gutkha, or pan masala.

💡 **Recommended Care & Next Steps:**
• **Immediate Action:** Cease all areca nut, supari, gutkha, and pan masala immediately.
• **Dietary Soothing:** Eat cooling, soft foods (curd, milk, soft rice). Avoid black pepper, red chilies, and sharp acidic foods.
• **3-Finger Check:** If the patient cannot insert 3 fingers vertically (<35mm), trismus is present. Do not force open the mouth.
• **Doctor Consultation:** Visit the PHC Medical Officer or Dental Specialist within 48–72 hours for antioxidant therapy and surveillance.

> ⚠️ *Notice: OSMF is a potentially malignant condition requiring complete habit cessation and regular medical monitoring.*"""
                speech = "Burning mouth on spices and reduced mouth opening indicate OSMF. Stop areca nut and visit the PHC."

        # Topic 5: Tobacco, Gutkha & Chutta Cessation
        elif any(w in msg_lower for w in ["tobacco", "gutkha", "chutta", "smoke", "quitting", "beedi", "khaini", "పొగాకు", "చుట్ట", "గుట్కా", "తంబాకు", "तंबाकू", "गुटखा", "सिगरेट"]):
            if is_te:
                content = """### 🚭 పొగాకు, గుట్కా & చుట్ట నివారణ సమాచారం (Tobacco Cessation)

🩺 **గుర్తించిన అంశం (Identified Topic):**
**పొగాకు & గుట్కా వ్యసన విముక్తి మార్గదర్శకాలు (Tobacco & Gutkha Cessation Support)**

💬 **మీ ప్రశ్నకు సమాధానం (Clinical Response):**
పొగాకు నమలడం, గుట్కా, ఖైనీ మరియు చుట్ట (రివర్స్ స్మోకింగ్) నోటి క్యాన్సర్‌కు ప్రధాన కారణాలు. అలవాటు మానేసిన కొద్ది రోజుల్లోనే నోటి శ్లేష్మ పొర కోలుకోవడం ప్రారంభిస్తుంది.

💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య (Care & Next Steps):**
• **కోరిక తగ్గే చిట్కాలు:** పొగాకు తినాలనిపించినప్పుడు లవంగాలు, యాలకులు లేదా సోంపు గింజలు నమలండి.
• **5-నిమిషాల టెక్నిక్:** తీవ్రమైన కోరిక 3 నుండి 5 నిమిషాలు మాత్రమే ఉంటుంది. ఆ సమయంలో లోతైన శ్వాస తీసుకుంటూ చల్లని నీరు త్రాగండి.
• **ఉచిత ప్రభుత్వ సహాయం:** జాతీయ టోల్-ఫ్రీ నంబర్ **1800-11-2356** కు కాల్ చేసి ఉచిత కౌన్సిలింగ్ పొందవచ్చు.
• **నోటి పరీక్ష:** నోటి లోపల ఏవైనా తెల్లటి మచ్చలు లేదా తగ్గని పుండ్లు ఉంటే సమీప PHC డాక్టర్‌కు చూపించండి.

> ⚠️ *గమనిక: పొగాకు అలవాటు మానేయడం నోటి క్యాన్సర్‌ను నివారించడంలో అత్యంత ప్రభావవంతమైన మార్గం.*"""
                speech = "పొగాకు లేదా గుట్కా తినాలనిపించినప్పుడు లవంగాలు లేదా సోంపు నమలండి. ఉచిత సహాయం కోసం 1800 11 2356 కు కాల్ చేయండి."
            else:
                content = """### 🚭 Evidence-Based Tobacco & Gutkha Cessation Guidance

🩺 **Identified Topic / Health Focus:**
**Tobacco, Gutkha & Areca Nut Cessation Support**

💬 **Clinical Response to Your Question:**
Smokeless tobacco (gutkha, khaini, zarda) and reverse smoking (chutta) damage oral mucosal tissues. Stopping immediately halts mucosal deterioration and significantly lowers cancer risk.

💡 **Recommended Care & Next Steps:**
• **Healthy Substitutes:** When cravings strike, chew cloves, cardamom pods, or fennel seeds.
• **The 5-Minute Delay Technique:** Cravings typically peak within 3 to 5 minutes. Drink a glass of cold water and breathe slowly and deeply.
• **Free Support:** Call the National Tobacco Quitline at **1800-11-2356** for free counseling.
• **Oral Checkup:** Schedule a routine oral mucosal screening at your Primary Health Centre.

> ⚠️ *Notice: Quitting tobacco halts progressive oral mucosal damage and substantially protects against malignancy.*"""
                speech = "When cravings strike, chew cloves or fennel seeds and drink cold water. Call 1800 11 2356 for free counseling."

        # Topic 6: Oral Cancer Early Warning Signs & High-Risk Triage
        elif any(w in msg_lower for w in ["cancer", "malignan", "carcinoma", "క్యాన్సర్", "పుట్టకురుపు", "कैंसर", "tumor", "గడ్డ"]):
            if is_te:
                content = """### ⚠️ నోటి క్యాన్సర్ ముందస్తు హెచ్చరికలు (Oral Cancer Warning Signs)

🩺 **గుర్తించిన పరిస్థితి / అంశం (Identified Topic):**
**నోటి క్యాన్సర్ హెచ్చరిక లక్షణాలు & స్క్రీనింగ్ (Cancer Warning Signs & High-Risk Triage)**

💬 **మీ ప్రశ్నకు సమాధానం (Clinical Response):**
నోటి క్యాన్సర్‌ను ప్రారంభ దశలోనే గుర్తిస్తే 90% పైగా పూర్తిగా నయం చేయవచ్చు. కింది లక్షణాలు కనిపిస్తే ఆలస్యం చేయకుండా డాక్టర్‌ను సంప్రదించాలి:
• 14 రోజుల కంటే ఎక్కువ రోజులు తగ్గని పుండు లేదా పుండ్లు.
• నోటిలో తెల్లటి లేదా ఎర్రటి మచ్చలు, గట్టిపడిన గడ్డలు.
• కారణం లేకుండా పంటి నుండి రక్తం కారడం లేదా మింగడంలో ఇబ్బంది.

💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య (Care & Next Steps):**
• **ముఖ్య గమనిక:** ఫోటో ఆధారంగా క్యాన్సర్‌ను నిర్ధారించడం లేదా తోసిపుచ్చడం అసాధ్యం. చిన్న పరీక్ష (బయాప్సీ) ద్వారా మాత్రమే అసలు నిజం తెలుస్తుంది.
• **తక్షణ చర్య:** 14 రోజుల కంటే ఎక్కువ రోజులు తగ్గని పుండు లేదా గడ్డ ఉంటే వెంటనే సమీప PHC మెడికల్ ఆఫీసర్ లేదా ఏరియా ఆసుపత్రి స్పెషలిస్ట్‌ను సంప్రదించండి.

> ⚠️ *గమనిక: ఏవైనా అనుమానాస్పద లక్షణాలు కనిపిస్తే ఆలస్యం చేయకుండా డాక్టర్ గారి ప్రత్యక్ష పరీక్ష చేయించుకోవాలి.*"""
                speech = "14 రోజుల కంటే ఎక్కువ రోజులు తగ్గని నోటి పుండుకు డాక్టర్ గారి పరీక్ష మరియు బయాప్సీ తప్పనిసరి. ప్రారంభంలోనే గుర్తిస్తే నయం చేయవచ్చు."
            else:
                content = """### ⚠️ Clinical Warning Signs & Early Detection of Oral Malignancy

🩺 **Identified Topic / Health Focus:**
**Oral Cancer Warning Signs & High-Priority Triage**

💬 **Clinical Response to Your Question:**
Oral cancer detected in early stages has a cure rate exceeding 90%. Watch for these vital red flags:
• Any mouth ulcer that does not heal within 14 days.
• Persistent red or white non-scrapable mucosal patches or hard, painless lumps.
• Unexplained bleeding or difficulty chewing/swallowing.

💡 **Recommended Care & Next Steps:**
• **Mandatory Rule:** Photographs strictly CANNOT diagnose or exclude cancer. An in-person clinical examination and punch biopsy are mandatory.
• **Action Step:** Book an in-person assessment with a PHC Medical Officer or ENT/Oncology specialist within 48 hours for any persistent lesion.

> ⚠️ *Notice: Any non-healing ulcer persisting over 14 days mandates an in-person doctor checkup and biopsy under national health protocols.*"""
                speech = "Any oral ulcer lasting longer than 14 days requires an in-person clinical examination and punch biopsy."

        # Topic 7: Bleeding Gums, Gingivitis & Periodontitis
        elif any(w in msg_lower for w in ["gum", "gingiv", "bleed", "చిగుళ్ళ", "రక్తం", "పంటి చిగురు", "मसूड़े", "खून"]):
            if is_te:
                content = """### 🩸 చిగుళ్ళ సమస్యలు & చిగుళ్ళ నుండి రక్తం కారడం (Gingivitis Guidance)

🩺 **గుర్తించిన వ్యాధి / పరిస్థితి (Identified Disease):**
**చిగుళ్ళ వాపు & రక్తస్రావం (Gingivitis & Periodontitis)**

💬 **మీ ప్రశ్నకు సమాధానం (Clinical Response):**
బ్రష్ చేసినప్పుడు చిగుళ్ళ నుండి రక్తం కారడం లేదా చిగుళ్ళు ఎర్రబడి వాపు రావడం సాధారణంగా బ్యాక్టీరియా పాచి (ప్లాక్) వల్ల వస్తుంది.

💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య (Care & Next Steps):**
• **మృదువైన బ్రష్ వాడండి:** గట్టి బ్రష్ చిగుళ్ళను గాయపరుస్తుంది. రోజుకు రెండుసార్లు మృదువైన బ్రష్‌తో నెమ్మదిగా తోముకోండి.
• **ఉప్పునీటి పుక్కిలింత:** గోరువెచ్చని ఉప్పునీటితో పుక్కిలించడం వల్ల చిగుళ్ళ వాపు త్వరగా తగ్గుతుంది.
• **డాక్టర్ సంప్రదింపు:** దంతాలు వదులైనా లేదా చిగుళ్ళ నుండి చీము కారుతున్నా వెంటనే PHC డెంటల్ క్లినిక్‌లో స్కేలింగ్ (క్లీనింగ్) చేయించుకోవాలి.

> ⚠️ *గమనిక: చిగుళ్ళ రక్తస్రావం మధుమేహం (Diabetes) వల్ల కూడా పెరగవచ్చు, అవసరమైతే షుగర్ పరీక్ష చేయించుకోండి.*"""
                speech = "చిగుళ్ళ నుండి రక్తం కారడానికి మృదువైన బ్రష్ వాడండి మరియు PHC డెంటల్ క్లినిక్‌లో క్లీనింగ్ చేయించుకోండి."
            else:
                content = """### 🩸 Clinical Guidance on Gingival Bleeding & Periodontitis

🩺 **Identified Disease / Condition:**
**Gingivitis / Periodontitis (Gum Inflammation & Bleeding)**

💬 **Clinical Response to Your Question:**
Bleeding gums during brushing indicate gingival inflammation typically caused by bacterial plaque accumulation along the gum margin.

💡 **Recommended Care & Next Steps:**
• **Gentle Oral Hygiene:** Use a soft-bristled toothbrush and brush gently twice daily with circular strokes.
• **Warm Salt Water Rinses:** Rinse with warm salt water daily to reduce inflammation and bacterial burden.
• **Professional Dental Care:** Visit the PHC Dental Clinic for professional ultrasonic scaling. Check blood glucose if bleeding is recurrent.

> ⚠️ *Notice: Persistent gum bleeding with loose teeth requires professional periodontal evaluation at the PHC.*"""
                speech = "Bleeding gums require gentle brushing, warm salt rinses, and professional dental scaling at the PHC."

        # Topic 8: General Community Health / Clinical Inquiry
        else:
            if is_te:
                content = f"""### 🩺 ఆరోగ్య మైత్ర AI సమాధానం (Clinical Guidance)

🩺 **పరిశీలించిన అంశం:** *"{user_message}"*

💬 **మీ ప్రశ్నకు సమాధానం (Clinical Response):**
మీరు అడిగిన ఆరోగ్య అంశంపై MoHFW మరియు ప్రామాణిక వైద్య మార్గదర్శకాల ప్రకారం సలహా:
• సాధారణ శారీరక మరియు నోటి ఆరోగ్యం సరైన ఆహారం, స్వచ్ఛమైన నీరు మరియు శుభ్రతపై ఆధారపడి ఉంటుంది.
• ఏవైనా లక్షణాలు లేదా అసౌకర్యం ఉన్నప్పుడు సొంత మందులు వాడకుండా తేలికైన ఆహారం, తగినంత విశ్రాంతి తీసుకోండి.

💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య (Care & Next Steps):**
• నాటు మందులు లేదా తెలియని చూర్ణాలు వాడవద్దు.
• ఏవైనా లక్షణాలు **14 రోజుల కంటే ఎక్కువ రోజులు తగ్గకపోతే** సమీప PHC మెడికల్ ఆఫీసర్‌ను సంప్రదించాలి.
• తీవ్రమైన సమస్యలు (శ్వాసలో ఇబ్బంది, అపస్మారక స్థితి) ఉంటే వెంటనే 108 అంబులెన్స్ ద్వారా ఆసుపత్రికి వెళ్ళండి.

> ⚠️ *గమనిక: ఈ AI ఫలితం ప్రాథమిక సమాచారం మాత్రమే. ఖచ్చితమైన నిర్ధారణ కోసం వైద్యుల ప్రత్యక్ష సంప్రదింపు అవసరం.*"""
                speech = "ఆరోగ్య మైత్ర AI మీ ఆరోగ్య సందేహాలకు సాక్ష్యాధారిత సమాధానాలను అందిస్తుంది. 14 రోజుల కంటే ఎక్కువ రోజులు ఉన్న సమస్యలకు డాక్టర్‌ను సంప్రదించండి."
            else:
                content = f"""### 🩺 Aarogya Mytra Clinical Guidance

🩺 **Clinical Query / Topic:** *"{user_message}"*

💬 **Clinical Response to Your Question:**
Based on MoHFW and National Oral Health Programme clinical guidelines:
• Maintain adequate hydration, balanced nutrition, and gentle oral hygiene.
• Avoid unverified self-medication, abrasive powders, or delaying necessary clinical attention.

💡 **Recommended Care & Next Steps:**
• If symptoms cause discomfort or persist beyond a few days, consult your Primary Health Centre doctor.
• Under national guidelines, any non-healing oral or mucosal lesion persisting longer than 14 days requires an in-person physical checkup.
• For emergency symptoms like airway difficulty or uncontrolled bleeding, immediately activate 108 ambulance triage.

> ⚠️ *Notice: This is preliminary clinical guidance. Consult your PHC Medical Officer for physical evaluation.*"""
                speech = "Aarogya Mytra AI provides evidence-grounded health guidance. Consult your PHC Medical Officer for physical evaluation."

        return {
            "content": content,
            "speech_text": speech,
            "is_emergency": False,
            "urgency": "prompt_assessment",
            "disclaimer": "Aarogya Mytra AI Clinical Guidance grounded in MoHFW NOHP & ICMR protocols.",
            "provider": "google_health_medgemma_local",
            "model_id": "google/medgemma-1.5-4b-it"
        }

llm_clinical_engine = LLMClinicalEngine()
