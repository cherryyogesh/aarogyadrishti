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
  const [category, setCategory] = useState('skin');
  const [symptoms, setSymptoms] = useState('');
  const [durationDays, setDurationDays] = useState(3);
  const [severity, setSeverity] = useState('mild');

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

          <div style={{ marginTop: '1rem', background: '#E0F2FE', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', color: '#0369A1' }}>
            ✓ Automated confirmation SMS queued to patient registered mobile number. Case added to PHC medical review queue.
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
          Create Another Screening
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
          {submitting ? 'Submitting & Queueing SMS...' : 'Save Screening & Submit for PHC Review'}
        </button>
      </form>
    </div>
  );
};
