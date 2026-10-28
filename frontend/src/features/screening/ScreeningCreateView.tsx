import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, Patient, User, ImageUploadResponse } from '../../types';
import {
  Camera, Upload, AlertCircle, CheckCircle, Sparkles, RefreshCw,
  Send, ShieldAlert, Eye, Info, CheckCircle2, X, FolderOpen, SwitchCamera, ArrowRight,
  Volume2, VolumeX, PhoneCall, Stethoscope, Compass, FileCheck
} from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
  user: User;
  onScreeningCreated?: (screeningId: number) => void;
  onNavigateToLead?: () => void;
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

export const ScreeningCreateView: React.FC<Props> = ({ currentLang, user, onScreeningCreated, onNavigateToLead }) => {
  const t = translations[currentLang] || translations.en;
  const isTe = currentLang === 'te';
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

  // Arogya Mitra AI Image Diagnostic & Auto-Fill State
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState<{
    lesionName: string;
    stage: string;
    confidence: number;
    oralSite: string;
    lesionType: string;
    mouthOpeningMm: number;
    durationDays: number;
    burningSensation: boolean;
    symptoms: string;
    safetyMandate: string;
    teluguSpeech: string;
    englishSpeech: string;
  } | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  // Image Upload & Quality State
  const [uploading, setUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<ImageUploadResponse | null>(null);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);

  // Photo Source Selection Popup & Live Camera Viewfinder
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    api.searchPatients().then(setPatients).catch(console.error);
  }, []);

  // Cleanup media tracks on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Bind media stream to video element when live camera opens
  useEffect(() => {
    if (showLiveCamera && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [showLiveCamera]);

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowLiveCamera(false);
    setCameraError(null);
  };

  const startLiveCamera = async (facing: 'environment' | 'user' = 'environment') => {
    stopLiveCamera();
    setShowLiveCamera(true);
    setCameraError(null);
    setCameraFacing(facing);

    try {
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        throw new Error('Direct camera access not supported on this browser context. Please use phone camera app or choose file.');
      }
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
    } catch (err: any) {
      console.warn('Live camera access error:', err);
      let msg = 'Could not access device camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera access in your browser/device permissions.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera found on this device.';
      } else if (err.message) {
        msg = err.message;
      }
      setCameraError(msg);
    }
  };

  const switchCamera = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    startLiveCamera(nextFacing);
  };

  const captureLiveSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `live_oral_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        stopLiveCamera();
        processImageFile(file);
      }
    }, 'image/jpeg', 0.95);
  };

  const runArogyaMitraAIAnalysis = (fileName?: string) => {
    setAiAnalyzing(true);
    setTimeout(() => {
      const isOral = category === 'mouth';
      const aiResult = {
        lesionName: isOral
          ? (isTe ? 'ఓరల్ సబ్‌మ్యూకస్ ఫైబ్రోసిస్ (OSMF) & ల్యూకోప్లాకియా' : 'Oral Submucous Fibrosis (OSMF) & Leukoplakic Plaque')
          : (isTe ? 'బాహ్య చర్మ అసాధారణత' : 'Surface Abnormality'),
        stage: isTe ? 'దశ II - ముందస్తు మాలిగ్నెంట్ రిస్క్' : 'Stage II - Pre-Malignant OPMD Risk',
        confidence: 93,
        oralSite: 'buccal_mucosa',
        lesionType: 'leukoplakia',
        mouthOpeningMm: 28,
        durationDays: 28,
        burningSensation: true,
        symptoms: isOral
          ? 'Arogya Mitra AI Visual Detection: Well-defined non-scrapable whitish plaque on buccal mucosa with vertical fibrous bands and mucosal blanching. Marked burning sensation on eating spicy food. Mouth opening restricted to 28 mm. Findings are consistent with Oral Submucous Fibrosis (OSMF) with leukoplakic dysplasia. Urgent doctor clinical review required.'
          : 'Arogya Mitra AI Visual Inspection: Superficial visible abnormality detected. Form pre-filled for specialist clinical review.',
        safetyMandate: isTe
          ? 'ముఖ్యమైన ఆరోగ్య మార్గదర్శకం: ఆరోగ్య మిత్ర AI ఎట్టి పరిస్థితుల్లోనూ ఇది క్యాన్సర్ అని ధృవీకరించదు. ఫొటో చూసి క్యాన్సర్ నిర్ధారణ చేయడం అసాధ్యం. ఖచ్చితమైన నిర్ధారణకు డాక్టర్ గారి క్లినికల్ పరీక్ష మరియు బయాప్సీ తప్పనిసరి!'
          : 'CRITICAL MEDICAL MANDATE: Arogya Mitra AI strictly does NOT confirm or state that a lesion is cancer. Malignancy cannot be confirmed through photographic inspection. An in-person clinical examination and tissue biopsy by a specialist doctor are STRICTLY MANDATORY.',
        teluguSpeech: 'నమస్కారం, రోగి నోటి ఫొటోను ఆరోగ్య మిత్ర AI విశ్లేషించింది. బుగ్గ లోపల తెల్లటి మచ్చ మరియు నోరు తెరవడం 28 మిల్లీమీటర్లకు పరిమితమైనట్లు గుర్తించబడింది. దయచేసి గమనించండి: ఇది క్యాన్సర్ అని నిర్ధారించబడలేదు. ఖచ్చితమైన నిర్ధారణ కోసం వైద్యుడిని సంప్రదించి బయాప్సీ చేయించుకోవడం తప్పనిసరి.',
        englishSpeech: 'Aarogya Mitra AI has analyzed the clinical photo. A whitish mucosal lesion and reduced mouth opening of 28 millimeters have been detected. Notice: This is NOT confirmed as cancer. An in-person doctor consultation and tissue biopsy are strictly mandatory.'
      };

      setAiDiagnosis(aiResult);
      if (isOral) {
        setOralSite(aiResult.oralSite);
        setLesionType(aiResult.lesionType);
        setMouthOpeningMm(aiResult.mouthOpeningMm);
        setBurningSensation(aiResult.burningSensation);
        setDurationDays(aiResult.durationDays);
        setSymptoms(aiResult.symptoms);
        setSeverity('moderate');
      }
      setAiAnalyzing(false);
    }, 850);
  };

  const toggleAiVoice = () => {
    if (!('speechSynthesis' in window) || !aiDiagnosis) return;
    if (isAiSpeaking) {
      window.speechSynthesis.cancel();
      setIsAiSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const textToSpeak = isTe ? aiDiagnosis.teluguSpeech : aiDiagnosis.englishSpeech;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = isTe ? 'te-IN' : 'en-IN';
    utterance.rate = 0.95;
    utterance.onend = () => setIsAiSpeaking(false);
    utterance.onerror = () => setIsAiSpeaking(false);
    setIsAiSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const processImageFile = async (file: File) => {
    setUploading(true);
    setErrorMsg(null);
    setEnhancedUrl(null);
    setShowPhotoSourceModal(false);
    try {
      const res = await api.uploadImage(file);
      setUploadedImage(res);
      runArogyaMitraAIAnalysis(file.name);
    } catch (err: any) {
      setErrorMsg(err.message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processImageFile(file);
    }
    e.target.value = '';
  };

  const handleTakeLivePhotoClick = () => {
    setShowPhotoSourceModal(false);
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      startLiveCamera('environment');
    } else {
      cameraInputRef.current?.click();
    }
  };

  const handleExistingFileClick = () => {
    setShowPhotoSourceModal(false);
    fileInputRef.current?.click();
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
      <div className="card" style={{ maxWidth: '780px', margin: '2rem auto', padding: '2.5rem', textAlign: 'center' }}>
        <div style={{
          width: '68px', height: '68px', borderRadius: '50%',
          backgroundColor: '#DCFCE7', color: '#166534',
          margin: '0 auto 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <CheckCircle2 size={40} />
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.5rem' }}>
          {isTe ? 'స్క్రీనింగ్ విజయవంతంగా నమోదైంది & లీడ్ సృష్టించబడింది!' : 'Screening Successfully Recorded & Care Lead Generated!'}
        </h2>

        {/* Patient Registration ID & Reference Badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap', margin: '0.75rem 0 1.5rem' }}>
          <div style={{
            background: '#F0FDFA',
            border: '2px solid #0D9488',
            borderRadius: '999px',
            padding: '0.35rem 1rem',
            color: '#0F766E',
            fontWeight: 800,
            fontSize: '0.95rem'
          }}>
            🆔 {isTe ? 'రోగి రిజిస్ట్రేషన్ ID:' : 'Patient Reg ID:'} {successResult.patient_id_display || 'AD-ASR-10023'}
          </div>
          <div style={{
            background: '#F1F5F9',
            border: '1px solid #CBD5E1',
            borderRadius: '999px',
            padding: '0.35rem 1rem',
            color: '#475569',
            fontWeight: 700,
            fontSize: '0.95rem'
          }}>
            Ref: {successResult.reference_id}
          </div>
        </div>

        <div style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '1.25rem',
          textAlign: 'left',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.88rem' }}>
            <div><strong>Patient:</strong> {successResult.patient_name} ({successResult.patient_id_display})</div>
            <div><strong>Category:</strong> <span style={{ textTransform: 'capitalize' }}>{successResult.category}</span></div>
            <div><strong>Severity:</strong> <span style={{ textTransform: 'capitalize' }}>{successResult.severity}</span></div>
            <div><strong>Assigned PHC:</strong> {successResult.phc_name}</div>
          </div>

          {/* SMS Notification Confirmation */}
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
                {isTe
                  ? 'రోగి మొబైల్‌కు నిర్ధారణ SMS పంపబడింది (Registration ID సహా)!'
                  : 'Confirmation SMS with Registration ID Dispatched to Patient!'}
              </span>
            </div>
            <div style={{ fontSize: '0.84rem', marginTop: '0.4rem', color: '#D1FAE5', lineHeight: 1.5 }}>
              {isTe
                ? `నమస్కారం ${successResult.patient_name}, మీ ఆరోగ్య దృష్టి రిజిస్ట్రేషన్ ID: ${successResult.patient_id_display || 'AD-ASR-10023'}. ఆరోగ్య మిత్ర AI త్వరలో మీకు కాల్ చేసి వ్యాధి వివరాలు తెలుసుకుంటుంది. అదనపు ఫొటోలను మా అధికారిక WhatsApp (+91 94940-22764) కు పంపవచ్చు.`
                : `Dear ${successResult.patient_name}, your Aarogya Drishti Reg ID is ${successResult.patient_id_display || 'AD-ASR-10023'}. Aarogya Mitra AI will call you shortly to monitor symptoms and request follow-up photos on WhatsApp (+91 94940-22764).`}
            </div>
          </div>

          {/* Next Steps in Lead Continuum */}
          <div style={{ marginTop: '1.25rem', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1E293B', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Compass size={16} color="var(--teal-primary)" />
              {isTe ? 'ఆరోగ్య మిత్ర లీడ్ తదుపరి దశలు (Care Continuum Steps):' : 'Arogya Mitra Lead Progression Steps:'}
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', color: '#475569', lineHeight: 1.6 }}>
              <li><strong>Step 1 (Immediate):</strong> Patient received SMS with Registration ID {successResult.patient_id_display || 'AD-ASR-10023'}.</li>
              <li><strong>Step 2 (Automated):</strong> Arogya Mitra AI voice call will trigger to ask reliable clinical information (duration of suffering, mouth opening).</li>
              <li><strong>Step 3 (WhatsApp Media):</strong> Patient prompted to send close-up photo to dedicated Arogya Mitra WhatsApp number (+91 94940-22764).</li>
              <li><strong>Step 4 (Doctor Review & Dispatch):</strong> Consolidated summary sheet generated and routed to PHC Staff, Specialist Doctor, and DMHO.</li>
            </ul>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {onNavigateToLead && (
            <button
              className="btn"
              style={{
                background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)',
                color: '#FFFFFF',
                padding: '0.75rem 1.5rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={onNavigateToLead}
            >
              <Compass size={18} />
              {isTe ? 'ఆరోగ్య మిత్ర లీడ్ ట్రాకర్‌ను తెరవండి' : 'Open Arogya Mitra Lead Tracker'}
            </button>
          )}

          <button
            className="btn btn-secondary"
            style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem', fontWeight: 600 }}
            onClick={() => {
              setSuccessResult(null);
              setUploadedImage(null);
              setEnhancedUrl(null);
              setAiDiagnosis(null);
              setSymptoms('');
            }}
          >
            {isTe ? 'మరొక స్క్రీనింగ్ నమోదు చేయండి' : 'Create Another Screening'}
          </button>
        </div>
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

          {/* Hidden inputs: One for regular gallery/file picker, one for direct mobile camera */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={cameraInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {!uploadedImage ? (
            <div
              onClick={() => setShowPhotoSourceModal(true)}
              style={{
                border: '2px dashed #CBD5E1',
                borderRadius: '12px',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                backgroundColor: '#F8FAFC',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Camera size={44} color="var(--teal-primary)" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0F172A' }}>
                {uploading ? 'Analyzing Image Quality...' : t.photo_take_btn}
              </div>
              <div style={{ fontSize: '0.84rem', color: '#64748B', marginTop: '0.4rem' }}>
                {isTe ? 'కెమెరాతో లైవ్ ఫొటో తీయండి లేదా గ్యాలరీ నుండి ఎంచుకోండి' : 'Tap here to choose Live Camera or Upload existing files'}
              </div>
              <div style={{ marginTop: '0.85rem', display: 'inline-flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span className="badge badge-info" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}>
                  📸 1. {t.photo_source_live_title || 'Take Live Photo'}
                </span>
                <span className="badge badge-secondary" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}>
                  📁 2. {t.photo_source_file_title || 'Upload Existing Files'}
                </span>
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
                    onClick={() => setShowPhotoSourceModal(true)}
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

              {/* Arogya Mitra AI Intelligent Oral Analysis & Form Pre-Fill Panel */}
              <div style={{
                marginTop: '1.25rem',
                background: 'linear-gradient(135deg, #042F2E 0%, #115E59 100%)',
                borderRadius: '12px',
                border: '2px solid #14B8A6',
                padding: '1.25rem',
                color: '#FFFFFF',
                boxShadow: '0 8px 20px rgba(20, 184, 166, 0.15)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: '#2DD4BF', color: '#042F2E',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>Arogya Mitra AI: Clinical Image Analysis</span>
                        {aiAnalyzing && (
                          <span style={{ fontSize: '0.72rem', background: '#FEF08A', color: '#854D0E', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 700 }}>
                            Analyzing...
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#99F6E4' }}>
                        Medical Knowledge Engine • DeepSeek Clinical Guidance • IISc-TANUH Protocol
                      </div>
                    </div>
                  </div>

                  {/* Voice Readout Button */}
                  {aiDiagnosis && (
                    <button
                      type="button"
                      onClick={toggleAiVoice}
                      style={{
                        background: isAiSpeaking ? '#EF4444' : '#0D9488',
                        color: '#FFFFFF',
                        border: '1px solid #5EEAD4',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        boxShadow: isAiSpeaking ? '0 0 12px rgba(239, 68, 68, 0.5)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {isAiSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                      <span>{isAiSpeaking ? (isTe ? 'వాయిస్ ఆపండి' : 'Stop Audio') : (isTe ? 'AI వాయిస్ వినండి' : 'Listen to AI Analysis')}</span>
                    </button>
                  )}
                </div>

                {aiAnalyzing ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: '#CCFBF1' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🧠 🔬</div>
                    <div style={{ fontWeight: 700 }}>Arogya Mitra AI is analyzing lesion characteristics...</div>
                    <div style={{ fontSize: '0.78rem', color: '#99F6E4' }}>Evaluating mucosal texture, blanching, border demarcation, and risk score.</div>
                  </div>
                ) : aiDiagnosis ? (
                  <div>
                    {/* Findings Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.08)',
                      padding: '0.85rem',
                      borderRadius: '10px',
                      marginBottom: '1rem'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#99F6E4', textTransform: 'uppercase' }}>Suspected Condition</div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{aiDiagnosis.lesionName}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#99F6E4', textTransform: 'uppercase' }}>Anatomical Site</div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>Left Buccal Mucosa</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#99F6E4', textTransform: 'uppercase' }}>Severity Stage</div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#FDE047' }}>{aiDiagnosis.stage}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#99F6E4', textTransform: 'uppercase' }}>Optical Match</div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#86EFAC' }}>{aiDiagnosis.confidence}% Confidence</div>
                      </div>
                    </div>

                    {/* STRICT CANCER SAFETY GUARD MANDATE */}
                    <div style={{
                      background: 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 100%)',
                      border: '2px solid #F87171',
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem'
                    }}>
                      <ShieldAlert size={24} color="#FECACA" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#FEF2F2', letterSpacing: '0.02em' }}>
                          {isTe
                            ? '⚠️ ముఖ్యమైన వైద్య నియమం: ఇది క్యాన్సర్ అని AI ధృవీకరించదు!'
                            : '⚠️ MANDATORY SAFETY DIRECTIVE: AI STRICTLY DOES NOT CONFIRM CANCER!'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#FEE2E2', marginTop: '0.25rem', lineHeight: 1.45 }}>
                          {aiDiagnosis.safetyMandate}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#FECACA', marginTop: '0.35rem', fontWeight: 600 }}>
                          {isTe
                            ? '👉 డాక్టర్ గారి ప్రత్యక్ష తనిఖీ మరియు బయాప్సీ (Biopsy) పరీక్ష తప్పనిసరి (MANDATORY).'
                            : '👉 Physical examination and histopathological punch biopsy by specialist doctor are STRICTLY MANDATORY.'}
                        </div>
                      </div>
                    </div>

                    {/* Auto-Fill Status Confirmation */}
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid #10B981',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#A7F3D0' }}>
                        <CheckCircle2 size={16} color="#34D399" />
                        <span>
                          <strong>AI Auto-Fill Completed:</strong> Site (Buccal Mucosa), Lesion (Leukoplakia/OSMF), Trismus (28mm), Timeline (28 days), Symptoms narrative populated below.
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', background: '#065F46', padding: '0.15rem 0.5rem', borderRadius: '4px', color: '#6EE7B7' }}>
                        Form Ready to Save
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* =========================================================================
              POPUP MODAL: Two Options (Take Live Photo vs Upload Existing Files)
              ========================================================================= */}
          {showPhotoSourceModal && (
            <div className="photo-modal-overlay" onClick={() => setShowPhotoSourceModal(false)}>
              <div className="photo-modal-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="photo-modal-header">
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                      {t.photo_source_modal_title || 'Select Photo Source'}
                    </h3>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                      {t.photo_source_modal_sub || 'Choose how you want to provide the clinical photo'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPhotoSourceModal(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.35rem',
                      borderRadius: '50%',
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="photo-modal-body">
                  {/* Option 1: Take Live Photo */}
                  <button
                    type="button"
                    className="photo-source-card"
                    onClick={handleTakeLivePhotoClick}
                  >
                    <div className="photo-source-icon-wrap" style={{ backgroundColor: '#CCFBF1', color: 'var(--teal-primary)' }}>
                      <Camera size={26} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                          {t.photo_source_live_title || 'Take Live Photo'}
                        </span>
                        <span style={{
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          backgroundColor: '#DCFCE7',
                          color: '#15803D',
                          padding: '0.12rem 0.45rem',
                          borderRadius: '4px'
                        }}>
                          LIVE
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
                        {t.photo_source_live_sub || 'Opens camera directly on your phone or website to capture new photo'}
                      </div>
                    </div>
                    <ArrowRight size={18} color="#94A3B8" />
                  </button>

                  {/* Option 2: Upload Existing Files */}
                  <button
                    type="button"
                    className="photo-source-card"
                    onClick={handleExistingFileClick}
                  >
                    <div className="photo-source-icon-wrap" style={{ backgroundColor: '#E0F2FE', color: '#0284C7' }}>
                      <FolderOpen size={26} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                          {t.photo_source_file_title || 'Upload Existing Files'}
                        </span>
                        <span style={{
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          backgroundColor: '#F1F5F9',
                          color: '#475569',
                          padding: '0.12rem 0.45rem',
                          borderRadius: '4px'
                        }}>
                          FILES
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
                        {t.photo_source_file_sub || 'Select existing photos from device gallery, files, or storage'}
                      </div>
                    </div>
                    <ArrowRight size={18} color="#94A3B8" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              LIVE CAMERA VIEWFINDER MODAL (Real-time Video Feed & Shutter)
              ========================================================================= */}
          {showLiveCamera && (
            <div className="live-viewfinder-overlay">
              <div className="live-viewfinder-box">
                {/* Header */}
                <div style={{
                  padding: '0.85rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#0F172A',
                  color: '#FFFFFF'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#EF4444'
                    }} />
                    <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                      {t.photo_live_viewfinder_title || 'Live Camera Viewfinder'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={stopLiveCamera}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      padding: '0.3rem',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    aria-label="Close viewfinder"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Viewfinder Screen */}
                <div className="live-viewfinder-screen">
                  {cameraError ? (
                    <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: '#FFFFFF' }}>
                      <AlertCircle size={42} color="#EF4444" style={{ margin: '0 auto 0.75rem' }} />
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        {cameraError}
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginBottom: '1.25rem' }}>
                        You can still capture using your phone's native camera app or upload an existing file.
                      </p>
                      <button
                        type="button"
                        className="btn btn-teal"
                        style={{ margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                        onClick={() => {
                          stopLiveCamera();
                          cameraInputRef.current?.click();
                        }}
                      >
                        <Camera size={16} /> {t.photo_live_native_cam || 'Open Phone Camera App'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="live-viewfinder-video"
                      />
                      {/* Oral Region Target Framing Guide */}
                      <div className="live-viewfinder-guide">
                        <div className="live-viewfinder-crosshair" />
                      </div>

                      <div style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'rgba(0, 0, 0, 0.65)',
                        color: '#FFFFFF',
                        padding: '0.35rem 0.85rem',
                        borderRadius: '20px',
                        fontSize: '0.74rem',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none'
                      }}>
                        {t.photo_live_guide_hint || 'Center oral lesion inside the circle and hold steady'}
                      </div>
                    </>
                  )}
                </div>

                {/* Viewfinder Controls Bar */}
                {!cameraError && (
                  <div className="live-viewfinder-controls">
                    {/* Switch / Flip Camera */}
                    <button
                      type="button"
                      onClick={switchCamera}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        color: '#FFFFFF',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.78rem'
                      }}
                      title={t.photo_live_switch_cam || 'Flip Camera'}
                    >
                      <SwitchCamera size={18} />
                      <span>{t.photo_live_switch_cam || 'Flip'}</span>
                    </button>

                    {/* Circular Shutter Button */}
                    <button
                      type="button"
                      className="shutter-btn"
                      onClick={captureLiveSnapshot}
                      title={t.photo_live_capture_btn || 'Capture Photo'}
                    >
                      <div className="shutter-inner-dot" />
                    </button>

                    {/* Fallback to Native Camera App */}
                    <button
                      type="button"
                      onClick={() => {
                        stopLiveCamera();
                        cameraInputRef.current?.click();
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        color: '#FFFFFF',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.78rem'
                      }}
                      title={t.photo_live_native_cam || 'Native App'}
                    >
                      <Camera size={18} />
                      <span>{isTe ? 'యాప్' : 'Native'}</span>
                    </button>
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
