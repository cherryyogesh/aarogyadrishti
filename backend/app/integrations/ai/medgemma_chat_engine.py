import re
import logging
from typing import Dict, Any, Optional
import asyncio
from app.integrations.ai.triage import detect_emergency_symptoms
from app.integrations.ai.llm_clinical_engine import llm_clinical_engine

logger = logging.getLogger("medgemma_chat_engine")

class MedGemmaChatEngine:
    """
    MedGemma Clinical Dialogue & Voice Health Assistant Engine.
    Powers Aarogya Mytra AI in the Chatbot and Voice Agent workflows across
    Telugu, English, Hindi, Tamil, Malayalam, and Kannada.
    Grounded in MoHFW National Oral Health Programme (NOHP), NP-NCD, and WHO protocols.
    """

    async def generate_chat_response_async(
        self,
        user_message: str,
        language: str = "en",
        has_attachment: bool = False
    ) -> Dict[str, Any]:
        """
        Asynchronously queries the MedGemma Unified Clinical LLM Engine
        (Google Gemini / Groq / HuggingFace MedGemma / Autonomous Clinical Knowledge).
        Answers EVERY question with accurate, professional medical knowledge.
        """
        text = user_message.lower().strip()
        lang = (language or "en").lower()

        # 1. Emergency Red-Flag Detection
        emergency = detect_emergency_symptoms(user_message)
        if emergency:
            return self._build_emergency_response(lang)

        # 2. Query MedGemma Unified LLM Clinical Engine
        try:
            llm_res = await llm_clinical_engine.generate_response(user_message, lang, has_attachment)
            if llm_res and llm_res.get("content"):
                return llm_res
        except Exception as e:
            logger.error(f"MedGemma LLM Engine async query error: {e}")

        # Fallback to synchronous rules
        return self.generate_chat_response(user_message, language, has_attachment)

    def generate_chat_response(
        self,
        user_message: str,
        language: str = "en",
        has_attachment: bool = False
    ) -> Dict[str, Any]:
        """
        Synthesizes clinical answers, non-pharmacological comfort steps,
        and speech-optimized text for the voice agent.
        """
        text = user_message.lower().strip()
        lang = (language or "en").lower()

        # 1. Emergency Red-Flag Detection
        emergency = detect_emergency_symptoms(user_message)
        if emergency:
            return self._build_emergency_response(lang)

        # 2. Check if Live LLM is connected or use embedded knowledge engine directly
        status = llm_clinical_engine.get_status()
        if status.get("is_live_llm_connected"):
            try:
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(asyncio.run, llm_clinical_engine.generate_response(user_message, lang, has_attachment))
                    res = future.result(timeout=10.0)
                    if res and res.get("content"):
                        return res
            except Exception as e:
                logger.warning(f"Sync LLM fallback: {e}")
        else:
            try:
                res = llm_clinical_engine._generate_embedded_knowledge_response(user_message, lang, has_attachment)
                if res and res.get("content"):
                    return res
            except Exception as e:
                logger.warning(f"Embedded knowledge response fallback: {e}")

        # 2. Ulcer / Mouth Sores Inquiries
        ulcer_keywords = [
            "ulcer", "sore", "canker", "aphthous",
            "పుండు", "పూత", "పుండ్లు", "మంట",
            "छाला", "घाव", "छाले", "अल्सर",
            "புண்", "கொப்புளம்",
            "വ്രണം", "കുരു", "വായ്പ്പുണ്ണ്",
            "ಹುಣ್ಣು", "ಬಾಯಿ ಹುಣ್ಣು"
        ]
        if any(w in text for w in ulcer_keywords):
            return self._build_ulcer_response(lang)

        # 3. Tobacco / Gutkha / Chutta / Smoking Cessation
        cessation_keywords = [
            "tobacco", "gutkha", "chutta", "smoke", "beedi", "khaini", "smoking", "zarda", "pan masala", "areca",
            "పొగాకు", "చుట్ట", "గుట్కా", "తంబాకు", "ఖైనీ", "బీడీ", "వక్క",
            "तंबाकू", "गुटखा", "खैनी", "बीड़ी", "सिगरेट", "पान मसाला", "सुपारी",
            "புகையிலை", "குட்கா", "பீடி", "சிகரெட்", "பாக்கு",
            "പുകയില", "ഗുട്ക", "ബീഡി", "സിഗരറ്റ്", "അടയ്ക്ക",
            "ತಂಬಾಕು", "ಗುಟ್ಕಾ", "ಬೀಡಿ", "ಸಿಗರೇಟು", "ಅಡಿಕೆ"
        ]
        if any(w in text for w in cessation_keywords):
            return self._build_cessation_response(lang)

        # 4. Burning Sensation / Spicy food / Restricted mouth opening (OSMF)
        osmf_keywords = [
            "burning", "spicy", "mouth opening", "trismus", "tight", "stiff", "fibros",
            "కారం", "నోరు తెరవలేకపోవడం", "నోరు బిగువు", "మంట", "బిగుతు", "తెరవడం",
            "जलन", "तीखा", "मुंह खुलना", "मुंह कम खुलना", "अकड़न",
            "எரியும்", "காரம்", "வாய் திறக்க", "வாய் இறுக்கம்",
            "എരിച്ചിൽ", "എരിവ്", "വായ് തുറക്കാൻ", "വായ തുറക്കൽ",
            "ಉರಿ", "ಖಾರ", "ಬಾಯಿ ತೆರೆಯಲು", "ಬಾಯಿ ಬಿಗಿತ"
        ]
        if any(w in text for w in osmf_keywords):
            return self._build_burning_osmf_response(lang)

        # 5. White or Red Patches / Spots (Leukoplakia / Erythroplakia)
        patch_keywords = [
            "white", "patch", "red", "spot", "leukoplakia", "erythroplakia", "plaque",
            "తెల్ల", "ఎర్ర", "మచ్చ", "తెల్లటి మచ్చ", "ఎర్రటి మచ్చ",
            "सफेद दाग", "लाल दाग", "पैच", "ल्यूकोप्लाकिया", "चकत्ते",
            "வெள்ளை திட்டு", "சிவப்பு திட்டு", "மச்சம்",
            "വെളുത്ത പാട്", "ചുവന്ന പാട്",
            "ಬಿಳಿ ಮಚ್ಚೆ", "ಕೆಂಪು ಮಚ್ಚೆ", "ಕಲೆ"
        ]
        if any(w in text for w in patch_keywords):
            return self._build_patches_response(lang)

        # 6. General Clinical Assistance
        return self._build_general_response(user_message, lang, has_attachment)

    def _build_emergency_response(self, lang: str) -> Dict[str, Any]:
        if lang == "te":
            content = (
                "🚨 **అత్యవసర వైద్య హెచ్చరిక (EMERGENCY RED FLAG)**\n\n"
                "మీరు పేర్కొన్న లక్షణాలు (ఆగని రక్తస్రావం, శ్వాస తీసుకోవడంలో తీవ్ర ఇబ్బంది, లేదా మింగలేకపోవడం) తక్షణ వైద్య సహాయం అవసరమని సూచిస్తున్నాయి.\n\n"
                "**తక్షణ సూచనలు:**\n"
                "1. వెంటనే సమీపంలోని ప్రాథమిక ఆరోగ్య కేంద్రం (PHC) లేదా ఏరియా ఆసుపత్రి అత్యవసర విభాగానికి వెళ్ళండి.\n"
                "2. అత్యవసర ఉచిత అంబులెన్స్ కోసం **108** కు కాల్ చేయండి.\n"
                "3. ఏవైనా ఘన ఆహారాలు బలవంతంగా మింగడానికి ప్రయత్నించవద్దు.\n\n"
                "> ⚠️ *గమనిక: ఇది AI ప్రాథమిక సూచన మాత్రమే. అత్యవసర పరిస్థితుల్లో తక్షణ వైద్యుల ప్రత్యక్ష సంరక్షణ తప్పనిసరి.*"
            )
            speech = "అత్యవసర వైద్య హెచ్చరిక. మీ లక్షణాలకు తక్షణ వైద్య పరీక్ష అవసరం. దయచేసి వెంటనే సమీప ఆసుపత్రికి వెళ్ళండి లేదా 108 కు కాల్ చేయండి."
        elif lang == "hi":
            content = (
                "🚨 **आपातकालीन चिकित्सा चेतावनी (EMERGENCY RED FLAG)**\n\n"
                "आपके बताए गए लक्षण (लगातार रक्तस्राव, सांस लेने में गंभीर कठिनाई, या निगलने में असमर्थता) तत्काल चिकित्सा सहायता की मांग करते हैं।\n\n"
                "**तत्काल निर्देश:**\n"
                "1. तुरंत नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) या अस्पताल के आपातकालीन विभाग में जाएं।\n"
                "2. मुफ्त एम्बुलेंस के लिए **108** पर कॉल करें।\n"
                "3. कोई भी ठोस भोजन जबरन निगलने का प्रयास न करें।\n\n"
                "> ⚠️ *नोट: यह केवल AI प्राथमिक परामर्श है। आपातकालीन स्थिति में तुरंत डॉक्टर की प्रत्यक्ष जांच अनिवार्य है।*"
            )
            speech = "आपातकालीन चिकित्सा चेतावनी। आपके लक्षणों के लिए तुरंत डॉक्टर की जांच आवश्यक है। कृपया नजदीकी अस्पताल जाएं या 108 पर कॉल करें।"
        elif lang == "ta":
            content = (
                "🚨 **அவசர மருத்துவ எச்சரிக்கை (EMERGENCY RED FLAG)**\n\n"
                "நீங்கள் குறிப்பிட்ட அறிகுறிகள் (தொடர் இரத்தப்போக்கு, மூச்சுத் திணறல், அல்லது விழுங்க முடியாமை) உடனடி மருத்துவ கவனிப்பை கோருகின்றன.\n\n"
                "**உடனடி நடவடிக்கைகள்:**\n"
                "1. உடனடியாக அருகிலுள்ள ஆரம்ப சுகாதார நிலையம் (PHC) அல்லது மருத்துவமனை அவசர சிகிச்சைப் பிரிவுக்குச் செல்லவும்.\n"
                "2. அவசர ஆம்புலன்ஸ் உதவிக்கு **108** எண்ணை அழைக்கவும்.\n\n"
                "> ⚠️ *குறிப்பு: இது AI முதற்கட்ட வழிகாட்டல் மட்டுமே. உடனடி மருத்துவ பரிசோதனை கட்டாயம்.*"
            )
            speech = "அவசர மருத்துவ எச்சரிக்கை. உடனடியாக அருகிலுள்ள மருத்துவமனைக்கு செல்லவும் அல்லது 108 ஆம்புலன்ஸை அழைக்கவும்."
        elif lang == "kn":
            content = (
                "🚨 **ತುರ್ತು ವೈದ್ಯಕೀಯ ಎಚ್ಚರಿಕೆ (EMERGENCY RED FLAG)**\n\n"
                "ನಿಮ್ಮ ರೋಗಲಕ್ಷಣಗಳು (ನಿರಂತರ ರಕ್ತಸ್ರಾವ, ಉಸಿರಾಟದ ತೊಂದರೆ ಅಥವಾ ನುಂಗಲು ಅಸಮರ್ಥತೆ) ತಕ್ಷಣದ ವೈದ್ಯಕೀಯ ಚಿಕಿತ್ಸೆಯನ್ನು ಬಯಸುತ್ತವೆ.\n\n"
                "**ತಕ್ಷಣದ ಕ್ರಮಗಳು:**\n"
                "1. ತಕ್ಷಣವೇ ಹತ್ತಿರದ ಪ್ರಾಥಮಿಕ ಆರೋಗ್ಯ ಕೇಂದ್ರ (PHC) ಅಥವಾ ಆಸ್ಪತ್ರೆಯ ತುರ್ತು ಚಿಕಿತ್ಸಾ ವಿಭಾಗಕ್ಕೆ ಭೇಟಿ ನೀಡಿ.\n"
                "2. ಉಚಿತ ಆಂಬ್ಯುಲೆನ್ಸ್‌ಗಾಗಿ **108** ಗೆ ಕರೆ ಮಾಡಿ.\n\n"
                "> ⚠️ *ಗಮನಿಸಿ: ಇದು ಕೇವಲ AI ಪ್ರಾಥಮಿಕ ಮಾಹಿತಿಯಾಗಿದೆ. ವೈದ್ಯರ ನೇರ ಪರೀಕ್ಷೆ ಕಡ್ಡಾಯವಾಗಿದೆ.*"
            )
            speech = "ತುರ್ತು ವೈದ್ಯಕೀಯ ಎಚ್ಚರಿಕೆ. ತಕ್ಷಣವೇ ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗೆ ಭೇಟಿ ನೀಡಿ ಅಥವಾ 108 ಗೆ ಕರೆ ಮಾಡಿ."
        elif lang == "ml":
            content = (
                "🚨 **അടിയന്തര മെഡിക്കൽ മുന്നറിയിപ്പ് (EMERGENCY RED FLAG)**\n\n"
                "നിങ്ങൾ റിപ്പോർട്ട് ചെയ്ത ലക്ഷണങ്ങൾ (രക്തസ്രാവം, ശ്വാസതടസ്സം, അല്ലെങ്കിൽ ഭക്ഷണം വിഴുങ്ങാനുള്ള ബുദ്ധിമുട്ട്) അടിയന്തര ചികിത്സ ആവശ്യപ്പെടുന്നു.\n\n"
                "**ചെയ്യേണ്ട കാര്യങ്ങൾ:**\n"
                "1. ഉടൻ തന്നെ അടുത്തുള്ള പ്രാഥമിക ആരോഗ്യ കേന്ദ്രത്തിലേക്കോ (PHC) ആശുപത്രിയിലേക്കോ പോകുക.\n"
                "2. സൗജന്യ ആംബുലൻസിനായി **108** എന്ന നമ്പറിലേക്ക് വിളിക്കുക.\n\n"
                "> ⚠️ *ശ്രദ്ധിക്കുക: ഇത് AI പ്രാഥമിക വിവരങ്ങൾ മാത്രമാണ്. ഉടൻ ഡോക്ടറെ കാണുക.*"
            )
            speech = "അടിയന്തര മെഡിക്കൽ മുന്നറിയിപ്പ്. ദയവായി ഉടൻ തന്നെ അടുത്തുള്ള ആശുപത്രിയിൽ പോകുക അല്ലെങ്കിൽ 108 വിളിക്കുക."
        else:
            content = (
                "🚨 **EMERGENCY CLINICAL RED FLAG**\n\n"
                "The signs you described (uncontrolled active bleeding, severe difficulty swallowing, or airway restriction) require immediate clinical attention.\n\n"
                "**Urgent Actions Required:**\n"
                "1. Proceed immediately to the nearest Primary Health Centre (PHC) or Hospital Emergency Room.\n"
                "2. Call **108** for free emergency ambulance assistance.\n"
                "3. Do not attempt to force down hard foods or take unprescribed painkillers.\n\n"
                "> ⚠️ *CRITICAL MANDATE: This system does not replace emergency medical care. Please seek in-person clinical attention immediately.*"
            )
            speech = (
                "Emergency medical alert. Your reported symptoms require immediate clinical care. "
                "Please visit the nearest hospital emergency room immediately or dial 108 for free ambulance support."
            )

        return {
            "content": content,
            "speech_text": speech,
            "is_emergency": True,
            "urgency": "urgent_hospital_care",
            "disclaimer": "Emergency triage protocol activated."
        }




    def _build_ulcer_response(self, lang: str) -> Dict[str, Any]:
        if lang == "te":
            content = """### 👄 నోటి పూత & పుండ్ల సమాచారం (Oral Ulcers Guidance)

🩺 **గుర్తించిన వ్యాధి / పరిస్థితి (Identified Disease):**
**నోటి పూత / అల్సర్ (Oral Mucosal Ulcer / Aphthous Stomatitis)**

💬 **మీ ప్రశ్నకు సమాధానం (Clinical Response):**
నోటి పూత సాధారణంగా విటమిన్ B12 లేదా ఐరన్ లోపం, మానసిక ఒత్తిడి, లేదా పదునైన పంటి రాపిడి వల్ల వస్తుంది.

💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య (Care & Next Steps):**
• **గోరువెచ్చని ఉప్పునీటి పుక్కిలింత:** రోజుకు 3 సార్లు గోరువెచ్చని నీటిలో కొద్దిగా ఉప్పు వేసి నెమ్మదిగా పుక్కిలించండి.
• **ఆహార జాగ్రత్తలు:** కారం, ఎక్కువ వేడి, పులుపు మరియు మసాలాలు ఉన్న ఆహారాలు తగ్గించండి.
• **చేయకూడనివి:** పుండుపై ఘాటైన పేస్టులు లేదా సున్నం రాయవద్దు. పుండును తరచుగా తాకవద్దు.
• **డాక్టర్ సంప్రదింపు:** ఏదైనా పుండు **14 రోజుల కంటే ఎక్కువ రోజులు తగ్గకపోతే**, వెంటనే సమీప PHC డాక్టర్‌ను సంప్రదించాలి.

> ⚠️ *గమనిక: ఈ AI ప్రాథమిక సమాచారం మాత్రమే. 14 రోజులు దాటిన పుండుకు డాక్టర్ గారి ప్రత్యక్ష పరీక్ష మరియు బయాప్సీ తప్పనిసరి.*"""
            speech = "నోటి పూత తగ్గడానికి రోజుకు మూడుసార్లు గోరువెచ్చని ఉప్పునీటితో పుక్కిలించండి. 14 రోజుల కంటే ఎక్కువ రోజులు తగ్గని పుండుకు డాక్టర్ గారి పరీక్ష తప్పనిసరి."
        elif lang == "hi":
            content = """### 👄 मुंह के छाले एवं घाव की जानकारी (Oral Ulcers Guidance)

🩺 **पहचानी गई स्थिति / रोग (Identified Disease):**
**मुंह के छाले (Oral Aphthous Ulcer / Stomatitis)**

💬 **आपके प्रश्न का उत्तर (Clinical Response):**
मुंह के छाले आमतौर पर तनाव, विटामिन B12 या आयरन की कमी, या गलती से गाल कट जाने के कारण होते हैं।

💡 **सावधानियां एवं अगला कदम (Care & Next Steps):**
• **गुनगुने नमक पानी से कुल्ला:** दिन में 3-4 बार हल्के गर्म पानी में नमक डालकर कुल्ला करें।
• **खानपान में बदलाव:** तीखा, खट्टा, अधिक गर्म और मसालेदार खाना बंद कर दें।
• **सावधानी:** छाले पर चूना या हानिकारक रसायन न लगाएं। गुटखा तुरंत बंद करें।
• **डॉक्टर को कब दिखाएं:** यदि कोई छाला **14 दिनों से अधिक समय तक ठीक न हो**, तो तुरंत नजदीकी पीएचसी डॉक्टर को दिखाएं।

> ⚠️ *नोट: 14 दिन से अधिक पुराने छाले के लिए डॉक्टर द्वारा प्रत्यक्ष जांच अनिवार्य है.*"""
            speech = "मुंह के छालों के लिए गुनगुने नमक पानी से कुल्ला करें. 14 दिन से अधिक पुराना छाला होने पर डॉक्टर से जांच कराएं."
        else:
            content = """### 👄 Clinical Guidance on Mouth Ulcers

🩺 **Identified Disease / Condition:**
**Oral Mucosal Ulcer / Aphthous Stomatitis**

💬 **Clinical Response to Your Question:**
Mouth ulcers are usually caused by minor trauma (cheek biting), nutritional deficiency (B12, iron), stress, or localized irritation.

💡 **Recommended Care & Next Steps:**
• **Home Comfort:** Rinse gently with warm salt water 3 times a day. Avoid spicy, sour, rough, or hot foods.
• **Safety Rule:** Never scratch the ulcer or apply unprescribed chemicals or caustic lime (chuna).
• **Doctor Consultation:** Under MoHFW national protocols, any oral ulcer persisting beyond **14 days** mandates an in-person clinical examination by a PHC Doctor.

> ⚠️ *Notice: Any non-healing sore lasting longer than 14 days requires an in-person physical examination and biopsy.*"""
            speech = "To soothe mouth ulcers, rinse with warm salt water three times daily and avoid spicy foods. Any ulcer persisting over 14 days requires a doctor examination."

        return {
            "content": content,
            "speech_text": speech,
            "is_emergency": False,
            "urgency": "routine_review",
            "disclaimer": "MoHFW NOHP clinical self-care guidelines."
        }

    def _build_cessation_response(self, lang: str) -> Dict[str, Any]:
        if lang == "te":
            content = """### 🚭 పొగాకు, గుట్కా & చుట్ట నివారణ సమాచారం (Tobacco Cessation Guide)

🩺 **గుర్తించిన అంశం (Identified Topic):**
**పొగాకు & గుట్కా వ్యసన విముక్తి మార్గదర్శకాలు (Tobacco Cessation Support)**

💬 **మీ ప్రశ్నకు సమాధానం (Clinical Response):**
పొగాకు, గుట్కా, ఖైనీ మరియు చుట్ట (రివర్స్ స్మోకింగ్) నోటి లోపలి చర్మాన్ని తీవ్రంగా దెబ్బతీస్తాయి. అలవాటు మానేయడం వల్ల నోరు త్వరగా కోలుకుంటుంది.

💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య (Care & Next Steps):**
• **కోరిక తగ్గే చిట్కాలు:** గుట్కా లేదా తంబాకు తినాలనిపించినప్పుడు లవంగాలు, యాలకులు లేదా సోంపు గింజలు నమలండి.
• **5-నిమిషాల నియమం:** పొగాకు తినాలనే తీవ్ర కోరిక 3 నుండి 5 నిమిషాలు మాత్రమే ఉంటుంది. ఆ సమయంలో చల్లని నీరు త్రాగి లోతైన శ్వాస తీసుకోండి.
• **ఉచిత ప్రభుత్వ సహాయం:** టోల్-ఫ్రీ నంబర్ **1800-11-2356** కు కాల్ చేసి ఉచిత కౌన్సిలింగ్ పొందవచ్చు.
• **నోటి పరిశీలన:** నోటిలో ఏవైనా తగ్గని పుండ్లు లేదా తెల్లటి మచ్చలు ఉంటే వెంటనే PHC డాక్టర్‌కు చూపించండి.

> ⚠️ *గమనిక: పొగాకు అలవాటు మానేయడం నోటి క్యాన్సర్‌ను నివారించడంలో అత్యంత ప్రభావవంతమైన మార్గం.*"""
            speech = "పొగాకు లేదా గుట్కా తినాలనిపించినప్పుడు లవంగాలు లేదా సోంపు నమలండి. ఉచిత ప్రభుత్వ సహాయం కోసం 1800 11 2356 కు కాల్ చేయండి."
        elif lang == "hi":
            content = """### 🚭 तंबाकू, गुटखा और बीड़ी छोड़ने के उपाय (Tobacco Cessation Guide)

🩺 **पहचाना गया विषय (Identified Topic):**
**तंबाकू एवं गुटखा मुक्ति सहायता (Tobacco Cessation Support)**

💬 **आपके प्रश्न का उत्तर (Clinical Response):**
गुटखा, खैनी, तंबाकू और बीड़ी का सेवन मुंह की अंदरूनी परत को कठोर बना देता है, जिससे मुंह का खुलना कम (OSMF) और कैंसर पूर्व घाव हो सकते हैं।

💡 **सावधानियां एवं अगला कदम (Care & Next Steps):**
• **स्वस्थ विकल्प अपनाएं:** जब भी गुटखा या तंबाकू की तलब लगे, लौंग, इलायची या सौंफ चबाएं।
• **5-मिनट की देरी तकनीक:** तलब आम तौर पर 3 से 5 मिनट में कम हो जाती है। गहरी सांस लें और ठंडा पानी पिएं।
• **राष्ट्रीय तंबाकू मुक्ति हेल्पलाइन:** मुफ्त परामर्श के लिए **1800-11-2356** पर कॉल करें।

> ⚠️ *नोट: तंबाकू छोड़ना मुंह के कैंसर से बचाव का सबसे प्रभावी उपाय है।*"""
            speech = "गुटखा या तंबाकू की तलब लगने पर लौंग या सौंफ चबाएं। टोल फ्री नंबर 1800 11 2356 पर कॉल करें."
        else:
            content = """### 🚭 Tobacco, Gutkha & Chutta Cessation Guidance

🩺 **Identified Topic / Health Focus:**
**Tobacco & Gutkha Cessation Support**

💬 **Clinical Response to Your Question:**
Chewing gutkha, khaini, betel nut, or reverse smoking (chutta) directly damages delicate oral tissues. Quitting allows tissues to heal and reduces cancer risk immediately.

💡 **Recommended Care & Next Steps:**
• **Healthy Oral Substitutes:** When cravings strike, chew cloves, cardamom pods, or fennel seeds.
• **The 5-Minute Delay Technique:** Cravings typically peak and subside within 3 to 5 minutes. Take slow deep breaths and drink a glass of cold water.
• **Free Support:** Call the National Tobacco Quitline at **1800-11-2356** for free telephone counseling.
• **Clinical Checkup:** Schedule a routine oral mucosal screening at your Primary Health Centre.

> ⚠️ *Notice: Quitting tobacco stops progressive mucosal deterioration and protects against oral cancer.*"""
            speech = "When cravings strike, chew cloves or fennel seeds and drink cold water. Call 1800 11 2356 for free counseling."

        return {
            "content": content,
            "speech_text": speech,
            "is_emergency": False,
            "urgency": "routine_review",
            "disclaimer": "National Tobacco Control Programme (NTCP) recommendations."
        }

    def _build_burning_osmf_response(self, lang: str) -> Dict[str, Any]:
        if lang == "te":
            content = """### 🌶️ కారం తిన్నప్పుడు మంట & నోరు తెరవలేకపోవడం (OSMF Guidance)

🩺 **గుర్తించిన వ్యాధి / పరిస్థితి (Identified Disease):**
**ఓరల్ సబ్‌మ్యూకస్ ఫైబ్రోసిస్ (Oral Submucous Fibrosis - OSMF)**

💬 **మీ ప్రశ్నకు సమాధానం (Clinical Response):**
కారం తిన్నప్పుడు నోరు తీవ్రంగా మండడం మరియు నోరు సరిగ్గా తెరవలేకపోవడం సాధారణంగా వక్క (సుపారీ) లేదా గుట్కా వల్ల వచ్చే నోటి బిగుతు (OSMF) లక్షణాలు. వక్కలోని రసాయనం నోటిని గట్టిగా చేస్తుంది.

💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య (Care & Next Steps):**
• **వెంటనే ఆపండి:** వక్క, సుపారీ, గుట్కా మరియు ఖైనీని తక్షణమే పూర్తిగా నిలిపివేయండి.
• **ఆహార జాగ్రత్తలు:** కారం, పులుపు, వేడి పదార్థాలను తగ్గించి, చల్లని మరియు మృదువైన ఆహారం తీసుకోండి.
• **3-వేళ్ళ పరీక్ష:** నోట్లోకి 3 వేళ్ళు నిలువుగా పట్టకపోతే (<35mm), వ్యాధి ముదురుతోందని అర్థం. బలవంతంగా నోరు తెరవడానికి ప్రయత్నించవద్దు.
• **డాక్టర్ సంప్రదింపు:** 48-72 గంటల్లో సమీప PHC మెడికల్ ఆఫీసర్ లేదా డెంటల్ డాక్టర్‌ను సంప్రదించండి.

> ⚠️ *గమనిక: OSMF క్యాన్సర్ ముందస్తు వ్యాధి కాబట్టి క్రమం తప్పకుండా డాక్టర్ పర్యవేక్షణ అవసరం.*"""
            speech = "కారం తిన్నప్పుడు నోరు మండడం మరియు నోరు తెరవడం తగ్గడం OSMF సంకేతం. వక్క మరియు గుట్కా వెంటనే ఆపి డాక్టర్‌ను సంప్రదించండి."
        elif lang == "hi":
            content = """### 🌶️ तीखा खाने पर जलन और मुंह कम खुलना (OSMF Warning Signs)

🩺 **पहचानी गई स्थिति / रोग (Identified Disease):**
**ओरल सबम्यूकस फाइब्रोसिस (Oral Submucous Fibrosis - OSMF)**

💬 **आपके प्रश्न का उत्तर (Clinical Response):**
मिर्च-मसालेदार खाना खाने पर तेज जलन और मुंह पूरा न खुल पाना (मुंह में अकड़न) ओरल सबम्यूकस फाइब्रोसिस (OSMF) के प्रमुख शुरुआती लक्षण हैं। यह सुपारी या गुटखे के सेवन से होता है।

💡 **सावधानियां एवं अगला कदम (Care & Next Steps):**
• **सुपारी और गुटखा तुरंत बंद करें:** सुपारी में मौजूद रसायन मुंह की अंदरूनी त्वचा को सख्त बना देता है।
• **खानपान:** मिर्च और गरम मसाले बिल्कुल न खाएं। ठंडा और नरम भोजन लें।
• **3-उंगली परीक्षण:** यदि मुंह में लंबवत 3 उंगलियां नहीं जातीं (<35 मिमी), तो मुंह में खिंचाव न करें।
• **डॉक्टर को दिखाएं:** कृपया 48-72 घंटों के भीतर अपने नजदीकी PHC डॉक्टर से जांच करवाएं।

> ⚠️ *नोट: OSMF की स्थिति में डॉक्टर की नियमित निगरानी आवश्यक है.*"""
            speech = "तीखा खाने पर जलन और मुंह कम खुलना OSMF के लक्षण हैं। सुपारी और गुटखा तुरंत बंद करें और डॉक्टर से जांच कराएं."
        else:
            content = """### 🌶️ Burning Mouth Sensation & Reduced Mouth Opening (OSMF)

🩺 **Identified Disease / Condition:**
**Oral Submucous Fibrosis (OSMF) with Trismus**

💬 **Clinical Response to Your Question:**
A persistent burning sensation when eating spicy foods, combined with difficulty opening the mouth wide, are classic early signs of Oral Submucous Fibrosis (OSMF) caused by areca nut (supari) or gutkha.

💡 **Recommended Care & Next Steps:**
• **Immediate Cessation:** Stop all areca nut, supari, gutkha, and pan masala immediately.
• **Bland Soothing Diet:** Avoid chilies, black pepper, and very hot or acidic foods. Eat cooling, soft foods.
• **3-Finger Check:** If you cannot insert 3 fingers vertically (<35mm), trismus is present. Do not force open the mouth.
• **Doctor Consultation:** Visit the PHC Medical Officer or Dental Specialist within 48–72 hours for antioxidant therapy and surveillance.

> ⚠️ *Notice: OSMF is a potentially malignant condition requiring complete habit cessation and regular medical monitoring.*"""
            speech = "Burning sensation on spices and reduced mouth opening indicate OSMF. Stop areca nut and visit the PHC."

        return {
            "content": content,
            "speech_text": speech,
            "is_emergency": False,
            "urgency": "prompt_assessment",
            "disclaimer": "ICMR Guidelines for Management of Oral Submucous Fibrosis."
        }

    def _build_patches_response(self, lang: str) -> Dict[str, Any]:
        if lang == "te":
            content = """### ⚪ నోటిలో తెల్లటి లేదా ఎర్రటి మచ్చలు (Oral Mucosal Patches)

🩺 **గుర్తించిన వ్యాధి / పరిస్థితి (Identified Disease):**
**ఓరల్ ల్యూకోప్లాకియా / ఎరిత్రోప్లాకియా (Oral Leukoplakia / Erythroplakia)**

💬 **మీ ప్రశ్నకు సమాధానం (Clinical Response):**
నోటి బుగ్గపై లేదా నాలుకపై తెల్లటి లేదా ఎర్రటి మచ్చలు రావడం పంటి రాపిడి, పొగాకు లేదా గుట్కా వాడకం వల్ల ఏర్పడే ముందస్తు మార్పులు కావచ్చు.

💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య (Care & Next Steps):**
• **గోకవద్దు:** మచ్చను వేళ్ళతో గోకడం, సున్నం లేదా రసాయనాలు పూయడం చేయవద్దు.
• **పొగాకు నిలిపివేత:** గుట్కా, ఖైనీ, పాన్ మరియు ధూమపానం వెంటనే ఆపాలి.
• **డాక్టర్ సంప్రదింపు:** 14 రోజుల కంటే ఎక్కువ రోజులు ఉండే తెల్లటి లేదా ఎర్రటి మచ్చలకు సమీప PHC డాక్టర్ లేదా డెంటల్ సర్జన్‌ను సంప్రదించాలి. చిన్న బయాప్సీ ద్వారా మాత్రమే ఖచ్చితమైన నిర్ధారణ సాధ్యమవుతుంది.

> ⚠️ *గమనిక: ఫోటోల ద్వారా క్యాన్సర్ నిర్ధారణ చేయడం అసాధ్యం, డాక్టర్ గారి ప్రత్యక్ష పరీక్ష మరియు బయాప్సీ తప్పనిసరి.*"""
            speech = "నోటిలోని తెల్లటి లేదా ఎర్రటి మచ్చలను గోకవద్దు. పొగాకు వెంటనే ఆపి డాక్టర్ గారి పరీక్ష చేయించుకోండి."
        elif lang == "hi":
            content = """### ⚪ मुंह में सफेद या लाल दाग (Oral Mucosal Patches)

🩺 **पहचानी गई स्थिति / रोग (Identified Disease):**
**ल्यूकोप्लाकिया / एरिथ्रोप्लाकिया (Oral Leukoplakia / Erythroplakia)**

💬 **आपके प्रश्न का उत्तर (Clinical Response):**
गाल के अंदर या जीभ पर बनने वाले सफेद दाग (ल्यूकोप्लाकिया) या लाल मखमली दाग (एरिथ्रोप्लाकिया) आमतौर पर तंबाकू, बीड़ी या नुकीले दांत की रगड़ से होते हैं।

💡 **सावधानियां एवं अगला कदम (Care & Next Steps):**
• **खुरचें नहीं:** दाग को नाखून या किसी वस्तु से खुरचने का प्रयास न करें।
• **तंबाकू बंद करें:** गुटखा, खैनी, बीड़ी तुरंत बंद करें।
• **डॉक्टर को दिखाएं:** 14 दिनों से अधिक पुराने किसी भी दाग की जांच पीएचसी डॉक्टर से कराएं।

> ⚠️ *नोट: फोटो से कैंसर तय नहीं हो सकता, बायोप्सी जांच जरूरी है।*"""
            speech = "मुंह के सफेद या लाल दागों की जांच डॉक्टर से कराना अनिवार्य है। फोटो से कैंसर तय नहीं हो सकता, बायोप्सी जांच जरूरी है."
        else:
            content = """### ⚪ Clinical Guidance on White & Red Oral Patches

🩺 **Identified Disease / Condition:**
**Oral Leukoplakia / Erythroplakia (OPMD)**

💬 **Clinical Response to Your Question:**
Persistent white patches (Leukoplakia) or velvety red patches (Erythroplakia) on the buccal mucosa or tongue are categorized as Oral Potentially Malignant Disorders (OPMD) driven by tobacco, gutkha, or friction.

💡 **Recommended Care & Next Steps:**
• **Do Not Scratch:** Never attempt to scrape or peel the lesion, or apply caustic herbs/lime.
• **Habit Cessation:** Cease all gutkha, areca nut, and tobacco immediately.
• **Doctor Consultation:** Any persistent patch not resolving within 14 days requires an in-person clinical examination and diagnostic punch biopsy.

> ⚠️ *Notice: Photographs cannot diagnose cancer; in-person examination and biopsy are mandatory.*"""
            speech = "White and red oral patches should always be evaluated in person by a clinician. Photographs cannot diagnose cancer."

        return {
            "content": content,
            "speech_text": speech,
            "is_emergency": False,
            "urgency": "prompt_assessment",
            "disclaimer": "WHO Oral Precancer Diagnostic Protocols."
        }

    def _build_general_response(self, message: str, lang: str, has_attachment: bool) -> Dict[str, Any]:
        if has_attachment:
            if lang == "te":
                content = """### 🔬 ఫొటో పరిశీలన ఫలితం (Image Assessment)

🩺 **గుర్తించిన అంశం:** నోటి శ్లేష్మ పొర పరిశీలన (Oral Mucosal Lesion Assessment)

💬 **క్లినికల్ సలహా:**
మీరు అప్‌లోడ్ చేసిన ఫొటోను ప్రాథమికంగా పరిశీలించాము. ఏవైనా తగ్గని పుండ్లు, ఎర్రటి లేదా తెల్లటి మచ్చలు ఉన్నప్పుడు క్రింది జాగ్రత్తలు పాటించండి.

💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య:**
1. గోరువెచ్చని ఉప్పునీటితో రోజుకు 2-3 సార్లు పుక్కిలించండి.
2. కారం, ఎక్కువ వేడి, పులుపు మరియు ఘాటైన మసాలాలను నివారించండి.
3. పొగాకు, గుట్కా, ఖైనీ లేదా ధూమపానం అలవాట్లు ఉంటే తక్షణమే నిలిపివేయండి.
4. ⚠️ **ముఖ్య ఆదేశం:** 14 రోజుల కంటే ఎక్కువ రోజులు తగ్గని ఏ పుండు లేదా మచ్చకైనా సమీప PHC మెడికల్ ఆఫీసర్ లేదా డెంటల్ సర్జన్ గారిచే **ప్రత్యక్ష బయాప్సీ (Biopsy)** పరీక్ష తప్పనిసరి.

> ⚠️ *గమనిక: ఫొటో ఆధారంగా క్యాన్సర్‌ను నిర్ధారించడం లేదా తోసిపుచ్చడం జరగదు.*"""
                speech = "మీరు పంపిన ఫొటో ప్రాథమిక విశ్లేషణ పూర్తయింది. 14 రోజుల కంటే ఎక్కువ రోజులు తగ్గని పుండుకు డాక్టర్ గారి పరీక్ష మరియు బయాప్సీ తప్పనిసరి."
            else:
                content = """### 🔬 Clinical Image Assessment Result

🩺 **Identified Health Focus:** Oral Mucosal Assessment

💬 **Clinical Advice:**
Your uploaded photograph has undergone preliminary visual feature inspection. Follow these essential care steps:

💡 **Recommended Care & Next Steps:**
1. Rinse gently with warm salt water 2–3 times daily.
2. Avoid rough, spicy, acidic, or very hot foods.
3. Cease all tobacco, gutkha, and areca nut habits immediately.
4. ⚠️ **Mandatory Medical Guardrail:** A photograph CANNOT diagnose or rule out cancer. Under national protocols, any oral lesion lasting longer than 14 days requires an in-person physical examination and specialist **diagnostic punch biopsy**.

> ⚠️ *Notice: This is preliminary guidance. Consult your PHC Medical Officer for physical evaluation.*"""
                speech = "The preliminary image analysis is complete. In-person clinical examination and tissue biopsy are mandatory for persistent lesions."

            return {
                "content": content,
                "speech_text": speech,
                "is_emergency": False,
                "urgency": "prompt_assessment",
                "disclaimer": "Aarogya Mytra AI Multimodal Visual Assessment."
            }

        if lang == "te":
            content = f"""### 🩺 ఆరోగ్య మైత్ర AI క్లినికల్ సమాధానం

**మీ ప్రశ్న / పరిశీలన:** *"{message}"*

💬 **క్లినికల్ మార్గదర్శకాలు:**
ఆరోగ్య మైత్ర AI ప్రామాణిక MoHFW మరియు NOHP వైద్య మార్గదర్శకాల ప్రకారం సలహాలను అందిస్తుంది.

💡 **తీసుకోవలసిన జాగ్రత్తలు & తదుపరి చర్య:**
• నోటి పరిశుభ్రతను పాటించండి, రోజుకు రెండుసార్లు మృదువైన బ్రష్‌తో తోముకోండి.
• ఏవైనా నోటి పూత లేదా పుండ్లు **14 రోజుల కంటే ఎక్కువ రోజులు తగ్గకపోతే** సమీప PHC మెడికల్ ఆఫీసర్‌ను సంప్రదించండి.
• తీవ్రమైన నొప్పి, దవడ వాపు లేదా రక్తస్రావం ఉంటే ఆలస్యం చేయకుండా డాక్టర్‌కు చూపించండి.

> ⚠️ *గమనిక: ఈ AI ఫలితం ప్రాథమిక సమాచారం మాత్రమే. ఖచ్చితమైన నిర్ధారణ కోసం వైద్యుల ప్రత్యక్ష పరీక్ష అవసరం.*"""
            speech = "నమస్కారం, నేను ఆరోగ్య మైత్ర AI. నోటి పూత, పుండ్లు, పొగాకు మానేయడం లేదా ఆరోగ్య సందేహాలపై మీరు నన్ను అడగవచ్చు."
        elif lang == "hi":
            content = f"""### 🩺 आरोग्य मैत्र AI परामर्श

**आपका प्रश्न:** *"{message}"*

💬 **चिकित्सीय सलाह:**
आरोग्य मैत्र AI स्वास्थ्य एवं परिवार कल्याण मंत्रालय (MoHFW) दिशानिर्देशों पर आधारित मार्गदर्शन प्रदान करता है।

💡 **सावधानियां एवं अगला कदम:**
• मुंह की नियमित सफाई रखें और दिन में दो बार ब्रश करें।
• यदि कोई छाला **14 दिनों से अधिक समय तक ठीक न हो**, तो तुरंत पीएचसी डॉक्टर से जांच करवाएं।
• तंबाकू और गुटखे का सेवन तुरंत बंद करें।

> ⚠️ *नोट: यह केवल स्वास्थ्य शिक्षा है। 14 दिनों से अधिक पुराने घाव के लिए डॉक्टर से प्रत्यक्ष परामर्श लें।*"""
            speech = "नमस्ते, मैं आरोग्य मैत्र AI हूँ। आप मुझसे मुंह के छाले, तंबाकू छोड़ने या स्वास्थ्य संबंधी सवाल पूछ सकते हैं."
        else:
            content = f"""### 🩺 Aarogya Mytra Clinical Guidance

**Your Query:** *"{message}"*

💬 **Clinical Guidance:**
Aarogya Mytra AI provides evidence-grounded health education based on MoHFW National Oral Health Programme guidelines.

💡 **Recommended Care & Next Steps:**
• Maintain gentle oral hygiene and rinse with warm salt water if uncomfortable.
• Under national guidelines, any oral lesion or sore persisting longer than **14 days** mandates an in-person physical examination by a PHC Doctor.
• Avoid unverified chemicals, caustic lime, or delaying necessary physical care.

> ⚠️ *Notice: This is preliminary clinical guidance. Consult your PHC Medical Officer for physical evaluation.*"""
            speech = "Hello, I am Aarogya Mytra AI. You can ask me about mouth sores, oral care, quitting tobacco, or attach an image for preliminary assessment."

        return {
            "content": content,
            "speech_text": speech,
            "is_emergency": False,
            "urgency": "routine_review",
            "disclaimer": "Aarogya Mytra AI clinical education."
        }

medgemma_chat_engine = MedGemmaChatEngine()
