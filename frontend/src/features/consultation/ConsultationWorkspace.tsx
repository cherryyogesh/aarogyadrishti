import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, ConsultationSession, User, ReferralSlip } from '../../types';
import {
  Video, VideoOff, Mic, MicOff, Stethoscope, FileText, CheckCircle,
  AlertCircle, ArrowLeft, Send, Sparkles, Building, Printer, Download,
  Plus, Users, LayoutGrid, Maximize2, ShieldCheck, Check, X, PhoneCall,
  Activity, Clock, QrCode, Smartphone, ExternalLink, Copy
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

  // Google MedGemma 1.5 4B AI Assessment State
  const [mytraAssessment, setMytraAssessment] = useState<any>(session.screening_details?.mytra_assessment || null);
  const [loadingMytra, setLoadingMytra] = useState(false);

  useEffect(() => {
    if (!mytraAssessment && session.screening_details?.id) {
      setLoadingMytra(true);
      api.getScreeningMytraAssessment(session.screening_details.id)
        .then(res => {
          if (res) setMytraAssessment(res);
        })
        .catch(err => console.warn('Could not fetch MedGemma assessment for tele-consultation:', err))
        .finally(() => setLoadingMytra(false));
    }
  }, [session.screening_details?.id]);

  const handleCopyAiToNotes = () => {
    if (!mytraAssessment) return;
    const obs = (mytraAssessment.visible_observations || []).map((o: string) => `• ${o}`).join('\n');
    const diffs = (mytraAssessment.possible_explanations || []).map((d: any) => `• ${d.name}: ${d.reasoning || ''}`).join('\n');
    const trismus = session.screening_details?.mouth_opening_mm ? `Inter-incisal mouth opening: ${session.screening_details.mouth_opening_mm} mm.` : '';
    const textToInsert = `[Google MedGemma 1.5 4B AI Findings]:\n${trismus ? trismus + '\n' : ''}Visible Observations:\n${obs}\n\nClinical Differentials Considered:\n${diffs}\n\nClinician Evaluation: Correlated during live video examination.`;
    setClinicalFindings(prev => prev ? `${prev}\n\n${textToInsert}` : textToInsert);
  };

  const [finalizing, setFinalizing] = useState(false);
  const [completed, setCompleted] = useState(false);

  const phcVideoRef = useRef<HTMLVideoElement>(null);
  const doctorVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const [streamStarted, setStreamStarted] = useState(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const isDoctorUser = user?.role === 'doctor';

  // Independent webcam active states for both sides
  const [phcCamActive, setPhcCamActive] = useState(true);
  const [doctorCamActive, setDoctorCamActive] = useState(true);

  // Single-PC Simulation: Mirror user's camera to both screens for full testing
  const [mirrorBothScreens, setMirrorBothScreens] = useState(false);

  // WebRTC 2-Way Live Conference Setup
  const roomId = session.webrtc_room_id || `ad-telemed-apt-${session.appointment_id || 1}`;
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

  const [isCallConnected, setIsCallConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [peerCount, setPeerCount] = useState(1);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const RTC_CONFIG: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  // Direct video binder callback ref to guarantee immediate DOM attachment and autoplay success
  const bindVideoNode = (
    el: HTMLVideoElement | null,
    stream: MediaStream | null,
    isMuted: boolean,
    isMirrored: boolean
  ) => {
    if (!el) return;
    el.muted = isMuted;
    el.defaultMuted = isMuted;
    el.playsInline = true;
    el.setAttribute('playsinline', 'true');
    if (isMuted) {
      el.setAttribute('muted', 'true');
    } else {
      el.removeAttribute('muted');
    }
    const mirrorTransform = isMirrored ? 'scaleX(-1)' : 'none';
    el.style.transform = mirrorTransform;
    el.style.webkitTransform = mirrorTransform;

    if (stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Video element play() notice:', err);
        });
      }
    } else {
      el.srcObject = null;
    }
  };

  const startLocalCamera = async () => {
    setCameraLoading(true);
    setCameraError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      const err = 'Camera access is not supported in this browser context (HTTPS or localhost is required).';
      setCameraError(err);
      setCameraLoading(false);
      return null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: true
        });
      } catch (errAudio) {
        console.warn('Audio device unavailable or restricted, fallback to video-only:', errAudio);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: false
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      setCameraPermissionGranted(true);
      setCameraError(null);
      setStreamStarted(true);

      // If peer connection exists, add or update tracks
      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        stream.getTracks().forEach((track) => {
          const existingSender = senders.find(s => s.track && s.track.kind === track.kind);
          if (existingSender) {
            existingSender.replaceTrack(track);
          } else {
            try {
              peerConnectionRef.current?.addTrack(track, stream);
            } catch (e) {
              console.warn('Could not add track to existing PC:', e);
            }
          }
        });
      }
      return stream;
    } catch (err: any) {
      console.warn('Webcam permission or device error:', err);
      setCameraPermissionGranted(false);
      let msg = 'Could not access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please click the camera icon in your browser address bar to allow camera access.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera found on this device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Webcam is currently occupied by another program (e.g. Teams, Zoom). Please close other apps and click retry.';
      } else if (err.message) {
        msg = err.message;
      }
      setCameraError(msg);
      return null;
    } finally {
      setCameraLoading(false);
    }
  };

  // Initialize camera preview on mount
  useEffect(() => {
    startLocalCamera();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
    };
  }, []);

  const drainIceCandidates = async (pc: RTCPeerConnection) => {
    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[WebRTC] Error adding queued ICE candidate:', err);
        }
      }
    }
  };

  // WebRTC Peer Connection Helper
  const initPeerConnection = (isInitiator: boolean): RTCPeerConnection => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    console.log(`[WebRTC] Initializing PeerConnection (initiator=${isInitiator})`);
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.ontrack = (event) => {
      console.log('[WebRTC] ConsultationWorkspace: Received remote track:', event.track.kind, event.streams);
      const stream = event.streams[0] || new MediaStream([event.track]);
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
      setIsCallConnected(true);
      setIsConnecting(false);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'candidate',
          candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setIsCallConnected(true);
        setIsConnecting(false);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        setIsCallConnected(false);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setIsCallConnected(true);
        setIsConnecting(false);
      }
    };

    if (isInitiator) {
      setIsConnecting(true);
      pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true })
        .then(async (offer) => {
          await pc.setLocalDescription(offer);
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: 'offer', sdp: offer }));
          }
        })
        .catch((err) => {
          console.error('[WebRTC] createOffer error:', err);
          setIsConnecting(false);
        });
    }

    return pc;
  };

  const lanIp = '192.168.1.40';
  const mobileJoinUrl = `http://${lanIp}:5173/?join_call=${roomId}`;
  const localJoinUrl = typeof window !== 'undefined' ? `${window.location.origin}/?join_call=${roomId}` : '';

  // WebRTC Signaling WebSocket Client
  useEffect(() => {
    const host = window.location.hostname;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${host}:8000/api/v1/webrtc/ws/${roomId}`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('[WebRTC] Signaling connected for consultation room:', roomId);
    };

    ws.onmessage = async (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'peer_count') {
          setPeerCount(msg.count);
          // If we were already in the room and someone new joins, we initiate the call!
          if (msg.count >= 2 && !msg.is_new_joiner) {
            if (peerConnectionRef.current) {
              peerConnectionRef.current.close();
              peerConnectionRef.current = null;
            }
            initPeerConnection(true);
          }
        } else if (msg.type === 'peer_disconnected') {
          setIsCallConnected(false);
          setIsConnecting(false);
          setPeerCount(msg.count || 1);
          remoteStreamRef.current = null;
          setRemoteStream(null);
          if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
          }
        } else if (msg.type === 'offer') {
          console.log('[WebRTC] Received offer from peer');
          setIsConnecting(true);
          if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
          }
          const pc = initPeerConnection(false);
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          await drainIceCandidates(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'answer', sdp: answer }));
          }
        } else if (msg.type === 'answer') {
          console.log('[WebRTC] Received answer from peer');
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            await drainIceCandidates(peerConnectionRef.current);
          }
        } else if (msg.type === 'candidate') {
          if (msg.candidate) {
            const pc = peerConnectionRef.current;
            if (pc && pc.remoteDescription && pc.remoteDescription.type) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
              } catch (e) {
                console.warn('[WebRTC] Error adding ICE candidate:', e);
              }
            } else {
              iceCandidatesQueue.current.push(msg.candidate);
            }
          }
        }
      } catch (err) {
        console.error('[WebRTC] Signaling message error:', err);
      }
    };

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, [roomId]);

  const togglePhcCamera = async () => {
    if (!phcCamActive && !localStreamRef.current) {
      await startLocalCamera();
    }
    setPhcCamActive(prev => !prev);
  };

  const toggleDoctorCamera = async () => {
    if (!doctorCamActive && !localStreamRef.current) {
      await startLocalCamera();
    }
    setDoctorCamActive(prev => !prev);
  };

  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => track.enabled = !videoActive);
    }
    setVideoActive(!videoActive);
  };

  const handleToggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => track.enabled = !audioActive);
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
            background: isCallConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.2)',
            border: `1px solid ${isCallConnected ? '#10B981' : '#EAB308'}`,
            color: isCallConnected ? '#6EE7B7' : '#FDE047',
            padding: '0.2rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: 700
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isCallConnected ? '#10B981' : '#EAB308',
              animation: 'pulse 1s infinite'
            }} />
            {isCallConnected ? '● LIVE 2-WAY WEBRTC (CONNECTED)' : (peerCount > 1 ? 'CONNECTING WEBRTC...' : '1/2 PEER (WAITING FOR 2ND CAM)')}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.8rem', color: '#94A3B8', flexWrap: 'wrap' }}>
          <span>⏱️ <strong style={{ color: '#F1F5F9' }}>{formatTimer(elapsedSeconds)}</strong></span>

          {/* Test Mirror Toggle */}
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              minHeight: '28px',
              padding: '0.2rem 0.6rem',
              fontSize: '0.74rem',
              gap: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              color: mirrorBothScreens ? '#6EE7B7' : '#F8FAFC',
              background: mirrorBothScreens ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.15)',
              borderColor: mirrorBothScreens ? '#10B981' : 'rgba(255,255,255,0.2)'
            }}
            onClick={() => setMirrorBothScreens(!mirrorBothScreens)}
            title="Mirror your camera on both screens for single PC testing"
          >
            <Users size={13} />
            {mirrorBothScreens ? '👥 Dual Cam Test: ON' : '👥 Dual Test Mirror'}
          </button>

          <button
            type="button"
            className="btn btn-primary"
            style={{
              minHeight: '28px',
              padding: '0.2rem 0.6rem',
              fontSize: '0.74rem',
              gap: '4px',
              display: 'inline-flex',
              alignItems: 'center'
            }}
            onClick={() => setShowInviteModal(true)}
          >
            <Smartphone size={13} />
            📱 Connect Mobile Cam / QR
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{
              minHeight: '28px',
              padding: '0.2rem 0.55rem',
              fontSize: '0.74rem',
              color: '#38BDF8',
              borderColor: '#0284C7',
              background: 'rgba(2, 132, 199, 0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            onClick={() => window.open(localJoinUrl, '_blank')}
            title="Open in new window to test 2-way call on this PC"
          >
            <ExternalLink size={13} />
            🪟 Test in 2nd Window
          </button>

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
                  {/* Remote WebRTC peer stream (if Doctor is watching remote PHC/Patient) */}
                  {isCallConnected && isDoctorUser && remoteStream ? (
                    <video
                      ref={(el) => bindVideoNode(el, remoteStream, false, false)}
                      autoPlay
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : ((!isDoctorUser || mirrorBothScreens) && localStream && phcCamActive && videoActive) ? (
                    /* Real Live Webcam Feed for PHC / Patient (or Doctor mirror test mode) */
                    <video
                      ref={(el) => bindVideoNode(el, localStream, true, true)}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: 'scaleX(-1)'
                      }}
                    />
                  ) : (
                    /* Fallback / Standby Box with Direct Start Cam Button */
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <img
                        src="/assets/patient_face_feed.jpg"
                        alt="Patient with PHC staff"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.8)' }}
                      />
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.65)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                        textAlign: 'center'
                      }}>
                        <div style={{
                          background: 'rgba(15, 23, 42, 0.95)',
                          border: '1px solid #10B981',
                          borderRadius: '12px',
                          padding: '0.85rem 1.15rem',
                          color: '#E2E8F0',
                          maxWidth: '92%',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                        }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 800, color: '#6EE7B7', marginBottom: '0.3rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', animation: 'pulse 1s infinite' }} />
                            PHC & Patient Camera Standby
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                            {!isDoctorUser
                              ? 'Turn on your webcam to display your face to the doctor.'
                              : 'Waiting for patient to join or scan QR code on mobile.'}
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {!isDoctorUser ? (
                              <button
                                type="button"
                                onClick={startLocalCamera}
                                className="btn btn-primary"
                                style={{ minHeight: '30px', padding: '0.3rem 0.75rem', fontSize: '0.74rem', gap: '5px' }}
                              >
                                <Video size={13} /> {cameraLoading ? 'Starting Camera...' : '🎥 Turn ON Patient Webcam'}
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setMirrorBothScreens(true)}
                                  className="btn btn-primary"
                                  style={{ minHeight: '28px', padding: '0.25rem 0.65rem', fontSize: '0.72rem', gap: '4px' }}
                                  title="Display your live webcam here for single PC testing"
                                >
                                  <Users size={12} /> 👥 Mirror My Webcam
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowInviteModal(true)}
                                  className="btn btn-secondary"
                                  style={{ minHeight: '28px', padding: '0.25rem 0.65rem', fontSize: '0.72rem', color: '#6EE7B7', borderColor: '#10B981', gap: '4px' }}
                                >
                                  <Smartphone size={12} /> 📱 Mobile QR
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
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
                    gap: '4px',
                    zIndex: 2
                  }}>
                    <Building size={12} />
                    PHC CLINIC ENDPOINT
                  </div>

                  {/* Top-Right Pill: PHC Camera Status & Quick Toggle */}
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    zIndex: 3
                  }}>
                    <button
                      type="button"
                      onClick={togglePhcCamera}
                      style={{
                        background: (phcCamActive && ((isDoctorUser && mirrorBothScreens && localStream) || (!isDoctorUser && localStream) || (isCallConnected && isDoctorUser && remoteStream)) && videoActive)
                          ? 'rgba(16, 185, 129, 0.9)'
                          : 'rgba(239, 68, 68, 0.9)',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '0.2rem 0.55rem',
                        color: '#FFF',
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                      }}
                      title="Toggle live webcam for PHC / Patient side"
                    >
                      {(phcCamActive && ((isDoctorUser && mirrorBothScreens && localStream) || (!isDoctorUser && localStream) || (isCallConnected && isDoctorUser && remoteStream)) && videoActive) ? <Video size={11} /> : <VideoOff size={11} />}
                      {(phcCamActive && ((isDoctorUser && mirrorBothScreens && localStream) || (!isDoctorUser && localStream) || (isCallConnected && isDoctorUser && remoteStream)) && videoActive) ? 'PHC Cam: LIVE' : 'Cam Standby'}
                    </button>
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
                    color: '#FFFFFF',
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>
                        {session.patient_name} ({session.patient_age}y)
                      </div>
                      <div style={{ fontSize: '0.66rem', color: '#94A3B8' }}>
                        With PHC Staff Nurse & Medical Officer • {session.phc_name}
                      </div>
                    </div>
                    {/* Live Audio activity wave for PHC */}
                    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                      <span style={{ width: '3px', height: '12px', background: '#10B981', borderRadius: '2px', animation: 'pulse 0.9s infinite' }} />
                      <span style={{ width: '3px', height: '18px', background: '#10B981', borderRadius: '2px', animation: 'pulse 1.1s infinite' }} />
                      <span style={{ width: '3px', height: '9px', background: '#10B981', borderRadius: '2px', animation: 'pulse 0.7s infinite' }} />
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
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #1E3A8A'
                }}>
                  {/* Remote WebRTC peer stream (if PHC is watching remote Doctor) */}
                  {isCallConnected && !isDoctorUser && remoteStream ? (
                    <video
                      ref={(el) => bindVideoNode(el, remoteStream, false, false)}
                      autoPlay
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : ((isDoctorUser || mirrorBothScreens) && localStream && doctorCamActive && videoActive) ? (
                    /* Real Live Webcam Feed for Doctor (mirrored self-view) */
                    <video
                      ref={(el) => bindVideoNode(el, localStream, true, true)}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: 'scaleX(-1)'
                      }}
                    />
                  ) : (
                    /* Fallback Doctor Face Feed with Turn On Cam Option */
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <img
                        src="/assets/doctor_face_feed.jpg"
                        alt="Dr. Priya Sundaram - Specialist Oncologist"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.8)' }}
                      />
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.65)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                        textAlign: 'center'
                      }}>
                        <div style={{
                          background: 'rgba(15, 23, 42, 0.95)',
                          border: '1px solid #38BDF8',
                          borderRadius: '12px',
                          padding: '0.85rem 1.15rem',
                          color: '#E2E8F0',
                          maxWidth: '92%',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                        }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 800, color: '#38BDF8', marginBottom: '0.3rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#38BDF8', animation: 'pulse 1s infinite' }} />
                            Specialist Doctor Camera Standby
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                            {isDoctorUser
                              ? 'Turn on your webcam to display your face to the patient.'
                              : 'Waiting for Specialist Doctor (Dr. Priya Sundaram) to join the tele-hub.'}
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {isDoctorUser ? (
                              <button
                                type="button"
                                onClick={startLocalCamera}
                                className="btn btn-primary"
                                style={{ minHeight: '30px', padding: '0.3rem 0.75rem', fontSize: '0.74rem', gap: '5px' }}
                              >
                                <Video size={13} /> {cameraLoading ? 'Starting Camera...' : '🎥 Turn ON Doctor Webcam'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setMirrorBothScreens(true)}
                                className="btn btn-primary"
                                style={{ minHeight: '28px', padding: '0.25rem 0.65rem', fontSize: '0.72rem', gap: '4px' }}
                                title="Display your live webcam here for single PC testing"
                              >
                                <Users size={12} /> 👥 Mirror Webcam Here
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

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
                    gap: '4px',
                    zIndex: 2
                  }}>
                    <Stethoscope size={12} />
                    SPECIALIST DOCTOR ENDPOINT
                  </div>

                  {/* Top-Right Pill: Doctor Camera Status & Quick Toggle */}
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    zIndex: 3
                  }}>
                    <button
                      type="button"
                      onClick={toggleDoctorCamera}
                      style={{
                        background: (doctorCamActive && ((isDoctorUser && localStream) || (!isDoctorUser && mirrorBothScreens && localStream) || (isCallConnected && !isDoctorUser && remoteStream)) && videoActive)
                          ? 'rgba(56, 189, 248, 0.9)'
                          : 'rgba(239, 68, 68, 0.9)',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '0.2rem 0.55rem',
                        color: '#FFF',
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                      }}
                      title="Toggle live webcam for Doctor side"
                    >
                      {(doctorCamActive && ((isDoctorUser && localStream) || (!isDoctorUser && mirrorBothScreens && localStream) || (isCallConnected && !isDoctorUser && remoteStream)) && videoActive) ? <Video size={11} /> : <VideoOff size={11} />}
                      {(doctorCamActive && ((isDoctorUser && localStream) || (!isDoctorUser && mirrorBothScreens && localStream) || (isCallConnected && !isDoctorUser && remoteStream)) && videoActive) ? 'Doctor Cam: LIVE' : 'Cam Standby'}
                    </button>
                  </div>

                  {/* Audio wave pulse and doctor info at bottom */}
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
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    zIndex: 2
                  }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>
                        {session.doctor_name || 'Dr. Priya Sundaram'}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: '#93C5FD' }}>
                        Specialist Oncologist • Hub Online
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                      <span style={{ width: '3px', height: '14px', background: '#38BDF8', borderRadius: '2px', animation: 'pulse 1s infinite' }} />
                      <span style={{ width: '3px', height: '20px', background: '#38BDF8', borderRadius: '2px', animation: 'pulse 1.2s infinite' }} />
                      <span style={{ width: '3px', height: '10px', background: '#38BDF8', borderRadius: '2px', animation: 'pulse 0.8s infinite' }} />
                      <span style={{ width: '3px', height: '16px', background: '#38BDF8', borderRadius: '2px', animation: 'pulse 1.1s infinite' }} />
                    </div>
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
                {isCallConnected && remoteStream ? (
                  <video
                    ref={(el) => bindVideoNode(el, remoteStream, false, false)}
                    autoPlay
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <img
                    src={isDoctorUser ? "/assets/patient_face_feed.jpg" : "/assets/doctor_face_feed.jpg"}
                    alt="Remote Participant Face"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}

                {/* PiP Inset (Local Participant) */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  width: '160px',
                  aspectRatio: '4/3',
                  background: '#0B132B',
                  borderRadius: '10px',
                  border: '2px solid #38BDF8',
                  boxShadow: 'var(--shadow-md)',
                  overflow: 'hidden',
                  zIndex: 10
                }}>
                  {localStream && videoActive ? (
                    <video
                      ref={(el) => bindVideoNode(el, localStream, true, true)}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: 'scaleX(-1)'
                      }}
                    />
                  ) : (
                    <img
                      src={isDoctorUser ? "/assets/doctor_face_feed.jpg" : "/assets/patient_face_feed.jpg"}
                      alt="Local Face Feed"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                  <div style={{
                    position: 'absolute',
                    bottom: '4px',
                    left: '6px',
                    background: 'rgba(0,0,0,0.6)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.62rem',
                    color: '#FFFFFF',
                    fontWeight: 600
                  }}>
                    {isDoctorUser ? 'You (Doctor)' : 'You (PHC)'}
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
                  color: '#FFFFFF',
                  zIndex: 2
                }}>
                  {isDoctorUser
                    ? `${session.patient_name} in presence of Medical Staff • ${session.phc_name}`
                    : `${session.doctor_name || 'Dr. Priya Sundaram'} • Specialist Oncologist`}
                </div>
              </div>
            )}

            {/* Video Controls Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.65rem',
              paddingTop: '0.75rem'
            }}>
              {/* Webcam Restart / Allow Button if error or not yet active */}
              {(!localStream || cameraError) && (
                <button
                  type="button"
                  onClick={startLocalCamera}
                  style={{
                    background: '#0D9488',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '0.35rem 0.85rem',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(13, 148, 136, 0.4)'
                  }}
                  title="Click to allow and turn on your camera"
                >
                  <Video size={14} />
                  {cameraLoading ? 'Starting Cam...' : '🎥 Turn ON Webcam'}
                </button>
              )}

              {/* PHC / Patient Webcam Toggle */}
              <button
                type="button"
                onClick={togglePhcCamera}
                style={{
                  background: phcCamActive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.2)',
                  border: `1px solid ${phcCamActive ? '#10B981' : '#EF4444'}`,
                  borderRadius: '20px',
                  padding: '0.35rem 0.85rem',
                  color: phcCamActive ? '#6EE7B7' : '#FCA5A5',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700
                }}
                title="Turn on/off webcam for PHC and patient"
              >
                {phcCamActive ? <Video size={14} /> : <VideoOff size={14} />}
                PHC Cam: {phcCamActive ? 'ON' : 'OFF'}
              </button>

              {/* Doctor Webcam Toggle */}
              <button
                type="button"
                onClick={toggleDoctorCamera}
                style={{
                  background: doctorCamActive ? 'rgba(56, 189, 248, 0.25)' : 'rgba(239, 68, 68, 0.2)',
                  border: `1px solid ${doctorCamActive ? '#38BDF8' : '#EF4444'}`,
                  borderRadius: '20px',
                  padding: '0.35rem 0.85rem',
                  color: doctorCamActive ? '#7DD3FC' : '#FCA5A5',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700
                }}
                title="Turn on/off webcam for Doctor"
              >
                {doctorCamActive ? <Video size={14} /> : <VideoOff size={14} />}
                Doctor Cam: {doctorCamActive ? 'ON' : 'OFF'}
              </button>

              {/* Dual Test Mirror Toggle */}
              <button
                type="button"
                onClick={() => setMirrorBothScreens(!mirrorBothScreens)}
                style={{
                  background: mirrorBothScreens ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.15)',
                  border: `1px solid ${mirrorBothScreens ? '#10B981' : 'rgba(255,255,255,0.2)'}`,
                  borderRadius: '20px',
                  padding: '0.35rem 0.85rem',
                  color: mirrorBothScreens ? '#6EE7B7' : '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700
                }}
                title="Mirror your camera across both screens for single-PC simulation"
              >
                <Users size={14} />
                {mirrorBothScreens ? '👥 Dual Cam Test: ON' : '👥 Dual Test Mirror'}
              </button>

              {/* Audio Microphone Mute Toggle */}
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

              {/* Grid / PiP Toggle */}
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

              {/* Connect Mobile Camera QR Modal Button */}
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '0.35rem 0.85rem',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700
                }}
                title="Connect mobile phone camera via QR code"
              >
                <Smartphone size={14} />
                Connect Mobile Cam
              </button>

              {/* Open in 2nd Window Test Button */}
              <button
                type="button"
                onClick={() => window.open(localJoinUrl, '_blank')}
                style={{
                  background: 'rgba(2, 132, 199, 0.25)',
                  border: '1px solid #0284C7',
                  borderRadius: '20px',
                  padding: '0.35rem 0.85rem',
                  color: '#7DD3FC',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700
                }}
                title="Open 2nd window on this PC to test 2-way WebRTC"
              >
                <ExternalLink size={14} />
                2nd Window Test
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

              {/* Google MedGemma 1.5 4B & MoHFW RAG Clinical Assessment */}
              {loadingMytra ? (
                <div style={{ padding: '0.85rem', textAlign: 'center', color: '#0F766E', fontSize: '0.8rem' }}>
                  <Sparkles size={14} className="spin" style={{ marginRight: '6px' }} />
                  Loading Google MedGemma 1.5 4B clinical assessment...
                </div>
              ) : mytraAssessment ? (
                <div style={{
                  background: 'linear-gradient(180deg, #F0FDFA 0%, #FFFFFF 100%)',
                  border: '1px solid #99F6E4',
                  borderRadius: '10px',
                  padding: '1rem',
                  marginTop: '0.85rem',
                  boxShadow: '0 2px 8px rgba(13, 148, 136, 0.08)'
                }}>
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={16} color="#0D9488" />
                      <strong style={{ fontSize: '0.88rem', color: '#0F766E' }}>
                        Google MedGemma 1.5 4B Clinical Assessment
                      </strong>
                      <span style={{ fontSize: '0.68rem', background: '#0D9488', color: '#FFF', padding: '0.12rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                        LOCAL PRIVATE AI
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyAiToNotes}
                      style={{
                        background: '#0F766E',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Copy MedGemma observations into Doctor Clinical Findings textarea"
                    >
                      <Copy size={12} /> Copy Findings to Notes
                    </button>
                  </div>

                  {/* Subsite & Metric Badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                    {session.screening_details.oral_site && (
                      <span style={{ fontSize: '0.72rem', background: '#CCFBF1', color: '#115E59', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                        Site: {session.screening_details.oral_site.replace('_', ' ')}
                      </span>
                    )}
                    {session.screening_details.lesion_type && (
                      <span style={{ fontSize: '0.72rem', background: '#FEF3C7', color: '#92400E', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                        Presentation: {session.screening_details.lesion_type.replace('_', ' ')}
                      </span>
                    )}
                    {session.screening_details.mouth_opening_mm && (
                      <span style={{
                        fontSize: '0.72rem',
                        background: session.screening_details.mouth_opening_mm < 35 ? '#FEE2E2' : '#DCFCE7',
                        color: session.screening_details.mouth_opening_mm < 35 ? '#991B1B' : '#166534',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: 700
                      }}>
                        Mouth Opening: {session.screening_details.mouth_opening_mm} mm {session.screening_details.mouth_opening_mm < 35 ? '(Restricted)' : '(Normal)'}
                      </span>
                    )}
                    {mytraAssessment.urgency && (
                      <span style={{
                        fontSize: '0.72rem',
                        background: mytraAssessment.urgency === 'urgent_care' ? '#FEE2E2' : '#FEF3C7',
                        color: mytraAssessment.urgency === 'urgent_care' ? '#991B1B' : '#92400E',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>
                        Urgency: {mytraAssessment.urgency.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  {/* Visible Observations */}
                  {mytraAssessment.visible_observations && mytraAssessment.visible_observations.length > 0 && (
                    <div style={{ marginBottom: '0.65rem' }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        Section B: Observable Visual Features:
                      </span>
                      <ul style={{ margin: '0.3rem 0 0 1rem', padding: 0, fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>
                        {mytraAssessment.visible_observations.map((obs: string, idx: number) => (
                          <li key={idx} style={{ marginBottom: '0.2rem' }}>{obs}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Possible Explanations / Differentials */}
                  {mytraAssessment.possible_explanations && mytraAssessment.possible_explanations.length > 0 && (
                    <div style={{ marginBottom: '0.65rem' }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        Section C: Clinical Differentials & Evidence:
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.35rem' }}>
                        {mytraAssessment.possible_explanations.map((exp: any, idx: number) => (
                          <div key={idx} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '0.45rem 0.65rem' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#0F766E' }}>
                              • {exp.name}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.15rem', lineHeight: 1.35 }}>
                              {exp.reasoning}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Safety Guardrail Notice */}
                  <div style={{
                    background: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    borderRadius: '6px',
                    padding: '0.45rem 0.65rem',
                    fontSize: '0.72rem',
                    color: '#92400E',
                    marginTop: '0.5rem'
                  }}>
                    🛡️ <strong>Clinical Safety Mandate:</strong> This MedGemma analysis is preliminary and non-diagnostic. Photographs cannot confirm or exclude malignancy. Specialist in-person clinical physical examination and formal biopsy are mandatory.
                  </div>
                </div>
              ) : session.screening_details.ai_analysis ? (
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
              ) : null}
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

      {/* Mobile Cam & QR Code Live Video Join Modal */}
      {showInviteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="card" style={{
            maxWidth: '560px',
            width: '100%',
            padding: '1.75rem',
            background: '#0B132B',
            border: '1px solid #1E293B',
            color: '#FFFFFF',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            borderRadius: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF'
                }}>
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#F8FAFC' }}>
                    Connect Mobile / Web Camera
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                    Live 2-Way Video Call • Room: <span style={{ color: '#38BDF8', fontWeight: 700 }}>{roomId}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(180px, 200px) 1fr',
              gap: '1.25rem',
              alignItems: 'center',
              background: '#0F172A',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid #1E293B',
              marginBottom: '1.25rem'
            }}>
              {/* QR Code Container */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  background: '#FFFFFF',
                  padding: '8px',
                  borderRadius: '10px',
                  display: 'inline-block',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mobileJoinUrl)}`}
                    alt="Mobile Call QR Code"
                    style={{ width: '180px', height: '180px', display: 'block' }}
                  />
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '0.4rem', fontWeight: 600 }}>
                  Scan with Phone Camera
                </div>
              </div>

              {/* Steps / Explanation */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38BDF8', marginBottom: '0.5rem' }}>
                  Quick 2-Way Connection:
                </div>
                <ol style={{ fontSize: '0.75rem', color: '#CBD5E1', paddingLeft: '1.2rem', margin: 0, lineHeight: 1.6 }}>
                  <li>Open the <strong>Camera app</strong> on your mobile phone.</li>
                  <li>Scan the QR code to open the instant video bridge.</li>
                  <li>Tap <strong>"Join Live Video Call"</strong> and allow camera/mic.</li>
                  <li>Both laptop and phone will immediately stream video & audio peer-to-peer!</li>
                </ol>

                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #334155' }}>
                  <button
                    type="button"
                    onClick={() => {
                      window.open(localJoinUrl, '_blank');
                      setShowInviteModal(false);
                    }}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <ExternalLink size={14} /> Open in 2nd Browser Window Now
                  </button>
                  <div style={{ fontSize: '0.66rem', color: '#94A3B8', textAlign: 'center', marginTop: '0.35rem' }}>
                    Instant 2-way call testing on this same laptop
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Link Copy Boxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.25rem' }}>
                  📱 Mobile Wi-Fi Direct Join Link:
                </div>
                <div style={{
                  display: 'flex',
                  background: '#0F172A',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  <input
                    type="text"
                    readOnly
                    value={mobileJoinUrl}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      color: '#6EE7B7',
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.74rem',
                      fontFamily: 'monospace',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(mobileJoinUrl);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    style={{
                      background: copiedLink ? '#059669' : '#1E293B',
                      border: 'none',
                      color: '#FFF',
                      padding: '0.45rem 0.85rem',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                    {copiedLink ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowInviteModal(false)}
                style={{ minHeight: '34px', padding: '0.35rem 1rem', fontSize: '0.8rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
