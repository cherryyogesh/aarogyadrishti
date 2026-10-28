import React, { useState, useEffect, useRef } from 'react';
import {
  Video, VideoOff, Mic, MicOff, RefreshCw, PhoneOff,
  Stethoscope, Building, ShieldCheck, Check, Sparkles, Volume2
} from 'lucide-react';
import { AarogyaLogo } from '../../components/AarogyaLogo';

interface Props {
  roomId: string;
  onLeave: () => void;
}

export const MobileCallJoinView: React.FC<Props> = ({ roomId, onLeave }) => {
  const [callerName, setCallerName] = useState('Patient / Mobile Guest');
  const [hasJoined, setHasJoined] = useState(false);
  const [videoActive, setVideoActive] = useState(true);
  const [audioActive, setAudioActive] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [connected, setConnected] = useState(false);
  const [peerCount, setPeerCount] = useState(1);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const RTC_CONFIG: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  // 1. Initialize local mobile/laptop camera
  const startCamera = async (mode: 'user' | 'environment') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: { ideal: mode } },
          audio: true
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: { ideal: mode } },
          audio: false
        });
      }

      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(console.error);
      }

      // If peer connection already exists, replace video track
      if (peerConnectionRef.current) {
        const videoTrack = stream.getVideoTracks()[0];
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender && videoTrack) {
          videoSender.replaceTrack(videoTrack);
        }
      }
      setCameraError(null);
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError(err.message || 'Could not access device camera');
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  // 2. Connect to WebRTC signaling server
  const handleJoinCall = () => {
    setHasJoined(true);
    const host = window.location.hostname;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${host}:8000/api/v1/webrtc/ws/${roomId}`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to WebRTC signaling server for room:', roomId);
    };

    ws.onmessage = async (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'peer_count') {
          setPeerCount(msg.count);
          // If we were already in the room and someone joined, initiate offer
          if (msg.count >= 2 && !peerConnectionRef.current && !msg.is_new_joiner) {
            initPeerConnection(true);
          }
        } else if (msg.type === 'peer_disconnected') {
          setConnected(false);
          setPeerCount(msg.count || 1);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
        } else if (msg.type === 'offer') {
          const pc = initPeerConnection(false);
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: 'answer', sdp: answer }));
        } else if (msg.type === 'answer') {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          }
        } else if (msg.type === 'candidate') {
          if (peerConnectionRef.current && msg.candidate) {
            try {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
            } catch (e) {
              console.warn('ICE candidate error:', e);
            }
          }
        }
      } catch (err) {
        console.error('Signaling message error:', err);
      }
    };
  };

  const initPeerConnection = (isInitiator: boolean): RTCPeerConnection => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = pc;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, streamRef.current!);
      });
    }

    pc.ontrack = (event) => {
      console.log('Mobile view: received remote track:', event.streams);
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(console.error);
      }
      setConnected(true);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'candidate',
          candidate: event.candidate
        }));
      }
    };

    if (isInitiator) {
      pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true })
        .then(async (offer) => {
          await pc.setLocalDescription(offer);
          socketRef.current?.send(JSON.stringify({ type: 'offer', sdp: offer }));
        })
        .catch(console.error);
    }

    return pc;
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(t => t.enabled = !videoActive);
    }
    setVideoActive(!videoActive);
  };

  const toggleMic = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => t.enabled = !audioActive);
    }
    setAudioActive(!audioActive);
  };

  const flipCamera = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    startCamera(next);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B132B',
      color: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      padding: '0.75rem'
    }}>
      {/* Top Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 0.75rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '0.75rem'
      }}>
        <AarogyaLogo size="small" lightText={true} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            background: connected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            border: `1px solid ${connected ? '#10B981' : '#F59E0B'}`,
            padding: '0.2rem 0.5rem',
            borderRadius: '16px',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: connected ? '#6EE7B7' : '#FDE68A',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: connected ? '#10B981' : '#F59E0B',
              animation: 'pulse 1s infinite'
            }} />
            {connected ? 'LIVE 2-WAY CONNECTED' : (hasJoined ? 'WAITING FOR DOCTOR...' : 'PREVIEW READY')}
          </div>
          <button
            onClick={onLeave}
            style={{
              background: '#EF4444',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              padding: '0.35rem 0.75rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Leave
          </button>
        </div>
      </header>

      {/* Main Video Area */}
      {!hasJoined ? (
        /* Pre-Join Screen */
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '520px',
          margin: '0 auto',
          width: '100%',
          textAlign: 'center',
          padding: '1rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            📱 Connect Live Mobile / Web Camera
          </h2>
          <p style={{ fontSize: '0.84rem', color: '#94A3B8', marginBottom: '1.25rem' }}>
            Room: <strong style={{ color: '#38BDF8' }}>{roomId}</strong>. You are about to join the live video conference with the doctor.
          </p>

          {/* Self-preview box */}
          <div style={{
            width: '100%',
            maxWidth: '420px',
            aspectRatio: '4/3',
            background: '#0F172A',
            borderRadius: '16px',
            overflow: 'hidden',
            position: 'relative',
            border: '2px solid #0D9488',
            marginBottom: '1.5rem',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
          }}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {cameraError && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(15, 23, 42, 0.85)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem', color: '#EF4444', fontSize: '0.85rem'
              }}>
                {cameraError}
              </div>
            )}
            <div style={{
              position: 'absolute', bottom: '8px', left: '8px',
              background: 'rgba(0,0,0,0.65)', padding: '0.2rem 0.6rem',
              borderRadius: '6px', fontSize: '0.72rem', color: '#FFFFFF'
            }}>
              Your Camera ({facingMode === 'user' ? 'Front' : 'Rear'})
            </div>
            <button
              type="button"
              onClick={flipCamera}
              style={{
                position: 'absolute', top: '8px', right: '8px',
                background: 'rgba(0,0,0,0.65)', border: 'none',
                borderRadius: '50%', width: '36px', height: '36px',
                color: '#FFFFFF', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}
              title="Flip camera"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleJoinCall}
            style={{
              width: '100%',
              maxWidth: '360px',
              padding: '0.9rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 15px rgba(13, 148, 136, 0.4)'
            }}
          >
            <Video size={20} /> Join Live Video Call Now
          </button>
        </div>
      ) : (
        /* In-Call Active 2-Way View */
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: window.innerWidth > 768 ? '1fr 1fr' : '1fr',
          gap: '0.75rem',
          position: 'relative'
        }}>
          {/* Main Remote Feed (Doctor on Laptop) */}
          <div style={{
            background: '#0F172A',
            borderRadius: '16px',
            overflow: 'hidden',
            position: 'relative',
            aspectRatio: '4/3',
            border: '2px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: connected ? 'block' : 'none'
              }}
            />

            {!connected && (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <img
                  src="/assets/doctor_face_feed.jpg"
                  alt="Doctor Hub"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.8)' }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(11, 19, 43, 0.65)',
                  padding: '1rem', textAlign: 'center'
                }}>
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    backgroundColor: '#F59E0B', animation: 'pulse 1s infinite',
                    marginBottom: '0.5rem'
                  }} />
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FDE68A' }}>
                    Connecting to Doctor...
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                    WebRTC peer connection in progress
                  </div>
                </div>
              </div>
            )}

            <div style={{
              position: 'absolute', top: '8px', left: '8px',
              background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)',
              padding: '0.2rem 0.6rem', borderRadius: '6px',
              fontSize: '0.72rem', color: '#38BDF8', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '4px'
            }}>
              <Stethoscope size={13} />
              DR. PRIYA SUNDARAM (ONCOLOGIST)
            </div>
          </div>

          {/* Local Feed (Self Camera) */}
          <div style={{
            background: '#0F172A',
            borderRadius: '16px',
            overflow: 'hidden',
            position: 'relative',
            aspectRatio: '4/3',
            border: '2px solid #0D9488',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
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
              <div style={{ color: '#94A3B8', textAlign: 'center' }}>
                <VideoOff size={36} style={{ margin: '0 auto 0.4rem', opacity: 0.6 }} />
                <div>Your Camera is Paused</div>
              </div>
            )}

            <div style={{
              position: 'absolute', top: '8px', left: '8px',
              background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)',
              padding: '0.2rem 0.6rem', borderRadius: '6px',
              fontSize: '0.72rem', color: '#6EE7B7', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '4px'
            }}>
              <Building size={13} />
              YOUR CAMERA (MOBILE / LAPTOP)
            </div>

            <button
              type="button"
              onClick={flipCamera}
              style={{
                position: 'absolute', top: '8px', right: '8px',
                background: 'rgba(0,0,0,0.65)', border: 'none',
                borderRadius: '50%', width: '36px', height: '36px',
                color: '#FFFFFF', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}
              title="Flip camera"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Control Bar */}
      {hasJoined && (
        <footer style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          padding: '0.75rem 0',
          marginTop: '0.5rem'
        }}>
          <button
            type="button"
            onClick={toggleCamera}
            style={{
              background: videoActive ? 'rgba(255,255,255,0.15)' : '#EF4444',
              border: 'none', borderRadius: '50%', width: '48px', height: '48px',
              color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title={videoActive ? 'Turn Camera Off' : 'Turn Camera On'}
          >
            {videoActive ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          <button
            type="button"
            onClick={toggleMic}
            style={{
              background: audioActive ? 'rgba(255,255,255,0.15)' : '#EF4444',
              border: 'none', borderRadius: '50%', width: '48px', height: '48px',
              color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title={audioActive ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {audioActive ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          <button
            type="button"
            onClick={flipCamera}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none', borderRadius: '50%', width: '48px', height: '48px',
              color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title="Flip to Front/Rear Camera"
          >
            <RefreshCw size={20} />
          </button>

          <button
            type="button"
            onClick={onLeave}
            style={{
              background: '#EF4444',
              border: 'none', borderRadius: '24px', padding: '0 1.25rem', height: '48px',
              color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
              fontWeight: 700, fontSize: '0.88rem'
            }}
          >
            <PhoneOff size={18} /> End Call
          </button>
        </footer>
      )}
    </div>
  );
};
