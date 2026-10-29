import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Investigation, User, LanguageCode } from '../../types';

interface InvestigationsViewProps {
  currentUser: User;
  currentLang?: LanguageCode;
  onNavigatePatient?: (patientId: number) => void;
}

export const InvestigationsView: React.FC<InvestigationsViewProps> = ({ currentUser, currentLang = 'en' }) => {
  const isTe = currentLang === 'te';
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<string>('all');
  const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null);
  const [updating, setUpdating] = useState<boolean>(false);

  // Modal edit state
  const [newState, setNewState] = useState<string>('clinician_reviewed');
  const [newDiagnosis, setNewDiagnosis] = useState<string>('precancer_leukoplakia');
  const [newFinding, setNewFinding] = useState<string>('');
  const [newSummary, setNewSummary] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.listInvestigations();
      setInvestigations(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load investigation records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenReview = (inv: Investigation) => {
    setSelectedInvestigation(inv);
    setNewState(inv.state);
    setNewDiagnosis(inv.diagnosis_category || 'precancer_leukoplakia');
    setNewFinding(inv.pathology_finding || '');
    setNewSummary(inv.histopathology_summary || '');
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestigation) return;

    try {
      setUpdating(true);
      await api.updateInvestigation(selectedInvestigation.id, {
        state: newState,
        diagnosis_category: newDiagnosis,
        pathology_finding: newFinding,
        histopathology_summary: newSummary,
      });
      setSelectedInvestigation(null);
      await loadData();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'advised':
        return <span className="badge badge-warning">📋 Biopsy Advised</span>;
      case 'scheduled':
        return <span className="badge badge-info">📅 Procedure Scheduled</span>;
      case 'sample_collected':
        return <span className="badge badge-primary">🧪 Sample Collected</span>;
      case 'report_pending':
        return <span className="badge badge-secondary">⏳ Pathology Pending</span>;
      case 'report_received':
        return <span className="badge badge-info" style={{ backgroundColor: '#7c3aed', color: '#fff' }}>📄 Report Received</span>;
      case 'clinician_reviewed':
        return <span className="badge badge-success">✅ Clinician Reviewed</span>;
      default:
        return <span className="badge badge-outline">{state}</span>;
    }
  };

  const getDiagnosisBadge = (cat: string) => {
    switch (cat) {
      case 'precancer_leukoplakia':
        return <span style={{ color: '#d97706', fontWeight: 600 }}>⚠️ Precancerous Leukoplakia</span>;
      case 'osmf':
        return <span style={{ color: '#ea580c', fontWeight: 600 }}>⚠️ Oral Submucous Fibrosis (OSMF)</span>;
      case 'oscc_malignancy':
        return <span style={{ color: '#dc2626', fontWeight: 700 }}>🚨 Malignancy (OSCC)</span>;
      case 'benign':
        return <span style={{ color: '#16a34a', fontWeight: 600 }}>🟢 Benign Finding</span>;
      default:
        return <span>{cat}</span>;
    }
  };

  const filteredItems = filterState === 'all'
    ? investigations
    : investigations.filter(i => i.state === filterState);

  return (
    <div className="investigations-container" style={{ width: '100%' }}>
      {/* Diagnostics Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#fff',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        border: '1px solid #334155',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{
              background: '#0ea5e9',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {isTe ? 'ITDA పాడేరు హెల్త్‌కేర్ వ్యవస్థ' : 'ITDA Paderu Healthcare System'}
            </span>
            <h2 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1.5rem', fontWeight: 700 }}>
              {isTe ? 'బయాప్సీ & హిస్టోపాథాలజీ ట్రాకింగ్' : 'Biopsy & Lab Investigations Tracking'}
            </h2>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
              {isTe
                ? 'స్పెషలిస్ట్ ఆదేశించిన బయాప్సీ నమూనా సేకరణ నుండి తుది పాథాలజీ నివేదిక ధృవీకరణ వరకు సమగ్ర ట్రాకింగ్.'
                : 'Standardized pathway from specialist-directed biopsy order to definitive histopathology report review.'}
            </p>
          </div>
          <button
            onClick={loadData}
            style={{
              background: '#334155',
              border: 'none',
              color: '#fff',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            {isTe ? '🔄 రిఫ్రెష్' : '🔄 Refresh'}
          </button>
        </div>

        {/* Regulatory & Safety Box */}
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem 1rem',
          background: 'rgba(239, 68, 68, 0.1)',
          borderLeft: '4px solid #ef4444',
          borderRadius: '4px',
          fontSize: '0.85rem',
          color: '#fca5a5'
        }}>
          <strong>{isTe ? 'క్లినికల్ మార్గదర్శకాలు:' : 'CRITICAL CLINICAL BOUNDARY:'}</strong>{' '}
          {isTe
            ? 'నోటి ఫొటో లేదా AI సలహా బయాప్సీకి ప్రత్యామ్నాయం కాదు. అర్హత కలిగిన పాథాలజిస్ట్ కణజాల పరీక్ష ద్వారా మాత్రమే క్యాన్సర్ నిర్ధారణ జరుగుతుంది.'
            : 'An oral photograph or AI screening advisory NEVER substitutes for a clinically indicated biopsy and tissue pathology. Only a qualified pathologist and Medical Officer can confirm precancer or malignancy.'}
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto',
        marginBottom: '1.5rem',
        paddingBottom: '0.5rem'
      }}>
        {[
          { key: 'all', label: isTe ? 'అన్ని బయాప్సీలు' : 'All Biopsies' },
          { key: 'advised', label: isTe ? 'సిఫార్సు చేయబడినవి' : 'Advised' },
          { key: 'scheduled', label: isTe ? 'షెడ్యూల్ అయినవి' : 'Scheduled' },
          { key: 'sample_collected', label: isTe ? 'సేకరించినవి' : 'Collected' },
          { key: 'report_pending', label: isTe ? 'ల్యాబ్ పెండింగ్' : 'Pending Lab' },
          { key: 'report_received', label: isTe ? 'నివేదిక సిద్ధం' : 'Report Ready' },
          { key: 'clinician_reviewed', label: isTe ? 'సమీక్ష పూర్తయినవి' : 'Signed by Clinician' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterState(tab.key)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '999px',
              border: 'none',
              background: filterState === tab.key ? '#0284c7' : '#f1f5f9',
              color: filterState === tab.key ? '#fff' : '#475569',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          Loading biopsy records and laboratory manifests...
        </div>
      )}

      {error && (
        <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Biopsy Cards Grid */}
      {!loading && filteredItems.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          background: '#fff',
          borderRadius: '12px',
          border: '1px dashed #cbd5e1',
          color: '#64748b'
        }}>
          No biopsy investigation records matching current filter.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
        {filteredItems.map(inv => (
          <div
            key={inv.id}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.1rem' }}>
                  {inv.investigation_ref}
                </span>
                {getStateBadge(inv.state)}
              </div>

              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Patient</div>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>
                  {inv.patient_name} <span style={{ color: '#64748b', fontSize: '0.85rem' }}>({inv.patient_id_display})</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Procedure:</span>
                  <div style={{ fontWeight: 600 }}>{inv.kind.replace('_', ' ').toUpperCase()}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Biopsy Site:</span>
                  <div style={{ fontWeight: 600 }}>{inv.biopsy_site}</div>
                </div>
              </div>

              <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ color: '#64748b', marginBottom: '0.25rem' }}>Pathology Diagnosis Category:</div>
                <div>{getDiagnosisBadge(inv.diagnosis_category)}</div>
                {inv.pathology_finding && (
                  <div style={{ marginTop: '0.35rem', color: '#334155' }}>
                    <strong>Finding:</strong> {inv.pathology_finding}
                  </div>
                )}
              </div>

              {inv.histopathology_summary && (
                <div style={{ fontSize: '0.8rem', color: '#475569', fontStyle: 'italic', marginBottom: '0.75rem', borderLeft: '3px solid #cbd5e1', paddingLeft: '0.5rem' }}>
                  "{inv.histopathology_summary.slice(0, 140)}..."
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Ordered: {new Date(inv.created_at).toLocaleDateString()}
              </span>
              <button
                onClick={() => handleOpenReview(inv)}
                style={{
                  background: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {currentUser.role === 'doctor' || currentUser.role === 'phc_staff' ? 'Update & Review' : 'View Report'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Clinician Review & Update Modal */}
      {selectedInvestigation && (
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
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                {isTe ? 'హిస్టోపాథాలజీ నివేదిక సమీక్ష' : 'Histopathology Biopsy Review'}
              </h3>
              <button
                onClick={() => setSelectedInvestigation(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
              <div><strong>Reference ID:</strong> {selectedInvestigation.investigation_ref}</div>
              <div><strong>Patient:</strong> {selectedInvestigation.patient_name} ({selectedInvestigation.patient_id_display})</div>
              <div><strong>Site & Procedure:</strong> {selectedInvestigation.kind} on {selectedInvestigation.biopsy_site}</div>
            </div>

            <form onSubmit={handleSaveReview}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  {isTe ? 'పరిశీలన స్థితి' : 'Investigation State'}
                </label>
                <select
                  value={newState}
                  onChange={e => setNewState(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="advised">{isTe ? 'సిఫార్సు చేయబడింది' : 'Advised'}</option>
                  <option value="scheduled">{isTe ? 'షెడ్యూల్ చేయబడింది' : 'Scheduled'}</option>
                  <option value="sample_collected">{isTe ? 'నమూనా సేకరించబడింది' : 'Sample Collected'}</option>
                  <option value="report_pending">{isTe ? 'ల్యాబ్ పరిశీలనలో ఉంది' : 'Report Pending'}</option>
                  <option value="report_received">{isTe ? 'నివేదిక అందింది' : 'Report Received'}</option>
                  <option value="clinician_reviewed">{isTe ? 'వైద్యులు సంతకం చేశారు' : 'Clinician Reviewed'}</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  {isTe ? 'నిర్ధారణ వర్గం' : 'Diagnostic Classification'}
                </label>
                <select
                  value={newDiagnosis}
                  onChange={e => setNewDiagnosis(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="benign">{isTe ? 'ప్రమాదకరం కానిది (Benign)' : 'Benign'}</option>
                  <option value="precancer_leukoplakia">{isTe ? 'ల్యూకోప్లాకియా (Precancerous Leukoplakia)' : 'Precancerous Oral Leukoplakia'}</option>
                  <option value="osmf">{isTe ? 'ఓరల్ సబ్-మ్యూకస్ ఫైబ్రోసిస్ (OSMF)' : 'Oral Submucous Fibrosis - OSMF'}</option>
                  <option value="oscc_malignancy">{isTe ? 'ఓరల్ స్క్వామస్ సెల్ కార్సినోమా (OSCC Malignancy)' : 'Oral Squamous Cell Carcinoma - OSCC'}</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  {isTe ? 'పాథాలజీ పరిశీలన' : 'Pathologist Finding'}
                </label>
                <input
                  type="text"
                  value={newFinding}
                  onChange={e => setNewFinding(e.target.value)}
                  placeholder={isTe ? 'ఉదా: మోడరేట్ ఎపిథీలియల్ డిస్ప్లాసియాతో హైపర్‌కెరాటోసిస్' : 'e.g. Hyperkeratosis with moderate epithelial dysplasia'}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  {isTe ? 'హిస్టోపాథాలజీ సారాంశం / క్లినికల్ గమనికలు' : 'Microscopic Summary / Clinician Decision Notes'}
                </label>
                <textarea
                  value={newSummary}
                  onChange={e => setNewSummary(e.target.value)}
                  rows={4}
                  placeholder={isTe ? 'వివరణాత్మక హిస్టోలాజికల్ మూల్యాంకన గమనికలు...' : 'Detailed histological evaluation notes...'}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedInvestigation(null)}
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
                    background: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {updating
                    ? (isTe ? 'భద్రపరుస్తోంది...' : 'Saving...')
                    : (isTe ? 'సమీక్షను ధృవీకరించండి' : 'Sign & Finalize Review')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
