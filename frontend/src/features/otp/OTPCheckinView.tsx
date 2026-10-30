import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, User } from '../../types';
import { KeyRound, CheckCircle2, AlertCircle, Clock, ShieldCheck, ArrowRight, RefreshCw, UserCheck } from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
  user: User;
  onCheckinSuccess?: () => void;
}

export const OTPCheckinView: React.FC<Props> = ({ currentLang, user, onCheckinSuccess }) => {
  const t = translations[currentLang] || translations.en;
  const isTe = currentLang === 'te';
  const isHi = currentLang === 'hi';
  const tr = (teText: string, enText: string, hiText: string) => {
    if (currentLang === 'te') return teText;
    if (currentLang === 'hi') return hiText;
    return enText;
  };

  const [patientIdInput, setPatientIdInput] = useState('AD-ASR-10492');
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // OTP State
  const [otpDispatched, setOtpDispatched] = useState(false);
  const [appointmentId, setAppointmentId] = useState<number | null>(null);
  const [patientName, setPatientName] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [devOtpPreview, setDevOtpPreview] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Verification State
  const [enteredOtp, setEnteredOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientIdInput.trim()) return;

    setRequesting(true);
    setRequestError(null);
    setVerifyError(null);
    try {
      const res = await api.requestOtp(patientIdInput.trim());
      setOtpDispatched(true);
      setAppointmentId(res.appointment_id);
      setPatientName(res.patient_name);
      setMaskedPhone(res.masked_phone);
      setCooldown(res.resend_cooldown_seconds);
      if (res.dev_otp_preview) {
        setDevOtpPreview(res.dev_otp_preview);
      }
    } catch (err: any) {
      setRequestError(err.message || tr('OTP పంపడం విఫలమైంది. అపాయింట్‌మెంట్ ఉందో లేదో సరిచూసుకోండి.', 'Failed to request OTP. Ensure patient has an active appointment today.', 'ओटीपी भेजना विफल रहा। सुनिश्चित करें कि आज मरीज का अपॉइंटमेंट सक्रिय है।'));
    } finally {
      setRequesting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentId || !enteredOtp.trim()) return;

    setVerifying(true);
    setVerifyError(null);
    try {
      await api.verifyOtp(appointmentId, enteredOtp.trim());
      setVerifiedSuccess(true);
      if (onCheckinSuccess) {
        onCheckinSuccess();
      }
    } catch (err: any) {
      setVerifyError(err.message || tr('OTP ధృవీకరణ విఫలమైంది. సరైన కోడ్ నమోదు చేయండి.', 'OTP verification failed. Check the code and try again.', 'ओटीपी सत्यापन विफल रहा। कोड जांचें और पुनः प्रयास करें।'));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '1rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <div style={{
          width: '56px',
          height: '56px',
          margin: '0 auto 1rem',
          borderRadius: '14px',
          backgroundColor: '#E0F2FE',
          color: 'var(--teal-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <KeyRound size={28} />
        </div>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800 }}>
          {t.otp_checkin_title}
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '0.35rem', lineHeight: 1.5 }}>
          {t.otp_desk_guidance}
        </p>
      </div>

      {verifiedSuccess ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            backgroundColor: '#DCFCE7', color: '#166534',
            margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <CheckCircle2 size={36} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
            {t.otp_success_msg}
          </h3>

          {/* Prominent Present and Not Absent Green Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #065F46 0%, #047857 100%)',
            border: '2px solid #10B981',
            borderRadius: '12px',
            padding: '1.25rem',
            margin: '1.5rem 0',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '1rem',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
              <UserCheck size={22} color="#A7F3D0" />
              <span>{t.otp_patient_present_banner}</span>
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#D1FAE5', marginTop: '0.4rem' }}>
              {isTe
                ? `రోగి: ${patientName} • స్థితి: లైవ్ డాక్టర్ వెయిటింగ్ క్యూలో చేర్చబడ్డారు (హాజరు నిరూపితం)`
                : `Patient: ${patientName} • Status: Added to live doctor queue. Marked physically present at PHC clinic.`}
            </div>
          </div>

          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '1rem',
            margin: '1rem 0 1.5rem',
            fontSize: '0.82rem',
            color: '#334155',
            textAlign: 'left',
            lineHeight: 1.6
          }}>
            ✓ {tr('అపాయింట్‌మెంట్ స్థితి: డాక్టర్ కోసం వేచి ఉన్నారు (Waiting for Doctor)', 'Appointment status: Waiting for Doctor', 'अपॉइंटमेंट स्थिति: डॉक्टर की प्रतीक्षा कर रहे हैं (Waiting for Doctor)')}<br />
            ✓ {tr('హాజరు సమయం డేటాబేస్ ఆడిట్ లాగ్‌లో రికార్డ్ చేయబడింది', 'Arrival timestamp logged with salted SHA-256 OTP confirmation', 'आगमन का समय डेटाबेस ऑडिट लॉग में सुरक्षित दर्ज किया गया')}<br />
            ✓ {tr('డాక్టర్ క్యూ తక్షణమే అప్‌డేట్ చేయబడింది — రోగి గైర్హాజరు కాదు', 'Doctor consultation queue synchronized in real-time — patient is present and waiting', 'डॉक्टर परामर्श कतार तुरंत अपडेट हुई — मरीज उपस्थित है')}
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              setVerifiedSuccess(false);
              setOtpDispatched(false);
              setEnteredOtp('');
              setDevOtpPreview(null);
            }}
          >
            {tr('మరొక రోగి హాజరును నమోదు చేయండి', 'Check In Another Patient', 'अन्य मरीज का चेक-इन करें')}
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: '2rem' }}>
          {requestError && (
            <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              ⚠️ {requestError}
            </div>
          )}

          {!otpDispatched ? (
            <form onSubmit={handleRequestOtp}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>{t.otp_enter_pid} *</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, fontSize: '1.05rem' }}
                  required
                  placeholder="e.g. AD-ASR-10492"
                  value={patientIdInput}
                  onChange={(e) => setPatientIdInput(e.target.value)}
                />
              </div>

              {/* Quick Fill Demo Patient Badge */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                  {tr('త్వరిత ఎంపిక (డెమో రోగి):', 'Quick demo patient:', 'त्वरित चयन (डेमो मरीज):')}
                </span>
                <button
                  type="button"
                  onClick={() => setPatientIdInput('AD-ASR-10492')}
                  style={{
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '4px',
                    padding: '0.15rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#0F766E',
                    cursor: 'pointer'
                  }}
                >
                  AD-ASR-10492 (Ramu Somulu - G. Madugula)
                </button>
              </div>

              <div style={{
                background: '#F0FDFA',
                border: '1px solid #CCFBF1',
                borderRadius: '8px',
                padding: '0.85rem',
                marginBottom: '1.5rem',
                fontSize: '0.82rem',
                color: '#0F766E',
                lineHeight: 1.45
              }}>
                <ShieldCheck size={16} style={{ verticalAlign: 'middle', marginRight: '6px', color: '#0D9488' }} />
                {isTe
                  ? 'సిస్టమ్ నేటి క్రియాశీల అపాయింట్‌మెంట్‌ను తనిఖీ చేసి, రోగి రిజిస్టర్డ్ మొబైల్‌కు 6-అంకెల సురక్షిత OTPని పంపుతుంది.'
                  : 'The system verifies today’s appointment, generates a cryptographically salted 6-digit OTP, and delivers it to the patient’s registered mobile.'}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', fontSize: '0.98rem', fontWeight: 700, padding: '0.75rem' }}
                disabled={requesting}
              >
                {requesting ? tr('అపాయింట్‌మెంట్ తనిఖీ చేసి OTP పంపుతోంది...', 'Verifying Appointment & Sending OTP...', 'अपॉइंटमेंट जांचकर ओटीपी भेजा जा रहा है...') : t.otp_request_btn}
              </button>
            </form>
          ) : (
            <div>
              <div style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ fontWeight: 700, color: '#166534', fontSize: '1rem' }}>
                  {tr(`OTP పంపబడింది: ${patientName}`, `OTP Dispatched to ${patientName}`, `ओटीपी भेजा गया: ${patientName}`)}
                </div>
                <div style={{ fontSize: '0.84rem', color: '#15803D', marginTop: '0.25rem' }}>
                  {tr('మొబైల్:', 'Mobile:', 'मोबाइल:')} <strong>{maskedPhone}</strong> • {tr('చెల్లుబాటు: 5 నిమిషాలు', 'Valid for 5 minutes.', 'वैधता: 5 मिनट')}
                </div>

                {/* Synthetic Dev Mode Badge */}
                {devOtpPreview && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.65rem',
                    background: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    color: '#92400E'
                  }}>
                    [Synthetic Demo Mode] SMS OTP: <strong style={{ letterSpacing: '0.15em', fontSize: '1.1rem' }}>{devOtpPreview}</strong>
                  </div>
                )}
              </div>

              {verifyError && (
                <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  ⚠️ {verifyError}
                </div>
              )}

              <form onSubmit={handleVerifyOtp}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    {tr('రోగి ఫోన్‌కు వచ్చిన 6-అంకెల OTP నమోదు చేయండి *', 'Enter 6-Digit OTP Received by Patient *', 'रोगी के फोन पर प्राप्त 6-अंकों का ओटीपी दर्ज करें *')}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    className="form-control"
                    style={{
                      fontSize: '1.6rem',
                      fontWeight: 800,
                      letterSpacing: '0.35em',
                      textAlign: 'center',
                      color: 'var(--teal-primary)'
                    }}
                    required
                    placeholder="______"
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', fontSize: '0.98rem', fontWeight: 700, padding: '0.75rem', marginBottom: '1rem' }}
                  disabled={verifying || enteredOtp.length !== 6}
                >
                  {verifying ? tr('ధృవీకరిస్తోంది...', 'Verifying OTP...', 'सत्यापित हो रहा है...') : t.otp_verify_btn}
                </button>
              </form>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => {
                    setOtpDispatched(false);
                    setEnteredOtp('');
                  }}
                  style={{ color: '#64748B' }}
                >
                  ← {tr('పేషెంట్ ID మార్చండి', 'Change Patient ID', 'रोगी आईडी बदलें')}
                </button>

                {cooldown > 0 ? (
                  <span style={{ color: '#94A3B8' }}>
                    {t.otp_resend_cooldown} {cooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn-link"
                    onClick={handleRequestOtp}
                    disabled={requesting}
                    style={{ color: 'var(--teal-primary)', fontWeight: 600 }}
                  >
                    <RefreshCw size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    {tr('మళ్లీ OTP పంపండి', 'Resend OTP', 'ओटीपी पुनः भेजें')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
