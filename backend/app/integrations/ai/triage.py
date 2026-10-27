import re
from typing import Dict, Any, List, Optional

EMERGENCY_RED_FLAGS = [
    r"chest\s*(pain|pressure|tightness)",
    r"breathing\s*(difficulty|trouble|shortness|severe)",
    r"stroke",
    r"unconscious",
    r"uncontrolled\s*bleed",
    r"sudden\s*vision\s*loss",
    r"sudden\s*numbness|face\s*droop",
    r"coughing\s*blood",
    r"severe\s*allergic\s*reaction|anaphylaxis",
    r"శ్వాస\s*ఆడకపోవడం",
    r"ఛాతీ\s*నొప్పి",
    r"రక్తం\s*వాంతి|రక్తం\s*కక్కడం",
    r"స్పృహ\s*తప్పడం",
    r"सांस\s*लेने\s*में\s*दिक्कत",
    r"सीने\s*में\s*दर्द"
]

CANCER_KEYWORDS = [
    r"\bcancer\b",
    r"\bcarcinoma\b",
    r"\btumor\b",
    r"\bmalignan",
    r"క్యాన్సర్",
    r"గడ్డ",
    r"పుట్టకురుపు",
    r"कैंसर",
    r"புற்றுநோய்",
    r"ക്യാൻസർ",
    r"ಕ್ಯಾನ್ಸರ್"
]

DISCLAIMERS = {
    "te": "గమనిక: ఈ AI సహాయకుడు కేవలం ప్రాథమిక ఆరోగ్య అవగాహన కొరకు మాత్రమే. ఇది వైద్య నిర్ధారణ (డయాగ్నోసిస్) కాదు మరియు క్యాన్సర్‌ను నిర్ధారించదు. ఏవైనా లక్షణాలు 2 వారాల కంటే ఎక్కువ కాలం ఉంటే సమీప PHC వైద్యుడిని సంప్రదించండి.",
    "en": "Medical Disclaimer: This AI assistant provides general health education only. It CANNOT diagnose or rule out cancer or any serious disease. If any sore or patch lasts longer than 2 weeks, please consult a PHC Medical Officer for an in-person clinical exam.",
    "hi": "अस्वीकरण: यह एआई सहायक केवल सामान्य स्वास्थ्य शिक्षा के लिए है। यह कैंसर या किसी गंभीर बीमारी का निदान नहीं करता है। 2 सप्ताह से अधिक समय तक रहने वाले किसी भी घाव के लिए कृपया पीएचसी डॉक्टर से परामर्श करें।",
    "ta": "பொறுப்புத் துறப்பு: இந்த AI உதவியாளர் பொதுவான சுகாதார கல்விக்காக மட்டுமே. இது புற்றுநோயை கண்டறியாது. 2 வாரங்களுக்கு மேல் நீடிக்கும் புண்களுக்கு PHC மருத்துவரை அணுகவும்.",
    "ml": "നിരാകരണം: ഈ AI സഹായി പൊതുവായ ആരോഗ്യ വിവരങ്ങൾക്കായി മാത്രമാണ്. ഇത് കാൻസർ രോഗനിർണ്ണയം നടത്തുന്നില്ല. 2 ആഴ്ചയിൽ കൂടുതൽ നീണ്ടുനിൽക്കുന്ന വ്രണങ്ങൾക്ക് പിഎച്ച്സി ഡോക്ടറെ സമീപിക്കുക.",
    "kn": "ಹಕ್ಕುತ್ಯಾಗ: ಈ AI ಸಹಾಯಕ ಕೇವಲ ಸಾಮಾನ್ಯ ಆರೋಗ್ಯ ಶಿಕ್ಷಣಕ್ಕಾಗಿ ಮಾತ್ರ. ಇದು ಕ್ಯಾನ್ಸರ್ ರೋಗನಿರ್ಣಯ ಮಾಡುವುದಿಲ್ಲ. 2 ವಾರಗಳಿಗಿಂತ ಹೆಚ್ಚು ಕಾಲ ಇರುವ ಹುಣ್ಣುಗಳಿಗೆ PHC ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ."
}

