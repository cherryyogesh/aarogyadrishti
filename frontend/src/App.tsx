import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { translations, LANGUAGES } from './i18n/translations';
import { LanguageCode, User, Screening } from './types';
import { LoginView } from './features/auth/LoginView';
import { DashboardView } from './features/dashboard/DashboardView';
import { PatientsView } from './features/patients/PatientsView';
import { ScreeningCreateView } from './features/screening/ScreeningCreateView';
import { PHCReviewView } from './features/phc/PHCReviewView';
import { AppointmentsView } from './features/appointments/AppointmentsView';
import { OTPCheckinView } from './features/otp/OTPCheckinView';
import { DoctorQueueView } from './features/doctor/DoctorQueueView';
import { ConsultationWorkspace } from './features/consultation/ConsultationWorkspace';
import { MobileCallJoinView } from './features/consultation/MobileCallJoinView';
import { ChatbotView } from './features/chatbot/ChatbotView';
import { DistrictReportsView } from './features/reports/DistrictReportsView';
import { AuditLogView } from './features/audit/AuditLogView';
import { InvestigationsView } from './features/investigations/InvestigationsView';
import { ReferralsView } from './features/referrals/ReferralsView';
import { AarogyaLogo } from './components/AarogyaLogo';

import {
  Home, Users, Bot, Calendar, FileText, Video,
  FlaskConical, Settings, LogOut, Menu, X, Bell,
  RefreshCw, CheckCircle, ChevronDown, UserCheck, KeyRound,
  Shield, AlertCircle, ArrowLeft
} from 'lucide-react';

