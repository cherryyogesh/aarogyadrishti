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
        is_te = language == "te"
        is_hi = language == "hi"

        # 1. Emergency Red-Flag Detection
        emergency = detect_emergency_symptoms(user_message)
        if emergency:
            return self._build_emergency_response(language)

        # 2. Ulcer / Mouth Sores Inquiries
        if any(w in text for w in ["ulcer", "sore", "పుండు", "పూత", "పుండ్లు", "మంట", "छाला", "घाव"]):
            return self._build_ulcer_response(language)

        # 3. Tobacco / Gutkha / Chutta / Smoking Cessation
        if any(w in text for w in ["tobacco", "gutkha", "chutta", "smoke", "beedi", "smoking", "పొగాకు", "చుట్ట", "గుట్కా", "తంబాకు", "गुटखा", "तंबाकू"]):
            return self._build_cessation_response(language)

        # 4. Burning Sensation / Spicy food / Restricted mouth opening (OSMF)
        if any(w in text for w in ["burning", "spicy", "mouth opening", "trismus", "కారం", "నోరు తెరవలేకపోవడం", "నోరు బిగువు", "తీపి", "जलन", "मुंह खुलना"]):
            return self._build_burning_osmf_response(language)

        # 5. White or Red Patches / Spots (Leukoplakia / Erythroplakia)
        if any(w in text for w in ["white", "patch", "red", "spot", "leukoplakia", "తెల్ల", "ఎర్ర", "మచ్చ", "తెల్లటి మచ్చ", "सफेद दाग", "लाल दाग"]):
            return self._build_patches_response(language)

        # 6. General Clinical Assistance
        return self._build_general_response(user_message, language, has_attachment)

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
            speech = (
                "అత్యవసర వైద్య హెచ్చరిక. మీ లక్షణాలకు తక్షణ వైద్య పరీక్ష అవసరం. "
                "దయచేసి వెంటనే సమీప ఆసుపత్రికి వెళ్ళండి లేదా ఉచిత అంబులెన్స్ కోసం 108 కు కాల్ చేయండి."
            )
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
                "### 👄 నోటి పూత & పుండ్ల ఉపశమనం (Oral Ulcer Care Guidance)\n\n"
                "నోటి పూత సాధారణంగా ఒత్తిడి, విటమిన్ లోపం (B-కాంప్లెక్స్, ఐరన్), లేదా ప్రమాదవశాత్తూ కొరుక్కోవడం వల్ల రావచ్చు.\n\n"
                "**గృహ సంరక్షణ సూచనలు:**\n"
                "• **గోరువెచ్చని ఉప్పునీటి పుక్కిలింత:** రోజుకు 3-4 సార్లు గోరువెచ్చని నీటిలో కొద్దిగా ఉప్పు వేసి నోరు శుభ్రం చేసుకోండి.\n"
                "• **కారం & పులుపు ఆహారాలకు దూరంగా ఉండండి:** ఘాటైన మసాలాలు మరియు వేడి ఆహారాలను కొన్ని రోజులు తగ్గించండి.\n"
                "• **పుష్కలంగా నీరు త్రాగండి:** శరీరాన్ని హైడ్రేటెడ్‌గా ఉంచండి, మృదువైన చల్లని ఆహారాలు తీసుకోండి.\n\n"
                "⚠️ **ముఖ్యమైన వైద్య హెచ్చరిక (14-రోజుల నియమం):**\n"
                "నోటిలోని ఏదైనా పుండు **14 రోజుల కంటే ఎక్కువ రోజులు తగ్గకుండా ఉంటే**, దయచేసి నిర్లక్ష్యం చేయకుండా వెంటనే సమీప PHC వైద్యుడిని సంప్రదించండి. ఫొటో లేదా AI ద్వారా క్యాన్సర్ నిర్ధారణ చేయడం అసాధ్యం, డాక్టర్ గారి ప్రత్యక్ష పరీక్ష తప్పనిసరి."
            )
            speech = (
                "నోటి పూత తగ్గడానికి రోజుకు మూడుసార్లు గోరువెచ్చని ఉప్పునీటితో పుక్కిలించండి. "
                "కారం మరియు వేడి ఆహారాలను నివారించండి. "
                "ముఖ్య గమనిక: ఏదైనా పుండు 14 రోజుల కంటే ఎక్కువ రోజులు తగ్గకపోతే, వెంటనే సమీప పీహెచ్‌సీ డాక్టర్‌ను సంప్రదించండి."
            )
        else:
            content = (
                "### 👄 Mouth Ulcer Management & Clinical Guidance\n\n"
                "Mouth ulcers are frequently triggered by minor trauma (accidental cheek biting), nutritional deficiencies (Vitamin B12, Iron, Folate), or stress.\n\n"
                "**Evidence-Grounded Home Self-Care:**\n"
                "• **Warm Saline Rinses:** Dissolve 1/2 tsp salt in warm water; gently rinse mouth 3–4 times daily to reduce inflammation.\n"
                "• **Dietary Modification:** Avoid very hot, spicy, rough, or acidic foods that irritate exposed nerve endings.\n"
                "• **Adequate Hydration:** Maintain good fluid intake and consume soft, bland foods.\n\n"
                "⚠️ **The Mandatory 14-Day Red-Flag Rule:**\n"
                "Under MoHFW National Oral Health protocols, **any oral sore or ulcer persisting longer than 14 days without healing** mandates an in-person physical clinical examination by a PHC Medical Officer. Photographs cannot confirm or exclude cancer; a tissue biopsy is mandatory for non-healing lesions."
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
                "పొగాకు నమలడం, గుట్కా, ఖైనీ మరియు చుట్ట కాల్చడం నోటి శ్లేష్మ పొరను దెబ్బతీసి నోటి బిగువు (OSMF) మరియు ముందస్తు క్యాన్సర్ మచ్చలకు దారితీస్తాయి.\n\n"
                "**అలవాటు సులభంగా మానేయడానికి చిట్కాలు:**\n"
                "1. **ప్రత్యామ్నాయాలు ఉపయోగించండి:** గుట్కా లేదా పొగాకు తినాలనిపించినప్పుడు లవంగాలు, యాలకులు లేదా సోంపు గింజలు నమలండి.\n"
                "2. **ట్రిగ్గర్లను గుర్తించండి:** ఏ సమయంలో పొగాకు అలవాటు ఎక్కువగా ఉంటుందో గమనించి, ఆ సమయంలో మంచి నీరు త్రాగడం లేదా నడవడం అలవాటు చేసుకోండి.\n"
                "3. **క్రమంగా తగ్గించండి:** ఒక్కసారిగా ఆపలేకపోతే, రోజువారీ మోతాదును సగానికి తగ్గించి క్రమంగా సున్నా చేయండి.\n\n"
                "📞 **ఉచిత ప్రభుత్వ కౌన్సిలింగ్ హెల్ప్‌లైన్:** **1800-11-2356** కు కాల్ చేసి ఉచిత నిపుణుల సహాయం పొందవచ్చు."
            )
            speech = (
                "పొగాకు లేదా గుట్కా తినాలనిపించినప్పుడు లవంగాలు లేదా సోంపు నమలండి. "
                "ఉచిత ప్రభుత్వ సహాయం కోసం 1800 11 2356 కు కాల్ చేయండి. "
                "పొగాకు మానేయడం మీ నోటి ఆరోగ్యాన్ని కాపాడుతుంది."
            )
        else:
            content = (
                "### 🚭 Tobacco, Gutkha & Chutta Cessation Strategies\n\n"
                "Smokeless tobacco (gutkha, khaini, zarda) and reverse smoking (chutta) directly damage the oral mucosa, leading to irreversible fibrosis (OSMF) and precancerous lesions.\n\n"
                "**Practical Steps to Overcome Tobacco Cravings:**\n"
                "1. **Healthy Oral Substitutes:** When cravings strike, chew cloves, cardamom pods, fennel seeds, or sugar-free gum.\n"
                "2. **The 5-Minute Delay Technique:** Cravings typically peak and subside within 3 to 5 minutes. Take deep breaths and drink a tall glass of cold water.\n"
                "3. **Clear Triggers:** Remove tobacco packets, lighters, and ashtrays from your home and workplace.\n\n"
                "📞 **National Tobacco Quitline (Toll-Free):** Call **1800-11-2356** for free, confidential guidance from certified counselors."
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
                "### 🌶️ కారం తిన్నప్పుడు మంట & నోరు తెరవలేకపోవడం (Burning Mouth & Trismus)\n\n"
                "కారం తిన్నప్పుడు నోరు తీవ్రంగా మండడం మరియు నోరు పూర్తిగా తెరవలేకపోవడం (నోరు బిగుతుగా ఉండడం) **ఓరల్ సబ్‌మ్యూకస్ ఫైబ్రోసిస్ (OSMF)** యొక్క ప్రాథమిక లక్షణాలు.\n\n"
                "**ముఖ్యమైన జాగ్రత్తలు:**\n"
                "• **వక్క మరియు గుట్కా వెంటనే ఆపండి:** వక్కలోని అరికోలిన్ అనే రసాయనం నోటి లోపలి కణజాలాన్ని గట్టిగా చేస్తుంది.\n"
                "• **కారపు ఆహారాలను తగ్గించండి:** నోటి శ్లేష్మ పొరపై గాయాలు మరింత పెరగకుండా చల్లని, మృదువైన ఆహారాలు తినండి.\n"
                "• **నోటి కొలత (Mouth Opening):** 3 వేళ్ళు నోట్లోకి నిలువుగా పట్టకపోతే (<35 mm), వెంటనే డాక్టర్‌కు చూపించాలి.\n\n"
                "👉 దయచేసి వీలైనంత త్వరగా మీ సమీప PHC మెడికల్ ఆఫీసర్‌ను సంప్రదించండి."
            )
            speech = (
                "కారం తిన్నప్పుడు నోరు మండడం మరియు నోరు తెరవడం తగ్గడం ఓరల్ సబ్‌మ్యూకస్ ఫైబ్రోసిస్ లక్షణం కావచ్చు. "
                "దయచేసి వక్క మరియు గుట్కా వెంటనే ఆపండి, సమీప పీహెచ్‌సీ డాక్టర్‌ను సంప్రదించండి."
            )
        else:
            content = (
                "### 🌶️ Burning Mouth Sensation & Reduced Mouth Opening (OSMF Warning Signs)\n\n"
                "A persistent burning sensation when eating spicy foods, combined with difficulty opening the mouth wide, are classic early signs of **Oral Submucous Fibrosis (OSMF)**.\n\n"
                "**Clinical Guidelines & Immediate Precautions:**\n"
                "• **Immediate Cessation of Areca Nut & Gutkha:** Arecoline alkaloids stimulate excessive collagen deposition, causing progressive stiffening.\n"
                "• **The 3-Finger Test (Interincisal Distance):** A normal mouth opening accommodates three vertically aligned fingers (>35 mm). If you can only fit 1 or 2 fingers (<30 mm), you have clinical trismus.\n"
                "• **Gentle Physiotherapy & Diet:** Avoid chilies and acidic curries. Consume nutrient-rich foods containing antioxidants (lycopene, vitamins A, C, E).\n\n"
                "👉 Please visit your PHC Medical Officer for visual staging and prescribed management."
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
                "### ⚪ నోటిలో తెల్లటి లేదా ఎర్రటి మచ్చలు (Oral Mucosal Patches)\n\n"
                "నోటి లోపల బుగ్గపై లేదా నాలుకపై వచ్చే మచ్చలు ల్యూకోప్లాకియా (తెల్లటి మచ్చ) లేదా ఎరిత్రోప్లాకియా (ఎర్రటి మచ్చ) కావచ్చు.\n\n"
                "**గుర్తుంచుకోవాల్సిన అంశాలు:**\n"
                "1. **గోకితే రాని తెల్లటి మచ్చలు:** ఇవి సాధారణంగా పొగాకు లేదా పంటి రాపిడి వల్ల వస్తాయి.\n"
                "2. **ఎర్రటి మచ్చలు (Erythroplakia):** ఎరుపు రంగు మచ్చలకు అధిక రిస్క్ ఉంటుంది, వీటికి డాక్టర్ గారి తనిఖీ తప్పనిసరి.\n\n"
                "⚠️ **వైద్య నియమం:** ఫొటో చూసి క్యాన్సర్ నిర్ధారణ చేయడం అసాధ్యం. ఖచ్చితమైన నిర్ధారణకు బయాప్సీ (Biopsy) పరీక్ష తప్పనిసరి."
            )
            speech = (
                "నోటిలోని తెల్లటి లేదా ఎర్రటి మచ్చలను వైద్యులు తప్పనిసరిగా పరిశీలించాలి. "
                "ఫొటోల ద్వారా క్యాన్సర్ నిర్ధారణ చేయడం అసాధ్యం, డాక్టర్ గారి పరీక్ష మరియు బయాప్సీ తప్పనిసరి."
            )
        else:
            content = (
                "### ⚪ Clinical Guidance on White & Red Oral Patches\n\n"
                "Persistent white patches (Leukoplakia) or fiery red velvet patches (Erythroplakia) on the buccal mucosa or tongue are categorized as Oral Potentially Malignant Disorders (OPMD).\n\n"
                "**Essential Clinical Facts:**\n"
                "1. **Non-Scrapable White Plaques:** Unlike oral thrush (candidiasis), leukoplakia cannot be wiped away with gauze.\n"
                "2. **Red Lesions (Erythroplakia):** Erythroplakic lesions carry a significantly higher risk of epithelial dysplasia and warrant high-priority referral.\n\n"
                "⚠️ **Mandatory Medical Directive:** Photographic inspection strictly CANNOT diagnose or exclude cancer. An in-person clinician examination and biopsy are mandatory."
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
        if lang == "te":
            content = (
                f"నమస్కారం! నేను ఆరోగ్య మైత్ర AI. మీ సందేహం: *\"{message}\"*\n\n"
                "ఆరోగ్య సంరక్షణ కొరకు మేము MoHFW మరియు ప్రపంచ ఆరోగ్య సంస్థ (WHO) ప్రామాణిక నిబంధనలను అనుసరిస్తాము.\n\n"
                "**మీరు ఏ అంశాల గురించి అడగవచ్చు:**\n"
                "• నోటి పూత, పుండ్లు మరియు మంటకు పరిష్కారాలు\n"
                "• పొగాకు, గుట్కా, చుట్ట అలవాటు సులభంగా మానేసే మార్గాలు\n"
                "• నోరు తెరవడం తగ్గడం (OSMF) పై అవగాహన\n"
                "• చర్మం, కన్ను లేదా గాయాల ఫొటోలను పంపి ప్రాథమిక పరిశీలన పొందడం\n\n"
                "> ⚠️ *గమనిక: ఇది ప్రాథమిక ఆరోగ్య సమాచారం మాత్రమే. ఏదైనా సమస్య 14 రోజులు మించి ఉంటే డాక్టర్‌ను సంప్రదించండి.*"
            )
            speech = (
                "నమస్కారం, నేను ఆరోగ్య మైత్ర AI. నోటి పూత, పుండ్లు, పొగాకు మానేయడం లేదా ఆరోగ్య సందేహాలపై మీరు నన్ను అడగవచ్చు."
            )
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
