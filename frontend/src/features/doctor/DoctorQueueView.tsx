import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, DoctorQueueItem, User } from '../../types';
import {
  Clock, Stethoscope, Video, CheckCircle, RefreshCw, AlertCircle,
  ArrowRight, UserCheck
} from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
  user: User;
  onAcceptCase: (session: any) => void;
}

export const DoctorQueueView: React.FC<Props> = ({ currentLang, user, onAcceptCase }) => {
  const t = translations[currentLang] || translations.en;
  const [queue, setQueue] = useState<DoctorQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  const fetchQueue = async () => {
    try {
      const data = await api.getDoctorQueue();
      setQueue(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Auto-refresh queue every 10 seconds
    const interval = setInterval(fetchQueue, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (appointmentId: number) => {
    setAcceptingId(appointmentId);
    try {
      const session = await api.acceptPatientCase(appointmentId);
      onAcceptCase(session);
    } catch (err: any) {
      alert('Failed to accept case: ' + err.message);
      setAcceptingId(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{t.doctor_queue_title}</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
            Live doctor waiting queue showing patients physically present and verified at PHCs.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={fetchQueue}>
          <RefreshCw size={16} /> Refresh Queue
        </button>
      </div>

      {/* Prominent Active Arrival Status Notice */}
      <div style={{
        background: 'linear-gradient(135deg, #1E3A8A, #1E40AF)',
        borderRadius: '12px',
        padding: '1.25rem 1.75rem',
        color: '#FFFFFF',
        marginBottom: '1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <UserCheck size={24} color="#67E8F9" />
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {t.doctor_patient_arrived}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#BFDBFE', marginTop: '0.2rem' }}>
              Real-time synchronization active. Notification failure will never undo a verified check-in.
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          fontWeight: 700,
          fontSize: '1rem',
          color: '#5EEAD4'
        }}>
          {queue.length} Waiting
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
            Polling live waiting queue...
          </div>
        ) : queue.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#64748B' }}>
            <Clock size={36} style={{ margin: '0 auto 0.75rem', color: '#CBD5E1' }} />
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#334155' }}>
              Queue is currently clear
            </div>
            <p style={{ fontSize: '0.82rem', marginTop: '0.35rem' }}>
              When a patient arrives at the PHC and completes OTP check-in, they will appear here instantly.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Patient Name</th>
                  <th>PHC Centre</th>
                  <th>Scheduled Slot</th>
                  <th>Waiting Duration</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => (
                  <tr key={item.appointment_id} style={{
                    backgroundColor: item.status === 'in_consultation' ? '#F0FDF4' : 'transparent'
                  }}>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--teal-primary)' }}>
                        {item.patient_id_display}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{item.patient_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                        {item.patient_age}y • {item.patient_gender}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>{item.phc_name}</td>
                    <td style={{ fontWeight: 600 }}>{item.scheduled_time}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#B45309', fontWeight: 700 }}>
                        <Clock size={14} />
                        {item.waiting_minutes} mins
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                        {item.screening_category || 'General'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${item.status === 'in_consultation' ? 'badge-success' : 'badge-warning'}`}>
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-primary"
                        style={{ minHeight: '36px', padding: '0.35rem 0.85rem', fontSize: '0.82rem' }}
                        disabled={acceptingId === item.appointment_id}
                        onClick={() => handleAccept(item.appointment_id)}
                      >
                        <Video size={14} />
                        {acceptingId === item.appointment_id
                          ? 'Connecting Room...'
                          : item.status === 'in_consultation'
                          ? 'Re-enter Room'
                          : t.doctor_accept_btn}
                      </button>
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
