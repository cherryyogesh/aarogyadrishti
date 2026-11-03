import React, { useEffect, useState } from 'react';
import { Video, PhoneOff, User, MapPin, Building2, Stethoscope, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { ringtone } from './ringtone';
import { ConsultationSession } from '../../types';

export interface IncomingCallData {
  consultation_id: number;
  webrtc_room_id: string;
  session_token: string;
  consultation_type?: string;
  patient: {
    id: number;
    patient_id_display?: string;
    full_name: string;
    age: number;
    gender: string;
    village?: string;
    mandal?: string;
  };
  calling_staff: {
    id: number;
    full_name: string;
    role: string;
    facility_name: string;
  };
  case_id?: number;
  appointment_id?: number;
}

interface Props {
  call: IncomingCallData;
  doctorName: string;
  onAccept: (session: ConsultationSession) => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<Props> = ({ call, doctorName, onAccept, onDecline }) => {
  const [secondsRemaining, setSecondsRemaining] = useState(35);
  const [isProcessing, setIsProcessing] = useState(false);

  // Start audible telephone ringtone on mount and clean up on unmount
  useEffect(() => {
    const stopRing = ringtone.startIncomingRingtone();

    // 35-second missed call timeout
    const countdown = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      stopRing();
      clearInterval(countdown);
    };
  }, []);

  const handleTimeout = async () => {
    ringtone.stopAll();
    try {
      await api.markConsultationMissed(call.consultation_id);
    } catch (e) {}
    onDecline();
  };

  const handleAccept = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    ringtone.stopAll();
    ringtone.playConnectedChime();

    try {
      await api.acceptConsultationCall(call.consultation_id);
      
      const session: ConsultationSession = {
        consultation_id: call.consultation_id,
        appointment_id: call.appointment_id || 0,
        session_token: call.session_token,
        webrtc_room_id: call.webrtc_room_id,
        stun_server: 'stun:stun.l.google.com:19302',
        patient_name: call.patient.full_name,
        patient_age: call.patient.age,
        patient_id: call.patient.id,
        patient_id_display: call.patient.patient_id_display,
        phc_name: call.calling_staff.facility_name,
        doctor_name: doctorName,
        mandal: call.patient.mandal
      };

      onAccept(session);
    } catch (err: any) {
      alert('Failed to accept consultation: ' + err.message);
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    ringtone.stopAll();
    try {
      await api.declineConsultationCall(call.consultation_id, 'Doctor declined');
    } catch (e) {}
    onDecline();
  };

  const displayId = call.patient.patient_id_display || `PAT-2026-${String(call.patient.id).padStart(4, '0')}`;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.78)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      padding: '1.25rem'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '24px',
        maxWidth: '520px',
        width: '100%',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        animation: 'callModalPulse 2s infinite alternate'
      }}>
        {/* Top Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
          color: '#FFFFFF',
          padding: '1.5rem',
          textAlign: 'center',
          position: 'relative'
        }}>
          {/* Pulsing Ring Icon */}
          <div style={{
            width: '74px',
            height: '74px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.85rem',
            boxShadow: '0 0 0 10px rgba(255, 255, 255, 0.12)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#FFFFFF',
              color: '#0284C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Video size={30} />
            </div>
          </div>

          <div style={{
            fontSize: '0.78rem',
            letterSpacing: '1.2px',
            textTransform: 'uppercase',
            fontWeight: 800,
            opacity: 0.9,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'rgba(255, 255, 255, 0.18)',
            padding: '3px 12px',
            borderRadius: '20px',
            marginBottom: '0.35rem'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} />
            Incoming Video Consultation
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0.2rem 0' }}>
            {call.patient.full_name}
          </h2>

          <div style={{ fontSize: '0.86rem', opacity: 0.92 }}>
            {call.patient.age}y • {call.patient.gender} • {displayId}
          </div>

          {/* Timeout Progress Bar */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '4px',
            background: '#38BDF8',
            width: `${(secondsRemaining / 35) * 100}%`,
            transition: 'width 1s linear'
          }} />
        </div>

        {/* Call Info Body */}
        <div style={{ padding: '1.5rem' }}>
          <div style={{
            background: '#F8FAFC',
            borderRadius: '14px',
            padding: '1.15rem',
            border: '1px solid #E2E8F0',
            marginBottom: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.88rem', color: '#1E293B' }}>
              <Building2 size={18} color="#0284C7" />
              <div>
                <span style={{ color: '#64748B', fontSize: '0.76rem', display: 'block' }}>Originating Facility</span>
                <strong>{call.calling_staff.facility_name}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.88rem', color: '#1E293B' }}>
              <User size={18} color="#0D9488" />
              <div>
                <span style={{ color: '#64748B', fontSize: '0.76rem', display: 'block' }}>Calling Staff</span>
                <strong>{call.calling_staff.full_name}</strong> ({call.calling_staff.role})
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.88rem', color: '#1E293B' }}>
              <MapPin size={18} color="#E11D48" />
              <div>
                <span style={{ color: '#64748B', fontSize: '0.76rem', display: 'block' }}>Location</span>
                <strong>{call.patient.village || 'Paderu'}, {call.patient.mandal || 'ASR District'}</strong>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.82rem', color: '#64748B', marginBottom: '1.25rem' }}>
            Ringing... Auto-rejects in <strong>{secondsRemaining}s</strong> if unanswered
          </div>

          {/* Action Buttons: Accept / Decline */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <button
              onClick={handleDecline}
              disabled={isProcessing}
              style={{
                padding: '0.85rem',
                borderRadius: '14px',
                border: '1px solid #FECDD3',
                background: '#FFF1F2',
                color: '#E11D48',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease'
              }}
            >
              <PhoneOff size={18} />
              Decline
            </button>

            <button
              onClick={handleAccept}
              disabled={isProcessing}
              style={{
                padding: '0.85rem',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 8px 20px -4px rgba(22, 163, 74, 0.45)',
                transition: 'all 0.2s ease'
              }}
            >
              <Video size={18} />
              {isProcessing ? 'Connecting...' : 'Accept Call'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

