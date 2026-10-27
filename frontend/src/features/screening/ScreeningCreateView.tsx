import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, Patient, User, ImageUploadResponse } from '../../types';
import {
  Camera, Upload, AlertCircle, CheckCircle, Sparkles, RefreshCw,
  Send, ShieldAlert, Eye, Info, CheckCircle2
} from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
  user: User;
  onScreeningCreated?: (screeningId: number) => void;
}

const CATEGORIES = [
  { id: 'mouth', labelKey: 'screening_category_mouth', icon: '👄', hint: 'Inspect inner lips, gums, tongue, buccal mucosa.' },
  { id: 'skin', labelKey: 'screening_category_skin', icon: '🩹', hint: 'Capture well-lit area of rash, swelling, or redness.' },
  { id: 'wounds', labelKey: 'screening_category_wounds', icon: '🩸', hint: 'Inspect wound margins and signs of discharge.' },
  { id: 'eye', labelKey: 'screening_category_eye', icon: '👁️', hint: 'External conjunctiva/eyelid only. Internal vision requires specialist.' },
  { id: 'ear', labelKey: 'screening_category_ear', icon: '👂', hint: 'External pinna only. Middle ear pathology requires otoscope.' },
  { id: 'nose', labelKey: 'screening_category_nose', icon: '👃', hint: 'External bridge and skin surrounding nostrils.' },
  { id: 'other', labelKey: 'screening_category_other', icon: '🔍', hint: 'Other visible surface abnormalities.' },
];

