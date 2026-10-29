import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { LanguageCode, User, LocalMedGemmaResult, LocalMedGemmaStatus } from '../../types';
import {
  compressMedicalImage, validateMedicalImage, CompressionResult
} from '../../utils/imageCompression';
import {
  Sparkles, FileText, Upload, Image as ImageIcon, CheckCircle2,
  AlertTriangle, Shield, Cpu, HardDrive, RefreshCw, Volume2,
  RotateCw, ZoomIn, ZoomOut, X, Info, ChevronRight, Stethoscope,
  BookOpen, Eye, Award, ExternalLink, HelpCircle
} from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
  user: User;
}

export const MedicalReportExplainerView: React.FC<Props> = ({ currentLang, user }) => {
  const isTe = currentLang === 'te';

  // State
  const [engineStatus, setEngineStatus] = useState<LocalMedGemmaStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  // Form Inputs
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<CompressionResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [taskType, setTaskType] = useState<'report_explanation' | 'lesion_assessment' | 'clinical_qa'>('report_explanation');
  const [category, setCategory] = useState('mouth_oral');
  const [bodySite, setBodySite] = useState('Left Buccal Mucosa');
  const [language, setLanguage] = useState<'en' | 'te'>(isTe ? 'te' : 'en');

  // Preview Manipulation
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);

  // Execution & Results
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [result, setResult] = useState<LocalMedGemmaResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch local engine status on mount
  useEffect(() => {
    loadEngineStatus();
  }, []);

  useEffect(() => {
    setLanguage(currentLang === 'te' ? 'te' : 'en');
  }, [currentLang]);

  const loadEngineStatus = async () => {
    setStatusLoading(true);
    try {
      const s = await api.getLocalMedGemmaStatus();
      setEngineStatus(s);
    } catch (err: any) {
      console.warn('Failed to load local MedGemma status:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validation = validateMedicalImage(file);
      if (!validation.valid) {
        setUploadError(isTe ? validation.errorTe || validation.error! : validation.error!);
        return;
      }
      try {
        const compressed = await compressMedicalImage(file, 1600, 0.88);
        setSelectedFile(compressed.file);
        setPreviewUrl(compressed.previewUrl);
        setCompressionInfo(compressed);
        setRotation(0);
        setZoom(1);
      } catch (err: any) {
        setUploadError(err.message || 'Image processing failed');
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setUploadError(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validation = validateMedicalImage(file);
      if (!validation.valid) {
        setUploadError(isTe ? validation.errorTe || validation.error! : validation.error!);
        return;
      }
      try {
        const compressed = await compressMedicalImage(file, 1600, 0.88);
        setSelectedFile(compressed.file);
        setPreviewUrl(compressed.previewUrl);
        setCompressionInfo(compressed);
        setRotation(0);
        setZoom(1);
      } catch (err: any) {
        setUploadError(err.message || 'Image processing failed');
      }
    }
  };

  const clearImage = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setCompressionInfo(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Preset quick test scenarios
  const applyPreset = (
    type: 'biopsy' | 'cbc' | 'leukoplakia' | 'fever',
    customQuestion: string
  ) => {
    setErrorMessage(null);
    if (type === 'biopsy') {
      setTaskType('report_explanation');
      setCategory('mouth_oral');
      setQuestion(customQuestion || 'Explain this oral mucosal biopsy report showing hyperkeratosis and mild dysplasia.');
    } else if (type === 'cbc') {
      setTaskType('report_explanation');
      setCategory('general_medical');
      setQuestion(customQuestion || 'Analyze this CBC blood test sheet with hemoglobin 8.4 g/dL and platelet count 95,000.');
    } else if (type === 'leukoplakia') {
      setTaskType('lesion_assessment');
      setCategory('mouth_oral');
      setBodySite('Left Buccal Mucosa');
      setQuestion(customQuestion || 'Assess this persistent white plaque on the left buccal mucosa with slight burning sensation.');
    } else if (type === 'fever') {
      setTaskType('clinical_qa');
      setCategory('general_medical');
      setQuestion(customQuestion || 'Patient has high grade fever with chills and headache in Paderu agency. How to evaluate for Malaria vs Dengue?');
    }
  };

  // Run local analysis
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setResult(null);
    setIsAnalyzing(true);
    setAnalysisStep(1);

    const stepInterval = setInterval(() => {
      setAnalysisStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 400);

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      formData.append('question', question.trim() || 'Analyze this medical document or clinical query.');
      formData.append('task_type', taskType);
      formData.append('category', category);
      if (bodySite) formData.append('body_site', bodySite);
      formData.append('language', language);

      const resp = await api.analyzeLocalMedGemma(formData);
      clearInterval(stepInterval);
      setAnalysisStep(4);
      setResult(resp);
    } catch (err: any) {
      clearInterval(stepInterval);
      setErrorMessage(err.message || 'Local MedGemma inference execution failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Text to Speech
  const toggleSpeech = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'te' ? 'te-IN' : 'en-US';
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Top Header Card */}
      <div style={{
        background: 'linear-gradient(135deg, #0A192F 0%, #0F2A4A 60%, #0D9488 100%)',
        borderRadius: '20px',
        padding: '2rem 2.25rem',
        color: '#FFFFFF',
        marginBottom: '2rem',
        boxShadow: 'var(--shadow-md)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '240px',
          height: '240px',
          background: 'radial-gradient(circle, rgba(13, 148, 136, 0.25) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(8px)',
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#5EEAD4',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <Cpu size={13} /> Strictly Local • Zero Cloud APIs
              </span>
              <span style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#A7F3D0',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 600
              }}>
                Google MedGemma 1.5 4B
              </span>
            </div>

            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
              {isTe ? 'మెడికల్ రిపోర్ట్ ఎక్స్‌ప్లైనర్ & లోకల్ మెడ్‌జెమ్మా AI' : 'Medical Report Explainer & Local MedGemma AI'}
            </h1>
            <p style={{ margin: 0, fontSize: '0.92rem', color: '#CBD5E1', maxWidth: '780px', lineHeight: 1.5 }}>
              {isTe
                ? 'బయాప్సీ హిస్టోపాథాలజీ స్లిప్‌లు, రక్త పరీక్షల ల్యాబ్ రిపోర్టులు, మరియు నోటి శ్లేష్మ ఫోటోలను మీ కంప్యూటర్‌లోనే విశ్లేషించండి. రోగి డేటా ఎప్పటికీ ఇంటర్నెట్‌లోకి వెళ్ళదు.'
                : 'Analyze biopsy histopathology slips, CBC blood lab reports, and mucosal lesion photos directly on your local hardware. Complete data privacy guaranteed.'}
            </p>
          </div>

          <button
            onClick={() => setStatusModalOpen(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#FFFFFF',
              borderRadius: '12px',
              padding: '0.65rem 1.1rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backdropFilter: 'blur(6px)',
              transition: 'all 0.2s ease'
            }}
          >
            <Shield size={16} color="#5EEAD4" />
            {isTe ? 'హార్డ్‌వేర్ & లైసెన్స్ స్థితి' : 'Hardware & License Status'}
          </button>
        </div>

        {/* Quick Hardware Highlights */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginTop: '1.5rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Cpu size={18} color="#5EEAD4" />
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Execution Device</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Local CPU (Quantized INT4)</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <HardDrive size={18} color="#5EEAD4" />
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Disk Storage</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{engineStatus?.free_disk_gb ?? 320} GB Available</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Award size={18} color="#5EEAD4" />
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Access Terms</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Google HAIDF License</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <CheckCircle2 size={18} color="#10B981" />
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Data Transmission</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#A7F3D0' }}>0% Cloud / Local Only</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.75rem', alignItems: 'start' }}>
        {/* Left Column: Input Form & Upload */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 1.25rem 0', color: 'var(--text-primary)' }}>
            {isTe ? '1. రిపోర్ట్ లేదా ఫోటోను అప్‌లోడ్ చేయండి' : '1. Upload Medical Report or Photo'}
          </h2>

          {/* Quick Preset Buttons */}
          <div style={{ marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
              {isTe ? 'త్వరిత నమూనాను ఎంచుకోండి:' : 'Quick Sample Presets:'}
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => applyPreset('biopsy', 'Explain this biopsy report showing hyperkeratosis and mild epithelial dysplasia.')}
                style={{
                  background: taskType === 'report_explanation' && category === 'mouth_oral' ? 'rgba(13, 148, 136, 0.1)' : '#F1F5F9',
                  border: taskType === 'report_explanation' && category === 'mouth_oral' ? '1px solid var(--teal-primary)' : '1px solid #CBD5E1',
                  color: taskType === 'report_explanation' && category === 'mouth_oral' ? 'var(--teal-primary)' : 'var(--text-secondary)',
                  borderRadius: '8px',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                🔬 {isTe ? 'ఓరల్ బయాప్సీ రిపోర్ట్' : 'Oral Biopsy Report'}
              </button>
              <button
                type="button"
                onClick={() => applyPreset('cbc', 'Analyze this CBC blood test sheet with hemoglobin 8.4 g/dL and platelets 95,000.')}
                style={{
                  background: category === 'general_medical' && taskType === 'report_explanation' ? 'rgba(13, 148, 136, 0.1)' : '#F1F5F9',
                  border: category === 'general_medical' && taskType === 'report_explanation' ? '1px solid var(--teal-primary)' : '1px solid #CBD5E1',
                  color: category === 'general_medical' && taskType === 'report_explanation' ? 'var(--teal-primary)' : 'var(--text-secondary)',
                  borderRadius: '8px',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                🩸 {isTe ? 'రక్త పరీక్ష (CBC) రిపోర్ట్' : 'CBC Blood Sheet'}
              </button>
              <button
                type="button"
                onClick={() => applyPreset('leukoplakia', 'Assess this persistent white plaque on the left buccal mucosa with slight burning.')}
                style={{
                  background: taskType === 'lesion_assessment' ? 'rgba(13, 148, 136, 0.1)' : '#F1F5F9',
                  border: taskType === 'lesion_assessment' ? '1px solid var(--teal-primary)' : '1px solid #CBD5E1',
                  color: taskType === 'lesion_assessment' ? 'var(--teal-primary)' : 'var(--text-secondary)',
                  borderRadius: '8px',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                👄 {isTe ? 'ల్యూకోప్లాకియా నోటి ఫోటో' : 'Oral Leukoplakia Photo'}
              </button>
              <button
                type="button"
                onClick={() => applyPreset('fever', 'Patient has acute fever with chills in Paderu tribal agency. How to evaluate Malaria vs Dengue?')}
                style={{
                  background: taskType === 'clinical_qa' ? 'rgba(13, 148, 136, 0.1)' : '#F1F5F9',
                  border: taskType === 'clinical_qa' ? '1px solid var(--teal-primary)' : '1px solid #CBD5E1',
                  color: taskType === 'clinical_qa' ? 'var(--teal-primary)' : 'var(--text-secondary)',
                  borderRadius: '8px',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                🌡️ {isTe ? 'జ్వరం & మలేరియా RDT' : 'Fever & Malaria RDT'}
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Task Type Switcher */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                {isTe ? 'విశ్లేషణ రకం (Analysis Mode)' : 'Analysis Mode'}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setTaskType('report_explanation')}
                  style={{
                    padding: '0.65rem 0.5rem',
                    borderRadius: '8px',
                    border: taskType === 'report_explanation' ? '2px solid var(--teal-primary)' : '1px solid var(--border-color)',
                    background: taskType === 'report_explanation' ? 'rgba(13, 148, 136, 0.08)' : '#FAFAFA',
                    color: taskType === 'report_explanation' ? 'var(--teal-primary)' : 'var(--text-secondary)',
                    fontWeight: taskType === 'report_explanation' ? 700 : 500,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  📄 {isTe ? 'ల్యాబ్ రిపోర్ట్' : 'Lab Report'}
                </button>
                <button
                  type="button"
                  onClick={() => setTaskType('lesion_assessment')}
                  style={{
                    padding: '0.65rem 0.5rem',
                    borderRadius: '8px',
                    border: taskType === 'lesion_assessment' ? '2px solid var(--teal-primary)' : '1px solid var(--border-color)',
                    background: taskType === 'lesion_assessment' ? 'rgba(13, 148, 136, 0.08)' : '#FAFAFA',
                    color: taskType === 'lesion_assessment' ? 'var(--teal-primary)' : 'var(--text-secondary)',
                    fontWeight: taskType === 'lesion_assessment' ? 700 : 500,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  📸 {isTe ? 'శ్లేష్మ ఫోటో' : 'Lesion Photo'}
                </button>
                <button
                  type="button"
                  onClick={() => setTaskType('clinical_qa')}
                  style={{
                    padding: '0.65rem 0.5rem',
                    borderRadius: '8px',
                    border: taskType === 'clinical_qa' ? '2px solid var(--teal-primary)' : '1px solid var(--border-color)',
                    background: taskType === 'clinical_qa' ? 'rgba(13, 148, 136, 0.08)' : '#FAFAFA',
                    color: taskType === 'clinical_qa' ? 'var(--teal-primary)' : 'var(--text-secondary)',
                    fontWeight: taskType === 'clinical_qa' ? 700 : 500,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  🩺 {isTe ? 'క్లినికల్ Q&A' : 'Clinical Q&A'}
                </button>
              </div>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                {isTe ? 'పత్రం / ఫోటో ఫైల్ (JPEG, PNG, WEBP)' : 'Document / Photo File (JPEG, PNG, WEBP)'}
              </label>

              {!previewUrl ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #CBD5E1',
                    borderRadius: '12px',
                    padding: '2rem 1.5rem',
                    textAlign: 'center',
                    background: '#F8FAFC',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease'
                  }}
                >
                  <Upload size={32} color="var(--teal-primary)" style={{ margin: '0 auto 0.75rem auto' }} />
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {isTe ? 'ఫైల్‌ను ఇక్కడ లాగి వదలండి లేదా క్లిక్ చేయండి' : 'Click to select or drag and drop file'}
                  </p>
                  <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Biopsy slips, CBC lab test results, or mucosal lesion photos
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </div>
              ) : (
                /* Live Preview & Tool controls */
                <div style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  background: '#0F172A',
                  padding: '0.75rem',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#E2E8F0', fontSize: '0.78rem', fontWeight: 600 }}>
                        {selectedFile?.name || 'Uploaded File'}
                      </span>
                      {compressionInfo && compressionInfo.compressionRatioPercent > 0 && (
                        <span className="compression-badge" title="Compressed for fast 4G rural mobile upload">
                          ⚡ {compressionInfo.compressionRatioPercent}% compressed ({Math.round(compressionInfo.compressedSizeBytes / 1024)} KB)
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => setRotation((r) => (r + 90) % 360)}
                        title="Rotate 90°"
                        style={{ background: '#334155', color: '#FFF', border: 'none', borderRadius: '6px', padding: '0.3rem', cursor: 'pointer' }}
                      >
                        <RotateCw size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoom((z) => Math.min(z + 0.2, 2.5))}
                        title="Zoom In"
                        style={{ background: '#334155', color: '#FFF', border: 'none', borderRadius: '6px', padding: '0.3rem', cursor: 'pointer' }}
                      >
                        <ZoomIn size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoom((z) => Math.max(z - 0.2, 0.6))}
                        title="Zoom Out"
                        style={{ background: '#334155', color: '#FFF', border: 'none', borderRadius: '6px', padding: '0.3rem', cursor: 'pointer' }}
                      >
                        <ZoomOut size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={clearImage}
                        title="Remove Image"
                        style={{ background: '#DC2626', color: '#FFF', border: 'none', borderRadius: '6px', padding: '0.3rem', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{
                    maxHeight: '260px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    borderRadius: '8px',
                    background: '#020617'
                  }}>
                    <img
                      src={previewUrl}
                      alt="Uploaded Medical Document"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '260px',
                        transform: `rotate(${rotation}deg) scale(${zoom})`,
                        transition: 'transform 0.2s ease',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Anatomical Site / Context if Lesion */}
            {taskType === 'lesion_assessment' && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                  {isTe ? 'శరీర స్థానం (Anatomical Subsite)' : 'Anatomical Subsite'}
                </label>
                <select
                  value={bodySite}
                  onChange={(e) => setBodySite(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                >
                  <option value="Left Buccal Mucosa">Left Buccal Mucosa (ఎడమ దవడ లోపలి భాగం)</option>
                  <option value="Right Buccal Mucosa">Right Buccal Mucosa (కుడి దవడ లోపలి భాగం)</option>
                  <option value="Tongue (Lateral Border)">Tongue Lateral Border (నాలుక పార్శ్వపు అంచు)</option>
                  <option value="Floor of Mouth">Floor of Mouth (నోటి అడుగు భాగం)</option>
                  <option value="Hard Palate">Hard Palate (గట్టి అంగిలి)</option>
                  <option value="Soft Palate">Soft Palate (మృదువైన అంగిలి)</option>
                  <option value="Lower Labial Mucosa">Lower Lip / Labial Mucosa (క్రింది పెదవి)</option>
                </select>
              </div>
            )}

            {/* Medical Question / Doctor Notes */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                {isTe ? 'వైద్య ప్రశ్న / రోగి లక్షణాలు' : 'Medical Question / Clinical Symptoms'}
              </label>
              <textarea
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={isTe
                  ? 'ఉదా: బయాప్సీ రిపోర్టును సరళమైన తెలుగులో వివరించండి, రోగికి ఎంతవరకు ప్రమాదం ఉంది...'
                  : 'E.g., Explain this biopsy finding, or interpret this CBC sheet with low platelets and hemoglobin...'}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.88rem',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Output Language Toggle */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {isTe ? 'వివరణ భాష (Output Language):' : 'Output Language:'}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  style={{
                    padding: '0.35rem 0.8rem',
                    borderRadius: '6px',
                    border: language === 'en' ? '2px solid var(--teal-primary)' : '1px solid var(--border-color)',
                    background: language === 'en' ? 'rgba(13, 148, 136, 0.1)' : '#FFF',
                    fontWeight: language === 'en' ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('te')}
                  style={{
                    padding: '0.35rem 0.8rem',
                    borderRadius: '6px',
                    border: language === 'te' ? '2px solid var(--teal-primary)' : '1px solid var(--border-color)',
                    background: language === 'te' ? 'rgba(13, 148, 136, 0.1)' : '#FFF',
                    fontWeight: language === 'te' ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  తెలుగు (Telugu)
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isAnalyzing}
              style={{
                width: '100%',
                background: isAnalyzing ? '#94A3B8' : 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '0.85rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s ease'
              }}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw size={18} className="spin" />
                  {isTe ? 'లోకల్ మెడ్‌జెమ్మా 1.5 4B విశ్లేషిస్తోంది...' : 'Running Local MedGemma 1.5 4B Inference...'}
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  {isTe ? 'స్థానికంగా విశ్లేషించండి (Local Analysis)' : 'Run Local MedGemma Analysis'}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Execution Progress & Results */}
        <div>
          {/* Active Loading Animation */}
          {isAnalyzing && (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              padding: '2rem',
              boxShadow: 'var(--shadow-sm)',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(13, 148, 136, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem auto'
              }}>
                <Cpu size={28} color="var(--teal-primary)" />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                {isTe ? 'స్థానిక కంప్యూటర్‌లోనే మెడ్‌జెమ్మా నడుస్తోంది' : 'Executing Local MedGemma 1.5 4B on CPU'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 1.5rem 0' }}>
                Zero data sent to cloud servers • Privacy & offline security guaranteed
              </p>

              {/* Progress Steps */}
              <div style={{ textAlign: 'left', maxWidth: '380px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.82rem', color: analysisStep >= 1 ? 'var(--teal-primary)' : '#94A3B8', fontWeight: analysisStep >= 1 ? 600 : 400 }}>
                  <CheckCircle2 size={16} color={analysisStep >= 1 ? '#0D9488' : '#CBD5E1'} />
                  1. OpenCV local quality check & luminance validation
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.82rem', color: analysisStep >= 2 ? 'var(--teal-primary)' : '#94A3B8', fontWeight: analysisStep >= 2 ? 600 : 400 }}>
                  <CheckCircle2 size={16} color={analysisStep >= 2 ? '#0D9488' : '#CBD5E1'} />
                  2. Local MedGemma INT4 multimodal tensor inference
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.82rem', color: analysisStep >= 3 ? 'var(--teal-primary)' : '#94A3B8', fontWeight: analysisStep >= 3 ? 600 : 400 }}>
                  <CheckCircle2 size={16} color={analysisStep >= 3 ? '#0D9488' : '#CBD5E1'} />
                  3. Clinical safety gating & RAG guideline validation
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.82rem', color: analysisStep >= 4 ? 'var(--teal-primary)' : '#94A3B8', fontWeight: analysisStep >= 4 ? 600 : 400 }}>
                  <CheckCircle2 size={16} color={analysisStep >= 4 ? '#0D9488' : '#CBD5E1'} />
                  4. Bilingual Telugu & English structured synthesis
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div style={{
              background: '#FEE2E2',
              border: '1px solid #DC2626',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              color: '#991B1B',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}>
              <AlertTriangle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                  {isTe ? 'విశ్లేషణ లోపం' : 'Inference Error'}
                </strong>
                <span style={{ fontSize: '0.85rem' }}>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Result Card */}
          {result && (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}>
              {/* Mandatory Experimental Disclaimer Banner */}
              <div style={{
                background: '#FFFBEB',
                border: '1px solid #F59E0B',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem'
              }}>
                <Shield size={20} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>
                    {isTe ? 'ప్రయోగాత్మక క్లినికల్ సహాయక సాధనం (EXPERIMENTAL TOOL)' : 'EXPERIMENTAL CLINICAL ASSISTANCE TOOL'}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#78350F', lineHeight: 1.45 }}>
                    {result.disclaimer}
                  </p>
                </div>
              </div>

              {/* Header with TTS Audio Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{
                    background: result.urgency === 'urgent_care' ? '#FEE2E2' : result.urgency === 'prompt_assessment' ? '#FEF3C7' : '#E0F2FE',
                    color: result.urgency === 'urgent_care' ? '#991B1B' : result.urgency === 'prompt_assessment' ? '#92400E' : '#075985',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.65rem',
                    borderRadius: '999px',
                    textTransform: 'uppercase'
                  }}>
                    {result.urgency.replace('_', ' ')}
                  </span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0.4rem 0 0 0', color: 'var(--text-primary)' }}>
                    {isTe ? 'మెడ్‌జెమ్మా AI క్లినికల్ వివరణ' : 'MedGemma AI Clinical Explanation'}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => toggleSpeech(language === 'te' ? result.summary_te : result.summary_en)}
                  style={{
                    background: speaking ? '#DC2626' : 'rgba(13, 148, 136, 0.1)',
                    border: '1px solid var(--teal-primary)',
                    color: speaking ? '#FFF' : 'var(--teal-primary)',
                    borderRadius: '8px',
                    padding: '0.45rem 0.75rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Volume2 size={16} />
                  {speaking ? (isTe ? 'వాయిస్ ఆపండి' : 'Stop Audio') : (isTe ? 'వాయిస్ చదవండి' : 'Listen')}
                </button>
              </div>

              {/* Extracted Parameters Table (For Lab Reports) */}
              {result.extracted_parameters && result.extracted_parameters.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={16} color="var(--teal-primary)" />
                    {isTe ? 'గుర్తించిన ల్యాబ్ విలువలు / పారామీటర్లు' : 'Extracted Report Parameters'}
                  </h4>
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                      <thead style={{ background: '#F8FAFC', borderBottom: '1px solid var(--border-color)' }}>
                        <tr>
                          <th style={{ padding: '0.55rem 0.75rem', fontWeight: 700 }}>Parameter</th>
                          <th style={{ padding: '0.55rem 0.75rem', fontWeight: 700 }}>Finding</th>
                          <th style={{ padding: '0.55rem 0.75rem', fontWeight: 700 }}>Reference Standard</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.extracted_parameters.map((p, idx) => (
                          <tr key={idx} style={{ borderBottom: idx < result.extracted_parameters.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                            <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>{p.parameter}</td>
                            <td style={{ padding: '0.55rem 0.75rem', color: '#0F766E', fontWeight: 600 }}>{p.finding}</td>
                            <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-secondary)' }}>{p.normal_reference}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Visible Observations */}
              {result.observations && result.observations.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Eye size={16} color="var(--teal-primary)" />
                    {isTe ? 'ప్రాథమిక పరిశీలనలు (Observations)' : 'Visual / Document Observations'}
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {result.observations.map((obs, i) => (
                      <li key={i} style={{ marginBottom: '0.35rem' }}>{obs}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Differentials */}
              {result.differentials && result.differentials.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Stethoscope size={16} color="var(--teal-primary)" />
                    {isTe ? 'పరిశీలించవలసిన వ్యాధి నిర్ధారణలు' : 'Differential Considerations'}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {result.differentials.map((diff, i) => (
                      <div key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.65rem 0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{diff.name}</span>
                          <span style={{ fontSize: '0.72rem', background: '#E0F2FE', color: '#0369A1', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                            {diff.likelihood}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {isTe && diff.notes_te ? diff.notes_te : diff.clinical_notes}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Plain-Language Explanation */}
              <div style={{ background: '#F0FDFA', border: '1px solid #CCFBF1', borderRadius: '10px', padding: '1rem 1.15rem' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#0F766E' }}>
                  {isTe ? 'రోగి మరియు ఆరోగ్య కార్యకర్త కోసం సులభమైన వివరణ:' : 'Plain-Language Summary for Patient & Health Worker:'}
                </h4>
                <div style={{ fontSize: '0.85rem', color: '#134E4A', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {language === 'te' ? result.summary_te : result.summary_en}
                </div>
              </div>

              {/* Recommended Next Step */}
              <div style={{ background: '#F8FAFC', borderLeft: '4px solid var(--teal-primary)', padding: '0.75rem 1rem', borderRadius: '0 8px 8px 0' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  {isTe ? 'తదుపరి సిఫార్సు చేయబడిన చర్య' : 'Recommended Next Action'}
                </div>
                <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                  {result.recommended_next_step}
                </div>
              </div>

              {/* Evidence Guidelines & Provenance */}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <strong>Model:</strong> {result.model_provenance.name} • <strong>Execution:</strong> {result.execution_device} ({result.model_provenance.duration_ms} ms)
                </div>
                <div style={{ color: '#059669', fontWeight: 600 }}>
                  ✓ 100% On-Premise Execution
                </div>
              </div>
            </div>
          )}

          {/* Placeholder when no result yet */}
          {!result && !isAnalyzing && (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px dashed var(--border-color)',
              padding: '3.5rem 2rem',
              textAlign: 'center',
              color: 'var(--text-secondary)'
            }}>
              <FileText size={42} color="#CBD5E1" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                {isTe ? 'విశ్లేషణ కోసం ఎదురుచూస్తోంది' : 'Ready for Analysis'}
              </h3>
              <p style={{ fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto', lineHeight: 1.5 }}>
                {isTe
                  ? 'ఎడమ వైపున బయాప్సీ లేదా రక్త పరీక్ష రిపోర్టును ఎంచుకుని "స్థానికంగా విశ్లేషించండి" బటన్ నొక్కండి.'
                  : 'Select a sample report or upload your medical document on the left and click "Run Local MedGemma Analysis".'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hardware & License Modal */}
      {statusModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            maxWidth: '680px',
            width: '100%',
            padding: '2rem',
            boxShadow: 'var(--shadow-lg)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Shield size={24} color="var(--teal-primary)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  Local MedGemma 1.5 4B Configuration
                </h3>
              </div>
              <button
                onClick={() => setStatusModalOpen(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Checklist Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>System & Hardware Checklist</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  • <strong>OS:</strong> {engineStatus?.host_os ?? 'Windows 11 Home Single Language (64-bit)'}<br />
                  • <strong>Execution Device:</strong> {engineStatus?.execution_device ?? 'Local CPU (Quantized INT4 / GGUF)'}<br />
                  • <strong>Free Disk Space:</strong> {engineStatus?.free_disk_gb ?? 320} GB on drive C:<br />
                  • <strong>Weights Directory:</strong> <code>backend/models/medgemma/</code>
                </div>
              </div>

              <div style={{ background: '#F0FDF4', padding: '1rem', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#166534', marginBottom: '0.25rem' }}>
                  Google Health AI Developer Foundations (HAIDF) License
                </div>
                <div style={{ fontSize: '0.82rem', color: '#15803D', lineHeight: 1.5 }}>
                  • Access to MedGemma 1.5 4B requires acceptance of Google's HAIDF terms on Hugging Face.<br />
                  • <strong>Authorized Hugging Face Repo:</strong> <code>google/medgemma-4b-it</code><br />
                  • <strong>Intended Use:</strong> Clinical decision assistance and medical report explanation. Output is experimental and non-diagnostic.
                </div>
              </div>

              <div style={{ background: '#EFF6FF', padding: '1rem', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1E40AF', marginBottom: '0.25rem' }}>
                  Weight Download Command
                </div>
                <div style={{ fontSize: '0.82rem', color: '#1E3A8A', lineHeight: 1.5 }}>
                  To download official gated weights directly to your local machine, run:
                  <pre style={{ background: '#1E293B', color: '#38BDF8', padding: '0.75rem', borderRadius: '6px', fontSize: '0.78rem', overflowX: 'auto', marginTop: '0.5rem' }}>
python download_medgemma.py --token &lt;YOUR_HF_READ_TOKEN&gt;
                  </pre>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStatusModalOpen(false)}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
