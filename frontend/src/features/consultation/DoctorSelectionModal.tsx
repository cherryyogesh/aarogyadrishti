import React, { useState, useEffect, useRef } from 'react';
import {
  Video, PhoneOff, User as UserIcon, Building2, Stethoscope,
  X, Check, AlertCircle, RefreshCw, PhoneCall, Clock, CheckCircle2
} from 'lucide-react';
import { api } from '../../services/api';
import { ringtone } from './ringtone';
import { Patient, User, DoctorDirectoryItem, ConsultationSession } from '../../types';

interface Props {
  patient: Patient;
  user: User;
  onClose: () => void;
  onCallConnected: (session: ConsultationSession) => void;
}

export const DoctorSelectionModal: React.FC<Props> = ({ patient, user, onClose, onCallConnected }) => {
  const [doctors, setDoctors] = useState<DoctorDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorDirectoryItem | null>(null);

  // Call status state: 'select' | 'ringing' | 'declined' | 'missed'
  const [callState, setCallState] = useState<'select' | 'ringing' | 'declined' | 'missed'>('select');
  const [consultationId, setConsultationId] = useState<number | null>(null);
  const [declineReason, setDeclineReason] = useState<string>('');
  const [ringingSeconds, setRingingSeconds] = useState(0);

  const activeConsultationRef = useRef<{ id: number; token: string; room: string } | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const stopToneRef = useRef<(() => void) | null>(null);

  // Fetch doctors on mount
  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const data = await api.getAvailableDoctors();
      setDoctors(data);
      if (data.length > 0) {
        // Auto-select first available doctor
        const firstAvail = data.find(d => d.availability_status === 'online') || data[0];
        setSelectedDoctor(firstAvail);
      }
    } catch (err: any) {
      console.error('Failed to load doctors list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
    return () => {
      cleanUpCall();
    };
  }, []);

  const cleanUpCall = () => {
    if (stopToneRef.current) {
      stopToneRef.current();
      stopToneRef.current = null;
    }
    ringtone.stopAll();
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  };

  // Ringing Timer
  useEffect(() => {
    let timer: any = null;
    if (callState === 'ringing') {
      timer = setInterval(() => {
        setRingingSeconds(s => {
          if (s >= 35) {
            handleCallMissed();
            return 35;
          }
          return s + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callState]);

  const handleCallMissed = async () => {
    cleanUpCall();
    setCallState('missed');
    if (consultationId) {
      try {
        await api.markConsultationMissed(consultationId);
      } catch (e) {}
    }
  };

  const handleInitiateCall = async () => {
    if (!selectedDoctor) return;
    setCallState('ringing');
    setRingingSeconds(0);

    // Start pleasant outgoing calling cadence
    stopToneRef.current = ringtone.startOutgoingCallingTone();

    try {
      const resp = await api.initiateConsultation({
        patient_id: patient.id,
        doctor_id: selectedDoctor.id,
        consultation_type: 'VIDEO'
      });

      setConsultationId(resp.consultation_id);
      activeConsultationRef.current = {
        id: resp.consultation_id,
        token: resp.session_token,
        room: resp.webrtc_room_id
      };

      // Connect to user websocket stream to listen for Doctor's response
      connectToSignaling(resp.consultation_id, resp.webrtc_room_id, resp.session_token);
    } catch (err: any) {
      cleanUpCall();
      alert('Could not initiate video call: ' + err.message);
      setCallState('select');
    }
  };

  const connectToSignaling = (cId: number, roomId: string, token: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Listen to user's dedicated notification socket
    const wsUrl = `${protocol}//${window.location.host}/api/v1/webrtc/user-ws/${user.id}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'call_accepted' && (!msg.consultation_id || msg.consultation_id === cId)) {
          // Doctor accepted!
          cleanUpCall();
          ringtone.playConnectedChime();

          const session: ConsultationSession = {
            consultation_id: cId,
            session_token: token,
            webrtc_room_id: roomId,
            stun_server: 'stun:stun.l.google.com:19302',
            patient_name: patient.full_name,
            patient_age: patient.age,
            patient_id: patient.id,
            patient_id_display: patient.patient_id_display || `PAT-2026-${String(patient.id).padStart(4, '0')}`,
            phc_name: user.mandal ? `${user.mandal} Primary Health Centre` : 'Primary Health Centre',
            doctor_name: selectedDoctor?.full_name || 'Specialist Doctor',
            mandal: patient.mandal
          };

          onCallConnected(session);
        } else if (msg.type === 'call_declined' && (!msg.consultation_id || msg.consultation_id === cId)) {
          cleanUpCall();
          setDeclineReason(msg.reason || 'Doctor is currently engaged in emergency consultation');
          setCallState('declined');
        } else if (msg.type === 'call_missed' && (!msg.consultation_id || msg.consultation_id === cId)) {
          cleanUpCall();
          setCallState('missed');
        }
      } catch (e) {}
    };

    ws.onerror = () => {
      // Fallback: poll status every 2 seconds if websocket fails
      startPollingFallback(cId, roomId, token);
    };
  };

  const startPollingFallback = (cId: number, roomId: string, token: string) => {
    const pollInterval = setInterval(async () => {
      if (callState !== 'ringing') {
        clearInterval(pollInterval);
        return;
      }
      try {
        const details = await api.getConsultationDetails(cId);
        if (details.status === 'accepted' || details.status === 'connected') {
          clearInterval(pollInterval);
          cleanUpCall();
          ringtone.playConnectedChime();

          const session: ConsultationSession = {
            consultation_id: cId,
            session_token: token,
            webrtc_room_id: roomId,
            stun_server: 'stun:stun.l.google.com:19302',
            patient_name: patient.full_name,
            patient_age: patient.age,
            patient_id: patient.id,
            patient_id_display: patient.patient_id_display,
            phc_name: 'Primary Health Centre',
            doctor_name: selectedDoctor?.full_name || 'Doctor',
            mandal: patient.mandal
          };
          onCallConnected(session);
        } else if (details.status === 'declined') {
          clearInterval(pollInterval);
          cleanUpCall();
          setDeclineReason(details.termination_reason || 'Doctor unavailable');
          setCallState('declined');
        } else if (details.status === 'missed') {
          clearInterval(pollInterval);
          cleanUpCall();
          setCallState('missed');
        }
      } catch (e) {}
    }, 2000);
  };

  const handleCancelCall = async () => {
    cleanUpCall();
    if (consultationId) {
      try {
        await api.cancelConsultationCall(consultationId);
      } catch (e) {}
    }
    setCallState('select');
  };

  const displayId = patient.patient_id_display || `PAT-2026-${String(patient.id).padStart(4, '0')}`;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '1.25rem'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        maxWidth: '560px',
        width: '100%',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
        border: '1px solid rgba(226, 232, 240, 0.9)'
      }}>
        {/* Top Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#F8FAFC'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              backgroundColor: '#CCFBF1', color: '#0F766E',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Video size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                Doctor–Patient Video Consultation
              </h3>
              <p style={{ fontSize: '0.76rem', color: '#64748B', margin: 0 }}>
                Live telemedicine connection with medical specialist
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              cleanUpCall();
              onClose();
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Patient Summary Strip */}
        <div style={{
          background: '#F0FDFA',
          padding: '0.85rem 1.5rem',
          borderBottom: '1px solid #CCFBF1',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#0F766E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Patient For Consultation
            </span>
            <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#134E4A' }}>
              {patient.full_name} ({patient.age}y • {patient.gender})
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{
              background: '#0D9488',
              color: '#FFFFFF',
              fontSize: '0.74rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '6px'
            }}>
              {displayId}
            </span>
            <div style={{ fontSize: '0.76rem', color: '#0F766E', marginTop: '2px' }}>
              {patient.village_town || (patient as any).village || 'Paderu Agency'}
            </div>
          </div>
        </div>

        {/* Content based on state */}
        {callState === 'select' && (
          <div style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#334155', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Select Authorized Specialist Doctor:</span>
              <button
                onClick={fetchDoctors}
                style={{ background: 'none', border: 'none', color: '#0D9488', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RefreshCw size={12} /> Refresh Availability
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748B' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
                Checking doctors network and availability status...
              </div>
            ) : doctors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#EF4444' }}>
                No active doctors found in the roster.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                {doctors.map(doc => {
                  const isSelected = selectedDoctor?.id === doc.id;
                  const isBusy = doc.availability_status === 'in_consultation';

                  return (
                    <div
                      key={doc.id}
                      onClick={() => !isBusy && setSelectedDoctor(doc)}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #0D9488' : '1px solid #E2E8F0',
                        background: isSelected ? '#F0FDFA' : isBusy ? '#F8FAFC' : '#FFFFFF',
                        cursor: isBusy ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        opacity: isBusy ? 0.65 : 1,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '42px', height: '42px', borderRadius: '50%',
                          background: isSelected ? '#CCFBF1' : '#E0F2FE',
                          color: isSelected ? '#0D9488' : '#0284C7',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: '0.95rem'
                        }}>
                          {doc.full_name.replace('Dr. ', '').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#0F172A' }}>
                            {doc.full_name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span>{doc.department_or_specialty || 'Oral Specialist'}</span>
                            <span>•</span>
                            <span>{doc.phc_name}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {doc.availability_status === 'online' ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            background: '#DCFCE7', color: '#166534',
                            fontSize: '0.72rem', fontWeight: 700,
                            padding: '3px 8px', borderRadius: '12px'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E' }} />
                            Available
                          </span>
                        ) : isBusy ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            background: '#FEF3C7', color: '#92400E',
                            fontSize: '0.72rem', fontWeight: 700,
                            padding: '3px 8px', borderRadius: '12px'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B' }} />
                            In Consultation
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            background: '#F1F5F9', color: '#64748B',
                            fontSize: '0.72rem', fontWeight: 700,
                            padding: '3px 8px', borderRadius: '12px'
                          }}>
                            Offline
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Initiate Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!selectedDoctor || selectedDoctor.availability_status === 'in_consultation'}
                onClick={handleInitiateCall}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.4rem',
                  fontWeight: 700
                }}
              >
                <Video size={18} />
                Call {selectedDoctor ? selectedDoctor.full_name : 'Doctor'}
              </button>
            </div>
          </div>
        )}

        {/* Ringing Screen */}
        {callState === 'ringing' && (
          <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            {/* Concentric Pulsing Radar */}
            <div style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              background: '#CCFBF1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 0 0 16px rgba(13, 148, 136, 0.15), 0 0 0 32px rgba(13, 148, 136, 0.08)'
            }}>
              <PhoneCall size={40} color="#0D9488" className="pulse-icon" />
            </div>

            <div style={{
              fontSize: '0.8rem',
              fontWeight: 800,
              color: '#0D9488',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '0.35rem'
            }}>
              Calling Specialist Doctor
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.5rem' }}>
              {selectedDoctor?.full_name}
            </h3>

            <p style={{ fontSize: '0.88rem', color: '#64748B', maxWidth: '380px', margin: '0 auto 1.25rem' }}>
              Ringing doctor dashboard. The doctor has been notified and can answer via web or mobile camera.
            </p>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#F1F5F9',
              padding: '0.35rem 0.85rem',
              borderRadius: '20px',
              fontSize: '0.82rem',
              color: '#334155',
              fontWeight: 700,
              marginBottom: '2rem'
            }}>
              <Clock size={14} color="#0D9488" />
              Ringing: {String(Math.floor(ringingSeconds / 60)).padStart(2, '0')}:{String(ringingSeconds % 60).padStart(2, '0')} (Timeout: 35s)
            </div>

            <div>
              <button
                onClick={handleCancelCall}
                style={{
                  padding: '0.75rem 2rem',
                  borderRadius: '12px',
                  border: '1px solid #FECDD3',
                  background: '#FFF1F2',
                  color: '#E11D48',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <PhoneOff size={18} />
                Cancel Call
              </button>
            </div>
          </div>
        )}

        {/* Declined State */}
        {callState === 'declined' && (
          <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: '#FFE4E6', color: '#E11D48',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <PhoneOff size={32} />
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.4rem' }}>
              Doctor Unavailable
            </h3>

            <p style={{ fontSize: '0.88rem', color: '#64748B', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
              <strong>{selectedDoctor?.full_name}</strong> is unable to take the consultation right now.
              <br />
              <span style={{ color: '#E11D48', fontStyle: 'italic', marginTop: '4px', display: 'inline-block' }}>
                Note: {declineReason || 'Doctor is engaged in another medical procedure'}
              </span>
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  cleanUpCall();
                  onClose();
                }}
              >
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setCallState('select')}
              >
                Choose Another Doctor
              </button>
            </div>
          </div>
        )}

        {/* Missed / Timeout State */}
        {callState === 'missed' && (
          <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: '#FEF3C7', color: '#B45309',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <Clock size={32} />
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.4rem' }}>
              No Answer from Doctor
            </h3>

            <p style={{ fontSize: '0.88rem', color: '#64748B', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
              The call to <strong>{selectedDoctor?.full_name}</strong> timed out after 35 seconds of ringing. The missed call has been logged.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  cleanUpCall();
                  onClose();
                }}
              >
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setCallState('select')}
              >
                Select Another Doctor
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
