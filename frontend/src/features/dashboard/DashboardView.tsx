import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, User, Screening, DoctorQueueItem } from '../../types';
import { networkStatus } from '../../services/networkStatus';
import { offlineStorage } from '../../services/offlineStorage';
import {
  Users, Activity, Clock, CheckCircle, PlusCircle, UserCheck,
  Stethoscope, MessageSquare, ArrowRight, AlertTriangle, Shield,
  FileCheck, FlaskConical, WifiOff, RefreshCw
} from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
  user: User;
  onNavigate: (route: string) => void;
}

export const DashboardView: React.FC<Props> = ({ currentLang, user, onNavigate }) => {
  const t = translations[currentLang] || translations.en;
  const isTe = currentLang === 'te';
  const isHi = currentLang === 'hi';
  const tr = (teText: string, enText: string, hiText: string) => {
    if (currentLang === 'te') return teText;
    if (currentLang === 'hi') return hiText;
    return enText;
  };

  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [waitingQueue, setWaitingQueue] = useState<DoctorQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean>(() => networkStatus.isOnline());
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => offlineStorage.getPendingCount());
  const [syncing, setSyncing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      if (networkStatus.isOnline()) {
        const [scrs, queue] = await Promise.all([
          api.listScreenings(),
          user.role === 'doctor' || user.role === 'phc_staff' || user.role === 'admin'
            ? api.getDoctorQueue()
            : Promise.resolve([])
        ]);
        offlineStorage.cacheScreenings(scrs);
        const offlineScrs = offlineStorage.getOfflineScreenings();
        setScreenings([...offlineScrs, ...scrs]);
        setWaitingQueue(queue);
      } else {
        const allScrs = offlineStorage.getAllScreenings();
        setScreenings(allScrs);
      }
    } catch (e) {
      console.warn('Network fetch failed, loading offline screening cache:', e);
      const allScrs = offlineStorage.getAllScreenings();
      setScreenings(allScrs);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await offlineStorage.syncPendingQueue(api);
      setPendingSyncCount(offlineStorage.getPendingCount());
      fetchDashboardData();
    } catch (err) {
      console.error('Manual sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const unsub = networkStatus.subscribe((online) => {
      setIsOnline(online);
      fetchDashboardData();
    });

    const handleQueueChange = () => {
      setPendingSyncCount(offlineStorage.getPendingCount());
    };
    const handleSyncComplete = () => {
      setPendingSyncCount(offlineStorage.getPendingCount());
      fetchDashboardData();
    };

    window.addEventListener('aarogya-sync-queue-updated', handleQueueChange);
    window.addEventListener('aarogya-sync-complete', handleSyncComplete);
    fetchDashboardData();

    return () => {
      unsub();
      window.removeEventListener('aarogya-sync-queue-updated', handleQueueChange);
      window.removeEventListener('aarogya-sync-complete', handleSyncComplete);
    };
  }, [user.role]);

  const awaitingReviewCount = screenings.filter(
    s => s.status === 'under_phc_review' || s.status === 'submitted'
  ).length;

  const roleTitle = t[`role_${user.role}`] || user.role.toUpperCase();

  return (
    <div>
      {/* Welcome Hero Banner (No Personal Names) */}
      <div style={{
        background: `linear-gradient(90deg, rgba(2, 75, 90, 0.92) 0%, rgba(3, 81, 94, 0.85) 50%, rgba(7, 159, 147, 0.75) 100%), url('/assets/dashboard_hero_banner.jpg') center/cover no-repeat`,
        borderRadius: '18px',
        padding: '1.75rem 2rem',
        color: '#FFFFFF',
        marginBottom: '1.75rem',
        boxShadow: '0 8px 24px -4px rgba(2, 75, 90, 0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <span className={`role-chip ${user.role}`}>
              {roleTitle}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#5EEAD4', fontWeight: 600 }}>
              • {user.phc_name || (user.role === 'admin' ? 'ITDA Paderu HQ' : 'Alluri Sitharama Raju District')}
            </span>
            <span style={{
              fontSize: '0.74rem',
              background: 'rgba(255, 255, 255, 0.18)',
              padding: '0.15rem 0.55rem',
              borderRadius: '20px',
              color: '#FFFFFF',
              letterSpacing: '0.03em',
              fontWeight: 600
            }}>
              Connect • Screen • Care • Follow-up
            </span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
            {tr(`నమస్కారం, ${user.full_name}`, `Welcome, ${user.full_name}`, `नमस्ते, ${user.full_name}`)}
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#CBD5E1', marginTop: '0.25rem' }}>
            {roleTitle} • {user.phc_name || `${user.mandal || 'G. Madugula'} PHC`} • {user.district || 'Alluri Sitharama Raju District'}
          </p>
        </div>

        {/* Role-Specific Quick Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {user.role === 'chw' && (
            <>
              <button className="btn btn-primary" onClick={() => onNavigate('screening')}>
                <PlusCircle size={18} />
                {t.nav_screening}
              </button>
              <button className="btn btn-secondary" onClick={() => onNavigate('patients')}>
                <Users size={18} />
                {t.nav_patients}
              </button>
            </>
          )}

          {user.role === 'phc_staff' && (
            <>
              <button className="btn btn-primary" onClick={() => onNavigate('phc_cases')}>
                <UserCheck size={18} />
                {t.nav_phc_cases} ({awaitingReviewCount})
              </button>
              <button className="btn btn-secondary" onClick={() => onNavigate('otp')}>
                <UserCheck size={18} />
                {t.nav_otp_checkin}
              </button>
              <button className="btn btn-secondary" onClick={() => onNavigate('appointments')}>
                {t.nav_appointments}
              </button>
            </>
          )}

          {user.role === 'doctor' && (
            <>
              <button className="btn btn-primary" onClick={() => onNavigate('queue')}>
                <Stethoscope size={18} />
                {t.nav_doctor_queue} ({waitingQueue.length})
              </button>
              <button className="btn btn-secondary" onClick={() => onNavigate('investigations')}>
                <FlaskConical size={18} />
                {t.nav_investigations}
              </button>
            </>
          )}

          {user.role === 'admin' && (
            <>
              <button className="btn btn-primary" onClick={() => onNavigate('reports')}>
                <Activity size={18} />
                {t.nav_reports}
              </button>
              <button className="btn btn-secondary" onClick={() => onNavigate('audit')}>
                <Shield size={18} />
                {t.nav_audit}
              </button>
            </>
          )}

          <button className="btn btn-secondary" onClick={() => onNavigate('chatbot')}>
            <MessageSquare size={18} />
            {tr('మిత్ర AI', 'Mitra AI', 'मित्र AI')}
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid-cards">
        <div className="metric-card metric-card-mint">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#DCFCE7', color: '#047857' }}>
            <Activity size={26} />
          </div>
          <div>
            <div className="metric-val">{screenings.length}</div>
            <div className="metric-label">
              {tr('మొత్తం స్క్రీనింగ్‌లు', 'Total Screenings Logged', 'कुल दर्ज स्क्रीनिंग')}
            </div>
          </div>
        </div>

        <div className="metric-card metric-card-blue">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8' }}>
            <AlertTriangle size={26} />
          </div>
          <div>
            <div className="metric-val">{awaitingReviewCount}</div>
            <div className="metric-label">
              {tr('PHC సమీక్ష కొరకు వేచి ఉన్నవి', 'Cases Awaiting PHC Review', 'पीएचसी समीक्षा के लिए लंबित मामले')}
            </div>
          </div>
        </div>

        <div className="metric-card metric-card-green">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#E0F2FE', color: '#0369A1' }}>
            <Clock size={26} />
          </div>
          <div>
            <div className="metric-val">{waitingQueue.length}</div>
            <div className="metric-label">
              {tr('డాక్టర్ క్యూలో వేచి ఉన్న రోగులు', 'Patients in Doctor Queue', 'डॉक्टर कतार में प्रतीक्षारत मरीज')}
            </div>
          </div>
        </div>

        <div className="metric-card metric-card-purple">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#F3E8FF', color: '#7E22CE' }}>
            <CheckCircle size={26} />
          </div>
          <div>
            <div className="metric-val">100%</div>
            <div className="metric-label">
              {tr('డేటాబేస్ పర్సిస్టెన్స్ (ACID)', 'Database Persistence (ACID)', 'डेटाबेस दृढ़ता (ACID)')}
            </div>
          </div>
        </div>
      </div>

      {/* DMHO Workforce Quick Navigation Banner */}
      {user.role === 'admin' && (
        <div style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          color: '#FFFFFF',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div>
            <div style={{ fontSize: '0.82rem', textTransform: 'uppercase', color: '#5EEAD4', fontWeight: 700, letterSpacing: '0.04em' }}>
              {tr('DMHO జిల్లా ఆరోగ్య పర్యవేక్షణ', 'DMHO Health Workforce Administration', 'डीएमएचओ जिला स्वास्थ्य कार्यबल प्रशासन')}
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '0.2rem' }}>
              {tr('అల్లూరి సీతారామరాజు జిల్లా ఆరోగ్య సిబ్బంది & పీహెచ్‌సీ కేంద్రాలు', 'ASR District Staff Directory & PHC Facilities Coverage', 'एएसआर जिला स्टाफ डायरेक्टरी और पीएचसी सुविधाएं')}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '0.2rem' }}>
              {tr('పాడేరు ITDA పరిధిలోని ఆశా వర్కర్లు, వైద్యులు మరియు పీహెచ్‌సీలను పర్యవేక్షించండి.', 'Monitor total ASHA workers, available doctors, and PHC centres across agency mandals.', 'एजेंसी मंडलों में आशा कार्यकर्ताओं, डॉक्टरों और पीएचसी की निगरानी करें।')}
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => onNavigate('reports')}
            style={{
              background: '#0D9488',
              border: 'none',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.88rem'
            }}
          >
            {tr('సిబ్బంది డైరెక్టరీ & నివేదికలు చూడండి', 'View Staff Directory & Reports', 'स्टाफ डायरेक्टरी और रिपोर्ट देखें')} →
          </button>
        </div>
      )}

      {/* Live Doctor Waiting Queue Banner if patients are waiting */}
      {waitingQueue.length > 0 && (
        <div style={{
          background: '#EFF6FF',
          border: '1.5px solid #93C5FD',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#2563EB',
              boxShadow: '0 0 0 4px rgba(37, 99, 235, 0.2)'
            }} />
            <div>
              <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#1E3A8A' }}>
                {t.doctor_patient_arrived}
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#2563EB', marginTop: '0.15rem' }}>
                {currentLang === 'te'
                  ? `${waitingQueue.length} మంది రోగులు PHC క్లినిక్‌కు హాజరై OTP ద్వారా ధృవీకరించబడి వేచి ఉన్నారు (గైర్హాజరు కాదు).`
                  : currentLang === 'hi'
                  ? `${waitingQueue.length} मरीज पीएचसी क्लीनिक में उपस्थित हैं और ओटीपी द्वारा सत्यापित हैं (उपस्थित - अनुपस्थित नहीं)।`
                  : `${waitingQueue.length} patient(s) physically verified via OTP waiting in clinic (Present - Not Absent).`}
              </p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => onNavigate('queue')}>
            {tr('డాక్టర్ క్యూ తెరవండి', 'Open Doctor Queue', 'डॉक्टर कतार खोलें')} <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Recent Screenings Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Activity size={20} color="var(--teal-primary)" />
            {tr('ఇటీవలి కమ్యూనిటీ ఓరల్ స్క్రీనింగ్‌లు', 'Recent Community Oral Screenings', 'हाल की सामुदायिक मुख स्क्रीनिंग')}
          </div>
          <button
            className="btn btn-secondary"
            style={{ minHeight: '34px', padding: '0.35rem 0.85rem' }}
            onClick={() => onNavigate(user.role === 'chw' ? 'screening' : 'phc_cases')}
          >
            {tr('అన్నీ చూడండి', 'View All', 'सभी देखें')}
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
            {tr('స్క్రీనింగ్ రికార్డులు లోడ్ అవుతున్నాయి...', 'Loading screening records...', 'स्क्रीनिंग रिकॉर्ड लोड हो रहे हैं...')}
          </div>
        ) : screenings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748B' }}>
            {tr('ఇంకా స్క్రీనింగ్‌లు నమోదు కాలేదు. ప్రారంభించడానికి కొత్త స్క్రీనింగ్ ఎంచుకోండి.', 'No screenings recorded yet. Tap "Create Screening" to begin.', 'अभी तक कोई स्क्रीनिंग दर्ज नहीं की गई है। शुरू करने के लिए "नई स्क्रीनिंग" चुनें।')}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{tr('రిఫరెన్స్ ID', 'Ref ID', 'रेफरेंस ID')}</th>
                  <th>{tr('రోగి వివరాలు', 'Patient', 'रोगी विवरण')}</th>
                  <th>{tr('నోటి భాగం / వర్గం', 'Category', 'श्रेणी / मुख भाग')}</th>
                  <th>{tr('నమోదైన లక్షణాలు', 'Reported Symptoms', 'दर्ज लक्षण')}</th>
                  <th>{tr('స్థితి', 'Status', 'स्थिति')}</th>
                  <th>{tr('సమర్పించిన సమయం', 'Submitted At', 'दर्ज करने का समय')}</th>
                </tr>
              </thead>
              <tbody>
                {screenings.slice(0, 6).map((scr) => (
                  <tr key={scr.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--teal-primary)' }}>
                        {scr.reference_id}
                      </span>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{scr.patient_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          {scr.patient_id_display} • {scr.patient_age}y / {scr.patient_gender}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                        {scr.oral_site ? scr.oral_site.replace(/_/g, ' ') : scr.category}
                      </span>
                    </td>
                    <td>
                      <div style={{ maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {scr.symptoms}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        scr.status === 'completed' || scr.status === 'consultation_recommended' ? 'badge-success' :
                        scr.status === 'under_phc_review' ? 'badge-warning' : 'badge-info'
                      }`}>
                        {scr.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748B' }}>
                      {new Date(scr.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
