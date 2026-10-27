import React, { useState } from 'react';
import { api } from '../../services/api';
import { translations, LANGUAGES } from '../../i18n/translations';
import { LanguageCode, User } from '../../types';
import { Shield, UserCheck, Stethoscope, Activity, FileText, CheckCircle2, Globe } from 'lucide-react';
import { AarogyaLogo } from '../../components/AarogyaLogo';

interface Props {
  currentLang: LanguageCode;
  onLoginSuccess: (user: User) => void;
  onLanguageChange?: (lang: LanguageCode) => void;
}

const DEMO_ACCOUNTS = [
  {
    role: 'chw',
    email: 'chw@aarogya.gov.in',
    pass: 'ChwPass@2026',
    labelEn: 'ASHA / Village Health Worker (CHW)',
    labelTe: 'ఆశా / విలేజ్ హెల్త్ వర్కర్ (ASHA / CHW)',
    subtitleEn: 'Field registration, visual screening & patient follow-up',
    subtitleTe: 'గ్రామస్థాయి నమోదు, నోటి స్క్రీనింగ్ & ఫాలోఅప్',
    icon: UserCheck,
    color: '#0D9488'
  },
  {
    role: 'phc_staff',
    email: 'mo@aarogya.gov.in',
    pass: 'PhcPass@2026',
    labelEn: 'PHC Staff / Medical Officer (MO)',
    labelTe: 'PHC స్టాఫ్ / మెడికల్ ఆఫీసర్ (PHC Staff / MO)',
    subtitleEn: 'Clinical review, AI override, appointments & OTP check-in',
    subtitleTe: 'కేసుల సమీక్ష, AI ఓవర్‌రైడ్, అపాయింట్‌మెంట్లు & OTP చెక్-ఇన్',
    icon: Stethoscope,
    color: '#15803D'
  },
  {
    role: 'doctor',
    email: 'doctor@aarogya.gov.in',
    pass: 'DocPass@2026',
    labelEn: 'Specialist Doctor (Oral Oncologist)',
    labelTe: 'స్పెషలిస్ట్ డాక్టర్ / ఆంకాలజిస్ట్ (Doctor / Specialist)',
    subtitleEn: 'Live waiting queue, teleconsultation & biopsy evaluation',
    subtitleTe: 'ప్రత్యక్ష వెయిటింగ్ క్యూ, టెలికన్సల్టేషన్ & బయాప్సీ పరిశీలన',
    icon: Activity,
    color: '#7E22CE'
  },
  {
    role: 'navigator',
    email: 'navigator@aarogya.gov.in',
    pass: 'NavPass@2026',
    labelEn: 'Patient Navigator (Tribal Care Escort)',
    labelTe: 'పేషెంట్ నావిగేటర్ (Patient Navigator)',
    subtitleEn: '108 Feeder Ambulance transport & adherence coordination',
    subtitleTe: '108 ఫీడర్ అంబులెన్స్ రవాణా & హాస్పిటల్ సహాయం',
    icon: FileText,
    color: '#B45309'
  },
  {
    role: 'admin',
    email: 'admin@aarogya.gov.in',
    pass: 'AdminPass@2026',
    labelEn: 'DMHO (District Medical & Health Officer)',
    labelTe: 'DMHO (డిస్ట్రిక్ట్ మెడికల్ & హెల్త్ ఆఫీసర్)',
    subtitleEn: 'Mandal-level screening analytics & system audit trail',
    subtitleTe: 'మండలాల వారీగా స్క్రీనింగ్ నివేదికలు & భద్రతా ఆడిట్',
    icon: Shield,
    color: '#BE123C'
  },
];

export const LoginView: React.FC<Props> = ({ currentLang, onLoginSuccess, onLanguageChange }) => {
  const t = translations[currentLang] || translations.en;
  const isTe = currentLang === 'te';

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
      setError(err.message || (isTe ? 'లాగిన్ విఫలమైంది. దయచేసి వివరాలు సరిచూసుకోండి.' : 'Authentication failed. Please check credentials.'));
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
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #0B2545 0%, #0A192F 50%, #030712 100%)',
      padding: '1.5rem',
      position: 'relative'
    }}>
      {/* Top Bar with Language Selector */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(8px)',
        padding: '0.35rem 0.75rem',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.15)'
      }}>
        <Globe size={15} color="#5EEAD4" />
        <select
          value={currentLang}
          onChange={(e) => onLanguageChange && onLanguageChange(e.target.value as LanguageCode)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#F8FAFC',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code} style={{ background: '#0F172A', color: '#F8FAFC' }}>
              {l.nativeName} ({l.label})
            </option>
          ))}
        </select>
      </div>

      {/* Main Login Card */}
      <div style={{
        maxWidth: '520px',
        width: '100%',
        background: '#FFFFFF',
        borderRadius: '20px',
        padding: '2.5rem 2rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        {/* Header Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <AarogyaLogo size="large" lightText={false} showSubtitle={true} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            {t.login_title}
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '0.35rem' }}>
            {t.login_subtitle}
          </p>
        </div>

        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #F87171',
            color: '#991B1B',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
              {t.login_username}
            </label>
            <input
              type="text"
              className="form-control"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. chw@aarogya.gov.in"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
              {t.login_password}
            </label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              fontSize: '0.98rem',
              fontWeight: 700,
              padding: '0.8rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
              border: 'none',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)'
            }}
          >
            {loading ? (isTe ? 'ప్రాసెస్ అవుతోంది...' : 'Authenticating...') : t.login_submit}
          </button>
        </form>

        {/* Role-Based Quick Demo Account Selector (No Personal Names) */}
        <div style={{ marginTop: '1.85rem', borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>🔑</span>
            <span>{t.login_demo_hint}</span>
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {DEMO_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              const isSelected = identifier === acc.email;
              const label = isTe ? acc.labelTe : acc.labelEn;
              const sub = isTe ? acc.subtitleTe : acc.subtitleEn;

              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectDemo(acc)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.9rem',
                    borderRadius: '10px',
                    border: `1.5px solid ${isSelected ? acc.color : '#E2E8F0'}`,
                    background: isSelected ? `${acc.color}12` : '#F8FAFC',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: `${acc.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Icon size={17} color={acc.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isSelected ? acc.color : '#1E293B' }}>
                        {label}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.1rem' }}>
                        {sub}
                      </div>
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 size={18} color={acc.color} style={{ flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
