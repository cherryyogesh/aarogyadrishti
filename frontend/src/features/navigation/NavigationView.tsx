import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { NavigationTask, User, LanguageCode } from '../../types';
import { ASR_DISTRICT_MANDALS } from '../../constants/mandals';
import {
  PhoneCall, MessageSquare, Stethoscope, Printer, ShieldAlert,
  CheckCircle2, Volume2, VolumeX, Clock, Sparkles, Upload, X,
  FileText, Send, Eye, RefreshCw, Compass, AlertCircle
} from 'lucide-react';

interface NavigationViewProps {
  currentUser: User;
  currentLang?: LanguageCode;
}

export const NavigationView: React.FC<NavigationViewProps> = ({ currentUser, currentLang = 'en' }) => {
  const isTe = currentLang === 'te';
  const isHi = currentLang === 'hi';
  const tr = (teText: string, enText: string, hiText: string) => {
    if (currentLang === 'te') return teText;
    if (currentLang === 'hi') return hiText;
    return enText;
  };
  const [tasks, setTasks] = useState<NavigationTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMandal, setFilterMandal] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Existing Logistics modal state
  const [selectedTask, setSelectedTask] = useState<NavigationTask | null>(null);
  const [updating, setUpdating] = useState<boolean>(false);
  const [editStatus, setEditStatus] = useState<string>('contacted');
  const [editContactCount, setEditContactCount] = useState<number>(1);
  const [editTransportArranged, setEditTransportArranged] = useState<boolean>(false);
  const [editFeederAmbulance, setEditFeederAmbulance] = useState<boolean>(false);
  const [editMissedReason, setEditMissedReason] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  // 1. Arogya Mitra AI Automated Follow-up Voice Call Modal State
  const [callModalTask, setCallModalTask] = useState<NavigationTask | null>(null);
  const [callDurationDays, setCallDurationDays] = useState<number>(28);
  const [callStage, setCallStage] = useState<string>('Stage II - Moderate OPMD Severity');
  const [callMouthOpening, setCallMouthOpening] = useState<string>('restricted');
  const [callBurning, setCallBurning] = useState<boolean>(true);
  const [callSpeakingQuestion, setCallSpeakingQuestion] = useState<number | null>(null);
  const [savingCall, setSavingCall] = useState<boolean>(false);

  // 2. WhatsApp Photo Modal State
  const [whatsappModalTask, setWhatsappModalTask] = useState<NavigationTask | null>(null);
  const [whatsappPhotoUrl, setWhatsappPhotoUrl] = useState<string>('/sample_secondary_oral.jpg');
  const [savingPhoto, setSavingPhoto] = useState<boolean>(false);

  // 3. Doctor Review Modal State
  const [doctorModalTask, setDoctorModalTask] = useState<NavigationTask | null>(null);
  const [doctorDecision, setDoctorDecision] = useState<string>('approved_biopsy');
  const [doctorNotes, setDoctorNotes] = useState<string>('Clinical review completed. Findings suggestive of OSMF Grade II with dysplastic white plaque. 108 tribal transport escort approved for punch biopsy at district referral center.');
  const [savingDoctorReview, setSavingDoctorReview] = useState<boolean>(false);

  // 4. Consolidated Printable Summary Modal State
  const [printableModalTask, setPrintableModalTask] = useState<NavigationTask | null>(null);
  const [printableData, setPrintableData] = useState<any | null>(null);
  const [loadingPrintable, setLoadingPrintable] = useState<boolean>(false);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.listNavigationTasks({
        mandal: filterMandal !== 'all' ? filterMandal : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
      });
      setTasks(data);
    } catch (err: any) {
      setError(err.message || (isTe ? 'నావిగేషన్ టాస్క్‌లను లోడ్ చేయడం విఫలమైంది' : 'Failed to load navigation tasks'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [filterMandal, filterStatus]);

  // Audio synthesis helper for voice call questions
  const speakCallQuestion = (text: string, qIndex: number) => {
    if (!('speechSynthesis' in window)) return;
    if (callSpeakingQuestion === qIndex) {
      window.speechSynthesis.cancel();
      setCallSpeakingQuestion(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLang === 'te' ? 'te-IN' : currentLang === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95;
    utterance.onend = () => setCallSpeakingQuestion(null);
    utterance.onerror = () => setCallSpeakingQuestion(null);
    setCallSpeakingQuestion(qIndex);
    window.speechSynthesis.speak(utterance);
  };

  const handleOpenEdit = (task: NavigationTask) => {
    setSelectedTask(task);
    setEditStatus(task.status);
    setEditContactCount(task.contact_attempts_count || 1);
    setEditTransportArranged(task.transport_support_arranged || false);
    setEditFeederAmbulance(task.feeder_ambulance_notified || false);
    setEditMissedReason(task.missed_visit_reason || '');
    setEditNotes(task.notes || '');
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      setUpdating(true);
      await api.updateNavigationTask(selectedTask.id, {
        status: editStatus,
        contact_attempts_count: editContactCount,
        transport_support_arranged: editTransportArranged,
        feeder_ambulance_notified: editFeederAmbulance,
        missed_visit_reason: editMissedReason || undefined,
        notes: editNotes,
      });
      setSelectedTask(null);
      await loadTasks();
    } catch (err: any) {
      alert(`${isTe ? 'నవీకరణ విఫలమైంది' : 'Update failed'}: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  // 1. Submit AI Follow-up Voice Call
  const handleSaveAICall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callModalTask) return;
    try {
      setSavingCall(true);
      const transcript = `Arogya Mitra AI Follow-up Call: Duration of condition: ${callDurationDays} days. Severity Stage: ${callStage}. Mouth opening: ${callMouthOpening}. Burning sensation on spices: ${callBurning ? 'Yes' : 'No'}. Patient was instructed to send additional photos on WhatsApp (+91 94940-22764) and warned that AI cannot diagnose cancer; in-person doctor visit is mandatory.`;
      await api.recordAIFollowupCall(callModalTask.id, {
        duration_suffering_days: Number(callDurationDays),
        severity_stage: callStage,
        ai_call_transcript: transcript,
        mouth_opening_difficulty: callMouthOpening !== 'normal',
        whatsapp_photos_requested: true,
      });
      setCallModalTask(null);
      await loadTasks();
    } catch (err: any) {
      alert(`AI Call record failed: ${err.message}`);
    } finally {
      setSavingCall(false);
    }
  };

  // 2. Submit WhatsApp Photo
  const handleSaveWhatsAppPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappModalTask) return;
    try {
      setSavingPhoto(true);
      await api.recordWhatsAppPhoto(whatsappModalTask.id, whatsappPhotoUrl);
      setWhatsappModalTask(null);
      await loadTasks();
    } catch (err: any) {
      alert(`WhatsApp photo record failed: ${err.message}`);
    } finally {
      setSavingPhoto(false);
    }
  };

  // 3. Submit Doctor Review
  const handleSaveDoctorReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorModalTask) return;
    try {
      setSavingDoctorReview(true);
      await api.doctorReviewLead(doctorModalTask.id, {
        clinical_decision: doctorDecision,
        doctor_review_notes: doctorNotes,
      });
      setDoctorModalTask(null);
      await loadTasks();
    } catch (err: any) {
      alert(`Doctor review failed: ${err.message}`);
    } finally {
      setSavingDoctorReview(false);
    }
  };

  // 4. Open Printable Summary Sheet
  const handleOpenPrintable = async (task: NavigationTask) => {
    setPrintableModalTask(task);
    setLoadingPrintable(true);
    try {
      const data = await api.getPrintableLeadSummary(task.id);
      setPrintableData(data);
    } catch (err: any) {
      alert(`Failed to load printable summary: ${err.message}`);
    } finally {
      setLoadingPrintable(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-warning">{tr('⏳ ఫాలో-అప్ పెండింగ్', '⏳ Follow-up Pending', '⏳ फॉलो-अप लंबित')}</span>;
      case 'contacted':
        return <span className="badge badge-info">{tr('📞 రోగిని సంప్రదించారు', '📞 Contacted / Lead Active', '📞 संपर्क किया गया')}</span>;
      case 'transport_arranged':
        return <span className="badge badge-primary">{tr('🚑 108 అంబులెన్స్ సిద్ధం', '🚑 108 Ambulance Arranged', '🚑 108 एम्बुलेंस तैयार')}</span>;
      case 'attended':
        return <span className="badge badge-success">{tr('🏥 ఆసుపత్రికి హాజరయ్యారు', '🏥 Attended Hospital', '🏥 अस्पताल उपस्थित हुए')}</span>;
      case 'missed_escalated':
        return <span className="badge badge-danger">{tr('🚨 రాలేదు & నివేదించబడింది', '🚨 Missed & Escalated', '🚨 अनुपस्थित एवं सूचित')}</span>;
      case 'completed':
        return <span className="badge badge-success">{tr('✅ సంరక్షణ అనుసంధానించబడింది', '✅ Care Linked', '✅ देखभाल से जुड़ा')}</span>;
      default:
        return <span className="badge badge-outline">{status}</span>;
    }
  };

  return (
    <div className="navigation-container" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #042F2E 0%, #134E4A 100%)',
        color: '#FFFFFF',
        borderRadius: '16px',
        padding: '1.75rem',
        marginBottom: '1.5rem',
        boxShadow: '0 8px 24px rgba(4, 47, 46, 0.25)',
        border: '1px solid rgba(45, 212, 191, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#2DD4BF', color: '#042F2E', fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.65rem', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Sparkles size={13} />
              {tr('ఆరోగ్య మిత్ర AI లీడ్ & కేర్ ట్రాకర్', 'Arogya Mitra AI Lead Tracking Continuum', 'आरोग्य मित्र AI लीड एवं केयर ट्रैकर')}
            </div>
            <h2 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              {tr('గిరిజన రోగుల సంరక్షణ & ఆటోమేటెడ్ ఫాలో-అప్', 'Tribal Patient Care Leads & Automated AI Follow-Up', 'जनजातीय रोगी देखभाल और स्वचालित फॉलो-अप')}
            </h2>
            <p style={{ margin: 0, color: '#99F6E4', fontSize: '0.9rem', maxWidth: '800px', lineHeight: 1.5 }}>
              {isTe
                ? 'ఆరోగ్య మిత్ర AI ద్వారా ఆటోమేటెడ్ ఫోన్ కాల్స్, వాట్సాప్ ఫొటోల సేకరణ, డాక్టర్ సమీక్ష మరియు PHC, డాక్టర్, DMHO లకు అధికారిక రిపోర్టు డిస్పాచ్.'
                : 'Arogya Mitra AI tracks every patient as an active lead until full diagnosis. Handles automated voice calls, WhatsApp follow-up photos, doctor sign-offs, and multi-agency dispatch to PHC, Doctor, and DMHO.'}
            </p>
          </div>
          <button
            onClick={loadTasks}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#FFFFFF',
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <RefreshCw size={15} />
            {tr('రిఫ్రెష్', 'Refresh Queue', 'रीफ्रेश कतार')}
          </button>
        </div>

        {/* 5-Card Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginTop: '1.5rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div style={{ fontSize: '0.72rem', color: '#99F6E4', textTransform: 'uppercase', fontWeight: 700 }}>Total Care Leads</div>
            <div style={{ fontWeight: 800, fontSize: '1.4rem', color: '#FFFFFF' }}>{tasks.length}</div>
            <div style={{ fontSize: '0.7rem', color: '#5EEAD4' }}>Active in ASR Continuum</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div style={{ fontSize: '0.72rem', color: '#99F6E4', textTransform: 'uppercase', fontWeight: 700 }}>AI Calls Done</div>
            <div style={{ fontWeight: 800, fontSize: '1.4rem', color: '#FEF08A' }}>
              {tasks.filter(t => t.ai_call_status === 'completed').length} / {tasks.length}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#FEF08A' }}>Automated Voice Check</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div style={{ fontSize: '0.72rem', color: '#99F6E4', textTransform: 'uppercase', fontWeight: 700 }}>WhatsApp Photos</div>
            <div style={{ fontWeight: 800, fontSize: '1.4rem', color: '#86EFAC' }}>
              {tasks.filter(t => !!t.whatsapp_photo_url).length}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#86EFAC' }}>+91 94940-AAROGYA</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div style={{ fontSize: '0.72rem', color: '#99F6E4', textTransform: 'uppercase', fontWeight: 700 }}>Doctor Reviews</div>
            <div style={{ fontWeight: 800, fontSize: '1.4rem', color: '#BAE6FD' }}>
              {tasks.filter(t => t.doctor_reviewed).length}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#BAE6FD' }}>Clinical Sign-Offs</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div style={{ fontSize: '0.72rem', color: '#99F6E4', textTransform: 'uppercase', fontWeight: 700 }}>Routed & Dispatched</div>
            <div style={{ fontWeight: 800, fontSize: '1.4rem', color: '#FBCFE8' }}>100%</div>
            <div style={{ fontSize: '0.7rem', color: '#FBCFE8' }}>PHC • Doctor • DMHO</div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        marginBottom: '1.5rem',
        background: '#FFFFFF',
        padding: '1rem',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ flex: '1', minWidth: '220px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
            {tr('మండలం వారీగా ఫిల్టర్', 'Filter by Mandal', 'मंडल द्वारा फ़िल्टर')}
          </label>
          <select
            value={filterMandal}
            onChange={e => setFilterMandal(e.target.value)}
            style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
          >
            <option value="all">{tr('అన్ని మండలాలు (All 11 Mandals)', 'All 11 Mandals', 'सभी 11 मंडल')}</option>
            {ASR_DISTRICT_MANDALS.map((m) => (
              <option key={m.id} value={m.id}>
                {isTe ? `${m.nameTe} (${m.name})` : m.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: '1', minWidth: '220px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
            {tr('స్థితి వారీగా ఫిల్టర్', 'Filter by Status', 'स्थिति द्वारा फ़िल्टर')}
          </label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
          >
            <option value="all">{tr('అన్ని స్థితులు (All Statuses)', 'All Statuses', 'सभी स्थितियां')}</option>
            <option value="pending">{tr('వేచి ఉంది (Pending)', 'Pending', 'लंबित (Pending)')}</option>
            <option value="contacted">{tr('సంప్రదించబడింది (Contacted)', 'Contacted / Lead Active', 'संपर्क किया गया')}</option>
            <option value="transport_arranged">{tr('108 రవాణా సిద్ధం', 'Transport Arranged', '108 परिवहन तैयार')}</option>
            <option value="attended">{tr('ఆసుపత్రికి చేరుకున్నారు', 'Attended Hospital', 'अस्पताल पहुंचे')}</option>
            <option value="completed">{tr('పూర్తయింది (Completed)', 'Completed', 'पूर्ण (Completed)')}</option>
          </select>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '3.5rem', color: '#64748B' }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto 0.75rem', color: '#0D9488' }} />
          <div>{isTe ? 'గిరిజన నావిగేషన్ & లీడ్ క్యూ లోడ్ అవుతోంది...' : 'Loading tribal care leads...'}</div>
        </div>
      )}

      {error && (
        <div style={{ padding: '1rem', background: '#FEE2E2', color: '#B91C1C', borderRadius: '8px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {!loading && tasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3.5rem', background: '#FFFFFF', borderRadius: '12px', border: '1px dashed #CBD5E1', color: '#64748B' }}>
          {isTe ? 'ఎంచుకున్న ఫిల్టర్‌కు సరిపోలే లీడ్‌లు లేవు.' : 'No care leads found matching filter.'}
        </div>
      )}

      {/* Task Lead Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.25rem' }}>
        {tasks.map(task => (
          <div
            key={task.id}
            style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: task.doctor_reviewed ? '2px solid #10B981' : '1px solid #E2E8F0',
              padding: '1.35rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease'
            }}
          >
            <div>
              {/* Card Top: Ref ID, Reg ID & Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A' }}>{task.task_ref}</span>
                    <span style={{ background: '#CCFBF1', color: '#0F766E', fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 800 }}>
                      {task.patient_id_display}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.15rem' }}>
                    Care Lead #{task.id} • Screening ID #{task.screening_id || 'Auto'}
                  </div>
                </div>
                {getStatusBadge(task.status)}
              </div>

              {/* Patient Demographics */}
              <div style={{ marginBottom: '0.85rem' }}>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1E293B' }}>
                  {task.patient_name}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '0.2rem' }}>
                  📍 {task.habitation || 'Tribal Village'}, {task.mandal} • 📞 {task.patient_phone_masked}
                </div>
              </div>

              {/* Disease & Clinical Info Box */}
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '0.85rem',
                marginBottom: '0.85rem',
                fontSize: '0.84rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: '#64748B' }}>Clinical Profile:</span>
                  <span style={{ fontWeight: 700, color: '#0F766E' }}>Oral Cavity • Leukoplakia / OSMF</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: '#64748B' }}>Duration of Suffering:</span>
                  <strong style={{ color: '#B45309' }}>
                    {task.duration_suffering_days ? `${task.duration_suffering_days} days` : '28 days (reported)'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: '#64748B' }}>Assessed Stage:</span>
                  <strong style={{ color: '#B91C1C' }}>
                    {task.severity_stage || 'Stage II - Pre-Malignant OPMD Risk'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>AI Follow-up Call:</span>
                  <span style={{ fontWeight: 700, color: task.ai_call_status === 'completed' ? '#16A34A' : '#D97706' }}>
                    {task.ai_call_status === 'completed' ? '✓ Call Completed' : '⏳ Queued'}
                  </span>
                </div>
              </div>

              {/* Multi-Agency Dispatch Ledger */}
              <div style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '8px',
                padding: '0.55rem 0.75rem',
                marginBottom: '0.85rem',
                fontSize: '0.76rem',
                color: '#166534',
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.35rem'
              }}>
                <span style={{ fontWeight: 700 }}>Dispatched to:</span>
                <span>✓ PHC Staff</span>
                <span>✓ Doctors</span>
                <span>✓ DMHO ASR</span>
              </div>

              {/* Doctor Review Badge */}
              <div style={{ marginBottom: '0.85rem' }}>
                {task.doctor_reviewed ? (
                  <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem', color: '#065F46' }}>
                    <strong>🩺 Doctor Review Signed:</strong> {task.doctor_review_notes || 'Approved for clinical follow-up.'}
                  </div>
                ) : (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem', color: '#92400E' }}>
                    ⏳ Doctor Clinical Review Pending
                  </div>
                )}
              </div>

              {/* WhatsApp Secondary Photo Indicator */}
              {task.whatsapp_photo_url && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#047857', marginBottom: '0.85rem' }}>
                  <span>📱</span>
                  <span><strong>WhatsApp Media:</strong> Secondary photo attached (+91 94940-AAROGYA)</span>
                </div>
              )}
            </div>

            {/* Action Buttons Toolbar */}
            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
                {/* 1. Trigger AI Voice Call */}
                <button
                  type="button"
                  onClick={() => {
                    setCallModalTask(task);
                    setCallDurationDays(task.duration_suffering_days || 28);
                    setCallStage(task.severity_stage || 'Stage II - Moderate OPMD Severity');
                  }}
                  style={{
                    background: '#042F2E',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <PhoneCall size={14} color="#2DD4BF" />
                  <span>{tr('AI వాయిస్ కాల్', 'AI Voice Call', 'AI वॉइस कॉल')}</span>
                </button>

                {/* 2. WhatsApp Photo Upload */}
                <button
                  type="button"
                  onClick={() => {
                    setWhatsappModalTask(task);
                    setWhatsappPhotoUrl(task.whatsapp_photo_url || '/sample_secondary_oral.jpg');
                  }}
                  style={{
                    background: '#065F46',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <MessageSquare size={14} color="#86EFAC" />
                  <span>{tr('వాట్సాప్ ఫొటో', 'WhatsApp Photo', 'व्हाट्सएप फोटो')}</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
                {/* 3. Doctor Review Modal */}
                <button
                  type="button"
                  onClick={() => {
                    setDoctorModalTask(task);
                    setDoctorNotes(task.doctor_review_notes || 'Clinical review completed. Findings suggestive of OSMF Grade II with dysplastic white plaque. 108 tribal transport escort approved for punch biopsy at district referral center.');
                  }}
                  style={{
                    background: '#7E22CE',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Stethoscope size={14} color="#E9D5FF" />
                  <span>{tr('డాక్టర్ సమీక్ష', 'Doctor Review', 'डॉक्टर समीक्षा')}</span>
                </button>

                {/* 4. Consolidated Printable Sheet */}
                <button
                  type="button"
                  onClick={() => handleOpenPrintable(task)}
                  style={{
                    background: '#0F766E',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Printer size={14} color="#5EEAD4" />
                  <span>{tr('ప్రింట్ రిపోర్ట్', 'Printable Sheet', 'प्रिंट रिपोर्ट')}</span>
                </button>
              </div>

              {/* 5. Logistics / 108 Transport Escort (Secondary) */}
              <button
                type="button"
                onClick={() => handleOpenEdit(task)}
                style={{
                  background: '#F1F5F9',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  padding: '0.4rem',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                {tr('🚑 108 అంబులెన్స్ & రవాణా వివరాలు సవరించండి', '🚑 Manage 108 Feeder Ambulance & Visit', '🚑 108 एम्बुलेंस और परिवहन प्रबंधन')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* =========================================================================
          MODAL 1: AROGYA MITRA AI AUTOMATED VOICE CALL
          ========================================================================= */}
      {callModalTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1100 }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '600px', width: '100%', maxHeight: '92vh', overflowY: 'auto', padding: '1.75rem', boxShadow: '0 24px 38px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#042F2E', color: '#2DD4BF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PhoneCall size={18} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                    {isTe ? 'ఆరోగ్య మిత్ర AI ఆటోమేటెడ్ ఫాలో-అప్ కాల్' : 'Arogya Mitra AI Automated Voice Call'}
                  </h3>
                </div>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                  Calling Patient: <strong>{callModalTask.patient_name}</strong> ({callModalTask.patient_id_display}) • {callModalTask.patient_phone_masked}
                </p>
              </div>
              <button onClick={() => setCallModalTask(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>

            {/* MANDATORY CANCER SAFETY BANNER */}
            <div style={{ background: '#FEF2F2', border: '2px solid #FCA5A5', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <ShieldAlert size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.8rem', color: '#991B1B', lineHeight: 1.45 }}>
                <strong>CRITICAL SAFETY MANDATE:</strong> Arogya Mitra AI strictly does NOT confirm or tell the patient that it is cancer. If signs are severe or suspicious, it instructs mandatory doctor consultation and physical biopsy.
              </div>
            </div>

            <form onSubmit={handleSaveAICall}>
              {/* Question 1: Duration of Suffering */}
              <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1E293B' }}>
                    1. {isTe ? 'వ్యాధి / మంట ఎన్ని రోజులుగా ఉంది?' : 'How many days have you been suffering from this condition?'}
                  </span>
                  <button
                    type="button"
                    onClick={() => speakCallQuestion(
                      isTe
                        ? 'నమస్కారం, ఆరోగ్య మిత్ర AI నుండి మాట్లాడుతున్నాము. మీకు నోటిలో మచ్చ లేదా నొప్పి ఎన్ని రోజులుగా ఉంది?'
                        : 'Hello, calling from Aarogya Mitra AI. How many days have you had this oral patch or pain?',
                      1
                    )}
                    style={{ background: callSpeakingQuestion === 1 ? '#EF4444' : '#0D9488', color: '#FFF', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}
                  >
                    {callSpeakingQuestion === 1 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    <span>{callSpeakingQuestion === 1 ? 'Stop' : (isTe ? 'తెలుగులో అడగండి' : 'Speak Question')}</span>
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={callDurationDays}
                    onChange={e => setCallDurationDays(Number(e.target.value))}
                    style={{ width: '120px', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>days / రోజులు</span>
                </div>
              </div>

              {/* Question 2: Mouth Opening / Trismus */}
              <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1E293B' }}>
                    2. {isTe ? 'నోరు తెరవడంలో ఇబ్బంది ఉందా (మూడు వేళ్ళ పరీక్ష)?' : 'Are you able to open your mouth normally (three finger test)?'}
                  </span>
                  <button
                    type="button"
                    onClick={() => speakCallQuestion(
                      isTe
                        ? 'మీరు నోరు పూర్తిగా తెరవగలుగుతున్నారా, లేదా నోరు బిగువుగా ఉండి మూడు వేళ్ళు లోపలికి వెళ్లడం లేదా?'
                        : 'Can you open your mouth fully, or is there restricted opening with difficulty inserting three fingers?',
                      2
                    )}
                    style={{ background: callSpeakingQuestion === 2 ? '#EF4444' : '#0D9488', color: '#FFF', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}
                  >
                    {callSpeakingQuestion === 2 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    <span>{callSpeakingQuestion === 2 ? 'Stop' : (isTe ? 'తెలుగులో అడగండి' : 'Speak Question')}</span>
                  </button>
                </div>
                <select
                  value={callMouthOpening}
                  onChange={e => setCallMouthOpening(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                >
                  <option value="restricted">{isTe ? 'పరిమితం (<3 వేళ్ళు) • తీవ్ర నోటి బిగువు (OSMF)' : 'Restricted (<3 fingers) • Trismus noted'}</option>
                  <option value="normal">{isTe ? 'సాధారణం (>3 వేళ్ళు తెరవగలరు)' : 'Normal Opening (>3 fingers)'}</option>
                  <option value="severely_restricted">{isTe ? 'అత్యంత తీవ్రం (<1 వేలు) • తక్షణ రిఫరల్ అవసరం' : 'Severely Restricted (<1 finger) • Critical'}</option>
                </select>
              </div>

              {/* Question 3: Burning Sensation on Spices */}
              <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1E293B' }}>
                    3. {isTe ? 'కారమైన ఆహారం తిన్నప్పుడు మంట ఉందా?' : 'Experiencing burning sensation upon eating spicy food?'}
                  </span>
                  <button
                    type="button"
                    onClick={() => speakCallQuestion(
                      isTe
                        ? 'కారమైన ఆహారం లేదా వేడి పదార్థాలు తిన్నప్పుడు బుగ్గల్లో తీవ్రమైన మంట కలుగుతోందా?'
                        : 'Do you experience severe burning sensation when eating spicy or hot food?',
                      3
                    )}
                    style={{ background: callSpeakingQuestion === 3 ? '#EF4444' : '#0D9488', color: '#FFF', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}
                  >
                    {callSpeakingQuestion === 3 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    <span>{callSpeakingQuestion === 3 ? 'Stop' : (isTe ? 'తెలుగులో అడగండి' : 'Speak Question')}</span>
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="radio" name="callBurning" checked={callBurning} onChange={() => setCallBurning(true)} />
                    <span>{isTe ? 'అవును, మంట ఉంది (Yes)' : 'Yes, Burning present'}</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="radio" name="callBurning" checked={!callBurning} onChange={() => setCallBurning(false)} />
                    <span>{isTe ? 'లేదు (No)' : 'No burning'}</span>
                  </label>
                </div>
              </div>

              {/* Question 4: Request WhatsApp Photo Submission */}
              <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#065F46' }}>
                    4. {isTe ? 'వాట్సాప్ నంబర్‌కు అదనపు ఫొటోను పంపవలసిందిగా కోరడం:' : 'Request additional photo on dedicated WhatsApp number:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => speakCallQuestion(
                      isTe
                        ? 'దయచేసి మీ నోటి మచ్చను స్పష్టంగా ఫొటో తీసి మా అధికారిక ఆరోగ్య మిత్ర వాట్సాప్ నంబర్ తొమ్మిది నాలుగు తొమ్మిది నాలుగు సున్నా రెండు రెండు ఏడు ఆరు నాలుగు కు పంపించండి. వైద్యులు దీనిని పరిశీలిస్తారు.'
                        : 'Please take an additional clear photo of your oral lesion and send it to our official Arogya Mitra WhatsApp number +91 94940-22764.',
                      4
                    )}
                    style={{ background: callSpeakingQuestion === 4 ? '#EF4444' : '#059669', color: '#FFF', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}
                  >
                    {callSpeakingQuestion === 4 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    <span>{callSpeakingQuestion === 4 ? 'Stop' : (isTe ? 'తెలుగులో అడగండి' : 'Speak Question')}</span>
                  </button>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#047857' }}>
                  Arogya Mitra WhatsApp: <strong>+91 94940-AAROGYA (+91 94940-22764)</strong>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setCallModalTask(null)} className="btn btn-secondary" style={{ padding: '0.55rem 1rem' }}>
                  Cancel
                </button>
                <button type="submit" disabled={savingCall} className="btn btn-primary" style={{ padding: '0.55rem 1.25rem', background: '#042F2E' }}>
                  {savingCall ? 'Saving Record...' : 'Save AI Call Transcript & Update Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: WHATSAPP ADDITIONAL PHOTO SUBMISSION
          ========================================================================= */}
      {whatsappModalTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1100 }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '1.75rem', boxShadow: '0 24px 38px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#065F46', color: '#86EFAC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                  {isTe ? 'వాట్సాప్ అదనపు ఫొటో అప్‌లోడ్' : 'Record WhatsApp Follow-Up Photo'}
                </h3>
              </div>
              <button onClick={() => setWhatsappModalTask(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '10px', padding: '0.85rem', marginBottom: '1.25rem', fontSize: '0.84rem', color: '#065F46' }}>
              <div>Arogya Mitra WhatsApp Gateway: <strong>+91 94940-AAROGYA (+91 94940-22764)</strong></div>
              <div style={{ fontSize: '0.76rem', color: '#047857', marginTop: '0.2rem' }}>
                Secondary clinical photo sent by patient for close-up monitoring.
              </div>
            </div>

            <form onSubmit={handleSaveWhatsAppPhoto}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Follow-up Photo URL or Storage Path:
                </label>
                <input
                  type="text"
                  value={whatsappPhotoUrl}
                  onChange={e => setWhatsappPhotoUrl(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setWhatsappModalTask(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={savingPhoto} className="btn btn-primary" style={{ background: '#065F46' }}>
                  {savingPhoto ? 'Attaching Photo...' : 'Attach WhatsApp Photo to Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: DOCTOR CLINICAL REVIEW & DIGITAL SIGN-OFF
          ========================================================================= */}
      {doctorModalTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1100 }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '580px', width: '100%', padding: '1.75rem', boxShadow: '0 24px 38px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#7E22CE', color: '#E9D5FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Stethoscope size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  {isTe ? 'వైద్యుల క్లినికల్ సమీక్ష & సంతకం' : 'Doctor Clinical Review & Digital Sign-off'}
                </h3>
              </div>
              <button onClick={() => setDoctorModalTask(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: '10px', padding: '0.85rem', marginBottom: '1.25rem', fontSize: '0.84rem' }}>
              <div><strong>Patient:</strong> {doctorModalTask.patient_name} ({doctorModalTask.patient_id_display})</div>
              <div><strong>Lead Ref:</strong> {doctorModalTask.task_ref} • {doctorModalTask.habitation}, {doctorModalTask.mandal}</div>
            </div>

            <form onSubmit={handleSaveDoctorReview}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Doctor Clinical Decision:
                </label>
                <select
                  value={doctorDecision}
                  onChange={e => setDoctorDecision(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                >
                  <option value="approved_biopsy">Approved for Punch Biopsy & 108 Feeder Ambulance Escort</option>
                  <option value="referral_advised">Referral Advised to District Cancer Specialist / Dentist</option>
                  <option value="routine_followup">Conservative Antioxidant Therapy & 14-day Follow-up</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Specialist Clinical Notes & Digital Sign-off:
                </label>
                <textarea
                  rows={4}
                  value={doctorNotes}
                  onChange={e => setDoctorNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setDoctorModalTask(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={savingDoctorReview} className="btn btn-primary" style={{ background: '#7E22CE' }}>
                  {savingDoctorReview ? 'Signing...' : 'Sign & Complete Doctor Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: CONSOLIDATED AAROGYA DRISHTI PRINTABLE SUMMARY SHEET
          ========================================================================= */}
      {printableModalTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1200 }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '820px', width: '100%', maxHeight: '92vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
            {/* Modal Controls Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.88rem', color: '#64748B', fontWeight: 600 }}>
                Official Consolidated Summary Sheet • Arogya Mitra Care Lead
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    background: '#0D9488',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '0.45rem 1rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={16} />
                  <span>Print Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintableModalTask(null)}
                  style={{ background: '#F1F5F9', border: 'none', padding: '0.45rem 0.85rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
                >
                  Close
                </button>
              </div>
            </div>

            {loadingPrintable || !printableData ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem', color: '#0D9488' }} />
                <div>Generating official summary sheet...</div>
              </div>
            ) : (
              <div id="printable-area" style={{ color: '#0F172A', fontFamily: 'Inter, sans-serif' }}>
                {/* 1. Official Header */}
                <div style={{ textAlign: 'center', borderBottom: '2px solid #0F766E', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F766E', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {printableData.header.subtitle}
                  </div>
                  <h1 style={{ margin: '0.35rem 0', fontSize: '1.85rem', fontWeight: 900, color: '#042F2E', letterSpacing: '-0.02em' }}>
                    {printableData.header.title}
                  </h1>
                  <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                    {printableData.header.mission}
                  </div>
                  <div style={{
                    display: 'inline-block',
                    marginTop: '0.65rem',
                    padding: '0.25rem 0.85rem',
                    background: '#F0FDFA',
                    border: '1px solid #14B8A6',
                    borderRadius: '4px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    color: '#0F766E'
                  }}>
                    {printableData.header.document_name}
                  </div>
                </div>

                {/* 2. Patient Demographics & Reference */}
                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', fontSize: '0.86rem' }}>
                    <div><strong>Patient Name:</strong> {printableData.patient.name}</div>
                    <div><strong>Patient Reg ID:</strong> <span style={{ color: '#0F766E', fontWeight: 800 }}>{printableData.patient.patient_id_display}</span></div>
                    <div><strong>Age / Gender:</strong> {printableData.patient.age}y / {printableData.patient.gender}</div>
                    <div><strong>Lead Reference:</strong> {printableData.lead.task_ref}</div>
                    <div><strong>Habitation / Mandal:</strong> {printableData.patient.habitation}, {printableData.patient.mandal}</div>
                    <div><strong>Registered Phone:</strong> {printableData.patient.phone_masked}</div>
                    <div><strong>Assigned PHC:</strong> {printableData.patient.primary_phc}</div>
                    <div><strong>Date Generated:</strong> {printableData.lead.created_at}</div>
                  </div>
                </div>

                {/* 3. Disease & Clinical Profile */}
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F766E', marginBottom: '0.5rem' }}>
                    Clinical Lesion & Disease Characteristics
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem', fontSize: '0.85rem' }}>
                    <div><strong>Category:</strong> {printableData.disease_clinical.category}</div>
                    <div><strong>Oral Anatomical Site:</strong> {printableData.disease_clinical.oral_site}</div>
                    <div><strong>Lesion Appearance:</strong> {printableData.disease_clinical.lesion_type}</div>
                    <div><strong>Duration of Suffering:</strong> <span style={{ color: '#B45309', fontWeight: 700 }}>{printableData.disease_clinical.duration_days} days</span></div>
                    <div><strong>Severity Stage:</strong> <span style={{ color: '#B91C1C', fontWeight: 700 }}>{printableData.disease_clinical.severity_stage}</span></div>
                    {printableData.disease_clinical.mouth_opening_mm && (
                      <div><strong>Inter-incisal Opening:</strong> {printableData.disease_clinical.mouth_opening_mm} mm</div>
                    )}
                  </div>
                  <div style={{ marginTop: '0.65rem', fontSize: '0.82rem', color: '#334155' }}>
                    <strong>Symptoms & History:</strong> {printableData.disease_clinical.symptoms}
                  </div>
                </div>

                {/* 4. MANDATORY CANCER SAFETY DISCLAIMER */}
                <div style={{
                  background: '#FEF2F2',
                  border: '2px solid #EF4444',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.82rem',
                  color: '#991B1B',
                  lineHeight: 1.45
                }}>
                  <strong>MANDATORY CLINICAL & LEGAL DISCLAIMER:</strong> {printableData.disease_clinical.cancer_safety_disclaimer}
                </div>

                {/* 5. Dual Clinical Photos (Side by Side) */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F766E', marginBottom: '0.5rem' }}>
                    Dual Photographic Comparison
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* Primary Photo */}
                    <div style={{ border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0.75rem', textAlign: 'center', background: '#F8FAFC' }}>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                        1. Primary Photo (ASHA Camera Capture)
                      </div>
                      <div style={{ height: '140px', background: '#000', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '0.8rem' }}>
                        {printableData.images.primary_screening_photo ? (
                          <img src={printableData.images.primary_screening_photo} alt="Primary Screening" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span>Oral Clinical Capture #{printableModalTask.screening_id || 'Primary'}</span>
                        )}
                      </div>
                    </div>

                    {/* WhatsApp Photo */}
                    <div style={{ border: '1px solid #86EFAC', borderRadius: '8px', padding: '0.75rem', textAlign: 'center', background: '#F0FDF4' }}>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#065F46', marginBottom: '0.35rem' }}>
                        2. Follow-up Photo (+91 94940-AAROGYA)
                      </div>
                      <div style={{ height: '140px', background: '#000', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '0.8rem' }}>
                        {printableData.images.whatsapp_followup_photo ? (
                          <img src={printableData.images.whatsapp_followup_photo} alt="WhatsApp Follow-up" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span>WhatsApp Close-up (+91 94940-22764)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. AI Voice Call Transcript */}
                <div style={{
                  background: '#F0FDFA',
                  border: '1px solid #CCFBF1',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.82rem'
                }}>
                  <div style={{ fontWeight: 800, color: '#0F766E', marginBottom: '0.3rem' }}>
                    Arogya Mitra AI Follow-up Voice Verification:
                  </div>
                  <div style={{ color: '#134E4A' }}>
                    {printableData.ai_followup_call.transcript}
                  </div>
                </div>

                {/* 7. Doctor Review & Sign-Off Section */}
                <div style={{
                  background: '#FAF5FF',
                  border: '1px solid #E9D5FF',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#6B21A8' }}>
                      Doctor Clinical Review & Digital Endorsement
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#7E22CE', fontWeight: 700 }}>
                      {printableData.doctor_review.reviewed ? '✓ Digitally Endorsed' : 'Pending Signature'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#3B0764' }}>
                    {printableData.doctor_review.doctor_notes}
                  </div>
                </div>

                {/* 8. Multi-Agency Transmission Ledger */}
                <div style={{
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  fontSize: '0.78rem',
                  color: '#334155',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.5rem',
                  textAlign: 'center',
                  background: '#F8FAFC'
                }}>
                  <div>
                    <div style={{ color: '#16A34A', fontWeight: 800 }}>✓ TRANSMITTED</div>
                    <div>PHC Medical Officer</div>
                  </div>
                  <div>
                    <div style={{ color: '#16A34A', fontWeight: 800 }}>✓ TRANSMITTED</div>
                    <div>Doctors</div>
                  </div>
                  <div>
                    <div style={{ color: '#16A34A', fontWeight: 800 }}>✓ TRANSMITTED</div>
                    <div>DMHO ASR District</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: LOGISTICS & 108 AMBULANCE (EXISTING MODAL)
          ========================================================================= */}
      {selectedTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '550px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                {isTe ? 'గిరిజన ఫాలో-అప్ & రవాణా అప్‌డేట్' : 'Update Navigation & 108 Logistics'}
              </h3>
              <button onClick={() => setSelectedTask(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
              <div><strong>Task Ref:</strong> {selectedTask.task_ref}</div>
              <div><strong>Patient:</strong> {selectedTask.patient_name} ({selectedTask.habitation}, {selectedTask.mandal})</div>
            </div>

            <form onSubmit={handleSaveTask}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  {isTe ? 'నావిగేషన్ స్థితి' : 'Navigation Status'}
                </label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="pending">{isTe ? 'వేచి ఉంది' : 'Pending'}</option>
                  <option value="contacted">{isTe ? 'రోగిని సంప్రదించారు' : 'Contacted Patient'}</option>
                  <option value="transport_arranged">{isTe ? 'రవాణా సిద్ధం చేయబడింది' : 'Transport Arranged'}</option>
                  <option value="attended">{isTe ? 'ఆసుపత్రికి హాజరయ్యారు' : 'Attended Hospital'}</option>
                  <option value="missed_escalated">{isTe ? 'రాలేకపోయారు / ఉన్నతాధికారుల సమాచారం' : 'Missed Visit / Escalated'}</option>
                  <option value="completed">{isTe ? 'చికిత్స ప్రారంభమైంది' : 'Completed Care Linkage'}</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  {isTe ? 'సంప్రదింపు ప్రయత్నాల సంఖ్య' : 'Contact Attempts Count'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={editContactCount}
                  onChange={e => setEditContactCount(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editTransportArranged}
                    onChange={e => setEditTransportArranged(e.target.checked)}
                  />
                  <span>
                    {isTe ? 'గిరిజన ప్రాంత ప్రయాణ సదుపాయం కల్పించబడింది' : 'Tribal Transport Support Arranged'}
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editFeederAmbulance}
                    onChange={e => setEditFeederAmbulance(e.target.checked)}
                  />
                  <span>
                    {isTe ? 'ITDA 108 ఫీడర్ అంబులెన్స్ సమన్వయం చేయబడింది' : 'ITDA 108 Feeder Ambulance Coordinated'}
                  </span>
                </label>
              </div>

              {editStatus === 'missed_escalated' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#b91c1c', marginBottom: '0.25rem' }}>
                    {isTe ? 'రాలేకపోవడానికి కారణం' : 'Reason for Missed Visit'}
                  </label>
                  <input
                    type="text"
                    value={editMissedReason}
                    onChange={e => setEditMissedReason(e.target.value)}
                    placeholder={isTe ? 'ఉదా: వర్షాల వల్ల కొండ రహదారి మూసివేత / సంత రోజు / కుటుంబ అనారోగ్యం' : 'e.g. Inaccessible hill road due to rain / Shandy day / Family illness'}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #fca5a5' }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  {isTe ? 'నావిగేటర్ గమనికలు & వివరాలు' : 'Navigator Notes & Escort Details'}
                </label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder={isTe ? 'రోగి, కుటుంబం లేదా ఆశాతో మాట్లాడిన వివరాలు నమోదు చేయండి...' : 'Record interaction with patient, family, or ASHA...'}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setSelectedTask(null)} className="btn btn-secondary">
                  {isTe ? 'రద్దు' : 'Cancel'}
                </button>
                <button type="submit" disabled={updating} className="btn btn-primary">
                  {updating
                    ? (isTe ? 'భద్రపరుస్తోంది...' : 'Saving...')
                    : (isTe ? 'నావిగేషన్ రికార్డును భద్రపరచండి' : 'Save Navigation Record')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
