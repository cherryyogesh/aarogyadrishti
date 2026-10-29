from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

@dataclass
class ImageScopeCategory:
    category_id: str
    display_name_en: str
    display_name_te: str
    intended_use: str
    approved_pipeline: str
    required_metadata: List[str]
    known_limitations: List[str]
    validation_status: str  # "validated_pilot", "pre_clinical_evaluation", "unvalidated_research"
    supported_languages: List[str]
    clinical_deployment_approved: bool
    refusal_guidance_en: str
    refusal_guidance_te: str

IMAGE_SCOPE_REGISTRY: Dict[str, ImageScopeCategory] = {
    "mouth_oral": ImageScopeCategory(
        category_id="mouth_oral",
        display_name_en="Oral Mucosa & Mouth",
        display_name_te="నోటి శ్లేష్మం మరియు నోటి కుహరం",
        intended_use="Preliminary triage for visible mucosal plaques (leukoplakia), fibrosis/blanching (OSMF), erythroplakia, gingival swelling, and aphthous ulcerations in primary care screening.",
        approved_pipeline="Google MedGemma 1.5 4B Multimodal + Evidence RAG + MoHFW/NOHP Guidelines",
        required_metadata=["body_site", "duration_days", "pain_score", "mouth_opening_mm"],
        known_limitations=[
            "Cannot differentiate dysplastic pre-cancer from invasive squamous cell carcinoma without tissue biopsy.",
            "Visual observation is heavily affected by salivary pooling, tongue shadows, and improper focal depth.",
            "Cannot evaluate deep bony invasion or submucosal induration through surface photography."
        ],
        validation_status="validated_pilot",
        supported_languages=["te", "en", "hi", "ta", "ml", "kn"],
        clinical_deployment_approved=True,
        refusal_guidance_en="For complex maxillofacial swelling or suspected deep abscess, immediate in-person dental or ENT referral is required.",
        refusal_guidance_te="సంక్లిష్టమైన దవడ వాపు లేదా చీము గడ్డల కోసం తక్షణమే డెంటల్/ENT వైద్యుడిని సంప్రదించాలి."
    ),
    "skin_lesion": ImageScopeCategory(
        category_id="skin_lesion",
        display_name_en="Skin & Dermatology",
        display_name_te="చర్మ సమస్యలు మరియు దద్దుర్లు",
        intended_use="Advisory detection of visible cutaneous rashes, eczema, scabies, fungal plaques, chronic non-healing ulcers, and pigmentation boundaries.",
        approved_pipeline="Google MedGemma 1.5 4B Multimodal + Indian Dermatological Guidance",
        required_metadata=["body_site", "duration_days", "itching", "lesion_evolution"],
        known_limitations=[
            "Cannot rule out melanoma or cutaneous malignancies without dermoscopy and histopathology.",
            "Performance varies significantly across Fitzpatrick skin phototypes IV-VI common in South Asian populations."
        ],
        validation_status="validated_pilot",
        supported_languages=["te", "en", "hi", "ta", "ml", "kn"],
        clinical_deployment_approved=True,
        refusal_guidance_en="Lesions showing ABCDE melanoma warning signs require immediate dermatologist biopsy.",
        refusal_guidance_te="తీవ్రమైన రంగు మార్పు లేదా వేగంగా పెరుగుతున్న పుట్టుమచ్చలకు చర్మవ్యాధి నిపుణుల పరీక్ష అవసరం."
    ),
    "eye_anterior": ImageScopeCategory(
        category_id="eye_anterior",
        display_name_en="Eye & Ocular Surface",
        display_name_te="కంటి ఉపరితలం & ముందరి భాగం",
        intended_use="Inspection of anterior ocular surface: conjunctival redness, pterygium, corneal opacity, or lid margin abnormalities.",
        approved_pipeline="Google MedGemma 1.5 4B Multimodal + NPCB Guidelines",
        required_metadata=["body_site", "vision_blur", "photophobia", "discharge_type"],
        known_limitations=[
            "External photographs CANNOT assess intraocular pressure, glaucoma, posterior uveitis, or retinal detachment.",
            "Slit-lamp biomicroscopy is strictly required for anterior chamber depth and corneal ulcer depth."
        ],
        validation_status="pre_clinical_evaluation",
        supported_languages=["te", "en", "hi", "ta", "ml", "kn"],
        clinical_deployment_approved=True,
        refusal_guidance_en="Sudden vision loss, severe eye pain, or penetrating trauma requires urgent emergency ophthalmic care.",
        refusal_guidance_te="ఆకస్మిక దృష్టి లోపం లేదా తీవ్ర కంటి నొప్పితో బాధపడుతుంటే తక్షణ నేత్ర వైద్య అత్యవసర సంరక్షణ పొందండి."
    ),
    "ear_auricular": ImageScopeCategory(
        category_id="ear_auricular",
        display_name_en="Ear & External Canal",
        display_name_te="బాహ్య చెవి మరియు కర్ణభేరి",
        intended_use="External pinna, auricular chondritis, preauricular sinuses, and otoscopic canal discharge inspection.",
        approved_pipeline="Google MedGemma 1.5 4B Multimodal + ENT Guidelines",
        required_metadata=["body_site", "hearing_loss", "discharge", "vertigo"],
        known_limitations=[
            "Ordinary smartphone camera cannot reliably view the tympanic membrane without a validated digital otoscope adapter.",
            "Cannot evaluate inner ear vestibular disorders or sensorineural hearing loss."
        ],
        validation_status="pre_clinical_evaluation",
        supported_languages=["te", "en", "hi", "ta", "ml", "kn"],
        clinical_deployment_approved=True,
        refusal_guidance_en="Bloody otorrhea or acute mastoid tenderness requires urgent ENT surgeon review.",
        refusal_guidance_te="చెవి నుండి రక్తం రావడం లేదా వెనుక ఎముక నొప్పి ఉంటే వెంటనే ENT వైద్యుడిని సంప్రదించండి."
    ),
    "wound_ulcer": ImageScopeCategory(
        category_id="wound_ulcer",
        display_name_en="Wound & Chronic Ulcers",
        display_name_te="దీర్ఘకాలిక పుండ్లు & గాయాలు",
        intended_use="Evaluation of ulcer bed characteristics (slough, granulation, maceration, eschar) in diabetic foot and trauma wounds.",
        approved_pipeline="Google MedGemma 1.5 4B Multimodal + Diabetic Foot Wound Guidelines",
        required_metadata=["body_site", "duration_days", "diabetic_history", "wound_discharge"],
        known_limitations=[
            "Cannot detect underlying osteomyelitis (bone infection) without radiograph/MRI and probe-to-bone test.",
            "Cannot determine vascular patency or arterial insufficiency."
        ],
        validation_status="validated_pilot",
        supported_languages=["te", "en", "hi", "ta", "ml", "kn"],
        clinical_deployment_approved=True,
        refusal_guidance_en="Foul-smelling wound with spreading redness, crepitus, or gangrene requires emergency surgical debridement.",
        refusal_guidance_te="దుర్వాసనతో కూడిన నల్లబడిన గాయం లేదా వేగంగా పాకే ఎరుపుదనం తక్షణ అత్యవసర శస్త్రచికిత్స అవసరం."
    ),
    "medical_document": ImageScopeCategory(
        category_id="medical_document",
        display_name_en="Medical Documents & Lab Reports",
        display_name_te="వైద్య నివేదికలు మరియు ల్యాబ్ రికార్డులు",
        intended_use="Assisting healthcare personnel in parsing printed lab biochemistry, CBC values, discharge cards, and biopsy pathology reports.",
        approved_pipeline="Google MedGemma 1.5 4B Multimodal Document Intelligence",
        required_metadata=["document_type", "patient_case_id"],
        known_limitations=[
            "Handwritten cursive clinical notes may have transcription errors.",
            "Lab reference ranges vary by testing instrumentation; always verify against the lab's printed reference range."
        ],
        validation_status="validated_pilot",
        supported_languages=["te", "en", "hi", "ta", "ml", "kn"],
        clinical_deployment_approved=True,
        refusal_guidance_en="Unclear or cut-off lab reports must be verified directly against the original physical paper report.",
        refusal_guidance_te="స్పష్టంగా లేని ల్యాబ్ నివేదికలను నేరుగా ఒరిజినల్ పేపర్ రిపోర్ట్‌తో సరిచూడాలి."
    ),
    "radiology_xray": ImageScopeCategory(
        category_id="radiology_xray",
        display_name_en="Radiology & X-Rays (Restricted)",
        display_name_te="ఎక్స్-రే మరియు రేడియాలజీ (నియంత్రిత)",
        intended_use="Restricted research validation only. Not approved for automated general clinical diagnostic interpretation.",
        approved_pipeline="Separately Validated DICOM Radiologist Pipeline (Unconfigured in Primary Care)",
        required_metadata=["modality", "projection", "clinical_indication"],
        known_limitations=[
            "Smartphone photos of physical X-ray films introduce parallax distortion, loss of dynamic range, and ambient reflections.",
            "Not cleared for automated fracture, pneumothorax, or pulmonary mass exclusion."
        ],
        validation_status="unvalidated_research",
        supported_languages=["en"],
        clinical_deployment_approved=False,
        refusal_guidance_en="Automated assessment is not available for this image type. Please route this case for appropriate healthcare professional review.",
        refusal_guidance_te="ఈ రకమైన ఇమేజ్ కోసం ఆటోమేటెడ్ నిర్ధారణ అందుబాటులో లేదు. దయచేసి సంబంధిత వైద్యుడి పరిశీలనకు పంపండి."
    )
}

