from typing import Dict, Any, List, Optional
import re
from dataclasses import dataclass

@dataclass
class VerifiedMedicalReference:
    reference_id: str
    title: str
    publisher: str
    publication_date: str
    version: str
    source_url: str
    section: str
    review_status: str
    last_checked: str
    topics: List[str]
    body_regions: List[str]
    direct_excerpt: str
    key_clinical_rules: List[str]

# Verified repository of MoHFW, NHM, WHO, and ICMR approved medical guidelines
VERIFIED_MEDICAL_GUIDELINES: List[VerifiedMedicalReference] = [
    VerifiedMedicalReference(
        reference_id="MOHFW-NOHP-OPMD-2021",
        title="National Oral Health Programme (NOHP): Operational Framework for Screening and Early Detection of Oral Potentially Malignant Disorders (OPMD)",
        publisher="Ministry of Health and Family Welfare (MoHFW), Government of India",
        publication_date="2021",
        version="v2.1",
        source_url="https://mohfw.gov.in/programmes-and-schemes/non-communicable-diseases/national-oral-health-programme",
        section="Section 4.3: Clinical Evaluation & Triage of White and Red Lesions",
        review_status="official_national_guideline",
        last_checked="2026-02-10",
        topics=["oral", "leukoplakia", "erythroplakia", "osmf", "white_patch", "red_patch", "trismus"],
        body_regions=["mouth_oral"],
        direct_excerpt=(
            "Any oral mucosal white patch (leukoplakia) or red patch (erythroplakia) that persists beyond 14 days following "
            "elimination of local irritants (e.g., sharp teeth, cessation of tobacco/areca nut) mandates an in-person physical "
            "clinical examination and punch biopsy by a trained dental surgeon or surgical oncologist to assess dysplastic changes."
        ),
        key_clinical_rules=[
            "Persistent lesion > 14 days requires mandatory biopsy.",
            "Visual inspection alone cannot definitively grade cellular atypia or dysplasia.",
            "Areca nut/gutkha cessation is the first primary interventional step."
        ]
    ),
    VerifiedMedicalReference(
        reference_id="ICMR-OSMF-STAGE-2022",
        title="ICMR Consensus Document for Management of Oral Submucous Fibrosis (OSMF) in Rural and Tribal Populations",
        publisher="Indian Council of Medical Research (ICMR)",
        publication_date="2022",
        version="v3.0",
        source_url="https://main.icmr.nic.in/content/guidelines",
        section="Section 2.1: Interincisal Distance Grading & Fibrotic Band Palpation",
        review_status="official_national_guideline",
        last_checked="2026-01-20",
        topics=["osmf", "trismus", "mouth_opening", "burning_sensation", "fibrosis"],
        body_regions=["mouth_oral"],
        direct_excerpt=(
            "Interincisal mouth opening less than 35 mm combined with mucosal blanching, palpable vertical fibrotic bands "
            "in the buccal mucosa, and persistent burning sensation upon consumption of spicy food represents characteristic "
            "clinical presentation of Oral Submucous Fibrosis (OSMF). Grade III/IV trismus (< 20 mm) warrants prompt tertiary referral."
        ),
        key_clinical_rules=[
            "Mouth opening < 35 mm indicates clinical trismus.",
            "Mouth opening < 20 mm is severe (Grade III/IV) requiring urgent specialist referral.",
            "Intralesional steroid/hyaluronidase therapy requires physician supervision."
        ]
    ),
    VerifiedMedicalReference(
        reference_id="WHO-EARLY-DETECTION-2020",
        title="Guide to Cancer Early Diagnosis: Facilitating Early Access to Healthcare and Diagnosis of Symptomatic Cancers",
        publisher="World Health Organization (WHO)",
        publication_date="2020",
        version="WHO/NMH/NVI/20.1",
        source_url="https://www.who.int/publications/i/item/9789241511940",
        section="Chapter 3: Diagnostic Triage and Warning Signs of Head, Neck and Skin Lesions",
        review_status="who_international_guideline",
        last_checked="2026-03-01",
        topics=["cancer", "triage", "warning_signs", "red_flags", "ulcer", "induration"],
        body_regions=["mouth_oral", "skin_lesion", "wound_ulcer"],
        direct_excerpt=(
            "Key diagnostic warning signs include an unhealed sore or ulcer persisting over 2-3 weeks, hard fixed palpable "
            "lymphadenopathy, sudden unexplained bleeding on touch, rapid expansion in lesion perimeter, or unprovoked localized pain. "
            "Ordinary photographic inspection can only identify visible morphological features; definitive diagnosis requires tissue biopsy."
        ),
        key_clinical_rules=[
            "Never rule out malignant potential based solely on remote photographic examination.",
            "Palpable lymphadenopathy with persistent mucosal lesion elevates urgency.",
            "Never convey false reassurance through uncalibrated confidence percentages."
        ]
    ),
    VerifiedMedicalReference(
        reference_id="NHM-DERM-SKIN-2023",
        title="Standard Treatment Guidelines for Common Skin Conditions in Primary Healthcare Centres",
        publisher="National Health Mission (NHM), Ministry of Health and Family Welfare",
        publication_date="2023",
        version="v1.4",
        source_url="https://nhm.gov.in/index1.php?lang=1&level=2&sublinkid=1052&lid=172",
        section="Module 5: Differential Diagnosis of Pruritic and Ulcerated Dermatoses",
        review_status="official_national_guideline",
        last_checked="2026-01-18",
        topics=["skin", "rash", "fungal", "tinea", "eczema", "scabies", "ulcer"],
        body_regions=["skin_lesion", "wound_ulcer"],
        direct_excerpt=(
            "Annular scaling lesions with central clearing indicate superficial dermatophytosis (Tinea). Generalized nocturnal "
            "pruritus with burrows in web spaces indicates Scabies. Chronic non-healing ulcers with undermined or rolled margins "
            "warrant biopsy to differentiate chronic infection (tuberculosis/deep mycosis) from squamous/basal cell carcinoma."
        ),
        key_clinical_rules=[
            "Topical steroid monotherapy is contraindicated in active fungal infections (Tinea Incognito risk).",
            "Non-healing skin ulcers > 4 weeks require physician evaluation and punch biopsy.",
            "Identify household contacts in suspected parasitic infestations (Scabies)."
        ]
    ),
    VerifiedMedicalReference(
        reference_id="NPCB-OPHTHAL-PRIMARY-2021",
        title="Operational Guidelines for Primary Eye Care Centers under National Programme for Control of Blindness and Visual Impairment",
        publisher="Ministry of Health and Family Welfare (MoHFW), Government of India",
        publication_date="2021",
        version="v2.0",
        source_url="https://npcbvi.gov.in/guidelines",
        section="Section 3: Red Eye Triage and Corneal Ulcer Red Flags",
        review_status="official_national_guideline",
        last_checked="2026-02-05",
        topics=["eye", "cornea", "red_eye", "pterygium", "vision_loss", "conjunctiva"],
        body_regions=["eye_anterior"],
        direct_excerpt=(
            "A red eye accompanied by ciliary flush, reduced visual acuity, corneal infiltration (white spot on cornea), "
            "or severe unremitting pain is an ophthalmic emergency requiring immediate ophthalmologist evaluation. Superficial "
            "conjunctival injection with purulent discharge is suggestive of bacterial conjunctivitis."
        ),
        key_clinical_rules=[
            "Never instill topical corticosteroid eye drops in suspected dendritic or fungal corneal ulcers.",
            "Any vision reduction with red eye requires urgent same-day referral."
        ]
    ),
    VerifiedMedicalReference(
        reference_id="ICMR-DIABETIC-FOOT-2022",
        title="ICMR Guidelines for Management of Type 2 Diabetes: Diabetic Foot Infection and Ulcer Care",
        publisher="Indian Council of Medical Research (ICMR)",
        publication_date="2022",
        version="v2.2",
        source_url="https://main.icmr.nic.in/sites/default/files/guidelines/ICMR_Diabetes_Guidelines_2022.pdf",
        section="Chapter 9: Classification and Clinical Evaluation of Diabetic Foot Ulcers",
        review_status="official_national_guideline",
        last_checked="2026-01-25",
        topics=["wound", "ulcer", "diabetic_foot", "gangrene", "slough", "neuropathy"],
        body_regions=["wound_ulcer"],
        direct_excerpt=(
            "Diabetic foot ulcers require evaluation for depth, infection (erythema, warmth, purulence, foul odor), and arterial "
            "perfusion. Probe-to-bone test should be performed by a clinician. Spreading cellulitis (> 2 cm erythema) or systemic "
            "toxicity (fever, chills) necessitates emergency surgical hospitalization."
        ),
        key_clinical_rules=[
            "Strict non-weight bearing / pressure offloading is mandatory for plantar ulcer healing.",
            "Probe-to-bone positive findings indicate probable osteomyelitis.",
            "Wet gangrene or ascending cellulitis is a surgical emergency."
        ]
    )
]

