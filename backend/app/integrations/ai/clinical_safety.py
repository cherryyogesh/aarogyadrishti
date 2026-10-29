from typing import Dict, Any, List, Optional, Tuple
import re

# Deterministic Emergency Red Flag Definitions
EMERGENCY_RULES: List[Dict[str, Any]] = [
    {
        "id": "ACUTE_RESPIRATORY_DISTRESS",
        "patterns": [r"breathing\s*(trouble|difficulty|shortness)", r"stridor", r"శ్వాస\s*ఆడకపోవడం", r"सांस\s*लेने\s*में\s*दिक्कत"],
        "urgency": "urgent_care",
        "guidance_en": "Severe respiratory distress detected. Seek immediate emergency department care or dial 108.",
        "guidance_te": "తీవ్రమైన శ్వాస ఆడకపోవడం గుర్తించబడింది. వెంటనే అత్యవసర విభాగానికి వెళ్ళండి లేదా 108 కు కాల్ చేయండి."
    },
    {
        "id": "ACTIVE_UNCONTROLLED_BLEEDING",
        "patterns": [r"uncontrolled\s*bleed", r"spurting\s*blood", r"coughing\s*blood", r"రక్తం\s*వాంతి|రక్తం\s*కక్కడం"],
        "urgency": "urgent_care",
        "guidance_en": "Active profuse or uncontrolled bleeding detected. Immediate hospital emergency care required.",
        "guidance_te": "ఆగకుండా అధిక రక్తస్రావం జరుగుతోంది. వెంటనే ఆసుపత్రి అత్యవసర సంరక్షణ అవసరం."
    },
    {
        "id": "ACUTE_NEUROLOGICAL_SIGNS",
        "patterns": [r"facial\s*droop", r"sudden\s*numbness", r"slurred\s*speech", r"unconscious", r"స్పృహ\s*తప్పడం"],
        "urgency": "urgent_care",
        "guidance_en": "Possible acute neurological event. Immediate emergency medical attention required.",
        "guidance_te": "తీవ్ర నాడీ సంబంధిత అత్యవసర పరిస్థితి. వెంటనే వైద్యుడిని సంప్రదించండి."
    },
    {
        "id": "ACUTE_VISION_LOSS",
        "patterns": [r"sudden\s*(vision|sight)\s*loss", r"severe\s*eye\s*pain", r"రాత్రికి\s*రాత్రే\s*చూపు\s*పోవడం"],
        "urgency": "urgent_care",
        "guidance_en": "Sudden vision reduction is an ophthalmic emergency. Immediate ophthalmologist evaluation required.",
        "guidance_te": "ఆకస్మిక దృష్టి లోపం కంటి అత్యవసర పరిస్థితి. వెంటనే కంటి వైద్యుడిని సంప్రదించండి."
    }
]

# Mandatory Cancer Boundary Notice
MANDATORY_CANCER_DISCLAIMER_EN = (
    "The image shows a finding that cannot be reliably identified from the photograph alone. "
    "Several conditions may produce similar appearances. Please arrange assessment by a qualified "
    "healthcare professional. Further examination or testing may be necessary."
)

MANDATORY_CANCER_DISCLAIMER_TE = (
    "ఈ ఫొటో ద్వారా వ్యాధి లేదా క్యాన్సర్‌ను ఖచ్చితంగా నిర్ధారించలేము. "
    "పలు రకాల రుగ్మతలు ఇలాంటి రూపంలోనే కనిపించవచ్చు. దయచేసి అర్హత కలిగిన వైద్యాధికారిచే "
    "ప్రత్యక్ష వైద్య పరీక్ష చేయించండి. తదుపరి రక్త లేదా బయాప్సీ పరీక్షలు అవసరం కావచ్చు."
)

FORBIDDEN_CANCER_CLAIMS = [
    r"proves\s*cancer",
    r"confirms\s*cancer",
    r"cancer\s*is\s*ruled\s*out",
    r"is\s*not\s*cancer",
    r"benign\s*guaranteed",
    r"stage\s*(i|ii|iii|iv)\s*cancer"
]

