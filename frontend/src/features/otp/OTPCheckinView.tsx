import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, User } from '../../types';
import { KeyRound, CheckCircle2, AlertCircle, Clock, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
  user: User;
  onCheckinSuccess?: () => void;
}

export const OTPCheckinView: React.FC<Props> = ({ currentLang, user, onCheckinSuccess }) => {
  const t = translations[currentLang] || translations.en;
  const [patientIdInput, setPatientIdInput] = useState('AD-10022');
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
      setRequestError(err.message || 'Failed to request OTP');
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
      setVerifyError(err.message || 'OTP verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{ maxWidth: '620px', margin: '1rem auto' }}>
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
        <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '0.25rem' }}>
          Cryptographic patient arrival authentication into live doctor waiting queue.
        </p>
      </div>

      {verifiedSuccess ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '50%',
            backgroundColor: '#DCFCE7', color: '#166534',
            margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <CheckCircle2 size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
            {t.otp_success_msg}
          </h3>
          <p style={{ fontSize: '0.88rem', color: '#475569', marginTop: '0.4rem' }}>
            Patient <strong>{patientName}</strong> is verified and currently in the Doctor Waiting Queue.
          </p>

          <div style={{
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '8px',
            padding: '1rem',
            margin: '1.5rem 0',
            fontSize: '0.82rem',
            color: '#1E40AF',
            textAlign: 'left'
          }}>
            ✓ Status updated to <strong>Waiting for Doctor</strong><br />
            ✓ Check-in timestamp and audit event recorded in database<br />
            ✓ Doctor queue synchronized in real-time
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
            Check In Another Patient
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: '2rem' }}>
          {requestError && (
            <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              {requestError}
            </div>
          )}

          {!otpDispatched ? (
            <form onSubmit={handleRequestOtp}>
              <div className="form-group">
                <label className="form-label">{t.otp_enter_pid} *</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}
                  required
                  placeholder="e.g. AD-10022"
                  value={patientIdInput}
                  onChange={(e) => setPatientIdInput(e.target.value)}
                />
              </div>

              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '0.85rem',
                marginBottom: '1.5rem',
                fontSize: '0.8rem',
                color: '#64748B'
              }}>
                <ShieldCheck size={16} style={{ verticalAlign: 'middle', marginRight: '6px', color: 'var(--teal-primary)' }} />
                Server will verify active appointment, generate a salted cryptographic 6-digit token, and send SMS to the registered mobile.
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', fontSize: '0.95rem' }}
                disabled={requesting}
              >
                {requesting ? 'Checking Appointment & Sending OTP...' : t.otp_request_btn}
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
                <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.95rem' }}>
                  OTP Dispatched to {patientName}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#15803D', marginTop: '0.2rem' }}>
                  Mobile: <strong>{maskedPhone}</strong> • Valid for 5 minutes.
                </div>

                {/* Synthetic Dev Mode Badge */}
                {devOtpPreview && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.6rem',
                    background: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    color: '#92400E'
                  }}>
                    [Synthetic Dev Mode] Test verification code: <strong style={{ letterSpacing: '0.15em', fontSize: '1rem' }}>{devOtpPreview}</strong>
                  </div>
                )}
              </div>

              {verifyError && (
                <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {verifyError}
                </div>
              )}

              <form onSubmit={handleVerifyOtp}>
                <div className="form-group">
                  <label className="form-label">Enter 6-Digit Verification Code *</label>
                  <input
                    type="text"
                    maxLength={6}
                    className="form-control"
                    style={{
                      fontSize: '1.5rem',
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
                  style={{ width: '100%', fontSize: '0.95rem', marginBottom: '1rem' }}
                  disabled={verifying || enteredOtp.length !== 6}
                >
                  {verifying ? 'Verifying with Database...' : t.otp_verify_btn}
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minHeight: '34px', fontSize: '0.78rem' }}
                    onClick={() => {
                      setOtpDispatched(false);
                      setEnteredOtp('');
                    }}
                  >
                    Change Patient ID
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minHeight: '34px', fontSize: '0.78rem' }}
                    disabled={cooldown > 0}
                    onClick={handleRequestOtp}
                  >
                    <RefreshCw size={12} />
                    {cooldown > 0 ? `${t.otp_resend_cooldown} ${cooldown}s` : 'Resend Code'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
