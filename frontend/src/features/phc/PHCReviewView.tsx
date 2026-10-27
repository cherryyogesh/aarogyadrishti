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

            {/* AI Preliminary Guidance */}
            {selectedCase.ai_analysis && (
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#0F766E', fontSize: '0.88rem' }}>
                  <Sparkles size={16} /> AI Preliminary Triage Observation (Non-Diagnostic)
                </div>
                <div style={{ fontSize: '0.84rem', color: '#334155', marginTop: '0.3rem' }}>
                  {selectedCase.ai_analysis.recommendations}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: '0.3rem' }}>
                  {selectedCase.ai_analysis.confidence_disclaimer}
                </div>
              </div>
            )}

            {/* Clinician Review Form */}
            <form onSubmit={handleSaveReview}>
              <div className="form-group">
                <label className="form-label">Review Outcome Decision *</label>
                <select
                  className="form-control"
                  value={reviewDecision}
                  onChange={(e) => setReviewDecision(e.target.value)}
                >
                  <option value="consultation_booked">Doctor Consultation Recommended</option>
                  <option value="repeat_photo">Request Repeat Photograph (Image Unclear)</option>
                  <option value="safe_observation">Safe for Local Observation (Self-care Guidance)</option>
                  <option value="referral_made">Direct Referral to District Hospital</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Clinical Review Observations *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  required
                  placeholder="Record your clinical assessment, lesion features, and patient advice..."
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Action Plan</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Schedule tele-consultation with dermatologist, send reminder SMS"
                  value={actionPlan}
                  onChange={(e) => setActionPlan(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                {onNavigateToBooking && reviewDecision === 'consultation_booked' ? (
                  <button
                    type="button"
                    className="btn btn-outline-teal"
                    onClick={() => {
                      onNavigateToBooking(selectedCase);
                      setSelectedCase(null);
                    }}
                  >
                    <Calendar size={16} /> Book Appointment Directly <ArrowRight size={16} />
                  </button>
                ) : <div />}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSelectedCase(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving Review...' : 'Record Review Outcome'}
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
