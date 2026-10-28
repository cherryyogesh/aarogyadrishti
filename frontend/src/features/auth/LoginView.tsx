import React, { useState } from 'react';
import { api } from '../../services/api';
import { translations, LANGUAGES } from '../../i18n/translations';
import { LanguageCode, User, UserRole } from '../../types';
import { Shield, UserCheck, Stethoscope, Activity, FileText, CheckCircle2, Globe, UserPlus, LogIn, Phone, Building2, MapPin } from 'lucide-react';
import { AarogyaLogo } from '../../components/AarogyaLogo';

interface Props {
  currentLang: LanguageCode;
  onLoginSuccess: (user: User) => void;
  onLanguageChange?: (lang: LanguageCode) => void;
}

const MANDALS_LIST = [
  'G. Madugula',
  'Paderu',
  'Araku Valley',
  'Chintapalli',
  'Dumbriguda',
  'Ananthagiri'
];

const PHC_CENTRES_MAP: Record<string, string> = {
  'G. Madugula': 'G. Madugula Primary Health Centre',
  'Paderu': 'Paderu Community Health Centre / Area Hospital',
  'Araku Valley': 'Araku Valley Area Hospital',
  'Chintapalli': 'Chintapalli Community Health Centre',
  'Dumbriguda': 'Dumbriguda Primary Health Centre',
  'Ananthagiri': 'Ananthagiri Primary Health Centre'
};

