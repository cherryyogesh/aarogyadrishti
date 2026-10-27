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
    r"శ్వాస\s*ఆడకపోవడం", # Telugu: breathing difficulty
    r"ఛాతీ\s*నొప్పి",      # Telugu: chest pain
    r"सांस\s*लेने\s*में\s*दिक्कत", # Hindi
    r"सीने\s*में\s*दर्द"   # Hindi
]

CANCER_KEYWORDS = [
    r"\bcancer\b",
    r"\bcarcinoma\b",
    r"\btumor\b",
    r"\bmalignan",
    r"క్యాన్సర్",
    r"कैंसर"
]

DISCLAIMERS = {
    "te": "గమనిక: ఈ AI సమాచారం కేవలం ప్రాథమిక అవగాహన కొరకు మాత్రమే. ఇది వైద్య నిర్ధారణ (డయాగ్నోసిస్) కాదు. ఖచ్చితమైన నిర్ధారణ మరియు చికిత్స కోసం దయచేసి సమీప PHC వైద్యుడిని సంప్రదించండి.",
    "en": "Disclaimer: This AI analysis provides preliminary informational guidance only. It is NOT a medical diagnosis. Please consult a qualified PHC medical officer or specialist for definitive diagnosis and treatment.",
    "hi": "अस्वीकरण: यह एआई विश्लेषण केवल प्रारंभिक सूचनात्मक मार्गदर्शन प्रदान करता है। यह चिकित्सीय निदान नहीं है। कृपया निश्चित निदान और उपचार के लिए अपने निकटतम प्राथमिक स्वास्थ्य केंद्र (PHC) चिकित्सक से परामर्श करें।",
    "ta": "பொறுப்புத் துறப்பு: இந்த AI பகுப்பாய்வு முதற்கட்ட வழிகாட்டுதலுக்கு மட்டுமே. இது மருத்துவ நோயறிதல் அல்ல. முறையான சிகிச்சைக்கு PHC மருத்துவரை அணுகவும்.",
    "ml": "നിരാകരണം: ഈ AI വിശകലനം പ്രാഥമിക വിവരങ്ങൾ മാത്രമാണ് നൽകുന്നത്. ഇത് ഒരു മെഡിക്കൽ രോഗനിർണയമല്ല. കൃത്യമായ രോഗനിർണ്ണയത്തിനും ചികിത്സയ്ക്കുമായി ഒരു പിഎച്ച്സി ഡോക്ടറെ സമീപിക്കുക.",
    "kn": "ಹಕ್ಕುತ್ಯಾಗ: ಈ AI ವಿಶ್ಲೇಷಣೆಯು ಪ್ರಾಥಮಿಕ ಮಾರ್ಗದರ್ಶನ ಮಾತ್ರ. ಇದು ವೈದ್ಯಕೀಯ ರೋಗನಿರ್ಣಯವಲ್ಲ. ದಯವಿಟ್ಟು ನಿಖರವಾದ ಚಿಕಿತ್ಸೆಗಾಗಿ PHC ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ."
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
    Generates rule-based, clinically validated healthcare guidance strictly adhering
    to safety rules: never diagnoses cancer or infections from photos alone.
    """
    lang = language if language in DISCLAIMERS else "en"
    disclaimer = DISCLAIMERS[lang]

    # 1. Emergency Escalation
    emergency_flag = detect_emergency_symptoms(symptoms)
    if emergency_flag:
        if lang == "te":
            msg = (
                "⚠️ అత్యవసర హెచ్చరిక: మీరు పేర్కొన్న లక్షణాలు తక్షణ వైద్య సహాయం అవసరమయ్యే తీవ్రమైన స్థితిని సూచిస్తున్నాయి. "
                "దయచేసి ఆలస్యం చేయకుండా వెంటనే సమీపంలోని ప్రభుత్వాసుపత్రి అత్యవసర విభాగానికి (Emergency/108) వెళ్లండి."
            )
        elif lang == "hi":
            msg = (
                "⚠️ आपातकालीन चेतावनी: आपके द्वारा बताए गए लक्षण गंभीर स्थिति का संकेत हो सकते हैं जिसके लिए तत्काल चिकित्सा सहायता की आवश्यकता है। "
                "कृपया तुरंत नजदीकी अस्पताल के आपातकालीन विभाग में जाएं या 108 पर कॉल करें।"
            )
        else:
            msg = (
                "⚠️ EMERGENCY WARNING: The symptoms you described indicate a potentially serious emergency requiring immediate medical care. "
                "Please proceed immediately to the nearest hospital Emergency Department or call emergency ambulance services (108)."
            )
        return {
            "urgency": "urgent_warning",
            "visual_observations": "Emergency clinical warning signs detected in reported symptoms.",
            "recommendations": msg,
            "disclaimer": disclaimer,
            "is_emergency": True
        }

    # 2. Cancer Claim Barrier
    cancer_mention = check_cancer_claim_guard(symptoms)
    cancer_guard_note = ""
    if cancer_mention:
        if lang == "te":
            cancer_guard_note = (
                "మచ్చలు లేదా ఫొటోల ఆధారంగా మాత్రమే క్యాన్సర్‌ను నిర్ధారించడం లేదా తోసిపుచ్చడం సాధ్యం కాదు. "
                "కణజాల పరీక్ష (బయాప్సీ) మరియు నిపుణుల ప్రత్యక్ష పరిశీలన ద్వారా మాత్రమే సరైన నిర్ధారణ సాధ్యమవుతుంది. "
            )
        else:
            cancer_guard_note = (
                "Cancer cannot be diagnosed nor ruled out based on symptoms or photographic screening alone. "
                "A physical examination, biopsy, or specialist clinical pathology test is required. "
            )

    # 3. Categorical Guidance
    observations = []
    actions = []

    if category == "mouth":
        observations.append("Observed oral mucosal surface or visible oral lesion.")
        actions.append("Avoid tobacco, paan, spicy, or very hot foods.")
        actions.append("Maintain good oral hygiene with warm saltwater rinses.")
        actions.append("Ensure in-person clinical examination by a dental officer or PHC doctor.")
    elif category == "skin":
        observations.append("Observed visible skin eruption, redness, or surface variation.")
        actions.append("Keep the area clean, dry, and avoid scratching to prevent secondary bacterial infection.")
        actions.append("Do not apply unverified chemical steroid creams without a doctor's prescription.")
        actions.append("Consult the PHC doctor if redness spreads or swelling increases.")
    elif category == "wounds":
        observations.append("Observed surface skin breach or wound margin.")
        actions.append("Wash gently with clean sterile water and cover with a sterile dry dressing.")
        actions.append("Monitor for signs of infection (increased warmth, foul odor, yellowish pus, or spreading redness).")
        actions.append("Check Tetanus Toxoid vaccination status with PHC nurse.")
    elif category == "eye":
        observations.append("Observed external periocular area, conjunctiva, or eyelid margin.")
        observations.append("Note: Ordinary external photos cannot assess internal retinal or intraocular pressure conditions.")
        actions.append("Avoid rubbing eyes or using non-prescribed eye drops.")
        actions.append("Seek immediate evaluation if there is severe pain, photophobia, or vision changes.")
    elif category == "ear":
        observations.append("Observed external pinna or ear canal entrance.")
        observations.append("Note: Internal middle ear conditions require otoscopic examination.")
        actions.append("Keep the ear dry; do not insert cotton buds, pins, or foreign objects into the ear canal.")
    else:
        observations.append(f"Recorded visible abnormality for {category} category.")
        actions.append("Case logged for scheduled PHC clinical review and doctor triage.")

    full_rec = f"{cancer_guard_note} " + " ".join(actions)
    if lang == "te":
        full_rec += " దయచేసి PHC సమీక్ష తేదీన అపాయింట్‌మెంట్‌కు హాజరుకండి."

    return {
        "urgency": "priority" if cancer_mention or "severe" in symptoms.lower() else "routine",
        "visual_observations": " ".join(observations),
        "recommendations": full_rec.strip(),
        "disclaimer": disclaimer,
        "is_emergency": False
    }
