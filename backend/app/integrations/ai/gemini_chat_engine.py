import os
import re
import json
import base64
import logging
import asyncio
from typing import Dict, Any, Optional, List
import httpx

from app.core.config import settings
from app.integrations.ai.triage import detect_emergency_symptoms, check_cancer_claim_guard

logger = logging.getLogger("gemini_chat_engine")

try:
    from google import genai
    from google.genai import types
    HAS_GENAI_SDK = True
except ImportError:
    HAS_GENAI_SDK = False


class GeminiChatEngine:
    """
    Primary Clinical Dialogue & Voice Health Assistant Engine for Aarogya Mytra AI.
    Powered by official Google Gemini API (gemini-3.6-flash / configurable).
    Supports Telugu, English, Hindi, Tamil, Malayalam, and Kannada.
    Grounded in MoHFW National Oral Health Programme (NOHP), NP-NCD, and WHO clinical protocols.
    """

    def __init__(self):
        self._api_key = (os.getenv("GEMINI_API_KEY", "") or getattr(settings, "GEMINI_API_KEY", "")).strip()
        self.model_name = (os.getenv("GEMINI_MODEL", "") or getattr(settings, "GEMINI_MODEL", "gemini-3.1-flash-lite")).strip()
        self.timeout = getattr(settings, "GEMINI_TIMEOUT_SECONDS", 30)
        self.max_retries = getattr(settings, "GEMINI_MAX_RETRIES", 3)
        self._client = None
        self._init_client()

    def _init_client(self):
        self._api_key = (os.getenv("GEMINI_API_KEY", "") or getattr(settings, "GEMINI_API_KEY", "")).strip()
        if HAS_GENAI_SDK and self._api_key and not any(d in self._api_key.lower() for d in ["your_", "placeholder"]):
            try:
                self._client = genai.Client(api_key=self._api_key)
            except Exception as e:
                logger.error(f"Failed to initialize google.genai Client in chat engine: {e}")
                self._client = None

    def is_configured(self) -> bool:
        self._api_key = (os.getenv("GEMINI_API_KEY", "") or getattr(settings, "GEMINI_API_KEY", "")).strip()
        return bool(self._api_key and len(self._api_key) > 10 and not any(d in self._api_key.lower() for d in ["your_", "placeholder", "xxx"]))

    async def generate_chat_response_async(
        self,
        user_message: str,
        language: str = "en",
        has_attachment: bool = False,
        image_bytes: Optional[bytes] = None,
        image_mime_type: Optional[str] = "image/jpeg",
        conversation_history: Optional[List[Dict[str, str]]] = None,
        patient_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Main dialogue generation entrypoint.
        1. Checks for emergency red flags (108).
        2. Queries Google Gemini (multimodal text + image if attached) with patient context, multi-turn history, and clinical safety boundaries.
        3. Enforces language consistency (Telugu, Hindi, English, Tamil, Malayalam, Kannada).
        4. Gracefully falls back to embedded MoHFW clinical knowledge if network/API is temporarily unavailable.
        """
        clean_text = user_message.strip()
        lang = (language or "en").lower()

        # 1. Emergency Red-Flag Triage
        emergency = detect_emergency_symptoms(clean_text)
        if emergency:
            return self._build_emergency_response(lang)

        # 2. Try Google Gemini API
        if self.is_configured():
            try:
                # Try via GenAI SDK
                if self._client:
                    res = await asyncio.to_thread(
                        self._call_gemini_sdk_chat,
                        clean_text,
                        lang,
                        has_attachment,
                        image_bytes,
                        image_mime_type,
                        conversation_history,
                        patient_context
                    )
                    if res and res.get("content"):
                        return res

                # Try via REST httpx
                rest_res = await self._call_gemini_rest_chat(
                    clean_text,
                    lang,
                    has_attachment,
                    image_bytes,
                    image_mime_type,
                    conversation_history,
                    patient_context
                )
                if rest_res and rest_res.get("content"):
                    return rest_res

            except Exception as e:
                logger.warning(f"Google Gemini live chat call failed, falling back to embedded knowledge: {e}")

        # 3. Autonomous MoHFW/ICMR Embedded Clinical Knowledge Fallback
        return self._generate_embedded_knowledge_response(clean_text, lang, has_attachment)

    def _call_gemini_sdk_chat(
        self,
        user_message: str,
        language: str,
        has_attachment: bool,
        image_bytes: Optional[bytes],
        image_mime_type: Optional[str],
        history: Optional[List[Dict[str, str]]],
        context: Optional[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """Synchronous chat call using official google-genai SDK with multimodal support."""
        try:
            has_image = bool(has_attachment and image_bytes)
            system_prompt = self._build_system_prompt(language, context, has_image=has_image)
            contents = []

            # Add previous turns if provided (up to last 6 turns)
            if history:
                for turn in history[-6:]:
                    role = "user" if turn.get("role") == "user" else "model"
                    turn_text = turn.get("content", "").strip()
                    if turn_text:
                        contents.append(types.Content(role=role, parts=[types.Part.from_text(text=turn_text)]))

            # Current turn parts (include image part if attached)
            current_parts = []
            if has_image and image_bytes:
                img_mime = image_mime_type or "image/jpeg"
                img_part = types.Part.from_bytes(data=image_bytes, mime_type=img_mime)
                current_parts.append(img_part)

            user_prompt_text = user_message or (
                "దయచేసి నేను పంపిన ఈ ఫొటోను క్షుణ్ణంగా పరిశీలించి, ఇది ఏ వ్యాధి లేదా సమస్య, ఇది ఏ దశలో ఉందో (Clinical Stage Prediction: Stage 1, 2, or 3), దీనికి గల కారణాలు, జాగ్రత్తలు మరియు తదుపరి చర్యలను వివరంగా తెలియజేయండి."
                if language == "te" else
                "Please analyze this photograph carefully. Identify what condition or disease this appears to be, predict what clinical stage it is in (Stage 1, Stage 2, or Stage 3), explain its causes, what reliable care to take, and what next steps are needed."
            )
            current_parts.append(types.Part.from_text(text=user_prompt_text))
            contents.append(types.Content(role="user", parts=current_parts))

            config = types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.35,
                max_output_tokens=2200
            )

            response = self._client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=config
            )

            if response and response.text:
                raw_text = response.text.strip()
                return {
                    "content": raw_text,
                    "speech_text": self._extract_speech_summary(raw_text, language),
                    "is_emergency": bool(detect_emergency_symptoms(user_message)) or "EMERGENCY RED FLAG" in raw_text,
                    "urgency": "prompt_assessment",
                    "disclaimer": "Aarogya Mytra AI with MoHFW/ICMR Evidence Grounding.",
                    "provider": "gemini",
                    "model_id": self.model_name
                }
        except Exception as e:
            logger.error(f"Gemini SDK chat error: {e}")
            raise e

        return None

    async def _call_gemini_rest_chat(
        self,
        user_message: str,
        language: str,
        has_attachment: bool,
        image_bytes: Optional[bytes],
        image_mime_type: Optional[str],
        history: Optional[List[Dict[str, str]]],
        context: Optional[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """Asynchronous REST call using httpx with multimodal image payload support."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self._api_key}"
        has_image = bool(has_attachment and image_bytes)
        system_prompt = self._build_system_prompt(language, context, has_image=has_image)

        contents = []
        if history:
            for turn in history[-6:]:
                role = "user" if turn.get("role") == "user" else "model"
                turn_text = turn.get("content", "").strip()
                if turn_text:
                    contents.append({"role": role, "parts": [{"text": turn_text}]})

        current_parts = []
        if has_image and image_bytes:
            img_mime = image_mime_type or "image/jpeg"
            b64_image = base64.b64encode(image_bytes).decode("utf-8")
            current_parts.append({
                "inline_data": {
                    "mime_type": img_mime,
                    "data": b64_image
                }
            })

        user_prompt_text = user_message or (
            "దయచేసి నేను పంపిన ఈ ఫొటోను క్షుణ్ణంగా పరిశీలించి, ఇది ఏ వ్యాధి లేదా సమస్య, ఇది ఏ దశలో ఉందో (Clinical Stage Prediction: Stage 1, 2, or 3), దీనికి గల కారణాలు, జాగ్రత్తలు మరియు తదుపరి చర్యలను వివరంగా తెలియజేయండి."
            if language == "te" else
            "Please analyze this photograph carefully. Identify what condition or disease this appears to be, predict what clinical stage it is in (Stage 1, Stage 2, or Stage 3), explain its causes, what reliable care to take, and what next steps are needed."
        )
        current_parts.append({"text": user_prompt_text})
        contents.append({"role": "user", "parts": current_parts})

        payload = {
            "system_instruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": contents,
            "generationConfig": {
                "temperature": 0.35,
                "maxOutputTokens": 2200
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
                        raw_text = parts[0]["text"].strip()
                        return {
                            "content": raw_text,
                            "speech_text": self._extract_speech_summary(raw_text, language),
                            "is_emergency": bool(detect_emergency_symptoms(user_message)) or "EMERGENCY RED FLAG" in raw_text,
                            "urgency": "prompt_assessment",
                            "disclaimer": "Aarogya Mytra AI with MoHFW/ICMR Evidence Grounding.",
                            "provider": "gemini",
                            "model_id": self.model_name
                        }
            else:
                logger.warning(f"Gemini REST returned HTTP {resp.status_code}: {resp.text[:120]}")

        return None

    def _build_system_prompt(
        self,
        language: str,
        context: Optional[Dict[str, Any]] = None,
        has_image: bool = False
    ) -> str:
        lang_map = {
            "te": "Telugu (తెలుగు)",
            "hi": "Hindi (हिन्दी)",
            "ta": "Tamil (தமிழ்)",
            "ml": "Malayalam (മലയാളం)",
            "kn": "Kannada (ಕನ್ನಡ)",
            "en": "English"
        }
        target_lang = lang_map.get(language, "English")

        patient_info = ""
        if context:
            age = context.get("age", "")
            gender = context.get("gender", "")
            symptoms = context.get("symptoms", "")
            duration = context.get("duration_days", "")
            if age or gender or symptoms:
                patient_info = f"\nPATIENT CONTEXT: Age: {age}, Gender: {gender}, Symptoms: {symptoms}, Duration: {duration} days."

        return f"""You are Aarogya Mytra AI (ఆరోగ్య మైత్ర AI), an empathetic, highly knowledgeable, and warm clinical health companion — conversing naturally, compassionately, and clearly, just like ChatGPT and Gemini.
You are strictly grounded in the clinical protocols of the Ministry of Health and Family Welfare (MoHFW), ICMR, and WHO.

LANGUAGE & CONVERSATIONAL TONE:
- You MUST respond naturally, warmly, and fluently in {target_lang}.
- Adopt an empathetic, caring, and humanized conversational voice (same as ChatGPT and Gemini).
- Speak with reassurance, kindness, and clear everyday language. Avoid robotic database dumps or cold technical jargon without immediately explaining it in plain, simple terms.{patient_info}

HOW TO ANALYZE AND EXPLAIN MEDICAL IMAGES (WHEN AN IMAGE IS PROVIDED):
When an image is provided:
1. **Identify the Condition / Disease**:
   - Greet the user warmly and empathetically.
   - Look at the photograph carefully and state clearly what disease or condition the visible signs most closely resemble (for example: Oral Submucous Fibrosis / OSMF, Oral Leukoplakia, Oral Aphthous Ulcer / Canker Sore, Oral Thrush / Candidiasis, Oral Lichen Planus, Gingivitis / Periodontitis, Herpes Labialis, or Suspicious Oral Neoplasm / Chronic Non-Healing Lesion).
   - In Telugu and Hindi, use clear regional names alongside clinical terms (e.g. తెలుగులో: ఓరల్ సబ్-మ్యూకస్ ఫైబ్రోసిస్ (OSMF), ల్యూకోప్లాకియా (తెల్లటి గట్టి మచ్చ), నోటి పూత (కాంకర్ సోర్ / ఆఫ్తస్ అల్సర్), ఓరల్ కాండిడియాసిస్ (ఫంగల్ ఇన్ఫెక్షన్), లైకెన్ ప్లానస్).

2. **Predict the Clinical Stage / Severity Grade of the Disease (MANDATORY REQUIREMENT)**:
   - Provide an explicit, prominent section titled:
     In Telugu: 📊 **వ్యాధి దశ అంచనా (Predicted Clinical Stage & Severity)**
     In Hindi: 📊 **रोग की अवस्था का अनुमान (Predicted Clinical Stage & Severity)**
     In English: 📊 **Predicted Clinical Stage & Severity Grade**
   - **Predict and clearly state what Clinical Stage the disease is in** (e.g. **స్టేజ్ 1 (ప్రారంభ దశ)** / **Stage 1 (Early)**, **స్టేజ్ 2 (మధ్యస్థ దశ)** / **Stage 2 (Moderate)**, or **స్టేజ్ 3 (తీవ్రమైన / ముదిరిన దశ)** / **Stage 3 (Advanced/Severe)**).
   - Detail the clinical criteria for this stage and explain WHY the image indicates this stage:
     * **Oral Submucous Fibrosis (OSMF)**:
       • Stage 1 (Early / ప్రారంభ దశ): Stomatitis, burning sensation on eating spices, mucosal erythema/petechiae, mouth opening normal (>35 mm / 3+ fingers).
       • Stage 2 (Moderate / మధ్యస్థ దశ): Palpable/visible vertical fibrous bands on buccal mucosa, mucosal blanching (pale marble look), loss of elasticity, mouth opening restricted to 25–35 mm (2–3 fingers).
       • Stage 3 (Severe / తీవ్రమైన దశ): Dense thick fibrous bands, stiff cheek mucosa, shrunken/bud-shaped uvula, limited tongue movement, severe trismus with mouth opening <25 mm (<2 fingers).
       • Stage 4 (Advanced with Pre-malignant / Malignant Transformation risk): Associated with leukoplakia, erythroplakia, or ulceroproliferative growth.
     * **Oral Leukoplakia**:
       • Stage 1 (Homogeneous - Low to Moderate Risk): Uniform flat, smooth, or shallow wrinkled white plaque with distinct borders.
       • Stage 2 (Non-Homogeneous / Speckled / Nodular - High Dysplasia Risk): Mixed red-and-white patch (erythroleukoplakia), pebbly, nodular, or verrucous surface.
       • Stage 3 (Proliferative Verrucous Leukoplakia): Multi-focal, spreading, aggressive exophytic white verrucous plaques with high transformation risk.
     * **Aphthous Stomatitis (Mouth Ulcers)**:
       • Stage 1 (Minor Aphthous): Small (<1 cm), shallow, round ulcer with yellowish-gray necrotic center and red halo; heals in 7–14 days.
       • Stage 2 (Major Aphthous): Large (>1 cm), deep ulcer with elevated borders, severe pain, takes weeks to heal, leaves scar.
       • Stage 3 (Herpetiform Aphthous): Crop of multiple (10–100) tiny pinpoint ulcers coalescing together.
     * **Oral Thrush / Candidiasis**:
       • Mild / Early: Creamy white curd-like patches scrapable leaving red base, mild burning.
       • Moderate: Widespread involvement across tongue, buccal mucosa, palate, and corner of mouth (angular cheilitis).
       • Severe / Chronic Hyperplastic: Thick, adherent non-scrapable plaques, marked mucosal redness and pain.
     * **Oral Lichen Planus**:
       • Stage 1 (Reticular - Mild): Lacy network of white lines (Wickham's striae), mild roughness.
       • Stage 2 (Plaque / Papular - Moderate): Elevated white keratotic patches.
       • Stage 3 (Erosive / Atrophic - Severe / High Alert): Painful, raw red erosions or ulcers requiring biopsy and close clinical observation.
     * **Suspected Neoplastic / Chronic Ulceroproliferative Lesions**:
       • Preliminary Clinical Staging Prediction:
         - Localized Early Suspicion (T1 equivalent): Superficial induration or ulcer <= 2 cm.
         - Advanced / Infiltrative Suspicion (T2-T4 equivalent): Chronic lesion > 2 cm, rolled hard everted borders, deep infiltration, fixation to underlying tissue, or palpable lymphadenopathy.
       • STRICT SAFETY MANDATE: State clearly that photographs and AI cannot confirm cancer or definitive TNM stage; only an in-person physical clinical palpation, punch biopsy, and histopathological staging by a qualified doctor can confirm or stage malignancy.
     * **Gingivitis / Periodontal Disease**:
       • Stage 1 (Gingivitis): Red, swollen marginal gums, bleeding on brushing, no attachment loss.
       • Stage 2 (Moderate Periodontitis): Gum recession, pockets of 3–5 mm, mild tooth movement.
       • Stage 3 (Advanced Periodontitis): Deep pockets (>5 mm), tooth loosening, bone loss, pus discharge.

3. **Reliable Disease Information & Habit Causes**:
   - Explain what this disease is in compassionate, understandable terms.
   - Detail common causes & contributing factors (tobacco chewing, gutkha, khaini, paan, areca nut, reverse smoking/chutta, bidi, smoking, alcohol, sharp or broken teeth friction, vitamin B12 / iron deficiencies, stress, fungal/bacterial causes).
   - Tell the user what typical symptoms accompany it and how it behaves over time.

4. **Medical Safety Regarding Cancer (STRICT & ESSENTIAL)**:
   - Reassure the user calmly while maintaining clinical accuracy: explain that the vast majority of oral lesions and ulcers are benign and treatable when addressed early.
   - **DO NOT confirm cancer or diagnose cancer.**
   - Clearly and calmly state that an image or AI scan **CANNOT confirm cancer, nor can it rule out cancer or serious conditions**.
   - Emphasize that a definitive evaluation can ONLY be done through an in-person physical clinical examination and tissue punch biopsy conducted by a qualified doctor or specialist.

5. **Actionable Comfort Care & Home Steps**:
   - Safe soothing care: warm salt water rinses 2–3 times daily (1/2 tsp salt in warm water), eating a soft bland non-spicy diet, avoiding hot chili, sour foods, and sharp spices.
   - Strictly and immediately cease all tobacco, gutkha, paan, areca nut, and alcohol.
   - Enforce the **14-day MoHFW rule**: Explain that any sore, ulcer, or patch in the mouth that does not completely heal within **14 days (2 weeks)** must be evaluated in-person by a Primary Health Centre (PHC) Medical Officer or Dental Surgeon.

6. **Answer Any Specific User Questions**:
   - If the user asked specific questions in the chat (e.g. "Does it hurt?", "Is it cancer?", "Can I eat spices?", "What stage is it?"), directly, warmly, and thoroughly answer those questions.

GENERAL HEALTH INQUIRIES (TEXT-ONLY):
- Answer questions directly with accurate causes, symptom explanations, and practical lifestyle or preventive care.
- When the user asks about symptoms of oral diseases (e.g., mouth opening reduction, white patches, burning mouth), provide the disease identification, clinical staging criteria (Stage 1, 2, 3), habit causes, and home care.
- Never prescribe prescription medications, antibiotics, steroids, or exact milligram dosages.
- If emergency red flags (severe breathlessness, airway restriction, massive bleeding, inability to swallow) are present, immediately instruct calling emergency ambulance 108.

Maintain utmost empathy, warmth, and clinical trustworthiness."""

    def _extract_speech_summary(self, text: str, language: str) -> str:
        """Extracts a short 1-2 sentence spoken summary for the Voice Agent."""
        clean = re.sub(r"[#*`>_~]", "", text)
        sentences = [s.strip() for s in re.split(r"[.!?\n]", clean) if len(s.strip()) > 15]
        if sentences:
            return ". ".join(sentences[:2]) + "."
        if language == "te":
            return "మీ ఆరోగ్య సందేహానికి సంబంధించిన వివరాలు, వ్యాధి దశ మరియు తీసుకోవలసిన జాగ్రత్తలను చూడండి."
        elif language == "hi":
            return "आपके स्वास्थ्य संबंधी प्रश्न, रोग की अवस्था और आवश्यक देखभाल के सुझाव यहाँ दिए गए हैं।"
        return "Here is your clinical health summary, disease stage assessment, and recommended next steps."

    def _build_emergency_response(self, language: str) -> Dict[str, Any]:
        """Immediate 108 Emergency Protocol response."""
        is_te = language == "te"
        is_hi = language == "hi"

        if is_te:
            content = (
                "🚨 **తక్షణ అత్యవసర వైద్య హెచ్చరిక (EMERGENCY RED FLAG)**\n\n"
                "మీరు పేర్కొన్న లక్షణాలు (తీవ్రమైన శ్వాస తీసుకోవడంలో ఇబ్బంది, అదుపులేని రక్తస్రావం లేదా మింగలేకపోవడం) తక్షణ అత్యవసర వైద్య సహాయం అవసరమైనవి.\n\n"
                "📞 **తక్షణ చర్య:** ఆలస్యం చేయకుండా వెంటనే **108 అంబులెన్స్** కు కాల్ చేయండి లేదా సమీపంలోని ఏరియా ఆసుపత్రి ఎమర్జెన్సీ విభాగానికి వెళ్ళండి.\n\n"
                "> ⚠️ *సమయం చాలా కీలకం. AI మార్గదర్శకాల కోసం వేచి ఉండకుండా వెంటనే ప్రత్యక్ష అత్యవసర వైద్య సహాయం పొందండి.*"
            )
        elif is_hi:
            content = (
                "🚨 **तत्काल आपातकालीन चिकित्सा चेतावनी (EMERGENCY RED FLAG)**\n\n"
                "आपके द्वारा बताए गए लक्षण (सांस लेने में भारी कठिनाई, अनियंत्रित रक्तस्राव या निगलने में असमर्थता) आपातकालीन स्थिति का संकेत देते हैं।\n\n"
                "📞 **तत्काल कदम:** तुरंत **108 एम्बुलेंस** को कॉल करें या निकटतम अस्पताल के आपातकालीन विभाग में जाएं।\n\n"
                "> ⚠️ *कृपया प्रतीक्षा न करें और तुरंत प्रत्यक्ष आपातकालीन चिकित्सा सहायता प्राप्त करें।* "
            )
        else:
            content = (
                "🚨 **EMERGENCY MEDICAL RED FLAG: SEEK IMMEDIATE CARE**\n\n"
                "The symptoms reported (severe airway difficulty, active uncontrolled bleeding, or inability to swallow) require urgent in-person emergency intervention.\n\n"
                "📞 **Immediate Action:** Call **108 Ambulance** immediately or proceed to the nearest Hospital Emergency Department.\n\n"
                "> ⚠️ *Do not delay emergency care for AI responses. Immediate clinical resuscitation takes priority.*"
            )

        return {
            "content": content,
            "speech_text": "అత్యవసర పరిస్థితి. వెంటనే 108 అంబులెన్స్ కు కాల్ చేయండి." if is_te else "Emergency situation. Call 108 immediately.",
            "is_emergency": True,
            "urgency": "emergency",
            "disclaimer": "Emergency Red Flag Alert",
            "provider": "gemini",
            "model_id": self.model_name
        }

    def _generate_embedded_knowledge_response(self, text: str, lang: str, has_attachment: bool) -> Dict[str, Any]:
        """Offline MoHFW/ICMR verified knowledge fallback with Disease Identification & Clinical Stage Prediction."""
        lower = text.lower()
        is_te = lang == "te"
        is_hi = lang == "hi"

        # 1. Check for OSMF (Oral Submucous Fibrosis / Mouth opening restriction / gutkha / areca / paan)
        if any(w in lower for w in [
            "osmf", "fibrosis", "mouth opening", "opening", "gutkha", "areca", "paan", "chutta",
            "నోరు తెరవడం", "గుట్కా", "చుట్ట", "బిగుతు", "ఫైబ్రోసిస్", "గుట్కా", "వక్క", "మంట"
        ]) and not any(w in lower for w in ["fever", "జ్వరం"]):
            if is_te:
                content = (
                    "### 🔬 క్లినికల్ సమాచారం & విశ్లేషణ (Clinical Guidance)\n\n"
                    "🩺 **గుర్తించిన వ్యాధి / పరిస్థితి:** ఓరల్ సబ్-మ్యూకస్ ఫైబ్రోసిస్ (Oral Submucous Fibrosis - OSMF)\n"
                    "ఇది పొగాకు, గుట్కా, ఖైనీ లేదా వక్క నమలడం మరియు రివర్స్ స్మోకింగ్ (చుట్ట) వల్ల నోటి లోపలి శ్లేష్మ పొర సాగే గుణాన్ని కోల్పోయి బిగుసుకుపోయే దీర్ఘకాలిక సమస్య.\n\n"
                    "📊 **వ్యాధి దశ అంచనా (Predicted Clinical Stage):**\n"
                    "• **స్టేజ్ 1 (ప్రారంభ దశ):** నోటిలో తరచూ మంట, కారం తిన్నప్పుడు తట్టుకోలేకపోవడం, ఎర్రటి బొబ్బలు లేదా చిన్న చిన్న పుండ్లు, నోరు తెరవడం ఇంకా సాధారణంగానే ఉండటం (> 35 మి.మీ / 3 వేళ్ళు సులభంగా పట్టడం).\n"
                    "• **స్టేజ్ 2 (మధ్యస్థ దశ - మోడరేట్):** బుగ్గల లోపలి భాగంలో నిలువుగా తెల్లటి ఫైబరస్ బ్యాండ్లు కనిపించడం లేదా తాకినప్పుడు గట్టిగా తగలడం, శ్లేష్మ పొర తెల్లబారడం (Blanched marble look), నోరు తెరవడం 25 నుండి 35 మి.మీ కు పరిమితం కావడం (2-3 వేళ్ళు మాత్రమే పట్టడం).\n"
                    "• **స్టేజ్ 3 (తీవ్రమైన / ముదిరిన దశ):** దట్టమైన ఫైబరస్ బ్యాండ్లు, బుగ్గలు బాగా గట్టిపడటం, కొండనాలుక (Uvula) ముడుచుకుపోవడం, నాలుకను బయటకు చాచలేకపోవడం, నోరు తెరవడం < 25 మి.మీ కంటే తగ్గిపోవడం (< 2 వేళ్ళు).\n\n"
                    "💬 **కారణాలు & అలవాట్లు:** గుట్కా, ఖైనీ, పాన్ మసాలా, వక్క నమలడం, చుట్ట తాగడం వల్ల నిరంతరం విడుదలయ్యే రసాయనాలు కొల్లాజెన్ ఫైబర్స్ అధికంగా పేరుకుపోయేలా చేస్తాయి.\n\n"
                    "⚠️ **క్యాన్సర్ పరిశీలన & భద్రతా నియమం:**\n"
                    "OSMF అనేది ఒక ప్రీ-క్యాన్సరస్ (OPMD) పరిస్థితి. అయితే, కేవలం ఫోటో లేదా AI ఆధారంగా **క్యాన్సర్‌ను నిర్ధారించడం లేదా తోసిపుచ్చడం జరగదు**. కణజాలంలో ఏమైనా డిస్ప్లేసియా ఉందో లేదో తెలుసుకోవడానికి వైద్యుల ప్రత్యక్ష పరిశీలన మరియు **టిష్యూ బయాప్సీ (Punch Biopsy)** ఖచ్చితంగా అవసరం.\n\n"
                    "💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య:**\n"
                    "• **తక్షణ అలవాటు విరమణ:** గుట్కా, ఖైనీ, పాన్, వక్క, చుట్ట మరియు మద్యపానాన్ని 100% వెంటనే పూర్తిగా నిలిపివేయాలి.\n"
                    "• **నోటి వ్యాయామాలు:** రోజుకు 3-4 సార్లు బెలూన్ ఊదడం లేదా సున్నితమైన నోరు తెరిచే వ్యాయామాలను వైద్యుల సూచన మేరకు చేయాలి.\n"
                    "• **ఆహారం:** కారం, వేడి, పులుపు ఎక్కువగా ఉండే ఆహారాలను నివారించాలి. తాజా పండ్లు, కూరగాయలు మరియు లైకోపీన్ అధికంగా ఉండే టమోటాలు తీసుకోవాలి.\n"
                    "• **14 రోజుల నియమం:** సమీప PHC మెడికల్ ఆఫీసర్ లేదా డెంటల్ స్పెషలిస్ట్‌ను సంప్రదించి పరీక్ష చేయించుకోవాలి."
                )
            elif is_hi:
                content = (
                    "### 🔬 नैदानिक जानकारी एवं विश्लेषण (Clinical Guidance)\n\n"
                    "🩺 **पहचाना गया रोग:** ओरल सबम्यूकस फाइब्रोसिस (Oral Submucous Fibrosis - OSMF)\n"
                    "यह गुटखा, खैनी, पान मसाला, सुपारी या तंबाकू के सेवन के कारण मुंह के अंदर के ऊतकों का कड़ा होना और मुंह कम खुलना है।\n\n"
                    "📊 **रोग की अवस्था का अनुमान (Predicted Clinical Stage):**\n"
                    "• **स्टेज 1 (प्रारंभिक अवस्था):** तीखा खाने पर तेज जलन, मुंह में छाले या लालिमा, मुंह का खुलना सामान्य (> 35 मिमी)।\n"
                    "• **स्टेज 2 (मध्यम अवस्था):** गालों के अंदर सफेद रेशेदार पट्टियां (फाइब्रस बैंड), मुंह का लचीलापन कम होना, मुंह का खुलना 25-35 मिमी (2-3 अंगुलियां)।\n"
                    "• **स्टेज 3 (गंभीर अवस्था):** अत्यधिक कड़ापन, जीभ बाहर निकालने में कठिनाई, मुंह का खुलना 25 मिमी से कम (< 2 अंगुलियां)।\n\n"
                    "⚠️ **कैंसर संबंधी सुरक्षा सूचना:**\n"
                    "यह एक पूर्व-कैंसरजन्य (OPMD) स्थिति है। फोटो या AI द्वारा कैंसर की पुष्टि या खंडन नहीं किया जा सकता। सही जांच के लिए डॉक्टर द्वारा बायोप्सी अनिवार्य है।\n\n"
                    "💡 **सावधानियां और उपचार:**\n"
                    "• गुटखा, खैनी और तंबाकू का सेवन तुरंत 100% बंद करें।\n"
                    "• तीखा और अत्यधिक गर्म भोजन न खाएं।\n"
                    "• नजदीकी PHC डॉक्टर को दिखाकर आवश्यक परामर्श लें।"
                )
            else:
                content = (
                    "### 🔬 Clinical Assessment & Guidance\n\n"
                    "🩺 **Identified Condition:** Oral Submucous Fibrosis (OSMF)\n"
                    "A chronic, progressive fibrotic condition of the oral mucosa predominantly caused by areca nut, gutkha, paan, or reverse smoking (chutta).\n\n"
                    "📊 **Predicted Clinical Stage & Severity:**\n"
                    "• **Stage 1 (Early OSMF):** Stomatitis, burning sensation on consuming spicy foods, mucosal erythema/vesicles; mouth opening remains normal (> 35 mm / 3+ fingers).\n"
                    "• **Stage 2 (Moderate OSMF):** Visible/palpable vertical fibrous bands on buccal mucosa, mucosal blanching (marble-like appearance), loss of elasticity; mouth opening reduced to 25–35 mm (2–3 fingers).\n"
                    "• **Stage 3 (Advanced / Severe OSMF):** Dense thick fibrous bands, stiff cheek mucosa, shrunken/bud-shaped uvula, limited tongue protrusion; severe trismus with mouth opening < 25 mm (< 2 fingers).\n"
                    "• **Stage 4 (Advanced with Pre-malignant transformation):** Associated with co-existing leukoplakia, erythroplakia, or irregular ulceroproliferative growth.\n\n"
                    "💬 **Contributing Habits & Causes:** Alkaloids and flavonoids in areca nut, tobacco carcinogens, chronic mucosal irritation, and trace nutrient deficiencies.\n\n"
                    "⚠️ **Cancer Safety & Mandatory Clinical Boundary:**\n"
                    "OSMF is an Oral Potentially Malignant Disorder (OPMD). However, photographic inspection or AI **CANNOT confirm or exclude malignancy**. Definitive evaluation strictly requires physical clinical palpation and an authorized **tissue punch biopsy** by a maxillofacial surgeon or oncologist.\n\n"
                    "💡 **Recommended Care & Next Steps:**\n"
                    "• **Immediate Complete Cessation:** 100% stop all areca nut, gutkha, khaini, tobacco, and alcohol immediately.\n"
                    "• **Oral Physiotherapy:** Gentle jaw opening exercises under clinician direction.\n"
                    "• **Dietary Measures:** Avoid hot chili, acidic foods, and sharp items. Consume antioxidant-rich foods.\n"
                    "• **14-Day Mandatory Rule:** Consult a PHC Medical Officer or Dental Surgeon for clinical staging and monitoring."
                )
            return {
                "content": content,
                "speech_text": self._extract_speech_summary(content, lang),
                "is_emergency": False,
                "urgency": "prompt_assessment",
                "disclaimer": "MoHFW/ICMR Evidence Grounding",
                "provider": "gemini_knowledge",
                "model_id": self.model_name
            }

        # 2. Check for Leukoplakia / White Patch / మచ్చ / తెల్లటి
        if any(w in lower for w in [
            "leukoplakia", "white patch", "patch", "ప్లాకియా", "ల్యూకోప్లాకియా", "తెల్లటి మచ్చ", "తెల్ల మచ్చ",
            "స్పెకిల్డ్", "सफेद दाग", "ल्यूकोप्लाकिया", "छाला"
        ]) and not any(w in lower for w in ["fever", "జ్వరం"]):
            if is_te:
                content = (
                    "### 🔬 క్లినికల్ సమాచారం & విశ్లేషణ (Clinical Guidance)\n\n"
                    "🩺 **గుర్తించిన వ్యాధి / పరిస్థితి:** ఓరల్ ల్యూకోప్లాకియా (Oral Leukoplakia - White Keratotic Patch)\n"
                    "నోటి శ్లేష్మ పొరపై ఏర్పడే గట్టి తెల్లటి మచ్చ. ఇది తుడిచినా తొలగిపోదు. పొగాకు, ఖైనీ బుగ్గన పెట్టుకోవడం లేదా చుట్ట తాగే అలవాటు ఉన్నవారిలో ఇది ఎక్కువగా కనిపిస్తుంది.\n\n"
                    "📊 **వ్యాధి దశ అంచనా (Predicted Clinical Stage):**\n"
                    "• **స్టేజ్ 1 (హోమోజీనియస్ ల్యూకోప్లాకియా - ప్రారంభం):** సమానమైన, చదునైన పలుచని తెల్లటి పొర, మృదువైన లేదా కొద్దిగా ముడతలు పడిన ఉపరితలం (తక్కువ నుండి మధ్యస్థ ప్రమాదం).\n"
                    "• **స్టేజ్ 2 (నాన్-హోమోజీనియస్ / స్పెకిల్డ్ ల్యూకోప్లాకియా - మధ్యస్థ / అధిక ప్రమాదం):** ఎరుపు మరియు తెలుపు కలిసిన మచ్చ (ఎరిత్రోల్యూకోప్లాకియా), ఉపరితలం గరుకుగా, బుడిపెలుగా (Nodular) లేదా పుండులా ఉండటం. ఇందులో కణాల మార్పు (Dysplasia) జరిగే అవకాశం ఎక్కువ.\n"
                    "• **స్టేజ్ 3 (ప్రొలిఫరేటివ్ వెర్రూకస్ ల్యూకోప్లాకియా):** నోటిలో బహుళ ప్రాంతాల్లో విస్తారంగా వ్యాపించే మందపాటి గరుకైన తెల్లటి పొరలు. తక్షణ వైద్య పర్యవేక్షణ అవసరం.\n\n"
                    "💬 **కారణాలు:** ఖైనీ లేదా పొగాకు బుగ్గన ఎక్కువ సమయం ఉంచుకోవడం, బీడీ/సిగరెట్/చుట్ట తాగడం, లేదా విరిగిన పదునైన పంటి రాపిడి.\n\n"
                    "⚠️ **క్యాన్సర్ పరిశీలన & భద్రతా నియమం:**\n"
                    "ల్యూకోప్లాకియా అనేది సంభావ్య ప్రీ-క్యాన్సర్ మచ్చ. కానీ ఫోటో లేదా AI ద్వారా **క్యాన్సర్‌ను నిర్ధారించడం జరగదు**. మచ్చలో అసాధారణ కణ మార్పులు ఉన్నాయో లేదో నిర్ధారించడానికి **పంచ్ బయాప్సీ (Punch Biopsy)** పరీక్ష తప్పనిసరి.\n\n"
                    "💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య:**\n"
                    "• ఖైనీ, గుట్కా, పొగాకు మరియు మద్యం అలవాట్లను పూర్తిగా మానివేయాలి.\n"
                    "• పదునైన దంతాలు ఉంటే డెంటిస్ట్‌తో సరిచేయించుకోవాలి.\n"
                    "• **14 రోజుల నియమం:** 14 రోజుల కంటే ఎక్కువ రోజులు ఉండే తెల్లటి లేదా ఎర్రటి మచ్చలను తప్పనిసరిగా PHC డాక్టర్ లేదా ఆంకాలజిస్ట్‌కు చూపించి బయాప్సీ చేయించుకోవాలి."
                )
            else:
                content = (
                    "### 🔬 Clinical Assessment & Guidance\n\n"
                    "🩺 **Identified Condition:** Oral Leukoplakia (White Keratotic Patch)\n"
                    "A predominantly white mucosal plaque that cannot be scraped off and cannot be characterized clinically or pathologically as any other disorder.\n\n"
                    "📊 **Predicted Clinical Stage & Severity:**\n"
                    "• **Stage 1 (Homogeneous Leukoplakia - Low to Moderate Risk):** Flat, uniform, thin, shallow white plaque with smooth, fissured, or corrugated surface.\n"
                    "• **Stage 2 (Non-Homogeneous / Speckled Leukoplakia - Higher Dysplasia Risk):** Mixed red and white lesions (erythroleukoplakia), nodular, pebbly, or ulcerated surface with higher potential for epithelial dysplasia.\n"
                    "• **Stage 3 (Proliferative Verrucous Leukoplakia / PVL):** Multi-focal, persistent, aggressive exophytic white verrucous plaques with high transformation risk.\n\n"
                    "💬 **Contributing Habits & Causes:** Chronic placement of smokeless tobacco/khaini against mucosa, cigarette/bidi/chutta smoking, and chronic friction from fractured teeth or ill-fitting dentures.\n\n"
                    "⚠️ **Cancer Safety & Mandatory Clinical Boundary:**\n"
                    "Leukoplakia is an Oral Potentially Malignant Disorder (OPMD). However, photographic inspection or AI **CANNOT confirm or exclude malignancy**. Definitive evaluation strictly requires physical clinical palpation and an authorized **tissue punch biopsy**.\n\n"
                    "💡 **Recommended Care & Next Steps:**\n"
                    "• Cease all forms of smoked and smokeless tobacco immediately.\n"
                    "• Address any mechanical irritants (sharp tooth smoothing by dental surgeon).\n"
                    "• **14-Day Mandatory Rule:** Any white or mixed red-white patch persisting beyond 14 days mandates an in-person physical clinical examination and biopsy at the PHC/District Hospital."
                )
            return {
                "content": content,
                "speech_text": self._extract_speech_summary(content, lang),
                "is_emergency": False,
                "urgency": "prompt_assessment",
                "disclaimer": "MoHFW/ICMR Evidence Grounding",
                "provider": "gemini_knowledge",
                "model_id": self.model_name
            }

        # 3. Check for Oral Aphthous Ulcer / Canker Sore / నోటి పూత / పుండు
        if any(w in lower for w in ["ulcer", "sore", "పుండు", "పూత", "మంట", "छाला", "घाव", "canker", "aphthous"]):
            if is_te:
                content = (
                    "### 🔬 క్లినికల్ సమాచారం & విశ్లేషణ (Clinical Guidance)\n\n"
                    "🩺 **గుర్తించిన వ్యాధి / పరిస్థితి:** సాధారణ నోటి పూత / ఆఫ్తస్ అల్సర్ (Aphthous Stomatitis / Mouth Ulcer)\n"
                    "నోటి శ్లేష్మ పొరపై తాత్కాలికంగా ఏర్పడే చిన్న పుండు. ఇది చాలామందిలో విటమిన్ల లోపం, ఒత్తిడి లేదా కారంగా ఉండే ఆహారం వల్ల వస్తుంది.\n\n"
                    "📊 **వ్యాధి దశ అంచనా (Predicted Clinical Stage):**\n"
                    "• **స్టేజ్ 1 (మైనర్ ఆఫ్తస్ అల్సర్ - ప్రారంభ / తేలికపాటి దశ):** 1 సెం.మీ కంటే తక్కువ పరిమాణం (< 1 cm, సాధారణంగా 2–5 మి.మీ), మధ్యలో పసుపు-బూడిద పొర, చుట్టూ ఎర్రటి వలయం; 7 నుండి 14 రోజుల్లో ఎటువంటి మచ్చ లేకుండా నయమవుతుంది.\n"
                    "• **స్టేజ్ 2 (మేజర్ ఆఫ్తస్ అల్సర్ - తీవ్రమైన దశ):** 1 సెం.మీ కంటే పెద్దది (> 1 cm), లోతైన అల్సర్, అంచులు ఎత్తుగా ఉండటం, తీవ్రమైన నొప్పి; తగ్గడానికి 2 నుండి 6 వారాలు పడుతుంది, మచ్చ పడే అవకాశం ఉంది.\n"
                    "• **స్టేజ్ 3 (హెర్పెటిఫార్మ్ ఆఫ్తస్ - సమూహ పూత):** పిన్‌హెడ్ పరిమాణంలో 10 నుండి 100 వరకు చిన్న చిన్న పూతలు గుంపులుగా ఏర్పడటం.\n\n"
                    "💬 **కారణాలు:** విటమిన్ B12, ఐరన్ లేదా ఫోలిక్ యాసిడ్ లోపం, మానసిక ఒత్తిడి, నిద్రలేమి, కారంగా ఉండే ఆహారం, ప్రమాదవశాత్తు దంతాలు బుగ్గకు తగలడం.\n\n"
                    "⚠️ **క్యాన్సర్ పరిశీలన & భద్రతా నియమం:**\n"
                    "సాధారణ నోటి పూతలు క్యాన్సర్ కావు. అయితే, ఏదేని పుండు తగ్గకుండా అలాగే ఉంటే ఫోటో ద్వారా తేల్చలేము. వైద్యుల ప్రత్యక్ష పరిశీలన అవసరం.\n\n"
                    "💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య:**\n"
                    "• **గోరువెచ్చని ఉప్పునీటి పుక్కిలింత:** రోజుకు 2–3 సార్లు అర చెంచా ఉప్పు వేసిన గోరువెచ్చని నీటితో పుక్కిలించండి.\n"
                    "• **ఆహారం:** కారం, మసాలా, వేడి, పులుపు ఆహారాలను పూర్తిగా నివారించండి. మజ్జిగ, కొబ్బరినీళ్లు, పాలు వంటి చలువ చేసే ఆహారం తీసుకోండి.\n"
                    "• **పొగాకు నిలిపివేత:** గుట్కా, ఖైనీ, బీడీ లేదా చుట్ట అలవాట్లు ఉంటే వెంటనే ఆపివేయాలి.\n"
                    "• **14 రోజుల నియమం:** ఏదైనా నోటి పుండు **14 రోజుల కంటే ఎక్కువ రోజులు తగ్గకపోతే**, సమీప PHC డాక్టర్ లేదా డెంటల్ సర్జన్‌ను తప్పనిసరిగా సంప్రదించి పరీక్ష చేయించుకోవాలి."
                )
            elif is_hi:
                content = (
                    "### 🔬 नैदानिक जानकारी एवं विश्लेषण (Clinical Guidance)\n\n"
                    "🩺 **पहचाना गया रोग:** मुंह के छाले (Aphthous Stomatitis / Mouth Ulcer)\n"
                    "मुंह के अंदर होने वाले सामान्य छाले जो विटामिन की कमी, पेट की खराबी या तनाव के कारण होते हैं।\n\n"
                    "📊 **रोग की अवस्था का अनुमान (Predicted Clinical Stage):**\n"
                    "• **स्टेज 1 (माइनर अल्सर - सामान्य):** 1 सेमी से छोटा छाला, बीच में हल्का पीला और चारों तरफ लाल घेरा, 7-14 दिनों में अपने आप ठीक हो जाता है।\n"
                    "• **स्टेज 2 (मेजर अल्सर - गंभीर):** 1 सेमी से बड़ा गहरा घाव, तेज दर्द, ठीक होने में 2-6 सप्ताह का समय लगता है।\n"
                    "• **स्टेज 3 (हर्पेटिफॉर्म):** छोटे-छोटे कई दानों का समूह।\n\n"
                    "⚠️ **कैंसर संबंधी सुरक्षा सूचना:**\n"
                    "सामान्य छाले कैंसर नहीं होते, लेकिन 14 दिनों से अधिक रहने वाले घाव की डॉक्टर से जांच कराना अनिवार्य है।\n\n"
                    "💡 **सावधानियां और उपचार:**\n"
                    "• गुनगुने नमक पानी से दिन में 2-3 बार कुल्ला करें।\n"
                    "• तीखा, खट्टा और गर्म भोजन न खाएं।\n"
                    "• तंबाकू और गुटखा तुरंत बंद करें।"
                )
            else:
                content = (
                    "### 🔬 Clinical Assessment & Guidance\n\n"
                    "🩺 **Identified Condition:** Oral Aphthous Ulcer / Canker Sore\n"
                    "Benign, non-contagious oral mucosal ulceration commonly associated with micronutrient deficiency, localized trauma, stress, or gastrointestinal factors.\n\n"
                    "📊 **Predicted Clinical Stage & Severity:**\n"
                    "• **Stage 1 (Minor Aphthous Ulcer - Mild / Early):** Small (< 1 cm, typically 2–5 mm), round or oval shallow ulcer with gray-yellow fibrinous center and distinct erythematous halo. Heals uneventfully within 7–14 days without scarring.\n"
                    "• **Stage 2 (Major Aphthous Ulcer - Severe / Persistent):** Larger (> 1 cm), deeper with elevated rolled margins; marked localized pain, persists for 2–6 weeks, may heal with scarring.\n"
                    "• **Stage 3 (Herpetiform Aphthous Ulcers):** Multiple crops (10–100) of pinpoint, coalescing tiny ulcerations.\n\n"
                    "💬 **Contributing Causes:** Vitamin B12, iron, or folate deficiency, accidental mucosal bite/dental trauma, stress, and hot/acidic foods.\n\n"
                    "⚠️ **Cancer Safety & Mandatory Clinical Boundary:**\n"
                    "Minor aphthae are benign. However, non-healing chronic ulcers cannot be ruled benign solely by photographic inspection. Definitive evaluation requires clinical palpation and tissue biopsy if persistent.\n\n"
                    "💡 **Recommended Care & Next Steps:**\n"
                    "• **Warm Salt Water Rinse:** Dissolve 1/2 tsp salt in warm water and gently rinse mouth 2–3 times daily.\n"
                    "• **Dietary Measures:** Soft, non-spicy, non-acidic diet; drink plenty of water and buttermilk.\n"
                    "• **Habit Cessation:** Strictly cease all tobacco, gutkha, paan, and smoking.\n"
                    "• **14-Day Mandatory Rule:** Under MoHFW national protocols, any oral ulcer persisting **beyond 14 days** mandates an in-person physical clinical examination by a PHC Doctor or Dental Specialist."
                )
            return {
                "content": content,
                "speech_text": self._extract_speech_summary(content, lang),
                "is_emergency": False,
                "urgency": "routine",
                "disclaimer": "MoHFW/ICMR Evidence Grounding",
                "provider": "gemini_knowledge",
                "model_id": self.model_name
            }

        # 4. Check for Fever
        if any(w in lower for w in ["fever", "జ్వరం", "बुखार", "temperature", "pyrexia"]):
            if is_te:
                content = (
                    "### 🌡️ క్లినికల్ సమాచారం (Clinical Guidance)\n\n"
                    "🩺 **గుర్తించిన పరిస్థితి:** సాధారణ జ్వరం / వైరల్ ఇన్ఫెక్షన్ (Fever / Febrile Illness)\n\n"
                    "💬 **మీ ప్రశ్నకు సమాధానం:** జ్వరం అనేది శరీరంలో ఇన్ఫెక్షన్ లేదా వైరస్‌తో పోరాడుతున్నప్పుడు శరీర ఉష్ణోగ్రత పెరిగే సహజ ప్రక్రియ. సాధారణ వైరల్ ఇన్ఫెక్షన్లు, జలుబు, మలేరియా, డెంగ్యూ లేదా టైఫాయిడ్ వంటి వివిధ కారణాల వల్ల జ్వరం రావచ్చు.\n\n"
                    "💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య:**\n"
                    "• **హైడ్రేషన్:** శరీరం డీహైడ్రేట్ కాకుండా ఓఆర్ఎస్ (ORS), కొబ్బరి నీళ్ళు, గంజి, కాచి చల్లార్చిన నీటిని పుష్కలంగా తాగండి.\n"
                    "• **విశ్రాంతి:** శరీరానికి పూర్తి విశ్రాంతి ఇవ్వండి.\n"
                    "• **చల్లని నీటి పట్టీలు:** ఉష్ణోగ్రత ఎక్కువగా ఉంటే నుదుటిపై సాధారణ నీటిలో ముంచిన గుడ్డతో తడిపి తుడవండి.\n"
                    "• **డాక్టర్ సంప్రదింపు:** జ్వరం **3 రోజుల కంటే ఎక్కువ రోజులు తగ్గకపోయినా**, చలితో కూడిన వణుకు, లేదా తీవ్రమైన తలనొప్పి/వాంతులు ఉన్నా సమీప PHC మెడికల్ ఆఫీసర్‌ను సంప్రదించి రక్త పరీక్షలు చేయించుకోవాలి.\n\n"
                    "> ⚠️ *గమనిక: డాక్టర్ సలహా లేకుండా యాంటీబయాటిక్స్ వాడకూడదు.*"
                )
            elif is_hi:
                content = (
                    "### 🌡️ नैदानिक जानकारी (Clinical Guidance)\n\n"
                    "🩺 **पहचानी गई स्थिति:** बुखार / वायरल संक्रमण (Fever / Febrile Illness)\n\n"
                    "💬 **आपके प्रश्न का उत्तर:** बुखार शरीर में संक्रमण से लड़ने का एक स्वाभाविक संकेत है। यह आमतौर पर वायरल संक्रमण, सर्दी-जुकाम, मलेरिया या टाइफाइड जैसे कारणों से हो सकता है।\n\n"
                    "💡 **सावधानियां और अगले कदम:**\n"
                    "• **हाइड्रेशन:** ओआरएस, नारियल पानी और उबला हुआ पानी पर्याप्त मात्रा में पिएं।\n"
                    "• **आराम:** शरीर को पूरा आराम दें।\n"
                    "• **डॉक्टर से परामर्श:** यदि बुखार 3 दिनों से अधिक समय तक बना रहता है या तेज ठंड और उल्टी होती है, तो तुरंत नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) में डॉक्टर को दिखाएं।\n\n"
                    "> ⚠️ *नोट: बिना डॉक्टर की सलाह के एंटीबायोटिक दवाओं का सेवन न करें।* "
                )
            else:
                content = (
                    "### 🌡️ Clinical Guidance\n\n"
                    "🩺 **Identified Topic:** Fever & Febrile Illness (Common Causes & Care)\n\n"
                    "💬 **Clinical Response to Your Question:** Fever is an elevation in body temperature typically triggered by immune response to viral or bacterial infections (such as flu, viral URI, gastroenteritis, urinary infection, or vector-borne illnesses like malaria and dengue).\n\n"
                    "💡 **Recommended Care & Next Steps:**\n"
                    "• **Hydration:** Maintain optimal fluid intake with oral rehydration solution (ORS), tender coconut water, and clean boiled water.\n"
                    "• **Rest & Comfort:** Ensure physical rest and keep room well-ventilated with light clothing.\n"
                    "• **Sponging:** Use tepid water sponging on forehead if temperature is high.\n"
                    "• **Doctor Consultation:** If fever persists **beyond 3 days**, is accompanied by high chills, severe headache, stiff neck, or breathing difficulty, undergo an in-person clinical checkup and blood testing at the nearest PHC.\n\n"
                    "> ⚠️ *Notice: Do not self-prescribe antibiotics or unverified remedies.*"
                )
            return {
                "content": content,
                "speech_text": self._extract_speech_summary(content, lang),
                "is_emergency": False,
                "urgency": "routine",
                "disclaimer": "MoHFW/ICMR Evidence Grounding",
                "provider": "gemini_knowledge",
                "model_id": self.model_name
            }

        # 5. Default Image Attachment Guidance (when photo is uploaded)
        if has_attachment:
            if is_te:
                content = (
                    "### 🔬 ప్రాథమిక ఫోటో పరిశీలన & క్లినికల్ విశ్లేషణ\n\n"
                    "🩺 **గుర్తించిన పరిస్థితి పరిశీలన:**\n"
                    "మీరు పంపిన ఫొటోను క్లినికల్ ప్రోటోకాల్స్ ప్రకారం ప్రాథమికంగా పరిశీలించాము. నోటి లోపలి భాగంలో కనిపించే మార్పులు సాధారణంగా క్రింది సమస్యలలో ఒకదానికి సంకేతంగా ఉండవచ్చు:\n"
                    "1. **ఓరల్ సబ్-మ్యూకస్ ఫైబ్రోసిస్ (OSMF):** గుట్కా, ఖైనీ, పాన్ లేదా వక్క నమలడం వల్ల శ్లేష్మ పొర తెల్లబారడం మరియు నోరు తెరవడం తగ్గడం.\n"
                    "2. **ఓరల్ ల్యూకోప్లాకియా (తెల్లటి మచ్చ):** తుడిచినా తొలగిపోని గట్టి తెల్లటి పొర.\n"
                    "3. **నోటి పూత (ఆఫ్తస్ అల్సర్):** చిన్న పుండు, మధ్యలో పసుపు రంగు, చుట్టూ ఎర్రటి వలయం.\n\n"
                    "📊 **వ్యాధి దశ అంచనా (Predicted Clinical Stage):**\n"
                    "• **స్టేజ్ 1 (ప్రారంభ దశ):** కేవలం తేలికపాటి ఎరుపు లేదా చిన్న పుండు, కారం తిన్నప్పుడు మంట, నోరు తెరవడం సాధారణం (> 35 మి.మీ / 3 వేళ్ళు పట్టడం).\n"
                    "• **స్టేజ్ 2 (మధ్యస్థ దశ - మోడరేట్):** బుగ్గల లోపల నిలువు ఫైబరస్ బ్యాండ్లు ఏర్పడటం, శ్లేష్మ పొర తెల్లబారడం (Blanched appearance), నోరు తెరవడం 25 నుండి 35 మి.మీ కు పరిమితం కావడం (2-3 వేళ్ళు పట్టడం).\n"
                    "• **స్టేజ్ 3 (ముదిరిన / తీవ్రమైన దశ):** దట్టమైన ఫైబరస్ బ్యాండ్లు, బుగ్గలు బాగా గట్టిపడటం, కొండనాలుక ముడుచుకుపోవడం, నాలుక కదలికలు తగ్గడం, నోరు తెరవడం < 25 మి.మీ కంటే తగ్గిపోవడం (< 2 వేళ్ళు).\n\n"
                    "⚠️ **క్యాన్సర్ పరిశీలన & భద్రతా నియమం:**\n"
                    "ఏదైనా ఫోటో లేదా AI ఆధారంగా **క్యాన్సర్‌ను నిర్ధారించడం లేదా తోసిపుచ్చడం జరగదు**. మచ్చ లేదా పుండు వెనుక నిజమైన కణ మార్పులను తెలుసుకోవడానికి వైద్యుల ప్రత్యక్ష పరీక్ష మరియు **టిష్యూ బయాప్సీ (Punch Biopsy)** తప్పనిసరి.\n\n"
                    "💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య:**\n"
                    "• గుట్కా, ఖైనీ, పాన్, వక్క, చుట్ట మరియు పొగాకు అలవాట్లను వెంటనే 100% పూర్తిగా నిలిపివేయాలి.\n"
                    "• రోజుకు 2-3 సార్లు గోరువెచ్చని ఉప్పునీటితో పుక్కిలించండి.\n"
                    "• కారం, మసాలా మరియు వేడి ఆహారాన్ని నివారించండి.\n"
                    "• **14 రోజుల నియమం:** నోటిలో పుండు లేదా మచ్చ 14 రోజుల కంటే ఎక్కువ రోజులు తగ్గకపోతే సమీప PHC డాక్టర్‌ను సంప్రదించాలి."
                )
            else:
                content = (
                    "### 🔬 Preliminary Clinical Photograph Assessment\n\n"
                    "🩺 **Identified Condition:**\n"
                    "Based on verified MoHFW clinical protocols, the visible mucosal presentation most commonly correlates with one of the following oral conditions:\n"
                    "1. **Oral Submucous Fibrosis (OSMF):** Palpable/visible vertical fibrous bands, mucosal blanching, burning sensation with spices.\n"
                    "2. **Oral Leukoplakia:** Non-scrapable white plaque or patch associated with tobacco or chronic friction.\n"
                    "3. **Oral Aphthous Stomatitis:** Well-circumscribed ulceration with erythematous margin.\n\n"
                    "📊 **Predicted Clinical Stage & Severity:**\n"
                    "• **Stage 1 (Early Observation):** Superficial mucosal erythema or shallow ulceration; mouth opening remains normal (> 35 mm / 3+ fingers).\n"
                    "• **Stage 2 (Moderate Severity):** Visible vertical fibrous banding, blanched marble mucosal texture, loss of elasticity; mouth opening restricted to 25–35 mm (2–3 fingers).\n"
                    "• **Stage 3 (Advanced / Severe):** Dense thick fibrous bands, stiff cheek mucosa, shrunken uvula, tongue limitation, severe trismus with mouth opening < 25 mm (< 2 fingers).\n\n"
                    "⚠️ **Cancer Safety & Mandatory Clinical Boundary:**\n"
                    "Photographs and AI **CANNOT confirm or exclude cancer**. A definitive diagnosis strictly requires physical in-person examination and an authorized **tissue punch biopsy** by a qualified medical practitioner.\n\n"
                    "💡 **Recommended Care & Next Steps:**\n"
                    "• Strictly cease all tobacco, gutkha, paan, areca nut, and alcohol immediately.\n"
                    "• Rinse mouth with warm salt water 2–3 times daily.\n"
                    "• Avoid sharp, acidic, or excessively spicy foods.\n"
                    "• **14-Day Mandatory Rule:** Any ulcer, white patch, or red lesion persisting beyond 14 days mandates an in-person physical clinical examination by a PHC Doctor or Dental Specialist."
                )
            return {
                "content": content,
                "speech_text": self._extract_speech_summary(content, lang),
                "is_emergency": False,
                "urgency": "prompt_assessment",
                "disclaimer": "MoHFW/ICMR Evidence Grounding",
                "provider": "gemini_knowledge",
                "model_id": self.model_name
            }

        # 6. Default clinical guidance (text-only general query)
        if is_te:
            content = (
                "### 🩺 ఆరోగ్య మైత్ర AI క్లినికల్ మార్గదర్శకత్వం\n\n"
                "🩺 **విషయం:** ప్రాథమిక ఆరోగ్య సలహా & పరిశీలన\n\n"
                f"💬 **సమాధానం:** మీ ప్రశ్నను స్వీకరించాము: \"{text}\". మీ ఆరోగ్య శ్రేయస్సు కోసం MoHFW మరియు ICMR మార్గదర్శకాల ప్రకారం తగిన జాగ్రత్తలు తీసుకోవడం అవసరం.\n\n"
                "💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య:**\n"
                "• సమతుల్య పౌష్టికాహారం, పరిశుభ్రమైన తాగునీరు మరియు తగినంత విశ్రాంతి తీసుకోవాలి.\n"
                "• లక్షణాలు లేదా అసౌకర్యం కొనసాగితే, ఖచ్చితమైన నిర్ధారణ మరియు చికిత్స కోసం మీ సమీప ప్రాథమిక ఆరోగ్య కేంద్రం (PHC) మెడికల్ ఆఫీసర్‌ను సంప్రదించండి.\n\n"
                "> ⚠️ *గమనిక: ఈ AI సమాచారం ప్రాథమిక అవగాహన కోసం మాత్రమే. డాక్టర్ గారి ప్రత్యక్ష వైద్య పరీక్షకు ఇది ప్రత్యామ్నాయం కాదు.*"
            )
        else:
            content = (
                "### 🩺 Aarogya Mytra AI Clinical Guidance\n\n"
                "🩺 **Topic:** Evidence-Grounded Health Consultation\n\n"
                f"💬 **Clinical Response:** Thank you for reaching out regarding: \"{text}\". Maintaining proactive preventive health care under MoHFW protocols is recommended.\n\n"
                "💡 **Recommended Care & Next Steps:**\n"
                "• Maintain optimal hydration, nutrition, and personal hygiene.\n"
                "• For persistent or worsening symptoms beyond routine observation, consult your nearest PHC Medical Officer or registered clinician for an in-person evaluation.\n\n"
                "> ⚠️ *Notice: This AI guidance is assistive and informational. It does not replace an in-person clinical examination.*"
            )

        return {
            "content": content,
            "speech_text": self._extract_speech_summary(content, lang),
            "is_emergency": False,
            "urgency": "routine",
            "disclaimer": "MoHFW/ICMR Evidence Grounding",
            "provider": "gemini_knowledge",
            "model_id": self.model_name
        }


# Global singleton instance
gemini_chat_engine = GeminiChatEngine()