class ClinicalSafetyEngine:
    """
    Deterministic clinical safety guardrails and escalation rules.
    Does not rely on stochastic LLM generation for life-safety checks.
    """

    @staticmethod
    def evaluate_emergency_flags(text: str) -> Optional[Dict[str, Any]]:
        """
        Check reported symptoms against deterministic emergency rules.
        """
        lower = text.lower() if text else ""
        for rule in EMERGENCY_RULES:
            for pat in rule["patterns"]:
                if re.search(pat, lower):
                    return rule
        return None

    @staticmethod
    def sanitize_model_output(output_text: str) -> str:
        """
        Post-processes model text to strictly prevent unauthorized cancer claims,
        staging claims, or unvalidated numeric probabilities.
        """
        sanitized = output_text
        for pattern in FORBIDDEN_CANCER_CLAIMS:
            sanitized = re.sub(pattern, "requires in-person clinical biopsy for assessment", sanitized, flags=re.IGNORECASE)

        # Remove unvalidated percentage confidence numbers (e.g., "94% confidence")
        sanitized = re.sub(r"\b\d{1,3}%\s*(confidence|certainty|accuracy)\b", "preliminary visual correlation", sanitized, flags=re.IGNORECASE)
        return sanitized

    @staticmethod
    def calculate_urgency(
        category: str,
        clinical_context: Dict[str, Any],
        visible_observations: List[str]
    ) -> Tuple[str, str, List[str]]:
        """
        Calculates deterministic urgency level:
        - "urgent_care": acute warning signs, profuse bleed, severe trismus (<20mm), vision loss.
        - "prompt_assessment": persistent mucosal lesion > 14 days, red plaque, firm nodule, moderate trismus (20-35mm).
        - "routine_review": mild acute symptoms < 7 days without red flags.

        Returns (urgency, urgency_reason, red_flags_list)
        """
        red_flags: List[str] = []
        symptoms = clinical_context.get("symptoms", "")
        duration_days = int(clinical_context.get("duration_days") or 0)
        mouth_opening = clinical_context.get("mouth_opening_mm")
        bleeding = bool(clinical_context.get("bleeding", False))
        pain_score = int(clinical_context.get("pain_score") or 0)

        # 1. Check emergency rules
        emergency = ClinicalSafetyEngine.evaluate_emergency_flags(symptoms)
        if emergency:
            red_flags.append(emergency["id"])
            return "urgent_care", emergency["guidance_en"], red_flags

        # 2. Severe Trismus Check (< 20 mm in oral category)
        if category in ["mouth_oral", "mouth"] and mouth_opening is not None:
            try:
                mo_val = float(mouth_opening)
                if mo_val > 0 and mo_val < 20:
                    red_flags.append("SEVERE_TRISMUS_UNDER_20MM")
                    return (
                        "urgent_care",
                        f"Interincisal mouth opening is severely restricted ({mo_val} mm). Urgent surgical oncology / ENT referral required.",
                        red_flags
                    )
                elif mo_val > 0 and mo_val < 35:
                    red_flags.append("MODERATE_TRISMUS_OSMF_SUSPICION")
            except (ValueError, TypeError):
                pass

        # 3. Persistent Lesion Check (> 14 days)
        if duration_days >= 14:
            red_flags.append("PERSISTENT_LESION_OVER_14_DAYS")

        # 4. Spontaneous Bleeding on Touch
        if bleeding:
            red_flags.append("MUCOSAL_OR_CUTANEOUS_BLEEDING")

        # 5. Severe Pain (> 7/10)
        if pain_score >= 8:
            red_flags.append("SEVERE_LOCALIZED_PAIN")

        # Determine triage urgency level
        if red_flags:
            urgency = "prompt_assessment"
            reasons = []
            if "PERSISTENT_LESION_OVER_14_DAYS" in red_flags:
                reasons.append("Symptom duration exceeds 14 days, which warrants an in-person physical exam and biopsy consideration according to MoHFW guidelines.")
            if "MODERATE_TRISMUS_OSMF_SUSPICION" in red_flags:
                reasons.append("Restricted mouth opening (< 35 mm) indicates clinical trismus requiring specialist staging.")
            if "MUCOSAL_OR_CUTANEOUS_BLEEDING" in red_flags:
                reasons.append("Reported bleeding from lesion requires physical clinical inspection.")
            if "SEVERE_LOCALIZED_PAIN" in red_flags:
                reasons.append("Severe pain score warrants prompt clinical review.")

            urgency_reason = " ".join(reasons)
        else:
            urgency = "routine_review"
            urgency_reason = "Early or mild presentation. In-person clinical review by PHC staff advised during routine hours."

        return urgency, urgency_reason, red_flags

    @staticmethod
    def get_mandatory_cancer_notice(language: str = "en") -> str:
        return MANDATORY_CANCER_DISCLAIMER_TE if language == "te" else MANDATORY_CANCER_DISCLAIMER_EN

clinical_safety = ClinicalSafetyEngine()

