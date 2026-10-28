import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, Appointment, Patient, User } from '../../types';
import {
  Calendar, Clock, UserCheck, AlertCircle, X, Check,
  RefreshCw, Trash2, Plus, Video, CheckCircle
} from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
  user: User;
  preSelectedScreening?: any | null;
  onStartConsultation?: (session: any) => void;
}

export const AppointmentsView: React.FC<Props> = ({ currentLang, user, preSelectedScreening, onStartConsultation }) => {
  const t = translations[currentLang] || translations.en;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking Modal
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | ''>(
    preSelectedScreening ? preSelectedScreening.patient_id : ''
  );
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState('11:00');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Post-booking video conference prompt
  const [bookedAppointment, setBookedAppointment] = useState<Appointment | null>(null);
  const [connectingId, setConnectingId] = useState<number | null>(null);

  // Reschedule / Cancel Modal
  const [actionApt, setActionApt] = useState<Appointment | null>(null);
  const [actionType, setActionType] = useState<'reschedule' | 'cancel' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('11:00');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const data = await api.listAppointments();
      setAppointments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    api.searchPatients().then(setPatients).catch(console.error);
    if (preSelectedScreening) {
      setShowBookModal(true);
    }
  }, [preSelectedScreening]);

  // Arrival calculation preview (30 mins prior)
  const getExpectedArrivalPreview = (timeStr: string) => {
    try {
      const [h, m] = timeStr.split(':').map(Number);
      let totalMins = h * 60 + m - 30;
      if (totalMins < 0) totalMins = 0;
      const arrH = Math.floor(totalMins / 60);
      const arrM = totalMins % 60;
      return `${String(arrH).padStart(2, '0')}:${String(arrM).padStart(2, '0')}`;
    } catch {
      return timeStr;
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    setBookingLoading(true);
    setBookingError(null);
    try {
      const created = await api.createAppointment({
        patient_id: Number(selectedPatientId),
        phc_id: user.phc_id || 1,
        doctor_id: user.role === 'doctor' ? user.id : 3, // Doctor Priya
        screening_id: preSelectedScreening ? preSelectedScreening.id : null,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        appointment_type: 'telemedicine'
      });
      setShowBookModal(false);
      setBookedAppointment(created);
      fetchAppointments();
    } catch (err: any) {
      setBookingError(err.message || 'Booking conflict or error occurred');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleJoinCall = async (apt: Appointment) => {
    setConnectingId(apt.id);
    try {
      const session = await api.acceptPatientCase(apt.id);
      if (onStartConsultation) {
        onStartConsultation(session);
      }
    } catch (err: any) {
      alert('Failed to connect video conference: ' + (err.message || 'Error occurred'));
    } finally {
      setConnectingId(null);
    }
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionApt || !actionReason.trim()) return;

    setActionLoading(true);
    try {
      if (actionType === 'reschedule') {
        await api.rescheduleAppointment(actionApt.id, {
          new_date: newDate,
          new_time: newTime,
          reason: actionReason
        });
      } else if (actionType === 'cancel') {
        await api.cancelAppointment(actionApt.id, actionReason);
      }
      setActionApt(null);
      setActionType(null);
      setActionReason('');
      fetchAppointments();
    } catch (err: any) {
      alert('Action failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{t.nav_appointments}</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
            Schedule and manage PHC tele-consultations with conflict detection and automated early-arrival notices.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowBookModal(true)}>
          <Plus size={18} />
          {t.appointment_book_title}
        </button>
      </div>

      {/* Appointments List Card */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>Loading appointment schedule...</div>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748B' }}>
            No appointments scheduled yet. Tap "Schedule Doctor Consultation" to book.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ref ID</th>
                  <th>Patient</th>
                  <th>Date & Time</th>
                  <th>Expected Arrival (30m early)</th>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt) => (
                  <tr key={apt.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--teal-primary)' }}>
                        {apt.reference_id}
                      </span>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{apt.patient_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          {apt.patient_id_display} • {apt.patient_phone_masked}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{apt.scheduled_date}</div>
                      <div style={{ fontSize: '0.8rem', color: '#475569' }}>{apt.scheduled_time}</div>
                    </td>
                    <td>
                      <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.88rem' }}>
                        {apt.expected_arrival_time}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {apt.doctor_name || 'Assigned PHC Specialist'}
                    </td>
                    <td>
                      <span className={`badge ${
                        apt.status === 'completed' ? 'badge-success' :
                        apt.status === 'waiting_for_doctor' || apt.status === 'in_consultation' ? 'badge-info' :
                        apt.status === 'cancelled' ? 'badge-danger' : 'badge-warning'
                      }`}>
                        {apt.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                          <button
                            className="btn btn-primary"
                            style={{
                              minHeight: '28px',
                              padding: '0.2rem 0.6rem',
                              fontSize: '0.74rem',
                              background: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
                              borderColor: '#0D9488',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap'
                            }}
                            disabled={connectingId === apt.id}
                            onClick={() => handleJoinCall(apt)}
                            title={currentLang === 'te' ? 'PHC రోగి మరియు డాక్టర్ మధ్య వీడియో కాన్ఫరెన్స్ ప్రారంభించండి' : 'Connect PHC clinic (patient with medical staff) to doctor video call'}
                          >
                            <Video size={13} />
                            {connectingId === apt.id
                              ? (currentLang === 'te' ? 'కనెక్ట్...' : 'Connecting...')
                              : (currentLang === 'te' ? 'వీడియో కాల్' : 'Video Call')}
                          </button>
                        )}
                        {(apt.status === 'scheduled' || apt.status === 'rescheduled') && (
                          <>
                            <button
                              className="btn btn-secondary"
                              style={{ minHeight: '28px', padding: '0.2rem 0.5rem', fontSize: '0.74rem' }}
                              onClick={() => {
                                setActionApt(apt);
                                setActionType('reschedule');
                                setNewDate(apt.scheduled_date);
                                setNewTime(apt.scheduled_time);
                                setActionReason('');
                              }}
                            >
                              <RefreshCw size={11} /> Reschedule
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ minHeight: '28px', padding: '0.2rem 0.5rem', fontSize: '0.74rem' }}
                              onClick={() => {
                                setActionApt(apt);
                                setActionType('cancel');
                                setActionReason('');
                              }}
                            >
                              <Trash2 size={11} /> Cancel
                            </button>
                          </>
                        )}
                        {apt.status === 'completed' && (
                          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>✓ Completed</span>
                        )}
                        {apt.status === 'cancelled' && (
                          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Cancelled</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Book Appointment Modal */}
      {showBookModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 60,
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{t.appointment_book_title}</h3>
              <button
                onClick={() => setShowBookModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            {bookingError && (
              <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {bookingError}
              </div>
            )}

            <form onSubmit={handleBook}>
              <div className="form-group">
                <label className="form-label">{t.screening_select_patient} *</label>
                <select
                  className="form-control"
                  required
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(Number(e.target.value))}
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.patient_id_display} • {p.full_name} ({p.phone_masked})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">{t.appointment_select_date} *</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t.appointment_select_time} *</label>
                  <input
                    type="time"
                    className="form-control"
                    required
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>

              {/* 30-min Early Arrival Notice Calculation */}
              <div style={{
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '8px',
                padding: '0.85rem',
                marginBottom: '1.5rem',
                fontSize: '0.82rem',
                color: '#065F46'
              }}>
                <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>
                  ✓ {t.appointment_arrival_notice}
                </div>
                <div>
                  Consultation at <strong>{scheduledTime}</strong> requires arrival at <strong>{getExpectedArrivalPreview(scheduledTime)}</strong>. Automated SMS will include this calculated time.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowBookModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={bookingLoading}
                >
                  {bookingLoading ? 'Checking Conflict & Booking...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule / Cancel Modal */}
      {actionApt && actionType && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 60,
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', textTransform: 'capitalize' }}>
              {actionType} Appointment: {actionApt.reference_id}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '1.25rem' }}>
              Patient: {actionApt.patient_name} ({actionApt.patient_id_display})
            </p>

            <form onSubmit={handleActionSubmit}>
              {actionType === 'reschedule' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">New Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Time *</label>
                    <input
                      type="time"
                      className="form-control"
                      required
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Documented Reason (Mandatory for Audit) *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  required
                  placeholder="Explain why this change is necessary (e.g. Doctor emergency surgery, patient requested later date)..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setActionApt(null); setActionType(null); }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn ${actionType === 'cancel' ? 'btn-danger' : 'btn-primary'}`}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Updating...' : `Confirm ${actionType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post-Booking Video Conference Connect Modal */}
      {bookedAppointment && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 70,
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '540px',
            width: '100%',
            padding: '2rem',
            boxShadow: 'var(--shadow-xl)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              backgroundColor: '#DCFCE7', color: '#166534',
              margin: '0 auto 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <CheckCircle size={36} />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
              {currentLang === 'te' ? 'అపాయింట్‌మెంట్ ఖరారైంది!' : 'Appointment Confirmed!'}
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748B', marginTop: '0.4rem', marginBottom: '1.5rem' }}>
              {currentLang === 'te'
                ? `సూచన ID: ${bookedAppointment.reference_id} • పేషెంట్: ${bookedAppointment.patient_name}`
                : `Ref ID: ${bookedAppointment.reference_id} • Patient: ${bookedAppointment.patient_name}`}
            </p>

            <div style={{
              background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)',
              border: '1px solid #A7F3D0',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'left',
              marginBottom: '1.5rem'
            }}>
              <div style={{ fontWeight: 700, color: '#065F46', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                <Video size={18} />
                {currentLang === 'te' ? 'PHC & డాక్టర్ వీడియో కాన్ఫరెన్స్' : 'PHC Clinic ⟷ Specialist Doctor Tele-Conference'}
              </div>
              <div style={{ fontSize: '0.84rem', color: '#047857', lineHeight: '1.5' }}>
                {currentLang === 'te'
                  ? 'వైద్య సిబ్బంది సమక్షంలో రోగి డాక్టర్‌తో ప్రత్యక్ష వీడియో కాన్ఫరెన్స్‌లో పాల్గొనవచ్చు. ఇప్పుడే వీడియో కాల్ ప్రారంభించండి లేదా షెడ్యూల్ ప్రకారం కనెక్ట్ అవ్వండి.'
                  : 'The patient at the PHC clinic can now engage in a live video conference with the specialist doctor in the presence of attending medical staff.'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setBookedAppointment(null)}
              >
                {currentLang === 'te' ? 'షెడ్యూల్ చూడండి' : 'View Schedule'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
                  border: 'none',
                  padding: '0.65rem 1.25rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                disabled={connectingId === bookedAppointment.id}
                onClick={() => handleJoinCall(bookedAppointment)}
              >
                <Video size={18} />
                {connectingId === bookedAppointment.id
                  ? (currentLang === 'te' ? 'కనెక్ట్ అవుతోంది...' : 'Connecting...')
                  : (currentLang === 'te' ? 'వీడియో కాల్ ప్రారంభించండి' : 'Start Video Conference Now')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