const DEMO_ACCOUNTS = [
  {
    role: 'chw',
    email: 'chw@aarogya.gov.in',
    phone: '9848011001',
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
    phone: '9848011002',
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
    phone: '9848011003',
    pass: 'DocPass@2026',
    labelEn: 'Doctors',
    labelTe: 'వైద్యులు (Doctors)',
    subtitleEn: 'Live waiting queue & teleconsultation for oral, ENT, eye, and skin conditions',
    subtitleTe: 'ప్రత్యక్ష వెయిటింగ్ క్యూ & నోరు, చెవి, కంటి, చర్మ సమస్యల టెలికన్సల్టేషన్',
    icon: Activity,
    color: '#7E22CE'
  },
  {
    role: 'navigator',
    email: 'navigator@aarogya.gov.in',
    phone: '9848011004',
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
    phone: '9848011005',
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

  // Mode: 'login' or 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Sign In State
  const [identifier, setIdentifier] = useState('chw@aarogya.gov.in');
  const [password, setPassword] = useState('ChwPass@2026');

  // Register State
  const [regFullName, setRegFullName] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('chw');
  const [regPhone, setRegPhone] = useState('');
  const [regMandal, setRegMandal] = useState('G. Madugula');
  const [regPhcName, setRegPhcName] = useState(PHC_CENTRES_MAP['G. Madugula']);
  const [regDistrict, setRegDistrict] = useState('Alluri Sitharama Raju');
  const [regState, setRegState] = useState('Andhra Pradesh');
  const [regPassword, setRegPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleMandalChange = (mandal: string) => {
    setRegMandal(mandal);
    if (regRole === 'chw' || regRole === 'phc_staff') {
      if (PHC_CENTRES_MAP[mandal]) {
        setRegPhcName(PHC_CENTRES_MAP[mandal]);
      } else {
        setRegPhcName(`${mandal} Primary Health Centre`);
      }
    }
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRegRole(newRole);
    if (newRole === 'doctor') {
      if (!regPhcName || regPhcName.includes('Primary Health Centre')) {
        setRegPhcName('District Hospital Paderu / Specialist Medical Centre');
      }
    } else if (newRole === 'navigator') {
      if (!regPhcName || regPhcName.includes('Primary Health Centre')) {
        setRegPhcName('ITDA Tribal Patient Navigation Cell, Paderu');
      }
    } else if (newRole === 'admin') {
      if (!regPhcName || regPhcName.includes('Primary Health Centre')) {
        setRegPhcName('District Medical & Health Office (DM&HO), Alluri Sitharama Raju');
      }
    } else {
      // chw or phc_staff
      setRegPhcName(PHC_CENTRES_MAP[regMandal] || `${regMandal} Primary Health Centre`);
    }
  };

  const getFacilityFieldConfig = (role: UserRole) => {
    switch (role) {
      case 'doctor':
        return {
          label: isTe ? 'ఆసుపత్రి / మెడికల్ ఇన్స్టిట్యూట్ / క్లినిక్ పేరు' : 'Hospital / Medical Centre / Department',
          placeholder: isTe ? 'ఉదా: డిస్ట్రిక్ట్ హాస్పిటల్ పాడేరు / ఏరియా హాస్పిటల్ / స్పెషాలిటీ క్లినిక్' : 'e.g. District Hospital Paderu / Area Hospital / Specialist Medical Centre',
          hint: isTe ? 'వైద్యులు సంప్రదింపులు అందించే ఆసుపత్రి లేదా క్లినిక్ (నోరు, కన్ను, చెవి, చర్మం తదితర విభాగాలు)' : 'Hospital, Area Hospital, or Clinic where you practice (Mouth, Ear, Eyes, Skin, etc.)',
          icon: '🏥'
        };
      case 'navigator':
        return {
          label: isTe ? 'కేటాయించిన ఆసుపత్రి / 108 రవాణా సమన్వయ కేంద్రం' : 'Assigned Hospital / Transport Coordination Hub (108 Agency)',
          placeholder: isTe ? 'ఉదా: ITDA ఏజెన్సీ హబ్ పాడేరు / ఏరియా హాస్పిటల్ ట్రాన్స్‌పోర్ట్ సెల్' : 'e.g. ITDA Agency Hub Paderu / Area Hospital Transport Cell',
          hint: isTe ? 'గిరిజన రోగుల రవాణా సహాయం & 108 ఫీడర్ అంబులెన్స్ కేంద్రం' : 'Base hospital or 108 tribal feeder transport coordination hub',
          icon: '🚑'
        };
      case 'admin':
        return {
          label: isTe ? 'జిల్లా వైద్య & ఆరోగ్య కార్యాలయం (DM&HO Directorate)' : 'District Health Office / Administrative Directorate',
          placeholder: isTe ? 'ఉదా: జిల్లా వైద్య & ఆరోగ్య కార్యాలయం (DM&HO), అల్లూరి సీతారామరాజు జిల్లా' : 'e.g. District Medical & Health Office (DM&HO), Alluri Sitharama Raju District',
          hint: isTe ? 'జిల్లా ముఖ్య ఆరోగ్య పరిపాలనా కార్యాలయం' : 'District health administration headquarters',
          icon: '🏛️'
        };
      case 'phc_staff':
      case 'chw':
      default:
        return {
          label: isTe ? 'పీహెచ్‌సీ కేంద్రం (Primary Health Centre)' : 'Primary Health Centre (PHC)',
          placeholder: isTe ? 'ఉదా: జి. మాడుగుల ప్రాథమిక ఆరోగ్య కేంద్రం' : 'e.g. G. Madugula Primary Health Centre',
          hint: isTe ? 'గ్రామ స్క్రీనింగ్ & ప్రాథమిక సేవల కోసం కేటాయించిన పీహెచ్‌సీ' : 'Assigned PHC centre for community health screening & local care',
          icon: '🩺'
        };
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!regFullName.trim()) {
      setError(isTe ? 'దయచేసి పూర్తి పేరు నమోదు చేయండి.' : 'Please enter full name.');
      return;
    }
    if (!regPhone.trim() || regPhone.replace(/\D/g, '').length < 10) {
      setError(isTe ? 'దయచేసి సరైన 10 అంకెల మొబైల్ నంబరు నమోదు చేయండి.' : 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      setError(isTe ? 'పాస్‌వర్డ్ కనీసం 4 అక్షరాలు ఉండాలి.' : 'Password must be at least 4 characters.');
      return;
    }

    setLoading(true);
    try {
      const user = await api.registerEmployee({
        full_name: regFullName.trim(),
        role: regRole,
        phone: regPhone.trim(),
        phc_name: regPhcName.trim() || `${regMandal} Primary Health Centre`,
        mandal: regMandal,
        district: regDistrict,
        state: regState,
        password: regPassword
      });
      setSuccessMsg(isTe ? `నమోదు విజయవంతమైంది! స్వాగతం, ${user.full_name}` : `Registration successful! Welcome, ${user.full_name}`);
      setTimeout(() => {
        onLoginSuccess(user);
      }, 500);
    } catch (err: any) {
      setError(err.message || (isTe ? 'నమోదు విఫలమైంది. దయచేసి వివరాలు సరిచూసుకోండి.' : 'Registration failed. Please check details.'));
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

      {/* Main Authentication Card */}
      <div style={{
        maxWidth: authMode === 'register' ? '620px' : '520px',
        width: '100%',
        background: '#FFFFFF',
        borderRadius: '20px',
        padding: '2.25rem 2rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        transition: 'max-width 0.2s ease'
      }}>
        {/* Header Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <AarogyaLogo size="large" lightText={false} showSubtitle={true} currentLang={currentLang} />
        </div>

        {/* Tab Switcher: Sign In vs Register */}
        <div style={{
          display: 'flex',
          background: '#F1F5F9',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '1.5rem'
        }}>
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setError(null); }}
            style={{
              flex: 1,
              padding: '0.65rem 0.5rem',
              borderRadius: '9px',
              border: 'none',
              background: authMode === 'login' ? '#FFFFFF' : 'transparent',
              color: authMode === 'login' ? '#0F172A' : '#64748B',
              fontWeight: authMode === 'login' ? 700 : 500,
              fontSize: '0.85rem',
              boxShadow: authMode === 'login' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              transition: 'all 0.15s ease'
            }}
          >
            <LogIn size={15} color={authMode === 'login' ? '#0D9488' : '#64748B'} />
            <span>{t.tab_employee_signin || (isTe ? 'ఉద్యోగుల లాగిన్' : 'Employee Sign In')}</span>
          </button>

          <button
            type="button"
            onClick={() => { setAuthMode('register'); setError(null); }}
            style={{
              flex: 1,
              padding: '0.65rem 0.5rem',
              borderRadius: '9px',
              border: 'none',
              background: authMode === 'register' ? '#FFFFFF' : 'transparent',
              color: authMode === 'register' ? '#0F172A' : '#64748B',
              fontWeight: authMode === 'register' ? 700 : 500,
              fontSize: '0.85rem',
              boxShadow: authMode === 'register' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              transition: 'all 0.15s ease'
            }}
          >
            <UserPlus size={15} color={authMode === 'register' ? '#0D9488' : '#64748B'} />
            <span>{t.tab_employee_register || (isTe ? 'నూతన సిబ్బంది నమోదు' : 'New Staff Register')}</span>
          </button>
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

        {successMsg && (
          <div style={{
            background: '#F0FDF4',
            border: '1px solid #86EFAC',
            color: '#166534',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <CheckCircle2 size={16} color="#166534" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* -------------------- SIGN IN MODE -------------------- */}
        {authMode === 'login' ? (
          <div>
            <form onSubmit={handleLoginSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                  {t.field_mobile_number || (isTe ? 'మొబైల్ నంబరు లేదా ఈమెయిల్' : 'Mobile Number or Email')}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-control"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={isTe ? 'ఉదా: 9848011001 లేదా chw@aarogya.gov.in' : 'e.g. 9848011001 or chw@aarogya.gov.in'}
                    required
                  />
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem' }}>
                  {isTe ? 'రిజిస్టర్ చేసుకున్న మొబైల్ నంబరు లేదా అధికారిక ఈమెయిల్‌తో లాగిన్ అవ్వండి.' : 'Sign in using your 10-digit registered mobile number or email.'}
                </div>
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

            {/* Quick Demo Selector */}
            <div style={{ marginTop: '1.85rem', borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🔑</span>
                <span>{t.login_demo_hint}</span>
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {DEMO_ACCOUNTS.map((acc) => {
                  const Icon = acc.icon;
                  const isSelected = identifier === acc.email || identifier === acc.phone;
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
                            {sub} • 📱 {acc.phone}
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
        ) : (
          /* -------------------- REGISTRATION MODE -------------------- */
          <div>
            <form onSubmit={handleRegisterSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                {/* Full Name */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                    {t.field_full_name || (isTe ? 'పూర్తి పేరు' : 'Employee Full Name')} *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Anasuya Devi / Dr. K. Rao"
                    required
                  />
                </div>

                {/* Role */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                    {t.field_role || (isTe ? 'అధికారిక హోదా' : 'Official Role')} *
                  </label>
                  <select
                    className="form-control"
                    value={regRole}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    required
                  >
                    <option value="chw">{isTe ? 'ఆశా / విలేజ్ హెల్త్ వర్కర్ (ASHA / CHW)' : 'ASHA / Village Health Worker (CHW)'}</option>
                    <option value="phc_staff">{isTe ? 'PHC స్టాఫ్ / మెడికల్ ఆఫీసర్ (PHC Staff / MO)' : 'PHC Staff / Medical Officer (MO)'}</option>
                    <option value="doctor">{isTe ? 'వైద్యులు (Doctors)' : 'Doctors'}</option>
                    <option value="navigator">{isTe ? 'పేషెంట్ నావిగేటర్ (Patient Navigator)' : 'Patient Navigator (Tribal Care)'}</option>
                    <option value="admin">{isTe ? 'DMHO (డిస్ట్రిక్ట్ మెడికల్ & హెల్త్ ఆఫీసర్)' : 'DMHO (District Medical & Health Officer)'}</option>
                  </select>
                </div>

                {/* Mobile Number */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                    {t.field_mobile_number || (isTe ? 'మొబైల్ నంబరు' : 'Mobile Number')} *
                  </label>
                  <input
                    type="tel"
                    className="form-control"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="e.g. 98490 12345"
                    required
                  />
                </div>

                {/* Mandal */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                    {t.field_mandal || (isTe ? 'మండలం' : 'Mandal')} *
                  </label>
                  <select
                    className="form-control"
                    value={regMandal}
                    onChange={(e) => handleMandalChange(e.target.value)}
                    required
                  >
                    {MANDALS_LIST.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Role-adaptive Facility / Hospital / PHC Center */}
                {(() => {
                  const facilityConfig = getFacilityFieldConfig(regRole);
                  return (
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label" style={{ fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{facilityConfig.icon}</span>
                        <span>{facilityConfig.label}</span>
                        <span style={{ color: '#DC2626' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={regPhcName}
                        onChange={(e) => setRegPhcName(e.target.value)}
                        placeholder={facilityConfig.placeholder}
                        required
                      />
                      <span style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.25rem', display: 'block' }}>
                        {facilityConfig.hint}
                      </span>
                    </div>
                  );
                })()}

                {/* District */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                    {t.field_district || (isTe ? 'జిల్లా' : 'District')}
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={regDistrict}
                    onChange={(e) => setRegDistrict(e.target.value)}
                    required
                  />
                </div>

                {/* State */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                    {t.field_state || (isTe ? 'రాష్ట్రం' : 'State')}
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={regState}
                    onChange={(e) => setRegState(e.target.value)}
                    required
                  />
                </div>

                {/* Password */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                    {t.field_password || (isTe ? 'లాగిన్ పాస్‌వర్డ్' : 'Create Password')} *
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
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
                {loading
                  ? (isTe ? 'నమోదు అవుతోంది...' : 'Registering Employee...')
                  : (t.btn_register_submit || (isTe ? 'నమోదు చేసి లాగిన్ అవ్వండి' : 'Register Employee & Sign In'))}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0D9488',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {isTe ? 'ఇప్పటికే ఖాతా ఉందా? లాగిన్ అవ్వండి' : 'Already have an account? Sign In'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
