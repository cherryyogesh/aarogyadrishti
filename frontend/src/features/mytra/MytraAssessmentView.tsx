import React, { useState } from 'react';
import { api } from '../../services/api';
import { MytraAnalysisResponse, User, LanguageCode } from '../../types';
import {
  ShieldAlert, CheckCircle2, AlertTriangle, AlertCircle, Sparkles,
  FileText, ExternalLink, Stethoscope, ChevronDown, ChevronUp,
  Clock, Check, X, Shield, BookOpen, Eye, HelpCircle, Layers,
  Heart, Users, ClipboardList
} from 'lucide-react';

interface Props {
  assessment: MytraAnalysisResponse;
  user: User;
  currentLang?: LanguageCode;
  onReviewed?: (updated: any) => void;
  showClinicianReviewForm?: boolean;
}

export const MytraAssessmentView: React.FC<Props> = ({
  assessment,
  user,
  currentLang = 'en',
  onReviewed,
  showClinicianReviewForm = true
}) => {
  const isTe = currentLang === 'te';
  const isHi = currentLang === 'hi';
  const tr = (teText: string, enText: string, hiText: string) => {
    if (currentLang === 'te') return teText;
    if (currentLang === 'hi') return hiText;
    return enText;
  };

  // Clinician Review Form State
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'amended' | 'rejected'>('approved');
  const [clinicianNotes, setClinicianNotes] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [amendedObsText, setAmendedObsText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  // Accordion / collapsible states for sections
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [activeStakeholderTab, setActiveStakeholderTab] = useState<'all' | 'patient' | 'asha' | 'doctor'>('all');

  const isClinician = user.role === 'doctor' || user.role === 'phc_staff' || user.role === 'admin';

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicianNotes.trim()) {
      alert(tr('దయచేసి డాక్టర్ క్లినికల్ నోట్స్ నమోదు చేయండి', 'Please provide clinical notes for this review.', 'कृपया इस समीक्षा के लिए नैदानिक नोट्स प्रदान करें।'));
      return;
    }

    setSubmittingReview(true);
    setReviewSuccess(null);
    try {
      const amendedList = amendedObsText.trim()
        ? amendedObsText.split('\n').map((s) => s.trim()).filter(Boolean)
        : undefined;

      const resp = await api.reviewMytraAssessment(assessment.assessment_id, {
        decision: reviewDecision,
        clinician_notes: clinicianNotes,
        action_plan: actionPlan,
        amended_observations: amendedList
      });

      setReviewSuccess(
        isTe
          ? 'వైద్యుల క్లినికల్ సమీక్ష విజయవంతంగా నమోదు చేయబడింది!'
          : 'Clinician review and amendment recorded successfully!'
      );
      if (onReviewed) onReviewed(resp);
    } catch (err: any) {
      alert('Review submission failed: ' + err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const getUrgencyBadge = () => {
    switch (assessment.urgency) {
      case 'urgent_care':
        return {
          bg: '#FEE2E2',
          border: '#DC2626',
          text: '#991B1B',
          label: tr('అత్యవసర ఆసుపత్రి సంరక్షణ', 'URGENT HOSPITAL CARE', 'अत्यवश्यक अस्पताल देखभाल'),
          icon: AlertTriangle
        };
      case 'prompt_assessment':
        return {
          bg: '#FEF3C7',
          border: '#D97706',
          text: '#92400E',
          label: tr('సత్వర వైద్య పరీక్ష అవసరం (48-72 గంటల్లో)', 'PROMPT MEDICAL ASSESSMENT', 'शीघ्र चिकित्सा जांच आवश्यक (48-72 घंटों में)'),
          icon: Clock
        };
      case 'routine_review':
      default:
        return {
          bg: '#E0F2FE',
          border: '#0284C7',
          text: '#075985',
          label: tr('సాధారణ పీహెచ్‌సీ సమీక్ష', 'ROUTINE PHC REVIEW', 'सामान्य पीएचसी समीक्षा'),
          icon: CheckCircle2
        };
    }
  };

  const urgencyBadge = getUrgencyBadge();
  const UrgencyIcon = urgencyBadge.icon;

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: '14px',
      overflow: 'hidden',
      boxShadow: '0 4px 18px rgba(0, 0, 0, 0.05)',
      marginTop: '1.25rem',
      fontFamily: 'inherit'
    }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #042F2E 0%, #0F766E 60%, #115E59 100%)',
        color: '#FFFFFF',
        padding: '1.1rem 1.4rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '10px',
            padding: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={22} color="#5EEAD4" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.02em', color: '#F0FDFA' }}>
                Aarogya Mytra AI
              </span>

              <span style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#E2E8F0',
                fontSize: '0.68rem',
                fontWeight: 600,
                padding: '0.15rem 0.5rem',
                borderRadius: '12px'
              }}>
                MoHFW / WHO Evidence RAG
              </span>
            </div>
            <div style={{ fontSize: '0.76rem', color: '#CCFBF1', marginTop: '0.15rem' }}>
              {isTe
                ? 'వైద్యుల పర్యవేక్షణ కోసం సాక్ష్యాధారిత ప్రాథమిక ఇమేజ్ విశ్లేషణ నివేదిక'
                : 'Evidence-grounded preliminary observation report for clinician review'}
            </div>
          </div>
        </div>

        {/* Urgency Pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: urgencyBadge.bg,
          color: urgencyBadge.text,
          border: `1.5px solid ${urgencyBadge.border}`,
          borderRadius: '20px',
          padding: '0.35rem 0.85rem',
          fontSize: '0.75rem',
          fontWeight: 800
        }}>
          <UrgencyIcon size={14} color={urgencyBadge.border} />
          <span>{urgencyBadge.label}</span>
        </div>
      </div>

      <div style={{ padding: '1.4rem' }}>
        {/* MANDATORY CANCER & CLINICAL OVERSIGHT BANNER */}
        <div style={{
          background: '#FFFBEB',
          border: '1.5px solid #FCD34D',
          borderRadius: '10px',
          padding: '0.9rem 1.1rem',
          marginBottom: '1.4rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem'
        }}>
          <ShieldAlert size={20} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {tr('వైద్య రక్షణ మార్గదర్శకం (Clinical Safety Guardrail)', 'Clinical Safety & Diagnostic Boundary', 'चिकित्सा सुरक्षा दिशानिर्देश एवं सीमाएं')}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#78350F', marginTop: '0.25rem', lineHeight: 1.5 }}>
              {assessment.cancer_safety_notice || (isTe
                ? 'ఈ ఫొటో ద్వారా క్యాన్సర్ లేదా ఇతర తీవ్ర వ్యాధులను నిర్ధారించలేము లేదా మినహాయించలేము. తుది నిర్ధారణ కొరకు అర్హత కలిగిన వైద్యాధికారి ప్రత్యక్ష పరీక్ష మరియు అవసరమైతే బయాప్సీ తప్పనిసరి.'
                : 'The image shows findings that cannot be reliably diagnosed from a photograph alone. Several conditions produce similar appearances. Arrange assessment by a qualified doctor; further physical exam or biopsy may be necessary.')}
            </div>
          </div>
        </div>

        {/* MULTI-STAKEHOLDER UNIVERSAL COMMUNICATION PANEL */}
        <div style={{
          background: '#F8FAFC',
          border: '1.5px solid #CBD5E1',
          borderRadius: '12px',
          padding: '1.1rem',
          marginBottom: '1.4rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.6rem',
            marginBottom: '0.85rem',
            borderBottom: '1px solid #E2E8F0',
            paddingBottom: '0.65rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Users size={18} color="#0D9488" />
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
                  {tr('బహుళ వినియోగదారుల సమగ్ర వివరణ (Universal Multi-Stakeholder Views)', 'Universal Healthcare Multi-Stakeholder Perspective', 'सार्वभौमिक बहु-हितधारक दृष्टिकोण')}
                </h4>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.15rem' }}>
                {isTe
                  ? 'రోగులు, ఆశా కార్యకర్తలు మరియు వైద్యులు సులభంగా అర్థం చేసుకునేలా వేర్వేరు నివేదికలు'
                  : 'Tailored clear perspectives for Patients & Families, ASHA Field Staff, and Clinicians'}
              </div>
            </div>

            {/* Stakeholder Selector Tabs */}
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: tr('👥 అందరికీ (All)', '👥 All Views', '👥 सभी (All)') },
                { id: 'patient', label: tr('🗣️ రోగి (Patient)', '🗣️ Patient & Family', '🗣️ रोगी एवं परिवार') },
                { id: 'asha', label: tr('👩‍⚕️ ఆశా (ASHA)', '👩‍⚕️ ASHA & Field', '👩‍⚕️ आशा कार्यकर्ता') },
                { id: 'doctor', label: tr('🩺 డాక్టర్ (Doctor)', '🩺 Clinician Dossier', '🩺 डॉक्टर डोजियर') }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveStakeholderTab(tab.id as any)}
                  style={{
                    background: activeStakeholderTab === tab.id ? '#0D9488' : '#FFFFFF',
                    color: activeStakeholderTab === tab.id ? '#FFFFFF' : '#334155',
                    border: `1.5px solid ${activeStakeholderTab === tab.id ? '#0D9488' : '#CBD5E1'}`,
                    borderRadius: '20px',
                    padding: '0.3rem 0.75rem',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* TIER 1: PATIENT & FAMILY VIEW */}
            {(activeStakeholderTab === 'all' || activeStakeholderTab === 'patient') && (
              <div style={{
                background: '#FFFFFF',
                border: '1.5px solid #10B981',
                borderRadius: '10px',
                padding: '1rem',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{ fontSize: '1.15rem' }}>🗣️</span>
                    <h5 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#065F46' }}>
                      {assessment.stakeholder_views?.patient?.title || (isTe ? 'రోగి & కుటుంబ సభ్యులకు సులభమైన వివరణ (For Patients & Families)' : 'Plain Explanation for Patients & Families')}
                    </h5>
                  </div>
                  <span style={{ background: '#DCFCE7', color: '#166534', padding: '0.15rem 0.55rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700 }}>
                    {tr('సులభమైన గ్రామీణ భాష', 'Gentle Plain Language', 'सरल एवं स्पष्ट भाषा')}
                  </span>
                </div>

                <div style={{ fontSize: '0.84rem', color: '#1E293B', lineHeight: 1.55, marginBottom: '0.65rem' }}>
                  <strong>{tr('ఏమి కనిపిస్తోంది:', 'What is seen:', 'क्या दिखाई दे रहा है:')}</strong>{' '}
                  {assessment.stakeholder_views?.patient?.summary || (isTe
                    ? 'మీ నోటిలో లేదా నాలుకపై పుండు/మచ్చ కనిపిస్తోంది. ఇది సాధారణ విటమిన్ లోపం, ఆహార రాపిడి లేదా ఇతర కారణాల వల్ల కావచ్చు. కంగారు పడవలసిన అవసరం లేదు, జాగ్రత్తలు పాటించండి.'
                    : 'A visible oral mucosal sore or patch is observed. This can arise from nutritional deficiency, local trauma, or other conditions. Maintain calm self-care.')}
                </div>

                <div style={{ background: '#F0FDF4', borderRadius: '8px', padding: '0.65rem 0.85rem', marginBottom: '0.65rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#166534', marginBottom: '0.35rem' }}>
                    {tr('మీరు ఇంట్లో చేయవలసిన తక్షణ సంరక్షణ (Home Self-Care):', 'Immediate Home Self-Care Steps:', 'घर पर की जाने वाली तात्कालिक देखभाल:')}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#14532D', lineHeight: 1.6 }}>
                    {(assessment.stakeholder_views?.patient?.home_care || [
                      isTe ? 'గోరువెచ్చని నీటిలో కొద్దిగా ఉప్పు వేసి రోజుకు 3 సార్లు పుక్కిలించండి.' : 'Gently rinse mouth with warm salt water 3–4 times daily.',
                      isTe ? 'కారం, వేడి, పులుపు ఆహారాలను తాత్కాలికంగా తగ్గించండి.' : 'Avoid spicy, rough, hot, or acidic food that causes burning.',
                      isTe ? 'పుండుపై సున్నం, ఘాటైన పల్పొడులు లేదా సొంత మందులు రాయవద్దు.' : 'Never scratch the sore or apply unprescribed lime or powders.',
                      isTe ? 'పుష్కలంగా మంచినీరు త్రాగండి, చల్లని లేదా మృదువైన ఆహారం తీసుకోండి.' : 'Stay hydrated and consume soft, nutritious, bland foods.'
                    ]).map((care: string, cIdx: number) => (
                      <li key={cIdx}>{care}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#047857', background: '#ECFDF5', padding: '0.5rem 0.75rem', borderRadius: '6px', borderLeft: '3px solid #10B981' }}>
                  <strong>👉 {tr('డాక్టర్‌ను ఎందుకు సంప్రదించాలి:', 'Why an in-person doctor checkup is needed:', 'डॉक्टर से परामर्श क्यों आवश्यक है:')}</strong>{' '}
                  {assessment.stakeholder_views?.patient?.doctor_reason || (isTe
                    ? 'నోటిలోని ఏదైనా పుండు 14 రోజుల కంటే ఎక్కువ రోజులు తగ్గకుండా ఉంటే, సరైన చికిత్స కొరకు సమీప ప్రాథమిక ఆరోగ్య కేంద్రం (PHC) వైద్యుడిని సంప్రదించాలి. ముందస్తు పరీక్ష ఆరోగ్యాన్ని కాపాడుతుంది.'
                    : 'Any mouth ulcer persisting longer than 14 days requires an in-person PHC doctor examination to verify healing and prescribe targeted treatment.')}
                </div>
              </div>
            )}

            {/* TIER 2: ASHA WORKER & FIELD STAFF VIEW */}
            {(activeStakeholderTab === 'all' || activeStakeholderTab === 'asha') && (
              <div style={{
                background: '#FFFFFF',
                border: '1.5px solid #0284C7',
                borderRadius: '10px',
                padding: '1rem',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{ fontSize: '1.15rem' }}>👩‍⚕️</span>
                    <h5 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0369A1' }}>
                      {assessment.stakeholder_views?.asha?.title || (isTe ? 'ఆశా కార్యకర్తలు & PHC సిబ్బందికి మార్గదర్శకాలు (For ASHA Workers)' : 'Field Action Checklist for ASHA & Field Staff')}
                    </h5>
                  </div>
                  <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '0.15rem 0.55rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700 }}>
                    {tr('ఫీల్డ్ చెక్‌లిస్ట్', 'Field Protocol Checklist', 'फील्ड प्रोटोकॉल चेकलिस्ट')}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                    {tr('అత్యవసర ప్రాధాన్యత (Priority Urgency):', 'Action Urgency Level:', 'कार्रवाई प्राथमिकता स्तर:')}
                  </span>
                  <span style={{
                    background: urgencyBadge.bg,
                    color: urgencyBadge.text,
                    border: `1px solid ${urgencyBadge.border}`,
                    padding: '0.15rem 0.55rem',
                    borderRadius: '12px',
                    fontSize: '0.72rem',
                    fontWeight: 800
                  }}>
                    {assessment.stakeholder_views?.asha?.action_urgency || urgencyBadge.label}
                  </span>
                </div>

                <div style={{ background: '#F0F9FF', borderRadius: '8px', padding: '0.65rem 0.85rem', marginBottom: '0.65rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0369A1', marginBottom: '0.35rem' }}>
                    {tr('ఫీల్డ్ చెక్‌లిస్ట్ (రోగిని అడగవలసిన ప్రశ్నలు):', 'Field Screening Questions (Check with Patient):', 'फील्ड स्क्रीनिंग प्रश्न (रोगी से पूछें):')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {(assessment.stakeholder_views?.asha?.field_checklist || [
                      isTe ? 'పుండు వ్యవధి: ఈ పుండు ఎన్ని రోజులుగా ఉంది? (14 రోజుల కంటే ఎక్కువైతే హై-ప్రయారిటీ రిఫరల్)' : 'Duration: Present > 14 days? (Mandates priority clinical referral)',
                      isTe ? 'అలవాట్లు: గుట్కా, ఖైనీ, తంబాకు, చుట్ట (రివర్స్ స్మోకింగ్) అలవాటు ఉందా? మానేయాలని కౌన్సిలింగ్ ఇవ్వండి.' : 'Tobacco screening: Inquire on gutkha, betel nut, or reverse smoking (chutta); advise quitting.',
                      isTe ? 'నోరు తెరవడం (3-Finger Test): 3 వేళ్ళు నిలువుగా పడుతున్నాయా? బిగుతుగా ఉంటే OSMF అనుమానించండి.' : '3-Finger test: Can patient insert 3 fingers vertically? Restricted opening indicates OSMF.',
                      isTe ? 'కారం తిన్నప్పుడు మంట లేదా నమలడం/మింగడంలో తీవ్ర నొప్పి ఉందా?' : 'Burning sensation with spices or dysphagia while swallowing.',
                      isTe ? 'మెడ గడ్డలు: దవడ కింద లేదా మెడలో వాపు/గడ్డలు ఉన్నాయా?' : 'Lymph nodes: Palpate neck and submandibular area for enlargement.'
                    ]).map((chk: string, chkIdx: number) => (
                      <div key={chkIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.78rem', color: '#0C4A6E' }}>
                        <span style={{ color: '#0284C7', fontWeight: 800 }}>✓</span>
                        <span>{chk}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#0369A1', background: '#F0F9FF', padding: '0.5rem 0.75rem', borderRadius: '6px', borderLeft: '3px solid #0284C7' }}>
                  <strong>{tr('తదుపరి చర్య (Action Step):', 'Next Action Step:', 'अगला कदम:')}</strong>{' '}
                  {assessment.stakeholder_views?.asha?.referral_step || (isTe
                    ? '48–72 గంటల్లో సమీప ప్రాథమిక ఆరోగ్య కేంద్రం (PHC) వైద్యాధికారికి అపాయింట్‌మెంట్ బుక్ చేసి, అవసరమైతే రవాణా సమన్వయం చేయండి.'
                    : 'Schedule an in-person PHC Medical Officer assessment within 48–72 hours; assist with patient navigation.')}
                </div>
              </div>
            )}

            {/* TIER 3: DOCTOR & CLINICIAN DOSSIER */}
            {(activeStakeholderTab === 'all' || activeStakeholderTab === 'doctor') && (
              <div style={{
                background: '#FFFFFF',
                border: '1.5px solid #6366F1',
                borderRadius: '10px',
                padding: '1rem',
                boxShadow: '0 2px 6px rgba(99, 102, 241, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{ fontSize: '1.15rem' }}>🩺</span>
                    <h5 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#3730A3' }}>
                      {assessment.stakeholder_views?.doctor?.title || (isTe ? 'వైద్యులు & స్పెషలిస్టుల క్లినికల్ నివేదిక (Doctor Dossier)' : 'Clinical Dossier for Doctors & Specialists')}
                    </h5>
                  </div>
                  <span style={{ background: '#EEF2FF', color: '#3730A3', padding: '0.15rem 0.55rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700 }}>
                    ICMR & MoHFW NOHP Protocol
                  </span>
                </div>

                <div style={{ marginBottom: '0.65rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#3730A3', marginBottom: '0.25rem' }}>
                    Objective Morphological Extraction:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#1E293B', lineHeight: 1.5 }}>
                    {(assessment.stakeholder_views?.doctor?.clinical_features || assessment.visible_observations || []).map((feat: string, fIdx: number) => (
                      <li key={fIdx}>{feat}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ marginBottom: '0.65rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#3730A3', marginBottom: '0.25rem' }}>
                    Differential Considerations:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#334155', lineHeight: 1.5 }}>
                    {(assessment.stakeholder_views?.doctor?.differential_considerations || assessment.possible_explanations?.map(e => `${e.name}: ${e.reasoning}`) || []).map((diff: string, dIdx: number) => (
                      <li key={dIdx}>{diff}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#3730A3', background: '#EEF2FF', padding: '0.55rem 0.8rem', borderRadius: '6px', borderLeft: '3px solid #6366F1' }}>
                  <strong>Mandatory Clinical Protocol:</strong>{' '}
                  {assessment.stakeholder_views?.doctor?.clinical_protocol || (isTe
                    ? 'MoHFW NOHP నిబంధన: 14 రోజుల కంటే ఎక్కువ రోజులు తగ్గని నోటి పుండ్లకు బైమాన్యువల్ పాల్పేషన్ (ఇండ్యూరేషన్), మెడ లింఫ్ నోడ్స్ పరీక్ష మరియు డయాగ్నస్టిక్ పంచ్ బయాప్సీ తప్పనిసరి.'
                    : 'MoHFW National Oral Health Program Mandate: Any solitary non-healing ulcer persisting beyond 14 days requires bimanual palpation for induration, regional lymph node examination, and diagnostic punch biopsy.')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION A: Image Quality */}
        <div style={{ marginBottom: '1.3rem', paddingBottom: '1.1rem', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#0D9488' }}>A.</span> {tr('ఫొటో నాణ్యత పరిశీలన (Image Quality)', 'Image Quality Assessment', 'फोटो गुणवत्ता मूल्यांकन')}
            </h4>
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: '12px',
              backgroundColor: assessment.image_quality?.status === 'adequate' ? '#DCFCE7' : '#FEE2E2',
              color: assessment.image_quality?.status === 'adequate' ? '#15803D' : '#991B1B'
            }}>
              {assessment.image_quality?.status === 'adequate' ? tr('స్పష్టమైన నాణ్యత', 'Adequate for Analysis', 'स्पष्ट गुणवत्ता') : tr('పునఃపరిశీలన అవసరం', 'Quality Limited', 'पुनः जांच आवश्यक')}
            </span>
          </div>

          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.82rem', color: '#475569' }}>
            {assessment.guidance_message || (isTe ? 'ఫొటో వెలుతురు మరియు స్పష్టత పరిశీలించబడింది.' : 'Visual resolution and focus verified.')}
          </p>

          {assessment.image_quality?.limitations && assessment.image_quality.limitations.length > 0 && (
            <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '0.6rem 0.8rem', fontSize: '0.78rem', color: '#64748B' }}>
              <strong>{tr('నాణ్యత పరిమితులు', 'Quality Limitations', 'गुणवत्ता सीमाएं')}:</strong>
              <ul style={{ margin: '0.25rem 0 0 0', paddingLeft: '1.2rem' }}>
                {assessment.image_quality.limitations.map((lim, idx) => (
                  <li key={idx}>{lim}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* SECTION B: Visible Observations */}
        <div style={{ marginBottom: '1.3rem', paddingBottom: '1.1rem', borderBottom: '1px solid #F1F5F9' }}>
          <h4 style={{ margin: '0 0 0.6rem 0', fontSize: '0.92rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#0D9488' }}>B.</span> {tr('ప్రత్యక్షంగా కనిపించే అంశాలు (Visible Observations)', 'Direct Visible Observations', 'प्रत्यक्ष दृश्य अवलोकन')}
          </h4>
          <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.78rem', color: '#64748B', fontStyle: 'italic' }}>
            {isTe
              ? 'ఫొటోలో నేరుగా కనిపించే మార్ఫాలజీ మాత్రమే (వ్యాధి ఊహాగానాలు లేకుండా):'
              : 'Direct morphological features supported strictly from the photograph (separated from interpretation):'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {assessment.visible_observations && assessment.visible_observations.length > 0 ? (
              assessment.visible_observations.map((obs, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  fontSize: '0.84rem',
                  color: '#1E293B',
                  background: '#F0FDFA',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '6px',
                  borderLeft: '3px solid #0D9488'
                }}>
                  <Eye size={15} color="#0D9488" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{obs}</span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '0.82rem', color: '#94A3B8' }}>No visible abnormalities isolated.</div>
            )}
          </div>
        </div>

        {/* SECTION C: Possible Explanations */}
        <div style={{ marginBottom: '1.3rem', paddingBottom: '1.1rem', borderBottom: '1px solid #F1F5F9' }}>
          <h4 style={{ margin: '0 0 0.6rem 0', fontSize: '0.92rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#0D9488' }}>C.</span> {tr('ప్రాథమిక కారణాలు (Possible Medical Explanations)', 'Possible Medical Explanations', 'संभावित चिकित्सीय कारण')}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {assessment.possible_explanations && assessment.possible_explanations.map((expl, idx) => (
              <div key={idx} style={{
                background: '#FAFAFA',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '0.85rem'
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F766E', marginBottom: '0.35rem' }}>
                  {expl.name}
                </div>
                <div style={{ fontSize: '0.81rem', color: '#334155', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                  {expl.reasoning}
                </div>
                {expl.limitations && expl.limitations.length > 0 && (
                  <div style={{ fontSize: '0.74rem', color: '#64748B', borderTop: '1px dashed #CBD5E1', paddingTop: '0.35rem' }}>
                    <strong>{tr('పరిమితి', 'Limitation', 'सीमा')}:</strong> {expl.limitations.join(' ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SECTION D: Additional Information Required */}
        <div style={{ marginBottom: '1.3rem', paddingBottom: '1.1rem', borderBottom: '1px solid #F1F5F9' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.92rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#0D9488' }}>D.</span> {tr('అవసరమైన అదనపు సమాచారం (Missing Clinical Information)', 'Additional Clinical Information Required', 'आवश्यक अतिरिक्त नैदानिक जानकारी')}
          </h4>
          <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '0.75rem 1rem' }}>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', color: '#475569', lineHeight: 1.6 }}>
              {assessment.missing_information && assessment.missing_information.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* SECTION E: Recommended Next Step */}
        <div style={{ marginBottom: '1.3rem', paddingBottom: '1.1rem', borderBottom: '1px solid #F1F5F9' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.92rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#0D9488' }}>E.</span> {tr('సిఫార్సు చేయబడిన తదుపరి చర్య (Recommended Next Step)', 'Recommended Next Step & Clinical Action', 'अनुशंसित अगला चिकित्सीय कदम')}
          </h4>
          <div style={{
            background: urgencyBadge.bg,
            borderLeft: `4px solid ${urgencyBadge.border}`,
            padding: '0.85rem 1rem',
            borderRadius: '6px'
          }}>
            <div style={{ fontWeight: 800, fontSize: '0.86rem', color: urgencyBadge.text }}>
              {assessment.recommended_next_step}
            </div>
            <div style={{ fontSize: '0.8rem', color: urgencyBadge.text, marginTop: '0.25rem', opacity: 0.9 }}>
              <strong>{tr('హేతువు', 'Clinical Grounding', 'नैदानिक आधार')}:</strong> {assessment.urgency_reason}
            </div>
          </div>
        </div>

        {/* SECTION F: Medical References (MoHFW, NHM, WHO, ICMR) */}
        <div style={{ marginBottom: '1.3rem', paddingBottom: '1.1rem', borderBottom: '1px solid #F1F5F9' }}>
          <h4 style={{ margin: '0 0 0.6rem 0', fontSize: '0.92rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#0D9488' }}>F.</span> {isTe ? 'ప్రామాణిక వైద్య మార్గదర్శకాలు (Verified Clinical References)' : 'Verified Clinical Guidelines & Evidence Base'}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {assessment.medical_references && assessment.medical_references.length > 0 ? (
              assessment.medical_references.map((ref, idx) => (
                <div key={idx} style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '0.75rem 0.95rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0F172A' }}>
                      [{idx + 1}] {ref.title}
                    </div>
                    {ref.source_url && (
                      <a
                        href={ref.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#0D9488', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', textDecoration: 'none', flexShrink: 0 }}
                      >
                        <span>{isTe ? 'లింక్' : 'Open'}</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.2rem' }}>
                    <strong>{ref.publisher}</strong> • {ref.publication_date} ({ref.version}) • {ref.section}
                  </div>
                  {ref.direct_excerpt && (
                    <div style={{
                      marginTop: '0.45rem',
                      padding: '0.45rem 0.75rem',
                      background: '#FFFFFF',
                      borderLeft: '2px solid #0D9488',
                      borderRadius: '4px',
                      fontSize: '0.78rem',
                      color: '#334155',
                      fontStyle: 'italic'
                    }}>
                      "{ref.direct_excerpt}"
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ fontSize: '0.81rem', color: '#64748B' }}>
                Standard National Health Mission primary health clinical guidelines apply.
              </div>
            )}
          </div>
        </div>

        {/* SECTION G: Clinical Review & Oversight */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#0D9488' }}>G.</span> {isTe ? 'వైద్యుల క్లినికల్ సమీక్ష (Clinician Review & Oversight)' : 'Clinician Review & Diagnostic Oversight'}
            </h4>
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: '12px',
              backgroundColor: assessment.clinician_review_status === 'approved' ? '#DCFCE7' :
                               assessment.clinician_review_status === 'amended' ? '#FEF3C7' : '#F1F5F9',
              color: assessment.clinician_review_status === 'approved' ? '#15803D' :
                     assessment.clinician_review_status === 'amended' ? '#B45309' : '#475569'
            }}>
              {assessment.clinician_review_status === 'approved' ? (isTe ? 'వైద్యులు ఆమోదించారు' : 'Clinician Approved') :
               assessment.clinician_review_status === 'amended' ? (isTe ? 'సవరణ చేయబడింది' : 'Clinician Amended') :
               assessment.clinician_review_status === 'rejected' ? (isTe ? 'తిరస్కరించబడింది' : 'Clinician Rejected') :
               (isTe ? 'వైద్యుల సమీక్ష పెండింగ్' : 'Preliminary AI — Clinician Review Pending')}
            </span>
          </div>

          {/* Clinician Review Form for Authorized Doctors / PHC MOs */}
          {showClinicianReviewForm && isClinician && (
            <div style={{
              background: '#F0FDF4',
              border: '1.5px solid #86EFAC',
              borderRadius: '10px',
              padding: '1.1rem',
              marginTop: '0.75rem'
            }}>
              <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#166534', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Stethoscope size={16} />
                <span>{isTe ? 'వైద్యుల సమీక్ష ప్యానెల్ (Doctor Action Panel)' : 'Authorized Clinician Review Workspace'}</span>
              </div>

              {reviewSuccess && (
                <div style={{ background: '#DCFCE7', color: '#15803D', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                  ✓ {reviewSuccess}
                </div>
              )}

              <form onSubmit={handleReviewSubmit}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>
                    {isTe ? 'క్లినికల్ నిర్ణయం' : 'Clinical Decision'}:
                  </label>
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {[
                      { id: 'approved', label: isTe ? 'AI పరిశీలన ఆమోదం (Approve)' : 'Approve AI Assessment' },
                      { id: 'amended', label: isTe ? 'సవరణలతో ఆమోదం (Amend)' : 'Amend Observations' },
                      { id: 'rejected', label: isTe ? 'తిరస్కరణ (Reject)' : 'Reject Output' }
                    ].map((opt) => (
                      <label key={opt.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        background: '#FFFFFF',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        border: `1.5px solid ${reviewDecision === opt.id ? '#15803D' : '#CBD5E1'}`,
                        fontWeight: reviewDecision === opt.id ? 700 : 500
                      }}>
                        <input
                          type="radio"
                          name="reviewDecision"
                          value={opt.id}
                          checked={reviewDecision === opt.id}
                          onChange={(e) => setReviewDecision(e.target.value as any)}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {reviewDecision === 'amended' && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>
                      {isTe ? 'సవరించిన లక్షణాలు (Amended Observations - పంక్తికి ఒకటి)' : 'Amended Morphological Observations (one per line)'}:
                    </label>
                    <textarea
                      rows={2}
                      className="form-control"
                      value={amendedObsText}
                      onChange={(e) => setAmendedObsText(e.target.value)}
                      placeholder={isTe ? 'ఉదా: ఎడమ బుగ్గపై ల్యూకోప్లేకియా మచ్చ...' : 'e.g., Well-defined white patch over right buccal mucosa, non-wipeable...'}
                      style={{ width: '100%', fontSize: '0.82rem', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                    />
                  </div>
                )}

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>
                    {isTe ? 'వైద్యుల క్లినికల్ గమనికలు' : 'Clinician Notes & Diagnostic Evaluation'} *:
                  </label>
                  <textarea
                    rows={2}
                    className="form-control"
                    value={clinicianNotes}
                    onChange={(e) => setClinicianNotes(e.target.value)}
                    required
                    placeholder={isTe ? 'మీ క్లినికల్ పరిశీలనలను నమోదు చేయండి...' : 'Enter your physical findings, clinical impressions, and remarks...'}
                    style={{ width: '100%', fontSize: '0.82rem', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  />
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>
                    {isTe ? 'చికిత్సా కార్యాచరణ ప్రణాళిక (Action Plan)' : 'Clinical Action Plan / Investigations / Biopsy'}:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={actionPlan}
                    onChange={(e) => setActionPlan(e.target.value)}
                    placeholder={isTe ? 'ఉదా: పంచ్ బయాప్సీ సిఫార్సు చేయబడింది, 108 రవాణా సమన్వయం...' : 'e.g., Punch biopsy advised at District referral centre; cessation counseling.'}
                    style={{ width: '100%', fontSize: '0.82rem', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  style={{
                    background: '#15803D',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '0.55rem 1.25rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: submittingReview ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Check size={16} />
                  <span>{submittingReview ? (isTe ? 'నమోదు అవుతోంది...' : 'Saving Review...') : (isTe ? 'సమీక్షను భద్రపరచండి' : 'Sign & Submit Clinical Review')}</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Provenance & Audit Trail Collapsible */}
        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setShowAuditTrail(!showAuditTrail)}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748B',
              fontSize: '0.74rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <Layers size={13} />
            <span>{isTe ? 'సిస్టమ్ ఆడిట్ ట్రయిల్ & మోడల్ వివరాలు' : 'Technical Provenance & 12-Stage Audit Trail'}</span>
            {showAuditTrail ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showAuditTrail && (
            <div style={{ background: '#F8FAFC', borderRadius: '6px', padding: '0.75rem', marginTop: '0.5rem', fontSize: '0.72rem', color: '#475569' }}>
              <div><strong>Model ID:</strong> {assessment.model_name} ({assessment.model_version})</div>
              <div><strong>Evidence Engine:</strong> MoHFW & Clinical Knowledge Base</div>
              <div><strong>Assessment ID:</strong> {assessment.assessment_id}</div>
              <div><strong>Created Timestamp:</strong> {assessment.created_at}</div>
              {assessment.audit_trail && (
                <div style={{ marginTop: '0.4rem' }}>
                  <strong>Pipeline Execution Log:</strong>
                  <ul style={{ margin: '0.2rem 0 0 0', paddingLeft: '1.1rem' }}>
                    {assessment.audit_trail.map((step, idx) => (
                      <li key={idx}>
                        Stage {step.stage}: {step.status} {step.message || step.error || ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

