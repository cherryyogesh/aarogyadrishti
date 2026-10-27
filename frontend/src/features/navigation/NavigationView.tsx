import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { NavigationTask, User } from '../../types';

interface NavigationViewProps {
  currentUser: User;
}

export const NavigationView: React.FC<NavigationViewProps> = ({ currentUser }) => {
  const [tasks, setTasks] = useState<NavigationTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMandal, setFilterMandal] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [selectedTask, setSelectedTask] = useState<NavigationTask | null>(null);
  const [updating, setUpdating] = useState<boolean>(false);

  // Update modal state
  const [editStatus, setEditStatus] = useState<string>('contacted');
  const [editContactCount, setEditContactCount] = useState<number>(1);
  const [editTransportArranged, setEditTransportArranged] = useState<boolean>(false);
  const [editFeederAmbulance, setEditFeederAmbulance] = useState<boolean>(false);
  const [editMissedReason, setEditMissedReason] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.listNavigationTasks({
        mandal: filterMandal !== 'all' ? filterMandal : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
      });
      setTasks(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load navigation tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [filterMandal, filterStatus]);

  const handleOpenEdit = (task: NavigationTask) => {
    setSelectedTask(task);
    setEditStatus(task.status);
    setEditContactCount(task.contact_attempts_count || 1);
    setEditTransportArranged(task.transport_support_arranged || false);
    setEditFeederAmbulance(task.feeder_ambulance_notified || false);
    setEditMissedReason(task.missed_visit_reason || '');
    setEditNotes(task.notes || '');
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    try {
      setUpdating(true);
      await api.updateNavigationTask(selectedTask.id, {
        status: editStatus,
        contact_attempts_count: editContactCount,
        transport_support_arranged: editTransportArranged,
        feeder_ambulance_notified: editFeederAmbulance,
        missed_visit_reason: editMissedReason || undefined,
        notes: editNotes,
      });
      setSelectedTask(null);
      await loadTasks();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-warning">⏳ Follow-up Pending</span>;
      case 'contacted':
        return <span className="badge badge-info">📞 Patient Contacted</span>;
      case 'transport_arranged':
        return <span className="badge badge-primary">🚑 108 Ambulance Arranged</span>;
      case 'attended':
        return <span className="badge badge-success">🏥 Attended Hospital</span>;
      case 'missed_escalated':
        return <span className="badge badge-danger">🚨 Missed & Escalated</span>;
      case 'completed':
        return <span className="badge badge-success">✅ Care Linked</span>;
      default:
        return <span className="badge badge-outline">{status}</span>;
    }
  };

  return (
    <div className="navigation-container" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #134e4a 0%, #042f2e 100%)',
        color: '#fff',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{
              background: '#2dd4bf',
              color: '#042f2e',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Module I • ITDA Tribal Care Continuum
            </span>
            <h2 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1.5rem', fontWeight: 700 }}>
              ట్రైబల్ పేషెంట్ నావిగేషన్ & ఫాలో-అప్ (Patient Navigation)
            </h2>
            <p style={{ margin: 0, color: '#99f6e4', fontSize: '0.9rem' }}>
              Ensuring no tribal patient is lost between referral, biopsy, and cancer treatment in Alluri Sitharama Raju District.
            </p>
          </div>
          <button
            onClick={loadTasks}
            style={{
              background: '#115e59',
              border: 'none',
              color: '#fff',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            🔄 Refresh Queue
          </button>
        </div>

        {/* Feature summary highlights */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: '#99f6e4' }}>Feeder Ambulance 108</div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Tribal Hill Escort Support</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: '#99f6e4' }}>ASR District Coverage</div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>G. Madugula • Paderu • Araku</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: '#99f6e4' }}>Loss-to-Follow-up</div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Zero Drop-off Protocol</div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        marginBottom: '1.5rem',
        background: '#fff',
        padding: '1rem',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
            Filter by Mandal (మండలం)
          </label>
          <select
            value={filterMandal}
            onChange={e => setFilterMandal(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="all">All Mandals (అన్ని మండలాలు)</option>
            <option value="G. Madugula">G. Madugula (జి. మాడుగుల)</option>
            <option value="Paderu">Paderu (పాడేరు)</option>
            <option value="Araku Valley">Araku Valley (అరకు లోయ)</option>
            <option value="Chintapalli">Chintapalli (చింతపల్లి)</option>
          </select>
        </div>

        <div style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
            Filter by Status (స్థితి)
          </label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="contacted">Contacted</option>
            <option value="transport_arranged">Transport Arranged</option>
            <option value="attended">Attended</option>
            <option value="missed_escalated">Missed / Escalated</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          Loading tribal navigation queue...
        </div>
      )}

      {error && (
        <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Tasks List */}
      {!loading && tasks.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          background: '#fff',
          borderRadius: '12px',
          border: '1px dashed #cbd5e1',
          color: '#64748b'
        }}>
          No navigation tasks found matching filter.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
        {tasks.map(task => (
          <div
            key={task.id}
            style={{
              background: '#fff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '1.25rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{task.task_ref}</span>
                {getStatusBadge(task.status)}
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontWeight: 600, fontSize: '1.05rem', color: '#1e293b' }}>
                  {task.patient_name} <span style={{ color: '#64748b', fontSize: '0.85rem' }}>({task.patient_id_display})</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  📍 {task.habitation || 'Tribal Village'}, {task.mandal} • 📞 {task.patient_phone_masked}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ color: '#64748b' }}>Task Goal:</span>
                  <strong>{task.task_type.replace(/_/g, ' ').toUpperCase()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ color: '#64748b' }}>Contact Attempts:</span>
                  <span style={{ fontWeight: 600 }}>{task.contact_attempts_count} calls/visits</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>108 Feeder Ambulance:</span>
                  <span style={{ color: task.feeder_ambulance_notified ? '#16a34a' : '#94a3b8', fontWeight: 600 }}>
                    {task.feeder_ambulance_notified ? '✓ Dispatched / Notified' : 'Not Requested'}
                  </span>
                </div>
              </div>

              {task.notes && (
                <div style={{ fontSize: '0.85rem', color: '#334155', fontStyle: 'italic', marginBottom: '0.75rem' }}>
                  "{task.notes}"
                </div>
              )}

              {task.missed_visit_reason && (
                <div style={{ padding: '0.5rem', background: '#fef2f2', borderLeft: '3px solid #ef4444', borderRadius: '4px', fontSize: '0.8rem', color: '#991b1b', marginBottom: '0.75rem' }}>
                  <strong>Missed Reason:</strong> {task.missed_visit_reason}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Navigator: {task.navigator_name || 'Unassigned'}
              </span>
              <button
                onClick={() => handleOpenEdit(task)}
                style={{
                  background: '#0d9488',
                  color: '#fff',
                  border: 'none',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Log Contact & Transport
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Update Navigation Modal */}
      {selectedTask && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            maxWidth: '550px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                ట్రైబల్ ఫాలో-అప్ అప్‌డేట్ (Update Navigation)
              </h3>
              <button
                onClick={() => setSelectedTask(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
              <div><strong>Task Ref:</strong> {selectedTask.task_ref}</div>
              <div><strong>Patient:</strong> {selectedTask.patient_name} ({selectedTask.habitation}, {selectedTask.mandal})</div>
            </div>

            <form onSubmit={handleSaveTask}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Navigation Status (నావిగేషన్ స్థితి)
                </label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="pending">Pending (వేచి ఉంది)</option>
                  <option value="contacted">Contacted Patient (సంప్రదించబడింది)</option>
                  <option value="transport_arranged">Transport Arranged (రవాణా సిద్ధం చేయబడింది)</option>
                  <option value="attended">Attended Hospital (ఆసుపత్రికి చేరుకున్నారు)</option>
                  <option value="missed_escalated">Missed Visit / Escalated (రాలేకపోయారు / ఉన్నతాధికారుల సమాచారం)</option>
                  <option value="completed">Completed Care Linkage (చికిత్స ప్రారంభమైంది)</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Contact Attempts Count (సంప్రదింపు ప్రయత్నాల సంఖ్య)
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={editContactCount}
                  onChange={e => setEditContactCount(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editTransportArranged}
                    onChange={e => setEditTransportArranged(e.target.checked)}
                  />
                  <span>Transport Support Arranged (గిరిజన ప్రాంత ప్రయాణ సదుపాయం కల్పించబడింది)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editFeederAmbulance}
                    onChange={e => setEditFeederAmbulance(e.target.checked)}
                  />
                  <span>ITDA 108 Feeder Ambulance Coordinated (ఫీడర్ అంబులెన్స్ రిజర్వ్ చేయబడింది)</span>
                </label>
              </div>

              {editStatus === 'missed_escalated' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#b91c1c', marginBottom: '0.25rem' }}>
                    Reason for Missed Visit (రాలేకపోవడానికి కారణం)
                  </label>
                  <input
                    type="text"
                    value={editMissedReason}
                    onChange={e => setEditMissedReason(e.target.value)}
                    placeholder="e.g. Inaccessible hill road due to rain / Shandy day / Family illness"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #fca5a5' }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Navigator Notes & Escort Details (గమనికలు)
                </label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Record interaction with patient, family, or ASHA..."
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  style={{
                    padding: '0.6rem 1.2rem',
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  style={{
                    padding: '0.6rem 1.2rem',
                    background: '#0d9488',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {updating ? 'Saving...' : 'Save Navigation Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