class ImageScopeRegistry:
    @staticmethod
    def get_supported_categories() -> List[Dict[str, Any]]:
        return [
            {
                "category_id": cat.category_id,
                "display_name_en": cat.display_name_en,
                "display_name_te": cat.display_name_te,
                "intended_use": cat.intended_use,
                "validation_status": cat.validation_status,
                "clinical_deployment_approved": cat.clinical_deployment_approved,
                "known_limitations": cat.known_limitations,
                "required_metadata": cat.required_metadata
            }
            for cat in IMAGE_SCOPE_REGISTRY.values()
        ]

    @staticmethod
    def validate_category(category_id: str) -> Optional[ImageScopeCategory]:
        """
        Normalize and validate if category is supported and clinically approved.
        """
        normalized = category_id.lower().strip() if category_id else ""
        # Handle aliases
        if normalized in ["mouth", "oral", "teeth", "gums", "tongue", "mouth_oral"]:
            normalized = "mouth_oral"
        elif normalized in ["skin", "derma", "dermatology", "rash", "skin_lesion"]:
            normalized = "skin_lesion"
        elif normalized in ["eye", "cornea", "conjunctiva", "eye_anterior"]:
            normalized = "eye_anterior"
        elif normalized in ["ear", "ear_auricular"]:
            normalized = "ear_auricular"
        elif normalized in ["wound", "ulcer", "foot", "wound_ulcer"]:
            normalized = "wound_ulcer"
        elif normalized in ["document", "report", "lab", "prescription", "medical_document"]:
            normalized = "medical_document"
        elif normalized in ["xray", "radiology", "ct", "mri", "radiology_xray"]:
            normalized = "radiology_xray"

        return IMAGE_SCOPE_REGISTRY.get(normalized)

    @staticmethod
    def is_category_approved(category: ImageScopeCategory) -> bool:
        return category.clinical_deployment_approved

    @staticmethod
    def get_unsupported_refusal(category_name: str, language: str = "en") -> Dict[str, Any]:
        """
        Standardized refusal response required by safety prompt:
        'Automated assessment is not available for this image type. Please route this case for appropriate healthcare professional review.'
        """
        is_te = language == "te"
        msg_en = (
            f"Automated assessment is not available for '{category_name}'. "
            "Please route this case for appropriate healthcare professional review."
        )
        msg_te = (
            f"'{category_name}' రకమైన ఇమేజ్‌లకు ఆటోమేటెడ్ మూల్యాంకనం అందుబాటులో లేదు. "
            "దయచేసి ఈ కేసును సరైన వైద్యాధికారి లేదా స్పెషలిస్ట్ పరిశీలనకు పంపండి."
        )
        return {
            "assessment_status": "unsupported_category",
            "image_category": category_name,
            "status_message": msg_te if is_te else msg_en,
            "can_analyze": False,
            "recommended_next_step": "Route case to Medical Officer / Specialist clinic for in-person evaluation."
        }

scope_registry = ImageScopeRegistry()
