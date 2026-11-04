import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Investigation, User, LanguageCode, Patient } from '../../types';
import { Plus, X, Search, Building2, User as UserIcon, FileText, FlaskConical, CheckCircle2, AlertTriangle, Stethoscope } from 'lucide-react';

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

  // Add Biopsy Report Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState<string>('');
  const [createPatientId, setCreatePatientId] = useState<number | ''>('');
  const [createKind, setCreateKind] = useState<string>('punch_biopsy');
  const [createSite, setCreateSite] = useState<string>('Right Buccal Mucosa');
  const [createState, setCreateState] = useState<string>('advised');
  const [createDiagnosis, setCreateDiagnosis] = useState<string>('precancer_leukoplakia');
  const [createFinding, setCreateFinding] = useState<string>('');
  const [createSummary, setCreateSummary] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleOpenCreate = async () => {
    setShowCreateModal(true);
    setCreateError(null);
    try {
      const pts = await api.searchPatients('');
      setPatientList(pts);
      if (pts.length > 0 && !createPatientId) {
        setCreatePatientId(pts[0].id);
      }
    } catch (err: any) {
      console.warn('Could not load patient list for biopsy modal:', err);
    }
  };

  const handleCreateBiopsy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createPatientId) {
      setCreateError(tr('దయచేసి రోగిని ఎంచుకోండి', 'Please select a patient', 'कृपया एक रोगी चुनें'));
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await api.createInvestigation({
        patient_id: Number(createPatientId),
        kind: createKind,
        biopsy_site: createSite,
        state: createState,
        diagnosis_category: createDiagnosis,
        pathology_finding: createFinding || undefined,
        histopathology_summary: createSummary || undefined
      });
      setShowCreateModal(false);
      setCreateFinding('');
      setCreateSummary('');
      await loadData();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create biopsy investigation report');
    } finally {
      setCreating(false);
    }
  };

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
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {currentUser.role !== 'chw' && (
              <button
                type="button"
                onClick={handleOpenCreate}
                style={{
                  background: 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)',
                  border: 'none',
                  color: '#fff',
                  padding: '0.55rem 1.15rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.88rem',
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.35)'
                }}
              >
                <Plus size={18} />
                {tr('+ బయాప్సీ రిపోర్ట్ జోడించండి', '+ Add Biopsy Report', '+ बायोप्सी रिपोर्ट जोड़ें')}
              </button>
            )}
            <button
              onClick={loadData}
              style={{
                background: '#334155',
                border: 'none',
                color: '#fff',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.88rem'
              }}
            >
              {tr('🔄 రిఫ్రెష్', '🔄 Refresh', '🔄 रीफ्रेश')}
            </button>
          </div>
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

      {error && !error.toLowerCase().includes('token') && !error.toLowerCase().includes('expired') && !error.toLowerCase().includes('401') && (
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

      {/* ADD BIOPSY REPORT MODAL */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '620px',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '1.75rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ background: '#CCFBF1', color: '#0F766E', padding: '0.5rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FlaskConical size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
                    {tr('కొత్త బయాప్సీ రిపోర్ట్ జోడించండి', 'Add Biopsy & Investigation Report', 'नई बायोप्सी जांच रिपोर्ट जोड़ें')}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>
                    {tr('రోగికి సంబంధించిన కణజాల పరీక్ష వివరాలను నమోదు చేయండి', 'Record biopsy procedure, anatomical site, and laboratory findings', 'रोगी के बायोप्सी व लैब निष्कर्ष दर्ज करें')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div style={{ background: '#FEE2E2', borderLeft: '4px solid #EF4444', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.84rem', marginBottom: '1.25rem' }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateBiopsy}>
              {/* 1. Patient Selector */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {tr('రోగిని ఎంచుకోండి (Patient) *', 'Select Patient *', 'रोगी चुनें *')}
                </label>
                
                {/* Search Filter for Patients */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder={tr('పేరు లేదా ఫోన్ నంబర్‌తో శోధించండి...', 'Filter by name or mobile...', 'नाम या मोबाइल से खोजें...')}
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>

                <select
                  value={createPatientId}
                  onChange={(e) => setCreatePatientId(Number(e.target.value))}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    background: '#FFFFFF'
                  }}
                >
                  <option value="">{tr('-- రోగిని ఎంచుకోండి --', '-- Select Patient --', '-- रोगी का चयन करें --')}</option>
                  {patientList
                    .filter(p => !patientSearch || p.full_name.toLowerCase().includes(patientSearch.toLowerCase()) || ((p.phone || p.phone_masked) && (p.phone || p.phone_masked).includes(patientSearch)))
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.age}y / {p.gender}) • {p.patient_id_display || p.id} • {p.mandal || p.habitation || p.village_town || 'ITDA'}
                      </option>
                    ))}
                </select>
              </div>

              {/* 2. Grid: Kind & Anatomical Site */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    {tr('బయాప్సీ రకం (Procedure Kind)', 'Procedure Kind', 'बायोप्सी प्रकार')}
                  </label>
                  <select
                    value={createKind}
                    onChange={(e) => setCreateKind(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  >
                    <option value="punch_biopsy">Punch Biopsy (పంచ్ బయాప్సీ)</option>
                    <option value="incisional_biopsy">Incisional Biopsy (ఇన్సిషనల్ బయాప్సీ)</option>
                    <option value="excisional_biopsy">Excisional Biopsy (ఎక్సిషనల్ బయాప్సీ)</option>
                    <option value="fnac">FNAC - Fine Needle Aspiration</option>
                    <option value="brush_biopsy">Oral Brush Cytology</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    {tr('శరీర భాగం (Biopsy Site)', 'Anatomical Biopsy Site', 'बायोप्सी स्थान')}
                  </label>
                  <select
                    value={createSite}
                    onChange={(e) => setCreateSite(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  >
                    <option value="Right Buccal Mucosa">Right Buccal Mucosa (కుడి దవడ)</option>
                    <option value="Left Buccal Mucosa">Left Buccal Mucosa (ఎడమ దవడ)</option>
                    <option value="Lateral Border of Tongue (Right)">Lateral Tongue - Right (నాలుక కుడి)</option>
                    <option value="Lateral Border of Tongue (Left)">Lateral Tongue - Left (నాలుక ఎడమ)</option>
                    <option value="Gingiva / Retromolar Trigone">Gingiva / Retromolar (చిగుళ్ళు)</option>
                    <option value="Hard / Soft Palate">Palate (తాలువు / అంగిలి)</option>
                    <option value="Floor of Mouth">Floor of Mouth (నోటి అడుగు భాగం)</option>
                    <option value="Lower Labial Mucosa / Lip">Lower Lip (కింది పెదవి)</option>
                    <option value="Upper Labial Mucosa">Upper Lip (పై పెదవి)</option>
                  </select>
                </div>
              </div>

              {/* 3. Grid: Initial Status & Diagnosis Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    {tr('రిపోర్ట్ స్థితి (Status)', 'Investigation Status', 'जांच स्थिति')}
                  </label>
                  <select
                    value={createState}
                    onChange={(e) => setCreateState(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  >
                    <option value="advised">📋 Biopsy Advised</option>
                    <option value="scheduled">📅 Procedure Scheduled</option>
                    <option value="sample_collected">🧪 Sample Collected</option>
                    <option value="report_pending">⏳ Pathology Pending</option>
                    <option value="report_received">📄 Report Received</option>
                    <option value="clinician_reviewed">✅ Clinician Reviewed</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    {tr('రోగనిర్ధారణ వర్గం (Diagnosis)', 'Diagnosis Category', 'निदान श्रेणी')}
                  </label>
                  <select
                    value={createDiagnosis}
                    onChange={(e) => setCreateDiagnosis(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  >
                    <option value="precancer_leukoplakia">⚠️ Precancerous Leukoplakia</option>
                    <option value="osmf">⚠️ Oral Submucous Fibrosis (OSMF)</option>
                    <option value="oscc_malignancy">🚨 Malignancy (OSCC)</option>
                    <option value="benign">🟢 Benign / Inflammatory</option>
                  </select>
                </div>
              </div>

              {/* 4. Pathology Finding */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {tr('మైక్రోస్కోపిక్ పరిశీలన / పాథాలజీ ఫలితం', 'Pathology / Microscopic Finding', 'माइक्रोस्कोपिक निष्कर्ष')}
                </label>
                <input
                  type="text"
                  value={createFinding}
                  onChange={(e) => setCreateFinding(e.target.value)}
                  placeholder={tr('ఉదా: Basal cell hyperplasia with mild epithelial dysplasia', 'e.g. Basal cell hyperplasia with mild epithelial dysplasia', 'उदा: Basal cell hyperplasia with mild epithelial dysplasia')}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>

              {/* 5. Histopathology Summary & Lab Notes */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {tr('ల్యాబ్ సారాంశం & క్లినికల్ గమనికలు', 'Histopathology Summary & Lab Notes', 'हिस्टोपैथोलॉजी सारांश एवं लैब टिप्पणियां')}
                </label>
                <textarea
                  value={createSummary}
                  onChange={(e) => setCreateSummary(e.target.value)}
                  rows={3}
                  placeholder={tr('పరీక్షించిన ల్యాబ్ (ఉదా: KGH వైజాగ్ లేదా ITDA పాడేరు పాథాలజీ సెంటర్) మరియు ఇతర సూచనలు...', 'Examining pathology lab (e.g. KGH Visakhapatnam / ITDA Paderu Lab) and clinical recommendations...', 'जांच प्रयोगशाला एवं नैदानिक सिफारिशें...')}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>

              {/* Modal Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '0.6rem 1.25rem',
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#475569'
                  }}
                >
                  {tr('రద్దు', 'Cancel', 'रद्द करें')}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: '0.6rem 1.5rem',
                    background: 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.35)'
                  }}
                >
                  <Plus size={16} />
                  {creating
                    ? tr('నమోదవుతోంది...', 'Saving Report...', 'सहेज रहे हैं...')
                    : tr('బయాప్సీ రిపోర్ట్ నమోదు చేయండి', 'Save Biopsy Report', 'बायोप्सी रिपोर्ट सहेजें')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
