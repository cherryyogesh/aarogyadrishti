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
import { ChatbotView } from './features/chatbot/ChatbotView';
import { DistrictReportsView } from './features/reports/DistrictReportsView';
import { AuditLogView } from './features/audit/AuditLogView';
import { ConfigStatusView } from './features/config/ConfigStatusView';
import { InvestigationsView } from './features/investigations/InvestigationsView';
import { NavigationView } from './features/navigation/NavigationView';
import { ReferralsView } from './features/referrals/ReferralsView';

import {
  Activity, Users, FileText, Calendar, KeyRound, Stethoscope,
  MessageSquare, BarChart3, Shield, Settings, LogOut, Menu,
  X, Globe, Server, UserCheck, FlaskConical, Compass, FileCheck
} from 'lucide-react';

export const App: React.FC = () => {
  const [currentLang, setCurrentLang] = useState<LanguageCode>('te');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeRoute, setActiveRoute] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Cross-screen state: Pre-selected screening for appointment booking
  const [preSelectedScreening, setPreSelectedScreening] = useState<Screening | null>(null);

  // Active Telemedicine Consultation Session
  const [activeConsultation, setActiveConsultation] = useState<any | null>(null);

  const t = translations[currentLang] || translations.en;

  useEffect(() => {
    const checkAuth = async () => {
      const token = api.getToken();
      if (token) {
        try {
          const user = await api.getMe();
          setCurrentUser(user);
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

  if (authChecking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A192F', color: '#5EEAD4' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>ఆరోగ్య దృష్టి</div>
          <div style={{ fontSize: '0.88rem', color: '#94A3B8' }}>Loading secure platform...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginView
        currentLang={currentLang}
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

  return (
    <div className="app-container">
      {/* Sidebar Navigation (Desktop & Mobile Drawer) */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-badge">ఆ</div>
          <div className="sidebar-brand">
            <h1>{t.app_title}</h1>
            <p>{t.app_subtitle}</p>
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

        <nav className="sidebar-menu">
          <button
            className={`menu-item ${activeRoute === 'dashboard' ? 'active' : ''}`}
            onClick={() => navigateTo('dashboard')}
          >
            <Activity size={18} />
            {t.nav_dashboard}
          </button>

          <button
            className={`menu-item ${activeRoute === 'patients' ? 'active' : ''}`}
            onClick={() => navigateTo('patients')}
          >
            <Users size={18} />
            {t.nav_patients}
          </button>

          <button
            className={`menu-item ${activeRoute === 'screening' ? 'active' : ''}`}
            onClick={() => navigateTo('screening')}
          >
            <FileText size={18} />
            {t.nav_screening}
          </button>

          {(currentUser.role === 'phc_staff' || currentUser.role === 'doctor' || currentUser.role === 'admin') && (
            <button
              className={`menu-item ${activeRoute === 'phc_cases' ? 'active' : ''}`}
              onClick={() => navigateTo('phc_cases')}
            >
              <UserCheck size={18} />
              {t.nav_phc_cases}
            </button>
          )}

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
            className={`menu-item ${activeRoute === 'navigation' ? 'active' : ''}`}
            onClick={() => navigateTo('navigation')}
          >
            <Compass size={18} />
            {t.nav_navigation}
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

          {(currentUser.role === 'doctor' || currentUser.role === 'phc_staff' || currentUser.role === 'admin') && (
            <button
              className={`menu-item ${activeRoute === 'queue' ? 'active' : ''}`}
              onClick={() => navigateTo('queue')}
            >
              <Stethoscope size={18} />
              {t.nav_doctor_queue}
            </button>
          )}

          <button
            className={`menu-item ${activeRoute === 'chatbot' ? 'active' : ''}`}
            onClick={() => navigateTo('chatbot')}
          >
            <MessageSquare size={18} />
            {t.nav_chatbot}
          </button>

          {(currentUser.role === 'admin' || currentUser.role === 'doctor' || currentUser.role === 'phc_staff') && (
            <button
              className={`menu-item ${activeRoute === 'reports' ? 'active' : ''}`}
              onClick={() => navigateTo('reports')}
            >
              <BarChart3 size={18} />
              {t.nav_reports}
            </button>
          )}

          {currentUser.role === 'admin' && (
            <button
              className={`menu-item ${activeRoute === 'audit' ? 'active' : ''}`}
              onClick={() => navigateTo('audit')}
            >
              <Shield size={18} />
              {t.nav_audit}
            </button>
          )}

          <button
            className={`menu-item ${activeRoute === 'config' ? 'active' : ''}`}
            onClick={() => navigateTo('config')}
          >
            <Server size={18} />
            {t.nav_config}
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-badge">
            <div className="user-avatar">
              {currentUser.full_name.charAt(0)}
            </div>
            <div className="user-info-text">
              <h4>{currentUser.full_name}</h4>
              <p>{t[`role_${currentUser.role}`] || currentUser.role}</p>
            </div>
            <button
              onClick={handleLogout}
              title={t.nav_logout}
              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', marginLeft: 'auto' }}
            >
              <LogOut size={18} />
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
               activeRoute === 'navigation' ? t.nav_navigation :
               activeRoute === 'appointments' ? t.nav_appointments :
               activeRoute === 'otp' ? t.nav_otp_checkin :
               activeRoute === 'queue' ? t.nav_doctor_queue :
               activeRoute === 'chatbot' ? t.nav_chatbot :
               activeRoute === 'reports' ? t.nav_reports :
               activeRoute === 'audit' ? t.nav_audit :
               activeRoute === 'config' ? t.nav_config : t.app_title}
            </h2>
          </div>

          <div className="header-right">
            {/* 6-Language Selector */}
            <div className="lang-select-pill">
              <Globe size={15} color="var(--teal-primary)" />
              <select
                value={currentLang}
                onChange={(e) => setCurrentLang(e.target.value as LanguageCode)}
                aria-label="Select System Language"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} ({l.label})
                  </option>
                ))}
              </select>
            </div>

            {/* Current Role Badge */}
            <span className={`role-chip ${currentUser.role}`}>
              {currentUser.role}
            </span>
          </div>
        </header>

        {/* Content View Router */}
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

          {activeRoute === 'config' && (
            <ConfigStatusView
              currentLang={currentLang}
              user={currentUser}
            />
          )}

          {activeRoute === 'investigations' && (
            <InvestigationsView
              currentUser={currentUser}
            />
          )}

          {activeRoute === 'referrals' && (
            <ReferralsView
              currentUser={currentUser}
            />
          )}

          {activeRoute === 'navigation' && (
            <NavigationView
              currentUser={currentUser}
            />
          )}
        </main>

        {/* Mobile Bottom Navigation Bar (for narrow screens) */}
        <nav className="mobile-bottom-nav">
          <button
            className={`bottom-nav-item ${activeRoute === 'dashboard' ? 'active' : ''}`}
            onClick={() => navigateTo('dashboard')}
          >
            <Activity size={18} />
            <span>Dashboard</span>
          </button>

          <button
            className={`bottom-nav-item ${activeRoute === 'screening' ? 'active' : ''}`}
            onClick={() => navigateTo('screening')}
          >
            <FileText size={18} />
            <span>Screen</span>
          </button>

          <button
            className={`bottom-nav-item ${activeRoute === 'otp' ? 'active' : ''}`}
            onClick={() => navigateTo('otp')}
          >
            <KeyRound size={18} />
            <span>Check-in</span>
          </button>

          {currentUser.role === 'doctor' && (
            <button
              className={`bottom-nav-item ${activeRoute === 'queue' ? 'active' : ''}`}
              onClick={() => navigateTo('queue')}
            >
              <Stethoscope size={18} />
              <span>Queue</span>
            </button>
          )}

          <button
            className={`bottom-nav-item ${activeRoute === 'chatbot' ? 'active' : ''}`}
            onClick={() => navigateTo('chatbot')}
          >
            <MessageSquare size={18} />
            <span>Chat AI</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default App;
