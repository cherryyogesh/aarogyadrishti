import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { translations, LANGUAGES } from './i18n/translations';
import { LanguageCode, User, Screening, AppNotification } from './types';
import { NotificationDrawer } from './features/notifications/NotificationDrawer';
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
import { networkStatus } from './services/networkStatus';
import { offlineStorage } from './services/offlineStorage';

import {
  Activity, Users, FileText, Calendar, KeyRound, Stethoscope,
  MessageSquare, BarChart3, Shield, LogOut, Menu,
  X, Globe, UserCheck, FlaskConical, FileCheck, Bell
} from 'lucide-react';

export const App: React.FC = () => {
  const [currentLang, setCurrentLang] = useState<LanguageCode>('te');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeRoute, setActiveRoute] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live Notifications & Regular Updates State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => networkStatus.isOnline());
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => offlineStorage.getPendingCount());
  const [isSyncing, setIsSyncing] = useState(false);

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

  useEffect(() => {
    const checkAuth = async () => {
      const token = api.getToken();
      if (token) {
        try {
          const user = await api.getMe();
          setCurrentUser(user);
          // Cache user profile for offline session persistence in deep tribal mandals
          localStorage.setItem('ad_cached_user', JSON.stringify(user));
          if (user.role === 'doctor') setActiveRoute('queue');
          else if (user.role === 'phc_staff') setActiveRoute('phc_cases');
          else if (user.role === 'admin') setActiveRoute('reports');
          else setActiveRoute('screening');
        } catch (e) {
          // If offline, restore session from cached profile
          const cached = localStorage.getItem('ad_cached_user');
          if (cached) {
            try {
              const user = JSON.parse(cached);
              setCurrentUser(user);
              if (user.role === 'doctor') setActiveRoute('queue');
              else if (user.role === 'phc_staff') setActiveRoute('phc_cases');
              else if (user.role === 'admin') setActiveRoute('reports');
              else setActiveRoute('screening');
            } catch {
              api.setToken(null);
              setCurrentUser(null);
            }
          } else {
            api.setToken(null);
            setCurrentUser(null);
          }
        }
      }
      setAuthChecking(false);
    };
    checkAuth();
  }, []);

  // Network Status Monitoring & Automatic Background Sync
  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await offlineStorage.syncPendingQueue(api);
      setPendingSyncCount(offlineStorage.getPendingCount());
    } catch (err) {
      console.error('Offline sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const unsub = networkStatus.subscribe((online) => {
      setIsOnline(online);
      if (online && offlineStorage.getPendingCount() > 0) {
        handleSyncNow();
      }
    });

    const handleQueueChange = () => {
      setPendingSyncCount(offlineStorage.getPendingCount());
    };
    const handleSyncDone = () => {
      setPendingSyncCount(offlineStorage.getPendingCount());
    };

    window.addEventListener('aarogya-sync-queue-updated', handleQueueChange);
    window.addEventListener('aarogya-sync-complete', handleSyncDone);

    return () => {
      unsub();
      window.removeEventListener('aarogya-sync-queue-updated', handleQueueChange);
      window.removeEventListener('aarogya-sync-complete', handleSyncDone);
    };
  }, []);

  // Live Real-Time Healthcare Notifications & Periodic Sync (every 30 seconds)
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;
    const loadNotifications = async (triggerDesktopAlert = false) => {
      try {
        const items = await api.listNotifications();
        if (!isMounted) return;

        setNotifications(prev => {
          if (triggerDesktopAlert && items.length > 0) {
            const prevIds = new Set(prev.map(p => p.id));
            const newItems = items.filter(it => !prevIds.has(it.id));
            if (newItems.length > 0 && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              const latest = newItems[0];
              const title = currentLang === 'te' ? latest.title_te : currentLang === 'hi' ? latest.title_hi : latest.title;
              const msg = currentLang === 'te' ? latest.message_te : currentLang === 'hi' ? latest.message_hi : latest.message;
              try {
                new Notification(title, {
                  body: msg,
                  icon: '/assets/logo-192.png'
                });
              } catch (err) {
                console.warn('Native notification suppressed:', err);
              }
            }
          }
          return items;
        });
      } catch (e) {
        console.error('Error fetching notifications:', e);
      }
    };

    loadNotifications(false);

    // Regular interval to push updates periodically
    const interval = setInterval(() => {
      loadNotifications(true);
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentUser, currentLang]);

  const handleMarkNotificationRead = async (id?: string) => {
    setNotifications(prev =>
      prev.map(n => (!id || n.id === id ? { ...n, is_read: true } : n))
    );
    try {
      await api.markNotificationRead(id);
    } catch (e) {
      console.error('Error marking notification read:', e);
    }
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  const unreadNotificationCount = notifications.filter(n => !n.is_read).length;

  const handleLogout = () => {
    api.setToken(null);
    setCurrentUser(null);
    setActiveRoute('dashboard');
    setActiveConsultation(null);
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
    if (role === 'chw') return 'ASHA / CHW';
    if (role === 'phc_staff') return 'PHC Staff / MO';
    if (role === 'doctor') return 'Doctor / Specialist';
    return 'DMHO Admin';
  };

  const cleanUserName = currentUser?.full_name ? currentUser.full_name.replace(/\s*\([^)]*\)\s*$/, '').trim() : '';

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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A192F', color: '#5EEAD4' }}>
        <div style={{ textAlign: 'center' }}>
          <AarogyaLogo size="large" lightText={true} currentLang={currentLang} />
          <div style={{ fontSize: '0.88rem', color: '#94A3B8', marginTop: '1rem' }}>
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
          if (user.role === 'doctor') setActiveRoute('queue');
          else if (user.role === 'phc_staff') setActiveRoute('phc_cases');
          else if (user.role === 'admin') setActiveRoute('reports');
          else setActiveRoute('screening');
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

  // Role-based visibility helpers
  const isCHW = currentUser.role === 'chw';
  const isPHC = currentUser.role === 'phc_staff';
  const isDoctor = currentUser.role === 'doctor';
  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header" style={{ padding: '1.25rem 1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <AarogyaLogo size="medium" lightText={true} showSubtitle={true} currentLang={currentLang} />
          {mobileMenuOpen && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              style={{ background: 'none', border: 'none', color: '#94A3B8', marginLeft: 'auto', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Role Badge Indicator */}
        <div style={{
          margin: '0.85rem 1rem 0.5rem',
          padding: '0.5rem 0.75rem',
          background: 'rgba(13, 148, 136, 0.12)',
          border: '1px solid rgba(13, 148, 136, 0.25)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#10B981',
            boxShadow: '0 0 8px #10B981'
          }} />
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#5EEAD4', fontWeight: 700, letterSpacing: '0.04em' }}>
              {currentLang === 'te' ? 'అధికారిక హోదా' : currentLang === 'hi' ? 'आधिकारिक पद' : 'Active Role Designation'}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#F8FAFC', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {getRoleDisplayName(currentUser)}
            </div>
          </div>
        </div>

        <nav className="sidebar-menu">
          {/* Dashboard — Visible to all roles */}
          <button
            className={`menu-item ${activeRoute === 'dashboard' ? 'active' : ''}`}
            onClick={() => navigateTo('dashboard')}
          >
            <Activity size={18} />
            {t.nav_dashboard}
          </button>

          {/* 1. ASHA / CHW SPECIFIC MENU */}
          {isCHW && (
            <>
              <button
                className={`menu-item ${activeRoute === 'screening' ? 'active' : ''}`}
                onClick={() => navigateTo('screening')}
              >
                <FileText size={18} />
                {t.nav_screening}
              </button>
              <button
                className={`menu-item ${activeRoute === 'patients' ? 'active' : ''}`}
                onClick={() => navigateTo('patients')}
              >
                <Users size={18} />
                {t.nav_patients}
              </button>
            </>
          )}

          {/* 2. PHC STAFF / MEDICAL OFFICER SPECIFIC MENU */}
          {isPHC && (
            <>
              <button
                className={`menu-item ${activeRoute === 'phc_cases' ? 'active' : ''}`}
                onClick={() => navigateTo('phc_cases')}
              >
                <UserCheck size={18} />
                {t.nav_phc_cases}
              </button>
              <button
                className={`menu-item ${activeRoute === 'appointments' ? 'active' : ''}`}
                onClick={() => navigateTo('appointments')}
              >
                <Calendar size={18} />
                {t.nav_appointments}
              </button>
              <button
                className={`menu-item ${activeRoute === 'otp' ? 'active' : ''}`}
                onClick={() => navigateTo('otp')}
              >
                <KeyRound size={18} />
                {t.nav_otp_checkin}
              </button>
              <button
                className={`menu-item ${activeRoute === 'referrals' ? 'active' : ''}`}
                onClick={() => navigateTo('referrals')}
              >
                <FileCheck size={18} />
                {t.nav_referrals}
              </button>
              <button
                className={`menu-item ${activeRoute === 'investigations' ? 'active' : ''}`}
                onClick={() => navigateTo('investigations')}
              >
                <FlaskConical size={18} />
                {t.nav_investigations}
              </button>
              <button
                className={`menu-item ${activeRoute === 'patients' ? 'active' : ''}`}
                onClick={() => navigateTo('patients')}
              >
                <Users size={18} />
                {t.nav_patients}
              </button>
            </>
          )}

          {/* 3. SPECIALIST DOCTOR SPECIFIC MENU */}
          {isDoctor && (
            <>
              <button
                className={`menu-item ${activeRoute === 'queue' ? 'active' : ''}`}
                onClick={() => navigateTo('queue')}
              >
                <Stethoscope size={18} />
                {t.nav_doctor_queue}
              </button>
              <button
                className={`menu-item ${activeRoute === 'phc_cases' ? 'active' : ''}`}
                onClick={() => navigateTo('phc_cases')}
              >
                <UserCheck size={18} />
                {t.nav_phc_cases}
              </button>
              <button
                className={`menu-item ${activeRoute === 'investigations' ? 'active' : ''}`}
                onClick={() => navigateTo('investigations')}
              >
                <FlaskConical size={18} />
                {t.nav_investigations}
              </button>
              <button
                className={`menu-item ${activeRoute === 'referrals' ? 'active' : ''}`}
                onClick={() => navigateTo('referrals')}
              >
                <FileCheck size={18} />
                {t.nav_referrals}
              </button>
              <button
                className={`menu-item ${activeRoute === 'patients' ? 'active' : ''}`}
                onClick={() => navigateTo('patients')}
              >
                <Users size={18} />
                {t.nav_patients}
              </button>
            </>
          )}

          {/* 4. DMHO (DISTRICT ADMIN) SPECIFIC MENU */}
          {isAdmin && (
            <>
              <button
                className={`menu-item ${activeRoute === 'reports' ? 'active' : ''}`}
                onClick={() => navigateTo('reports')}
              >
                <BarChart3 size={18} />
                {t.nav_reports}
              </button>
              <button
                className={`menu-item ${activeRoute === 'audit' ? 'active' : ''}`}
                onClick={() => navigateTo('audit')}
              >
                <Shield size={18} />
                {t.nav_audit}
              </button>
              <button
                className={`menu-item ${activeRoute === 'investigations' ? 'active' : ''}`}
                onClick={() => navigateTo('investigations')}
              >
                <FlaskConical size={18} />
                {t.nav_investigations}
              </button>
              <button
                className={`menu-item ${activeRoute === 'referrals' ? 'active' : ''}`}
                onClick={() => navigateTo('referrals')}
              >
                <FileCheck size={18} />
                {t.nav_referrals}
              </button>
              <button
                className={`menu-item ${activeRoute === 'patients' ? 'active' : ''}`}
                onClick={() => navigateTo('patients')}
              >
                <Users size={18} />
                {t.nav_patients}
              </button>
            </>
          )}

          {/* Aarogya Mitra AI Assistant — Available to all healthcare cadres */}
          <button
            className={`menu-item ${activeRoute === 'chatbot' ? 'active' : ''}`}
            onClick={() => navigateTo('chatbot')}
          >
            <MessageSquare size={18} />
            {t.nav_chatbot}
          </button>
        </nav>

        {/* Sidebar Village Graphic from Reference UI */}
        <div className="sidebar-village-container">
          <img
            src="/assets/sidebar_village.png"
            alt="Healthy Village Healthy Andhra"
            className="sidebar-village-img"
          />
        </div>

        {/* Sidebar Footer with Role Designation (No Individual Names) */}
        <div className="sidebar-footer">
          <div className="user-profile-badge">
            <div className="user-avatar" style={{
              background: isDoctor ? '#7E22CE' : isPHC ? '#15803D' : isAdmin ? '#BE123C' : '#0D9488'
            }}>
              {isDoctor ? <Stethoscope size={16} /> :
               isPHC ? <UserCheck size={16} /> :
               isAdmin ? <Shield size={16} /> : <FileText size={16} />}
            </div>
            <div className="user-info-text">
              <h4>{cleanUserName || currentUser.full_name}</h4>
              <p>{getRoleShortName(currentUser.role)} • {currentUser.phc_name?.replace('Primary Health Centre', 'PHC') || currentUser.mandal || 'ITDA Paderu'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="btn-icon"
              title={t.nav_logout}
              style={{ marginLeft: 'auto' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="main-wrapper">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open Navigation Menu"
            >
              <Menu size={22} />
            </button>
            <h2 className="header-title">
              {activeRoute === 'dashboard' ? t.nav_dashboard :
               activeRoute === 'patients' ? t.nav_patients :
               activeRoute === 'screening' ? t.nav_screening :
               activeRoute === 'phc_cases' ? t.nav_phc_cases :
               activeRoute === 'investigations' ? t.nav_investigations :
               activeRoute === 'referrals' ? t.nav_referrals :
               activeRoute === 'appointments' ? t.nav_appointments :
               activeRoute === 'otp' ? t.nav_otp_checkin :
               activeRoute === 'queue' ? t.nav_doctor_queue :
               activeRoute === 'chatbot' ? t.nav_chatbot :
               activeRoute === 'reports' ? t.nav_reports :
               activeRoute === 'audit' ? t.nav_audit : t.app_title}
            </h2>
          </div>

          {/* Reference UI Tagline */}
          <div className="header-tagline">
            <span style={{ fontSize: '1.15rem' }}>🍃</span>
            <span>Better Health. Brighter Tomorrow.</span>
            <span style={{ fontSize: '1.15rem' }}>🍃</span>
          </div>

          <div className="header-right">
            {/* Live Interactive Notification Bell Button */}
            <button
              type="button"
              className="header-notif-btn"
              onClick={() => setShowNotifications(prev => !prev)}
              title={currentLang === 'te' ? 'నోటిఫికేషన్లు & హెచ్చరికలు' : currentLang === 'hi' ? 'सूचनाएं एवं अलर्ट' : 'Notifications & Alerts'}
              aria-label="Open notifications"
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              <Bell size={17} />
              {unreadNotificationCount > 0 && (
                <span className="header-notif-badge">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>
            {/* Language Selector */}
            <div className="lang-select-pill">
              <Globe size={15} color="var(--teal-primary)" />
              <select
                value={currentLang}
                onChange={(e) => setCurrentLang(e.target.value as LanguageCode)}
                aria-label="Select Interface Language"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} ({l.label})
                  </option>
                ))}
              </select>
            </div>

            {/* Role Chip */}
            <div className="user-profile-pill">
              <div className="user-avatar-small" style={{
                background: isDoctor ? '#7E22CE' : isPHC ? '#15803D' : isAdmin ? '#BE123C' : '#0D9488'
              }}>
                {isDoctor ? <Stethoscope size={13} /> :
                 isPHC ? <UserCheck size={13} /> :
                 isAdmin ? <Shield size={13} /> : <FileText size={13} />}
              </div>
              <div className="user-pill-text">
                <span className="user-name-small">{cleanUserName || currentUser.full_name}</span>
                <span className="user-sub-small">
                  {getRoleShortName(currentUser.role)} • {currentUser.phc_name?.replace('Primary Health Centre', 'PHC') || currentUser.mandal || 'ITDA Paderu'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="btn-icon"
                title={t.nav_logout}
              >
                <LogOut size={14} />
              </button>
            </div>

            {/* Government State Emblem */}
            <img
              src="/assets/ap_state_emblem.png"
              alt="Government of Andhra Pradesh"
              className="header-state-emblem"
            />
          </div>
        </header>

        {/* Dynamic Route View Mount */}
        <main className="content-area">
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

        {/* Bottom Status Bar from Reference UI */}
        <footer className="desktop-footer-bar">
          <div className="footer-left">
            <span className="footer-gov">Government of Andhra Pradesh</span>
            <span className="footer-divider">|</span>
            <span className="footer-sub">Aarogya Drishti</span>
          </div>
          <div className="footer-right">
            <span className="footer-online" style={{ color: isOnline ? '#059669' : '#D97706' }}>
              <span
                className="online-dot"
                style={{ backgroundColor: isOnline ? '#10B981' : '#F59E0B' }}
              />
              {isOnline ? 'Online' : 'Offline Mode'}
            </span>
            <span className="footer-sync">
              {pendingSyncCount > 0 ? (
                <span style={{ color: '#D97706', fontWeight: 700 }}>
                  {pendingSyncCount} Queued to Sync
                </span>
              ) : (
                `Last Sync: ${offlineStorage.getLastSyncTime()}`
              )}
            </span>
            <button
              className={`footer-refresh-btn ${isSyncing ? 'spin' : ''}`}
              onClick={handleSyncNow}
              title={isOnline ? 'Sync local field records to state database' : 'Sync pending records (Offline)'}
            >
              🔄
            </button>
          </div>
        </footer>

        {/* Interactive Notification Center Drawer */}
        <NotificationDrawer
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          currentLang={currentLang}
          user={currentUser}
          notifications={notifications}
          onMarkRead={handleMarkNotificationRead}
          onClearAll={handleClearAllNotifications}
          onNavigate={navigateTo}
          onRefresh={() => {
            api.listNotifications().then(setNotifications).catch(console.error);
          }}
        />

        {/* Mobile Bottom Navigation Bar (Tailored to Role) */}
        <nav className="mobile-bottom-nav">
          <button
            className={`bottom-nav-item ${activeRoute === 'dashboard' ? 'active' : ''}`}
            onClick={() => navigateTo('dashboard')}
          >
            <Activity size={18} />
            <span>{currentLang === 'te' ? 'హోమ్' : currentLang === 'hi' ? 'होम' : 'Home'}</span>
          </button>

          {isCHW && (
            <button
              className={`bottom-nav-item ${activeRoute === 'screening' ? 'active' : ''}`}
              onClick={() => navigateTo('screening')}
            >
              <FileText size={18} />
              <span>{currentLang === 'te' ? 'స్క్రీనింగ్' : currentLang === 'hi' ? 'स्क्रीनिंग' : 'Screen'}</span>
            </button>
          )}

          {isPHC && (
            <>
              <button
                className={`bottom-nav-item ${activeRoute === 'phc_cases' ? 'active' : ''}`}
                onClick={() => navigateTo('phc_cases')}
              >
                <UserCheck size={18} />
                <span>{currentLang === 'te' ? 'సమీక్ష' : currentLang === 'hi' ? 'समीक्षा' : 'Review'}</span>
              </button>
              <button
                className={`bottom-nav-item ${activeRoute === 'otp' ? 'active' : ''}`}
                onClick={() => navigateTo('otp')}
              >
                <KeyRound size={18} />
                <span>{currentLang === 'te' ? 'చెక్-ఇన్' : currentLang === 'hi' ? 'चेक-इन' : 'Check-in'}</span>
              </button>
            </>
          )}

          {isDoctor && (
            <button
              className={`bottom-nav-item ${activeRoute === 'queue' ? 'active' : ''}`}
              onClick={() => navigateTo('queue')}
            >
              <Stethoscope size={18} />
              <span>{currentLang === 'te' ? 'క్యూ' : currentLang === 'hi' ? 'कतार' : 'Queue'}</span>
            </button>
          )}

          {isAdmin && (
            <button
              className={`bottom-nav-item ${activeRoute === 'reports' ? 'active' : ''}`}
              onClick={() => navigateTo('reports')}
            >
              <BarChart3 size={18} />
              <span>{currentLang === 'te' ? 'నివేదికలు' : currentLang === 'hi' ? 'रिपोर्ट्स' : 'Reports'}</span>
            </button>
          )}

          <button
            className={`bottom-nav-item ${activeRoute === 'chatbot' ? 'active' : ''}`}
            onClick={() => navigateTo('chatbot')}
          >
            <MessageSquare size={18} />
            <span>{currentLang === 'te' ? 'మిత్ర AI' : currentLang === 'hi' ? 'मित्र AI' : 'Mitra AI'}</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default App;