export const ScreeningCreateView: React.FC<Props> = ({ currentLang, user, onScreeningCreated }) => {
  const t = translations[currentLang] || translations.en;
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | ''>('');
  const [category, setCategory] = useState('mouth');
  const [oralSite, setOralSite] = useState('buccal_mucosa');
  const [lesionType, setLesionType] = useState('leukoplakia');
  const [mouthOpeningMm, setMouthOpeningMm] = useState<number>(32);
  const [burningSensation, setBurningSensation] = useState<boolean>(true);
  const [bleeding, setBleeding] = useState<boolean>(false);
  const [painScore, setPainScore] = useState<number>(4);
  const [symptoms, setSymptoms] = useState('Persistent non-scrapable white patch on left inner cheek (buccal mucosa) with burning sensation on eating spicy food for 3 weeks.');
  const [durationDays, setDurationDays] = useState(21);
  const [severity, setSeverity] = useState('moderate');

  // Image Upload & Quality State
  const [uploading, setUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<ImageUploadResponse | null>(null);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    api.searchPatients().then(setPatients).catch(console.error);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg(null);
    setEnhancedUrl(null);
    try {
      const res = await api.uploadImage(file);
      setUploadedImage(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleApplyEnhancement = async () => {
    if (!uploadedImage) return;
    setEnhancing(true);
    try {
      const res = await api.enhanceImage(uploadedImage.image_id);
      setEnhancedUrl(res.enhanced_url);
    } catch (err: any) {
      setErrorMsg('Conservative enhancement failed: ' + err.message);
    } finally {
      setEnhancing(false);
    }
  };

  const handleSubmitScreening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setErrorMsg('Please select a registered patient.');
      return;
    }
    if (!symptoms.trim()) {
      setErrorMsg('Please enter symptoms description.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const result = await api.createScreening({
        patient_id: Number(selectedPatientId),
        phc_id: user.phc_id || 1,
        category,
        oral_site: category === 'mouth' ? oralSite : undefined,
        lesion_type: category === 'mouth' ? lesionType : undefined,
        mouth_opening_mm: category === 'mouth' ? Number(mouthOpeningMm) : undefined,
        pain_score: Number(painScore),
        bleeding: Boolean(bleeding),
        burning_sensation: Boolean(burningSensation),
        symptoms,
        duration_days: Number(durationDays),
        severity,
        image_id: uploadedImage ? uploadedImage.image_id : null
      });

      setSuccessResult(result);
      if (onScreeningCreated) {
        onScreeningCreated(result.id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit screening');
    } finally {
      setSubmitting(false);
    }
  };

  if (successResult) {
    return (
      <div className="card" style={{ maxWidth: '750px', margin: '2rem auto', padding: '2.5rem', textAlign: 'center' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          backgroundColor: '#DCFCE7', color: '#166534',
          margin: '0 auto 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <CheckCircle2 size={36} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A' }}>
          Screening Successfully Recorded!
        </h2>
        <p style={{ fontSize: '1rem', color: 'var(--teal-primary)', fontWeight: 700, marginTop: '0.35rem' }}>
          Reference ID: {successResult.reference_id}
        </p>

        <div style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '1.25rem',
          textAlign: 'left',
          margin: '1.75rem 0'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.88rem' }}>
            <div><strong>Patient:</strong> {successResult.patient_name} ({successResult.patient_id_display})</div>
            <div><strong>Category:</strong> <span style={{ textTransform: 'capitalize' }}>{successResult.category}</span></div>
            <div><strong>Severity:</strong> {successResult.severity}</div>
            <div><strong>Assigned PHC:</strong> {successResult.phc_name}</div>
          </div>

          {successResult.ai_analysis && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#334155' }}>
                <Sparkles size={16} color="var(--teal-primary)" /> AI Preliminary Guidance (Non-Diagnostic)
              </div>
              <p style={{ fontSize: '0.84rem', color: '#475569', marginTop: '0.3rem' }}>
                {successResult.ai_analysis.recommendations}
              </p>
              <p style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: '0.3rem', fontStyle: 'italic' }}>
                {successResult.ai_analysis.confidence_disclaimer}
              </p>
            </div>
          )}

          <div style={{
            marginTop: '1.25rem',
            background: 'linear-gradient(135deg, #065F46 0%, #047857 100%)',
            border: '2px solid #10B981',
            borderRadius: '10px',
            padding: '1rem',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800, fontSize: '0.95rem' }}>
              <span>📱</span>
              <span>
                {currentLang === 'te'
                  ? 'రోగి రిజిస్టర్డ్ మొబైల్‌కు నిర్ధారణ SMS విజయవంతంగా పంపబడింది!'
                  : 'Confirmation SMS dispatched to patient registered mobile number!'}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', marginTop: '0.35rem', color: '#D1FAE5', lineHeight: 1.5 }}>
              {currentLang === 'te'
                ? `నమస్కారం, మీ నోటి స్క్రీనింగ్ & ఫొటోలు నమోదు చేయబడ్డాయి (Ref: ${successResult.reference_id}). PHC వైద్యాధికారి సమీక్షించి తదుపరి సమాచారం తెలియజేస్తారు.`
                : `Dear patient, your oral screening and photographs (Ref: ${successResult.reference_id}) have been securely recorded. PHC Medical Officer is reviewing.`}
            </div>
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            setSuccessResult(null);
            setUploadedImage(null);
            setEnhancedUrl(null);
            setSymptoms('');
          }}
        >
          {currentLang === 'te' ? 'మరొక స్క్రీనింగ్ నమోదు చేయండి' : 'Create Another Screening'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{t.screening_create_title}</h2>
        <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
          Guided 7-category visible health abnormality capture with quality inspection and clinical triage.
        </p>
      </div>

      {errorMsg && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmitScreening}>
        {/* Step 1: Select Patient */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title" style={{ marginBottom: '1rem' }}>
            1. {t.screening_select_patient}
          </div>
          <div className="form-group">
            <select
              className="form-control"
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(Number(e.target.value))}
              required
            >
              <option value="">-- Choose Registered Patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.patient_id_display} • {p.full_name} ({p.age}y / {p.gender}) • {p.phone_masked}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 2: Choose Screening Category */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title" style={{ marginBottom: '0.5rem' }}>
            2. Visible-Health Screening Category
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '1rem' }}>
            {t.screening_guidelines_note}
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '0.75rem'
          }}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  style={{
                    border: `2px solid ${isSelected ? 'var(--teal-primary)' : '#E2E8F0'}`,
                    background: isSelected ? 'var(--teal-subtle)' : '#FFFFFF',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>{cat.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: isSelected ? '#0F766E' : '#1E293B' }}>
                    {t[cat.labelKey] || cat.id}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>
                    {cat.hint}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2.5: Oral Cavity & Precancer Screening Details (Active when Mouth selected) */}
        {category === 'mouth' && (
          <div className="card" style={{
            marginBottom: '1.5rem',
            background: 'linear-gradient(180deg, #f0fdfa 0%, #ffffff 100%)',
            border: '2px solid #0d9488'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.4rem' }}>🔬</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f766e' }}>
                  {currentLang === 'te' ? 'నోటి క్యాన్సర్ ప్రాథమిక పరీక్ష (Oral Cavity & OPMD)' : 'Oral Cavity & OPMD Examination'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#134e4a' }}>
                  {currentLang === 'te' ? 'IISc-TANUH మరియు NP-NCD ప్రోటోకాల్ ఆధారంగా క్లినికల్ స్క్రీనింగ్.' : 'Guided clinical oral screening based on IISc-TANUH and NP-NCD protocols.'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              {/* Anatomical Oral Site */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, color: '#0f766e' }}>
                  {currentLang === 'te' ? 'నోటి భాగం (Oral Anatomical Site) *' : 'Oral Anatomical Site *'}
                </label>
                <select
                  className="form-control"
                  value={oralSite}
                  onChange={(e) => setOralSite(e.target.value)}
                  style={{ borderColor: '#14b8a6' }}
                >
                  <option value="buccal_mucosa">{currentLang === 'te' ? 'బుగ్గ లోపలి భాగం (Buccal Mucosa)' : 'Left / Right Buccal Mucosa'}</option>
                  <option value="tongue">{currentLang === 'te' ? 'నాలుక అంచులు / పైభాగం (Tongue)' : 'Lateral / Dorsal Tongue'}</option>
                  <option value="floor_of_mouth">{currentLang === 'te' ? 'నాలుక క్రింది భాగం (Floor of Mouth)' : 'Floor of Mouth'}</option>
                  <option value="palate">{currentLang === 'te' ? 'అంగిలి (Hard / Soft Palate)' : 'Hard / Soft Palate'}</option>
                  <option value="gingiva">{currentLang === 'te' ? 'చిగుళ్ళు (Gums / Alveolar Ridge)' : 'Gums / Alveolar Ridge'}</option>
                  <option value="lip">{currentLang === 'te' ? 'పెదవులు (Labial Mucosa / Lips)' : 'Labial Mucosa / Lips'}</option>
                  <option value="retromolar_trigone">{currentLang === 'te' ? 'దవడ వెనుక భాగం (Retromolar Trigone)' : 'Retromolar Trigone'}</option>
                </select>
              </div>

              {/* Lesion Type */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, color: '#0f766e' }}>
                  {currentLang === 'te' ? 'లక్షణ వర్గం (Lesion Appearance) *' : 'Clinical Lesion Appearance *'}
                </label>
                <select
                  className="form-control"
                  value={lesionType}
                  onChange={(e) => setLesionType(e.target.value)}
                  style={{ borderColor: '#14b8a6' }}
                >
                  <option value="leukoplakia">{currentLang === 'te' ? 'ల్యూకోప్లాకియా (తెల్లని మచ్చ - White Plaque)' : 'Leukoplakia (White Plaque)'}</option>
                  <option value="erythroplakia">{currentLang === 'te' ? 'ఎరిత్రోప్లాకియా (ఎర్రటి మచ్చ - High Malignant Risk)' : 'Erythroplakia (High Malignant Risk)'}</option>
                  <option value="erythroleukoplakia">{currentLang === 'te' ? 'మిశ్రమ ఎరుపు & తెలుపు మచ్చ (Erythroleukoplakia)' : 'Mixed Erythroleukoplakia'}</option>
                  <option value="osmf">{currentLang === 'te' ? 'నోటి బిగువు (Oral Submucous Fibrosis - OSMF)' : 'Oral Submucous Fibrosis - OSMF'}</option>
                  <option value="persistent_ulcer">{currentLang === 'te' ? 'మానని పుండు >2 వారాలు (Non-healing Ulcer)' : 'Non-healing Ulcer >2 weeks'}</option>
                  <option value="growth_mass">{currentLang === 'te' ? 'గడ్డ / పులిపిరి పెరుగుదల (Vegetative Mass)' : 'Vegetative Mass / Growth'}</option>
                  <option value="lichen_planus">{currentLang === 'te' ? 'లైకెన్ ప్లానస్ (తెల్లని చారలు - Lichen Planus)' : 'Oral Lichen Planus'}</option>
                </select>
              </div>
            </div>

            {/* Mouth Opening (OSMF Tracker) */}
            <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '10px', border: '1px solid #ccfbf1', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ fontWeight: 700, color: '#0f766e', margin: 0 }}>
                  {currentLang === 'te' ? 'నోరు తెరవగల దూరం:' : 'Inter-incisal Mouth Opening:'} <strong>{mouthOpeningMm} mm</strong>
                </label>
                <span style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '999px',
                  fontWeight: 700,
                  background: mouthOpeningMm < 35 ? '#fee2e2' : '#dcfce7',
                  color: mouthOpeningMm < 35 ? '#b91c1c' : '#166534'
                }}>
                  {mouthOpeningMm < 35
                    ? (currentLang === 'te' ? '⚠️ పరిమితం (<35 mm) • OSMF అనుమానం' : '⚠️ Restricted (<35 mm) • OSMF Suspect')
                    : (currentLang === 'te' ? '✓ సాధారణం (>35 mm)' : '✓ Normal (>35 mm)')}
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="55"
                step="1"
                value={mouthOpeningMm}
                onChange={(e) => setMouthOpeningMm(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#0d9488' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
                <span>{currentLang === 'te' ? '15 mm (తీవ్ర బిగువు)' : '15 mm (Severe Trismus)'}</span>
                <span>{currentLang === 'te' ? '35 mm (కటాఫ్)' : '35 mm (Cutoff)'}</span>
                <span>{currentLang === 'te' ? '55 mm (సాధారణం)' : '55 mm (Full Normal)'}</span>
              </div>
            </div>

            {/* Burning sensation & Pain score */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccfbf1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={burningSensation}
                    onChange={(e) => setBurningSensation(e.target.checked)}
                    style={{ accentColor: '#0d9488' }}
                  />
                  <span>{currentLang === 'te' ? 'కారం తిన్నప్పుడు మంట (Burning Sensation)' : 'Burning Sensation on Spicy Food'}</span>
                </label>
              </div>

              <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccfbf1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={bleeding}
                    onChange={(e) => setBleeding(e.target.checked)}
                    style={{ accentColor: '#0d9488' }}
                  />
                  <span>{currentLang === 'te' ? 'రక్తస్రావం (Bleeding on Touch)' : 'Bleeding on Touch'}</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Guided Image Capture & Live Quality Assessment */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title" style={{ marginBottom: '0.5rem' }}>
            3. {t.photo_capture_title}
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '1rem' }}>
            Supported formats: JPEG, PNG, WEBP. Max size 15MB. Server will inspect blur and lighting with OpenCV.
          </p>

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {!uploadedImage ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed #CBD5E1',
                borderRadius: '12px',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                backgroundColor: '#F8FAFC',
                cursor: 'pointer',
                transition: 'border-color 0.2s ease'
              }}
            >
              <Camera size={42} color="var(--teal-primary)" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1E293B' }}>
                {uploading ? 'Analyzing Image Quality...' : t.photo_take_btn}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.3rem' }}>
                or tap here to choose from device gallery / desktop files
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                {/* Original Image Preview */}
                <div style={{ flex: '1 1 280px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                    Captured Original:
                  </div>
                  <img
                    src={uploadedImage.preview_url}
                    alt="Screening Preview"
                    style={{
                      width: '100%',
                      maxHeight: '260px',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#000'
                    }}
                  />
                </div>

                {/* Enhanced Image Preview if CLAHE requested */}
                {enhancedUrl && (
                  <div style={{ flex: '1 1 280px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0D9488', marginBottom: '0.4rem' }}>
                      Conservative CLAHE Enhanced:
                    </div>
                    <img
                      src={enhancedUrl}
                      alt="Enhanced Preview"
                      style={{
                        width: '100%',
                        maxHeight: '260px',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        border: '2px solid var(--teal-primary)',
                        backgroundColor: '#000'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Quality Assessment Feedback Card */}
              <div className="quality-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`badge ${
                      uploadedImage.quality.quality_state === 'excellent' ? 'badge-success' :
                      uploadedImage.quality.quality_state === 'acceptable' ? 'badge-info' : 'badge-danger'
                    }`}>
                      {uploadedImage.quality.quality_state.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      OpenCV Blur Score: {uploadedImage.quality.blur_score} | Luminance: {uploadedImage.quality.luminance_score}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minHeight: '32px', padding: '0.25rem 0.65rem', fontSize: '0.78rem' }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <RefreshCw size={14} /> Retake
                  </button>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: '0.5rem' }}>
                  <strong>Guidance:</strong> {uploadedImage.quality.guidance_message}
                </div>

                {/* Enhancement Action */}
                {!enhancedUrl && (
                  <div style={{ marginTop: '0.85rem' }}>
                    <button
                      type="button"
                      className="btn btn-outline-teal"
                      style={{ minHeight: '34px', fontSize: '0.8rem' }}
                      disabled={enhancing}
                      onClick={handleApplyEnhancement}
                    >
                      <Sparkles size={14} />
                      {enhancing ? 'Applying CLAHE Filter...' : t.photo_enhance_btn}
                    </button>
                    <span style={{ fontSize: '0.72rem', color: '#64748B', marginLeft: '0.75rem' }}>
                      (Applies non-generative contrast enhancement to highlight lesion margins)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step 4: Symptoms & Duration */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title" style={{ marginBottom: '1rem' }}>
            4. Symptoms & Clinical Timeline
          </div>

          <div className="form-group">
            <label className="form-label">{t.screening_symptoms} *</label>
            <textarea
              className="form-control"
              rows={3}
              required
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="e.g. Red itchy rash on left arm for 4 days. Mild burning sensation in sunlight..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">{t.screening_duration} *</label>
              <input
                type="number"
                min="1"
                max="365"
                className="form-control"
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t.screening_severity}</label>
              <select
                className="form-control"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                <option value="mild">{t.screening_severity_mild}</option>
                <option value="moderate">{t.screening_severity_moderate}</option>
                <option value="severe">{t.screening_severity_severe}</option>
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', fontSize: '1rem', padding: '0.85rem' }}
          disabled={submitting || uploading}
        >
          <Send size={18} />
          {submitting
            ? (currentLang === 'te' ? 'సమర్పిస్తోంది...' : 'Submitting & Queueing SMS...')
            : (currentLang === 'te' ? 'స్క్రీనింగ్ భద్రపరచండి & PHC సమీక్షకు పంపండి' : 'Save Screening & Submit for PHC Review')}
        </button>
      </form>
    </div>
  );
};
