import re
import logging
from typing import Dict, Any, Optional
from app.integrations.ai.triage import detect_emergency_symptoms

logger = logging.getLogger("medgemma_chat_engine")

class MedGemmaChatEngine:
    """
    MedGemma Clinical Dialogue & Voice Health Assistant Engine.
    Powers Aarogya Mytra AI in the Chatbot and Voice Agent workflows across
    Telugu, English, Hindi, Tamil, Malayalam, and Kannada.
    Grounded in MoHFW National Oral Health Programme (NOHP), NP-NCD, and WHO protocols.
    """

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
            content = (
                "### 👄 నోటి పూత & పుండ్ల సమగ్ర మార్గదర్శకాలు (Comprehensive Oral Ulcer Guide)\n\n"
                "#### 🗣️ 1. రోగులకు సులభమైన వివరణ (For Patients & Families):\n"
                "నోటి పూత లేదా పుండ్లు సాధారణంగా విటమిన్ లోపం (B12, ఐరన్), ఒత్తిడి లేదా పొరపాటున పంటితో కొరుక్కోవడం వల్ల వస్తాయి.\n"
                "• **ఇంట్లో చేయవలసినవి:** రోజుకు 3 సార్లు గోరువెచ్చని ఉప్పునీటితో పుక్కిలించండి. కారం, పులుపు మరియు వేడి ఆహారాలు తగ్గించండి.\n"
                "• **చేయకూడనివి:** పుండుపై ఘాటైన పేస్టులు, సున్నం లేదా సొంత మందులు రాయవద్దు.\n\n"
                "#### 👩‍⚕️ 2. ఆశా కార్యకర్తలు & PHC సిబ్బందికి (For ASHA Workers):\n"
                "✓ రోగిని అడగండి: ఈ పుండు ఎన్ని రోజులుగా ఉంది? (14 రోజుల కంటే ఎక్కువైతే హై-ప్రయారిటీ రిఫరల్).\n"
                "✓ పొగాకు, గుట్కా లేదా చుట్ట అలవాటు ఉంటే వెంటనే మానేయాలని కౌన్సిలింగ్ ఇవ్వండి.\n"
                "✓ 14 రోజుల కంటే ఎక్కువ రోజులు తగ్గకపోతే వెంటనే PHC డాక్టర్ అపాయింట్‌మెంట్ బుక్ చేయండి.\n\n"
                "#### 🩺 3. వైద్యుల పరిశీలన నియమం (For Doctors & Specialists):\n"
                "⚠️ **MoHFW NOHP 14-Day Mandatory Rule:** Any oral ulcer persisting beyond 14 days without spontaneous healing mandates in-person clinical palpation for induration, lymph node examination, and diagnostic punch biopsy to rule out malignancy/dysplasia."
            )
            speech = (
                "నోటి పూత తగ్గడానికి రోజుకు మూడుసార్లు గోరువెచ్చని ఉప్పునీటితో పుక్కిలించండి. "
                "కారం మరియు వేడి ఆహారాలను నివారించండి. "
                "ముఖ్య గమనిక: ఏదైనా పుండు 14 రోజుల కంటే ఎక్కువ రోజులు తగ్గకపోతే, వెంటనే సమీప పీహెచ్‌సీ డాక్టర్‌ను సంప్రదించండి."
            )
        elif lang == "hi":
            content = (
                "### 👄 मुंह के छाले और घाव की देखभाल (Oral Ulcer Care Guidance)\n\n"
                "मुंह के छाले आमतौर पर तनाव, विटामिन की कमी (विटामिन B12, आयरन) या गलती से गाल कट जाने के कारण होते हैं।\n\n"
                "**घरेलू देखभाल निर्देश:**\n"
                "• **गुनगुने नमक के पानी से कुल्ला:** दिन में 3-4 बार हल्के गर्म पानी में नमक डालकर कुल्ला करें।\n"
                "• **तीखे और गर्म भोजन से परहेज:** अधिक मिर्च-मसाले और खट्टे खाद्य पदार्थों से दूर रहें।\n"
                "• **पर्याप्त पानी पिएं:** शरीर में पानी की कमी न होने दें, नरम और ठंडा भोजन लें।\n\n"
                "⚠️ **महत्वपूर्ण 14-दिन का नियम:**\n"
                "यदि मुंह का कोई भी छाला **14 दिनों से अधिक समय तक ठीक नहीं होता**, तो तुरंत अपने नजदीकी PHC डॉक्टर को दिखाएं। केवल फोटो देखकर कैंसर की पुष्टि या खंडन नहीं किया जा सकता, डॉक्टर द्वारा प्रत्यक्ष जांच और बायोप्सी आवश्यक है।"
            )
            speech = (
                "मुंह के छालों के लिए दिन में तीन बार गुनगुने नमक के पानी से कुल्ला करें। "
                "तीखे भोजन से बचें। 14 दिनों से अधिक पुराने छाले के लिए तुरंत डॉक्टर से मिलें।"
            )
        elif lang == "ta":
            content = (
                "### 👄 வாய் புண் பராமரிப்பு வழிகாட்டல் (Oral Ulcer Guidance)\n\n"
                "வாய் புண்கள் மன அழுத்தம், வைட்டமின் குறைபாடு (B12, இரும்புச்சத்து) அல்லது தவறுதலாக கடிப்பதால் ஏற்படலாம்.\n\n"
                "**வீட்டுப் பராமரிப்பு முறைகள்:**\n"
                "• **வெதுவெதுப்பான உப்பு நீர் கொப்பளிப்பு:** தினமும் 3-4 முறை வெதுவெதுப்பான நீரில் உப்பு சேர்த்து வாய் கொப்பளிக்கவும்.\n"
                "• **காரமான உணவுகளை தவிர்க்கவும்:** அதிக மசாலா மற்றும் புளிப்பான உணவுகளை தவிர்க்கவும்.\n\n"
                "⚠️ **14 நாள் கட்டாய விதி:**\n"
                "வாய் புண் **14 நாட்களுக்கு மேல் ஆறாமல் இருந்தால்**, உடனடியாக PHC மருத்துவரை அணுகவும். புகைப்படத்தின் மூலம் புற்றுநோயை உறுதிப்படுத்த முடியாது."
            )
            speech = "வாய் புண்ணுக்கு வெதுவெதுப்பான உப்பு நீரில் கொப்பளிக்கவும். 14 நாட்களுக்கு மேல் ஆறாத புண்ணுக்கு உடனடியாக மருத்துவரை அணுகவும்."
        elif lang == "kn":
            content = (
                "### 👄 ಬಾಯಿ ಹುಣ್ಣು ನಿವಾರಣೆ ಮತ್ತು ಆರೈಕೆ (Oral Ulcer Care)\n\n"
                "ಬಾಯಿ ಹುಣ್ಣು ಸಾಮಾನ್ಯವಾಗಿ ಒತ್ತಡ, ವಿಟಮಿನ್ ಕೊರತೆ ಅಥವಾ ಆಕಸ್ಮಿಕವಾಗಿ ಕಚ್ಚಿಕೊಳ್ಳುವುದರಿಂದ ಉಂಟಾಗುತ್ತದೆ.\n\n"
                "**ಮನೆಮದ್ದು ಮತ್ತು ಸಲಹೆಗಳು:**\n"
                "• **ಬೆಚ್ಚಗಿನ ಉಪ್ಪು ನೀರಿನಿಂದ ಮುಕ್ಕಳಿಸಿ:** ದಿನಕ್ಕೆ 3-4 ಬಾರಿ ಬೆಚ್ಚಗಿನ ಉಪ್ಪು ನೀರಿನಿಂದ ಬಾಯಿ ಮುಕ್ಕಳಿಸಿ.\n"
                "• **ಖಾರ ಮತ್ತು ಬಿಸಿ ಪದಾರ್ಥಗಳನ್ನು ತಪ್ಪಿಸಿ:** ಅತಿಯಾದ ಮಸಾಲೆ ಮತ್ತು ಹುಳಿ ಪದಾರ್ಥಗಳನ್ನು ಕಡಿಮೆ ಮಾಡಿ.\n\n"
                "⚠️ **14 ದಿನಗಳ ಕಡ್ಡಾಯ ನಿಯಮ:**\n"
                "ಯಾವುದೇ ಬಾಯಿ ಹುಣ್ಣು **14 ದಿನಗಳಿಗಿಂತ ಹೆಚ್ಚು ಕಾಲ ವಾಸಿಯಾಗದಿದ್ದರೆ**, ತಕ್ಷಣ PHC ವೈದ್ಯರನ್ನು ಭೇಟಿ ಮಾಡಿ."
            )
            speech = "ಬಾಯಿ ಹುಣ್ಣಿಗೆ ಉಪ್ಪು ನೀರಿನಿಂದ ಮುಕ್ಕಳಿಸಿ. 14 ದಿನಕ್ಕಿಂತ ಹೆಚ್ಚು ಕಾಲ ಹುಣ್ಣು ವಾಸಿಯಾಗದಿದ್ದರೆ ವೈದ್ಯರನ್ನು ಭೇಟಿ ಮಾಡಿ."
        elif lang == "ml":
            content = (
                "### 👄 വായ്പ്പുണ്ണ് പരിചരണം (Oral Ulcer Care)\n\n"
                "വിറ്റാമിൻ കുറവ്, മാനസിക സമ്മർദ്ദം, അല്ലെങ്കിൽ മുറിവുകൾ എന്നിവ കാരണം വായ്പ്പുണ്ണ് ഉണ്ടാകാം.\n\n"
                "**വീട്ടുപരിചരണ നിർദ്ദേശങ്ങൾ:**\n"
                "• **ചെറുചൂടുള്ള ഉപ്പുവെള്ളം കൊണ്ട് വായ് കഴുകുക:** ദിവസത്തിൽ 3-4 തവണ ഉപ്പുവെള്ളം കൊള്ളുക.\n"
                "• **എരിവും പുളിയുമുള്ള ഭക്ഷണങ്ങൾ ഒഴിവാക്കുക.**\n\n"
                "⚠️ **14 ദിവസത്തെ മുന്നറിയിപ്പ്:**\n"
                "വായ്പ്പുണ്ണ് **14 ദിവസത്തിൽ കൂടുതൽ നീണ്ടുനിൽക്കുകയാണെങ്കിൽ**, ഉടൻ ഡോക്ടറെ കണ്ട് പരിശോധിക്കുക."
            )
            speech = "ചെറുചൂടുള്ള ഉപ്പുവെള്ളം കൊണ്ട് വായ് കഴുകുക. 14 ദിവസത്തിൽ കൂടുതൽ ഉള്ള വായ്പ്പുണ്ണിന് ഉടൻ ഡോക്ടറെ കാണുക."
        else:
            content = (
                "### 👄 Comprehensive Mouth Ulcer Guide (All Stakeholders)\n\n"
                "#### 🗣️ 1. Plain Explanation for Patients & Families:\n"
                "Mouth ulcers are usually caused by minor trauma (cheek biting), vitamin deficiency (B12, iron), or body heat/stress.\n"
                "• **Home Comfort:** Rinse gently with warm salt water 3 times a day. Avoid spicy, sour, rough, or hot foods.\n"
                "• **Safety Rule:** Never scratch the ulcer or apply unprescribed powders or chemicals.\n\n"
                "#### 👩‍⚕️ 2. Action Guide for ASHA Workers & Health Staff:\n"
                "✓ Check duration: If the ulcer has been present for >14 days, prioritize referral.\n"
                "✓ Ask about tobacco/gutkha use and advise immediate cessation.\n"
                "✓ Schedule an in-person PHC Medical Officer review within 48–72 hours.\n\n"
                "#### 🩺 3. Clinical Mandate for Doctors & PHC Staff:\n"
                "⚠️ **MoHFW National Oral Health Protocol:** Any oral mucosal ulceration persisting beyond 14 days mandates bimanual palpation for induration, lymph node examination, and diagnostic punch biopsy."
            )
            speech = (
                "To soothe mouth ulcers, rinse with warm salt water three times daily and avoid spicy foods. "
                "Important clinical notice: Any mouth ulcer persisting longer than two weeks must be examined in person by a PHC doctor."
            )

        return {
            "content": content,
            "speech_text": speech,
            "is_emergency": False,
            "urgency": "routine_review",
            "disclaimer": "MoHFW NOHP clinical self-care guidelines."
        }

    def _build_cessation_response(self, lang: str) -> Dict[str, Any]:
        if lang == "te":
            content = (
                "### 🚭 పొగాకు, గుట్కా & చుట్ట అలవాటు మానేయడం (Tobacco Cessation Guide)\n\n"
                "#### 🗣️ 1. రోగులకు సులభమైన వివరణ (For Patients & Families):\n"
                "పొగాకు, గుట్కా, ఖైనీ మరియు చుట్ట (రివర్స్ స్మోకింగ్) నోటి లోపలి చర్మాన్ని దెబ్బతీస్తాయి. అలవాటు మానేయడం వల్ల నోరు త్వరగా కోలుకుంటుంది.\n"
                "• **తక్షణ ఉపశమనం:** గుట్కా లేదా తంబాకు తినాలనిపించినప్పుడు లవంగాలు, యాలకులు లేదా సోంపు గింజలు నమలండి.\n"
                "• **5-నిమిషాల నియమం:** పొగాకు తినాలనే తీవ్ర కోరిక 3 నుండి 5 నిమిషాలు మాత్రమే ఉంటుంది. ఆ సమయంలో చల్లని నీరు త్రాగి లోతైన శ్వాస తీసుకోండి.\n"
                "• **ఉచిత ప్రభుత్వ సహాయం:** టోల్-ఫ్రీ నంబర్ **1800-11-2356** కు కాల్ చేసి కౌన్సిలింగ్ పొందవచ్చు.\n\n"
                "#### 👩‍⚕️ 2. ఆశా కార్యకర్తలు & PHC సిబ్బందికి (For ASHA Workers):\n"
                "✓ రోగిని అడగండి: రోజుకు ఎన్నిసార్లు గుట్కా/తంబాకు/చుట్ట తీసుకుంటున్నారు? ఎన్ని సంవత్సరాలుగా అలవాటు ఉంది?\n"
                "✓ నోటి లోపల తెల్లటి చారలు, బిగుతు లేదా దంతాల రాపిడి మచ్చలు ఉన్నాయా చూడండి.\n"
                "✓ పొగాకు మానేయాలని దృఢంగా ప్రోత్సహించండి, ఫాలో-అప్ హోమ్ విజిట్ ప్లాన్ చేయండి.\n\n"
                "#### 🩺 3. వైద్యులు & క్లినికల్ ప్రోటోకాల్ (For Doctors & Specialists):\n"
                "Evaluate Nicotine Dependence (Fagerström Test). Prescribe behavioral counseling + Nicotine Replacement Therapy (NRT gum/patch) if indicated. Inspect mucosal lining for dysplasia; schedule 3-month surveillance."
            )
            speech = (
                "పొగాకు లేదా గుట్కా తినాలనిపించినప్పుడు లవంగాలు లేదా సోంపు నమలండి. "
                "ఉచిత ప్రభుత్వ సహాయం కోసం 1800 11 2356 కు కాల్ చేయండి. "
                "పొగాకు మానేయడం మీ నోటి ఆరోగ్యాన్ని కాపాడుతుంది."
            )
        elif lang == "hi":
            content = (
                "### 🚭 तंबाकू, गुटखा और बीड़ी छोड़ने के उपाय (Tobacco Cessation Guide)\n\n"
                "गुटखा, खैनी, तंबाकू और बीड़ी का सेवन मुंह की अंदरूनी परत को कठोर बना देता है, जिससे मुंह का खुलना कम (OSMF) और कैंसर पूर्व घाव हो सकते हैं।\n\n"
                "**छोड़ने के व्यावहारिक उपाय:**\n"
                "1. **स्वस्थ विकल्प अपनाएं:** जब भी गुटखा या तंबाकू की तलब लगे, लौंग, इलायची या सौंफ चबाएं।\n"
                "2. **5-मिनट की देरी तकनीक:** तलब आम तौर पर 3 से 5 मिनट में कम हो जाती है। गहरी सांस लें और ठंडा पानी पिएं।\n"
                "3. **घर से सभी पैकेट हटाएं:** तंबाकू और गुटखे के सभी पैकेट तुरंत फेंक दें।\n\n"
                "📞 **राष्ट्रीय तंबाकू मुक्ति टोल-फ्री हेल्पलाइन:** मुफ्त परामर्श के लिए **1800-11-2356** पर कॉल करें।"
            )
            speech = (
                "गुटखा या तंबाकू की तलब लगने पर लौंग या सौंफ चबाएं। "
                "सरकारी टोल फ्री नंबर 1800 11 2356 पर कॉल करके मुफ्त सहायता प्राप्त करें।"
            )
        elif lang == "ta":
            content = (
                "### 🚭 புகையிலை மற்றும் குட்கா பழக்கத்தை கைவிடுதல்\n\n"
                "குட்கா, புகையிலை மற்றும் பீடி பழக்கம் வாயில் தசை இறுக்கம் (OSMF) மற்றும் புற்றுநோய் புண்களை உருவாக்கும்.\n\n"
                "**பயனுள்ள வழிகள்:**\n"
                "1. ஆசை வரும்போது கிராம்பு, ஏலக்காய் அல்லது பெருஞ்சீரகம் மெல்லவும்.\n"
                "2. நிறைய தண்ணீர் குடிக்கவும்.\n\n"
                "📞 **இலவச உதவி எண்:** **1800-11-2356** என்ற எண்ணை அழைத்து இலவச ஆலோசனையைப் பெறலாம்."
            )
            speech = "புகையிலை ஆசை வரும்போது கிராம்பு மெல்லவும். உதவிக்கு 1800 11 2356 அழைக்கவும்."
        elif lang == "kn":
            content = (
                "### 🚭 ತಂಬಾಕು ಮತ್ತು ಗುಟ್ಕಾ ತ್ಯಜಿಸುವ ಮಾರ್ಗಸೂಚಿ\n\n"
                "ಗುಟ್ಕಾ, ಖೈನಿ ಮತ್ತು ತಂಬಾಕು ಸೇವನೆಯಿಂದ ಬಾಯಿ ತೆರೆಯುವುದು ಕಡಿಮೆಯಾಗುತ್ತದೆ (OSMF).\n\n"
                "**ಉಪಯುಕ್ತ ಸಲಹೆಗಳು:**\n"
                "1. ಆಸೆ ಬಂದಾಗ ಲವಂಗ ಅಥವಾ ಸೋಂಪನ್ನು ಜಗಿಯಿರಿ.\n"
                "2. ಸಾಕಷ್ಟು ನೀರು ಕುಡಿಯಿರಿ.\n\n"
                "📞 **ಉಚಿತ ಸಹಾಯವಾಣಿ:** **1800-11-2356** ಗೆ ಕರೆ ಮಾಡಿ ಉಚಿತ ಸಲಹೆ ಪಡೆಯಿರಿ."
            )
            speech = "ತಂಬಾಕು ಬಿಡಲು ಲವಂಗ ಅಥವಾ ಸೋಂಪು ಜಗಿಯಿರಿ. ಉಚಿತ ಸಹಾಯವಾಣಿ 1800 11 2356 ಗೆ ಕರೆ ಮಾಡಿ."
        elif lang == "ml":
            content = (
                "### 🚭 പുകയിലയും ഗുട്കയും ഒഴിവാക്കാനുള്ള വഴികൾ\n\n"
                "പുകയില, ഗുട്ക എന്നിവ വായ തുറക്കാൻ കഴിയാത്ത അവസ്ഥയ്ക്കും (OSMF) അർബുദത്തിനും കാരണമാകാം.\n\n"
                "1. പുകയില ഉപയോഗിക്കാൻ തോന്നുമ്പോൾ ഗ്രാമ്പൂ അല്ലെങ്കിൽ പെരുംജീരകം ചവയ്ക്കുക.\n"
                "2. ധാരാളം വെള്ളം കുടിക്കുക.\n\n"
                "📞 **സൗജന്യ ഹെൽപ്പ്‌ലൈൻ:** **1800-11-2356**."
            )
            speech = "പുകയില ഉപേക്ഷിക്കാൻ ഗ്രാമ്പൂ ചവയ്ക്കുക. സൗജന്യ ഹെൽപ്പ്‌ലൈൻ 1800 11 2356."
        else:
            content = (
                "### 🚭 Tobacco, Gutkha & Chutta Cessation Strategies\n\n"
                "#### 🗣️ 1. Plain Advice for Patients & Families:\n"
                "Chewing gutkha, khaini, betel nut, or reverse smoking (chutta) directly damages delicate oral tissues. Quitting allows tissues to heal and reduces cancer risk immediately.\n"
                "• **Healthy Oral Substitutes:** When cravings strike, chew cloves, cardamom pods, fennel seeds, or sugar-free gum.\n"
                "• **The 5-Minute Delay Technique:** Cravings typically peak and subside within 3 to 5 minutes. Take slow deep breaths and drink a glass of cold water.\n"
                "• **Free Support:** Call the National Tobacco Quitline at **1800-11-2356** for free, confidential telephone counseling.\n\n"
                "#### 👩‍⚕️ 2. Field Action Guide for ASHA Workers & Health Staff:\n"
                "✓ Inquire on daily habit frequency, pack-years, and whether patient swallows the tobacco juice.\n"
                "✓ Examine buccal mucosa for whitening, blanching, or ulceration. Check mouth opening.\n"
                "✓ Motivate tobacco cessation with village peer support and arrange PHC checkup.\n\n"
                "#### 🩺 3. Clinical Directives for Doctors & PHC Staff:\n"
                "Administer Fagerström Test for Nicotine Dependence (FTND). Provide 5 A's counseling (Ask, Advise, Assess, Assist, Arrange). Consider Nicotine Replacement Therapy (NRT chewing gum 2mg/4mg) and maintain 3-to-6-month visual surveillance."
            )
            speech = (
                "When you experience tobacco or gutkha cravings, chew cloves or fennel seeds and drink cold water. "
                "You can also call the National Tobacco Quitline at 1800 11 2356 for free counseling support."
            )

        return {
            "content": content,
            "speech_text": speech,
            "is_emergency": False,
            "urgency": "routine_review",
            "disclaimer": "National Tobacco Control Programme (NTCP) recommendations."
        }

    def _build_burning_osmf_response(self, lang: str) -> Dict[str, Any]:
        if lang == "te":
            content = (
                "### 🌶️ కారం తిన్నప్పుడు మంట & నోరు తెరవలేకపోవడం (Burning Mouth & OSMF)\n\n"
                "#### 🗣️ 1. రోగులకు సులభమైన వివరణ (For Patients & Families):\n"
                "కారం తిన్నప్పుడు నోరు తీవ్రంగా మండడం మరియు నోరు సరిగ్గా తెరవలేకపోవడం సాధారణంగా వక్క లేదా గుట్కా వల్ల వచ్చే నోటి బిగుతు (OSMF).\n"
                "• **వెంటనే ఆపండి:** వక్క, సుపారీ, గుట్కా మరియు ఖైనీని తక్షణమే పూర్తిగా నిలిపివేయండి. వక్కలోని రసాయనం నోటిని గట్టిగా చేస్తుంది.\n"
                "• **ఆహార జాగ్రత్తలు:** కారం, పులుపు, వేడి పదార్థాలను తగ్గించి, చల్లని మరియు మృదువైన ఆహారం తీసుకోండి.\n"
                "• **నోరు బలవంతంగా తెరవద్దు:** నోటిని బలవంతంగా లాగవద్దు, మృదువైన వ్యాయామాలు మాత్రమే చేయండి.\n\n"
                "#### 👩‍⚕️ 2. ఆశా కార్యకర్తలు & PHC సిబ్బందికి (For ASHA Workers):\n"
                "✓ **3-వేళ్ళ పరీక్ష (3-Finger Test):** రోగి నోట్లోకి 3 వేళ్ళు నిలువుగా పడుతున్నాయా చూడండి. 3 వేళ్ళు పట్టకపోతే (<35mm), ఇది OSMF సంకేతం.\n"
                "✓ బుగ్గల లోపలి భాగంలో తెల్లటి పీచు చారలు (fibrous bands) ఉన్నాయా పరిశీలించండి.\n"
                "✓ తక్షణమే PHC మెడికల్ ఆఫీసర్‌కు రిఫరల్ నమోదు చేసి 48-72 గంటల్లో డాక్టర్ చెకప్ చేయించండి.\n\n"
                "#### 🩺 3. వైద్యులు & క్లినికల్ ప్రోటోకాల్ (For Doctors & Specialists):\n"
                "Clinical Diagnosis: Oral Submucous Fibrosis (ICD-10 K13.5). Measure interincisal distance (Grade I: >35mm, Grade II: 30-35mm, Grade III: 20-30mm, Grade IV: <20mm). Initiate antioxidant therapy (Lycopene 10-16mg/day + Vitamin E + Zinc). Evaluate for intralesional hyaluronidase/dexamethasone or surgical fibrotomy for advanced trismus."
            )
            speech = (
                "కారం తిన్నప్పుడు నోరు మండడం మరియు నోరు తెరవడం తగ్గడం ఓరల్ సబ్‌మ్యూకస్ ఫైబ్రోసిస్ లక్షణం కావచ్చు. "
                "దయచేసి వక్క మరియు గుట్కా వెంటనే ఆపండి, సమీప పీహెచ్‌సీ డాక్టర్‌ను సంప్రదించండి."
            )
        elif lang == "hi":
            content = (
                "### 🌶️ तीखा खाने पर मुंह में जलन और मुंह कम खुलना (OSMF Warning Signs)\n\n"
                "मिर्च-मसालेदार खाना खाने पर तेज जलन और मुंह पूरा न खुल पाना (मुंह में अकड़न) **ओरल सबम्यूकस फाइब्रोसिस (OSMF)** के प्रमुख शुरुआती लक्षण हैं।\n\n"
                "**ज़रूरी सावधानियां:**\n"
                "• **सुपारी और गुटखा तुरंत बंद करें:** सुपारी में मौजूद एरीकोलीन मुंह की अंदरूनी त्वचा को सख्त बना देता है।\n"
                "• **3-उंगली परीक्षण:** यदि मुंह में लंबवत 3 उंगलियां नहीं जातीं (<35 मिमी), तो यह ट्रिस्मस (मुंह का सिकुड़ना) है।\n"
                "• **नरम और सादा भोजन लें:** मिर्च और गरम मसाले बिल्कुल न खाएं।\n\n"
                "👉 कृपया शीघ्र अपने नजदीकी PHC डॉक्टर से जांच करवाएं।"
            )
            speech = (
                "तीखा खाने पर जलन और मुंह कम खुलना ओरल सबम्यूकस फाइब्रोसिस के लक्षण हैं। "
                "सुपारी और गुटखा तुरंत बंद करें और डॉक्टर से जांच कराएं।"
            )
        elif lang == "ta":
            content = (
                "### 🌶️ காரமான உணவு சாப்பிடும்போது வாய் எரிச்சல் மற்றும் வாய் இறுக்கம் (OSMF)\n\n"
                "காரம் சாப்பிடும்போது வாய் எரிவதும், வாய் முழுமையாக திறக்க முடியாமல் போவதும் **ஓரல் சப்மியூகஸ் ஃபைப்ரோஸிஸ் (OSMF)** அறிகுறிகளாகும்.\n\n"
                "• பாக்கு, குட்கா பழக்கத்தை உடனடியாக நிறுத்தவும்.\n"
                "• 3 விரல்கள் வாய்க்குள் நுழையவில்லை என்றால் (<35 mm), உடனடியாக மருத்துவரை அணுகவும்.\n"
                "• காரத்தை குறைக்கவும்."
            )
            speech = "வாய் எரிச்சல் மற்றும் வாய் திறக்க முடியாமைக்கு பாக்கு குட்காவை உடனே நிறுத்தி மருத்துவரை அணுகவும்."
        elif lang == "kn":
            content = (
                "### 🌶️ ಖಾರ ತಿಂದಾಗ ಬಾಯಿ ಉರಿ ಮತ್ತು ಬಾಯಿ ತೆರೆಯಲು ಕಷ್ಟವಾಗುವುದು (OSMF)\n\n"
                "ಖಾರ ತಿಂದಾಗ ಬಾಯಿ ಉರಿಯುವುದು ಮತ್ತು ಬಾಯಿ ಪೂರ್ಣವಾಗಿ ತೆರೆಯಲು ಸಾಧ್ಯವಾಗದಿರುವುದು **ಓರಲ್ ಸಬ್‌ಮ್ಯೂಕಸ್ ಫೈಬ್ರೋಸಿಸ್ (OSMF)** ಲಕ್ಷಣಗಳಾಗಿವೆ.\n\n"
                "• ಅಡಿಕೆ ಮತ್ತು ಗುಟ್ಕಾ ಸೇವನೆಯನ್ನು ತಕ್ಷಣವೇ ನಿಲ್ಲಿಸಿ.\n"
                "• 3 ಬೆರಳುಗಳು ಬಾಯಿಯೊಳಗೆ ಲಂಬವಾಗಿ ಹೋಗದಿದ್ದರೆ (<35 mm), ತಕ್ಷಣ ವೈದ್ಯರನ್ನು ಭೇಟಿ ಮಾಡಿ."
            )
            speech = "ಬಾಯಿ ಉರಿ ಮತ್ತು ಬಾಯಿ ಬಿಗಿತಕ್ಕೆ ಅಡಿಕೆ ಗುಟ್ಕಾ ನಿಲ್ಲಿಸಿ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ."
        elif lang == "ml":
            content = (
                "### 🌶️ എരിവുള്ള ഭക്ഷണം കഴിക്കുമ്പോഴുള്ള എരിച്ചിലും വായ തുറക്കാനുള്ള ബുദ്ധിമുട്ടും (OSMF)\n\n"
                "എരിവ് കഴിക്കുമ്പോൾ അസഹ്യമായ എരിച്ചിലും വായ തുറക്കാൻ ബുദ്ധിമുട്ടും ഉണ്ടാകുന്നത് **ഓറൽ സബ്മ്യൂക്കസ് ഫൈബ്രോസിസ് (OSMF)** ലക്ഷണമാണ്.\n\n"
                "• അടയ്ക്കയും ഗുട്കയും പൂർണ്ണമായും ഒഴിവാക്കുക.\n"
                "• മൂന്ന് വിരലുകൾ വായയിൽ കടത്താൻ സാധിക്കുന്നില്ലെങ്കിൽ (<35 mm), ഉടൻ ഡോക്ടറെ കാണുക."
            )
            speech = "വായയിലെ എരിച്ചിലിനും വായ തുറക്കാൻ കഴിയാത്തതിനും അടയ്ക്ക ഒഴിവാക്കി ഡോക്ടറെ കാണുക."
        else:
            content = (
                "### 🌶️ Burning Mouth Sensation & Reduced Mouth Opening (OSMF Warning Signs)\n\n"
                "#### 🗣️ 1. Plain Advice for Patients & Families:\n"
                "A persistent burning sensation when eating spicy foods, combined with difficulty opening the mouth wide, are classic early signs of Oral Submucous Fibrosis (OSMF).\n"
                "• **Immediate Cessation of Areca Nut & Gutkha:** Arecoline alkaloids stimulate excessive collagen deposition, causing progressive stiffening.\n"
                "• **Soothing Bland Diet:** Avoid chilies, black pepper, and very hot or acidic foods that burn exposed nerve endings.\n\n"
                "#### 👩‍⚕️ 2. Field Action Guide for ASHA Workers & Health Staff:\n"
                "✓ **The 3-Finger Test:** Can the patient insert 3 fingers vertically between their front teeth? If only 1 or 2 fingers fit (<30mm), trismus is confirmed.\n"
                "✓ Inspect buccal mucosa for pale, marble-white fibrous bands.\n"
                "✓ Prioritize referral to PHC Medical Officer within 48–72 hours.\n\n"
                "#### 🩺 3. Clinical Mandate for Doctors & Specialists:\n"
                "Classify OSMF Stage (Grade I: >35mm, Grade II: 30-35mm, Grade III: 20-30mm, Grade IV: <20mm). Prescribe Lycopene (10-16mg/day) + Alpha-tocopherol. Monitor for dysplastic transformation and avoid sharp dental trauma."
            )
            speech = (
                "Burning sensation on eating spicy food combined with restricted mouth opening are early signs of Oral Submucous Fibrosis. "
                "Stop all areca nut and gutkha immediately, and schedule an examination with your PHC Medical Officer."
            )

        return {
            "content": content,
            "speech_text": speech,
            "is_emergency": False,
            "urgency": "prompt_assessment",
            "disclaimer": "ICMR Guidelines for Management of Oral Submucous Fibrosis."
        }

    def _build_patches_response(self, lang: str) -> Dict[str, Any]:
        if lang == "te":
            content = (
                "### ⚪ నోటిలో తెల్లటి లేదా ఎర్రటి మచ్చలు (Oral Mucosal Patches - Leukoplakia & Erythroplakia)\n\n"
                "#### 🗣️ 1. రోగులకు సులభమైన వివరణ (For Patients & Families):\n"
                "నోటి బుగ్గపై లేదా నాలుకపై తెల్లటి లేదా ఎర్రటి మచ్చలు రావడం పంటి రాపిడి, పొగాకు లేదా ఇతర కారణాల వల్ల కావచ్చు.\n"
                "• **చేయకూడనివి:** మచ్చను గోకడం, సున్నం లేదా ఇతర రసాయనాలు పూయడం చేయవద్దు.\n"
                "• **డాక్టర్ పరీక్ష ఎందుకు:** ఈ మచ్చలు కొన్నిసార్లు ముందస్తు జాగ్రత్తలు అవసరమైనవి కావచ్చు, కాబట్టి డాక్టర్ పరిశీలన ముఖ్యం.\n\n"
                "#### 👩‍⚕️ 2. ఆశా కార్యకర్తలు & PHC సిబ్బందికి (For ASHA Workers):\n"
                "✓ తడి దూదితో తుడిచి చూడండి (Wipe Test): మచ్చ తుడుచుకుపోతే అది ఫంగల్ ఇన్ఫెక్షన్ (Thrush) కావచ్చు; తుడిచినా పోకపోతే అది ల్యూకోప్లాకియా.\n"
                "✓ ఎర్రటి మచ్చలు (Erythroplakia) కనిపిస్తే అది అత్యంత ప్రాధాన్యత కలిగినదిగా గుర్తించండి.\n"
                "✓ రోగిని PHC వైద్యాధికారి వద్దకు తీసుకెళ్ళండి.\n\n"
                "#### 🩺 3. వైద్యులు & క్లినికల్ ప్రోటోకాల్ (For Doctors & Specialists):\n"
                "Clinical Assessment: Oral Potentially Malignant Disorder (OPMD) - Leukoplakia (homogeneous vs speckled/verrucous) / Erythroplakia. Mandatory MoHFW & ICMR protocol: Any persistent patch not resolving within 14 days after eliminating local irritation requires diagnostic punch/incisional biopsy."
            )
            speech = (
                "నోటిలోని తెల్లటి లేదా ఎర్రటి మచ్చలను వైద్యులు తప్పనిసరిగా పరిశీలించాలి. "
                "ఫొటోల ద్వారా క్యాన్సర్ నిర్ధారణ చేయడం అసాధ్యం, డాక్టర్ గారి పరీక్ష మరియు బయాప్సీ తప్పనిసరి."
            )
        elif lang == "hi":
            content = (
                "### ⚪ मुंह में सफेद या लाल दाग (Oral Mucosal Patches)\n\n"
                "गाल के अंदर या जीभ पर बनने वाले दाग ल्यूकोप्लाकिया (सफेद दाग) या एरिथ्रोप्लाकिया (लाल मखमली दाग) हो सकते हैं।\n\n"
                "**मुख्य बातें:**\n"
                "1. **सफेद दाग जो खुरचने पर नहीं हटते:** यह तंबाकू, बीड़ी या तेज दांत की रगड़ से हो सकते हैं।\n"
                "2. **लाल दाग (Erythroplakia):** लाल दागों में जोखिम अधिक होता है, इनकी तुरंत डॉक्टर से जांच करानी चाहिए।\n\n"
                "⚠️ **अनिवार्य नियम:** फोटो से कैंसर की पुष्टि या खंडन नहीं किया जा सकता। इसके लिए बायोप्सी अनिवार्य है।"
            )
            speech = (
                "मुंह के सफेद या लाल दागों की जांच डॉक्टर से कराना अनिवार्य है। "
                "फोटो से कैंसर तय नहीं हो सकता, बायोप्सी जांच जरूरी है।"
            )
        elif lang == "ta":
            content = (
                "### ⚪ வாயில் வெள்ளை அல்லது சிவப்பு திட்டுகள்\n\n"
                "வாயினுள் ஏற்படும் திட்டுகள் லுகோபிளாக்கியா (வெள்ளை திட்டு) அல்லது எரித்ரோபிளாக்கியா (சிவப்பு திட்டு) ஆக இருக்கலாம்.\n\n"
                "⚠️ **முக்கிய எச்சரிக்கை:** புகைப்படங்கள் மூலம் புற்றுநோயை உறுதிப்படுத்த முடியாது. திசு பரிசோதனை (Biopsy) கட்டாயம்."
            )
            speech = "வெள்ளை அல்லது சிவப்பு திட்டுகளுக்கு மருத்துவரை நேரில் அணுகி பயாப்ஸி பரிசோதனை செய்து கொள்ளவும்."
        elif lang == "kn":
            content = (
                "### ⚪ ಬಾಯಿಯಲ್ಲಿ ಬಿಳಿ ಅಥವಾ ಕೆಂಪು ಮಚ್ಚೆಗಳು\n\n"
                "ಇವು ಲ್ಯೂಕೋಪ್ಲಾಕಿಯಾ ಅಥವಾ ಎರಿಥ್ರೋಪ್ಲಾಕಿಯಾ ಲಕ್ಷಣವಾಗಿರಬಹುದು.\n\n"
                "⚠️ **ವೈದ್ಯಕೀಯ ಎಚ್ಚರಿಕೆ:** ಫೋಟೋದ ಮೂಲಕ ಕ್ಯಾನ್ಸರ್ ತೀರ್ಮಾನಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ಬಯಾಪ್ಸಿ ಪರೀಕ್ಷೆ ಕಡ್ಡಾಯ."
            )
            speech = "ಬಿಳಿ ಅಥವಾ ಕೆಂಪು ಮಚ್ಚೆಗಳನ್ನು ವೈದ್ಯರಿಗೆ ತೋರಿಸಿ ಬಯಾಪ್ಸಿ ಪರೀಕ್ಷೆ ಮಾಡಿಸಿಕೊಳ್ಳುವುದು ಕಡ್ಡಾಯ."
        elif lang == "ml":
            content = (
                "### ⚪ വായിലെ വെളുത്തതോ ചുവന്നതോ ആയ പാടുകൾ\n\n"
                "ഇവ ല്യൂക്കോപ്ലാകിയ അല്ലെങ്കിൽ എറിത്രോപ്ലാകിയ ആകാം.\n\n"
                "⚠️ **പ്രത്യേക അറിയിപ്പ്:** ഫോട്ടോ കണ്ട് ക്യാൻസർ നിർണ്ണയിക്കാൻ കഴിയില്ല. ബയോപ്സി പരിശോധന നിർബന്ധമാണ്."
            )
            speech = "വായിലെ വെളുത്തതോ ചുവന്നതോ ആയ പാടുകൾക്ക് ഡോക്ടറെ കണ്ട് ബയോപ്സി ചെയ്യുക."
        else:
            content = (
                "### ⚪ Clinical Guidance on White & Red Oral Patches\n\n"
                "#### 🗣️ 1. Plain Advice for Patients & Families:\n"
                "Persistent white patches (Leukoplakia) or fiery red velvet patches (Erythroplakia) on the buccal mucosa or tongue are categorized as Oral Potentially Malignant Disorders (OPMD).\n"
                "• Do not attempt to scrape or peel the lesion, or apply caustic herbs/lime.\n"
                "• Arrange an in-person doctor evaluation promptly.\n\n"
                "#### 👩‍⚕️ 2. Field Action Guide for ASHA Workers & Health Staff:\n"
                "✓ Wipe Test: Attempt to gently wipe lesion with sterile wet gauze. If non-scrapable, leukoplakia is suspected.\n"
                "✓ Red velvety patches (erythroplakia) carry higher risk and warrant urgent referral within 48h.\n\n"
                "#### 🩺 3. Clinical Mandate for Doctors & Specialists:\n"
                "Stratify into homogeneous vs non-homogeneous leukoplakia. Mandatory MoHFW & ICMR protocol: In-person bimanual palpation and diagnostic punch biopsy for non-resolving lesions persisting >14 days."
            )
            speech = (
                "White and red oral patches should always be evaluated in person by a clinician. "
                "Photographs cannot diagnose cancer; in-person examination and biopsy are mandatory."
            )

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
                content = (
                    "మీరు జతచేసిన ఫొటోను Google MedGemma 1.5 4B మల్టీమోడల్ విజన్ ఇంజిన్ మరియు MoHFW/ICMR/WHO మార్గదర్శకాల ఆధారంగా పరిశీలించాను. "
                    "పై నివేదికలోని ప్రాథమిక పరిశీలనలు మరియు క్లినికల్ సిఫార్సులను గమనించండి.\n\n"
                    "**తదుపరి తీసుకోవలసిన జాగ్రత్తలు:**\n"
                    "1. పుండుపై ఘాటైన మసాలాలు, వేడి లేదా ఆమ్ల సంబంధిత ఆహారాలను తగలనివ్వవద్దు.\n"
                    "2. పొగాకు, గుట్కా, ఖైనీ లేదా ధూమపానం అలవాట్లు ఉంటే తక్షణమే నిలిపివేయండి.\n"
                    "3. ⚠️ **ముఖ్యమైన ఆదేశం:** 14 రోజుల కంటే ఎక్కువ రోజులు తగ్గని ఏ పుండు లేదా మచ్చకైనా సమీప PHC మెడికల్ ఆఫీసర్ లేదా డెంటల్ సర్జన్ గారిచే **ప్రత్యక్ష బయాప్సీ (Biopsy)** పరీక్ష తప్పనిసరి."
                )
                speech = "మీరు పంపిన ఫొటో ప్రాథమిక విశ్లేషణ పూర్తయింది. 14 రోజుల కంటే ఎక్కువ రోజులు తగ్గని పుండుకు డాక్టర్ గారి ప్రత్యక్ష పరీక్ష మరియు బయాప్సీ తప్పనిసరి."
            elif lang == "hi":
                content = (
                    "मैंने आपकी भेजी गई फोटो का Google MedGemma 1.5 4B विज़न मॉडल और MoHFW दिशानिर्देशों के अनुसार प्राथमिक विश्लेषण किया है। "
                    "कृपया ऊपर दी गई दृश्य टिप्पणियों और सिफारिशों को ध्यान से देखें।\n\n"
                    "**सावधानियां:**\n"
                    "1. तीखे, गर्म और मसालेदार भोजन से परहेज करें।\n"
                    "2. गुटखा, खैनी, तंबाकू और बीड़ी तुरंत बंद करें।\n"
                    "3. ⚠️ **अनिवार्य नियम:** 14 दिनों से अधिक पुराने किसी भी छाले या घाव के लिए PHC डॉक्टर से प्रत्यक्ष जांच और **बायोप्सी (Biopsy)** अनिवार्य है।"
                )
                speech = "आपकी फोटो का प्राथमिक विश्लेषण पूरा हो गया है। 14 दिनों से अधिक पुराने घाव के लिए डॉक्टर द्वारा बायोप्सी अनिवार्य है।"
            elif lang == "ta":
                content = (
                    "நீங்கள் இணைத்த புகைப்படத்தை Google MedGemma 1.5 4B மல்டிமாடல் விஷன் என்ஜின் மூலம் ஆய்வு செய்துள்ளேன். "
                    "மேலே உள்ள அவதானிப்புகள் மற்றும் மருத்துவ பரிந்துரைகளை கவனியுங்கள்.\n\n"
                    "⚠️ **கட்டாய எச்சரிக்கை:** 14 நாட்களுக்கு மேல் ஆறாத எந்த புண்ணுக்கும் மருத்துவரை நேரில் அணுகி பயாப்ஸி (Biopsy) பரிசோதனை செய்து கொள்வது கட்டாயம்."
                )
                speech = "புகைப்பட ஆய்வு நிறைவடைந்தது. 14 நாட்களுக்கு மேலான புண்களுக்கு நேரடி பயாப்ஸி பரிசோதனை கட்டாயம்."
            elif lang == "kn":
                content = (
                    "ನೀವು ಕಳುಹಿಸಿದ ಫೋಟೋವನ್ನು Google MedGemma 1.5 4B ಮಾದರಿಯ ಮೂಲಕ ಪರಿಶೀಲಿಸಲಾಗಿದೆ. "
                    "ಮೇಲಿನ ಪ್ರಾಥಮಿಕ ಲಕ್ಷಣಗಳು ಮತ್ತು ವೈದ್ಯಕೀಯ ಶಿಫಾರಸುಗಳನ್ನು ಗಮನಿಸಿ.\n\n"
                    "⚠️ **ಕಡ್ಡಾಯ ಎಚ್ಚರಿಕೆ:** 14 ದಿನಗಳಿಗಿಂತ ಹೆಚ್ಚು ಕಾಲ ವಾಸಿಯಾಗದ ಹುಣ್ಣಿಗೆ ವೈದ್ಯರಿಂದ ನೇರ ಪರೀಕ್ಷೆ ಮತ್ತು ಬಯಾಪ್ಸಿ ಕಡ್ಡಾಯವಾಗಿದೆ."
                )
                speech = "ಫೋಟೋ ಪರೀಕ್ಷೆ ಪೂರ್ಣಗೊಂಡಿದೆ. 14 ದಿನಕ್ಕಿಂತ ಹೆಚ್ಚಿನ ಹುಣ್ಣಿಗೆ ವೈದ್ಯರ ಭೇಟಿ ಮತ್ತು ಬಯಾಪ್ಸಿ ಕಡ್ಡಾಯ."
            elif lang == "ml":
                content = (
                    "നിങ്ങൾ അയച്ച ഫോട്ടോ Google MedGemma 1.5 4B ഉപയോഗിച്ച് പരിശോധിച്ചു. "
                    "മുകളിലെ കണ്ടെത്തലുകളും നിർദ്ദേശങ്ങളും ശ്രദ്ധിക്കുക.\n\n"
                    "⚠️ **പ്രത്യേക അറിയിപ്പ്:** 14 ദിവസത്തിൽ കൂടുതൽ നീണ്ടുനിൽക്കുന്ന വ്രണങ്ങൾക്ക് ഡോക്ടറുടെ നേരിട്ടുള്ള പരിശോധനയും ബയോപ്സിയും നിർബന്ധമാണ്."
                )
                speech = "ഫോട്ടോ പരിശോധന പൂർത്തിയായി. 14 ദിവസത്തിൽ കൂടുതൽ ഉള്ള വ്രണത്തിന് ഡോക്ടറെ കണ്ട് ബയോപ്സി ചെയ്യുക."
            else:
                content = (
                    "I have evaluated your uploaded clinical photograph through the Google MedGemma 1.5 4B Multimodal Vision Engine grounded in MoHFW and WHO protocols. "
                    "Please review the observable morphological findings and clinical recommendations outlined above.\n\n"
                    "**Clinical Recommendations:**\n"
                    "1. Avoid hot, spicy, rough, or irritating foods.\n"
                    "2. Cease all tobacco, gutkha, and areca nut habits immediately.\n"
                    "3. ⚠️ **Mandatory Medical Guardrail:** A photograph CANNOT rule in or rule out cancer. Under national protocols, any oral lesion lasting longer than 14 days requires an in-person physical clinical examination and specialist **diagnostic punch biopsy**."
                )
                speech = "The MedGemma preliminary image analysis is complete. In-person clinical examination and tissue biopsy are mandatory for persistent lesions."

            return {
                "content": content,
                "speech_text": speech,
                "is_emergency": False,
                "urgency": "prompt_assessment",
                "disclaimer": "MedGemma 1.5 4B Multimodal Visual Assessment."
            }

        if lang == "te":
            content = (
                f"నమస్కారం! నేను ఆరోగ్య మైత్ర AI. మీ ప్రశ్న: *\"{message}\"*\n\n"
                "మేము రోగులు, ఆశా కార్యకర్తలు మరియు వైద్యులందరికీ సులభంగా అర్థమయ్యే సాక్ష్యాధారిత మార్గదర్శకాలను అందిస్తాము:\n\n"
                "#### 🗣️ 1. రోగులకు (For Patients):\n"
                "నోటి పూత, పుండ్లు, పొగాకు మానేయడం లేదా సాధారణ ఆరోగ్య సందేహాలు అడగవచ్చు. ఫొటో పంపి ఇంట్లో పాటించవలసిన జాగ్రత్తలు తెలుసుకోవచ్చు.\n\n"
                "#### 👩‍⚕️ 2. ఆశా కార్యకర్తలు & PHC సిబ్బందికి (For ASHA Workers):\n"
                "ఫీల్డ్ స్క్రీనింగ్ చెక్‌లిస్ట్, 14-రోజుల నియమం, 3-వేళ్ళ నోటి కొలత మరియు రిఫరల్ ప్రాధాన్యతలను తనిఖీ చేయవచ్చు.\n\n"
                "#### 🩺 3. వైద్యులు & స్పెషలిస్టులకు (For Doctors & Specialists):\n"
                "క్లినికల్ మార్ఫాలజీ పరిశీలనలు, డిఫరెన్షియల్ డయాగ్నోసిస్ మరియు MoHFW/ICMR పంచ్ బయాప్సీ ప్రోటోకాల్స్ పొందవచ్చు.\n\n"
                "> ⚠️ *గమనిక: ఏదైనా నోటి పుండు 14 రోజులు దాటితే డాక్టర్ గారి ప్రత్యక్ష పరీక్ష తప్పనిసరి.*"
            )
            speech = (
                "నమస్కారం, నేను ఆరోగ్య మైత్ర AI. నోటి పూత, పుండ్లు, పొగాకు మానేయడం లేదా ఆరోగ్య సందేహాలపై మీరు నన్ను అడగవచ్చు."
            )
        elif lang == "hi":
            content = (
                f"नमस्ते! मैं आरोग्य मैत्र AI हूँ। आपका प्रश्न: *\"{message}\"*\n\n"
                "मैं स्वास्थ्य और परिवार कल्याण मंत्रालय (MoHFW) और WHO के दिशानिर्देशों पर आधारित साक्ष्य-आधारित जानकारी प्रदान करता हूँ।\n\n"
                "**आप किन विषयों पर पूछ सकते हैं:**\n"
                "• मुंह के छाले, घाव और जलन के उपाय\n"
                "• तंबाकू, गुटखा और बीड़ी छोड़ने के उपाय\n"
                "• मुंह कम खुलने (OSMF) की जानकारी\n"
                "• त्वचा, आंख या मुंह की फोटो भेजकर प्राथमिक विश्लेषण प्राप्त करना\n\n"
                "> ⚠️ *नोट: यह केवल स्वास्थ्य शिक्षा है। 14 दिनों से अधिक पुराने किसी भी घाव के लिए डॉक्टर से प्रत्यक्ष परामर्श लें।*"
            )
            speech = (
                "नमस्ते, मैं आरोग्य मैत्र AI हूँ। आप मुझसे मुंह के छाले, तंबाकू छोड़ने या स्वास्थ्य संबंधी सवाल पूछ सकते हैं।"
            )
        elif lang == "ta":
            content = (
                f"வணக்கம்! நான் ஆரோக்கிய மைத்ரா AI. உங்கள் கேள்வி: *\"{message}\"*\n\n"
                "MoHFW மற்றும் உலக சுகாதார அமைப்பு (WHO) வழிகாட்டுதல்களின்படி மருத்துவ ஆலோசனைகளை வழங்குகிறேன்.\n\n"
                "**நீங்கள் கேட்கக்கூடியவை:**\n"
                "• வாய் புண்கள் மற்றும் பராமரிப்பு\n"
                "• புகையிலை, குட்கா பழக்கத்தை கைவிடுவது\n"
                "• வாய் திறக்க முடியாமை (OSMF)\n"
                "• தோல் அல்லது கண் புகைப்படங்களை அனுப்பி முதற்கட்ட ஆய்வு பெறுவது\n\n"
                "> ⚠️ *குறிப்பு: இது மருத்துவ தகவல் மட்டுமே. 14 நாட்களுக்கு மேலான புண்களுக்கு மருத்துவரை அணுகவும்.*"
            )
            speech = "வணக்கம், நான் ஆரோக்கிய மைத்ரா AI. வாய் புண்கள் அல்லது புகையிலை பழக்கத்தை கைவிடுவது பற்றி என்னிடம் கேட்கலாம்."
        elif lang == "kn":
            content = (
                f"ನಮಸ್ಕಾರ! ನಾನು ಆರೋಗ್ಯ ಮೈತ್ರ AI. ನಿಮ್ಮ ಪ್ರಶ್ನೆ: *\"{message}\"*\n\n"
                "MoHFW ಮತ್ತು WHO ಮಾರ್ಗಸೂಚಿಗಳ ಆಧಾರದ ಮೇಲೆ ವೈದ್ಯಕೀಯ ಮಾಹಿತಿಯನ್ನು ಒದಗಿಸುತ್ತೇನೆ.\n\n"
                "**ನೀವು ಕೇಳಬಹುದಾದ ವಿಷಯಗಳು:**\n"
                "• ಬಾಯಿ ಹುಣ್ಣು ಮತ್ತು ಪರಿಹಾರಗಳು\n"
                "• ತಂಬಾಕು ಮತ್ತು ಗುಟ್ಕಾ ತ್ಯಜಿಸುವುದು\n"
                "• ಬಾಯಿ ಬಿಗಿತ (OSMF) ಮಾಹಿತಿ\n"
                "• ಫೋಟೋ ಕಳುಹಿಸಿ ಪ್ರಾಥಮಿಕ ಪರೀಕ್ಷೆ ಪಡೆಯುವುದು\n\n"
                "> ⚠️ *ಗಮನಿಸಿ: ಇದು ಮಾಹಿತಿ ಮಾತ್ರ. 14 ದಿನಕ್ಕಿಂತ ಹೆಚ್ಚಿನ ಸಮಸ್ಯೆಗೆ ವೈದ್ಯರನ್ನು ಭೇಟಿ ಮಾಡಿ.*"
            )
            speech = "ನಮಸ್ಕಾರ, ನಾನು ಆರೋಗ್ಯ ಮೈತ್ರ AI. ಬಾಯಿ ಹುಣ್ಣು ಅಥವಾ ಆರೋಗ್ಯ ಸಮಸ್ಯೆಗಳ ಬಗ್ಗೆ ನೀವು ನನ್ನನ್ನು ಕೇಳಬಹುದು."
        elif lang == "ml":
            content = (
                f"നമസ്കാരം! ഞാൻ ആരോഗ്യ മൈത്ര AI. നിങ്ങളുടെ ചോദ്യം: *\"{message}\"*\n\n"
                "MoHFW, ലോകാരോഗ്യ സംഘടന (WHO) മാർഗ്ഗനിർദ്ദേശങ്ങൾ അടിസ്ഥാനമാക്കിയുള്ള വിവരങ്ങൾ നൽകുന്നു.\n\n"
                "• വായ്പ്പുണ്ണ്, പുകയില ഉപേക്ഷിക്കൽ, OSMF വിവരങ്ങൾ\n"
                "• ഫോട്ടോ അയച്ച് പ്രാഥമിക വിലയിരുത്തൽ നേടാം\n\n"
                "> ⚠️ *കുറിപ്പ്: ഇത് വിവരങ്ങൾക്ക് മാത്രമാണ്. ഡോക്ടറുടെ പരിശോധന അത്യാവശ്യമാണ്.*"
            )
            speech = "നമസ്കാരം, ഞാൻ ആരോഗ്യ മൈത്ര AI. വായ്പ്പുണ്ണ് അല്ലെങ്കിൽ ആരോഗ്യ സംശയങ്ങൾ ചോദിക്കാം."
        else:
            content = (
                f"Hello! I am Aarogya Mytra AI. Regarding your query: *\"{message}\"*\n\n"
                "I provide evidence-grounded health education and multimodal visual analysis based on MoHFW National Oral Health Programme and WHO guidelines.\n\n"
                "**Topics I can help you with:**\n"
                "• Mouth ulcers, soothing saline rinses, and pain management\n"
                "• Tobacco, gutkha, and chutta cessation counseling\n"
                "• Early signs of Oral Submucous Fibrosis (OSMF) and trismus\n"
                "• Multimodal image assessment of oral, skin, eye, or wound photos\n\n"
                "> ⚠️ *Clinical Notice: This information is for health education only. A direct examination by a Medical Officer is required for any lesion lasting longer than 14 days.*"
            )
            speech = (
                "Hello, I am Aarogya Mytra AI. You can ask me about mouth sores, oral care, quitting tobacco, or attach an image for preliminary assessment."
            )

        return {
            "content": content,
            "speech_text": speech,
            "is_emergency": False,
            "urgency": "routine_review",
            "disclaimer": "Aarogya Mytra AI clinical education."
        }

medgemma_chat_engine = MedGemmaChatEngine()
