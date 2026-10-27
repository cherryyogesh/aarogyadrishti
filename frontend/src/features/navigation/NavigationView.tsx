import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { NavigationTask, User, LanguageCode } from '../../types';

interface NavigationViewProps {
  currentUser: User;
  currentLang?: LanguageCode;
}

export const NavigationView: React.FC<NavigationViewProps> = ({ currentUser, currentLang = 'en' }) => {
  const isTe = currentLang === 'te';
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
      setError(err.message || (isTe ? 'నావిగేషన్ టాస్క్‌లను లోడ్ చేయడం విఫలమైంది' : 'Failed to load navigation tasks'));
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
      alert(`${isTe ? 'నవీకరణ విఫలమైంది' : 'Update failed'}: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-warning">{isTe ? '⏳ ఫాలో-అప్ పెండింగ్' : '⏳ Follow-up Pending'}</span>;
      case 'contacted':
        return <span className="badge badge-info">{isTe ? '📞 రోగిని సంప్రదించారు' : '📞 Patient Contacted'}</span>;
      case 'transport_arranged':
        return <span className="badge badge-primary">{isTe ? '🚑 108 అంబులెన్స్ సిద్ధం' : '🚑 108 Ambulance Arranged'}</span>;
      case 'attended':
        return <span className="badge badge-success">{isTe ? '🏥 ఆసుపత్రికి హాజరయ్యారు' : '🏥 Attended Hospital'}</span>;
      case 'missed_escalated':
        return <span className="badge badge-danger">{isTe ? '🚨 రాలేదు & నివేదించబడింది' : '🚨 Missed & Escalated'}</span>;
      case 'completed':
        return <span className="badge badge-success">{isTe ? '✅ సంరక్షణ అనుసంధానించబడింది' : '✅ Care Linked'}</span>;
      default:
        return <span className="badge badge-outline">{status}</span>;
    }
  };

  return (
    <div className="navigation-container" style={{ width: '100%' }}>
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
              {isTe ? 'మాడ్యూల్ I • ITDA గిరిజన ఆరోగ్య రక్షణ సమన్వయం' : 'Module I • ITDA Tribal Care Continuum'}
            </span>
            <h2 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1.5rem', fontWeight: 700 }}>
              {isTe ? 'గిరిజన రోగుల నావిగేషన్ & ఫాలో-అప్' : 'Tribal Patient Navigation & Follow-Up'}
            </h2>
            <p style={{ margin: 0, color: '#99f6e4', fontSize: '0.9rem' }}>
              {isTe
                ? 'అల్లూరి సీతారామరాజు జిల్లాలో రిఫరల్, బయాప్సీ మరియు క్యాన్సర్ చికిత్సలో ఏ ఒక్క గిరిజన రోగి కూడా దూరం కాకుండా పర్యవేక్షణ.'
                : 'Ensuring no tribal patient is lost between referral, biopsy, and cancer treatment in Alluri Sitharama Raju District.'}
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
            {isTe ? '🔄 క్యూ రిఫ్రెష్' : '🔄 Refresh Queue'}
          </button>
        </div>

        {/* Feature summary highlights */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: '#99f6e4' }}>
              {isTe ? 'ఫీడర్ అంబులెన్స్ 108' : 'Feeder Ambulance 108'}
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>
              {isTe ? 'గిరిజన కొండ ప్రాంత రవాణా సహాయం' : 'Tribal Hill Escort Support'}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: '#99f6e4' }}>
              {isTe ? 'ASR జిల్లా పరిధి' : 'ASR District Coverage'}
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>G. Madugula • Paderu • Araku</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: '#99f6e4' }}>
              {isTe ? 'డ్రాప్-అవుట్ నివారణ' : 'Loss-to-Follow-up'}
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>
              {isTe ? 'సున్నా డ్రాప్-అవుట్ ప్రోటోకాల్' : 'Zero Drop-off Protocol'}
            </div>
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
            {isTe ? 'మండలం వారీగా ఫిల్టర్' : 'Filter by Mandal'}
          </label>
          <select
            value={filterMandal}
            onChange={e => setFilterMandal(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="all">{isTe ? 'అన్ని మండలాలు' : 'All Mandals'}</option>
            <option value="G. Madugula">{isTe ? 'జి. మాడుగుల' : 'G. Madugula'}</option>
            <option value="Paderu">{isTe ? 'పాడేరు' : 'Paderu'}</option>
            <option value="Araku Valley">{isTe ? 'అరకు లోయ' : 'Araku Valley'}</option>
            <option value="Chintapalli">{isTe ? 'చింతపల్లి' : 'Chintapalli'}</option>
          </select>
        </div>

        <div style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
            {isTe ? 'స్థితి వారీగా ఫిల్టర్' : 'Filter by Status'}
          </label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="all">{isTe ? 'అన్ని స్థితులు' : 'All Statuses'}</option>
            <option value="pending">{isTe ? 'వేచి ఉంది' : 'Pending'}</option>
            <option value="contacted">{isTe ? 'సంప్రదించబడింది' : 'Contacted'}</option>
            <option value="transport_arranged">{isTe ? 'రవాణా సిద్ధం చేయబడింది' : 'Transport Arranged'}</option>
            <option value="attended">{isTe ? 'ఆసుపత్రికి చేరుకున్నారు' : 'Attended'}</option>
            <option value="missed_escalated">{isTe ? 'రాలేకపోయారు / ఉన్నతాధికారుల సమాచారం' : 'Missed / Escalated'}</option>
            <option value="completed">{isTe ? 'చికిత్స ప్రారంభమైంది' : 'Completed'}</option>
          </select>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          {isTe ? 'గిరిజన నావిగేషన్ క్యూ లోడ్ అవుతోంది...' : 'Loading tribal navigation queue...'}
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
          {isTe ? 'ఎంచుకున్న ఫిల్టర్‌కు సరిపోలే నావిగేషన్ టాస్క్‌లు లేవు.' : 'No navigation tasks found matching filter.'}
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
                  📍 {task.habitation || (isTe ? 'గిరిజన గ్రామం' : 'Tribal Village')}, {task.mandal} • 📞 {task.patient_phone_masked}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ color: '#64748b' }}>{isTe ? 'లక్ష్యం:' : 'Task Goal:'}</span>
                  <strong>{task.task_type.replace(/_/g, ' ').toUpperCase()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ color: '#64748b' }}>{isTe ? 'సంప్రదింపు ప్రయత్నాలు:' : 'Contact Attempts:'}</span>
                  <span style={{ fontWeight: 600 }}>{task.contact_attempts_count} {isTe ? 'సార్లు' : 'calls/visits'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>{isTe ? '108 ఫీడర్ అంబులెన్స్:' : '108 Feeder Ambulance:'}</span>
                  <span style={{ color: task.feeder_ambulance_notified ? '#16a34a' : '#94a3b8', fontWeight: 600 }}>
                    {task.feeder_ambulance_notified
                      ? (isTe ? '✓ పంపబడింది / సమాచారం ఇవ్వబడింది' : '✓ Dispatched / Notified')
                      : (isTe ? 'అభ్యర్థించలేదు' : 'Not Requested')}
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
                  <strong>{isTe ? 'రాలేకపోవడానికి కారణం:' : 'Missed Reason:'}</strong> {task.missed_visit_reason}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {isTe ? 'నావిగేటర్:' : 'Navigator:'} {task.navigator_name || (isTe ? 'కేటాయించలేదు' : 'Unassigned')}
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
                {isTe ? 'సంప్రదింపు & రవాణా నమోదు' : 'Log Contact & Transport'}
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
                {isTe ? 'గిరిజన ఫాలో-అప్ అప్‌డేట్' : 'Update Navigation Task'}
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
                  {isTe ? 'నావిగేషన్ స్థితి' : 'Navigation Status'}
                </label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="pending">{isTe ? 'వేచి ఉంది' : 'Pending'}</option>
                  <option value="contacted">{isTe ? 'రోగిని సంప్రదించారు' : 'Contacted Patient'}</option>
                  <option value="transport_arranged">{isTe ? 'రవాణా సిద్ధం చేయబడింది' : 'Transport Arranged'}</option>
                  <option value="attended">{isTe ? 'ఆసుపత్రికి హాజరయ్యారు' : 'Attended Hospital'}</option>
                  <option value="missed_escalated">{isTe ? 'రాలేకపోయారు / ఉన్నతాధికారుల సమాచారం' : 'Missed Visit / Escalated'}</option>
                  <option value="completed">{isTe ? 'చికిత్స ప్రారంభమైంది' : 'Completed Care Linkage'}</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  {isTe ? 'సంప్రదింపు ప్రయత్నాల సంఖ్య' : 'Contact Attempts Count'}
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
                  <span>
                    {isTe ? 'గిరిజన ప్రాంత ప్రయాణ సదుపాయం కల్పించబడింది' : 'Tribal Transport Support Arranged'}
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editFeederAmbulance}
                    onChange={e => setEditFeederAmbulance(e.target.checked)}
                  />
                  <span>
                    {isTe ? 'ITDA 108 ఫీడర్ అంబులెన్స్ సమన్వయం చేయబడింది' : 'ITDA 108 Feeder Ambulance Coordinated'}
                  </span>
                </label>
              </div>

              {editStatus === 'missed_escalated' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#b91c1c', marginBottom: '0.25rem' }}>
                    {isTe ? 'రాలేకపోవడానికి కారణం' : 'Reason for Missed Visit'}
                  </label>
                  <input
                    type="text"
                    value={editMissedReason}
                    onChange={e => setEditMissedReason(e.target.value)}
                    placeholder={isTe ? 'ఉదా: వర్షాల వల్ల కొండ రహదారి మూసివేత / సంత రోజు / కుటుంబ అనారోగ్యం' : 'e.g. Inaccessible hill road due to rain / Shandy day / Family illness'}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #fca5a5' }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  {isTe ? 'నావిగేటర్ గమనికలు & వివరాలు' : 'Navigator Notes & Escort Details'}
                </label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder={isTe ? 'రోగి, కుటుంబం లేదా ఆశాతో మాట్లాడిన వివరాలు నమోదు చేయండి...' : 'Record interaction with patient, family, or ASHA...'}
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
                  {isTe ? 'రద్దు' : 'Cancel'}
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
                  {updating
                    ? (isTe ? 'భద్రపరుస్తోంది...' : 'Saving...')
                    : (isTe ? 'నావిగేషన్ రికార్డును భద్రపరచండి' : 'Save Navigation Record')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
