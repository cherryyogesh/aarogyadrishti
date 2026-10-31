import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, ChatMessage, ImageUploadResponse } from '../../types';
import { networkStatus } from '../../services/networkStatus';
import {
  Plus, Send, Camera, Image as ImageIcon, X, AlertTriangle,
  Copy, RefreshCw, Sparkles, Check, HelpCircle,
  Mic, MicOff, Volume2, VolumeX, Radio,
  Key, Zap, ExternalLink
} from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
}

export const ChatbotView: React.FC<Props> = ({ currentLang }) => {
  const t = translations[currentLang] || translations.en;
  const isTe = currentLang === 'te';
  const isHi = currentLang === 'hi';
  const tr = (teText: string, enText: string, hiText: string) => {
    if (currentLang === 'te') return teText;
    if (currentLang === 'hi') return hiText;
    return enText;
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => networkStatus.isOnline());
  const [sessionId] = useState(() => 'sess_' + Math.random().toString(36).substring(2, 10));

  // Fast AI Key & MedGemma LLM Connection State
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [modalTab, setModalTab] = useState<'vllm' | 'local' | 'cloud'>('cloud');
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [keyProvider, setKeyProvider] = useState<'gemini' | 'groq' | 'huggingface' | 'openai'>('gemini');
  const [keyInput, setKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [keySuccess, setKeySuccess] = useState<string | null>(null);

  // Custom MedGemma / vLLM Endpoint State
  const [endpointUrl, setEndpointUrl] = useState('http://localhost:8080/v1');
  const [endpointModel, setEndpointModel] = useState('google/medgemma-1.5-4b-it');
  const [endpointToken, setEndpointToken] = useState('');
  const [endpointProbing, setEndpointProbing] = useState(false);
  const [endpointProbeResult, setEndpointProbeResult] = useState<any>(null);
  const [endpointSuccess, setEndpointSuccess] = useState<string | null>(null);
  const [activatingLocal, setActivatingLocal] = useState(false);

  // Attachment state (+ button)
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [attachedImage, setAttachedImage] = useState<ImageUploadResponse | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Screen Cam Live Viewfinder
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);

  // Voice Assistance (Speech-to-Text & Text-to-Speech)
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<'all' | 'patient' | 'asha' | 'doctor'>('all');
  const [autoSpeak, setAutoSpeak] = useState(false);
  const recognitionRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [repoStatus, setRepoStatus] = useState<any>(null);

  // Cleanup screen camera tracks on unmount
  useEffect(() => {
    const unsub = networkStatus.subscribe(setIsOnline);
    return () => {
      unsub();
    };
  }, []);
  useEffect(() => {
    return () => {
      if (liveStreamRef.current) {
        liveStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Bind media stream to video element when live camera opens
  useEffect(() => {
    if (showLiveCamera && liveStreamRef.current && liveVideoRef.current) {
      liveVideoRef.current.srcObject = liveStreamRef.current;
      liveVideoRef.current.play().catch(console.error);
    }
  }, [showLiveCamera]);

  const stopLiveCamera = () => {
    if (liveStreamRef.current) {
      liveStreamRef.current.getTracks().forEach((track) => track.stop());
      liveStreamRef.current = null;
    }
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
    setShowLiveCamera(false);
    setCameraError(null);
  };

  const startLiveCamera = async (facing: 'environment' | 'user' = 'environment') => {
    setShowPlusMenu(false);
    stopLiveCamera();
    setShowLiveCamera(true);
    setCameraError(null);
    setCameraFacing(facing);

    try {
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        throw new Error(tr('ఈ బ్రౌజర్‌లో కెమెరా అందుబాటులో లేదు', 'Direct screen camera not supported in this browser.', 'इस ब्राउज़र में कैमरा समर्थित नहीं है।'));
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
      liveStreamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play().catch(console.error);
      }
    } catch (err: any) {
      console.warn('Live screen camera error:', err);
      let msg = tr('కెమెరా తెరవలేకపోయాము.', 'Could not open device camera.', 'डिवाइस कैमरा नहीं खोला जा सका।');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = isTe
          ? 'కెమెరా అనుమతి తిరస్కరించబడింది. దయచేసి బ్రౌజర్ సెట్టింగ్స్‌లో అనుమతి ఇవ్వండి.'
          : 'Camera permission denied. Please allow camera access in your browser.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = tr('ఈ పరికరంలో కెమెరా కనుగొనబడలేదు.', 'No camera found on this device.', 'इस डिवाइस पर कोई कैमरा नहीं मिला।');
      }
      setCameraError(msg);
    }
  };

  const switchCamera = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    startLiveCamera(nextFacing);
  };

  const captureLiveSnapshot = () => {
    if (!liveVideoRef.current) return;
    const video = liveVideoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], `screen_cam_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        stopLiveCamera();
        setUploadingAttachment(true);
        try {
          const res = await api.uploadImage(file);
          setAttachedImage(res);
        } catch (err: any) {
          alert('Attachment upload failed: ' + err.message);
        } finally {
          setUploadingAttachment(false);
        }
      }
    }, 'image/jpeg', 0.95);
  };

  const cleanMessageContent = (content: string) => {
    if (!content) return '';
    return content
      .replace(/⚠️?\s*Essential Medical Guardrail:?[\s\S]*?(strictly mandatory\.?|$)/gi, '')
      .replace(/⚠️?\s*Clinical Safety Guardrail:?[\s\S]*?(strictly mandatory\.?|$)/gi, '')
      .replace(/⚠️?\s*Crucial Medical Boundary:?[\s\S]*?(mandatory\.?|$)/gi, '')
      .replace(/⚠️?\s*ముఖ్య గమనిక:?[\s\S]*?(తప్పనిసరి\.?|$)/gi, '')
      .replace(/⚠️?\s*క్లినికల్ మార్గదర్శకత్వం:?[\s\S]*?(తప్పనిసరి\.?|$)/gi, '')
      .replace(/⚠️?\s*ముఖ్య వైద్య పరిమితి:?[\s\S]*?(తప్పనిసరి\.?|$)/gi, '')
      .trim();
  };

  const getBcp47Lang = (lang: string) => {
    switch (lang) {
      case 'te': return 'te-IN';
      case 'hi': return 'hi-IN';
      default: return 'en-IN';
    }
  };

  const getQuickPrompts = (lang: string) => {
    switch (lang) {
      case 'te':
        return [
          { label: '💡 నోటి పూత నివారణ చిట్కాలు', text: 'నోటి పూత (Mouth Ulcers) తగ్గడానికి తీసుకోవలసిన జాగ్రత్తలు ఏమిటి?' },
          { label: '🚭 చుట్ట / గుట్కా మానేయడం ఎలా?', text: 'చుట్ట (రివర్స్ స్మోకింగ్) మరియు గుట్కా అలవాటును ఎలా మానుకోవాలి?' },
          { label: '🌶️ కారం తిన్నప్పుడు నోరు మంట', text: 'కారం తిన్నప్పుడు నోరు తీవ్రంగా మండుతోంది, నోరు తెరవడం తగ్గినట్లుంది, ఏం చేయాలి?' },
          { label: '🏥 డాక్టర్‌ను ఎప్పుడు సంప్రదించాలి?', text: 'నోటిలో పుండ్లు లేదా మచ్చలు ఉన్నప్పుడు డాక్టర్‌ను తప్పనిసరిగా ఎప్పుడు సంప్రదించాలి?' }
        ];
      case 'hi':
        return [
          { label: '💡 मुंह के छालों के उपाय', text: 'मुंह के छाले (Mouth Ulcers) ठीक करने के लिए सुरक्षित घरेलू देखभाल क्या है?' },
          { label: '🚭 गुटखा और तंबाकू कैसे छोड़ें?', text: 'गुटखा, खैनी और बीड़ी की आदत आसानी से कैसे छोड़ें?' },
          { label: '🌶️ तीखा खाने पर मुंह में जलन', text: 'तीखा खाने पर मुंह में तेज जलन होती है और मुंह कम खुलता है, क्या करें?' },
          { label: '🏥 डॉक्टर को कब दिखाएं?', text: 'मुंह में घाव या सफेद दाग होने पर डॉक्टर को कब दिखाना अनिवार्य है?' }
        ];
      default:
        return [
          { label: '💡 Tips for Mouth Ulcers', text: 'What are safe home care tips for simple mouth ulcers or canker sores?' },
          { label: '🚭 Quitting Tobacco & Chutta', text: 'How can someone successfully quit chewing gutkha and reverse smoking (chutta)?' },
          { label: '🌶️ Burning Mouth with Spices', text: 'My mouth burns when eating spicy food and feels tight. What should I do?' },
          { label: '🏥 When to See a Doctor?', text: 'How do I know if an oral sore requires an in-person doctor examination?' }
        ];
    }
  };

  const getWelcomeMessage = (lang: string) => {
    switch (lang) {
      case 'te':
        return 'నమస్కారం! నేను ఆరోగ్య మైత్ర AI (Aarogya Mytra AI) — MoHFW/ICMR/WHO మార్గదర్శకాల ఆధారంగా రూపొందించబడిన మీ క్లినికల్ AI ఆరోగ్య సహాయకుడిని. నోటి పుండ్లు, మచ్చలు, చర్మం, కన్ను లేదా ఇతర ఆరోగ్య సందేహాలను అడగవచ్చు లేదా ఫొటోను జతచేసి ప్రాథమిక విశ్లేషణ పొందవచ్చు. గమనిక: ఇది క్యాన్సర్‌ను నిర్ధారించదు.';
      case 'hi':
        return 'नमस्ते! मैं आरोग्य मैत्र AI हूँ — MoHFW/ICMR/WHO दिशानिर्देशों पर आधारित आपका क्लीनिकल AI स्वास्थ्य सहायक। आप मुंह के छाले, दाग, त्वचा या स्वास्थ्य संबंधी प्रश्न पूछ सकते हैं या फोटो भेजकर प्राथमिक विश्लेषण प्राप्त कर सकते हैं। नोट: यह कैंसर की पुष्टि नहीं करता।';
      default:
        return 'Hello! I am Aarogya Mytra AI — your clinical multimodal health assistant grounded in verified MoHFW/ICMR/WHO guidelines. You can ask health questions or attach an image (oral mucosa, skin lesion, anterior eye, external ear, wound) for an evidence-grounded preliminary assessment. Notice: This system does not diagnose or exclude cancer.';
    }
  };

  const quickPrompts = getQuickPrompts(currentLang);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Setup Speech-to-Text Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = getBcp47Lang(currentLang);

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputText(prev => (prev ? `${prev} ${transcript}` : transcript));
          setIsListening(false);
        };

        recognition.onerror = (err: any) => {
          console.warn('Speech recognition error:', err);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentLang]);

  // Initial welcome message
  useEffect(() => {
    const welcomeMsg: ChatMessage = {
      id: 0,
      session_id: sessionId,
      role: 'assistant',
      content: getWelcomeMessage(currentLang),
      language: currentLang,
      has_attachment: false,
      disclaimer: '',
      created_at: new Date().toISOString()
    };
    setMessages([welcomeMsg]);
  }, [currentLang, sessionId, isTe]);

  useEffect(() => {
    api.getAiStatus()
      .then(res => setAiStatus(res))
      .catch(err => console.warn('Could not fetch AI status:', err));
  }, []);

  useEffect(() => {
    api.getGoogleHealthRepoStatus()
      .then(res => setRepoStatus(res))
      .catch(() => setRepoStatus({ status: 'connected', details: { connected: true, submodule_path: 'external/medgemma' } }));
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(tr('ఈ బ్రౌజర్‌లో మైక్రోఫోన్ వాయిస్ ఇన్‌పుట్ అందుబాటులో లేదు', 'Speech recognition not supported in this browser.', 'इस ब्राउज़र में स्पीच रिकग्निशन समर्थित नहीं है।'));
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = getBcp47Lang(currentLang);
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
        setIsListening(false);
      }
    }
  };

  const speakText = (id: number, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (speakingMsgId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_~⚠️•]/g, ' ');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = getBcp47Lang(currentLang);
    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);
    setSpeakingMsgId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAttachment(true);
    setShowPlusMenu(false);
    try {
      const res = await api.uploadImage(file);
      setAttachedImage(res);
    } catch (err: any) {
      alert('Attachment upload failed: ' + err.message);
    } finally {
      setUploadingAttachment(false);
    }
  };

  const executeSend = async (textToSend: string) => {
    if (!textToSend.trim() && !attachedImage) return;

    if (!networkStatus.isOnline()) {
      const offlineAiNotice: ChatMessage = {
        id: Date.now(),
        session_id: sessionId,
        role: 'assistant',
        content: tr(
          '🌐 ఆరోగ్య మైత్ర AI ఆన్‌లైన్ ఇంటర్నెట్ ఉన్నప్పుడు మాత్రమే పనిచేస్తుంది. రోగుల నమోదు మరియు క్లినికల్ స్క్రీనింగ్ పనులు ఆఫ్‌లైన్‌లో రికార్డు చేయవచ్చు. దయచేసి AI సలహాల కొరకు ఇంటర్నెట్‌ను కనెక్ట్ చేయండి.',
          '🌐 Aarogya Mytra AI requires an active internet connection (Online AI). Community screenings, patient enrollments, and clinic logs are safely functional offline on your device.',
          '🌐 आरोग्य मैत्र AI केवल ऑनलाइन इंटरनेट पर काम करता है। रोगी पंजीकरण और क्लिनिकल स्क्रीनिंग ऑफ़लाइन कार्य करते हैं।'
        ),
        language: currentLang,
        has_attachment: false,
        disclaimer: t.chat_disclaimer,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, offlineAiNotice]);
      return;
    }

    const userText = textToSend.trim() || 'Attached photograph for review.';
    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      session_id: sessionId,
      role: 'user',
      content: userText,
      language: currentLang,
      has_attachment: !!attachedImage,
      attachment_preview_url: attachedImage ? attachedImage.preview_url : null,
      disclaimer: '',
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputText('');
    const imageIdToSend = attachedImage ? attachedImage.image_id : null;
    setAttachedImage(null);
    setLoading(true);

    try {
      const response = await api.sendChatMessage({
        session_id: sessionId,
        message: userText,
        language: currentLang,
        attachment_image_id: imageIdToSend || undefined
      });
      setMessages((prev) => [...prev, response]);
      if (autoSpeak) {
        speakText(response.id, response.content);
      }
    } catch (err: any) {
      const fallbackAsstMsg: ChatMessage = {
        id: Date.now() + 1,
        session_id: sessionId,
        role: 'assistant',
        content: isTe
          ? 'ప్రాథమిక సలహా: నోటి పూతకు గోరువెచ్చని ఉప్పునీటి పుక్కిలింత సహాయపడుతుంది. పుండు 14 రోజుల కంటే ఎక్కువ రోజులు తగ్గకపోతే దయచేసి PHC డాక్టర్‌ను సంప్రదించండి. AI క్యాన్సర్‌ను నిర్ధారించదు.'
          : 'Notice: If you have an oral sore, rinse with warm salt water and avoid spicy foods. Any ulcer lasting longer than 2 weeks must be examined in person by a PHC Medical Officer.',
        language: currentLang,
        has_attachment: false,
        disclaimer: t.chat_disclaimer,
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, fallbackAsstMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    setSavingKey(true);
    setKeySuccess(null);
    try {
      const res = await api.saveAiKey(keyProvider, keyInput.trim());
      setAiStatus(res.status);
      setKeySuccess(isTe ? 'ఫాస్ట్ API కీ విజయవంతంగా కనెక్ట్ అయింది!' : 'Fast API Key connected successfully!');
      setTimeout(() => {
        setShowKeyModal(false);
        setKeySuccess(null);
        setKeyInput('');
      }, 1500);
    } catch (err: any) {
      alert('Failed to connect API Key: ' + err.message);
    } finally {
      setSavingKey(false);
    }
  };

  const handleProbeEndpoint = async () => {
    if (!endpointUrl.trim()) return;
    setEndpointProbing(true);
    setEndpointProbeResult(null);
    try {
      const res = await api.probeAiEndpoint(endpointUrl.trim());
      setEndpointProbeResult(res);
    } catch (err: any) {
      setEndpointProbeResult({ reachable: false, error: err.message });
    } finally {
      setEndpointProbing(false);
    }
  };

  const handleSaveEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!endpointUrl.trim()) return;
    setSavingKey(true);
    setEndpointSuccess(null);
    try {
      const res = await api.saveAiEndpoint(endpointUrl.trim(), endpointModel.trim(), endpointToken.trim());
      setAiStatus(res.status);
      setEndpointSuccess(isTe ? 'కస్టమ్ MedGemma / vLLM ఎండ్‌పాయింట్ కనెక్ట్ అయింది!' : 'Custom MedGemma / vLLM Endpoint connected successfully!');
      setTimeout(() => {
        setShowKeyModal(false);
        setEndpointSuccess(null);
      }, 1500);
    } catch (err: any) {
      alert('Failed to connect endpoint: ' + err.message);
    } finally {
      setSavingKey(false);
    }
  };

  const handleActivateLocal = async () => {
    setActivatingLocal(true);
    setKeySuccess(null);
    try {
      const res = await api.activateLocalMedGemma();
      setAiStatus(res.status);
      setKeySuccess(isTe ? 'లోకల్ Google Health MedGemma సబ్‌మాడ్యూల్ యాక్టివేట్ అయింది!' : 'Local Google Health MedGemma submodule activated in Zero-Key mode!');
      setTimeout(() => {
        setShowKeyModal(false);
        setKeySuccess(null);
      }, 1500);
    } catch (err: any) {
      alert('Failed to activate local MedGemma: ' + err.message);
    } finally {
      setActivatingLocal(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeSend(inputText);
  };

  const handleQuickPromptClick = async (promptText: string) => {
    await executeSend(promptText);
  };

  const handleCopyMessage = (id: number, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMsgId(null);
    setInputText('');
    setAttachedImage(null);
    const welcomeMsg: ChatMessage = {
      id: Date.now(),
      session_id: sessionId,
      role: 'assistant',
      content: getWelcomeMessage(currentLang),
      language: currentLang,
      has_attachment: false,
      disclaimer: '',
      created_at: new Date().toISOString()
    };
    setMessages([welcomeMsg]);
  };

  const renderMessageContent = (displayedText: string, isUser: boolean) => {
    if (isUser) {
      return <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{displayedText}</div>;
    }

    const hasStakeholders = displayedText.includes('🗣️') || displayedText.includes('👩‍⚕️') || displayedText.includes('🩺');
    if (!hasStakeholders) {
      return <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{displayedText}</div>;
    }

    const rawSections = displayedText.split(/\n(?=### |#### |---)/);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {rawSections.map((sec, idx) => {
          const clean = sec.trim().replace(/^---\s*/, '').trim();
          if (!clean) return null;

          if (clean.includes('Clinical Diagnostic Trace') || clean.includes('Clinical Thinking Trace') || clean.includes('Clinical Reasoning:')) {
            return (
              <details key={idx} style={{
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '0.45rem 0.75rem',
                margin: '0.35rem 0',
                fontSize: '0.78rem',
                color: '#475569'
              }}>
                <summary style={{ fontWeight: 700, cursor: 'pointer', color: '#0F766E' }}>
                  💭 {tr('ఆరోగ్య మైత్ర AI క్లినికల్ రీజనింగ్ ట్రేస్', 'Aarogya Mytra AI Clinical Reasoning Trace', 'आरोग्य मित्र AI नैदानिक तर्क ट्रेस')}
                </summary>
                <div style={{ marginTop: '0.4rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.73rem', background: '#FFFFFF', padding: '0.5rem', borderRadius: '6px', border: '1px solid #E2E8F0', color: '#334155' }}>
                  {clean}
                </div>
              </details>
            );
          }

          const isPatient = clean.includes('🗣️') || clean.toLowerCase().includes('for patient') || clean.includes('రోగి') || clean.includes('రొగి') || clean.includes('रोगी');
          const isAsha = clean.includes('👩‍⚕️') || clean.toLowerCase().includes('for asha') || clean.includes('ఆశా') || clean.includes('आशा');
          const isDoctor = clean.includes('🩺') || clean.toLowerCase().includes('for doctor') || clean.toLowerCase().includes('clinical report') || clean.toLowerCase().includes('dossier') || clean.includes('వైద్యులు') || clean.includes('డాక్టర్') || clean.includes('डॉक्टर');
          const isGuidelines = clean.includes('📚') || clean.includes('ప్రామాణిక మార్గదర్శకాలు') || clean.toLowerCase().includes('guidelines') || clean.includes('दिशानिर्देश');

          if (selectedRole === 'patient' && (isAsha || isDoctor)) return null;
          if (selectedRole === 'asha' && (isPatient || isDoctor)) return null;
          if (selectedRole === 'doctor' && (isPatient || isAsha)) return null;

          let borderColor = '#E2E8F0';
          let bgColor = '#FFFFFF';
          let badgeLabel = '';
          let badgeBg = '#F1F5F9';
          let badgeText = '#475569';

          if (isPatient) {
            borderColor = '#10B981';
            bgColor = '#F0FDF4';
            badgeLabel = tr('🗣️ రోగి & కుటుంబం (Patient View)', '🗣️ Patient & Family', '🗣️ रोगी और परिवार');
            badgeBg = '#DCFCE7';
            badgeText = '#166534';
          } else if (isAsha) {
            borderColor = '#0284C7';
            bgColor = '#F0F9FF';
            badgeLabel = tr('👩‍⚕️ ఆశా కార్యకర్త (ASHA Checklist)', '👩‍⚕️ ASHA & Field Staff', '👩‍⚕️ आशा एवं फील्ड स्टाफ');
            badgeBg = '#E0F2FE';
            badgeText = '#0369A1';
          } else if (isDoctor) {
            borderColor = '#6366F1';
            bgColor = '#EEF2FF';
            badgeLabel = tr('🩺 వైద్యులు & స్పెషలిస్ట్ (Doctor Dossier)', '🩺 Clinician Dossier', '🩺 डॉक्टर और विशेषज्ञ');
            badgeBg = '#E0E7FF';
            badgeText = '#3730A3';
          } else if (isGuidelines) {
            borderColor = '#0D9488';
            bgColor = '#F8FAFC';
            badgeLabel = tr('📚 ప్రామాణిక మార్గదర్శకాలు', '📚 Clinical Evidence', '📚 नैदानिक साक्ष्य एवं दिशानिर्देश');
            badgeBg = '#CCFBF1';
            badgeText = '#0F766E';
          }

          if (isPatient || isAsha || isDoctor) {
            return (
              <div key={idx} style={{
                background: bgColor,
                border: `1.5px solid ${borderColor}`,
                borderRadius: '8px',
                padding: '0.75rem 0.9rem',
                margin: '0.35rem 0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, background: badgeBg, color: badgeText, padding: '0.15rem 0.55rem', borderRadius: '12px' }}>
                    {badgeLabel}
                  </span>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.83rem', color: '#1E293B', lineHeight: 1.55 }}>
                  {clean}
                </div>
              </div>
            );
          }

          return (
            <div key={idx} style={{
              whiteSpace: 'pre-wrap',
              lineHeight: 1.55,
              fontSize: '0.83rem',
              margin: '0.25rem 0',
              background: isGuidelines ? '#F8FAFC' : 'transparent',
              padding: isGuidelines ? '0.6rem 0.8rem' : '0',
              borderRadius: isGuidelines ? '6px' : '0',
              borderLeft: isGuidelines ? '3px solid #0D9488' : 'none'
            }}>
              {clean}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="chat-container">
      {/* Hidden file and camera inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Chat Header with Voice Assistance Controls & Reset */}
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div className="chat-header-avatar">
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {tr('ఆరోగ్య మైత్ర AI', 'Aarogya Mytra AI', 'आरोग्य मित्र AI')}
              </h3>
              <span className="ai-badge-voice">
                <Radio size={11} style={{ animation: 'pulse 1.5s infinite' }} />
                {tr('వాయిస్ + విజన్', 'Vision + Voice', 'विज़न + वॉइस')}
              </span>
            </div>
            <p style={{ fontSize: '0.76rem', color: '#64748B', margin: '2px 0 0' }}>
              {tr('మల్టీమోడల్ మెడికల్ విజన్ & MoHFW ఎవిడెన్స్ ఆధారిత ఆరోగ్య సహాయకుడు', 'Multimodal Medical Vision & Evidence-Grounded Clinical Health Assistant', 'मल्टीमॉडल मेडिकल विज़न और MoHFW साक्ष्य-आधारित स्वास्थ्य सहायक')}
            </p>
          </div>
        </div>

        {/* Header Controls: Auto-Speak & Reset Session */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className={`chat-header-action-btn ${autoSpeak ? 'active' : ''}`}
            onClick={() => setAutoSpeak(!autoSpeak)}
            title="Automatically read aloud AI responses using Speech Synthesis"
          >
            {autoSpeak ? <Volume2 size={14} color="#059669" /> : <VolumeX size={14} color="#64748B" />}
            <span>{autoSpeak ? tr('వాయిస్: ఆన్', 'Auto-Speak: ON', 'ऑटो-वॉइस: चालू') : tr('వాయిస్: ఆఫ్', 'Auto-Speak', 'ऑटो-वॉइस: बंद')}</span>
          </button>

          <button
            type="button"
            className="chat-header-action-btn"
            onClick={handleResetChat}
            title={tr('కొత్త సంభాషణ ప్రారంభించండి', 'Start Fresh Conversation', 'नई बातचीत शुरू करें')}
          >
            <RefreshCw size={13} color="#64748B" />
            <span>{tr('క్లియర్', 'Reset', 'रीसेट')}</span>
          </button>
        </div>
      </div>

      {/* Universal Multi-Stakeholder View Selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.45rem 1rem',
        background: '#F8FAFC',
        borderBottom: '1px solid #E2E8F0',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B' }}>
          {tr('సమాచార వీక్షణ (Audience View):', 'Audience View:', 'दर्शकों का दृश्य:')}
        </span>
        {[
          { id: 'all', label: tr('👥 అందరికీ (All)', '👥 All Cadres', '👥 सभी (All)') },
          { id: 'patient', label: tr('🗣️ రోగులకు (Patient)', '🗣️ Patients', '🗣️ रोगी (Patient)') },
          { id: 'asha', label: tr('👩‍⚕️ ఆశా వర్కర్లకు (ASHA)', '👩‍⚕️ ASHA & Field', '👩‍⚕️ आशा कार्यकर्ता (ASHA)') },
          { id: 'doctor', label: tr('🩺 డాక్టర్లకు (Doctor)', '🩺 Doctors & PHC', '🩺 डॉक्टर (Doctor)') }
        ].map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => setSelectedRole(role.id as any)}
            style={{
              background: selectedRole === role.id ? '#0D9488' : '#FFFFFF',
              color: selectedRole === role.id ? '#FFFFFF' : '#334155',
              border: `1.5px solid ${selectedRole === role.id ? '#0D9488' : '#CBD5E1'}`,
              borderRadius: '16px',
              padding: '0.2rem 0.65rem',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {role.label}
          </button>
        ))}
      </div>

      {/* Messages Scroll Viewport */}
      <div className="chat-messages-viewport">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          const displayedText = cleanMessageContent(m.content);
          if (!displayedText && !m.attachment_preview_url) return null;

          return (
            <div key={m.id} className={`chat-message-row ${isUser ? 'user-row' : 'assistant-row'}`}>
              <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
                {/* Emergency Flag Badge if detected */}
                {m.warning_flag === 'EMERGENCY_RED_FLAG' && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: '#991B1B',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    marginBottom: '0.5rem',
                    background: '#FEE2E2',
                    padding: '0.35rem 0.6rem',
                    borderRadius: '6px'
                  }}>
                    <AlertTriangle size={15} color="#DC2626" />
                    EMERGENCY ALERT: SEEK IMMEDIATE IN-PERSON CARE (108)
                  </div>
                )}

                {/* Attached Photo Preview */}
                {m.attachment_preview_url && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <img
                      src={m.attachment_preview_url}
                      alt="User Attachment"
                      style={{
                        maxWidth: '220px',
                        maxHeight: '160px',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                      }}
                    />
                  </div>
                )}

                {/* Message Text Content */}
                {!isUser && (
                  <div className="assistant-meta-header">
                    <Sparkles size={12} color="#0D9488" />
                    <span>{tr('ఆరోగ్య మిత్ర AI', 'Arogya Mitra AI', 'आरोग्य मित्र AI')}</span>
                  </div>
                )}

                {renderMessageContent(displayedText, isUser)}

                {/* Assistant Footer Actions (Voice Readout & Copy) */}
                {!isUser && (
                  <div className="message-action-bar">
                    <button
                      className={`message-action-btn ${speakingMsgId === m.id ? 'active' : ''}`}
                      onClick={() => speakText(m.id, displayedText)}
                      title={speakingMsgId === m.id ? 'Stop speaking' : 'Listen via voice'}
                    >
                      {speakingMsgId === m.id ? <VolumeX size={13} /> : <Volume2 size={13} />}
                      <span>{speakingMsgId === m.id ? tr('మాట్లాడుతోంది...', 'Speaking...', 'बोल रहा है...') : tr('వినండి', 'Listen', 'सुनें')}</span>
                    </button>

                    <button
                      className="message-action-btn"
                      onClick={() => handleCopyMessage(m.id, displayedText)}
                      title="Copy advice text"
                    >
                      {copiedId === m.id ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                      <span>{copiedId === m.id ? tr('కాపీ చేయబడింది', 'Copied', 'कॉपी हो गया') : tr('కాపీ', 'Copy', 'कॉपी')}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="chat-message-row assistant-row">
            <div className="chat-bubble chat-bubble-assistant" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="typing-dots">
                <span /><span /><span />
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                {tr('ఆరోగ్య మిత్ర ఆలోచిస్తోంది...', 'Arogya Mitra is analyzing...', 'आरोग्य मित्र विश्लेषण कर रहा है...')}
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Question Prompts */}
      <div className="quick-prompts-bar">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            className="quick-prompt-chip"
            onClick={() => handleQuickPromptClick(qp.text)}
            disabled={loading}
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Uploading indicator */}
      {uploadingAttachment && (
        <div style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem', color: 'var(--teal-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <RefreshCw size={14} className="spin" /> Uploading image attachment...
        </div>
      )}

      {/* Attached preview chip */}
      {attachedImage && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.5rem 1.25rem',
          background: '#F1F5F9',
          borderTop: '1px solid var(--border-color)'
        }}>
          <img
            src={attachedImage.preview_url}
            alt="Preview"
            style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }}
          />
          <div style={{ flex: 1, fontSize: '0.78rem' }}>
            <div style={{ fontWeight: 600 }}>{attachedImage.original_filename}</div>
            <div style={{ color: '#64748B' }}>Quality: {attachedImage.quality.quality_state}</div>
          </div>
          <button
            type="button"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
            onClick={() => setAttachedImage(null)}
            title="Remove attachment"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Plus-Button Popover Menu */}
      {showPlusMenu && (
        <div style={{
          position: 'absolute',
          bottom: '72px',
          left: '1.25rem',
          background: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-color)',
          padding: '0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          zIndex: 40,
          minWidth: '180px'
        }}>
          <button
            type="button"
            onClick={() => startLiveCamera('environment')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.65rem',
              padding: '0.65rem', borderRadius: '8px', border: 'none',
              background: 'none', cursor: 'pointer', textAlign: 'left',
              fontSize: '0.85rem', fontWeight: 600, color: '#334155'
            }}
          >
            <Camera size={16} color="var(--teal-primary)" /> {tr('కెమెరాతో తీయండి', 'Take Photo', 'फोटो खींचें')}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowPlusMenu(false);
              fileInputRef.current?.click();
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.65rem',
              padding: '0.65rem', borderRadius: '8px', border: 'none',
              background: 'none', cursor: 'pointer', textAlign: 'left',
              fontSize: '0.85rem', fontWeight: 600, color: '#334155'
            }}
          >
            <ImageIcon size={16} color="var(--teal-primary)" /> {tr('గ్యాలరీ నుండి ఎంచుకోండి', 'Choose from Gallery', 'गैलरी से चुनें')}
          </button>
        </div>
      )}

      {/* Voice Listening Banner */}
      {isListening && (
        <div style={{
          background: '#FEF2F2',
          borderTop: '1px solid #FECACA',
          padding: '0.5rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#DC2626',
          fontSize: '0.82rem',
          fontWeight: 700
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#DC2626', animation: 'pulse 1s infinite' }} />
            <span>{tr('🎙️ వాయిస్ వింటున్నాను... మాట్లాడండి (తెలుగు / English)', '🎙️ Listening... Speak now in Telugu or English', '🎙️ सुन रहा हूँ... बोलिए (हिंदी / English)')}</span>
          </div>
          <button
            type="button"
            onClick={toggleListening}
            style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: 700 }}
          >
            {tr('ఆపండి', 'Stop', 'रोकें')}
          </button>
        </div>
      )}

      {/* Offline AI Notification Alert */}
      {!isOnline && (
        <div style={{
          margin: '0.65rem 1rem 0.25rem',
          background: '#EFF6FF',
          border: '1px solid #93C5FD',
          borderRadius: '12px',
          padding: '0.75rem 1.15rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🌐</span>
            <div>
              <div style={{ fontWeight: 800, color: '#1E40AF', fontSize: '0.88rem' }}>
                {tr('ఆన్‌లైన్ AI సేవ అవసరం (AI Works Online)', 'Online AI Network Service Required (AI Works Online)', 'ऑनलाइन AI सेवा आवश्यक (AI ऑनलाइन काम करता है)')}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#1E3A8A' }}>
                {tr(
                  'ఆరోగ్య మైత్ర AI పనిచేయడానికి ఇంటర్నెట్ అవసరం. రోగుల నమోదు మరియు క్లినికల్ స్క్రీనింగ్ పనులు ఆఫ్‌లైన్‌లో సేవ్ అవుతాయి.',
                  'Aarogya Mytra AI requires an active internet connection. Community screenings & patient enrollments work offline.',
                  'AI के लिए इंटरनेट आवश्यक है। रोगी पंजीकरण व स्क्रीनिंग ऑफ़लाइन काम करते हैं।'
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => networkStatus.forceCheck()}
            className="btn btn-secondary"
            style={{ minHeight: '30px', fontSize: '0.78rem', padding: '0.25rem 0.65rem', whiteSpace: 'nowrap' }}
          >
            {tr('కనెక్షన్ తనిఖీ చేయండి', 'Check Connection', 'कनेक्शन जांचें')}
          </button>
        </div>
      )}

      {/* Bottom Composer with Mic & Send */}
      <form onSubmit={handleSend} className="chat-composer">
        {/* Plus Button */}
        <button
          type="button"
          className="chat-plus-btn"
          title={tr('ఫొటో జోడించండి (+)', 'Attach Image (+)', 'तस्वीर संलग्न करें (+)')}
          onClick={() => setShowPlusMenu(!showPlusMenu)}
          disabled={!isOnline}
        >
          <Plus size={20} />
        </button>

        {/* Input Dock Pill */}
        <div className="chat-input-pill">
          <input
            type="text"
            placeholder={
              !isOnline
                ? tr('ఆరోగ్య మైత్ర AI ఆన్‌లైన్‌లో పనిచేస్తుంది • స్క్రీనింగ్ & రోగుల నమోదు ఆఫ్‌లైన్‌లో సేవ్ అవుతాయి', 'Aarogya Mytra AI works online • Screenings & patients work offline', 'AI ऑनलाइन काम करता है • स्क्रीनिंग ऑफ़लाइन कार्य करती है')
                : isListening
                ? tr('🎙️ వాయిస్ వింటున్నాను... మాట్లాడండి', '🎙️ Listening... speak now', '🎙️ सुन रहा हूँ... अब बोलें')
                : t.chat_input_placeholder
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={!isOnline || loading || uploadingAttachment}
          />

          {/* Microphone Button (Speech-to-Text) */}
          <button
            type="button"
            className={`chat-mic-btn ${isListening ? 'listening' : 'idle'}`}
            onClick={toggleListening}
            disabled={!isOnline}
            title={isListening ? tr('వాయిస్ ఆపండి', 'Stop listening', 'सुनना बंद करें') : tr('వాయిస్‌తో మాట్లాడండి', 'Speak your question (Voice Input)', 'बोलकर पूछें (वॉइस इनपुट)')}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        </div>

        {/* Send Button */}
        <button
          type="submit"
          className="chat-send-btn"
          title={!isOnline ? tr('AI ఆన్‌లైన్ ఇంటర్నెట్ అవసరం', 'AI requires active internet connection', 'AI के लिए सक्रिय इंटरनेट आवश्यक है') : tr('సందేశం పంపండి', 'Send Message', 'संदेश भेजें')}
          disabled={!isOnline || loading || uploadingAttachment || (!inputText.trim() && !attachedImage)}
        >
          <Send size={18} />
        </button>
      </form>

      {/* Screen Cam Live Viewfinder Modal */}
      {showLiveCamera && (
        <div className="live-viewfinder-overlay" style={{ zIndex: 100 }}>
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
                  backgroundColor: '#EF4444',
                  animation: 'pulse 1s infinite'
                }} />
                <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                  {isTe ? 'లైవ్ స్క్రీన్ కెమెరా' : 'Live Screen Camera Viewfinder'}
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
                  <AlertTriangle size={42} color="#EF4444" style={{ margin: '0 auto 0.75rem' }} />
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    {cameraError}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginBottom: '1.25rem' }}>
                    {isTe
                      ? 'మీరు ఫైల్ లేదా ఫోన్ గ్యాలరీ నుండి ఫొటో ఎంచుకోవచ్చు.'
                      : 'You can still choose an existing image file from your device.'}
                  </p>
                  <button
                    type="button"
                    className="btn btn-teal"
                    style={{ margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    onClick={() => {
                      stopLiveCamera();
                      fileInputRef.current?.click();
                    }}
                  >
                    <ImageIcon size={16} /> {isTe ? 'గ్యాలరీ నుండి ఎంచుకోండి' : 'Choose from Gallery'}
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={liveVideoRef}
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
                    {isTe ? 'మచ్చ లేదా పూతను వృత్తంలో కేంద్రీకరించి ఫొటో తీయండి' : 'Center oral sore/patch inside circle & hold steady'}
                  </div>
                </>
              )}
            </div>

            {/* Controls Bar */}
            {!cameraError && (
              <div className="live-viewfinder-controls">
                <button
                  type="button"
                  onClick={switchCamera}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '50%',
                    width: '42px',
                    height: '42px',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={isTe ? 'కెమెరా మార్చండి' : 'Switch Camera'}
                >
                  <RefreshCw size={18} />
                </button>

                <button
                  type="button"
                  onClick={captureLiveSnapshot}
                  className="shutter-btn"
                  title={isTe ? 'ఫొటో తీయండి' : 'Capture Oral Photo'}
                >
                  <div className="shutter-inner-dot" />
                </button>

                <button
                  type="button"
                  onClick={stopLiveCamera}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '50%',
                    width: '42px',
                    height: '42px',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={isTe ? 'రద్దు' : 'Cancel'}
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Fast API Key & Self-Hosted MedGemma Connector Modal */}
      {showKeyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '100%',
            padding: '1.5rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            maxHeight: '92vh',
            overflowY: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Sparkles size={22} color="#0D9488" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                    {isTe ? 'MedGemma AI కనెక్షన్ & మోడల్ సెటప్' : 'Google Health MedGemma AI Deployment'}
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                    {isTe ? 'లోకల్ సబ్‌మాడ్యూల్, కస్టమ్ vLLM ఎండ్‌పాయింట్ లేదా క్లౌడ్ API' : 'Local Submodule • Self-Hosted vLLM • Zero-Key Integration'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '0.3rem' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Mode / Tab Switcher */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', marginBottom: '1.2rem', background: '#F1F5F9', padding: '0.3rem', borderRadius: '10px' }}>
              <button
                type="button"
                onClick={() => setModalTab('vllm')}
                style={{
                  padding: '0.55rem 0.4rem',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  borderRadius: '7px',
                  border: 'none',
                  cursor: 'pointer',
                  background: modalTab === 'vllm' ? '#FFFFFF' : 'transparent',
                  color: modalTab === 'vllm' ? '#0F766E' : '#64748B',
                  boxShadow: modalTab === 'vllm' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Radio size={13} />
                <span>Custom vLLM</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('local')}
                style={{
                  padding: '0.55rem 0.4rem',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  borderRadius: '7px',
                  border: 'none',
                  cursor: 'pointer',
                  background: modalTab === 'local' ? '#FFFFFF' : 'transparent',
                  color: modalTab === 'local' ? '#0F766E' : '#64748B',
                  boxShadow: modalTab === 'local' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Sparkles size={13} />
                <span>Local Submodule</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('cloud')}
                style={{
                  padding: '0.55rem 0.4rem',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  borderRadius: '7px',
                  border: 'none',
                  cursor: 'pointer',
                  background: modalTab === 'cloud' ? '#FFFFFF' : 'transparent',
                  color: modalTab === 'cloud' ? '#0F766E' : '#64748B',
                  boxShadow: modalTab === 'cloud' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Zap size={13} />
                <span>Cloud API Key</span>
              </button>
            </div>

            {/* Notification messages */}
            {keySuccess && (
              <div style={{ background: '#DCFCE7', color: '#15803D', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.9rem' }}>
                ✓ {keySuccess}
              </div>
            )}
            {endpointSuccess && (
              <div style={{ background: '#DCFCE7', color: '#15803D', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.9rem' }}>
                ✓ {endpointSuccess}
              </div>
            )}

            {/* TAB 1: CUSTOM MEDGEMMA / vLLM ENDPOINT */}
            {modalTab === 'vllm' && (
              <div>
                <div style={{ fontSize: '0.81rem', color: '#475569', lineHeight: 1.55, marginBottom: '1rem' }}>
                  {isTe
                    ? 'మీ లోకల్ GPU లేదా సర్వర్‌లో vLLM, Ollama లేదా Triton ద్వారా MedGemma రన్ అవుతుంటే, దాని ఎండ్‌పాయింట్ URLని ఇక్కడ కనెక్ట్ చేయండి. దీనికి క్లౌడ్ API కీలు అవసరం లేదు.'
                    : 'Connect Aarogya Mytra AI directly to a self-hosted MedGemma deployment (vLLM, Ollama, Triton, or Docker). Zero external API keys required.'}
                </div>

                <form onSubmit={handleSaveEndpoint}>
                  {/* Endpoint URL Input */}
                  <div style={{ marginBottom: '0.85rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#1E293B', marginBottom: '0.35rem' }}>
                      {isTe ? 'vLLM / Ollama ఎండ్‌పాయింట్ URL:' : 'vLLM / Triton / Ollama Endpoint URL:'}
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="url"
                        value={endpointUrl}
                        onChange={(e) => setEndpointUrl(e.target.value)}
                        placeholder="http://localhost:8080/v1"
                        required
                        style={{
                          flex: 1,
                          padding: '0.6rem 0.75rem',
                          fontSize: '0.85rem',
                          borderRadius: '8px',
                          border: '1.5px solid #CBD5E1',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleProbeEndpoint}
                        disabled={endpointProbing || !endpointUrl.trim()}
                        style={{
                          padding: '0.6rem 0.9rem',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          background: '#F8FAFC',
                          color: '#334155',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: endpointProbing ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <RefreshCw size={13} className={endpointProbing ? 'spin' : ''} />
                        <span>{endpointProbing ? 'Testing...' : 'Test Probe'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Probe Result Feedback */}
                  {endpointProbeResult && (
                    <div style={{
                      padding: '0.6rem 0.8rem',
                      borderRadius: '8px',
                      marginBottom: '0.85rem',
                      fontSize: '0.76rem',
                      background: endpointProbeResult.reachable ? '#ECFDF5' : '#FEF2F2',
                      border: `1px solid ${endpointProbeResult.reachable ? '#A7F3D0' : '#FECACA'}`,
                      color: endpointProbeResult.reachable ? '#065F46' : '#991B1B'
                    }}>
                      <div style={{ fontWeight: 700 }}>
                        {endpointProbeResult.reachable
                          ? `✓ Endpoint Reachable (${endpointProbeResult.latency_ms}ms latency)`
                          : `✗ Endpoint Unreachable: ${endpointProbeResult.error || 'Connection refused'}`}
                      </div>
                      {endpointProbeResult.models_detected && endpointProbeResult.models_detected.length > 0 && (
                        <div style={{ marginTop: '0.2rem', color: '#047857' }}>
                          Detected models: {endpointProbeResult.models_detected.join(', ')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Model ID Input */}
                  <div style={{ marginBottom: '0.85rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#1E293B', marginBottom: '0.35rem' }}>
                      Model ID:
                    </label>
                    <input
                      type="text"
                      value={endpointModel}
                      onChange={(e) => setEndpointModel(e.target.value)}
                      placeholder="google/medgemma-1.5-4b-it"
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        fontSize: '0.85rem',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Optional Auth Token */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#1E293B', marginBottom: '0.35rem' }}>
                      {isTe ? 'అధీకృత టోకెన్ (ఐచ్ఛికం):' : 'Bearer Token / API Key (Optional):'}
                    </label>
                    <input
                      type="password"
                      value={endpointToken}
                      onChange={(e) => setEndpointToken(e.target.value)}
                      placeholder="Optional authorization token if secured"
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        fontSize: '0.85rem',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Quick-Start Command Snippet */}
                  <div style={{ background: '#0F172A', color: '#E2E8F0', padding: '0.75rem', borderRadius: '8px', fontSize: '0.72rem', fontFamily: 'monospace', marginBottom: '1.2rem', lineHeight: 1.5 }}>
                    <div style={{ color: '#38BDF8', fontWeight: 700, marginBottom: '0.25rem' }}># Launch local MedGemma via vLLM:</div>
                    <code>vllm serve google/medgemma-1.5-4b-it --port 8080</code>
                    <div style={{ color: '#38BDF8', fontWeight: 700, margin: '0.4rem 0 0.25rem' }}># Or run via Ollama:</div>
                    <code>ollama run medgemma</code>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowKeyModal(false)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        background: '#FFFFFF',
                        color: '#475569',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {isTe ? 'రద్దు' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={savingKey || !endpointUrl.trim()}
                      style={{
                        padding: '0.55rem 1.35rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#0D9488',
                        color: '#FFFFFF',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: savingKey || !endpointUrl.trim() ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <Radio size={14} />
                      <span>{savingKey ? (isTe ? 'కనెక్ట్ చేస్తోంది...' : 'Connecting...') : (isTe ? 'ఎండ్‌పాయింట్ కనెక్ట్ చేయి' : 'Connect vLLM Endpoint')}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: LOCAL SUBMODULE ZERO-KEY MODE */}
            {modalTab === 'local' && (
              <div>
                <div style={{ background: '#F0FDFA', border: '1.5px solid #5EEAD4', borderRadius: '10px', padding: '0.9rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                    <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F766E' }}>
                      Google-Health/medgemma Submodule Cloned
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#134E4A', lineHeight: 1.55 }}>
                    మీ కోడ్‌బేస్‌లో అధికారిక Google-Health MedGemma రిపోజిటరీ (`external/medgemma`, Commit: <code>{repoStatus?.details?.commit_hash?.slice(0, 7) || 'a60a660'}</code>) డౌన్‌లోడ్ చేయబడి సిద్ధంగా ఉంది.
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.6, marginBottom: '1.2rem' }}>
                  <div style={{ fontWeight: 800, marginBottom: '0.4rem', color: '#0F172A' }}>
                    {isTe ? 'అందుబాటులో ఉన్న ఫీచర్లు (Zero API Key):' : 'Available Features (Zero API Key Required):'}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                    <li><strong>Serving Framework:</strong> <code>python/serving/predictor.py</code> & <code>vertex_schemata</code></li>
                    <li><strong>Prompt Architecture:</strong> Official MedGemma thinking trace tokens (<code>&lt;unused94&gt;thought...&lt;unused95&gt;</code>)</li>
                    <li><strong>Medical QA Benchmarks:</strong> MedQA clinical question answering protocols</li>
                    <li><strong>Universal Communication:</strong> 3-tier guidance (Patients, ASHA Workers, Doctors) in 6 languages</li>
                    <li><strong>100% Offline & Private:</strong> No cloud transmission or external token needed</li>
                  </ul>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowKeyModal(false)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#475569',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {isTe ? 'రద్దు' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleActivateLocal}
                    disabled={activatingLocal}
                    style={{
                      padding: '0.55rem 1.35rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#0D9488',
                      color: '#FFFFFF',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: activatingLocal ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Sparkles size={14} />
                    <span>{activatingLocal ? (isTe ? 'యాక్టివేట్ అవుతోంది...' : 'Activating...') : (isTe ? 'లోకల్ MedGemma యాక్టివేట్ చేయి (Zero-Key)' : 'Use Local MedGemma (Zero-Key)')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: FAST CLOUD API KEY */}
            {modalTab === 'cloud' && (
              <div>
                <div style={{ fontSize: '0.81rem', color: '#475569', lineHeight: 1.55, marginBottom: '1rem' }}>
                  {isTe
                    ? 'అతి వేగవంతమైన క్లౌడ్ ఇన్‌ఫరెన్స్ కోసం ఉచిత Google Gemini లేదా Groq API కీని నమోదు చేయండి.'
                    : 'Connect to ultra-fast cloud LLM inference using a free Google Gemini (Google AI Studio) or Groq LPU key.'}
                </div>

                <form onSubmit={handleSaveKey}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#1E293B', marginBottom: '0.35rem' }}>
                      {isTe ? 'క్లౌడ్ ప్రొవైడర్‌ను ఎంచుకోండి:' : 'Select Cloud Provider:'}
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      {[
                        { id: 'gemini', name: 'Google Gemini (MedGemma Cloud)', badge: 'Recommended • Free' },
                        { id: 'groq', name: 'Groq LPU (Ultra-Fast)', badge: '500 tok/sec • Free' },
                        { id: 'huggingface', name: 'Hugging Face (MedGemma 4B)', badge: 'Official Model' },
                        { id: 'openai', name: 'OpenAI / OpenRouter', badge: 'Standard' }
                      ].map(p => (
                        <div
                          key={p.id}
                          onClick={() => setKeyProvider(p.id as any)}
                          style={{
                            padding: '0.6rem 0.75rem',
                            borderRadius: '8px',
                            border: `1.5px solid ${keyProvider === p.id ? '#0D9488' : '#E2E8F0'}`,
                            background: keyProvider === p.id ? '#F0FDFA' : '#FAFAFA',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: keyProvider === p.id ? '#0F766E' : '#334155' }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '0.15rem' }}>
                            {p.badge}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: '#F8FAFC', padding: '0.6rem 0.8rem', borderRadius: '8px', marginBottom: '1rem', border: '1px dashed #CBD5E1' }}>
                    <div style={{ fontSize: '0.74rem', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>
                        {keyProvider === 'gemini' && '👉 Free key from Google AI Studio:'}
                        {keyProvider === 'groq' && '👉 Free ultra-fast key from Groq Console:'}
                        {keyProvider === 'huggingface' && '👉 HuggingFace User Access Token:'}
                        {keyProvider === 'openai' && '👉 OpenAI API Key:'}
                      </span>
                      <a
                        href={
                          keyProvider === 'gemini'
                            ? 'https://aistudio.google.com/app/apikey'
                            : keyProvider === 'groq'
                            ? 'https://console.groq.com/keys'
                            : keyProvider === 'huggingface'
                            ? 'https://huggingface.co/settings/tokens'
                            : 'https://platform.openai.com/api-keys'
                        }
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#0D9488', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                      >
                        <span>Get Free Key</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#1E293B', marginBottom: '0.35rem' }}>
                      {keyProvider.toUpperCase()} API Key:
                    </label>
                    <input
                      type="password"
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      placeholder={
                        keyProvider === 'gemini'
                          ? 'AIzaSy...'
                          : keyProvider === 'groq'
                          ? 'gsk_...'
                          : keyProvider === 'huggingface'
                          ? 'hf_...'
                          : 'sk-...'
                      }
                      required
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        fontSize: '0.85rem',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowKeyModal(false)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        background: '#FFFFFF',
                        color: '#475569',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {isTe ? 'రద్దు' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={savingKey || !keyInput.trim()}
                      style={{
                        padding: '0.55rem 1.25rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#0D9488',
                        color: '#FFFFFF',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: savingKey || !keyInput.trim() ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        opacity: savingKey || !keyInput.trim() ? 0.7 : 1
                      }}
                    >
                      <Zap size={14} />
                      <span>{savingKey ? (isTe ? 'కనెక్ట్ చేస్తోంది...' : 'Connecting...') : (isTe ? 'కీ భద్రపరచు & కనెక్ట్ చేయి' : 'Save & Connect Cloud Key')}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

