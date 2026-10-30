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
  const isHi = currentLang === 'hi';
  const tr = (teText: string, enText: string, hiText: string) => {
    if (currentLang === 'te') return teText;
    if (currentLang === 'hi') return hiText;
    return enText;
  };
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
              {tr('ITDA పాడేరు హెల్త్‌కేర్ వ్యవస్థ', 'ITDA Paderu Healthcare System', 'आईटीडीए पाडेरू स्वास्थ्य प्रणाली')}
            </span>
            <h2 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1.5rem', fontWeight: 700 }}>
              {tr('బయాప్సీ & హిస్టోపాథాలజీ ట్రాకింగ్', 'Biopsy & Lab Investigations Tracking', 'बायोप्सी और लैब जांच ट्रैकिंग')}
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
            {tr('🔄 రిఫ్రెష్', '🔄 Refresh', '🔄 रीफ्रेश')}
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
          <strong>{tr('క్లినికల్ మార్గదర్శకాలు:', 'CRITICAL CLINICAL BOUNDARY:', 'महत्वपूर्ण नैदानिक नियम:')}</strong>{' '}
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
          { key: 'all', label: tr('అన్ని బయాప్సీలు', 'All Biopsies', 'सभी बायोप्सी') },
          { key: 'advised', label: tr('సిఫార్సు చేయబడినవి', 'Advised', 'अनुशंसित') },
          { key: 'scheduled', label: tr('షెడ్యూల్ అయినవి', 'Scheduled', 'निर्धारित') },
          { key: 'sample_collected', label: tr('సేకరించినవి', 'Collected', 'नमूना एकत्रित') },
          { key: 'report_pending', label: tr('ల్యాబ్ పెండింగ్', 'Pending Lab', 'लैब लंबित') },
          { key: 'report_received', label: tr('నివేదిక సిద్ధం', 'Report Ready', 'रिपोर्ट तैयार') },
          { key: 'clinician_reviewed', label: tr('సమీక్ష పూర్తయినవి', 'Signed by Clinician', 'समीक्षा पूर्ण') }
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
                {tr('హిస్టోపాథాలజీ నివేదిక సమీక్ష', 'Histopathology Biopsy Review', 'हिस्टोपैथोलॉजी बायोप्सी समीक्षा')}
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
                  {tr('పరిశీలన స్థితి', 'Investigation State', 'जांच स्थिति')}
                </label>
                <select
                  value={newState}
                  onChange={e => setNewState(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="advised">{tr('సిఫార్సు చేయబడింది', 'Advised', 'अनुशंसित')}</option>
                  <option value="scheduled">{tr('షెడ్యూల్ చేయబడింది', 'Scheduled', 'निर्धारित')}</option>
                  <option value="sample_collected">{tr('నమూనా సేకరించబడింది', 'Sample Collected', 'नमूना एकत्रित')}</option>
                  <option value="report_pending">{tr('ల్యాబ్ పరిశీలనలో ఉంది', 'Report Pending', 'लैब में लंबित')}</option>
                  <option value="report_received">{tr('నివేదిక అందింది', 'Report Received', 'रिपोर्ट प्राप्त हुई')}</option>
                  <option value="clinician_reviewed">{tr('వైద్యులు సంతకం చేశారు', 'Clinician Reviewed', 'डॉक्टर द्वारा सत्यापित')}</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  {tr('నిర్ధారణ వర్గం', 'Diagnostic Classification', 'नैदानिक वर्गीकरण')}
                </label>
                <select
                  value={newDiagnosis}
                  onChange={e => setNewDiagnosis(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="benign">{tr('ప్రమాదకరం కానిది (Benign)', 'Benign', 'हानिरहित (Benign)')}</option>
                  <option value="precancer_leukoplakia">{tr('ల్యూకోప్లాకియా (Precancerous Leukoplakia)', 'Precancerous Oral Leukoplakia', 'ल्यूकोप्लाकिया (पूर्व-कैंसर)')}</option>
                  <option value="osmf">{tr('ఓరల్ సబ్-మ్యూకస్ ఫైబ్రోసిస్ (OSMF)', 'Oral Submucous Fibrosis - OSMF', 'ओरल सबम्यूकस फाइब्रोसिस (OSMF)')}</option>
                  <option value="oscc_malignancy">{tr('ఓరల్ స్క్వామస్ సెల్ కార్సినోమా (OSCC Malignancy)', 'Oral Squamous Cell Carcinoma - OSCC', 'मुख कैंसर (OSCC Malignancy)')}</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  {tr('పాథాలజీ పరిశీలన', 'Pathologist Finding', 'पैथोलॉजी निष्कर्ष')}
                </label>
                <input
                  type="text"
                  value={newFinding}
                  onChange={e => setNewFinding(e.target.value)}
                  placeholder={tr('ఉదా: మోడరేట్ ఎపిథీలియల్ డిస్ప్లాసియాతో హైపర్‌కెరాటోసిస్', 'e.g. Hyperkeratosis with moderate epithelial dysplasia', 'उदा: मध्यम एपिथीलियल डिसप्लेसिया के साथ हाइपरकेराटोसिस')}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  {tr('హిస్టోపాథాలజీ సారాంశం / క్లినికల్ గమనికలు', 'Microscopic Summary / Clinician Decision Notes', 'माइक्रोस्कोपिक सारांश / डॉक्टर टिप्पणियां')}
                </label>
                <textarea
                  value={newSummary}
                  onChange={e => setNewSummary(e.target.value)}
                  rows={4}
                  placeholder={tr('వివరణాత్మక హిస్టోలాజికల్ మూల్యాంకన గమనికలు...', 'Detailed histological evaluation notes...', 'विस्तृत हिस्टोलॉजिकल मूल्यांकन टिप्पणियां...')}
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
                  {tr('రద్దు', 'Cancel', 'रद्द करें')}
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
                    ? tr('భద్రపరుస్తోంది...', 'Saving...', 'सुरक्षित हो रहा है...')
                    : tr('సమీక్షను ధృవీకరించండి', 'Sign & Finalize Review', 'समीक्षा सत्यापित करें')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
