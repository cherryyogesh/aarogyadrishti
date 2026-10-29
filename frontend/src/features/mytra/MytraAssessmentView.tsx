import React, { useState } from 'react';
import { api } from '../../services/api';
import { MytraAnalysisResponse, User, LanguageCode } from '../../types';
import {
  ShieldAlert, CheckCircle2, AlertTriangle, AlertCircle, Sparkles,
  FileText, ExternalLink, Stethoscope, ChevronDown, ChevronUp,
  Clock, Check, X, Shield, BookOpen, Eye, HelpCircle, Layers
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

  // Clinician Review Form State
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'amended' | 'rejected'>('approved');
  const [clinicianNotes, setClinicianNotes] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [amendedObsText, setAmendedObsText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  // Accordion / collapsible states for sections
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  const isClinician = user.role === 'doctor' || user.role === 'phc_staff' || user.role === 'admin';

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicianNotes.trim()) {
      alert(isTe ? 'దయచేసి డాక్టర్ క్లినికల్ నోట్స్ నమోదు చేయండి' : 'Please provide clinical notes for this review.');
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
          label: isTe ? 'అత్యవసర ఆసుపత్రి సంరక్షణ' : 'URGENT HOSPITAL CARE',
          icon: AlertTriangle
        };
      case 'prompt_assessment':
        return {
          bg: '#FEF3C7',
          border: '#D97706',
          text: '#92400E',
          label: isTe ? 'సత్వర వైద్య పరీక్ష అవసరం (48-72 గంటల్లో)' : 'PROMPT MEDICAL ASSESSMENT',
          icon: Clock
        };
      case 'routine_review':
      default:
        return {
          bg: '#E0F2FE',
          border: '#0284C7',
          text: '#075985',
          label: isTe ? 'సాధారణ పీహెచ్‌సీ సమీక్ష' : 'ROUTINE PHC REVIEW',
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
                background: 'rgba(94, 234, 212, 0.2)',
                color: '#5EEAD4',
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: '12px',
                border: '1px solid rgba(94, 234, 212, 0.4)'
              }}>
                Google MedGemma 1.5 4B
              </span>
              <a
                href="https://github.com/Google-Health/medgemma"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#F0FDFA',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
                title="Connected to official Google-Health/medgemma repository"
              >
                <span>🐙 Google-Health/medgemma</span>
                <ExternalLink size={11} />
              </a>
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
              {isTe ? 'వైద్య రక్షణ మార్గదర్శకం (Clinical Safety Guardrail)' : 'Clinical Safety & Diagnostic Boundary'}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#78350F', marginTop: '0.25rem', lineHeight: 1.5 }}>
              {assessment.cancer_safety_notice || (isTe
                ? 'ఈ ఫొటో ద్వారా క్యాన్సర్ లేదా ఇతర తీవ్ర వ్యాధులను నిర్ధారించలేము లేదా మినహాయించలేము. తుది నిర్ధారణ కొరకు అర్హత కలిగిన వైద్యాధికారి ప్రత్యక్ష పరీక్ష మరియు అవసరమైతే బయాప్సీ తప్పనిసరి.'
                : 'The image shows findings that cannot be reliably diagnosed from a photograph alone. Several conditions produce similar appearances. Arrange assessment by a qualified doctor; further physical exam or biopsy may be necessary.')}
            </div>
          </div>
        </div>

        {/* SECTION A: Image Quality */}
        <div style={{ marginBottom: '1.3rem', paddingBottom: '1.1rem', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#0D9488' }}>A.</span> {isTe ? 'ఫొటో నాణ్యత పరిశీలన (Image Quality)' : 'Image Quality Assessment'}
            </h4>
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: '12px',
              backgroundColor: assessment.image_quality?.status === 'adequate' ? '#DCFCE7' : '#FEE2E2',
              color: assessment.image_quality?.status === 'adequate' ? '#15803D' : '#991B1B'
            }}>
              {assessment.image_quality?.status === 'adequate' ? (isTe ? 'స్పష్టమైన నాణ్యత' : 'Adequate for Analysis') : (isTe ? 'పునఃపరిశీలన అవసరం' : 'Quality Limited')}
            </span>
          </div>

          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.82rem', color: '#475569' }}>
            {assessment.guidance_message || (isTe ? 'ఫొటో వెలుతురు మరియు స్పష్టత పరిశీలించబడింది.' : 'Visual resolution and focus verified.')}
          </p>

          {assessment.image_quality?.limitations && assessment.image_quality.limitations.length > 0 && (
            <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '0.6rem 0.8rem', fontSize: '0.78rem', color: '#64748B' }}>
              <strong>{isTe ? 'నాణ్యత పరిమితులు' : 'Quality Limitations'}:</strong>
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
            <span style={{ color: '#0D9488' }}>B.</span> {isTe ? 'ప్రత్యక్షంగా కనిపించే అంశాలు (Visible Observations)' : 'Direct Visible Observations'}
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
            <span style={{ color: '#0D9488' }}>C.</span> {isTe ? 'ప్రాథమిక కారణాలు (Possible Medical Explanations)' : 'Possible Medical Explanations'}
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
                    <strong>{isTe ? 'పరిమితి' : 'Limitation'}:</strong> {expl.limitations.join(' ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SECTION D: Additional Information Required */}
        <div style={{ marginBottom: '1.3rem', paddingBottom: '1.1rem', borderBottom: '1px solid #F1F5F9' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.92rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#0D9488' }}>D.</span> {isTe ? 'అవసరమైన అదనపు సమాచారం (Missing Clinical Information)' : 'Additional Clinical Information Required'}
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
            <span style={{ color: '#0D9488' }}>E.</span> {isTe ? 'సిఫార్సు చేయబడిన తదుపరి చర్య (Recommended Next Step)' : 'Recommended Next Step & Clinical Action'}
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
              <strong>{isTe ? 'హేతువు' : 'Clinical Grounding'}:</strong> {assessment.urgency_reason}
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
              <div><strong>Google-Health Repo:</strong> <a href="https://github.com/Google-Health/medgemma" target="_blank" rel="noreferrer" style={{ color: '#0D9488', fontWeight: 600 }}>Google-Health/medgemma.git</a> (Submodule: external/medgemma)</div>
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

