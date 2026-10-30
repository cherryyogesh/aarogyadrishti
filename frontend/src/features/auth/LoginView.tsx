import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { translations, LANGUAGES } from '../../i18n/translations';
import { LanguageCode, User, UserRole } from '../../types';
import {
  CheckCircle2, Globe, UserPlus, LogIn, Phone,
  KeyRound, ArrowLeft, ShieldCheck, RefreshCw
} from 'lucide-react';
import { AarogyaLogo } from '../../components/AarogyaLogo';
import { ASR_DISTRICT_MANDALS } from '../../constants/mandals';

interface Props {
  currentLang: LanguageCode;
  onLoginSuccess: (user: User) => void;
  onLanguageChange?: (lang: LanguageCode) => void;
}

const MANDALS_LIST: string[] = ASR_DISTRICT_MANDALS.map(m => m.name);

const PHC_CENTRES_MAP: Record<string, string> = {
  'Ananthagiri': 'Ananthagiri Primary Health Centre',
  'Araku Valley': 'Araku Valley Area Hospital',
  'Chinthapalli': 'Chinthapalli Community Health Centre',
  'Chintapalli': 'Chinthapalli Community Health Centre',
  'Dumbriguda': 'Dumbriguda Primary Health Centre',
  'G. Madugula (Gangaraju Madugula)': 'G. Madugula Primary Health Centre',
  'G. Madugula': 'G. Madugula Primary Health Centre',
  'G.K Veedhi (Gudem Kotha Veedhi)': 'G.K Veedhi Primary Health Centre',
  'G.K Veedhi': 'G.K Veedhi Primary Health Centre',
  'Hukumpeta': 'Hukumpeta Primary Health Centre',
  'Koyyuru': 'Koyyuru Primary Health Centre',
  'Munchangiputtu': 'Munchangiputtu Primary Health Centre',
  'Paderu (Headquarters)': 'Paderu Community Health Centre / Area Hospital',
  'Paderu': 'Paderu Community Health Centre / Area Hospital',
  'Pedhabayalu': 'Pedhabayalu Primary Health Centre'
};

