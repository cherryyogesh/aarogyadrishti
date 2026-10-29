import os
import json
import base64
import logging
import subprocess
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("google_health_medgemma_bridge")

class GoogleHealthMedGemmaBridge:
    """
    Bridge connecting Aarogya Mytra AI to the official Google Health MedGemma repository:
    GitHub: https://github.com/Google-Health/medgemma.git
    Submodule path: external/medgemma

    Supports:
    1. Serving container integration (vLLM / Triton / Vertex AI) via vertex_schemata/request.yaml
    2. In-process PyTorch / HuggingFace pipeline from quick_start_with_hugging_face.ipynb
    3. MedGemma thinking trace parsing (<unused94>thought ... <unused95>)
    4. Repo submodule status & health auditing
    """

    REPO_URL = "https://github.com/Google-Health/medgemma.git"
    DEFAULT_MODEL_ID = "google/medgemma-1.5-4b-it"

    def __init__(self, repo_path: Optional[str] = None):
        if repo_path:
            self.repo_path = repo_path
        else:
            # Look relative to project root
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../"))
            self.repo_path = os.path.join(base_dir, "external", "medgemma")

        self._repo_metadata: Optional[Dict[str, Any]] = None

    def get_repo_info(self) -> Dict[str, Any]:
        """
        Inspect the local Google-Health/medgemma repository submodule.
        """
        if self._repo_metadata is not None:
            return self._repo_metadata

        is_present = os.path.exists(self.repo_path) and os.path.isdir(self.repo_path)
        commit_hash = "unknown"
        has_serving = False
        has_notebooks = False

        if is_present:
            # Check commit hash
            try:
                result = subprocess.run(
                    ["git", "-C", self.repo_path, "rev-parse", "HEAD"],
                    capture_output=True,
                    text=True,
                    timeout=3
                )
                if result.returncode == 0:
                    commit_hash = result.stdout.strip()
            except Exception:
                pass

            has_serving = os.path.exists(os.path.join(self.repo_path, "python", "serving"))
            has_notebooks = os.path.exists(os.path.join(self.repo_path, "notebooks"))

        self._repo_metadata = {
            "repository_url": self.REPO_URL,
            "submodule_path": self.repo_path,
            "connected": is_present,
            "commit_hash": commit_hash,
            "features": {
                "serving_framework": has_serving,
                "notebooks": has_notebooks,
                "quick_start_hugging_face": os.path.exists(
                    os.path.join(self.repo_path, "notebooks", "quick_start_with_hugging_face.ipynb")
                ) if is_present else False,
                "vertex_schemata": os.path.exists(
                    os.path.join(self.repo_path, "python", "serving", "vertex_schemata")
                ) if is_present else False,
            },
            "official_variants": [
                "google/medgemma-1.5-4b-it",
                "google/medgemma-4b-it",
                "google/medgemma-27b-it",
                "google/medgemma-27b-text-it"
            ]
        }
        return self._repo_metadata

    def build_medgemma_chat_payload(
        self,
        image_bytes: Optional[bytes],
        body_region: str,
        clinical_context: Dict[str, Any],
        model_id: str = DEFAULT_MODEL_ID,
        enable_thinking: bool = True
    ) -> Dict[str, Any]:
        """
        Builds a request payload conforming to Google-Health/medgemma/python/serving/vertex_schemata/request.yaml
        and the official quick_start_with_hugging_face.ipynb notebook.
        """
        symptoms = clinical_context.get("symptoms", "")
        duration = clinical_context.get("duration_days", "unknown")
        site = clinical_context.get("body_site", body_region)
        pain = clinical_context.get("pain_score", "not specified")
        trismus = clinical_context.get("mouth_opening_mm")

        # Official Google Health role instruction pattern
        role_instruction = (
            "You are Google MedGemma 1.5 4B, an expert clinical AI assistant for healthcare workers. "
            "Analyze the medical image objectively for observable visual features. "
            "STRICT CLINICAL RULES:\n"
            "1. Describe directly observable morphological features (margins, color, elevation, texture, blanching, ulceration).\n"
            "2. Never assert that a lesion is or is not malignant/cancer. A photographic image cannot replace a biopsy.\n"
            "3. State any lighting or quality limitations clearly as uncertain.\n"
            "4. Format the final output as a valid JSON object with keys: "
            "visible_observations (list of strings), "
            "possible_explanations (list of objects with name, reasoning, supporting_observations, limitations), "
            "missing_information (list of strings), "
            "and limitations (list of strings)."
        )

        if enable_thinking:
            system_instruction = f"SYSTEM INSTRUCTION: think silently if needed. {role_instruction}"
        else:
            system_instruction = role_instruction

        prompt = (
            f"Image Category: {body_region}\n"
            f"Anatomical Site: {site}\n"
            f"Reported Symptoms: {symptoms}\n"
            f"Duration: {duration} days\n"
        )
        if trismus is not None:
            prompt += f"Interincisal Opening: {trismus} mm\n"
        if pain != "not specified":
            prompt += f"Pain Score: {pain}/10\n"
        prompt += "Identify observable clinical features and preliminary non-definitive explanations."

        user_content: List[Dict[str, Any]] = [
            {"type": "text", "text": prompt}
        ]

        if image_bytes:
            b64_img = base64.b64encode(image_bytes).decode("utf-8")
            user_content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{b64_img}"
                }
            })

        return {
            "model": model_id,
            "messages": [
                {
                    "role": "system",
                    "content": [{"type": "text", "text": system_instruction}]
                },
                {
                    "role": "user",
                    "content": user_content
                }
            ],
            "temperature": 0.2,
            "max_tokens": 1200,
            "stream": False
        }

    def parse_thinking_trace(self, raw_text: str) -> Tuple[Optional[str], str]:
        """
        Parses Google MedGemma's thinking trace format:
        <unused94>thought\n{thinking_content}<unused95>{final_response}
        as defined in Google-Health/medgemma quick_start_with_hugging_face.ipynb.
        """
        if "<unused95>" in raw_text:
            parts = raw_text.split("<unused95>")
            thought = parts[0].replace("<unused94>thought\n", "").replace("<unused94>", "").strip()
            response = parts[1].strip() if len(parts) > 1 else ""
            return thought, response
        return None, raw_text

    def extract_structured_observations(self, text: str) -> Dict[str, Any]:
        """
        Extracts JSON block or parses markdown bullet points from MedGemma output.
        """
        # 1. Try finding ```json ... ``` block
        cleaned = text.strip()
        if "```json" in cleaned:
            try:
                start = cleaned.find("```json") + 7
                end = cleaned.find("```", start)
                json_str = cleaned[start:end].strip()
                return json.loads(json_str)
            except Exception:
                pass
        elif "```" in cleaned:
            try:
                start = cleaned.find("```") + 3
                end = cleaned.find("```", start)
                json_str = cleaned[start:end].strip()
                return json.loads(json_str)
            except Exception:
                pass

        # 2. Try raw JSON parse
        try:
            return json.loads(cleaned)
        except Exception:
            pass

        # 3. Fallback heuristic parser
        observations: List[str] = []
        for line in cleaned.split("\n"):
            line = line.strip()
            if line.startswith("- ") or line.startswith("* "):
                observations.append(line[2:].strip())

        return {
            "visible_observations": observations if observations else [cleaned[:250]],
            "possible_explanations": [],
            "missing_information": ["Complete clinical in-person palpation details"],
            "limitations": ["Evaluated via photographic input; histology required for confirmation."]
        }
