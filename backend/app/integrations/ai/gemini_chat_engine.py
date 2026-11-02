import os
import re
import json
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
        conversation_history: Optional[List[Dict[str, str]]] = None,
        patient_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Main dialogue generation entrypoint.
        1. Checks for emergency red flags (108).
        2. Queries Google Gemini with patient context, multi-turn history, and clinical safety boundaries.
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
        history: Optional[List[Dict[str, str]]],
        context: Optional[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """Synchronous chat call using official google-genai SDK."""
        try:
            system_prompt = self._build_system_prompt(language, context)
            contents = []

            # Add previous turns if provided (up to last 6 turns)
            if history:
                for turn in history[-6:]:
                    role = "user" if turn.get("role") == "user" else "model"
                    turn_text = turn.get("content", "").strip()
                    if turn_text:
                        contents.append(types.Content(role=role, parts=[types.Part.from_text(text=turn_text)]))

            # Current turn
            contents.append(types.Content(role="user", parts=[types.Part.from_text(text=user_message)]))

            config = types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.3,
                max_output_tokens=1800
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
        history: Optional[List[Dict[str, str]]],
        context: Optional[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """Asynchronous REST call using httpx."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self._api_key}"
        system_prompt = self._build_system_prompt(language, context)

        contents = []
        if history:
            for turn in history[-6:]:
                role = "user" if turn.get("role") == "user" else "model"
                turn_text = turn.get("content", "").strip()
                if turn_text:
                    contents.append({"role": role, "parts": [{"text": turn_text}]})

        contents.append({"role": "user", "parts": [{"text": user_message}]})

        payload = {
            "system_instruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": contents,
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 1800
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

    def _build_system_prompt(self, language: str, context: Optional[Dict[str, Any]] = None) -> str:
        lang_map = {
            "te": "Telugu (తెలుగు)",
            "hi": "Hindi (हिन्दी)",
            "ta": "Tamil (தமிழ்)",
            "ml": "Malayalam (മലയാളം)",
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

        return f"""You are Aarogya Mytra AI (ఆరోగ్య మైత్ర AI), an evidence-grounded clinical health intelligence assistant supporting Community Health Workers (ASHAs), patients, and Primary Health Centre (PHC) staff.
You are strictly grounded in the guidelines of the Ministry of Health and Family Welfare (MoHFW), ICMR, and WHO.

LANGUAGE REQUIREMENT:
You MUST respond entirely and naturally in {target_lang}. Use clear, polite, and rural-accessible terms. Avoid needlessly dense academic jargon without an immediate plain-language explanation.{patient_info}

STRICT RESPONSE STRUCTURE:
Structure your response into these clean sections:

🩺 **గుర్తించిన పరిస్థితి / విషయం (Clinical Topic / Condition)**:
State clearly and directly what health condition, symptom, or topic the inquiry relates to (e.g., Oral Aphthous Ulcer, Oral Submucous Fibrosis, Viral Fever, Dental Caries, Dietary Guidance).

💬 **మీ ప్రశ్నకు సమాధానం (Clinical Response)**:
Directly, clearly, and compassionately answer what the user asked in the chat. Explain cause, prevention, and symptoms.

💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య (Care & Next Steps)**:
- Practical home care and comfort steps (warm salt water rinses for oral sores, hydration, soft non-irritating diet, strictly avoid caustic lime/chuna, cease tobacco/gutkha/alcohol).
- Clear doctor visit timeline: Under MoHFW national clinical protocols, ANY sore, ulcer, or patch persisting beyond 14 days mandates an in-person physical checkup by a PHC Medical Officer or Dental Specialist.

MANDATORY MEDICAL SAFETY GUARDRAILS:
1. NEVER confirm or exclude cancer from text chat or photo alone. A physical biopsy and specialist examination are legally and clinically mandatory.
2. DO NOT prescribe prescription medications, antibiotics, steroids, or exact milligram dosages. Recommend safe non-pharmacological care and doctor consultation.
3. If red flag emergency symptoms (severe difficulty breathing, airway compromise, uncontrolled bleeding, inability to swallow) are reported, immediately instruct calling emergency ambulance 108.
4. Maintain utmost respect, empathy, and professional healthcare standards."""

    def _extract_speech_summary(self, text: str, language: str) -> str:
        """Extracts a short 1-2 sentence spoken summary for the Voice Agent."""
        clean = re.sub(r"[#*`>_~]", "", text)
        sentences = [s.strip() for s in re.split(r"[.!?\n]", clean) if len(s.strip()) > 15]
        if sentences:
            return ". ".join(sentences[:2]) + "."
        if language == "te":
            return "మీ ఆరోగ్య సందేహానికి సంబంధించిన వివరాలు మరియు తీసుకోవలసిన జాగ్రత్తలను చూడండి."
        elif language == "hi":
            return "आपके स्वास्थ्य संबंधी प्रश्न के लिए आवश्यक जानकारी और देखभाल के सुझाव यहाँ दिए गए हैं।"
        return "Here is your clinical health summary and recommended next steps."

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
        """Offline MoHFW/ICMR verified knowledge fallback for common rural conditions."""
        lower = text.lower()
        is_te = lang == "te"
        is_hi = lang == "hi"

        # Check for Fever
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

        # Check for Mouth Ulcers / Aphthous Stomatitis
        if any(w in lower for w in ["ulcer", "sore", "పుండు", "పూత", "మంట", "छाला", "घाव"]):
            if is_te:
                content = (
                    "### 🔬 క్లినికల్ సమాచారం (Clinical Guidance)\n\n"
                    "🩺 **గుర్తించిన పరిస్థితి:** సాధారణ నోటి పూత / శ్లేష్మ పుండు (Aphthous Stomatitis / Oral Ulcer)\n\n"
                    "💬 **మీ ప్రశ్నకు సమాధానం:** నోటి పూత అనేది విటమిన్ లోపం (B-కాంప్లెక్స్), శరీరంలో వేడి, ఒత్తిడి, కారంగా ఉండే ఆహారం లేదా ప్రమాదవశాత్తూ దంతాలు తగలడం వల్ల వస్తుంది.\n\n"
                    "💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య:**\n"
                    "• **గోరువెచ్చని ఉప్పునీటి పుక్కిలింత:** రోజుకు 2-3 సార్లు అర చెంచా ఉప్పు వేసిన గోరువెచ్చని నీటితో పుక్కిలించండి.\n"
                    "• **ఆహారం:** కారం, మసాలా, వేడి మరియు ఆమ్ల గుణం ఉన్న ఆహారాలను పూర్తిగా నివారించండి. మజ్జిగ, పాలు వంటివి తీసుకోండి.\n"
                    "• **పొగాకు నిలిపివేత:** గుట్కా, ఖైనీ, బీడీ లేదా చుట్ట అలవాట్లు ఉంటే వెంటనే ఆపివేయాలి.\n"
                    "• **14 రోజుల నియమం:** ఏదైనా నోటి పుండు **14 రోజుల కంటే ఎక్కువ రోజులు తగ్గకపోతే**, సమీప PHC డాక్టర్ లేదా డెంటల్ సర్జన్‌ను తప్పనిసరిగా సంప్రదించాలి.\n\n"
                    "> ⚠️ *గమనిక: ప్రాథమిక పరిశీలన మాత్రమే. ఫోటో లేదా చాట్ ద్వారా క్యాన్సర్‌ను నిర్ధారించడం లేదా తోసిపుచ్చడం జరగదు.*"
                )
            elif is_hi:
                content = (
                    "### 🔬 नैदानिक जानकारी (Clinical Guidance)\n\n"
                    "🩺 **पहचानी गई स्थिति:** मुंह के छाले (Aphthous Stomatitis / Mouth Ulcers)\n\n"
                    "💬 **आपके प्रश्न का उत्तर:** मुंह के छाले आमतौर पर विटामिन की कमी (विटामिन B12/आयरन), पेट की गर्मी, तनाव या तीखा खाने के कारण होते हैं।\n\n"
                    "💡 **सावधानियां और अगले कदम:**\n"
                    "• **गुनगुने नमक पानी से कुल्ला:** दिन में 2-3 बार गुनगुने पानी में आधा चम्मच नमक डालकर धीरे-धीरे कुल्ला करें।\n"
                    "• **खान-पान:** तीखा, मसालेदार और बहुत गर्म भोजन न लें।\n"
                    "• **तंबाकू निषेध:** गुटखा, खैनी और बीड़ी का सेवन तुरंत बंद करें।\n"
                    "• **14-दिन का नियम:** यदि कोई छाला **14 दिनों से अधिक** समय तक ठीक नहीं होता है, तो प्राथमिक स्वास्थ्य केंद्र (PHC) के डॉक्टर को दिखाना अनिवार्य है।\n\n"
                    "> ⚠️ *नोट: यह केवल प्रारंभिक सलाह है। सटीक जांच के लिए डॉक्टर से व्यक्तिगत परामर्श लें।* "
                )
            else:
                content = (
                    "### 🔬 Clinical Guidance\n\n"
                    "🩺 **Identified Condition:** Oral Aphthous Ulcer / Mucosal Stomatitis\n\n"
                    "💬 **Clinical Response to Your Question:** Minor mouth ulcers are commonly associated with local tissue trauma, nutritional deficiencies (Vitamin B12, Iron, Folate), stress, or gastrointestinal upset.\n\n"
                    "💡 **Recommended Care & Next Steps:**\n"
                    "• **Warm Salt Water Rinse:** Dissolve 1/2 tsp salt in warm water and rinse gently 2–3 times daily.\n"
                    "• **Dietary Measures:** Avoid rough, sharp, acidic, or excessively spicy foods.\n"
                    "• **Habit Cessation:** Strictly cease all tobacco, gutkha, areca nut, and smoking.\n"
                    "• **14-Day Mandatory Evaluation:** Under MoHFW national protocols, any oral ulcer persisting **beyond 14 days** mandates an in-person physical examination by a PHC Doctor or Dental Specialist.\n\n"
                    "> ⚠️ *Notice: Preliminary clinical guidance only. Cannot rule in or rule out malignancy without clinical biopsy.*"
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

        # Default clinical guidance
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