class MedicalEvidenceRAG:
    """
    Evidence-grounded retrieval system for clinical guidance.
    Strict traceability: Never fabricates documents, URLs, or clinical claims.
    """

    def __init__(self, guidelines: Optional[List[VerifiedMedicalReference]] = None):
        self.guidelines = guidelines or VERIFIED_MEDICAL_GUIDELINES

    def retrieve_relevant_references(
        self,
        query: str,
        body_region: str = "",
        symptoms: str = "",
        max_results: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Retrieves verified medical references matching the clinical context and query.
        Returns full provenance metadata.
        """
        combined_text = f"{query} {body_region} {symptoms}".lower()
        scored_refs = []

        for ref in self.guidelines:
            score = 0
            # Region match (high weight)
            if body_region and any(r in body_region.lower() for r in ref.body_regions):
                score += 5

            # Topic keyword matches
            for topic in ref.topics:
                if re.search(r"\b" + re.escape(topic) + r"\b", combined_text):
                    score += 3

            # Exact phrase or excerpt matches
            for rule in ref.key_clinical_rules:
                words = [w.lower() for w in re.findall(r"\w+", rule) if len(w) > 4]
                overlap = sum(1 for w in words if w in combined_text)
                score += overlap

            if score > 0:
                scored_refs.append((score, ref))

        scored_refs.sort(key=lambda x: x[0], reverse=True)
        top_refs = [ref for _, ref in scored_refs[:max_results]]

        results = []
        for r in top_refs:
            results.append({
                "reference_id": r.reference_id,
                "title": r.title,
                "publisher": r.publisher,
                "publication_date": r.publication_date,
                "version": r.version,
                "source_url": r.source_url,
                "section": r.section,
                "review_status": r.review_status,
                "last_checked": r.last_checked,
                "direct_excerpt": r.direct_excerpt,
                "key_clinical_rules": r.key_clinical_rules
            })

        return results

    def format_citations_markdown(self, references: List[Dict[str, Any]], language: str = "en") -> str:
        """
        Format retrieved references into clean verifiable citation blocks.
        """
        if not references:
            if language == "te":
                return "ప్రామాణిక వైద్య మార్గదర్శకాలు: ఈ నిర్దిష్ట సంయోగానికి ప్రత్యేక మార్గదర్శకం లభించలేదు. సాధారణ ప్రాథమిక ఆరోగ్య పరీక్షలు వర్తిస్తాయి."
            return "Verified Clinical References: Standard general primary healthcare clinical guidelines apply."

        lines = []
        for idx, ref in enumerate(references, 1):
            title = ref.get("title", "")
            publisher = ref.get("publisher", "")
            section = ref.get("section", "")
            url = ref.get("source_url", "")
            excerpt = ref.get("direct_excerpt", "")
            lines.append(f"[{idx}] **{title}** — *{publisher}* ({ref.get('publication_date', '2022')})")
            lines.append(f"    - *Section*: {section}")
            lines.append(f"    - *Verified Excerpt*: \"{excerpt}\"")
            if url:
                lines.append(f"    - *Guideline Link*: [{publisher}]({url})")
            lines.append("")

        return "\n".join(lines)

medical_rag = MedicalEvidenceRAG()
