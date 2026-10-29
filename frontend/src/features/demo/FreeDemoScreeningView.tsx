import React, { useState } from 'react';
import { LanguageCode } from '../../types';
import {
  compressMedicalImage, validateMedicalImage, CompressionResult
} from '../../utils/imageCompression';
import {
  ShieldAlert, CheckCircle2, AlertTriangle, AlertCircle, Sparkles,
  FileText, ExternalLink, Stethoscope, ChevronDown, ChevronUp,
  Clock, Check, X, Shield, BookOpen, Eye, HelpCircle, Layers,
  PhoneCall, Heart, Award, ArrowRight, RotateCw, ZoomIn, ZoomOut,
  Volume2, Upload, Info
} from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
  onNavigateToScreening?: () => void;
}

export interface RuleBasedTriageResult {
  tier: 'urgent_care' | 'prompt_assessment' | 'routine_review';
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  titleEn: string;
  titleTe: string;
  rationaleEn: string[];
  rationaleTe: string[];
  actionEn: string;
  actionTe: string;
  guidelines: string;
}

export const FreeDemoScreeningView: React.FC<Props> = ({ currentLang, onNavigateToScreening }) => {
  const isTe = currentLang === 'te';

  // Language switcher for demo view
  const [lang, setLang] = useState<'en' | 'te'>(isTe ? 'te' : 'en');
  const activeIsTe = lang === 'te';

  // Questionnaire State
  const [lesionType, setLesionType] = useState<string>('white_patch');
  const [anatomicalSite, setAnatomicalSite] = useState<string>('buccal_mucosa');
  const [ulcerDurationDays, setUlcerDurationDays] = useState<number>(21);
  const [mouthOpeningMm, setMouthOpeningMm] = useState<number>(26);
  const [hasBleeding, setHasBleeding] = useState<boolean>(false);
  const [hasBurning, setHasBurning] = useState<boolean>(true);
  const [hasInduration, setHasInduration] = useState<boolean>(false);
  const [hasNeckLump, setHasNeckLump] = useState<boolean>(false);
  const [tobaccoYears, setTobaccoYears] = useState<number>(8);
  const [tobaccoType, setTobaccoType] = useState<string>('khaini_gutkha');

  // Photo Upload & Preview
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressionData, setCompressionData] = useState<CompressionResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Triage Result State
  const [triageResult, setTriageResult] = useState<RuleBasedTriageResult | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Handle Photo Selection with Client-Side Compression
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateMedicalImage(file);
    if (!validation.valid) {
      setUploadError(activeIsTe ? validation.errorTe || validation.error! : validation.error!);
      return;
    }

    try {
      const compressed = await compressMedicalImage(file, 1400, 0.88);
      setSelectedFile(compressed.file);
      setPreviewUrl(compressed.previewUrl);
      setCompressionData(compressed);
      setRotation(0);
      setZoom(1);
    } catch (err: any) {
      setUploadError(err.message || 'Image loading failed');
    }
  };

  const clearPhoto = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setCompressionData(null);
    setUploadError(null);
  };

  // Evaluate Deterministic Clinical Rule Matrix (MoHFW / WHO Protocol)
  const evaluateRuleBasedTriage = (e: React.FormEvent) => {
    e.preventDefault();

    const rationaleEn: string[] = [];
    const rationaleTe: string[] = [];

    let isUrgent = false;
    let isPrompt = false;

    // RULE 1: Non-healing ulcer > 14 days
    if (lesionType === 'ulcer' && ulcerDurationDays >= 14) {
      isUrgent = true;
      rationaleEn.push(`Non-healing oral mucosal ulcer persisting for ${ulcerDurationDays} days (>14 days high-risk threshold).`);
      rationaleTe.push(`14 రోజుల కంటే ఎక్కువగా (${ulcerDurationDays} రోజులుగా) మానని నోటి పుండు ఉంది.`);
    }

    // RULE 2: Spontaneous bleeding or indurated hard borders
    if (hasBleeding || hasInduration) {
      isUrgent = true;
      rationaleEn.push('Lesion presents with spontaneous bleeding or palpable tissue induration/firmness.');
      rationaleTe.push('పుండు నుండి రక్తస్రావం లేదా తాకినప్పుడు గట్టిగా ఉన్నట్లు గుర్తించబడింది.');
    }

    // RULE 3: Severe trismus (Mouth opening < 20mm)
    if (mouthOpeningMm < 20) {
      isUrgent = true;
      rationaleEn.push(`Severe restricted mouth opening (${mouthOpeningMm} mm < 20 mm critical cutoff) indicating advanced Oral Submucous Fibrosis (OSMF Grade III/IV).`);
      rationaleTe.push(`నోరు తెరవడం 20 మి.మీ కంటే చాలా తక్కువగా (${mouthOpeningMm} మి.మీ) తీవ్రంగా పరిమితమైంది.`);
    }

    // RULE 4: Palpable neck node
    if (hasNeckLump) {
      isUrgent = true;
      rationaleEn.push('Palpable, non-tender cervical lymphadenopathy noted in the neck region.');
      rationaleTe.push('మెడ భాగంలో నొప్పిలేని గడ్డలు లేదా వాపులు గమనించబడ్డాయి.');
    }

    // RULE 5: Leukoplakia / OSMF / Erythroplakia without critical red flags
    if (!isUrgent) {
      if (lesionType === 'erythroplakia') {
        isPrompt = true;
        rationaleEn.push('Erythroplakia (velvety red patch) carries the highest clinical rate of epithelial dysplasia.');
        rationaleTe.push('ఎరుపు రంగు మచ్చ (ఎరిత్రోప్లాకియా) కణజాల మార్పులకు అధిక ప్రమాదం కలిగి ఉంటుంది.');
      } else if (lesionType === 'white_patch') {
        isPrompt = true;
        rationaleEn.push('Persistent adherent white plaque (Leukoplakia) consistent with Oral Potentially Malignant Disorder (OPMD).');
        rationaleTe.push('తుడవలేని తెల్లని గట్టి మచ్చ (ల్యూకోప్లాకియా) ప్రాథమిక దశలో ఉంది.');
      } else if (mouthOpeningMm <= 32) {
        isPrompt = true;
        rationaleEn.push(`Moderate trismus (${mouthOpeningMm} mm) with mucosal burning sensation on spicy food intake.`);
        rationaleTe.push(`కారమైన ఆహారం తిన్నప్పుడు మంట మరియు నోరు తెరవడం (${mouthOpeningMm} మి.మీ) పరిమితమైంది.`);
      }
    }

    // Determine Final Rule Tier
    let result: RuleBasedTriageResult;

    if (isUrgent) {
      result = {
        tier: 'urgent_care',
        color: '#DC2626',
        badgeBg: '#FEE2E2',
        badgeBorder: '#F87171',
        badgeText: '#991B1B',
        titleEn: 'High Clinical Urgency (Referral Needed within 72 Hours)',
        titleTe: 'అత్యవసర క్లినికల్ ప్రాధాన్యత (72 గంటలలోపు డాక్టర్ పరీక్ష అవసరం)',
        rationaleEn,
        rationaleTe,
        actionEn: 'Refer directly to Primary Health Centre Medical Officer or District Hospital Oral Onco-Surgeon for mandatory punch biopsy and clinical staging. Do not delay.',
        actionTe: 'వెంటనే పీహెచ్‌సీ మెడికల్ ఆఫీసర్ లేదా ఏరియా ఆసుపత్రి స్పెషలిస్ట్ వద్దకు వెళ్లి బయాప్సీ పరీక్ష చేయించుకోవాలి. ఆలస్యం చేయవద్దు.',
        guidelines: 'National Programme for Prevention and Control of Non-Communicable Diseases (NP-NCD) Oral Screening Guidelines'
      };
    } else if (isPrompt) {
      result = {
        tier: 'prompt_assessment',
        color: '#D97706',
        badgeBg: '#FEF3C7',
        badgeBorder: '#FCD34D',
        badgeText: '#92400E',
        titleEn: 'Priority Clinical Assessment (Schedule Visit within 7–14 Days)',
        titleTe: 'ముందస్తు క్లినికల్ పరిశీలన (7-14 రోజుల్లో డాక్టర్ అపాయింట్‌మెంట్)',
        rationaleEn,
        rationaleTe,
        actionEn: 'Schedule a clinical physical examination at the nearest Primary Health Centre. Begin immediate cessation of tobacco, areca nut, and gutkha habits.',
        actionTe: 'సమీపంలోని ప్రాథమిక ఆరోగ్య కేంద్రం (PHC) లో డాక్టర్ చేత పరీక్ష చేయించుకోండి. వెంటనే పొగాకు, గుట్కా మరియు ఖైనీ అలవాట్లను ఆపండి.',
        guidelines: 'WHO Guidelines for Early Detection and Management of Oral Potentially Malignant Disorders (OPMD)'
      };
    } else {
      result = {
        tier: 'routine_review',
        color: '#0D9488',
        badgeBg: '#CCFBF1',
        badgeBorder: '#5EEAD4',
        badgeText: '#0F766E',
        titleEn: 'Routine Preventive Care & Monthly Self-Examination',
        titleTe: 'సాధారణ నివారణ సంరక్షణ & నెలవారీ స్వీయ పరీక్ష',
        rationaleEn: [
          'No high-risk ulceration, severe trismus, or bleeding signs identified in current rule questionnaire.',
          `Tobacco history of ${tobaccoYears} years noted. Preventive habit cessation is essential to prevent future mucosal dysplasia.`
        ],
        rationaleTe: [
          'ప్రస్తుతం ఎటువంటి ప్రమాదకరమైన పుండ్లు లేదా తీవ్రమైన నోటి బిగుతు లక్షణాలు కనిపించలేదు.',
          `${tobaccoYears} సంవత్సరాలుగా అలవాట్లు ఉన్నందున, భవిష్యత్తులో నోటి సమస్యలు రాకుండా నివారించడానికి అలవాట్లను మానడం ముఖ్యం.`
        ],
        actionEn: 'Perform monthly oral self-examinations. Seek medical evaluation if any patch, sore, or burning sensation develops or persists beyond 14 days.',
        actionTe: 'నెలకు ఒకసారి అద్దంలో మీ నోటిని స్వీయ పరీక్ష చేసుకోండి. ఏదైనా మచ్చ లేదా పుండు 14 రోజులకు మించి ఉంటే వెంటనే డాక్టర్‌ను సంప్రదించండి.',
        guidelines: 'Ministry of Health and Family Welfare (MoHFW) Community Oral Health Preventive Protocol'
      };
    }

    setTriageResult(result);
  };

  // Text-To-Speech for Audio Accessibility
  const toggleVoice = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !triageResult) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = activeIsTe
      ? `${triageResult.titleTe}. సిఫార్సు: ${triageResult.actionTe}`
      : `${triageResult.titleEn}. Recommended action: ${triageResult.actionEn}`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = activeIsTe ? 'te-IN' : 'en-US';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Top Banner: Free Demo & Transparent Rule-Based Screening */}
      <div style={{
        background: 'linear-gradient(135deg, #0A192F 0%, #1E293B 60%, #0F766E 100%)',
        borderRadius: '18px',
        padding: '1.75rem 2rem',
        color: '#FFFFFF',
        marginBottom: '1.75rem',
        boxShadow: 'var(--shadow-md)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
              <span style={{
                background: 'rgba(13, 148, 136, 0.25)',
                color: '#5EEAD4',
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.74rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}>
                ✓ 100% Free Demo Mode • Offline Capable
              </span>
              <span style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#E2E8F0',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 600
              }}>
                Transparent Rule-Based Triage
              </span>
            </div>

            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0 0 0.4rem 0', letterSpacing: '-0.01em' }}>
              {activeIsTe ? 'ఉచిత కమ్యూనిటీ డెమో స్క్రీనింగ్ (ప్రాథమిక తనిఖీ)' : 'Free Community Demo Screening (Rule-Based Triage)'}
            </h1>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#CBD5E1', maxWidth: '780px', lineHeight: 1.5 }}>
              {activeIsTe
                ? 'ఈ ఉచిత డెమో మోడ్ ప్రభుత్వ ఆరోగ్య మార్గదర్శకాల (MoHFW & WHO) ఆధారంగా రూపొందించబడింది. ఇది AI మోడల్ లేకపోయినా పూర్తిగా ఆఫ్‌లైన్‌లో మీ మొబైల్ లేదా కంప్యూటర్‌లోనే పనిచేస్తుంది.'
                : 'This free demo mode operates strictly on deterministic clinical decision rules from MoHFW and WHO guidelines. It functions 100% offline without requiring any cloud AI or server.'}
            </p>
          </div>

          {/* Language Switcher */}
          <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.12)', padding: '0.3rem', borderRadius: '10px' }}>
            <button
              type="button"
              onClick={() => setLang('en')}
              style={{
                background: lang === 'en' ? 'var(--teal-primary)' : 'transparent',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem',
                fontWeight: lang === 'en' ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLang('te')}
              style={{
                background: lang === 'te' ? 'var(--teal-primary)' : 'transparent',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem',
                fontWeight: lang === 'te' ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              తెలుగు (Telugu)
            </button>
          </div>
        </div>

        {/* Mandatory Non-Diagnostic Rule-Based Notice */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '10px',
          padding: '0.75rem 1rem',
          marginTop: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem'
        }}>
          <AlertCircle size={18} color="#FBBF24" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.8rem', color: '#FEF3C7', lineHeight: 1.45 }}>
            <strong>{activeIsTe ? 'ముఖ్యమైన గమనిక:' : 'Mandatory Clinical Notice:'}</strong>{' '}
            {activeIsTe
              ? 'ఈ డెమో స్క్రీనింగ్ కేవలం ప్రాథమిక పరిశీలన మాత్రమే. ఇది నిర్ధారిత వైద్య నిర్ధారణ కాదు. అర్హత కలిగిన వైద్యుల ప్రత్యక్ష పరీక్ష తప్పనిసరి. ఏ మందులను సొంతంగా వాడకండి.'
              : 'This screening assessment is strictly rule-based educational triage and is NOT a confirmed diagnosis. An in-person clinical physical exam by a licensed doctor is mandatory.'}
          </span>
        </div>
      </div>

      {/* Main Grid: Questionnaire (Left) & Triage Output (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1.75rem', alignItems: 'start' }}>
        {/* Left Column: Form Questionnaire */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 1.25rem 0', color: 'var(--text-primary)' }}>
            {activeIsTe ? 'క్లినికల్ లక్షణాల ప్రశ్నావళి' : 'Clinical Symptom Questionnaire'}
          </h2>

          <form onSubmit={evaluateRuleBasedTriage}>
            {/* 1. Lesion Visual Type */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                1. {activeIsTe ? 'నోటిలో కనిపించే మార్పు (Visible Oral Feature):' : 'Observed Oral Lesion Feature:'}
              </label>
              <select
                value={lesionType}
                onChange={(e) => setLesionType(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.88rem' }}
              >
                <option value="white_patch">{activeIsTe ? 'తెల్లటి గట్టి మచ్చ (Leukoplakia - White Plaque)' : 'White Adherent Plaque (Oral Leukoplakia)'}</option>
                <option value="erythroplakia">{activeIsTe ? 'ఎర్రటి వెల్వెట్ మచ్చ (Erythroplakia - High Risk)' : 'Velvety Red Patch (Erythroplakia - High Risk)'}</option>
                <option value="ulcer">{activeIsTe ? 'మానని పుండు లేదా గాయం (Non-healing Ulcer)' : 'Non-healing Ulcer / Sore'}</option>
                <option value="osmf_bands">{activeIsTe ? 'నోరు బిగుసుకుపోవడం / ఫైబ్రోసిస్ (OSMF Bands)' : 'Blanched Fibrous Bands (OSMF Trismus)'}</option>
                <option value="normal">{activeIsTe ? 'సాధారణ నోటి ఉపరితలం / ఎటువంటి మచ్చ లేదు' : 'Normal Mucosa / No Visible Patch'}</option>
              </select>
            </div>

            {/* 2. Anatomical Subsite */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                2. {activeIsTe ? 'నోటి భాగం (Anatomical Site):' : 'Anatomical Subsite:'}
              </label>
              <select
                value={anatomicalSite}
                onChange={(e) => setAnatomicalSite(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.88rem' }}
              >
                <option value="buccal_mucosa">{activeIsTe ? 'బుగ్గ లోపలి భాగం (Left/Right Buccal Mucosa)' : 'Buccal Mucosa (Inner Cheeks)'}</option>
                <option value="tongue">{activeIsTe ? 'నాలుక పార్శ్వపు అంచులు (Tongue Lateral Borders)' : 'Tongue (Lateral Border or Dorsum)'}</option>
                <option value="floor_of_mouth">{activeIsTe ? 'నోటి అడుగు భాగం (Floor of Mouth)' : 'Floor of Mouth'}</option>
                <option value="gums">{activeIsTe ? 'చిగుళ్ళు & పంటి అంచులు (Gingiva / Gums)' : 'Gums & Alveolar Ridge'}</option>
                <option value="palate">{activeIsTe ? 'గట్టి లేదా మృదువైన అంగిలి (Palate)' : 'Hard / Soft Palate'}</option>
                <option value="lip">{activeIsTe ? 'పెదవుల లోపలి భాగం (Labial Mucosa)' : 'Lower / Upper Lip'}</option>
              </select>
            </div>

            {/* 3. Duration Slider */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  3. {activeIsTe ? 'లక్షణాలు ప్రారంభమైన వ్యవధి (రోజుల్లో):' : 'Duration of Symptoms (in Days):'}
                </label>
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px',
                  background: ulcerDurationDays >= 14 ? '#FEE2E2' : '#DCFCE7',
                  color: ulcerDurationDays >= 14 ? '#991B1B' : '#166534'
                }}>
                  {ulcerDurationDays} {activeIsTe ? 'రోజులు' : 'days'} {ulcerDurationDays >= 14 && '(>14 Days Warning)'}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={90}
                value={ulcerDurationDays}
                onChange={(e) => setUlcerDurationDays(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* 4. Mouth Opening (Trismus) Slider */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  4. {activeIsTe ? 'నోరు తెరవడం (Mouth Opening):' : 'Mouth Opening (Inter-incisal distance):'}
                </label>
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px',
                  background: mouthOpeningMm < 20 ? '#FEE2E2' : mouthOpeningMm < 35 ? '#FEF3C7' : '#DCFCE7',
                  color: mouthOpeningMm < 20 ? '#991B1B' : mouthOpeningMm < 35 ? '#92400E' : '#166534'
                }}>
                  {mouthOpeningMm} mm {mouthOpeningMm < 20 ? '(Severe Trismus)' : mouthOpeningMm < 35 ? '(Reduced)' : '(Normal)'}
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={50}
                value={mouthOpeningMm}
                onChange={(e) => setMouthOpeningMm(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* 5. Clinical Warning Checkboxes */}
            <div style={{ marginBottom: '1.5rem', background: '#F8FAFC', padding: '1rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.65rem' }}>
                5. {activeIsTe ? 'అనుబంధ లక్షణాలను ఎంచుకోండి:' : 'Associated Clinical Signs:'}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.84rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={hasBurning}
                    onChange={(e) => setHasBurning(e.target.checked)}
                  />
                  {activeIsTe ? 'కారమైన ఆహారం తిన్నప్పుడు మంట (Burning Sensation)' : 'Burning Sensation on spicy food intake'}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.84rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={hasBleeding}
                    onChange={(e) => setHasBleeding(e.target.checked)}
                  />
                  {activeIsTe ? 'స్వల్ప స్పర్శకే రక్తస్రావం (Bleeding upon light touch)' : 'Bleeding upon touch or spontaneously'}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.84rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={hasInduration}
                    onChange={(e) => setHasInduration(e.target.checked)}
                  />
                  {activeIsTe ? 'పుండు అంచులు గట్టిగా ఉండటం (Firm Induration / Hard Edges)' : 'Palpable induration or hard, rolled borders'}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.84rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={hasNeckLump}
                    onChange={(e) => setHasNeckLump(e.target.checked)}
                  />
                  {activeIsTe ? 'మెడ భాగంలో గడ్డలు లేదా వాపు (Neck Lymph Node Swelling)' : 'Enlarged / palpable lump in the neck'}
                </label>
              </div>
            </div>

            {/* Optional Photo Upload in Demo Mode */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                6. {activeIsTe ? 'ఐచ్ఛిక ఫోటో ప్రివ్యూ (ఆఫ్‌లైన్ పరీక్ష కోసం):' : 'Optional Photo Preview (For Visual Reference):'}
              </label>

              {!previewUrl ? (
                <label style={{
                  border: '2px dashed #CBD5E1',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: '#F8FAFC'
                }}>
                  <Upload size={24} color="var(--teal-primary)" style={{ marginBottom: '0.4rem' }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {activeIsTe ? 'ఫోటోను ఎంచుకోండి (స్వయంచాలక కంప్రెషన్)' : 'Choose Photo (Client-Side Compressed)'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    JPEG, PNG, WebP (Images are kept in browser only)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    style={{ display: 'none' }}
                  />
                </label>
              ) : (
                <div style={{ background: '#0F172A', borderRadius: '10px', padding: '0.75rem', color: '#FFF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#E2E8F0' }}>
                      {selectedFile?.name} {compressionData && `(${Math.round(compressionData.compressedSizeBytes / 1024)} KB)`}
                    </span>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => setRotation((r) => (r + 90) % 360)}
                        style={{ background: '#334155', color: '#FFF', border: 'none', borderRadius: '4px', padding: '0.25rem', cursor: 'pointer' }}
                      >
                        <RotateCw size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoom((z) => Math.min(z + 0.2, 2.5))}
                        style={{ background: '#334155', color: '#FFF', border: 'none', borderRadius: '4px', padding: '0.25rem', cursor: 'pointer' }}
                      >
                        <ZoomIn size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoom((z) => Math.max(z - 0.2, 0.6))}
                        style={{ background: '#334155', color: '#FFF', border: 'none', borderRadius: '4px', padding: '0.25rem', cursor: 'pointer' }}
                      >
                        <ZoomOut size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={clearPhoto}
                        style={{ background: '#DC2626', color: '#FFF', border: 'none', borderRadius: '4px', padding: '0.25rem', cursor: 'pointer' }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                  <div style={{ maxHeight: '180px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src={previewUrl}
                      alt="Uploaded preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '180px',
                        transform: `rotate(${rotation}deg) scale(${zoom})`,
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                </div>
              )}

              {uploadError && (
                <div style={{ color: '#DC2626', fontSize: '0.78rem', marginTop: '0.4rem' }}>
                  {uploadError}
                </div>
              )}
            </div>

            {/* Submit Triage Button */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', minHeight: '48px', fontSize: '0.95rem' }}
            >
              <CheckCircle2 size={18} />
              {activeIsTe ? 'క్లినికల్ నిబంధనలతో పరిశీలించండి' : 'Evaluate Rule-Based Triage'}
            </button>
          </form>
        </div>

        {/* Right Column: Triage Result & Educational Medical Guidance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Triage Output Card */}
          {triageResult ? (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: `2px solid ${triageResult.color}`,
              padding: '1.75rem',
              boxShadow: 'var(--shadow-md)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{
                  background: triageResult.badgeBg,
                  border: `1px solid ${triageResult.badgeBorder}`,
                  color: triageResult.badgeText,
                  padding: '0.35rem 0.75rem',
                  borderRadius: '999px',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  {triageResult.tier.replace('_', ' ')}
                </span>

                <button
                  type="button"
                  onClick={toggleVoice}
                  style={{
                    background: isSpeaking ? '#DC2626' : 'rgba(13, 148, 136, 0.1)',
                    border: '1px solid var(--teal-primary)',
                    color: isSpeaking ? '#FFF' : 'var(--teal-primary)',
                    borderRadius: '8px',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Volume2 size={14} />
                  {isSpeaking ? (activeIsTe ? 'ఆపండి' : 'Stop') : (activeIsTe ? 'వినండి' : 'Listen')}
                </button>
              </div>

              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: triageResult.color, margin: '0 0 0.75rem 0' }}>
                {activeIsTe ? triageResult.titleTe : triageResult.titleEn}
              </h3>

              {/* Rationale Bullet Points */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  {activeIsTe ? 'నిబంధనల ఆధారిత కారణాలు:' : 'Clinical Rule Rationale:'}
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {(activeIsTe ? triageResult.rationaleTe : triageResult.rationaleEn).map((r, i) => (
                    <li key={i} style={{ marginBottom: '0.35rem' }}>{r}</li>
                  ))}
                </ul>
              </div>

              {/* Action Box */}
              <div style={{
                background: triageResult.badgeBg,
                borderLeft: `4px solid ${triageResult.color}`,
                padding: '0.85rem 1rem',
                borderRadius: '0 8px 8px 0',
                marginBottom: '1rem'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: triageResult.badgeText, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  {activeIsTe ? 'సిఫార్సు చేయబడిన తదుపరి చర్య:' : 'Recommended Action:'}
                </div>
                <div style={{ fontSize: '0.86rem', color: triageResult.badgeText, fontWeight: 600, lineHeight: 1.45 }}>
                  {activeIsTe ? triageResult.actionTe : triageResult.actionEn}
                </div>
              </div>

              {/* Protocol Citation */}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <strong>{activeIsTe ? 'ప్రోటోకాల్ మూలం:' : 'Standard Protocol:'}</strong> {triageResult.guidelines}
              </div>
            </div>
          ) : (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px dashed var(--border-color)',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              color: 'var(--text-secondary)'
            }}>
              <Stethoscope size={36} color="#94A3B8" style={{ margin: '0 auto 0.75rem auto' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: 'var(--text-primary)' }}>
                {activeIsTe ? 'పరిశీలన ఫలితం కోసం వేచి ఉంది' : 'Ready for Rule Evaluation'}
              </h3>
              <p style={{ fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
                {activeIsTe
                  ? 'ఎడమ వైపున మీ లక్షణాలను ఎంచుకుని "క్లినికల్ నిబంధనలతో పరిశీలించండి" బటన్ నొక్కండి.'
                  : 'Select your clinical symptoms on the left and click "Evaluate Rule-Based Triage".'}
              </p>
            </div>
          )}

          {/* Educational Guidance: 6-Step Oral Self-Examination */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.75rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={18} color="var(--teal-primary)" />
              {activeIsTe ? 'నోటి స్వీయ పరీక్ష (Oral Self-Examination - 6 దశలు)' : 'Oral Self-Examination (6 Simple Steps)'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
              <div><strong>1. Lips:</strong> {activeIsTe ? 'పెదవుల లోపల మరియు బయట భాగాన్ని తనిఖీ చేయండి.' : 'Check both outer and inner surface of lips.'}</div>
              <div><strong>2. Cheeks:</strong> {activeIsTe ? 'బుగ్గల లోపలి ఉపరితలంపై తెల్లని/ఎర్రని మచ్చలు ఉన్నాయేమో చూడండి.' : 'Inspect inner cheeks for white or reddish patches.'}</div>
              <div><strong>3. Tongue:</strong> {activeIsTe ? 'నాలుకను బయటకు చాచి రెండు పార్శ్వపు అంచులను పరిశీలించండి.' : 'Stick tongue out and examine both lateral borders.'}</div>
              <div><strong>4. Floor of Mouth:</strong> {activeIsTe ? 'నాలుకను పైకి ఎత్తి నాలుక క్రింది భాగాన్ని చూడండి.' : 'Lift tongue to roof of mouth and inspect the floor.'}</div>
              <div><strong>5. Palate:</strong> {activeIsTe ? 'తల పైకెత్తి అద్దంలో గట్టి అంగిలి రంగును గమనించండి.' : 'Tilt head back to inspect the hard and soft palate.'}</div>
              <div><strong>6. Neck:</strong> {activeIsTe ? 'మెడ భాగంలో ఏవైనా గడ్డలు లేదా వాపులు ఉన్నాయేమో తాకి చూడండి.' : 'Gently palpate your neck for any enlarged lumps.'}</div>
            </div>
          </div>

          {/* Emergency Red Flags & Helplines */}
          <div style={{
            background: '#FFF1F2',
            borderRadius: '16px',
            border: '1px solid #FECDD3',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9F1239', fontWeight: 800, fontSize: '0.88rem' }}>
              <PhoneCall size={18} />
              {activeIsTe ? 'అత్యవసర సంప్రదింపులు (Emergency Contacts)' : 'Emergency Helplines & Contacts'}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#881337', lineHeight: 1.5 }}>
              • <strong>108 Emergency Ambulance:</strong> {activeIsTe ? 'అత్యవసర అంబులెన్స్ సేవలు' : 'Immediate emergency transport'}<br />
              • <strong>104 Health Information Line:</strong> {activeIsTe ? 'ఉచిత ప్రభుత్వ ఆరోగ్య సలహా' : 'Toll-free government medical guidance'}<br />
              • <strong>District Hospital Paderu:</strong> {activeIsTe ? 'ఏజెన్సీ జిల్లా ఆసుపత్రి రిఫరల్ డెస్క్' : 'Tribal agency hospital referral desk'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
