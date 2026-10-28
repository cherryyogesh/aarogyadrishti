import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, Screening, User } from '../../types';
import {
  ClipboardCheck, Calendar, Sparkles, AlertCircle, X, Check,
  Camera, FileText, ArrowRight
} from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
  user: User;
  onNavigateToBooking?: (screening: Screening) => void;
}

export const PHCReviewView: React.FC<Props> = ({ currentLang, user, onNavigateToBooking }) => {
  const t = translations[currentLang] || translations.en;
  const [cases, setCases] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<Screening | null>(null);
  const [doctorAgreesWithAi, setDoctorAgreesWithAi] = useState<boolean>(true);

  // Review Form
  const [reviewDecision, setReviewDecision] = useState('consultation_booked');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const data = await api.getPhcCases();
      setCases(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleOpenReview = (scr: Screening) => {
    setSelectedCase(scr);
    setClinicalNotes('');
    setActionPlan('');
    setSuccessMsg(null);
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    if (!clinicalNotes.trim()) return;

    setSubmitting(true);
    try {
      await api.recordCaseReview(selectedCase.id, {
        review_decision: reviewDecision,
        clinical_notes: clinicalNotes,
        action_plan: actionPlan
      });
      setSuccessMsg('Clinical review recorded successfully.');
      setTimeout(() => {
        setSelectedCase(null);
        fetchCases();
      }, 1200);
    } catch (err: any) {
      alert('Failed to save review: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{t.nav_phc_cases}</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
            Review community screenings, evaluate image clarity, and schedule consultations.
          </p>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>Loading pending cases...</div>
        ) : cases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748B' }}>
            ✓ No cases currently awaiting review for this Primary Health Centre.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ref ID</th>
                  <th>Patient</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Symptoms</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((scr) => (
                  <tr key={scr.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--teal-primary)' }}>
                        {scr.reference_id}
                      </span>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{scr.patient_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          {scr.patient_id_display} • {scr.patient_age}y / {scr.patient_gender}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                        {scr.category}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${
                        scr.severity === 'severe' ? 'badge-danger' :
                        scr.severity === 'moderate' ? 'badge-warning' : 'badge-success'
                      }`}>
                        {scr.severity}
                      </span>
                    </td>
                    <td>
                      <div style={{ maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {scr.symptoms}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-warning">
                        {scr.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-primary"
                        style={{ minHeight: '34px', padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
                        onClick={() => handleOpenReview(scr)}
                      >
                        Review Case
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Case Review Modal */}
      {selectedCase && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 60,
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '780px',
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--teal-primary)' }}>
                  Case Review: {selectedCase.reference_id}
                </span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                  {selectedCase.patient_name} ({selectedCase.patient_age}y / {selectedCase.patient_gender})
                </h3>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={22} />
              </button>
            </div>

            {successMsg && (
              <div style={{ background: '#DCFCE7', color: '#166534', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
                ✓ {successMsg}
              </div>
            )}

            {/* Images & OpenCV Quality display */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                Screening Photography & Image Quality:
              </h4>
              {selectedCase.images && selectedCase.images.length > 0 ? (
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {selectedCase.images.map((img) => (
                    <div key={img.id} style={{ flex: '1 1 240px' }}>
                      <img
                        src={img.preview_url}
                        alt="Screening"
                        style={{
                          width: '100%',
                          maxHeight: '220px',
                          objectFit: 'contain',
                          borderRadius: '8px',
                          backgroundColor: '#000'
                        }}
                      />
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.35rem' }}>
                        Quality: <strong>{img.quality_state || 'acceptable'}</strong>
                        {img.guidance_message && ` • ${img.guidance_message}`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: '#64748B', fontStyle: 'italic' }}>
                  No photograph attached for this screening.
                </div>
              )}
            </div>

            {/* Oral Cavity Finding Overview */}
            {selectedCase.category === 'mouth' && (
              <div style={{
                background: '#f0fdfa',
                border: '1px solid #99f6e4',
                borderRadius: '8px',
                padding: '0.85rem',
                marginBottom: '1rem',
                fontSize: '0.85rem'
              }}>
                <div style={{ fontWeight: 700, color: '#0f766e', marginBottom: '0.35rem' }}>
                  👄 Oral Cavity Clinical Findings:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div><strong>Anatomical Site:</strong> {selectedCase.oral_site || 'Left Buccal Mucosa'}</div>
                  <div><strong>Lesion Type:</strong> {selectedCase.lesion_type || 'Leukoplakia'}</div>
                  <div>
                    <strong>Mouth Opening:</strong> {selectedCase.mouth_opening_mm ? `${selectedCase.mouth_opening_mm} mm` : '32 mm'}
                    {selectedCase.mouth_opening_mm && selectedCase.mouth_opening_mm < 35 && (
                      <span style={{ color: '#b91c1c', fontWeight: 600 }}> (Restricted • OSMF Risk)</span>
                    )}
                  </div>
                  <div>
                    <strong>{currentLang === 'te' ? 'కారం తిన్నప్పుడు మంట:' : 'Burning Sensation:'}</strong>{' '}
                    {selectedCase.burning_sensation
                      ? (currentLang === 'te' ? 'అవును (కారం తిన్నప్పుడు మంట)' : 'Yes')
                      : (currentLang === 'te' ? 'కాదు' : 'No')}
                  </div>
                </div>
              </div>
            )}

            {/* AI Preliminary Guidance with Strict Nonclinical Disclaimer */}
            {selectedCase.ai_analysis && (
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#b45309', fontSize: '0.88rem' }}>
                    <Sparkles size={16} /> AI Nonclinical Demonstration Advisory (IISc-TANUH Concept)
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    background: '#ef4444',
                    color: '#fff',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    fontWeight: 700
                  }}>
                    NOT FOR CLINICAL USE
                  </span>
                </div>
                <div style={{ fontSize: '0.84rem', color: '#78350f', marginTop: '0.4rem' }}>
                  <strong>Advisory:</strong> {selectedCase.ai_analysis.recommendations}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#92400e', marginTop: '0.3rem', fontStyle: 'italic' }}>
                  "{selectedCase.ai_analysis.confidence_disclaimer}"
                </div>

                {/* Medical Officer AI Agreement Toggle */}
                <div style={{
                  marginTop: '0.75rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px dashed #fcd34d',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.5rem',
                  fontSize: '0.85rem'
                }}>
                  <span style={{ fontWeight: 600, color: '#78350f' }}>Medical Officer Assessment:</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="aiAgreement"
                      checked={doctorAgreesWithAi}
                      onChange={() => setDoctorAgreesWithAi(true)}
                    />
                    <span>✓ Agree with AI Risk Flag</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="aiAgreement"
                      checked={!doctorAgreesWithAi}
                      onChange={() => setDoctorAgreesWithAi(false)}
                    />
                    <span style={{ color: '#b91c1c', fontWeight: 600 }}>❌ Disagree / Override AI</span>
                  </label>
                </div>
              </div>
            )}

            {/* Quick Actions: Biopsy & Referral Slips */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              marginBottom: '1.25rem',
              padding: '0.75rem',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await api.createInvestigation({
                      patient_id: selectedCase.patient_id,
                      screening_id: selectedCase.id,
                      kind: 'incisional_biopsy',
                      biopsy_site: selectedCase.oral_site || 'Left Buccal Mucosa',
                      state: 'advised',
                      diagnosis_category: 'precancer_leukoplakia'
                    });
                    alert(`✓ Incisional Biopsy ordered for ${selectedCase.patient_name}!`);
                  } catch (e: any) {
                    alert('Biopsy order error: ' + e.message);
                  }
                }}
                style={{
                  background: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                🧪 Order Biopsy
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await api.createReferral({
                      patient_id: selectedCase.patient_id,
                      specialty_needed: 'Head & Neck Surgical Oncology',
                      target_hospital: 'District Hospital Paderu / KGH Visakhapatnam',
                      urgency: 'priority',
                      reason_for_referral: `Suspected Oral Potentially Malignant Disorder (${selectedCase.lesion_type || 'Leukoplakia'}) on ${selectedCase.oral_site || 'Left Buccal Mucosa'}.`
                    });
                    alert(`✓ Hospital Referral Slip generated for ${selectedCase.patient_name}!`);
                  } catch (e: any) {
                    alert('Referral error: ' + e.message);
                  }
                }}
                style={{
                  background: '#4338ca',
                  color: '#fff',
                  border: 'none',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                🏥 Generate Referral Slip
              </button>
            </div>

            {/* Clinician Review Form */}
            <form onSubmit={handleSaveReview}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {currentLang === 'te' ? 'క్లినికల్ సమీక్ష నిర్ణయం (Review Outcome) *' : 'Review Outcome Decision *'}
                </label>
                <select
                  className="form-control"
                  value={reviewDecision}
                  onChange={(e) => setReviewDecision(e.target.value)}
                >
                  <option value="consultation_booked">
                    {currentLang === 'te' ? 'స్పెషలిస్ట్ కన్సల్టేషన్ సిఫార్సు (Doctor Consultation Recommended)' : 'Doctor Consultation Recommended'}
                  </option>
                  <option value="biopsy_advised">
                    {currentLang === 'te' ? 'ఇన్సిషనల్ బయాప్సీ సిఫార్సు (Biopsy Advised)' : 'Incisional/Punch Biopsy Advised'}
                  </option>
                  <option value="repeat_photo">
                    {currentLang === 'te' ? 'మళ్లీ స్పష్టమైన ఫొటో పంపమని కోరండి (Repeat Photo Requested)' : 'Request Repeat Photograph (Image Unclear)'}
                  </option>
                  <option value="safe_observation">
                    {currentLang === 'te' ? 'స్థానిక పరిశీలన & స్వీయ జాగ్రత్తలు (Safe for Local Observation)' : 'Safe for Local Observation (Self-care Guidance)'}
                  </option>
                  <option value="referral_made">
                    {currentLang === 'te' ? 'జిల్లా ఆసుపత్రికి అధికారిక రిఫరల్ (Direct Referral)' : 'Direct Referral to District Hospital'}
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {currentLang === 'te' ? 'వైద్యుల క్లినికల్ పరిశీలనలు (Clinical Notes) *' : 'Clinical Review Observations *'}
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  required
                  placeholder={currentLang === 'te' ? 'మచ్చ లక్షణాలు, తీవ్రత, మరియు రోగికి సూచనలను నమోదు చేయండి...' : 'Record your clinical assessment, lesion features, and patient advice...'}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {currentLang === 'te' ? 'తదుపరి కార్యాచరణ ప్రణాళిక (Action Plan)' : 'Action Plan'}
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={currentLang === 'te' ? 'ఉదా: టెలికన్సల్టేషన్ షెడ్యూల్ చేయడం, SMS రిమైండర్ పంపడం' : 'e.g. Schedule tele-consultation with oncologist, send reminder SMS'}
                  value={actionPlan}
                  onChange={(e) => setActionPlan(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                {onNavigateToBooking && reviewDecision === 'consultation_booked' ? (
                  <button
                    type="button"
                    className="btn btn-outline-teal"
                    onClick={() => {
                      onNavigateToBooking(selectedCase);
                      setSelectedCase(null);
                    }}
                  >
                    <Calendar size={16} />
                    {currentLang === 'te' ? 'నేరుగా అపాయింట్‌మెంట్ బుక్ చేయండి' : 'Book Appointment Directly'} <ArrowRight size={16} />
                  </button>
                ) : <div />}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSelectedCase(null)}
                  >
                    {currentLang === 'te' ? 'రద్దు' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting
                      ? (currentLang === 'te' ? 'నమోదు అవుతోంది...' : 'Saving Review...')
                      : (currentLang === 'te' ? 'సమీక్షను ధృవీకరించండి' : 'Record Review Outcome')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
