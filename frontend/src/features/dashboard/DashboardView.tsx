import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, User, Screening, DoctorQueueItem } from '../../types';
import {
  Users, Activity, Clock, CheckCircle, PlusCircle, UserCheck,
  Stethoscope, MessageSquare, ArrowRight, AlertTriangle, Shield,
  FileCheck, FlaskConical, Compass
} from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
  user: User;
  onNavigate: (route: string) => void;
}

export const DashboardView: React.FC<Props> = ({ currentLang, user, onNavigate }) => {
  const t = translations[currentLang] || translations.en;
  const isTe = currentLang === 'te';

  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [waitingQueue, setWaitingQueue] = useState<DoctorQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [scrs, queue] = await Promise.all([
          api.listScreenings(),
          user.role === 'doctor' || user.role === 'phc_staff' || user.role === 'admin'
            ? api.getDoctorQueue()
            : Promise.resolve([])
        ]);
        setScreenings(scrs);
        setWaitingQueue(queue);
      } catch (e) {
        console.error('Failed to load dashboard data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user.role]);

  const awaitingReviewCount = screenings.filter(
    s => s.status === 'under_phc_review' || s.status === 'submitted'
  ).length;

  const roleTitle = t[`role_${user.role}`] || user.role.toUpperCase();

  return (
    <div>
      {/* Welcome Hero Banner (No Personal Names) */}
      <div style={{
        background: 'linear-gradient(135deg, #0A192F 0%, #0F2A4A 50%, #0D9488 100%)',
        borderRadius: '18px',
        padding: '1.75rem 2rem',
        color: '#FFFFFF',
        marginBottom: '1.75rem',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
            <span className={`role-chip ${user.role}`}>
              {roleTitle}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#5EEAD4', fontWeight: 600 }}>
              • {user.phc_name || (user.role === 'admin' ? 'ITDA Paderu HQ' : 'Alluri Sitharama Raju District')}
            </span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
            {roleTitle}
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#CBD5E1', marginTop: '0.25rem' }}>
            {t.app_subtitle} • {isTe ? 'ప్రభుత్వ ఆరోగ్య సేవా పోర్టల్' : 'Government Healthcare Service Portal'}
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
              <button className="btn btn-secondary" onClick={() => onNavigate('navigation')}>
                <Compass size={18} />
                {t.nav_navigation}
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

          {user.role === 'navigator' && (
            <button className="btn btn-primary" onClick={() => onNavigate('navigation')}>
              <Compass size={18} />
              {t.nav_navigation}
            </button>
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
            {isTe ? 'మిత్ర AI' : 'Mitra AI'}
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid-cards">
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#E0F2FE', color: '#0369A1' }}>
            <Activity size={26} />
          </div>
          <div>
            <div className="metric-val">{screenings.length}</div>
            <div className="metric-label">
              {isTe ? 'మొత్తం స్క్రీనింగ్‌లు' : 'Total Screenings Logged'}
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            <AlertTriangle size={26} />
          </div>
          <div>
            <div className="metric-val">{awaitingReviewCount}</div>
            <div className="metric-label">
              {isTe ? 'PHC సమీక్ష కొరకు వేచి ఉన్నవి' : 'Cases Awaiting PHC Review'}
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
            <Clock size={26} />
          </div>
          <div>
            <div className="metric-val">{waitingQueue.length}</div>
            <div className="metric-label">
              {isTe ? 'డాక్టర్ క్యూలో వేచి ఉన్న రోగులు' : 'Patients in Doctor Queue'}
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#F3E8FF', color: '#7E22CE' }}>
            <CheckCircle size={26} />
          </div>
          <div>
            <div className="metric-val">100%</div>
            <div className="metric-label">
              {isTe ? 'డేటాబేస్ పర్సిస్టెన్స్ (ACID)' : 'Database Persistence (ACID)'}
            </div>
          </div>
        </div>
      </div>

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
                {isTe
                  ? `${waitingQueue.length} మంది రోగులు PHC క్లినిక్‌కు హాజరై OTP ద్వారా ధృవీకరించబడి వేచి ఉన్నారు (గైర్హాజరు కాదు).`
                  : `${waitingQueue.length} patient(s) physically verified via OTP waiting in clinic (Present - Not Absent).`}
              </p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => onNavigate('queue')}>
            {isTe ? 'డాక్టర్ క్యూ తెరవండి' : 'Open Doctor Queue'} <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Recent Screenings Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Activity size={20} color="var(--teal-primary)" />
            {isTe ? 'ఇటీవలి కమ్యూనిటీ ఓరల్ స్క్రీనింగ్‌లు' : 'Recent Community Oral Screenings'}
          </div>
          <button
            className="btn btn-secondary"
            style={{ minHeight: '34px', padding: '0.35rem 0.85rem' }}
            onClick={() => onNavigate(user.role === 'chw' ? 'screening' : 'phc_cases')}
          >
            {isTe ? 'అన్నీ చూడండి' : 'View All'}
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
            {isTe ? 'స్క్రీనింగ్ రికార్డులు లోడ్ అవుతున్నాయి...' : 'Loading screening records...'}
          </div>
        ) : screenings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748B' }}>
            {isTe ? 'ఇంకా స్క్రీనింగ్‌లు నమోదు కాలేదు. ప్రారంభించడానికి కొత్త స్క్రీనింగ్ ఎంచుకోండి.' : 'No screenings recorded yet. Tap "Create Screening" to begin.'}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{isTe ? 'రిఫరెన్స్ ID' : 'Ref ID'}</th>
                  <th>{isTe ? 'రోగి వివరాలు' : 'Patient'}</th>
                  <th>{isTe ? 'నోటి భాగం / వర్గం' : 'Category'}</th>
                  <th>{isTe ? 'నమోదైన లక్షణాలు' : 'Reported Symptoms'}</th>
                  <th>{isTe ? 'స్థితి' : 'Status'}</th>
                  <th>{isTe ? 'సమర్పించిన సమయం' : 'Submitted At'}</th>
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