export const LoginView: React.FC<Props> = ({ currentLang, onLoginSuccess, onLanguageChange }) => {
  const t = translations[currentLang] || translations.en;
  const tr = (teText: string, enText: string, hiText: string) => {
    if (currentLang === 'te') return teText;
    if (currentLang === 'hi') return hiText;
    return enText;
  };

  // Mode: 'login' | 'register' | 'forgot_password'
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password'>('login');

  // Sign In State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Register State
  const [regFullName, setRegFullName] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('chw');
  const [regPhone, setRegPhone] = useState('');
  const [regMandal, setRegMandal] = useState(MANDALS_LIST[0]);
  const [regPhcName, setRegPhcName] = useState(PHC_CENTRES_MAP[MANDALS_LIST[0]]);
  const [regDistrict, setRegDistrict] = useState('Alluri Sitharama Raju');
  const [regState, setRegState] = useState('Andhra Pradesh');
  const [regPassword, setRegPassword] = useState('');

  // Forgot Password State
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'request_otp' | 'verify_reset'>('request_otp');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

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
    } else if (newRole === 'admin') {
      if (!regPhcName || regPhcName.includes('Primary Health Centre')) {
        setRegPhcName('District Medical & Health Office (DM&HO), Alluri Sitharama Raju');
      }
    } else {
      setRegPhcName(PHC_CENTRES_MAP[regMandal] || `${regMandal} Primary Health Centre`);
    }
  };

  const getFacilityFieldConfig = (role: UserRole) => {
    switch (role) {
      case 'doctor':
        return {
          label: tr('ఆసుపత్రి / మెడికల్ ఇన్స్టిట్యూట్ / క్లినిక్ పేరు', 'Hospital / Medical Centre / Department', 'अस्पताल / चिकित्सा केंद्र / विभाग का नाम'),
          placeholder: tr('ఉదా: డిస్ట్రిక్ట్ హాస్పిటల్ పాడేరు / ఏరియా హాస్పిటల్ / స్పెషాలిటీ క్లినిక్', 'e.g. District Hospital Paderu / Area Hospital / Specialist Medical Centre', 'उदा: जिला अस्पताल पाडेरू / एरिया अस्पताल / विशेषज्ञ क्लिनिक'),
          hint: tr('వైద్యులు సంప్రదింపులు అందించే ఆసుపత్రి లేదా క్లినిక్ (నోరు, కన్ను, చెవి, చర్మం తదితర విభాగాలు)', 'Hospital, Area Hospital, or Clinic where you practice (Mouth, Ear, Eyes, Skin, etc.)', 'अस्पताल, एरिया अस्पताल या क्लिनिक जहां आप परामर्श देते हैं (मुख, कान, आंख, त्वचा आदि)'),
          icon: '🏥'
        };
      case 'admin':
        return {
          label: tr('జిల్లా వైద్య & ఆరోగ్య కార్యాలయం (DM&HO Directorate)', 'District Health Office / Administrative Directorate', 'जिला चिकित्सा एवं स्वास्थ्य कार्यालय (DM&HO निदेशालय)'),
          placeholder: tr('ఉదా: జిల్లా వైద్య & ఆరోగ్య కార్యాలయం (DM&HO), అల్లూరి సీతారామరాజు జిల్లా', 'e.g. District Medical & Health Office (DM&HO), Alluri Sitharama Raju District', 'उदा: जिला चिकित्सा एवं स्वास्थ्य कार्यालय (DM&HO), अल्लूरी सीताराम राजू जिला'),
          hint: tr('జిల్లా ముఖ్య ఆరోగ్య పరిపాలనా కార్యాలయం', 'District health administration headquarters', 'जिला मुख्य स्वास्थ्य प्रशासनिक कार्यालय'),
          icon: '🏛️'
        };
      case 'phc_staff':
      case 'chw':
      default:
        return {
          label: tr('పీహెచ్‌సీ కేంద్రం (Primary Health Centre)', 'Primary Health Centre (PHC)', 'प्राथमिक स्वास्थ्य केंद्र (PHC)'),
          placeholder: tr('ఉదా: జి. మాడుగుల ప్రాథమిక ఆరోగ్య కేంద్రం', 'e.g. G. Madugula Primary Health Centre', 'उदा: जी. माडुगुला प्राथमिक स्वास्थ्य केंद्र'),
          hint: tr('గ్రామ స్క్రీనింగ్ & ప్రాథమిక సేవల కోసం కేటాయించిన పీహెచ్‌సీ', 'Assigned PHC centre for community health screening & local care', 'सामुदायिक स्क्रीनिंग और प्राथमिक सेवाओं के लिए निर्धारित PHC'),
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
      setError(err.message || t.login_failed || tr('లాగిన్ విఫలమైంది. దయచేసి వివరాలు సరిచూసుకోండి.', 'Authentication failed. Please check credentials.', 'लॉगिन विफल रहा। कृपया क्रेडेंशियल जांचें।'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!regFullName.trim()) {
      setError(t.reg_name_req || tr('దయచేసి పూర్తి పేరు నమోదు చేయండి.', 'Please enter full name.', 'कृपया पूरा नाम दर्ज करें।'));
      return;
    }
    if (!regPhone.trim() || regPhone.replace(/\D/g, '').length < 10) {
      setError(t.reg_phone_req || tr('దయచేసి సరైన 10 అంకెల మొబైల్ నంబరు నమోదు చేయండి.', 'Please enter a valid 10-digit mobile number.', 'कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें।'));
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      setError(t.reg_pwd_req || tr('పాస్‌వర్డ్ కనీసం 4 అక్షరాలు ఉండాలి.', 'Password must be at least 4 characters.', 'पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।'));
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
      setSuccessMsg((t.reg_success || tr('నమోదు విజయవంతమైంది! స్వాగతం, ', 'Registration successful! Welcome, ', 'पंजीकरण सफल रहा! स्वागत है, ')) + user.full_name);
      setTimeout(() => {
        onLoginSuccess(user);
      }, 500);
    } catch (err: any) {
      setError(err.message || t.reg_failed || tr('నమోదు విఫలమైంది. దయచేసి వివరాలు సరిచూసుకోండి.', 'Registration failed. Please check details.', 'पंजीकरण विफल रहा। कृपया विवरण जांचें।'));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    const cleanPhone = forgotPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError(t.reg_phone_req || tr('దయచేసి సరైన 10 అంకెల మొబైల్ నంబరు నమోదు చేయండి.', 'Please enter a valid 10-digit mobile number.', 'कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें।'));
      return;
    }

    setLoading(true);
    try {
      const res = await api.requestForgotPasswordOtp(forgotPhone.trim());
      setMaskedPhone(res.masked_phone);
      setCooldown(res.cooldown_seconds || 45);
      setForgotStep('verify_reset');
      setSuccessMsg(tr(
        `OTP మీ రిజిస్టర్డ్ మొబైల్ ${res.masked_phone} కు పంపబడింది. దయచేసి SMS తనిఖీ చేయండి.`,
        `OTP has been sent to your registered mobile ${res.masked_phone}. Please check your SMS.`,
        `ओटीपी आपके पंजीकृत मोबाइल ${res.masked_phone} पर भेजा गया है। कृपया अपना एसएमएस देखें।`
      ));
    } catch (err: any) {
      setError(err.message || tr('OTP పంపడంలో సమస్య ఎదురైంది. మొబైల్ నంబరు సరిచూసుకోండి.', 'Failed to send OTP. Please check mobile number.', 'ओटीपी भेजने में विफल रहा। कृपया फोन नंबर जांचें।'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanOtp = forgotOtp.trim();
    if (cleanOtp.length !== 6) {
      setError(tr('దయచేసి సరైన 6 అంకెల OTP కోడ్ నమోదు చేయండి.', 'Please enter the valid 6-digit OTP code.', 'कृपया सही 6 अंकों का ओटीपी कोड दर्ज करें।'));
      return;
    }

    if (!forgotNewPassword || forgotNewPassword.length < 4) {
      setError(t.pwd_min_length || tr('పాస్‌వర్డ్ కనీసం 4 అక్షరాలు ఉండాలి.', 'Password must be at least 4 characters long.', 'पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।'));
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setError(t.pwd_mismatch || tr('కొత్త పాస్‌వర్డ్ మరియు కన్ఫర్మ్ పాస్‌వర్డ్ సరిపోలడం లేదు.', 'New password and confirm password do not match.', 'नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते।'));
      return;
    }

    setLoading(true);
    try {
      await api.resetForgotPassword(
        forgotPhone.trim(),
        cleanOtp,
        forgotNewPassword,
        forgotConfirmPassword
      );
      setSuccessMsg(t.pwd_reset_success || tr('పాస్‌వర్డ్ విజయవంతంగా మార్చబడింది! కొత్త పాస్‌వర్డ్‌తో లాగిన్ అవ్వండి.', 'Password reset successfully! Please sign in with your new password.', 'पासवर्ड सफलतापूर्वक रीसेट हो गया! कृपया अपने नए पासवर्ड से लॉगिन करें।'));
      // Pre-fill login identifier with phone number
      setIdentifier(forgotPhone.trim());
      setPassword('');
      setForgotOtp('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setForgotStep('request_otp');
      setAuthMode('login');
    } catch (err: any) {
      setError(err.message || tr('పాస్‌వర్డ్ రీసెట్ విఫలమైంది. దయచేసి వివరాలు సరిచూసుకోండి.', 'Password reset failed. Please check OTP and details.', 'पासवर्ड रीसेट विफल रहा। कृपया विवरण जांचें।'));
    } finally {
      setLoading(false);
    }
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
        border: '1px solid rgba(255, 255, 255, 0.15)',
        zIndex: 10
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

        {/* Tab Switcher: Sign In vs Register (only when not in forgot_password mode) */}
        {authMode !== 'forgot_password' && (
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
              <span>{t.tab_employee_signin || tr('ఉద్యోగుల లాగిన్', 'Employee Sign In', 'कर्मचारी लॉगिन')}</span>
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
              <span>{t.tab_employee_register || tr('నూతన సిబ్బంది నమోదు', 'New Staff Register', 'नया स्टाफ पंजीकरण')}</span>
            </button>
          </div>
        )}

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
                  {t.field_mobile_number || tr('మొబైల్ నంబరు లేదా ఈమెయిల్', 'Mobile Number or Email', 'मोबाइल नंबर या आधिकारिक ईमेल')}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-control"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={t.login_mobile_placeholder || tr('ఉదా: 9848011001 లేదా chw@aarogya.gov.in', 'e.g. 9848011001 or chw@aarogya.gov.in', 'उदा: 9848011001 या chw@aarogya.gov.in')}
                    required
                  />
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem' }}>
                  {t.login_mobile_hint || tr('రిజిస్టర్ చేసుకున్న మొబైల్ నంబరు లేదా అధికారిక ఈమెయిల్‌తో లాగిన్ అవ్వండి.', 'Sign in using your 10-digit registered mobile number or email.', 'अपने 10 अंकों के पंजीकृत मोबाइल नंबर या ईमेल से लॉगिन करें।')}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    {t.login_password}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot_password');
                      setError(null);
                      setSuccessMsg(null);
                      if (identifier && identifier.replace(/\D/g, '').length >= 10) {
                        setForgotPhone(identifier);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0D9488',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                  >
                    {t.link_forgot_password || tr('పాస్‌వర్డ్ మర్చిపోయారా?', 'Forgot Password?', 'पासवर्ड भूल गए?')}
                  </button>
                </div>
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
                {loading ? (t.login_authenticating || tr('ప్రాసెస్ అవుతోంది...', 'Authenticating...', 'प्रमाणित हो रहा है...')) : (t.login_submit || tr('లాగిన్ అవ్వండి', 'Sign In to Portal', 'लॉगिन करें'))}
              </button>

              {/* Forgot Password bottom shortcut */}
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('forgot_password');
                    setError(null);
                    setSuccessMsg(null);
                    if (identifier && identifier.replace(/\D/g, '').length >= 10) {
                      setForgotPhone(identifier);
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0F766E',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <KeyRound size={15} />
                  <span>{t.link_forgot_password || tr('పాస్‌వర్డ్ మర్చిపోయారా? (Forgot Password)', 'Forgot Password?', 'पासवर्ड भूल गए?')}</span>
                </button>
              </div>
            </form>
          </div>
        ) : authMode === 'register' ? (
          /* -------------------- REGISTRATION MODE -------------------- */
          <div>
            <form onSubmit={handleRegisterSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                {/* Full Name */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                    {(t.field_full_name || tr('పూర్తి పేరు', 'Employee Full Name', 'कर्मचारी का पूरा नाम'))} *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder={tr('ఉదా: కె. అనసూయ / డా. కె. రావు', 'e.g. Anasuya Devi / Dr. K. Rao', 'उदा: अनसूया देवी / डॉ. के. राव')}
                    required
                  />
                </div>

                {/* Role */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                    {(t.field_role || tr('అధికారిక హోదా', 'Official Role', 'आधिकारिक पद'))} *
                  </label>
                  <select
                    className="form-control"
                    value={regRole}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    required
                  >
                    <option value="chw">{t.role_chw}</option>
                    <option value="phc_staff">{t.role_phc_staff}</option>
                    <option value="doctor">{t.role_doctor}</option>
                    <option value="admin">{t.role_admin}</option>
                  </select>
                </div>

                {/* Mobile Number */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                    {(t.field_mobile_number || tr('మొబైల్ నంబరు', 'Mobile Number', 'मोबाइल नंबर'))} *
                  </label>
                  <input
                    type="tel"
                    className="form-control"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder={tr('ఉదా: 98490 12345', 'e.g. 98490 12345', 'उदा: 98490 12345')}
                    required
                  />
                </div>

                {/* Mandal (11 Mandals in Ascending Order A-Z) */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                    {(t.field_mandal || tr('మండలం', 'Mandal', 'मंडल'))} *
                  </label>
                  <select
                    className="form-control"
                    value={regMandal}
                    onChange={(e) => handleMandalChange(e.target.value)}
                    required
                  >
                    {ASR_DISTRICT_MANDALS.map((m) => (
                      <option key={m.id} value={m.name}>
                        {currentLang === 'te' ? `${m.nameTe} (${m.name})` : currentLang === 'hi' ? `${m.nameHi} (${m.name})` : m.name}
                      </option>
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
                    {t.field_district || tr('జిల్లా', 'District', 'ज़िला')}
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
                    {t.field_state || tr('రాష్ట్రం', 'State', 'राज्य')}
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
                    {(t.field_password || tr('లాగిన్ పాస్‌వర్డ్', 'Create Password', 'लॉगिन पासवर्ड'))} *
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
                  ? (t.reg_submitting || tr('నమోదు అవుతోంది...', 'Registering Employee...', 'पंजीकरण हो रहा है...'))
                  : (t.btn_register_submit || tr('నమోదు చేసి లాగిన్ అవ్వండి', 'Register Employee & Sign In', 'पंजीकरण करें और लॉगिन करें'))}
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
                  {t.already_have_account || tr('ఇప్పటికే ఖాతా ఉందా? లాగిన్ అవ్వండి', 'Already have an account? Sign In', 'क्या आपके पास पहले से खाता है? लॉगिन करें')}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* -------------------- FORGOT PASSWORD MODE -------------------- */
          <div>
            {/* Back to Sign In Link */}
            <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setError(null);
                  setSuccessMsg(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'none',
                  border: 'none',
                  color: '#0D9488',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <ArrowLeft size={16} />
                <span>{t.back_to_login || tr('తిరిగి లాగిన్‌కి వెళ్లండి', 'Back to Sign In', 'वापस लॉगिन पर जाएं')}</span>
              </button>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.6rem',
                borderRadius: '20px',
                background: '#F0FDFA',
                color: '#0F766E',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                <ShieldCheck size={14} />
                <span>{tr('సురక్షిత OTP ధృవీకరణ', 'Secure OTP Verification', 'सुरक्षित ओटीपी सत्यापन')}</span>
              </div>
            </div>

            {/* Header Icon & Title */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem auto',
                boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)'
              }}>
                <KeyRound size={24} color="#FFFFFF" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', margin: '0 0 0.35rem 0' }}>
                {t.forgot_pwd_title || tr('పాస్‌వర్డ్ రీసెట్', 'Reset Password', 'पासवर्ड रीसेट करें')}
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                {forgotStep === 'request_otp'
                  ? (t.forgot_step1_instruction || tr('మీ అధికారిక మొబైల్ నంబరును నమోదు చేసి OTPని పొందండి.', 'Enter your registered mobile number to receive a verification OTP.', 'सत्यापन ओटीपी प्राप्त करने के लिए अपना पंजीकृत मोबाइल नंबर दर्ज करें।'))
                  : (t.forgot_step2_instruction || tr('మీ మొబైల్‌కు పంపిన 6 అంకెల OTP మరియు కొత్త పాస్‌వర్డ్‌ను నమోదు చేయండి.', 'Enter the 6-digit OTP sent to your mobile and your new password.', 'अपने मोबाइल पर भेजा गया 6 अंकों का ओटीपी और नया पासवर्ड दर्ज करें।'))
                }
              </p>
            </div>

            {/* Step 1: Request OTP */}
            {forgotStep === 'request_otp' ? (
              <form onSubmit={handleRequestOtp}>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                    {t.patient_phone || tr('రిజిస్టర్డ్ మొబైల్ నంబర్', 'Registered Mobile Number', 'पंजीकृत मोबाइल नंबर')} *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="tel"
                      className="form-control"
                      value={forgotPhone}
                      onChange={(e) => setForgotPhone(e.target.value)}
                      placeholder={tr('ఉదా: 9848011001', 'e.g. 9848011001', 'उदा: 9848011001')}
                      autoFocus
                      required
                    />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.35rem' }}>
                    {tr(
                      'మీ ఆరోగ్య దృష్టి ఖాతాకు అనుసంధానించబడిన 10 అంకెల మొబైల్ నంబరును నమోదు చేయండి.',
                      'Enter the 10-digit mobile number linked with your healthcare account.',
                      'अपने स्वास्थ्य देखभाल खाते से जुड़ा 10 अंकों का मोबाइल नंबर दर्ज करें।'
                    )}
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
                    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Phone size={17} />
                  <span>{loading ? (t.btn_sending_otp || tr('OTP పంపబడుతోంది...', 'Sending OTP...', 'ओटीपी भेजा जा रहा है...')) : (t.btn_send_otp || tr('OTP పంపండి', 'Send OTP', 'ओटीपी भेजें'))}</span>
                </button>
              </form>
            ) : (
              /* Step 2: Enter OTP, New Password & Confirm Password */
              <form onSubmit={handleResetPassword}>
                {/* OTP Code Input */}
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                      {t.field_otp_code || tr('6 అంకెల OTP కోడ్', '6-Digit OTP Code', '6 अंकों का ओटीपी कोड')} *
                    </label>
                    <button
                      type="button"
                      disabled={cooldown > 0 || loading}
                      onClick={() => handleRequestOtp()}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: cooldown > 0 ? '#94A3B8' : '#0D9488',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <RefreshCw size={12} />
                      <span>
                        {cooldown > 0
                          ? `${t.btn_resend_otp || 'Resend OTP'} (${cooldown}s)`
                          : (t.btn_resend_otp || 'Resend OTP')}
                      </span>
                    </button>
                  </div>
                  <input
                    type="text"
                    className="form-control"
                    value={forgotOtp}
                    maxLength={6}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    style={{
                      textAlign: 'center',
                      letterSpacing: '0.35em',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      fontFamily: 'monospace'
                    }}
                    autoFocus
                    required
                  />
                </div>

                {/* New Password */}
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                    {t.field_new_password || tr('కొత్త పాస్‌వర్డ్', 'New Password', 'नया पासवर्ड')} *
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                {/* Confirm New Password */}
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                    {t.field_confirm_password || tr('పాస్‌వర్డ్ మళ్లీ నమోదు చేయండి', 'Confirm New Password', 'नया पासवर्ड पुनः दर्ज करें')} *
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  {forgotNewPassword && forgotConfirmPassword && forgotNewPassword !== forgotConfirmPassword && (
                    <span style={{ fontSize: '0.74rem', color: '#DC2626', marginTop: '0.25rem', display: 'block' }}>
                      ⚠️ {t.pwd_mismatch || tr('పాస్‌వర్డ్‌లు సరిపోలడం లేదు.', 'Passwords do not match.', 'पासवर्ड मेल नहीं खाते।')}
                    </span>
                  )}
                  {forgotNewPassword && forgotConfirmPassword && forgotNewPassword === forgotConfirmPassword && (
                    <span style={{ fontSize: '0.74rem', color: '#16A34A', marginTop: '0.25rem', display: 'block' }}>
                      ✓ {tr('పాస్‌వర్డ్‌లు సరిపోలాయి.', 'Passwords match.', 'पासवर्ड मेल खाते हैं।')}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || (forgotNewPassword !== forgotConfirmPassword && forgotConfirmPassword.length > 0)}
                  style={{
                    width: '100%',
                    fontSize: '0.98rem',
                    fontWeight: 700,
                    padding: '0.8rem',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <CheckCircle2 size={17} />
                  <span>
                    {loading
                      ? (t.btn_verifying_saving || tr('ధృవీకరించి సేవ్ చేస్తోంది...', 'Verifying & Saving...', 'सत्यापित और सहेजा जा रहा है...'))
                      : (t.btn_verify_reset_pwd || tr('OTP ధృవీకరించి పాస్‌వర్డ్ సేవ్ చేయండి', 'Verify OTP & Save New Password', 'ओटीपी सत्यापित करें और नया पासवर्ड सहेजें'))}
                  </span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
