import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, ConsultationSession, User, ReferralSlip } from '../../types';
import {
  Video, VideoOff, Mic, MicOff, Stethoscope, FileText, CheckCircle,
  AlertCircle, ArrowLeft, Send, Sparkles, Building, Printer, Download,
  Plus, Users, LayoutGrid, Maximize2, ShieldCheck, Check, X, PhoneCall,
  Activity, Clock
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
  const [viewMode, setViewMode] = useState<'dual' | 'pip'>('dual');

  // Elapsed Call Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(38);
  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Clinical Records State
  const [clinicalFindings, setClinicalFindings] = useState('');
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [followUpInstructions, setFollowUpInstructions] = useState('');
  const [referralNeeded, setReferralNeeded] = useState(false);
  const [referralSpecialty, setReferralSpecialty] = useState('Head & Neck Surgical Oncology');
  const [targetHospital, setTargetHospital] = useState('District Hospital Paderu / KGH Visakhapatnam');
  const [referralUrgency, setReferralUrgency] = useState('priority');

  // Doctor Quick Referral Slip Modal
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralSlipReason, setReferralSlipReason] = useState('Suspected Oral Potentially Malignant Disorder (Leukoplakia / OSMF) requiring biopsy');
  const [referralSlipTargetHospital, setReferralSlipTargetHospital] = useState('King George Hospital (KGH) Visakhapatnam');
  const [referralSlipSpecialty, setReferralSlipSpecialty] = useState('Head & Neck Surgical Oncology');
  const [referralSlipUrgency, setReferralSlipUrgency] = useState('priority');
  const [referralSlipNotes, setReferralSlipNotes] = useState('');
  const [createdSlip, setCreatedSlip] = useState<ReferralSlip | null>(null);
  const [slipLoading, setSlipLoading] = useState(false);

  const [finalizing, setFinalizing] = useState(false);
  const [completed, setCompleted] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [streamStarted, setStreamStarted] = useState(false);

  // Initialize camera preview if available
  useEffect(() => {
    let localStream: MediaStream | null = null;
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
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

  const handleCreateReferralSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlipLoading(true);
    try {
      const slip = await api.createReferral({
        patient_id: session.patient_id || 1,
        specialty_needed: referralSlipSpecialty,
        target_hospital: referralSlipTargetHospital,
        urgency: referralSlipUrgency,
        reason_for_referral: referralSlipReason,
        clinical_notes: referralSlipNotes || clinicalFindings,
      });
      setCreatedSlip(slip);
      setReferralNeeded(true);
      setReferralSpecialty(referralSlipSpecialty);
      setTargetHospital(referralSlipTargetHospital);
      setReferralUrgency(referralSlipUrgency);
    } catch (err: any) {
      alert('Failed to generate referral slip: ' + (err.message || 'Server error'));
    } finally {
      setSlipLoading(false);
    }
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
          width: '64px', height: '64px', borderRadius: '50%',
          backgroundColor: '#DCFCE7', color: '#166534',
          margin: '0 auto 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <CheckCircle size={36} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Consultation Finalized & Archived</h2>
        <p style={{ fontSize: '0.88rem', color: '#475569', marginTop: '0.4rem' }}>
          Clinical records and prescriptions for patient <strong>{session.patient_name}</strong> have been secured in the persistent database.
        </p>

        {referralNeeded && (
          <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E', padding: '1rem', borderRadius: '10px', margin: '1.5rem 0', textAlign: 'left', fontSize: '0.85rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.3rem' }}>
              ✓ Official Hospital Referral Slip Created
            </div>
            <div>
              Referred to <strong>{targetHospital}</strong> for <strong>{referralSpecialty}</strong>. Patient Navigator and PHC staff notified for escort support.
            </div>
          </div>
        )}

        <button className="btn btn-primary" onClick={onClose}>
          Return to Dashboard / Queue
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              {t.doctor_workspace_title}
            </h2>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
            Live Tele-Consultation
          </span>
          <span style={{ fontSize: '0.84rem', color: '#475569' }}>
            Patient: <strong>{session.patient_name}</strong> ({session.patient_age}y • {session.patient_id_display})
          </span>
        </div>
      </div>

      {/* Conference Connection Status Ribbon */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '0.75rem 1.25rem',
        marginBottom: '1.25rem',
        color: '#FFFFFF',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid #10B981',
            color: '#6EE7B7',
            padding: '0.2rem 0.6rem',
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: 700
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10B981' }} />
            VIDEO BRIDGE CONNECTED
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#E2E8F0', flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
              🏥 <strong>{session.phc_name || user.phc_name || 'PHC G. Madugula Clinic'}</strong>
              <span style={{ color: '#94A3B8', marginLeft: '4px' }}>
                (Patient in presence of Medical Staff)
              </span>
            </span>

            <span style={{ color: '#2DD4BF', fontWeight: 800 }}>⟷</span>

            <span style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
              👨‍⚕️ <strong>{session.doctor_name || 'Dr. Priya Sundaram'}</strong>
              <span style={{ color: '#94A3B8', marginLeft: '4px' }}>
                (Specialist Tele-Hub)
              </span>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: '#94A3B8' }}>
          <span>⏱️ Duration: <strong style={{ color: '#F1F5F9' }}>{formatTimer(elapsedSeconds)}</strong></span>
          <span>⚡ Latency: <strong style={{ color: '#10B981' }}>28ms (HD 720p)</strong></span>
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              minHeight: '28px',
              padding: '0.15rem 0.55rem',
              fontSize: '0.74rem',
              color: '#F8FAFC',
              background: 'rgba(255,255,255,0.15)',
              borderColor: 'rgba(255,255,255,0.2)'
            }}
            onClick={() => setViewMode(viewMode === 'dual' ? 'pip' : 'dual')}
          >
            <LayoutGrid size={13} style={{ marginRight: '4px' }} />
            {viewMode === 'dual' ? 'PiP Mode' : 'Dual Grid'}
          </button>
        </div>
      </div>

      {/* Main Workspace Split Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(340px, 1.15fr) minmax(360px, 1fr)',
        gap: '1.25rem'
      }}>
        {/* Left Column: Dual Video Conference & Screening Images */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Dual Video Conference Canvas */}
          <div style={{
            background: '#0B132B',
            borderRadius: '16px',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid #1E293B',
            padding: '0.75rem'
          }}>
            {viewMode === 'dual' ? (
              /* DUAL SPLIT GRID: PHC (Patient with Staff) & Specialist Doctor */
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                minHeight: '270px'
              }}>
                {/* Screen 1: PHC Clinic Endpoint (Patient in Presence of Medical Staff) */}
                <div style={{
                  background: '#0F172A',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  position: 'relative',
                  aspectRatio: '4/3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #334155'
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
                    <div style={{ textAlign: 'center', color: '#94A3B8', padding: '1rem' }}>
                      <VideoOff size={36} style={{ margin: '0 auto 0.4rem', opacity: 0.6 }} />
                      <div style={{ fontSize: '0.8rem' }}>PHC Camera Paused</div>
                    </div>
                  )}

                  {/* Endpoint Overlay - PHC Staff & Patient */}
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(4px)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    color: '#6EE7B7',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Building size={12} />
                    PHC CLINIC ENDPOINT
                  </div>

                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    right: '8px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(4px)',
                    padding: '0.35rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    color: '#FFFFFF'
                  }}>
                    <div style={{ fontWeight: 700 }}>
                      {session.patient_name} ({session.patient_age}y)
                    </div>
                    <div style={{ fontSize: '0.66rem', color: '#94A3B8' }}>
                      With PHC Staff Nurse & Medical Officer
                    </div>
                  </div>
                </div>

                {/* Screen 2: Specialist Doctor Endpoint (Doctor Hub) */}
                <div style={{
                  background: 'linear-gradient(145deg, #0A192F 0%, #172554 100%)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  position: 'relative',
                  aspectRatio: '4/3',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #1E3A8A'
                }}>
                  {/* Doctor Telemedicine Visual Feed */}
                  <div style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    boxShadow: '0 0 20px rgba(13, 148, 136, 0.4)',
                    marginBottom: '0.5rem'
                  }}>
                    <Stethoscope size={38} />
                  </div>

                  <div style={{
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    textAlign: 'center',
                    padding: '0 0.5rem'
                  }}>
                    {session.doctor_name || 'Dr. Priya Sundaram'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#93C5FD' }}>
                    Specialist Oncologist • Hub Online
                  </div>

                  {/* Audio wave pulse simulation */}
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'center', marginTop: '0.6rem' }}>
                    <span style={{ width: '3px', height: '14px', background: '#38BDF8', borderRadius: '2px', animation: 'pulse 1s infinite' }} />
                    <span style={{ width: '3px', height: '22px', background: '#38BDF8', borderRadius: '2px', animation: 'pulse 1.2s infinite' }} />
                    <span style={{ width: '3px', height: '10px', background: '#38BDF8', borderRadius: '2px', animation: 'pulse 0.8s infinite' }} />
                    <span style={{ width: '3px', height: '18px', background: '#38BDF8', borderRadius: '2px', animation: 'pulse 1.1s infinite' }} />
                  </div>

                  {/* Endpoint Overlay - Doctor */}
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(4px)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    color: '#38BDF8',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Stethoscope size={12} />
                    SPECIALIST DOCTOR ENDPOINT
                  </div>

                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid #10B981',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    color: '#6EE7B7',
                    fontWeight: 700
                  }}>
                    ● AUDIO 2-WAY HD
                  </div>
                </div>
              </div>
            ) : (
              /* PICTURE IN PICTURE (PiP) VIEW */
              <div style={{
                position: 'relative',
                aspectRatio: '16/9',
                background: '#0F172A',
                borderRadius: '12px',
                overflow: 'hidden'
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

                {/* PiP Inset (Doctor) */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  width: '140px',
                  aspectRatio: '4/3',
                  background: 'linear-gradient(145deg, #0A192F 0%, #172554 100%)',
                  borderRadius: '10px',
                  border: '2px solid #38BDF8',
                  boxShadow: 'var(--shadow-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.5rem'
                }}>
                  <Stethoscope size={24} color="#38BDF8" />
                  <div style={{ fontSize: '0.7rem', color: '#FFFFFF', fontWeight: 700, marginTop: '0.2rem' }}>
                    Dr. Priya
                  </div>
                  <div style={{ fontSize: '0.6rem', color: '#93C5FD' }}>
                    Oncologist
                  </div>
                </div>

                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '8px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(4px)',
                  padding: '0.35rem 0.6rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  color: '#FFFFFF'
                }}>
                  {session.patient_name} in presence of Medical Staff • {session.phc_name}
                </div>
              </div>
            )}

            {/* Video Controls Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.75rem',
              paddingTop: '0.75rem'
            }}>
              <button
                type="button"
                onClick={handleToggleVideo}
                style={{
                  background: videoActive ? 'rgba(255,255,255,0.15)' : '#EF4444',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={videoActive ? 'Pause Video' : 'Resume Video'}
              >
                {videoActive ? <Video size={18} /> : <VideoOff size={18} />}
              </button>

              <button
                type="button"
                onClick={handleToggleAudio}
                style={{
                  background: audioActive ? 'rgba(255,255,255,0.15)' : '#EF4444',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={audioActive ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {audioActive ? <Mic size={18} /> : <MicOff size={18} />}
              </button>

              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'dual' ? 'pip' : 'dual')}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Toggle View Mode"
              >
                <LayoutGrid size={17} />
              </button>
            </div>
          </div>

          {/* Screening Photo & Quality Reference */}
          {session.screening_details && (
            <div className="card" style={{ padding: '1.25rem' }}>
              <div className="card-title" style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                <FileText size={16} /> Attached Visible Screening
              </div>
              <div style={{ fontSize: '0.84rem', color: '#334155', marginBottom: '0.5rem' }}>
                Category: <strong>{session.screening_details.category}</strong> • Duration: {session.screening_details.duration_days} days
              </div>
              <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '0.75rem' }}>
                Symptoms: "{session.screening_details.symptoms}"
              </div>

              {session.screening_details.images && session.screening_details.images.length > 0 && (
                <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                  {session.screening_details.images.map((img: any, idx: number) => (
                    <div key={idx} style={{ flex: '0 0 160px' }}>
                      <img
                        src={img.preview_url}
                        alt="Screening"
                        style={{ width: '100%', height: '115px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E2E8F0' }}
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

        {/* Right Column: Clinical Assessment & Hospital Referral Slip Creation */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div className="card-title" style={{ margin: 0 }}>
              <Stethoscope size={20} color="var(--teal-primary)" />
              Clinical Assessment & Prescription
            </div>

            {/* Doctor's Referral Slip Trigger Button */}
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                fontSize: '0.78rem',
                minHeight: '32px',
                padding: '0.25rem 0.65rem',
                borderColor: '#0D9488',
                color: '#0F766E',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
              onClick={() => {
                setReferralSlipNotes(clinicalFindings);
                setShowReferralModal(true);
              }}
            >
              <Plus size={14} />
              Issue Referral Slip
            </button>
          </div>

          {/* Quick Notice if Doctor already issued a Referral Slip in this call */}
          {createdSlip && (
            <div style={{
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: '8px',
              padding: '0.75rem',
              marginBottom: '1rem',
              fontSize: '0.82rem',
              color: '#065F46',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                ✓ Referral Slip Issued: <strong>{createdSlip.referral_slip_number}</strong> ({createdSlip.target_hospital})
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: '26px', padding: '0.1rem 0.5rem', fontSize: '0.72rem' }}
                onClick={() => setShowReferralModal(true)}
              >
                View Slip
              </button>
            </div>
          )}

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
                placeholder="e.g. In-person review at PHC in 7 days, or return if symptoms persist"
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
                  Create Secondary Care / Hospital Referral Slip
                </label>
              </div>

              {referralNeeded && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Specialty Needed</label>
                    <select
                      className="form-control"
                      value={referralSpecialty}
                      onChange={(e) => setReferralSpecialty(e.target.value)}
                    >
                      <option value="Head & Neck Surgical Oncology">Head & Neck Surgical Oncology</option>
                      <option value="Oral & Maxillofacial">Oral & Maxillofacial</option>
                      <option value="Dermatology">Dermatology</option>
                      <option value="Ophthalmology">Ophthalmology</option>
                      <option value="ENT Specialist">ENT Specialist</option>
                      <option value="General Surgery">General Surgery</option>
                      <option value="Radiation Oncology">Radiation Oncology</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Target Referral Hospital</label>
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

      {/* Doctor Referral Slip Generation Modal */}
      {showReferralModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 80,
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '620px',
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-xl)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                  {createdSlip ? 'Official Hospital Referral Slip' : 'Issue Hospital Referral Slip'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Patient: <strong>{session.patient_name}</strong> ({session.patient_id_display}) • {session.phc_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReferralModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            {createdSlip ? (
              /* Generated Slip Printable Preview */
              <div>
                <div style={{
                  border: '2px solid #0D9488',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  background: '#F0FDFA',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ textAlign: 'center', borderBottom: '1px solid #CCFBF1', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F766E', letterSpacing: '0.05em' }}>
                      GOVERNMENT OF ANDHRA PRADESH • TRIBAL HEALTH SERVICES
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#134E4A', marginTop: '0.2rem' }}>
                      OFFICIAL HOSPITAL REFERRAL SLIP
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0D9488', marginTop: '0.3rem' }}>
                      Slip No: {createdSlip.referral_slip_number}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', fontSize: '0.84rem', marginBottom: '1rem' }}>
                    <div>
                      <span style={{ color: '#64748B' }}>Patient Name:</span>
                      <div style={{ fontWeight: 700 }}>{createdSlip.patient_name} ({createdSlip.age || session.patient_age}y / {createdSlip.gender || 'M'})</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Target Hospital:</span>
                      <div style={{ fontWeight: 700 }}>{createdSlip.target_hospital}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Specialty Needed:</span>
                      <div style={{ fontWeight: 700 }}>{createdSlip.specialty_needed}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Urgency Level:</span>
                      <div style={{ fontWeight: 700, textTransform: 'uppercase', color: createdSlip.urgency === 'urgent' ? '#DC2626' : '#D97706' }}>
                        {createdSlip.urgency}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                    <span style={{ color: '#64748B' }}>Reason for Referral:</span>
                    <div style={{ fontWeight: 600 }}>{createdSlip.reason_for_referral}</div>
                  </div>

                  {createdSlip.clinical_notes && (
                    <div style={{ fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                      <span style={{ color: '#64748B' }}>Clinical Observations:</span>
                      <div style={{ fontStyle: 'italic' }}>{createdSlip.clinical_notes}</div>
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid #CCFBF1', paddingTop: '0.75rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#0F766E' }}>
                    <span>Referring Doctor: <strong>{session.doctor_name || user.full_name}</strong></span>
                    <span>Date: <strong>{createdSlip.scheduled_appointment_date || new Date().toISOString().split('T')[0]}</strong></span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setCreatedSlip(null)}
                  >
                    Edit & Re-issue
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => window.print()}
                  >
                    <Printer size={16} /> Print Referral Slip
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ background: '#059669' }}
                    onClick={() => setShowReferralModal(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Create Slip Form */
              <form onSubmit={handleCreateReferralSlip}>
                <div className="form-group">
                  <label className="form-label">Target Referral Hospital *</label>
                  <select
                    className="form-control"
                    required
                    value={referralSlipTargetHospital}
                    onChange={(e) => setReferralSlipTargetHospital(e.target.value)}
                  >
                    <option value="King George Hospital (KGH) Visakhapatnam">King George Hospital (KGH) Visakhapatnam</option>
                    <option value="District Hospital Paderu / Anakapalli">District Hospital Paderu / Anakapalli</option>
                    <option value="District Government General Hospital, Ongole">District Government General Hospital, Ongole</option>
                    <option value="Homi Bhabha Cancer Hospital & Research Centre, Vizag">Homi Bhabha Cancer Hospital & Research Centre, Vizag</option>
                    <option value="Government Dental College & Hospital, Vijayawada">Government Dental College & Hospital, Vijayawada</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Specialty Needed *</label>
                    <select
                      className="form-control"
                      required
                      value={referralSlipSpecialty}
                      onChange={(e) => setReferralSlipSpecialty(e.target.value)}
                    >
                      <option value="Head & Neck Surgical Oncology">Head & Neck Surgical Oncology</option>
                      <option value="Oral & Maxillofacial">Oral & Maxillofacial</option>
                      <option value="Dermatology">Dermatology</option>
                      <option value="ENT Specialist">ENT Specialist</option>
                      <option value="General Surgery">General Surgery</option>
                      <option value="Medical Oncology">Medical Oncology</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Urgency Priority *</label>
                    <select
                      className="form-control"
                      value={referralSlipUrgency}
                      onChange={(e) => setReferralSlipUrgency(e.target.value)}
                    >
                      <option value="priority">Priority (Within 3-5 days)</option>
                      <option value="urgent">Urgent / Fast-Track (Within 24-48 hrs)</option>
                      <option value="routine">Routine (Within 1-2 weeks)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason for Referral *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={referralSlipReason}
                    onChange={(e) => setReferralSlipReason(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Clinical Observations & Biopsy Request Notes</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Describe lesion characteristics, duration, provisional diagnosis, and requested workup..."
                    value={referralSlipNotes}
                    onChange={(e) => setReferralSlipNotes(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowReferralModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={slipLoading}
                  >
                    {slipLoading ? 'Generating Slip...' : 'Confirm & Issue Referral Slip'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
