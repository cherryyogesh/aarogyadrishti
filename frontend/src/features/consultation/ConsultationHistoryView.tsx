import React, { useState, useEffect } from 'react';
import {
  Clock, Video, User, Building2, Stethoscope, Search,
  CheckCircle, XCircle, AlertCircle, PhoneOff, Calendar,
  FileText, ShieldCheck, ChevronRight, X
} from 'lucide-react';
import { api } from '../../services/api';
import { ConsultationHistoryItem, User as UserType } from '../../types';

interface Props {
  user: UserType;
  onClose?: () => void;
}

export const ConsultationHistoryView: React.FC<Props> = ({ user, onClose }) => {
  const [history, setHistory] = useState<ConsultationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [recordLoading, setRecordLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getConsultationHistory({
        status_filter: statusFilter === 'all' ? undefined : statusFilter
      });
      setHistory(data);
    } catch (err) {
      console.error('Failed to load consultation history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [statusFilter]);

  const handleOpenRecord = async (cId: number) => {
    setRecordLoading(true);
    try {
      const details = await api.getConsultationDetails(cId);
      setSelectedRecord(details);
    } catch (err) {
      alert('Could not load consultation record details.');
    } finally {
      setRecordLoading(false);
    }
  };

  const filteredHistory = history.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.patient_name.toLowerCase().includes(q) ||
      (item.patient_id_display || '').toLowerCase().includes(q) ||
      item.doctor_name.toLowerCase().includes(q) ||
      (item.staff_name || '').toLowerCase().includes(q)
    );
  });

  const formatDuration = (secs: number) => {
    if (!secs || secs <= 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            background: '#DCFCE7', color: '#166534',
            fontSize: '0.74rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px'
          }}>
            <CheckCircle size={12} /> Completed
          </span>
        );
      case 'connected':
      case 'in_progress':
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            background: '#E0F2FE', color: '#0369A1',
            fontSize: '0.74rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px'
          }}>
            <Video size={12} /> Connected
          </span>
        );
      case 'declined':
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            background: '#FFE4E6', color: '#BE123C',
            fontSize: '0.74rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px'
          }}>
            <PhoneOff size={12} /> Declined
          </span>
        );
      case 'missed':
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            background: '#FEF3C7', color: '#B45309',
            fontSize: '0.74rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px'
          }}>
            <Clock size={12} /> Missed
          </span>
        );
      case 'cancelled':
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            background: '#F1F5F9', color: '#64748B',
            fontSize: '0.74rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px'
          }}>
            <XCircle size={12} /> Cancelled
          </span>
        );
      default:
        return (
          <span style={{
            background: '#F1F5F9', color: '#475569',
            fontSize: '0.74rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px'
          }}>
            {status}
          </span>
        );
    }
  };

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: '#E0F2FE', color: '#0284C7',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Video size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
              Tele-Consultation Audit History
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>
              Live and past doctor-to-patient video consultation records with server-authoritative timestamps
            </p>
          </div>
        </div>

        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
            <X size={20} />
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div style={{
        display: 'flex', gap: '1rem', flexWrap: 'wrap',
        marginBottom: '1.25rem', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '240px', maxWidth: '380px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94A3B8' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '36px', height: '36px', fontSize: '0.85rem' }}
            placeholder="Search patient, doctor, display ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Status:</span>
          {['all', 'completed', 'declined', 'missed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: '1px solid',
                borderColor: statusFilter === st ? '#0D9488' : '#E2E8F0',
                background: statusFilter === st ? '#0D9488' : '#FFFFFF',
                color: statusFilter === st ? '#FFFFFF' : '#475569',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* History Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748B' }}>
          Loading consultation records...
        </div>
      ) : filteredHistory.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748B' }}>
          No consultation records found matching filter.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Facility / Staff</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((item) => {
                const dateStr = item.created_at
                  ? new Date(item.created_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : '—';

                return (
                  <tr key={item.id}>
                    <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', color: '#334155' }}>
                      {dateStr}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>
                        {item.patient_name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                        {item.patient_id_display} • {item.patient_age}y • {item.patient_gender}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0284C7', fontSize: '0.88rem' }}>
                        {item.doctor_name}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                        {item.phc_name || 'Primary Health Centre'}
                      </div>
                      {item.staff_name && (
                        <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                          Staff: {item.staff_name}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.86rem', color: '#0F172A' }}>
                        {formatDuration(item.connected_duration_seconds)}
                      </span>
                    </td>
                    <td>
                      {renderStatusBadge(item.status)}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ minHeight: '30px', padding: '2px 8px', fontSize: '0.78rem' }}
                        onClick={() => handleOpenRecord(item.id)}
                      >
                        View Notes
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999999, padding: '1.25rem'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '18px',
            maxWidth: '620px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
            padding: '1.75rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Stethoscope size={22} color="#0D9488" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  Clinical Consultation Record
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Patient Header */}
            <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>
                {selectedRecord.patient?.full_name} ({selectedRecord.patient?.patient_id_display})
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '3px' }}>
                {selectedRecord.patient?.age} years old • {selectedRecord.patient?.gender} • {selectedRecord.patient?.village}, {selectedRecord.patient?.mandal}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#0284C7', marginTop: '3px' }}>
                Doctor: <strong>{selectedRecord.doctor?.full_name}</strong> • Connected Duration: <strong>{formatDuration(selectedRecord.connected_duration_seconds)}</strong>
              </div>
            </div>

            {/* Clinical Notes */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
                Doctor Clinical Findings:
              </label>
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: '8px', fontSize: '0.88rem', marginTop: '4px' }}>
                {selectedRecord.clinical_findings || 'No clinical observations logged.'}
              </div>
            </div>

            {selectedRecord.prescription_notes && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
                  Prescription & Treatment Notes:
                </label>
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '0.75rem', borderRadius: '8px', fontSize: '0.88rem', color: '#166534', marginTop: '4px' }}>
                  {selectedRecord.prescription_notes}
                </div>
              </div>
            )}

            {selectedRecord.referral_specialty && (
              <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', color: '#92400E' }}>
                <strong>Hospital Referral Created:</strong> Referred to {selectedRecord.referral_specialty}
              </div>
            )}

            {/* Event Audit Trail */}
            {selectedRecord.events && selectedRecord.events.length > 0 && (
              <div style={{ marginTop: '1.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>
                  Session Audit Trail ({selectedRecord.events.length} events)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {selectedRecord.events.map((ev: any) => (
                    <div key={ev.id} style={{ fontSize: '0.78rem', background: '#F8FAFC', padding: '6px 10px', borderRadius: '6px', borderLeft: '3px solid #0D9488', display: 'flex', justifyContent: 'space-between' }}>
                      <span><strong>{ev.event_type}</strong>: {ev.details || ev.new_status}</span>
                      <span style={{ color: '#94A3B8' }}>{ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedRecord(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
