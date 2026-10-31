import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, Patient, User } from '../../types';
import { ASR_DISTRICT_MANDALS } from '../../constants/mandals';
import { networkStatus } from '../../services/networkStatus';
import { offlineStorage } from '../../services/offlineStorage';
import { Search, UserPlus, Phone, ShieldCheck, X, FileText, Calendar, WifiOff } from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
  user: User;
}

export const PatientsView: React.FC<Props> = ({ currentLang, user }) => {
  const t = translations[currentLang] || translations.en;
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() => networkStatus.isOnline());

  // New Patient Form State
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState(30);
  const [gender, setGender] = useState('Female');
  const [phone, setPhone] = useState('+91 ');
  const [preferredLang, setPreferredLang] = useState('te');
  const [village, setVillage] = useState('');
  const [mandal, setMandal] = useState(ASR_DISTRICT_MANDALS[0].name);
  const [consentGranted, setConsentGranted] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);

  const fetchPatients = async (q = '') => {
    setLoading(true);
    try {
      if (networkStatus.isOnline()) {
        const data = await api.searchPatients(q);
        offlineStorage.cachePatients(data);
        const offlinePatients = offlineStorage.getOfflinePatients();
        const merged = q
          ? [...offlinePatients.filter(p => p.full_name.toLowerCase().includes(q.toLowerCase()) || p.phone.includes(q)), ...data]
          : [...offlinePatients, ...data];
        setPatients(merged);
      } else {
        const data = offlineStorage.getAllPatients(q);
        setPatients(data);
      }
    } catch (e) {
      console.warn('Network query failed, loading offline patient cache:', e);
      const data = offlineStorage.getAllPatients(q);
      setPatients(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = networkStatus.subscribe((online) => {
      setIsOnline(online);
      fetchPatients(searchQuery);
    });

    const handleSyncComplete = () => {
      fetchPatients(searchQuery);
    };
    window.addEventListener('aarogya-sync-complete', handleSyncComplete);

    return () => {
      unsub();
      window.removeEventListener('aarogya-sync-complete', handleSyncComplete);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(searchQuery);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setRegisterError(null);

    const isCurrentOnline = networkStatus.isOnline();
    if (!isCurrentOnline) {
      // Offline registration flow - works 100% offline
      const offlineP = offlineStorage.saveOfflinePatient({
        full_name: fullName,
        age: Number(age),
        gender,
        phone,
        preferred_language: preferredLang,
        village_town: village,
        habitation: village,
        mandal: mandal,
        phc_id: user.phc_id || 1,
        consent_granted: consentGranted,
        consent_notes: 'Digital informed consent confirmed with patient (Offline Field Mode)'
      });

      setShowRegisterModal(false);
      setFullName('');
      setPhone('+91 ');
      setVillage('');
      setOfflineNotice(`✅ Patient "${offlineP.full_name}" registered locally in Offline Mode. Record queued for cloud sync.`);
      setTimeout(() => setOfflineNotice(null), 6000);
      fetchPatients(searchQuery);
      setSubmitting(false);
      return;
    }

    try {
      const newP = await api.registerPatient({
        full_name: fullName,
        age: Number(age),
        gender,
        phone,
        preferred_language: preferredLang,
        village_town: village,
        habitation: village,
        mandal: mandal,
        phc_id: user.phc_id || 1,
        consent_granted: consentGranted,
        consent_notes: 'Digital informed consent confirmed with patient'
      });
      setShowRegisterModal(false);
      // Reset form
      setFullName('');
      setPhone('+91 ');
      setVillage('');
      fetchPatients();
    } catch (err: any) {
      // Automatic fallback to offline storage on network error
      console.warn('Server registration failed, saving offline:', err);
      const offlineP = offlineStorage.saveOfflinePatient({
        full_name: fullName,
        age: Number(age),
        gender,
        phone,
        preferred_language: preferredLang,
        village_town: village,
        habitation: village,
        mandal: mandal,
        phc_id: user.phc_id || 1,
        consent_granted: consentGranted,
        consent_notes: 'Digital informed consent confirmed with patient (Offline Fallback)'
      });
      setShowRegisterModal(false);
      setFullName('');
      setPhone('+91 ');
      setVillage('');
      setOfflineNotice(`✅ Patient "${offlineP.full_name}" saved safely to device storage in Offline Mode.`);
      setTimeout(() => setOfflineNotice(null), 6000);
      fetchPatients(searchQuery);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDetail = async (p: Patient) => {
    try {
      const detail = await api.getPatientDetail(p.id);
      setSelectedPatient(detail);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      {/* Offline Status Banner */}
      {!isOnline && (
        <div style={{
          background: '#FEF3C7',
          border: '1px solid #F59E0B',
          borderRadius: '12px',
          padding: '0.85rem 1.25rem',
          color: '#92400E',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <WifiOff size={20} color="#D97706" />
          <div style={{ fontSize: '0.86rem' }}>
            <strong>Field Offline Mode:</strong> Community patient registrations work completely offline and save safely to this device. When online connectivity is detected, pending records will sync automatically. (AI works online).
          </div>
        </div>
      )}

      {/* Success Notification */}
      {offlineNotice && (
        <div style={{
          background: '#DCFCE7',
          border: '1px solid #22C55E',
          borderRadius: '12px',
          padding: '0.85rem 1.25rem',
          color: '#166534',
          marginBottom: '1.25rem',
          fontSize: '0.88rem',
          fontWeight: 600
        }}>
          {offlineNotice}
        </div>
      )}

      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{t.nav_patients}</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748B' }}>Search registered community members or enroll a new patient.</p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowRegisterModal(true)}>
          <UserPlus size={18} />
          {t.patient_register_btn}
        </button>
      </div>

      {/* Search Input */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94A3B8' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '38px' }}
              placeholder={t.patient_search_placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>
      </div>

      {/* Patients Table */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>Searching patient database...</div>
        ) : patients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748B' }}>
            No patients found matching your search.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Full Name</th>
                  <th>Age / Gender</th>
                  <th>Masked Phone</th>
                  <th>Language</th>
                  <th>Village / Town</th>
                  <th>PHC</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => {
                  const isOfflinePatient = p.id < 0;
                  const displayId = isOfflinePatient
                    ? `TEMP-PAT-${Math.abs(p.id).toString().slice(-4)}`
                    : (p.patient_id_display || `PAT-2026-${String(p.id).padStart(4, '0')}`);

                  return (
                    <tr key={p.id}>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--teal-primary)' }}>
                          {displayId}
                        </span>
                        {isOfflinePatient && (
                          <span style={{
                            display: 'inline-block',
                            marginLeft: '6px',
                            background: '#FEF3C7',
                            color: '#92400E',
                            fontSize: '0.68rem',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontWeight: 700
                          }}>
                            📶 Offline
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.full_name}</td>
                      <td>{p.age}y • {p.gender}</td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#475569' }}>
                        {p.phone_masked}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ textTransform: 'uppercase' }}>
                        {p.preferred_language}
                      </span>
                    </td>
                    <td>{p.village_town || '—'}</td>
                    <td style={{ fontSize: '0.82rem', color: '#475569' }}>{p.phc_name || 'Kandukur PHC'}</td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ minHeight: '32px', padding: '0.25rem 0.65rem', fontSize: '0.8rem' }}
                        onClick={() => handleOpenDetail(p)}
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Patient Modal */}
      {showRegisterModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
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
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{t.patient_register_btn}</h3>
              <button
                onClick={() => setShowRegisterModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            {registerError && (
              <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {registerError}
              </div>
            )}

            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">{t.patient_full_name} *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Venkata Subbamma"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">{t.patient_age} *</label>
                  <input
                    type="number"
                    min="0"
                    max="125"
                    className="form-control"
                    required
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t.patient_gender} *</label>
                  <select
                    className="form-control"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t.patient_phone} *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98480 12345"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">{t.patient_language}</label>
                  <select
                    className="form-control"
                    value={preferredLang}
                    onChange={(e) => setPreferredLang(e.target.value)}
                  >
                    <option value="te">తెలుగు (Telugu)</option>
                    <option value="en">English</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.patient_address}</label>
                  <input
                    type="text"
                    className="form-control"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder="Village or Town"
                  />
                </div>
              </div>

              {/* Mandal Dropdown (11 Mandals of ASR District in Ascending Order A-Z) */}
              <div className="form-group">
                <label className="form-label">{currentLang === 'te' ? 'మండలం (ASR District Mandal) *' : currentLang === 'hi' ? 'मंडल (अल्लूरी सीताराम राजू ज़िला) *' : 'Mandal (Alluri Sitharama Raju District) *'}</label>
                <select
                  className="form-control"
                  value={mandal}
                  onChange={(e) => setMandal(e.target.value)}
                  required
                >
                  {ASR_DISTRICT_MANDALS.map((m) => (
                    <option key={m.id} value={m.name}>
                      {currentLang === 'te' ? `${m.nameTe} (${m.name})` : currentLang === 'hi' ? `${m.nameHi} (${m.name})` : m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Digital Consent Checklist */}
              <div style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                  <input
                    type="checkbox"
                    id="consent_check"
                    checked={consentGranted}
                    onChange={(e) => setConsentGranted(e.target.checked)}
                    style={{ marginTop: '0.25rem', width: '18px', height: '18px' }}
                  />
                  <label htmlFor="consent_check" style={{ fontSize: '0.82rem', color: '#166534', lineHeight: 1.4 }}>
                    <strong>{t.patient_consent_title}:</strong> {t.patient_consent_text}
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRegisterModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !consentGranted}
                >
                  {submitting ? 'Registering...' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient Detail Drawer */}
      {selectedPatient && (
        <div style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#FFFFFF',
          boxShadow: '-4px 0 25px rgba(0, 0, 0, 0.2)',
          zIndex: 65,
          padding: '1.75rem',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--teal-primary)' }}>
                {selectedPatient.patient_id_display}
              </span>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{selectedPatient.full_name}</h3>
            </div>
            <button
              onClick={() => setSelectedPatient(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
            >
              <X size={22} />
            </button>
          </div>

          <div style={{ marginBottom: '1.5rem', background: '#F8FAFC', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '0.35rem' }}>
              <strong>Demography:</strong> {selectedPatient.age} years old • {selectedPatient.gender}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '0.35rem' }}>
              <strong>Masked Phone:</strong> {selectedPatient.phone_masked}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#334155' }}>
              <strong>PHC:</strong> {selectedPatient.phc_name} • Language: {selectedPatient.preferred_language.toUpperCase()}
            </div>
          </div>

          {/* Screenings Timeline */}
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={16} /> Past Screenings ({selectedPatient.screenings?.length || 0})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
            {selectedPatient.screenings?.map((s: any) => (
              <div key={s.id} style={{ border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--teal-primary)' }}>{s.reference_id}</span>
                  <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{s.category}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#334155' }}>{s.symptoms}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.3rem' }}>Status: {s.status}</div>
              </div>
            ))}
          </div>

          {/* Appointments Timeline */}
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={16} /> Consultation Appointments ({selectedPatient.appointments?.length || 0})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {selectedPatient.appointments?.map((a: any) => (
              <div key={a.id} style={{ border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{a.reference_id}</span>
                  <span className="badge badge-warning">{a.status}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#334155' }}>Date: {a.scheduled_date} at {a.scheduled_time}</div>
                <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>Arrival Time: {a.expected_arrival_time}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
