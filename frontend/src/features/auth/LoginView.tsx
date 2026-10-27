import React, { useState } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, User } from '../../types';
import { Shield, UserCheck, Stethoscope, Activity, FileText, CheckCircle2 } from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
  onLoginSuccess: (user: User) => void;
}

const DEMO_ACCOUNTS = [
  { role: 'chw', email: 'chw@aarogya.gov.in', pass: 'ChwPass@2026', label: 'Sarala Devi (ASHA / CHW)', icon: UserCheck, color: '#0369A1' },
  { role: 'phc_staff', email: 'mo@aarogya.gov.in', pass: 'MoPass@2026', label: 'Dr. Ramesh Babu (PHC Medical Officer)', icon: Stethoscope, color: '#15803D' },
  { role: 'doctor', email: 'doctor@aarogya.gov.in', pass: 'DocPass@2026', label: 'Dr. Priya (Tele-Dermatologist)', icon: Activity, color: '#7E22CE' },
  { role: 'navigator', email: 'navigator@aarogya.gov.in', pass: 'NavPass@2026', label: 'Vijay Krishna (Patient Navigator)', icon: FileText, color: '#B45309' },
  { role: 'admin', email: 'admin@aarogya.gov.in', pass: 'AdminPass@2026', label: 'District Admin (DMHO)', icon: Shield, color: '#BE123C' },
];

export const LoginView: React.FC<Props> = ({ currentLang, onLoginSuccess }) => {
  const t = translations[currentLang] || translations.en;
  const [identifier, setIdentifier] = useState('chw@aarogya.gov.in');
  const [password, setPassword] = useState('ChwPass@2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.login(identifier, password);
      const user = await api.getMe();
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setIdentifier(acc.email);
    setPassword(acc.pass);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0A192F 0%, #0B1E38 50%, #0F2A4A 100%)',
      padding: '1.5rem',
      position: 'relative'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '2.5rem 2rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            margin: '0 auto 1rem',
            background: 'linear-gradient(135deg, #0D9488, #06B6D4)',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: '1.6rem',
            fontWeight: 800,
            boxShadow: '0 8px 16px rgba(13, 148, 136, 0.35)'
          }}>
            ఆ
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            {t.login_title}
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '0.35rem' }}>
            {t.login_subtitle}
          </p>
        </div>

        {error && (
          <div style={{
            background: '#FEE2E2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '1.25rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t.login_username}</label>
            <input
              type="text"
              className="form-control"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">{t.login_password}</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', fontSize: '0.95rem', padding: '0.75rem' }}
          >
            {loading ? 'Authenticating...' : t.login_submit}
          </button>
        </form>

        <div style={{ marginTop: '2rem', borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem' }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.75rem' }}>
            {t.login_demo_hint}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {DEMO_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              const isSelected = identifier === acc.email;
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectDemo(acc)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.85rem',
                    borderRadius: '8px',
                    border: `1px solid ${isSelected ? acc.color : '#E2E8F0'}`,
                    background: isSelected ? `${acc.color}10` : '#F8FAFC',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <Icon size={16} color={acc.color} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E293B' }}>{acc.label}</span>
                  </div>
                  {isSelected && <CheckCircle2 size={16} color={acc.color} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
