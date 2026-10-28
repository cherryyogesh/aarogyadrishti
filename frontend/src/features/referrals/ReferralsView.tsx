import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ReferralSlip, User, LanguageCode, Patient } from '../../types';
import { Plus } from 'lucide-react';

interface ReferralsViewProps {
  currentUser: User;
  currentLang?: LanguageCode;
}

export const ReferralsView: React.FC<ReferralsViewProps> = ({ currentUser, currentLang = 'en' }) => {
  const isTe = currentLang === 'te';
  const [referrals, setReferrals] = useState<ReferralSlip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlip, setSelectedSlip] = useState<ReferralSlip | null>(null);

  // Create Referral Slip State (Doctor & Clinical Staff)
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | ''>('');
  const [targetHospital, setTargetHospital] = useState('District Hospital Paderu / KGH Visakhapatnam');
  const [specialtyNeeded, setSpecialtyNeeded] = useState('Head & Neck Surgical Oncology');
  const [urgency, setUrgency] = useState('priority');
  const [reason, setReason] = useState('Suspected Oral Potentially Malignant Disorder (Leukoplakia / OSMF) requiring biopsy');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadReferrals = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.listReferrals();
      setReferrals(data);
    } catch (err: any) {
      setError(err.message || (isTe ? 'రిఫరల్ రికార్డులను లోడ్ చేయడం విఫలమైంది' : 'Failed to load hospital referrals'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferrals();
    api.searchPatients().then(setPatients).catch(console.error);
  }, []);

  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setCreateError(isTe ? 'దయచేసి రోగిని ఎంచుకోండి' : 'Please select a registered patient');
      return;
    }
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const newSlip = await api.createReferral({
        patient_id: Number(selectedPatientId),
        specialty_needed: specialtyNeeded,
        target_hospital: targetHospital,
        urgency: urgency,
        reason_for_referral: reason,
        clinical_notes: clinicalNotes,
        scheduled_appointment_date: scheduledDate
      });
      setShowCreateModal(false);
      await loadReferrals();
      setSelectedSlip(newSlip);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create referral slip');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleConfirmAttendance = async (id: number) => {
    try {
      await api.confirmReferralAttendance(id, true);
      await loadReferrals();
      alert(isTe ? 'రోగి ఆసుపత్రి హాజరు విజయవంతంగా ధృవీకరించబడింది!' : 'Patient hospital attendance confirmed successfully!');
    } catch (err: any) {
      alert(`${isTe ? 'చర్య విఫలమైంది' : 'Action failed'}: ${err.message}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="referrals-container" style={{ width: '100%' }}>
      {/* Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        color: '#fff',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{
              background: '#818cf8',
              color: '#1e1b4b',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {isTe ? 'ఆసుపత్రి అధికారిక రిఫరల్స్' : 'Official Hospital Referrals'}
            </span>
            <h2 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1.5rem', fontWeight: 700 }}>
              {isTe ? 'ఆసుపత్రి రిఫరల్ స్లిప్‌లు' : 'Specialist Hospital Referral Slips'}
            </h2>
            <p style={{ margin: 0, color: '#c7d2fe', fontSize: '0.9rem' }}>
              {isTe
                ? 'పాడేరు జిల్లా ఆసుపత్రి మరియు విశాఖపట్నం KGH కు అధికారిక రిఫరల్ ధృవీకరణ.'
                : 'Official referral authorization to District Hospital Paderu and King George Hospital (KGH) Visakhapatnam.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {(currentUser.role === 'doctor' || currentUser.role === 'phc_staff' || currentUser.role === 'admin') && (
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  background: '#10B981',
                  border: 'none',
                  color: '#fff',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                }}
              >
                <Plus size={16} />
                {isTe ? '+ రిఫరల్ స్లిప్ జారీ చేయండి' : '+ Create Referral Slip'}
              </button>
            )}
            <button
              onClick={loadReferrals}
              style={{
                background: '#4338ca',
                border: 'none',
                color: '#fff',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.88rem'
              }}
            >
              {isTe ? '🔄 రిఫ్రెష్' : '🔄 Refresh'}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          Loading hospital referral slips...
        </div>
      )}

      {error && (
        <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {!loading && referrals.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          background: '#fff',
          borderRadius: '12px',
          border: '1px dashed #cbd5e1',
          color: '#64748b'
        }}>
          No hospital referral slips issued yet.
        </div>
      )}

      {/* Referrals Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
        {referrals.map(ref => (
          <div
            key={ref.id}
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
                <span style={{ fontWeight: 700, color: '#4338ca', fontSize: '1.1rem' }}>
                  {ref.referral_slip_number}
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '999px',
                  fontWeight: 600,
                  background: ref.urgency === 'urgent' ? '#fee2e2' : '#fef3c7',
                  color: ref.urgency === 'urgent' ? '#b91c1c' : '#b45309'
                }}>
                  {ref.urgency.toUpperCase()} PRIORITY
                </span>
              </div>

              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ fontWeight: 600, fontSize: '1.05rem', color: '#1e293b' }}>
                  {ref.patient_name} <span style={{ color: '#64748b', fontSize: '0.85rem' }}>({ref.patient_id_display})</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {ref.age} yrs • {ref.gender} • {ref.habitation || 'Tribal Area'}, {ref.mandal}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ marginBottom: '0.25rem' }}>
                  <span style={{ color: '#64748b' }}>Target Hospital:</span>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{ref.target_hospital}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Designated Specialty:</span>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{ref.specialty_needed}</div>
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.75rem' }}>
                <strong>Reason:</strong> {ref.reason_for_referral}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: ref.attendance_confirmed ? '#16a34a' : '#ea580c' }}>
                <span>{ref.attendance_confirmed ? '✓ Hospital Attendance Verified' : '⏳ Awaiting Patient Arrival'}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
              <button
                onClick={() => setSelectedSlip(ref)}
                style={{
                  flex: 1,
                  background: '#4f46e5',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                🖨️ View & Print Slip
              </button>

              {!ref.attendance_confirmed && (currentUser.role === 'doctor' || currentUser.role === 'navigator' || currentUser.role === 'phc_staff') && (
                <button
                  onClick={() => handleConfirmAttendance(ref.id)}
                  style={{
                    background: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="Confirm that patient reached the designated hospital"
                >
                  Confirm Arrival
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Printable Bilingual Referral Slip Modal */}
      {selectedSlip && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            color: '#0f172a'
          }}>
            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <button
                onClick={handlePrint}
                style={{
                  background: '#0f172a',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                🖨️ Print Telugu / English Slip
              </button>
              <button
                onClick={() => setSelectedSlip(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Official Slip Content */}
            <div id="printable-referral-slip" style={{
              border: '2px solid #0f172a',
              borderRadius: '8px',
              padding: '1.5rem',
              background: '#fff'
            }}>
              {/* Official Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569', letterSpacing: '0.05em' }}>
                  GOVERNMENT OF ANDHRA PRADESH • ITDA PADERU
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.25rem 0', color: '#0f172a' }}>
                  {isTe ? 'ఆరోగ్య దృష్టి — స్పెషలిస్ట్ హాస్పిటల్ రిఫరల్ స్లిప్' : 'AAROGYA DRISHTI — OFFICIAL CLINICAL REFERRAL SLIP'}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Alluri Sitharama Raju District • Public Health & Tribal Cancer Early Detection Initiative
                </div>
              </div>

              {/* Barcode & Slip Metadata */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {isTe ? 'రిఫరల్ సంఖ్య' : 'SLIP NUMBER'}
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e1b4b', letterSpacing: '0.05em' }}>
                    {selectedSlip.referral_slip_number}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'monospace', letterSpacing: '3px', fontSize: '1.1rem', background: '#fff', padding: '0.25rem 0.5rem', border: '1px solid #cbd5e1' }}>
                    ||||| | |||| || ||| |||||
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {isTe ? 'ప్రాధాన్యత:' : 'Priority:'} {selectedSlip.urgency.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Patient Information Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>{isTe ? 'రోగి పేరు:' : 'Patient Name:'}</span>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{selectedSlip.patient_name}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>{isTe ? 'రోగి ID:' : 'Patient UID:'}</span>
                  <div style={{ fontWeight: 700 }}>{selectedSlip.patient_id_display}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>{isTe ? 'వయస్సు & లింగం:' : 'Age / Sex:'}</span>
                  <div style={{ fontWeight: 600 }}>{selectedSlip.age} {isTe ? 'సం.' : 'years'} / {selectedSlip.gender}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>{isTe ? 'గ్రామం & మండలం:' : 'Habitation & Mandal:'}</span>
                  <div style={{ fontWeight: 600 }}>{selectedSlip.habitation || 'G. Madugula'}, {selectedSlip.mandal}</div>
                </div>
              </div>

              {/* Referral Destination */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', background: '#f1f5f9' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                  {isTe ? 'రిఫర్ చేయబడిన ఆసుపత్రి & విభాగం:' : 'Referral Destination & Department:'}
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e1b4b', marginBottom: '0.25rem' }}>
                  🏥 {selectedSlip.target_hospital}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>
                  🩺 Specialty: {selectedSlip.specialty_needed}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                  📅 Scheduled Assessment Date: {selectedSlip.scheduled_appointment_date || 'Within 48-72 Hours'}
                </div>
              </div>

              {/* Clinical Indication */}
              <div style={{ marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
                  {isTe ? 'రిఫరల్ కారణం & క్లినికల్ వివరాలు:' : 'Clinical Indication & Findings:'}
                </div>
                <div style={{ padding: '0.75rem', background: '#f8fafc', borderLeft: '4px solid #4338ca', borderRadius: '4px' }}>
                  {selectedSlip.reason_for_referral}
                </div>
                {selectedSlip.clinical_notes && (
                  <div style={{ marginTop: '0.5rem', fontStyle: 'italic', color: '#475569' }}>
                    Notes: {selectedSlip.clinical_notes}
                  </div>
                )}
              </div>

              {/* Transport Assistance & Signature Lines */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingTop: '1rem', borderTop: '1px dashed #cbd5e1', fontSize: '0.85rem' }}>
                <div>
                  <strong>{isTe ? 'గిరిజన రవాణా సదుపాయం:' : 'Tribal Transport Assistance:'}</strong>
                  <div>
                    {isTe
                      ? 'ITDA 108 ఫీడర్ అంబులెన్స్ సమన్వయం చేయబడింది. పేషెంట్ ఎస్కార్ట్ కేటాయించబడింది.'
                      : 'ITDA 108 Feeder Ambulance coordinated. Patient Escort assigned.'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ height: '35px' }}></div>
                  <div style={{ borderTop: '1px solid #0f172a', display: 'inline-block', minWidth: '180px', paddingTop: '0.25rem' }}>
                    {isTe ? 'వైద్యాధికారి సంతకం / సీల్' : 'Medical Officer Signature / Seal'}<br />
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedSlip.originating_phc}</span>
                  </div>
                </div>
              </div>

              {/* Official Referral Footer */}
              <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: '#64748b' }}>
                GOVERNMENT OF ANDHRA PRADESH • ITDA PADERU TRIBAL HEALTHCARE NETWORK • OFFICIAL REFERRAL DOCUMENT
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Referral Slip Modal (Doctor, PHC Staff, Admin) */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0F172A' }}>
                  {isTe ? 'కొత్త ఆసుపత్రి రిఫరల్ స్లిప్ జారీ చేయండి' : 'Issue Official Hospital Referral Slip'}
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                  {isTe ? 'వైద్యుల అధికారిక రిఫరల్ మరియు అధీకృత స్లిప్ సృష్టి' : 'Authorized medical referral to secondary/tertiary cancer centres'}
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            {createError && (
              <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateReferral}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {isTe ? 'రోగిని ఎంచుకోండి *' : 'Select Registered Patient *'}
                </label>
                <select
                  className="form-control"
                  required
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(Number(e.target.value))}
                >
                  <option value="">-- {isTe ? 'రోగిని ఎంచుకోండి' : 'Choose Patient'} --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.patient_id_display} • {p.full_name} ({p.age}y, {p.gender}) - {p.mandal || 'Tribal Area'}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    {isTe ? 'రిఫర్ చేయబడిన ఆసుపత్రి *' : 'Target Hospital *'}
                  </label>
                  <select
                    className="form-control"
                    value={targetHospital}
                    onChange={(e) => setTargetHospital(e.target.value)}
                  >
                    <option value="District Hospital Paderu / KGH Visakhapatnam">District Hospital Paderu / KGH Visakhapatnam</option>
                    <option value="King George Hospital (KGH) Visakhapatnam">King George Hospital (KGH) Visakhapatnam (Tertiary Hub)</option>
                    <option value="District Hospital Paderu">District Hospital Paderu (Head & Neck Unit)</option>
                    <option value="Area Hospital Chintapalli">Area Hospital Chintapalli (Secondary Care)</option>
                    <option value="Area Hospital Araku Valley">Area Hospital Araku Valley</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    {isTe ? 'అవసరమైన స్పెషాలిటీ *' : 'Specialty Required *'}
                  </label>
                  <select
                    className="form-control"
                    value={specialtyNeeded}
                    onChange={(e) => setSpecialtyNeeded(e.target.value)}
                  >
                    <option value="Head & Neck Surgical Oncology">Head & Neck Surgical Oncology</option>
                    <option value="Oral & Maxillofacial Surgery">Oral & Maxillofacial Surgery</option>
                    <option value="Medical Oncology & Chemotherapy">Medical Oncology & Chemotherapy</option>
                    <option value="Radiation Oncology">Radiation Oncology</option>
                    <option value="Incisional Biopsy & Pathology">Incisional Biopsy & Pathology</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    {isTe ? 'ప్రాధాన్యత స్థాయి *' : 'Referral Urgency *'}
                  </label>
                  <select
                    className="form-control"
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                  >
                    <option value="priority">Priority (Review within 1-2 Weeks)</option>
                    <option value="urgent">Urgent / High Suspicion (Within 48-72 Hours)</option>
                    <option value="routine">Routine Specialist Review (3-4 Weeks)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    {isTe ? 'షెడ్యూల్ చేసిన తేదీ *' : 'Scheduled Visit Date *'}
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {isTe ? 'రిఫరల్ కారణం (Reason for Referral) *' : 'Reason for Referral *'}
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Suspected Oral Potentially Malignant Disorder (Leukoplakia / OSMF) requiring biopsy..."
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {isTe ? 'వైద్యుల క్లినికల్ గమనికలు (Doctor Clinical Notes)' : 'Doctor Clinical Findings & Notes'}
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Clinical observations, lesion size, location, lymph node status, and relevant history..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  {isTe ? 'రద్దు చేయండి' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="btn btn-teal"
                  disabled={createSubmitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Plus size={16} />
                  {createSubmitting
                    ? (isTe ? 'జారీ చేయబడుతోంది...' : 'Generating Slip...')
                    : (isTe ? 'రిఫరల్ స్లిప్ జారీ చేయండి' : 'Issue Referral Slip')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