def detect_emergency_symptoms(text: str) -> Optional[str]:
    """Detect if symptoms match emergency red flags requiring immediate hospital care."""
    lower_text = text.lower()
    for pattern in EMERGENCY_RED_FLAGS:
        if re.search(pattern, lower_text):
            return "EMERGENCY_RED_FLAG_DETECTED"
    return None

def check_cancer_claim_guard(text: str) -> bool:
    """True if user is asking about or claiming cancer from photos/symptoms."""
    lower_text = text.lower()
    for pattern in CANCER_KEYWORDS:
        if re.search(pattern, lower_text):
            return True
    return False

def generate_safe_triage_guidance(category: str, symptoms: str, language: str = "te", has_image: bool = False) -> Dict[str, Any]:
    """
    Aarogya Mitra Clinical AI Agent:
    - Provides calm, rational, relevant clarity for minor patient doubts.
    - Never concludes or diagnoses cancer or tumors.
    - Advises practical home self-care (warm salt water, habit cessation, vitamin rich foods).
    - Sets clear threshold: If lasting > 14 days, see a PHC doctor.
    """
    lang = language if language in DISCLAIMERS else "en"
    disclaimer = DISCLAIMERS[lang]
    lower_symptoms = symptoms.lower()

    # 1. Emergency Escalation
    emergency_flag = detect_emergency_symptoms(symptoms)
    if emergency_flag:
        if lang == "te":
            msg = (
                "⚠️ అత్యవసర హెచ్చరిక: మీరు పేర్కొన్న లక్షణాలు తక్షణ వైద్య సహాయం అవసరమయ్యే అత్యవసర స్థితిని సూచిస్తున్నాయి. "
                "దయచేసి ఆలస్యం చేయకుండా వెంటనే సమీపంలోని ప్రభుత్వాసుపత్రి అత్యవసర విభాగానికి వెళ్లండి లేదా 108 కు కాల్ చేయండి."
            )
        else:
            msg = (
                "⚠️ EMERGENCY WARNING: The symptoms described indicate a potentially serious emergency requiring immediate medical care. "
                "Please proceed immediately to the nearest hospital Emergency Department or call 108 ambulance services."
            )
        return {
            "urgency": "urgent_warning",
            "visual_observations": "Emergency clinical warning signs detected in reported symptoms.",
            "recommendations": msg,
            "disclaimer": disclaimer,
            "is_emergency": True
        }

    # 2. Cancer Doubt Clarification (Crucial Guardrail)
    cancer_mention = check_cancer_claim_guard(symptoms)
    if cancer_mention or "is it cancer" in lower_symptoms or "cancer aa" in lower_symptoms:
        if lang == "te":
            cancer_clarification = (
                "దయచేసి ఆందోళన చెందకండి. నోటిలో వచ్చే సాధారణ పుండ్లు, కొరుక్కున్న గాయాలు లేదా తెల్లటి మచ్చలలో చాలావరకు క్యాన్సర్ కావు; "
                "ఇవి పోషకాహార లోపం (విటమిన్ బి12), వేడి లేదా కారం వల్ల రావచ్చు. "
                "\n\nముఖ్యమైన విషయం: కేవలం లక్షణాలు లేదా ఫొటోల ఆధారంగా AI లేదా ఎవరూ క్యాన్సర్‌ను నిర్ధారించలేరు లేదా తోసిపుచ్చలేరు. "
                "సరైన నిర్ధారణకు బయాప్సీ (కణజాల పరీక్ష) మరియు డాక్టర్ ప్రత్యక్ష పరిశీలన అవసరం. "
                "\n\nసలహా: పుండు లేదా మచ్చ 2 వారాల కంటే ఎక్కువ కాలం ఉంటే, వెంటనే సమీప PHC మెడికల్ ఆఫీసర్‌ను సంప్రదించి పరీక్ష చేయించుకోండి."
            )
        else:
            cancer_clarification = (
                "Please be reassured that the vast majority of mouth sores, white patches, and ulcers are completely harmless (benign). "
                "They are frequently caused by accidental cheek biting, nutritional deficiencies (like Vitamin B12 or iron), stress, or spicy foods. "
                "\n\nCrucial Clinical Boundary: Cancer cannot be diagnosed nor ruled out based on symptoms or photographic screening alone. "
                "Neither AI nor photographic images can conclude or rule out cancer. A definitive medical diagnosis requires an in-person physical examination and, if indicated, a tissue biopsy by a qualified doctor. "
                "\n\nWhen to seek care: If any oral sore, white patch, or swelling persists for more than 2 weeks (14 days) without healing, please visit your PHC Medical Officer for an evaluation."
            )
        return {
            "urgency": "priority",
            "visual_observations": "Patient expressed doubt regarding oral malignancy.",
            "recommendations": cancer_clarification,
            "disclaimer": disclaimer,
            "is_emergency": False
        }

    # 3. Common Minor Doubts & Self-Care Guidance

    # A. Mouth Ulcers / Canker Sores (నోటి పూత)
    if any(k in lower_symptoms for k in ["ulcer", "soor", "pootha", "పూత", "పుండు", "aphthous", "sore", "छाले"]):
        if lang == "te":
            rec = (
                "నోటి పూత (Mouth Ulcers) సాధారణంగా విటమిన్ బి లోపం, ఒత్తిడి, కారంగా ఉండే ఆహారం లేదా ప్రమాదవశాత్తు బుగ్గ కొరుక్కోవడం వల్ల వస్తుంది. "
                "\n\nఇంటి నివారణ చిట్కాలు:"
                "\n• గోరువెచ్చని నీటిలో కొద్దిగా ఉప్పు వేసి రోజుకు 2-3 సార్లు నోటిని పుక్కిలించండి (Saltwater rinses)."
                "\n• చాలా కారంగా, వేడిగా లేదా ఆమ్ల గుణం గల ఆహారాలను కొద్దిరోజులు నివారించండి."
                "\n• పండ్లు, కూరగాయలు మరియు పాలు వంటి విటమిన్-బి సమృద్ధిగా ఉండే ఆహారం తీసుకోండి."
                "\n• పుండు సాధారణంగా 7 నుండి 10 రోజుల్లో దానంతట అదే తగ్గిపోతుంది."
                "\n\nఎప్పుడు డాక్టర్‌ను కలవాలి: పుండు 14 రోజుల (2 వారాల) కంటే ఎక్కువ రోజులు తగ్గకుండా ఉంటే లేదా నొప్పి లేకుండా గట్టిగా ఉంటే తప్పనిసరిగా PHC డాక్టర్‌ను సంప్రదించండి."
            )
        else:
            rec = (
                "Mouth ulcers (canker sores) are very common and usually result from minor cheek bites, stress, spicy foods, or nutritional deficiencies (Vitamin B complex, Iron). "
                "\n\nHelpful self-care tips:"
                "\n• Rinse your mouth with warm salt water 2-3 times daily to soothe the tissues."
                "\n• Avoid excessively spicy, hot, or acidic foods until the sore heals."
                "\n• Maintain gentle oral hygiene and stay well hydrated."
                "\n• Most canker sores resolve on their own within 7 to 10 days."
                "\n\nWhen to see a doctor: If an ulcer lasts longer than 2 weeks without healing, grows larger, or becomes painless and firm, visit your PHC doctor."
            )
        return {
            "urgency": "routine",
            "visual_observations": "Common oral ulceration query.",
            "recommendations": rec,
            "disclaimer": disclaimer,
            "is_emergency": False
        }

    # B. Burning Sensation with Spicy Food (కారం తిన్నప్పుడు మంట)
    if any(k in lower_symptoms for k in ["burn", "spicy", "manta", "మంట", "కారం", "mirchi", "जलन"]):
        if lang == "te":
            rec = (
                "కారం లేదా వేడి ఆహారం తిన్నప్పుడు నోరు మంటగా ఉండటం నోటి లోపలి సున్నితమైన పొర దెబ్బతినడం వల్ల జరుగుతుంది. "
                "ఇది గుట్కా, ఖైనీ, తమలపాకులు లేదా చుట్ట కాల్చే అలవాటు ఉన్నవారిలో మరియు విటమిన్ లోపం ఉన్నవారిలో ఎక్కువగా కనిపిస్తుంది. "
                "\n\nముఖ్యమైన సలహా:"
                "\n• పొగాకు, గుట్కా, ఖైనీ మరియు చుట్ట అలవాట్లను వెంటనే పూర్తిగా నిలిపివేయండి."
                "\n• నోటిని మృదువుగా ఉంచడానికి కొబ్బరి నూనెతో లేదా మంచి నీటితో నోటిని కడగండి."
                "\n• మీ నోరు తెరవడం తగ్గిపోతున్నట్లు (3 వేళ్ళు పట్టకపోవడం) గమనిస్తే, ఇది OSMF కావచ్చు. వెంటనే PHC వైద్యుడిని సంప్రదించండి."
            )
        else:
            rec = (
                "A burning sensation when eating spicy foods indicates mucosal thinning or irritation. In tribal and rural communities, this is strongly linked to chewing gutkha, areca nut, or reverse smoking (chutta). "
                "\n\nRecommendations:"
                "\n• Stop all tobacco, gutkha, paan masala, and chutta usage immediately."
                "\n• Eat bland, soft foods and avoid spicy curries until mucosal inflammation settles."
                "\n• Check your mouth opening: if you can no longer fit 3 vertical fingers in your mouth, this may indicate OSMF (Oral Submucous Fibrosis). Consult your PHC doctor for early medical treatment."
            )
        return {
            "urgency": "priority",
            "visual_observations": "Oral burning sensation reported.",
            "recommendations": rec,
            "disclaimer": disclaimer,
            "is_emergency": False
        }

    # C. Quitting Tobacco, Gutkha, or Reverse Smoking (చుట్ట / పొగాకు మానేయడం)
    if any(k in lower_symptoms for k in ["chutta", "tobacco", "quit", "gutkha", "khaini", "చుట్ట", "పొగాకు", "గుట్కా", "తమలపాకు"]):
        if lang == "te":
            rec = (
                "పొగాకు మరియు రివర్స్ స్మోకింగ్ (చుట్ట వెలుగుతున్న భాగాన్ని నోట్లో పెట్టుకోవడం) నోటి ఆరోగ్యానికి చాలా ప్రమాదకరం. "
                "చుట్ట వల్ల వచ్చే తీవ్రమైన వేడి అంగిలి (palate) మరియు బుగ్గలపై తెల్లటి లేదా ఎర్రటి మార్పులకు దారితీస్తుంది. "
                "\n\nఅలవాటు మానేయడానికి ఆచరణాత్మక చిట్కాలు:"
                "\n• చుట్ట లేదా పొగాకు తినాలనిపించినప్పుడు లవంగం (clove) లేదా సోంపు నోట్లో వేసుకుని నమలండి."
                "\n• పుష్కలంగా నీరు త్రాగండి మరియు ప్రతిరోజూ వ్యాయామం లేదా నడక అలవాటు చేసుకోండి."
                "\n• పొగాకు మానేసిన కొన్ని వారాల్లోనే నోటి పొర సాధారణ స్థితికి చేరుకోవడం ప్రారంభమవుతుంది."
                "\n• మీ గ్రామంలోని ఆశా వర్కర్ లేదా PHC కౌన్సెలర్ సహాయం తీసుకోండి."
            )
        else:
            rec = (
                "Quitting chewing tobacco, gutkha, and especially reverse smoking (chutta with the burning end inside the mouth) is the single most effective step to protect your oral health. "
                "\n\nPractical tips to quit:"
                "\n• When a craving strikes, chew on a clove, cardamom, or fennel seeds instead."
                "\n• Drink a glass of water and wait 5 minutes; cravings usually pass quickly."
                "\n• Keep your mouth clean with regular rinses."
                "\n• Reach out to your local ASHA worker or PHC clinic for de-addiction guidance and support."
            )
        return {
            "urgency": "routine",
            "visual_observations": "Tobacco and habit cessation inquiry.",
            "recommendations": rec,
            "disclaimer": disclaimer,
            "is_emergency": False
        }

    # D. Bleeding Gums or Toothache (చిగుళ్ల రక్తస్రావం / పంటి నొప్పి)
    if any(k in lower_symptoms for k in ["gum", "bleed", "tooth", "teeth", "రక్తం", "చిగురు", "పన్ను", "నొప్పి"]):
        if lang == "te":
            rec = (
                "చిగుళ్ల నుంచి రక్తం రావడం సాధారణంగా చిగుళ్ల వాపు (Gingivitis) లేదా గట్టి బ్రషింగ్ వల్ల సంభవిస్తుంది. "
                "\n\nతీసుకోవలసిన జాగ్రత్తలు:"
                "\n• మృదువైన బ్రష్‌తో రోజుకు రెండుసార్లు సున్నితంగా పళ్ళు తోముకోండి."
                "\n• గోరువెచ్చని ఉప్పు నీటితో పుక్కిలించడం చిగుళ్ల వాపును తగ్గిస్తుంది."
                "\n• నిమ్మ, ఉసిరి వంటి విటమిన్-సి పుష్కలంగా ఉండే ఆహారాన్ని తీసుకోండి."
                "\n• రక్తస్రావం ఆగకపోయినా లేదా పంటి నొప్పి తీవ్రంగా ఉంటే PHC దంత వైద్యుడిని సంప్రదించండి."
            )
        else:
            rec = (
                "Bleeding gums are commonly caused by plaque accumulation (gingivitis) or aggressive tooth brushing. "
                "\n\nCare instructions:"
                "\n• Use a soft-bristled toothbrush and brush gently along the gum line."
                "\n• Warm salt water rinses help reduce gum swelling and bacterial buildup."
                "\n• Ensure adequate Vitamin C in your diet (fresh citrus fruits, amla)."
                "\n• If bleeding is persistent or accompanied by loose teeth, visit your PHC dental officer."
            )
        return {
            "urgency": "routine",
            "visual_observations": "Periodontal or dental query.",
            "recommendations": rec,
            "disclaimer": disclaimer,
            "is_emergency": False
        }

    # E. General Fallback Guidance
    if lang == "te":
        rec = (
            "మీరు అడిగిన ఆరోగ్య సమాచారానికి సంబంధించి ప్రాథమిక జాగ్రత్తలు:"
            "\n• నోటి పరిశుభ్రతను పాటించండి మరియు రోజుకు రెండుసార్లు గోరువెచ్చని నీటితో నోటిని శుభ్రం చేసుకోండి."
            "\n• పొగాకు, ధూమపానం, చుట్ట మరియు గుట్కా ఉత్పత్తులను నివారించండి."
            "\n• చిన్న చిన్న పుండ్లు సాధారణంగా 7-10 రోజుల్లో వాటంతట అవే తగ్గుతాయి."
            "\n• ఏవైనా మచ్చలు, పుండ్లు లేదా వాపులు 14 రోజుల కంటే ఎక్కువ సమయం కొనసాగితే PHC డాక్టర్‌ను సంప్రదించండి."
        )
    else:
        rec = (
            "General Oral & Community Health Guidance:"
            "\n• Maintain consistent oral hygiene with gentle brushing and warm water rinses."
            "\n• Completely avoid tobacco, gutkha, paan masala, and reverse smoking."
            "\n• Minor oral irritations usually heal within 7 to 10 days on their own."
            "\n• General Clinical Rule: Any oral patch, persistent ulcer, or swelling lasting beyond 14 days should be evaluated in person by a PHC Medical Officer."
        )

    return {
        "urgency": "routine",
        "visual_observations": "General community health question addressed.",
        "recommendations": rec,
        "disclaimer": disclaimer,
        "is_emergency": False
    }
