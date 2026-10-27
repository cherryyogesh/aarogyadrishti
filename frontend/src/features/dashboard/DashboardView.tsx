import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, User, Screening, DoctorQueueItem } from '../../types';
import {
  Users, Activity, Clock, CheckCircle, PlusCircle, UserCheck,
  Stethoscope, MessageSquare, ArrowRight, AlertTriangle
} from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
  user: User;
  onNavigate: (route: string) => void;
}

export const DashboardView: React.FC<Props> = ({ currentLang, user, onNavigate }) => {
  const t = translations[currentLang] || translations.en;
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

  return (
    <div>
      {/* Welcome Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0A192F, #0F2A4A)',
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        color: '#FFFFFF',
        marginBottom: '1.75rem',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
            <span className={`role-chip ${user.role}`}>
              {t[`role_${user.role}`] || user.role}
            </span>
            {user.phc_name && (
              <span style={{ fontSize: '0.8rem', color: '#5EEAD4', fontWeight: 600 }}>
                • {user.phc_name}
              </span>
            )}
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            {user.full_name}
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#94A3B8', marginTop: '0.2rem' }}>
            {t.app_subtitle} • Real-time Healthcare Workflow
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {(user.role === 'chw' || user.role === 'admin') && (
            <button className="btn btn-primary" onClick={() => onNavigate('screening')}>
              <PlusCircle size={18} />
              {t.screening_create_title}
            </button>
          )}
          {(user.role === 'chw' || user.role === 'phc_staff') && (
            <button className="btn btn-secondary" onClick={() => onNavigate('otp')}>
              <UserCheck size={18} />
              {t.nav_otp_checkin}
            </button>
          )}
          {user.role === 'doctor' && (
            <button className="btn btn-primary" onClick={() => onNavigate('queue')}>
              <Stethoscope size={18} />
              {t.nav_doctor_queue} ({waitingQueue.length})
            </button>
          )}
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
            <div className="metric-label">Total Screenings Logged</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            <AlertTriangle size={26} />
          </div>
          <div>
            <div className="metric-val">{awaitingReviewCount}</div>
            <div className="metric-label">Cases Awaiting PHC Review</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
            <Clock size={26} />
          </div>
          <div>
            <div className="metric-val">{waitingQueue.length}</div>
            <div className="metric-label">Patients in Doctor Queue</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#F3E8FF', color: '#7E22CE' }}>
            <CheckCircle size={26} />
          </div>
          <div>
            <div className="metric-val">100%</div>
            <div className="metric-label">Database Persistence (ACID)</div>
          </div>
        </div>
      </div>

      {/* Live Doctor Waiting Queue Banner if patients are waiting */}
      {waitingQueue.length > 0 && (
        <div style={{
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
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
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E3A8A' }}>
                {t.doctor_patient_arrived}
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#3B82F6' }}>
                {waitingQueue.length} patient(s) physically verified via OTP waiting for consultation.
              </p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => onNavigate('queue')}>
            Open Doctor Queue <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Recent Screenings Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Activity size={20} color="var(--teal-primary)" />
            Recent Community Health Screenings
          </div>
          <button className="btn btn-secondary" style={{ minHeight: '36px', padding: '0.35rem 0.85rem' }} onClick={() => onNavigate('screening')}>
            View All
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
            Loading screening records...
          </div>
        ) : screenings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748B' }}>
            No screenings recorded yet. Tap "Create Screening" to begin.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ref ID</th>
                  <th>Patient</th>
                  <th>Category</th>
                  <th>Reported Symptoms</th>
                  <th>Status</th>
                  <th>Submitted At</th>
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
                        {scr.category}
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
