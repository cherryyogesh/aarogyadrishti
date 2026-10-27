import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, ConsultationSession, User } from '../../types';
import {
  Video, VideoOff, Mic, MicOff, Stethoscope, FileText, CheckCircle,
  Share2, AlertCircle, ArrowLeft, Send, Sparkles, Building
} from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
  user: User;
  session: ConsultationSession;
  onClose: () => void;
}

export const ConsultationWorkspace: React.FC<Props> = ({ currentLang, user, session, onClose }) => {
  const t = translations[currentLang] || translations.en;
  const [videoActive, setVideoActive] = useState(true);
  const [audioActive, setAudioActive] = useState(true);

  // Clinical Records State
  const [clinicalFindings, setClinicalFindings] = useState('');
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [followUpInstructions, setFollowUpInstructions] = useState('');
  const [referralNeeded, setReferralNeeded] = useState(false);
  const [referralSpecialty, setReferralSpecialty] = useState('Dermatology');
  const [targetHospital, setTargetHospital] = useState('District Government General Hospital, Ongole');
  const [referralUrgency, setReferralUrgency] = useState('routine');

  const [finalizing, setFinalizing] = useState(false);
  const [completed, setCompleted] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [streamStarted, setStreamStarted] = useState(false);

  // Initialize camera preview if available
  useEffect(() => {
    let localStream: MediaStream | null = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          localStream = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          setStreamStarted(true);
        })
        .catch((err) => {
          console.warn('Camera/Mic permission not granted or unavailable:', err);
        });
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleToggleVideo = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getVideoTracks().forEach(track => track.enabled = !videoActive);
    }
    setVideoActive(!videoActive);
  };

  const handleToggleAudio = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getAudioTracks().forEach(track => track.enabled = !audioActive);
    }
    setAudioActive(!audioActive);
  };

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicalFindings.trim()) {
      alert('Please enter clinical findings and observations before finalizing.');
      return;
    }

    setFinalizing(true);
    try {
      await api.completeConsultation(session.appointment_id, {
        clinical_findings: clinicalFindings,
        prescription_notes: prescriptionNotes,
        follow_up_instructions: followUpInstructions,
        referral_needed: referralNeeded,
        referral_specialty: referralNeeded ? referralSpecialty : undefined,
        target_hospital: referralNeeded ? targetHospital : undefined,
        referral_urgency: referralNeeded ? referralUrgency : undefined
      });
      setCompleted(true);
    } catch (err: any) {
      alert('Failed to complete consultation: ' + err.message);
    } finally {
      setFinalizing(false);
    }
  };

  if (completed) {
    return (
      <div className="card" style={{ maxWidth: '650px', margin: '3rem auto', padding: '2.5rem', textAlign: 'center' }}>
        <div style={{
          width: '60px', height: '60px', borderRadius: '50%',
          backgroundColor: '#DCFCE7', color: '#166534',
          margin: '0 auto 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <CheckCircle size={32} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Consultation Finalized & Archived</h2>
        <p style={{ fontSize: '0.88rem', color: '#475569', marginTop: '0.4rem' }}>
          Clinical records and prescriptions for patient <strong>{session.patient_name}</strong> have been secured in the persistent database.
        </p>

        {referralNeeded && (
          <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E', padding: '0.85rem', borderRadius: '8px', margin: '1.5rem 0', textAlign: 'left', fontSize: '0.85rem' }}>
            ✓ Formal referral created for <strong>{referralSpecialty}</strong> at <strong>{targetHospital}</strong>. Patient Navigator notified.
          </div>
        )}

        <button className="btn btn-primary" onClick={onClose}>
          Return to Queue
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1350px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button className="btn btn-secondary" style={{ minHeight: '36px', padding: '0.35rem 0.75rem' }} onClick={onClose}>
            <ArrowLeft size={16} /> Exit Room
          </button>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--teal-primary)' }}>
              ROOM: {session.webrtc_room_id}
            </span>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
              {t.doctor_workspace_title}
            </h2>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span className="badge badge-success">● Telemedicine Live</span>
          <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
            Patient: <strong>{session.patient_name}</strong> ({session.patient_age}y)
          </span>
        </div>
      </div>

      {/* Main Workspace Split Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 1fr) minmax(350px, 1.2fr)',
        gap: '1.5rem'
      }}>
        {/* Left Column: Video Room & Screening Images */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* WebRTC Video Canvas */}
          <div style={{
            background: '#0B1E38',
            borderRadius: '14px',
            overflow: 'hidden',
            position: 'relative',
            aspectRatio: '16/10',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-md)'
          }}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: videoActive ? 'block' : 'none'
              }}
            />

            {!videoActive && (
              <div style={{ textAlign: 'center', color: '#94A3B8' }}>
                <VideoOff size={44} style={{ margin: '0 auto 0.5rem' }} />
                <div>Doctor Camera Disabled</div>
              </div>
            )}

            {/* Video Controls Bar */}
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '0.75rem',
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(6px)',
              padding: '0.45rem 0.85rem',
              borderRadius: '9999px'
            }}>
              <button
                type="button"
                onClick={handleToggleVideo}
                style={{
                  background: videoActive ? 'rgba(255,255,255,0.2)' : '#EF4444',
                  border: 'none',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {videoActive ? <Video size={18} /> : <VideoOff size={18} />}
              </button>

              <button
                type="button"
                onClick={handleToggleAudio}
                style={{
                  background: audioActive ? 'rgba(255,255,255,0.2)' : '#EF4444',
                  border: 'none',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {audioActive ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
            </div>
          </div>

          {/* Screening Photo & Quality Reference */}
          {session.screening_details && (
            <div className="card" style={{ padding: '1.25rem' }}>
              <div className="card-title" style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                <FileText size={16} /> Attached Visible Screening
              </div>
              <div style={{ fontSize: '0.84rem', color: '#334155', marginBottom: '0.75rem' }}>
                Category: <strong>{session.screening_details.category}</strong> • Duration: {session.screening_details.duration_days} days
              </div>
              <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '0.75rem' }}>
                Symptoms: "{session.screening_details.symptoms}"
              </div>

              {session.screening_details.images && session.screening_details.images.length > 0 && (
                <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto' }}>
                  {session.screening_details.images.map((img: any, idx: number) => (
                    <div key={idx} style={{ flex: '0 0 160px' }}>
                      <img
                        src={img.preview_url}
                        alt="Screening"
                        style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px' }}
                      />
                      <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.2rem' }}>
                        Quality: {img.quality_state}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {session.screening_details.ai_analysis && (
                <div style={{
                  background: '#F0FDFA',
                  border: '1px solid #99F6E4',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  marginTop: '0.75rem',
                  fontSize: '0.78rem',
                  color: '#0F766E'
                }}>
                  <Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  AI Triage: {session.screening_details.ai_analysis.recommendations}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Clinical Assessment & Consultation Finalization */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <div className="card-title" style={{ marginBottom: '1.25rem' }}>
            <Stethoscope size={20} color="var(--teal-primary)" />
            Clinical Assessment & Prescription
          </div>

          <form onSubmit={handleFinalize}>
            <div className="form-group">
              <label className="form-label">{t.doctor_findings} *</label>
              <textarea
                className="form-control"
                rows={4}
                required
                placeholder="Record clinical diagnosis, lesion morphology, severity evaluation, and provisional assessment..."
                value={clinicalFindings}
                onChange={(e) => setClinicalFindings(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t.doctor_prescription}</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Prescribed medications, dosage instructions, topical ointments, dietary restrictions..."
                value={prescriptionNotes}
                onChange={(e) => setPrescriptionNotes(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Follow-up Instructions</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. In-person review at PHC in 7 days, or return if redness worsens"
                value={followUpInstructions}
                onChange={(e) => setFollowUpInstructions(e.target.value)}
              />
            </div>

            {/* Formal Referral Checkbox */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: referralNeeded ? '0.85rem' : '0' }}>
                <input
                  type="checkbox"
                  id="referral_toggle"
                  checked={referralNeeded}
                  onChange={(e) => setReferralNeeded(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="referral_toggle" style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1E293B', cursor: 'pointer' }}>
                  Create Secondary Care / Hospital Referral
                </label>
              </div>

              {referralNeeded && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Specialty</label>
                    <select
                      className="form-control"
                      value={referralSpecialty}
                      onChange={(e) => setReferralSpecialty(e.target.value)}
                    >
                      <option value="Dermatology">Dermatology</option>
                      <option value="Oral & Maxillofacial">Oral & Maxillofacial</option>
                      <option value="Ophthalmology">Ophthalmology</option>
                      <option value="ENT Specialist">ENT Specialist</option>
                      <option value="General Surgery">General Surgery</option>
                      <option value="Oncology">Oncology (Biopsy & Staging)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Target Hospital</label>
                    <input
                      type="text"
                      className="form-control"
                      value={targetHospital}
                      onChange={(e) => setTargetHospital(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', fontSize: '1rem', padding: '0.85rem' }}
              disabled={finalizing}
            >
              <CheckCircle size={18} />
              {finalizing ? 'Finalizing Records...' : t.doctor_complete_btn}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
