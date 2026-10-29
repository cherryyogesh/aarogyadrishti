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

    # 3. Common Infections & General Health Conditions

    # A. Fever / Pyrexia / Chills (జ్వరం, చలిజ్వరం, మలేరియా, డెంగ్యూ)
    if any(k in lower_symptoms for k in ["fever", "temp", "chill", "జ్వరం", "వేడి", "చలి", "bukhar", "taap", "ताप", "बुखार"]):
        if lang == "te":
            rec = (
                "🌡️ **జ్వరం వచ్చినప్పుడు తీసుకోవలసిన తక్షణ జాగ్రత్తలు & ప్రాథమిక సంరక్షణ:**"
                "\n\n**1. శరీరాన్ని చల్లబరచడం & విశ్రాంతి:**"
                "\n• సాధారణ నీటితో (మరీ చల్లని నీరు కాకుండా) శుభ్రమైన గుడ్డను తడిపి నుదురు, మెడ మరియు అరచేతులపై అద్దండి (Tepid sponging)."
                "\n• తేలికపాటి నూలు బట్టలు ధరించండి. దళసరి దుప్పట్లు కప్పుకోకండి."
                "\n• శరీరానికి తగినంత విశ్రాంతి తప్పనిసరి."
                "\n\n**2. శరీరంలో నీటిశాతం (హైడ్రేషన్) కాపాడుకోవడం:**"
                "\n• కాచి చల్లార్చిన నీరు, ఓఆర్ఎస్ (ORS) ద్రావణం, కొబ్బరి నీళ్ళు, లేదా గంజి నీళ్ళు తరచుగా త్రాగించండి."
                "\n• శరీరంలో నీటిశాతం తగ్గితే జ్వరం తీవ్రత మరియు నీరసం పెరుగుతాయి."
                "\n\n**3. మందుల వాడకం:**"
                "\n• అధిక జ్వరం (100°F పైన) మరియు ఒళ్లు నొప్పులు ఉంటే పారాసిటమాల్ (Paracetamol 500mg/650mg పెద్దలకు) ఆహారం తీసుకున్న తర్వాత మాత్రమే వేసుకోవచ్చు. (రోజుకు గరిష్టంగా 3-4 సార్లు మించరాదు)."
                "\n• డాక్టర్ సూచించకుండా యాంటీబయాటిక్స్ లేదా నొప్పి నివారణ మందులు (NSAIDs) సొంతంగా వాడరాదు."
                "\n\n**4. పాడేరు & ఏజెన్సీ మండలాల ముఖ్య గమనిక (మలేరియా & డెంగ్యూ పరీక్ష):**"
                "\n• మన ఏజెన్సీ ప్రాంతంలో జ్వరం వస్తే మలేరియా లేదా డెంగ్యూ అయ్యే అవకాశం ఉంటుంది. మీ గ్రామ ఆశా (ASHA) కార్యకర్త వద్ద రక్త పరీక్ష (Malaria RDT Kit) ఉచితంగా చేయించుకోండి."
                "\n\n🚨 **ఈ క్రింది ప్రమాదకర లక్షణాలు ఉంటే వెంటనే ఆసుపత్రికి వెళ్ళండి:**"
                "\n• జ్వరం 2 రోజుల కంటే ఎక్కువ తగ్గకపోవడం."
                "\n• తీవ్రమైన తలనొప్పి, మెడ బిగుసుకుపోవడం లేదా కళ్ళ వెనుక తీవ్ర నొప్పి."
                "\n• శ్వాస తీసుకోవడంలో ఇబ్బంది, నిరంతర వాంతులు లేదా ఫిట్స్ రావడం."
                "\n• చర్మంపై ఎర్రటి మచ్చలు లేదా చిగుళ్ళ నుండి రక్తస్రావం కావడం."
            )
        else:
            rec = (
                "🌡️ **Fever Management & Clinical Primary Care Guidance:**"
                "\n\n**1. Cooling & Rest:**"
                "\n• Apply a clean cloth dampened with room-temperature water to the forehead, neck, and armpits (Tepid sponging). Avoid ice-cold water."
                "\n• Wear light, breathable cotton clothing; avoid wrapping in heavy blankets."
                "\n• Ensure complete bed rest."
                "\n\n**2. Hydration & Fluids:**"
                "\n• Drink plenty of fluids: boiled and cooled water, ORS (Oral Rehydration Solution), tender coconut water, and light rice kanji with salt."
                "\n• Maintaining hydration is critical to help the body fight infection and prevent complications."
                "\n\n**3. Safe Medication:**"
                "\n• For temperature above 100°F (37.8°C) or body aches, Paracetamol (500mg/650mg for adults after food) may be taken every 6-8 hours (maximum 3-4 doses in 24 hours)."
                "\n• Do NOT self-medicate with unprescribed antibiotics, Aspirin, or heavy painkillers (NSAIDs)."
                "\n\n**4. Special ITDA Paderu Agency Notice (Malaria & Dengue Screening):**"
                "\n• In agency mandals, acute fever with chills or shivering must be screened for Malaria and Dengue. Contact your local ASHA worker for an immediate rapid diagnostic blood test (RDT)."
                "\n\n🚨 **Emergency Red Flags (Seek Immediate PHC / Hospital Care):**"
                "\n• Fever persisting beyond 48 hours without improvement."
                "\n• Stiff neck, extreme lethargy, confusion, or severe headache behind the eyes."
                "\n• Difficulty breathing, persistent vomiting, or inability to keep fluids down."
                "\n• Red pinpoint spots on skin, bleeding gums, or dark stools."
            )
        return {
            "urgency": "priority",
            "visual_observations": "Acute pyrexia / fever query addressed.",
            "recommendations": rec,
            "disclaimer": disclaimer,
            "is_emergency": False
        }

    # B. Cough, Cold, Sore Throat & Upper Respiratory Infection (దగ్గు, జలుబు, గొంతు నొప్పి)
    if any(k in lower_symptoms for k in ["cough", "cold", "sore throat", "throat", "phlegm", "runny", "sneeze", "దగ్గు", "జలుబు", "గొంతు", "కఫం", "గల్ల", "खांसी", "जुकाम", "गला"]):
        if lang == "te":
            rec = (
                "🫁 **దగ్గు, జలుబు మరియు గొంతు నొప్పికి ఉపశమన మార్గాలు:**"
                "\n\n**1. ఇంటి నివారణ చిట్కాలు:**"
                "\n• రోజుకు 2-3 సార్లు గోరువెచ్చని నీటిలో కొద్దిగా ఉప్పు వేసి గొంతులో పుక్కిలించండి (Salt water gargle). ఇది గొంతు మంటను తగ్గిస్తుంది."
                "\n• ఆవిరి పట్టడం (Steam inhalation): రోజుకు 2 సార్లు సాధారణ నీటి ఆవిరి పీల్చడం ద్వారా ముక్కు దిబ్బడ మరియు కఫం సులభంగా కరుగుతుంది."
                "\n• అల్లం, తులసి ఆకులు మరిగించిన గోరువెచ్చని నీరు లేదా పసుపు పాలు త్రాగండి."
                "\n\n**2. జీవనశైలి & రక్షణ:**"
                "\n• చల్లని నీరు, ఐస్‌క్రీమ్‌లు, మరియు ఫ్రిజ్ ఆహారాలను నివారించండి."
                "\n• ఇతరులకు సోకకుండా దగ్గినప్పుడు లేదా తుమ్మినప్పుడు చేతిరుమాలు అడ్డం పెట్టుకోండి."
                "\n\n🚨 **వైద్యుడిని వెంటనే ఎప్పుడు సంప్రదించాలి:**"
                "\n• శ్వాస తీసుకోవడంలో ఆయాసం లేదా గురక శబ్దం రావడం."
                "\n• దగ్గుతో పాటు రక్తం పడటం లేదా ఛాతీలో తీవ్ర నొప్పి ఉండటం."
                "\n• దగ్గు 2 వారాల కంటే ఎక్కువ రోజులు తగ్గకపోతే క్షయ (TB) పరీక్ష కోసం సమీప PHCకి వెళ్ళండి."
            )
        else:
            rec = (
                "🫁 **Cough, Cold & Sore Throat Primary Care Guidance:**"
                "\n\n**1. Home Self-Care & Relief:**"
                "\n• Gargle with warm salt water 2-3 times daily to soothe throat irritation and reduce swelling."
                "\n• Steam Inhalation: Inhaling steam for 5-10 minutes twice a day relieves nasal congestion and loosens mucus."
                "\n• Stay well hydrated with warm water, ginger/tulsi tea, or clear soups."
                "\n\n**2. Protection & Precautions:**"
                "\n• Avoid refrigerated cold drinks and oily/dusty exposures."
                "\n• Use a mask or handkerchief when coughing or sneezing to prevent spreading to family members."
                "\n\n🚨 **When to See a Doctor Immediately:**"
                "\n• Fast breathing, wheezing, or chest tightness."
                "\n• Coughing up blood, rust-colored sputum, or high fever with chills."
                "\n• Any persistent cough lasting more than 2 weeks requires mandatory Sputum testing for Tuberculosis (TB) at your nearest PHC."
            )
        return {
            "urgency": "routine",
            "visual_observations": "Respiratory symptom query addressed.",
            "recommendations": rec,
            "disclaimer": disclaimer,
            "is_emergency": False
        }

    # C. Diarrhea, Vomiting & Food Poisoning (విరేచనాలు, వాంతులు, కడుపు తిప్పడం)
    if any(k in lower_symptoms for k in ["diarrhea", "vomit", "loose motion", "nausea", "stomach bug", "విరేచనాలు", "వాంతులు", "మోషన్స్", "ఉల్టీ", "दस्त", "उल्टी"]):
        if lang == "te":
            rec = (
                "💧 **విరేచనాలు మరియు వాంతులు అయినప్పుడు ప్రాణాధార సూచనలు:**"
                "\n\n**1. అత్యంత ముఖ్యం — డీహైడ్రేషన్ (నీటి నష్టం) నివారణ:**"
                "\n• 1 ప్యాకెట్ ఓఆర్ఎస్ (ORS) పొడిని 1 లీటరు కాచి చల్లార్చిన నీటిలో పూర్తిగా కలిపి ప్రతి విరేచనం తర్వాత ఒక గ్లాసు కొద్దికొద్దిగా త్రాగించండి."
                "\n• ORS అందుబాటులో లేకపోతే: 1 లీటరు నీటిలో 6 చిన్న చెంచాల చక్కెర + అర చెంచా ఉప్పు కలిపి ఇవ్వండి."
                "\n• కొబ్బరి నీళ్ళు, పల్చటి మజ్జిగ, లేదా గంజి నీరు చాలా మేలు చేస్తాయి."
                "\n\n**2. ఆహారం:**"
                "\n• అన్నం గంజి, అరటిపండు, ఉడకబెట్టిన బంగాళాదుంప, మెత్తటి ఖిచిడీ వంటి తేలికపాటి ఆహారం మాత్రమే తీసుకోండి."
                "\n• కారం, నూనె, పాలు మరియు మసాలా ఆహారాలను తాత్కాలికంగా ఆపండి."
                "\n\n🚨 **ఈ ప్రమాద సంకేతాలు కనిపిస్తే వెంటనే PHC/ఆసుపత్రికి వెళ్ళండి:**"
                "\n• విరేచనాల్లో రక్తం లేదా చీము పడటం."
                "\n• కళ్ళు గుంటలు పడటం, నాలుక పూర్తిగా ఎండిపోవడం, లేదా 6 గంటల పాటు మూత్రం రాకపోవడం."
                "\n• తాగిన ప్రతిదీ వాంతి అయిపోతుండటం."
            )
        else:
            rec = (
                "💧 **Diarrhea & Vomiting Management (Preventing Dehydration):**"
                "\n\n**1. Priority: Immediate Oral Rehydration (ORS):**"
                "\n• Mix 1 packet of WHO-formula ORS into 1 litre of clean drinking water. Drink small sips after every loose stool."
                "\n• If ORS packets are unavailable: Mix 6 level teaspoons of sugar and 1/2 level teaspoon of salt into 1 litre of boiled and cooled water."
                "\n• Tender coconut water, thin buttermilk, and salted rice water (kanji) are excellent rehydrating fluids."
                "\n\n**2. Nutrition:**"
                "\n• Eat bland, easily digestible foods: soft rice, curd rice, boiled potatoes, and bananas."
                "\n• Avoid oily, spicy, raw, or milk-heavy foods until bowel movements normalize."
                "\n\n🚨 **Emergency Red Flags (Seek Immediate Medical Care):**"
                "\n• Blood or black tarry material in stool or vomit."
                "\n• Severe signs of dehydration: sunken eyes, dry tongue/mouth, no urine output for 6+ hours, extreme lethargy."
                "\n• Continuous vomiting where fluids cannot be retained."
            )
        return {
            "urgency": "priority",
            "visual_observations": "Gastrointestinal symptom query addressed.",
            "recommendations": rec,
            "disclaimer": disclaimer,
            "is_emergency": False
        }

    # D. Headache, Body Aches & Fatigue (తలనొప్పి, ఒళ్లు నొప్పులు, నీరసం)
    if any(k in lower_symptoms for k in ["headache", "body pain", "body ache", "fatigue", "tired", "weakness", "తలనొప్పి", "నొప్పులు", "ఒళ్లు", "నీరసం", "అలసట", "सिरदर्द", "बदन दर्द"]):
        if lang == "te":
            rec = (
                "💆 **తలనొప్పి మరియు ఒళ్లు నొప్పులకు ప్రాథమిక జాగ్రత్తలు:**"
                "\n\n**1. విశ్రాంతి & ఉపశమనం:**"
                "\n• నిశ్శబ్దంగా, తక్కువ వెలుతురు ఉన్న గదిలో తగినంత విశ్రాంతి తీసుకోండి."
                "\n• తగినంత నిద్ర (7-8 గంటలు) ఉండేలా చూసుకోండి. అధిక మొబైల్/టీవీ స్క్రీన్ సమయాన్ని తగ్గించండి."
                "\n• పుష్కలంగా మంచినీరు త్రాగండి (శరీరంలో నీరు తగ్గడం కూడా తలనొప్పికి ప్రధాన కారణం)."
                "\n\n**2. మందుల సలహా:**"
                "\n• తీవ్రమైన నొప్పి ఉంటే సురక్షితమైన పారాసిటమాల్ (Paracetamol 500mg) ఆహారం తీసుకున్న తర్వాత మాత్రమే వేసుకోవచ్చు."
                "\n• ఖాళీ కడుపుతో తీవ్రమైన నొప్పి మాత్రలు వేసుకోకండి."
                "\n\n🚨 **వైద్యుడిని వెంటనే ఎప్పుడు సంప్రదించాలి:**"
                "\n• అకస్మాత్తుగా మెరుపులా తీవ్రమైన తలనొప్పి రావడం (Thunderclap headache)."
                "\n• తలనొప్పితో పాటు జ్వరం, మెడ బిగుతు, కంటి చూపు మసకబారడం లేదా వాంతులు ఉండటం."
                "\n• తలకు దెబ్బ తగిలిన తర్వాత తలనొప్పి లేదా మగతగా ఉండటం."
            )
        else:
            rec = (
                "💆 **Headache, Body Aches & Fatigue Care Instructions:**"
                "\n\n**1. Rest & Hydration:**"
                "\n• Rest in a quiet, darkened room away from loud noises and bright phone/computer screens."
                "\n• Drink 2-3 litres of water throughout the day; mild dehydration is one of the most common causes of headaches and fatigue."
                "\n• Gentle temple massage and cold/warm compress over the forehead can provide natural relief."
                "\n\n**2. Safe Medication:**"
                "\n• For mild to moderate tension headaches or muscular aches, a dose of Paracetamol (500mg) with water after food is safe."
                "\n• Avoid frequent use of over-the-counter painkillers on an empty stomach."
                "\n\n🚨 **When to See a Doctor Urgently:**"
                "\n• Sudden, explosive onset 'worst headache of life'."
                "\n• Headache accompanied by high fever, stiff neck, vomiting, or visual disturbances."
                "\n• Weakness or numbness on one side of the face or body."
            )
        return {
            "urgency": "routine",
            "visual_observations": "Cephalea / body ache query addressed.",
            "recommendations": rec,
            "disclaimer": disclaimer,
            "is_emergency": False
        }

    # E. Skin Rashes, Itching & Fungal/Scabies Infections (చర్మ సమస్యలు, దద్దుర్లు, దురద, గజ్జి)
    if any(k in lower_symptoms for k in ["skin", "rash", "itch", "fungal", "scabies", "ringworm", "allergy", "దురద", "దద్దుర్లు", "గజ్జి", "తామర", "చర్మం", "खुजली", "दाद"]):
        if lang == "te":
            rec = (
                "🩹 **చర్మ సమస్యలు, దురద మరియు దద్దుర్లకు జాగ్రత్తలు:**"
                "\n\n**1. పరిశుభ్రత & సంరక్షణ:**"
                "\n• ప్రభావిత చర్మాన్ని ఎల్లప్పుడూ పొడిగా, శుభ్రంగా ఉంచండి. గట్టిగా గోకకండి (గోకితే ఇన్ఫెక్షన్ ఇతర భాగాలకు పాకుతుంది)."
                "\n• రోజువారీ బట్టలను వేడి నీటితో ఉతికి ఎండలో ఆరవేయండి. ఇతరుల తువ్వాళ్లు, దుస్తులు వాడకండి."
                "\n• వదులైన కాటన్ బట్టలు ధరించండి."
                "\n\n**2. తామర లేదా గజ్జి అనుమానం ఉంటే:**"
                "\n• వేళ్ళ సందుల్లో లేదా నడుము వద్ద రాత్రిపూట తీవ్ర దురద ఉంటే అది గజ్జి (Scabies) కావచ్చు. కుటుంబ సభ్యులందరూ కలిసి PHC మెడికల్ ఆఫీసర్ ఇచ్చిన లోషన్ (Permethrin) వాడాలి."
                "\n• తామర (Ringworm) ఉంటే క్లోట్రిమజోల్ (Clotrimazole) యాంటీఫంగల్ క్రీమ్ రోజుకు రెండుసార్లు రాయవచ్చు."
                "\n\n🚨 **వైద్యుడిని వెంటనే ఎప్పుడు సంప్రదించాలి:**"
                "\n• చర్మం నుండి చీము కారడం లేదా చుట్టూ తీవ్ర ఎరుపు మరియు వాపు ఉండటం."
                "\n• దద్దుర్లతో పాటు పెదవుల వాపు లేదా శ్వాసలో ఇబ్బంది రావడం (తీవ్ర అలర్జీ సంకేతం - వెంటనే 108 కు కాల్ చేయండి)."
            )
        else:
            rec = (
                "🩹 **Skin Rashes, Itching & Dermatological Care Instructions:**"
                "\n\n**1. Cleanliness & Hygiene:**"
                "\n• Keep the affected area clean and dry. Avoid vigorous scratching to prevent secondary bacterial infection."
                "\n• Wash bedsheets and towels in hot water and sun-dry thoroughly. Do not share personal clothing."
                "\n• Wear loose, breathable cotton garments."
                "\n\n**2. Fungal Infection / Scabies Considerations:**"
                "\n• For ringworm (circular itchy red borders), an over-the-counter topical antifungal cream like Clotrimazole applied twice daily to clean, dry skin helps."
                "\n• For severe itching between fingers and waist folds that worsens at night (suspected Scabies), all family members require simultaneous treatment with Permethrin lotion as prescribed by your PHC Medical Officer."
                "\n\n🚨 **When to Seek Immediate Medical Evaluation:**"
                "\n• Spreading redness, warmth, or pus discharge (Cellulitis/Abscess)."
                "\n• Rashes accompanied by swelling of lips/face or breathing tightness (Anaphylaxis - dial 108 immediately)."
            )
        return {
            "urgency": "routine",
            "visual_observations": "Dermatological symptom query addressed.",
            "recommendations": rec,
            "disclaimer": disclaimer,
            "is_emergency": False
        }

    # F. Stomach Pain, Acidity & Gastritis (కడుపు నొప్పి, ఎసిడిటీ, గ్యాస్)
    if any(k in lower_symptoms for k in ["stomach pain", "acidity", "gas", "abdominal", "heartburn", "కడుపు నొప్పి", "ఎసిడిటీ", "గ్యాస్", "గుండెల్లో మంట", "पेट दर्द", "गैस"]):
        if lang == "te":
            rec = (
                "🍵 **కడుపు నొప్పి, గ్యాస్ మరియు ఎసిడిటీకి ఉపశమన చర్యలు:**"
                "\n\n**1. ఆహారపు జాగ్రత్తలు:**"
                "\n• తక్కువ మోతాదులో సమయానికి ఆహారం తీసుకోండి. ఎక్కువ సమయం ఆకలితో ఉండకండి."
                "\n• కారంగా, నూనెతో వేయించిన పదార్థాలు, టీ/కాఫీలను కొద్దిరోజులు తగ్గించండి."
                "\n• చల్లని పాలు, మజ్జిగ, లేదా కొబ్బరి నీళ్ళు ఎసిడిటీ మరియు మంటను తగ్గిస్తాయి."
                "\n\n**2. అలవాట్లు:**"
                "\n• పొగాకు, గుట్కా మరియు మద్యపానాన్ని పూర్తిగా నిలిపివేయండి; ఇవి కడుపులో అల్సర్లకు ప్రధాన కారణం."
                "\n\n🚨 **తీవ్ర ప్రమాద సూచనలు (వెంటనే ఆసుపత్రికి వెళ్ళండి):**"
                "\n• కడుపులో భరించలేని పదునైన నొప్పి, లేదా కడుపు పలకలా గట్టిపడిపోవడం."
                "\n• రక్తం లేదా నల్లటి పదార్థం వాంతి కావడం."
                "\n• నొప్పి వెన్నుభాగం లేదా ఛాతీకి పాకడం."
            )
        else:
            rec = (
                "🍵 **Stomach Pain, Gastritis & Acidity Care:**"
                "\n\n**1. Dietary Guidelines:**"
                "\n• Eat small, frequent, bland meals at regular intervals. Avoid prolonged fasting."
                "\n• Limit excessively spicy curries, deep-fried snacks, and heavy tea/coffee."
                "\n• Plain buttermilk, tender coconut water, and cold milk provide natural relief from gastric acid burn."
                "\n\n**2. Risk Factor Modification:**"
                "\n• Avoid alcohol, tobacco, and painkiller overuse (NSAIDs like Brufen/Diclofenac) which directly cause stomach ulcers."
                "\n\n🚨 **Emergency Red Flags (Visit Emergency Department Immediately):**"
                "\n• Severe, sharp, sudden abdominal pain with a rigid/board-like belly."
                "\n• Vomiting blood or passing black tarry stools."
                "\n• Pain radiating to back, chest, or associated with high fever."
            )
        return {
            "urgency": "priority",
            "visual_observations": "Abdominal / gastritis query addressed.",
            "recommendations": rec,
            "disclaimer": disclaimer,
            "is_emergency": False
        }

    # G. Mouth Ulcers / Canker Sores (నోటి పూత)
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

    # H. Burning Sensation with Spicy Food (కారం తిన్నప్పుడు మంట)
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

    # I. Quitting Tobacco, Gutkha, or Reverse Smoking (చుట్ట / పొగాకు మానేయడం)
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

    # J. Bleeding Gums or Toothache (చిగుళ్ల రక్తస్రావం / పంటి నొప్పి)
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

    # K. General Fallback Guidance
    if lang == "te":
        rec = (
            "మీరు అడిగిన ఆరోగ్య సమాచారానికి సంబంధించి ప్రాథమిక సూచనలు:"
            "\n• పుష్కలంగా కాచి చల్లార్చిన నీటిని త్రాగండి మరియు వ్యక్తిగత పరిశుభ్రత పాటించండి."
            "\n• సమయానికి పౌష్టికాహారం తీసుకోండి మరియు పొగాకు/మద్యపానానికి దూరంగా ఉండండి."
            "\n• ఏవైనా లక్షణాలు (జ్వరం, పుండ్లు, నొప్పి లేదా వాపు) తగ్గకుండా ఉంటే లేదా తీవ్రమైతే ఆలస్యం చేయకుండా సమీప PHC వైద్యాధికారిని సంప్రదించండి."
        )
    else:
        rec = (
            "General Community Health & Primary Care Guidance:"
            "\n• Stay well hydrated with safe drinking water and maintain good personal hygiene."
            "\n• Follow a balanced diet and avoid harmful habits such as tobacco, gutkha, and alcohol."
            "\n• If symptoms (fever, sores, pain, or swelling) persist without improvement, please visit your local Primary Health Centre (PHC) for an in-person clinical checkup."
        )

    return {
        "urgency": "routine",
        "visual_observations": "General health inquiry addressed.",
        "recommendations": rec,
        "disclaimer": disclaimer,
        "is_emergency": False
    }