export const App: React.FC = () => {
  const [currentLang, setCurrentLang] = useState<LanguageCode>('te');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeRoute, setActiveRoute] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('10:30 AM');
  const [syncRotating, setSyncRotating] = useState(false);

  // Cross-screen state: Pre-selected screening for appointment booking
  const [preSelectedScreening, setPreSelectedScreening] = useState<Screening | null>(null);

  // Active Telemedicine Consultation Session
  const [activeConsultation, setActiveConsultation] = useState<any | null>(null);

  // Check if URL has join_call parameter (from mobile scan or invite link)
  const [guestRoomId, setGuestRoomId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.get('join_call') || p.get('join');
    }
    return null;
  });

  const t = translations[currentLang] || translations.en;
  const tr = (teText: string, enText: string, hiText: string) => {
    if (currentLang === 'te') return teText;
    if (currentLang === 'hi') return hiText;
    return enText;
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = api.getToken();
      if (token) {
        try {
          const user = await api.getMe();
          setCurrentUser(user);
          setActiveRoute('dashboard');
        } catch (e) {
          api.setToken(null);
          setCurrentUser(null);
        }
      }
      setAuthChecking(false);
    };
    checkAuth();
  }, []);

  const handleLogout = () => {
    api.setToken(null);
    setCurrentUser(null);
    setActiveRoute('dashboard');
    setActiveConsultation(null);
  };

  const handleRefreshSync = () => {
    setSyncRotating(true);
    const now = new Date();
    const formatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    setTimeout(() => {
      setLastSyncTime(formatted);
      setSyncRotating(false);
    }, 600);
  };

  const getRoleDisplayName = (user: User) => {
    return t[`role_${user.role}`] || user.role.toUpperCase();
  };

  const getRoleShortName = (role: string) => {
    if (currentLang === 'te') {
      if (role === 'chw') return 'ఆశా కార్యకర్త';
      if (role === 'phc_staff') return 'PHC స్టాఫ్';
      if (role === 'doctor') return 'డాక్టర్';
      return 'DMHO అధికారి';
    }
    if (currentLang === 'hi') {
      if (role === 'chw') return 'आशा कार्यकर्ता';
      if (role === 'phc_staff') return 'पीएचसी स्टाफ';
      if (role === 'doctor') return 'डॉक्टर';
      return 'डीएमएचओ अधिकारी';
    }
    if (role === 'chw') return 'ASHA Worker';
    if (role === 'phc_staff') return 'PHC Staff';
    if (role === 'doctor') return 'Doctor';
    return 'DMHO Admin';
  };

  const cleanUserName = currentUser?.full_name ? currentUser.full_name.replace(/\s*\([^)]*\)\s*$/, '').trim() : 'Sarala Devi';

  // Dedicated Instant Mobile / Remote Guest Call Join
  if (guestRoomId) {
    return (
      <MobileCallJoinView
        roomId={guestRoomId}
        onLeave={() => {
          setGuestRoomId(null);
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
      />
    );
  }

  if (authChecking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#093339', color: '#5EEAD4' }}>
        <div style={{ textAlign: 'center' }}>
          <AarogyaLogo size="large" lightText={true} currentLang={currentLang} />
          <div style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '1.25rem' }}>
            {currentLang === 'te' ? 'భద్రతా నెట్‌వర్క్ లోడ్ అవుతోంది...' : currentLang === 'hi' ? 'सुरक्षित स्वास्थ्य नेटवर्क लोड हो रहा है...' : 'Loading secure tribal healthcare platform...'}
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginView
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setActiveRoute('dashboard');
        }}
      />
    );
  }

  // Active consultation workspace takes full screen
  if (activeConsultation) {
    return (
      <div className="main-wrapper" style={{ minHeight: '100vh', padding: '1.25rem' }}>
        <ConsultationWorkspace
          currentLang={currentLang}
          user={currentUser}
          session={activeConsultation}
          onClose={() => {
            setActiveConsultation(null);
            setActiveRoute('queue');
          }}
        />
      </div>
    );
  }

  const navigateTo = (route: string) => {
    setActiveRoute(route);
    setMobileMenuOpen(false);
  };

  const notificationsList = [
    {
      id: 1,
      title: tr('కొత్త రోగి స్క్రీనింగ్ అప్‌లోడ్ అయింది', 'New patient screening uploaded', 'नया रोगी स्क्रीनिंग अपलोड किया गया'),
      meta: 'G. Madugula PHC • 5m ago',
      unread: true
    },
    {
      id: 2,
      title: tr('డాక్టర్ రమేష్ బాబుతో టెలి-కన్సల్టేషన్ ఖరారైంది', 'Tele-consultation confirmed with Dr. Ramesh Babu', 'डॉ. रमेश बाबू के साथ टेली-परामर्श की पुष्टि हुई'),
      meta: 'Today 11:15 AM • 15m ago',
      unread: true
    },
    {
      id: 3,
      title: tr('రోజువారీ డేటా సింక్ విజయవంతంగా పూర్తయింది', 'Daily cloud sync completed successfully', 'दैनिक क्लाउड सिंक सफलतापूर्वक पूरा हुआ'),
      meta: 'Paderu ITDA Hub • 1h ago',
      unread: false
    }
  ];

  return (
    <div className="app-container" onClick={() => {
      if (notificationsOpen) setNotificationsOpen(false);
      if (profileDropdownOpen) setProfileDropdownOpen(false);
    }}>
      {/* =========================================================================
          LEFT SIDEBAR (Dark Teal Gradient matching reference screenshot)
          ========================================================================= */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div style={{
          padding: '1.25rem 1.25rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem'
        }}>
          {/* Logo Badge: Leaf + White Heart with Green Cross */}
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            flexShrink: 0
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#FFFFFF"/>
              <path d="M10.5 7.5h3v3h3v3h-3v3h-3v-3h-3v-3h3v-3z" fill="#059669"/>
            </svg>
          </div>
          <div>
            <div className="sidebar-brand-title">Aarogya<br />Drishti</div>
          </div>
          {mobileMenuOpen && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              style={{ background: 'none', border: 'none', color: '#94A3B8', marginLeft: 'auto', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* User Profile Card */}
        <div className="sidebar-profile-card">
          <img
            src="/assets/user_sarala.png"
            alt={cleanUserName}
            className="sidebar-profile-avatar"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div className="sidebar-profile-name" title={cleanUserName}>
              {cleanUserName}
            </div>
            <div
              className="sidebar-profile-role"
              onClick={(e) => {
                e.stopPropagation();
                setProfileDropdownOpen(!profileDropdownOpen);
              }}
              title="Click to view cadre details"
            >
              <span>{getRoleShortName(currentUser.role)}</span>
              <ChevronDown size={14} />
            </div>
          </div>
        </div>

        {/* Role & Cadre Info Dropdown Popover */}
        {profileDropdownOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '135px',
              left: '14px',
              right: '14px',
              background: '#07262B',
              border: '1px solid rgba(94, 234, 212, 0.25)',
              borderRadius: '12px',
              padding: '0.85rem',
              zIndex: 60,
              boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
              color: '#F8FAFC'
            }}
          >
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#5EEAD4', fontWeight: 700, marginBottom: '0.35rem' }}>
              {tr('యూజర్ వివరాలు', 'User Profile & Cadre', 'उपयोगकर्ता विवरण')}
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{cleanUserName}</div>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.2rem' }}>
              {getRoleDisplayName(currentUser)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#CBD5E1', marginTop: '0.25rem' }}>
              🏛️ {currentUser.phc_name || `${currentUser.mandal || 'G. Madugula'} PHC`}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.4rem' }}>
              District: {currentUser.district || 'Alluri Sitharama Raju (ASR)'}
            </div>
          </div>
        )}

        {/* Main Navigation Menu */}
        <nav style={{ padding: '0.35rem 0', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          {/* 1. Dashboard */}
          <button
            className={`sidebar-menu-btn ${activeRoute === 'dashboard' ? 'active' : ''}`}
            onClick={() => navigateTo('dashboard')}
          >
            <Home size={18} />
            <span>{tr('డాష్‌బోర్డ్', 'Dashboard', 'डैशबोर्ड')}</span>
          </button>

          {/* 2. Patients */}
          <button
            className={`sidebar-menu-btn ${activeRoute === 'patients' ? 'active' : ''}`}
            onClick={() => navigateTo('patients')}
          >
            <Users size={18} />
            <span>{tr('రోగుల వివరాలు', 'Patients', 'मरीज')}</span>
          </button>

          {/* 3. AI Assistant (Chatbot) */}
          <button
            className={`sidebar-menu-btn ${activeRoute === 'chatbot' ? 'active' : ''}`}
            onClick={() => navigateTo('chatbot')}
          >
            <Bot size={18} />
            <span>{tr('AI అసిస్టెంట్', 'AI Assistant', 'एआई सहायक')}</span>
          </button>

          {/* 4. Appointments */}
          <button
            className={`sidebar-menu-btn ${activeRoute === 'appointments' ? 'active' : ''}`}
            onClick={() => navigateTo('appointments')}
          >
            <Calendar size={18} />
            <span>{tr('అపాయింట్‌మెంట్లు', 'Appointments', 'अपॉइंटमेंट')}</span>
          </button>

          {/* 5. Reports */}
          <button
            className={`sidebar-menu-btn ${activeRoute === 'reports' ? 'active' : ''}`}
            onClick={() => navigateTo('reports')}
          >
            <FileText size={18} />
            <span>{tr('నివేదికలు', 'Reports', 'रिपोर्ट्स')}</span>
          </button>

          {/* 6. Telemedicine (Doctor Queue / Consultations) */}
          <button
            className={`sidebar-menu-btn ${activeRoute === 'queue' ? 'active' : ''}`}
            onClick={() => navigateTo('queue')}
          >
            <Video size={18} />
            <span>{tr('టెలిమెడిసిన్', 'Telemedicine', 'टेलीमेडिसिन')}</span>
          </button>

          {/* 7. Health Resources (Investigations / Referrals) */}
          <button
            className={`sidebar-menu-btn ${activeRoute === 'investigations' ? 'active' : ''}`}
            onClick={() => navigateTo('investigations')}
          >
            <FlaskConical size={18} />
            <span>{tr('ఆరోగ్య వనరులు', 'Health Resources', 'स्वास्थ्य संसाधन')}</span>
          </button>

          {/* 8. Settings (Audit & Configurations) */}
          <button
            className={`sidebar-menu-btn ${activeRoute === 'audit' ? 'active' : ''}`}
            onClick={() => navigateTo('audit')}
          >
            <Settings size={18} />
            <span>{tr('సెట్టింగ్‌లు', 'Settings', 'सेटिंग्स')}</span>
          </button>

          {/* Sub-routes helper: If user navigated to screening or phc_cases, show active badge */}
          {activeRoute === 'screening' && (
            <div style={{
              margin: '0.4rem 0.85rem',
              padding: '0.45rem 0.75rem',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              fontSize: '0.78rem',
              color: '#6EE7B7',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>📝 Active: New Screening</span>
              <button
                onClick={() => navigateTo('dashboard')}
                style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: '0.72rem' }}
              >
                ✕
              </button>
            </div>
          )}

          {activeRoute === 'phc_cases' && (
            <div style={{
              margin: '0.4rem 0.85rem',
              padding: '0.45rem 0.75rem',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              fontSize: '0.78rem',
              color: '#93C5FD',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>📋 Active: PHC Review Cases</span>
              <button
                onClick={() => navigateTo('dashboard')}
                style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: '0.72rem' }}
              >
                ✕
              </button>
            </div>
          )}

          {activeRoute === 'referrals' && (
            <div style={{
              margin: '0.4rem 0.85rem',
              padding: '0.45rem 0.75rem',
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '8px',
              fontSize: '0.78rem',
              color: '#C4B5FD',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>🏥 Active: Hospital Referrals</span>
              <button
                onClick={() => navigateTo('dashboard')}
                style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: '0.72rem' }}
              >
                ✕
              </button>
            </div>
          )}

          {activeRoute === 'otp' && (
            <div style={{
              margin: '0.4rem 0.85rem',
              padding: '0.45rem 0.75rem',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              fontSize: '0.78rem',
              color: '#FCD34D',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>🔑 Active: OTP Check-in</span>
              <button
                onClick={() => navigateTo('dashboard')}
                style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: '0.72rem' }}
              >
                ✕
              </button>
            </div>
          )}

          {/* 9. Logout */}
          <button
            className="sidebar-menu-btn logout-btn"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>{tr('లాగౌట్', 'Logout', 'लॉगआउट')}</span>
          </button>
        </nav>

        {/* Bottom Graphic: Healthy Village | Healthy Andhra */}
        <div className="sidebar-bottom-badge">
          <img
            src="/assets/village_illustration.png"
            alt="Healthy Village Healthy Andhra"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <p>Healthy Village</p>
          <p>Healthy Andhra</p>
        </div>
      </aside>

      {/* =========================================================================
          MAIN WRAPPER (Top Header + Content Area + Portal Footer)
          ========================================================================= */}
      <div className="main-wrapper">
        {/* Top Header Bar */}
        <header className="top-header-bar">
          {/* Left: Hamburger menu toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                background: 'none',
                border: 'none',
                color: '#083238',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.35rem',
                borderRadius: '8px'
              }}
              aria-label="Toggle navigation"
            >
              <Menu size={22} />
            </button>

            {/* Back to Dashboard shortcut if on sub-workflow */}
            {activeRoute !== 'dashboard' && (
              <button
                onClick={() => navigateTo('dashboard')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#0D9488',
                  background: '#F0FDFA',
                  border: '1px solid #CCFBF1',
                  borderRadius: '6px',
                  padding: '0.25rem 0.6rem',
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={14} />
                <span>{tr('డాష్‌బోర్డ్', 'Dashboard', 'डैशबोर्ड')}</span>
              </button>
            )}
          </div>

          {/* Center Slogan: Better Health. Brighter Tomorrow. */}
          <div className="header-slogan-wrap">
            <span style={{ fontSize: '1rem' }}>🌿</span>
            <span>{tr('మెరుగైన ఆరోగ్యం. ఉజ్వల భవిష్యత్తు.', 'Better Health. Brighter Tomorrow.', 'बेहतर स्वास्थ्य. उज्जवल भविष्य.')}</span>
            <span style={{ fontSize: '1rem' }}>🌿</span>
          </div>

          {/* Right Controls: Notifications + Language Selector + AP State Emblem */}
          <div className="header-actions-wrap" style={{ position: 'relative' }}>
            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button
                className="notification-bell-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setNotificationsOpen(!notificationsOpen);
                }}
                title={tr('నోటిఫికేషన్‌లు (3)', 'Notifications (3)', 'सूचनाएं (3)')}
                aria-label="Notifications"
              >
                <Bell size={18} />
                <span className="notification-badge-dot">3</span>
              </button>

              {/* Notifications Popover */}
              {notificationsOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: '46px',
                    right: 0,
                    width: '320px',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '14px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                    zIndex: 50,
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    padding: '0.85rem 1rem',
                    background: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F172A' }}>
                      {tr('నోటిఫికేషన్‌లు', 'Notifications', 'सूचनाएं')}
                    </span>
                    <span style={{ fontSize: '0.72rem', background: '#DC2626', color: '#FFF', padding: '0.15rem 0.5rem', borderRadius: '10px', fontWeight: 800 }}>
                      3 New
                    </span>
                  </div>
                  <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {notificationsList.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          padding: '0.75rem 1rem',
                          borderBottom: '1px solid #F1F5F9',
                          background: n.unread ? '#F0FDFA' : '#FFFFFF',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>
                          {n.meta}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Language Selector Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              borderRadius: '20px',
              padding: '0.35rem 0.75rem',
              cursor: 'pointer'
            }}>
              <select
                value={currentLang}
                onChange={(e) => setCurrentLang(e.target.value as LanguageCode)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: '#0F172A',
                  cursor: 'pointer',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
                aria-label="Select Interface Language"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} color="#64748B" />
            </div>

            {/* Andhra Pradesh Government Official Emblem */}
            <img
              src="/assets/ap_emblem.png"
              alt="Government of Andhra Pradesh"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                objectFit: 'contain'
              }}
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </header>

        {/* Dynamic Main Content View */}
        <main className="content-area" style={{ flex: 1, minHeight: 'calc(100vh - 110px)' }}>
          {activeRoute === 'dashboard' && (
            <DashboardView
              currentLang={currentLang}
              user={currentUser}
              onNavigate={navigateTo}
            />
          )}

          {activeRoute === 'patients' && (
            <PatientsView
              currentLang={currentLang}
              user={currentUser}
            />
          )}

          {activeRoute === 'screening' && (
            <ScreeningCreateView
              currentLang={currentLang}
              user={currentUser}
              onScreeningCreated={() => setActiveRoute('dashboard')}
            />
          )}

          {activeRoute === 'phc_cases' && (
            <PHCReviewView
              currentLang={currentLang}
              user={currentUser}
              onNavigateToBooking={(scr) => {
                setPreSelectedScreening(scr);
                setActiveRoute('appointments');
              }}
            />
          )}

          {activeRoute === 'appointments' && (
            <AppointmentsView
              currentLang={currentLang}
              user={currentUser}
              preSelectedScreening={preSelectedScreening}
              onStartConsultation={(session) => {
                setActiveConsultation(session);
              }}
            />
          )}

          {activeRoute === 'otp' && (
            <OTPCheckinView
              currentLang={currentLang}
              user={currentUser}
              onCheckinSuccess={() => {
                if (currentUser.role === 'doctor') {
                  setActiveRoute('queue');
                } else {
                  setActiveRoute('phc_cases');
                }
              }}
            />
          )}

          {activeRoute === 'queue' && (
            <DoctorQueueView
              currentLang={currentLang}
              user={currentUser}
              onAcceptCase={(session) => {
                setActiveConsultation(session);
              }}
            />
          )}

          {activeRoute === 'chatbot' && (
            <ChatbotView
              currentLang={currentLang}
            />
          )}

          {activeRoute === 'reports' && (
            <DistrictReportsView
              currentLang={currentLang}
              user={currentUser}
            />
          )}

          {activeRoute === 'audit' && (
            <AuditLogView
              currentLang={currentLang}
              user={currentUser}
            />
          )}

          {activeRoute === 'investigations' && (
            <InvestigationsView
              currentUser={currentUser}
              currentLang={currentLang}
            />
          )}

          {activeRoute === 'referrals' && (
            <ReferralsView
              currentUser={currentUser}
              currentLang={currentLang}
            />
          )}
        </main>

        {/* =========================================================================
            PORTAL FOOTER (Matching reference screenshot bottom bar)
            ========================================================================= */}
        <footer className="portal-footer">
          <div>
            {tr('ఆంధ్రప్రదేశ్ ప్రభుత్వం | ఆరోగ్య దృష్టి', 'Government of Andhra Pradesh | Aarogya Drishti', 'आंध्र प्रदेश सरकार | आरोग्य दृष्टि')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#059669', fontWeight: 700 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              Online
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              Last Sync: {lastSyncTime}
              <button
                onClick={handleRefreshSync}
                title="Refresh Sync"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#0D9488',
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px',
                  borderRadius: '4px'
                }}
              >
                <RefreshCw
                  size={13}
                  style={{
                    transition: 'transform 0.6s ease',
                    transform: syncRotating ? 'rotate(360deg)' : 'none'
                  }}
                />
              </button>
            </span>
          </div>
        </footer>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="mobile-bottom-nav">
          <button
            className={`bottom-nav-item ${activeRoute === 'dashboard' ? 'active' : ''}`}
            onClick={() => navigateTo('dashboard')}
          >
            <Home size={18} />
            <span>{tr('హోమ్', 'Home', 'होम')}</span>
          </button>

          <button
            className={`bottom-nav-item ${activeRoute === 'patients' ? 'active' : ''}`}
            onClick={() => navigateTo('patients')}
          >
            <Users size={18} />
            <span>{tr('రోగులు', 'Patients', 'मरीज')}</span>
          </button>

          <button
            className={`bottom-nav-item ${activeRoute === 'chatbot' ? 'active' : ''}`}
            onClick={() => navigateTo('chatbot')}
          >
            <Bot size={18} />
            <span>{tr('మిత్ర AI', 'Mitra AI', 'मित्र AI')}</span>
          </button>

          <button
            className={`bottom-nav-item ${activeRoute === 'queue' ? 'active' : ''}`}
            onClick={() => navigateTo('queue')}
          >
            <Video size={18} />
            <span>{tr('కన్సల్ట్', 'Consult', 'परामर्श')}</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default App;
