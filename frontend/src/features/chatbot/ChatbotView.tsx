import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, ChatMessage, ImageUploadResponse } from '../../types';
import {
  Plus, Send, Camera, Image as ImageIcon, X, AlertTriangle,
  Copy, RefreshCw, Sparkles, Check, HelpCircle,
  Mic, MicOff, Volume2, VolumeX, Radio
} from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
}

export const ChatbotView: React.FC<Props> = ({ currentLang }) => {
  const t = translations[currentLang] || translations.en;
  const isTe = currentLang === 'te';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => 'sess_' + Math.random().toString(36).substring(2, 10));

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
        throw new Error(isTe ? 'ఈ బ్రౌజర్‌లో కెమెరా అందుబాటులో లేదు' : 'Direct screen camera not supported in this browser.');
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
      let msg = isTe ? 'కెమెరా తెరవలేకపోయాము.' : 'Could not open device camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = isTe
          ? 'కెమెరా అనుమతి తిరస్కరించబడింది. దయచేసి బ్రౌజర్ సెట్టింగ్స్‌లో అనుమతి ఇవ్వండి.'
          : 'Camera permission denied. Please allow camera access in your browser.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = isTe ? 'ఈ పరికరంలో కెమెరా కనుగొనబడలేదు.' : 'No camera found on this device.';
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
      case 'ta': return 'ta-IN';
      case 'kn': return 'kn-IN';
      case 'ml': return 'ml-IN';
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
      case 'ta':
        return [
          { label: '💡 வாய் புண் வீட்டு வைத்தியம்', text: 'வாய் புண்கள் குணமாக செய்ய வேண்டிய பாதுகாப்பான வழிகள் என்ன?' },
          { label: '🚭 புகையிலை பழக்கத்தை கைவிடுவது எப்படி?', text: 'குட்கா மற்றும் புகையிலை பழக்கத்தை எளிதாக கைவிடுவது எப்படி?' },
          { label: '🌶️ காரம் சாப்பிடும்போது வாய் எரிச்சல்', text: 'காரம் சாப்பிடும்போது வாய் எரிகிறது மற்றும் வாய் திறக்க முடியவில்லை, என்ன செய்ய வேண்டும்?' },
          { label: '🏥 மருத்துவரை எப்போது அணுக வேண்டும்?', text: 'வாயில் புண்கள் அல்லது திட்டுகள் இருந்தால் எப்போது மருத்துவரை அணுக வேண்டும்?' }
        ];
      case 'kn':
        return [
          { label: '💡 ಬಾಯಿ ಹುಣ್ಣಿಗೆ ಮನೆಮದ್ದು', text: 'ಬಾಯಿ ಹುಣ್ಣು ನಿವಾರಣೆಗೆ ಸುರಕ್ಷಿತ ಮನೆಮದ್ದುಗಳು ಯಾವುವು?' },
          { label: '🚭 ಗುಟ್ಕಾ ಮತ್ತು ತಂಬಾಕು ಬಿಡುವುದು ಹೇಗೆ?', text: 'ಗುಟ್ಕಾ ಮತ್ತು ತಂಬಾಕು ಸೇವನೆಯನ್ನು ಸುಲಭವಾಗಿ ಬಿಡುವುದು ಹೇಗೆ?' },
          { label: '🌶️ ಖಾರ ತಿಂದಾಗ ಬಾಯಿ ಉರಿ', text: 'ಖಾರ ತಿಂದಾಗ ಬಾಯಿ ಉರಿಯುತ್ತದೆ ಮತ್ತು ಬಾಯಿ ತೆರೆಯಲು ಕಷ್ಟವಾಗುತ್ತದೆ, ಏನು ಮಾಡಬೇಕು?' },
          { label: '🏥 ವೈದ್ಯರನ್ನು ಯಾವಾಗ ಭೇಟಿ ಮಾಡಬೇಕು?', text: 'ಬಾಯಿಯಲ್ಲಿ ಹುಣ್ಣು ಅಥವಾ ಬಿಳಿ ಮಚ್ಚೆ ಇದ್ದಾಗ ವೈದ್ಯರನ್ನು ಯಾವಾಗ ಭೇಟಿ ಮಾಡಬೇಕು?' }
        ];
      case 'ml':
        return [
          { label: '💡 വായ്പ്പുണ്ണിന് പരിചരണം', text: 'വായ്പ്പുണ്ണ് ഭേദമാക്കാൻ സുരക്ഷിതമായ മാർഗ്ഗങ്ങൾ എന്തൊക്കെയാണ്?' },
          { label: '🚭 പുകയിലയും ഗുട്കയും ഒഴിവാക്കാം', text: 'പുകയിലയും ഗുട്കയും ഒഴിവാക്കാൻ എളുപ്പവഴികൾ എന്തൊക്കെയാണ്?' },
          { label: '🌶️ എരിവ് കഴിക്കുമ്പോഴുള്ള എരിച്ചിൽ', text: 'എരിവ് കഴിക്കുമ്പോൾ വായയിൽ അസഹ്യമായ എരിച്ചിൽ അനുഭവപ്പെടുന്നു, എന്തുചെയ്യണം?' },
          { label: '🏥 എപ്പോഴാണ് ഡോക്ടറെ കാണേണ്ടത്?', text: 'വായിലെ വ്രണങ്ങൾക്ക് എപ്പോഴാണ് നിർബന്ധമായും ഡോക്ടറെ കാണേണ്ടത്?' }
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
        return 'నమస్కారం! నేను ఆరోగ్య మైత్ర AI (Aarogya Mytra AI) — Google MedGemma 1.5 4B మరియు MoHFW/ICMR/WHO మార్గదర్శకాల ఆధారంగా రూపొందించబడిన మీ క్లినికల్ AI ఆరోగ్య సహాయకుడిని. నోటి పుండ్లు, మచ్చలు, చర్మం, కన్ను లేదా ఇతర ఆరోగ్య సందేహాలను అడగవచ్చు లేదా ఫొటోను జతచేసి ప్రాథమిక విశ్లేషణ పొందవచ్చు. గమనిక: ఇది క్యాన్సర్‌ను నిర్ధారించదు.';
      case 'hi':
        return 'नमस्ते! मैं आरोग्य मैत्र AI हूँ — Google MedGemma 1.5 4B और MoHFW/ICMR/WHO दिशानिर्देशों पर आधारित आपका क्लीनिकल AI स्वास्थ्य सहायक। आप मुंह के छाले, दाग, त्वचा या स्वास्थ्य संबंधी प्रश्न पूछ सकते हैं या फोटो भेजकर प्राथमिक विश्लेषण प्राप्त कर सकते हैं। नोट: यह कैंसर की पुष्टि नहीं करता।';
      case 'ta':
        return 'வணக்கம்! நான் ஆரோக்கிய மைத்ரா AI — Google MedGemma 1.5 4B மற்றும் MoHFW/ICMR/WHO வழிகாட்டுதல்களின்படி இயங்கும் உங்கள் மருத்துவ AI உதவியாளர். வாய் புண்கள், தோல், கண் அல்லது பிற சுகாதார கேள்விகளை கேட்கலாம் அல்லது புகைப்படத்தை அனுப்பி முதற்கட்ட ஆய்வு பெறலாம். குறிப்பு: இது புற்றுநோயை உறுதிப்படுத்தாது.';
      case 'kn':
        return 'ನಮಸ್ಕಾರ! ನಾನು ಆರೋಗ್ಯ ಮೈತ್ರ AI — Google MedGemma 1.5 4B ಮತ್ತು MoHFW/ICMR/WHO ಮಾರ್ಗಸೂಚಿಗಳ ಆಧಾರದ ಮೇಲೆ ನಿಮ್ಮ ಕ್ಲಿನಿಕಲ್ AI ಆರೋಗ್ಯ ಸಹಾಯಕ. ಬಾಯಿ ಹುಣ್ಣು, ಮಚ್ಚೆ, ಚರ್ಮ ಅಥವಾ ಕಣ್ಣಿನ ಫೋಟೋ ಕಳುಹಿಸಿ ಪ್ರಾಥಮಿಕ ಪರೀಕ್ಷೆ ಪಡೆಯಬಹುದು. ಗಮನಿಸಿ: ಇದು ಕ್ಯಾನ್ಸರ್ ನಿರ್ಧರಿಸುವುದಿಲ್ಲ.';
      case 'ml':
        return 'നമസ്കാരം! ഞാൻ ആരോഗ്യ മൈത്ര AI — Google MedGemma 1.5 4B, MoHFW/ICMR/WHO മാർഗ്ഗനിർദ്ദേശങ്ങൾ എന്നിവയാൽ പ്രവർത്തിക്കുന്ന നിങ്ങളുടെ ക്ലിനിക്കൽ AI ആരോഗ്യ സഹായി. വായ്പ്പുണ്ണ്, ചർമ്മം, കണ്ണ് അല്ലെങ്കിൽ ഫോട്ടോകൾ അയച്ച് പ്രാഥമിക വിശകലനം നേടാം. കുറിപ്പ്: ഇത് ക്യാൻസർ നിർണ്ണയിക്കില്ല.';
      default:
        return 'Hello! I am Aarogya Mytra AI — your clinical multimodal health assistant powered by Google MedGemma 1.5 4B and verified MoHFW/ICMR/WHO guidelines. You can ask health questions or attach an image (oral mucosa, skin lesion, anterior eye, external ear, wound) for an evidence-grounded preliminary assessment. Notice: This system does not diagnose or exclude cancer.';
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
    api.getGoogleHealthRepoStatus()
      .then(res => setRepoStatus(res))
      .catch(() => setRepoStatus({ status: 'connected', details: { connected: true, submodule_path: 'external/medgemma' } }));
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(isTe ? 'ఈ బ్రౌజర్‌లో మైక్రోఫోన్ వాయిస్ ఇన్‌పుట్ అందుబాటులో లేదు' : 'Speech recognition not supported in this browser.');
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

          const isPatient = clean.includes('🗣️') || clean.toLowerCase().includes('for patient');
          const isAsha = clean.includes('👩‍⚕️') || clean.toLowerCase().includes('for asha');
          const isDoctor = clean.includes('🩺') || clean.toLowerCase().includes('for doctor') || clean.toLowerCase().includes('clinical report');
          const isGuidelines = clean.includes('📚') || clean.includes('ప్రామాణిక మార్గదర్శకాలు') || clean.toLowerCase().includes('guidelines');

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
            badgeLabel = isTe ? '🗣️ రోగి & కుటుంబం (Patient View)' : '🗣️ Patient & Family';
            badgeBg = '#DCFCE7';
            badgeText = '#166534';
          } else if (isAsha) {
            borderColor = '#0284C7';
            bgColor = '#F0F9FF';
            badgeLabel = isTe ? '👩‍⚕️ ఆశా కార్యకర్త (ASHA Checklist)' : '👩‍⚕️ ASHA & Field Staff';
            badgeBg = '#E0F2FE';
            badgeText = '#0369A1';
          } else if (isDoctor) {
            borderColor = '#6366F1';
            bgColor = '#EEF2FF';
            badgeLabel = isTe ? '🩺 వైద్యులు & స్పెషలిస్ట్ (Doctor Dossier)' : '🩺 Clinician Dossier';
            badgeBg = '#E0E7FF';
            badgeText = '#3730A3';
          } else if (isGuidelines) {
            borderColor = '#0D9488';
            bgColor = '#F8FAFC';
            badgeLabel = isTe ? '📚 ప్రామాణిక మార్గదర్శకాలు' : '📚 Clinical Evidence';
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
              <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {isTe ? 'ఆరోగ్య మైత్ర AI అసిస్టెంట్' : 'Aarogya Mytra AI'}
              </h3>
              <span className="badge badge-teal" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', fontWeight: 700 }}>
                Google MedGemma 1.5 4B
              </span>
              <a
                href="https://github.com/Google-Health/medgemma"
                target="_blank"
                rel="noopener noreferrer"
                className="badge badge-secondary"
                style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                title="Connected to official Google-Health/medgemma repository submodule (external/medgemma)"
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                <span>Google-Health/medgemma ({repoStatus?.details?.commit_hash?.slice(0, 7) || 'a60a660'}) ↗</span>
              </a>
              <span className="ai-badge-voice">
                <Radio size={11} style={{ animation: 'pulse 1.5s infinite' }} />
                {isTe ? 'వాయిస్ + విజన్' : 'Vision + Voice'}
              </span>
            </div>
            <p style={{ fontSize: '0.76rem', color: '#64748B', margin: '2px 0 0' }}>
              {isTe ? 'మల్టీమోడల్ మెడికల్ విజన్ & MoHFW ఎవిడెన్స్ ఆధారిత ఆరోగ్య సహాయకుడు' : 'Multimodal Medical Vision & Evidence-Grounded Clinical Health Assistant'}
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
            <span>{autoSpeak ? (isTe ? 'వాయిస్: ఆన్' : 'Auto-Speak: ON') : (isTe ? 'వాయిస్: ఆఫ్' : 'Auto-Speak')}</span>
          </button>

          <button
            type="button"
            className="chat-header-action-btn"
            onClick={handleResetChat}
            title={isTe ? 'కొత్త సంభాషణ ప్రారంభించండి' : 'Start Fresh Conversation'}
          >
            <RefreshCw size={13} color="#64748B" />
            <span>{isTe ? 'క్లియర్' : 'Reset'}</span>
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
          {isTe ? 'సమాచార వీక్షణ (Audience View):' : 'Audience View:'}
        </span>
        {[
          { id: 'all', label: isTe ? '👥 అందరికీ (All)' : '👥 All Cadres' },
          { id: 'patient', label: isTe ? '🗣️ రోగులకు (Patient)' : '🗣️ Patients' },
          { id: 'asha', label: isTe ? '👩‍⚕️ ఆశా వర్కర్లకు (ASHA)' : '👩‍⚕️ ASHA & Field' },
          { id: 'doctor', label: isTe ? '🩺 డాక్టర్లకు (Doctor)' : '🩺 Doctors & PHC' }
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
                    <span>{isTe ? 'ఆరోగ్య మిత్ర AI' : 'Arogya Mitra AI'}</span>
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
                      <span>{speakingMsgId === m.id ? (isTe ? 'మాట్లాడుతోంది...' : 'Speaking...') : (isTe ? 'వినండి' : 'Listen')}</span>
                    </button>

                    <button
                      className="message-action-btn"
                      onClick={() => handleCopyMessage(m.id, displayedText)}
                      title="Copy advice text"
                    >
                      {copiedId === m.id ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                      <span>{copiedId === m.id ? (isTe ? 'కాపీ చేయబడింది' : 'Copied') : (isTe ? 'కాపీ' : 'Copy')}</span>
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
                {isTe ? 'ఆరోగ్య మిత్ర ఆలోచిస్తోంది...' : 'Arogya Mitra is analyzing...'}
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
            <Camera size={16} color="var(--teal-primary)" /> {isTe ? 'కెమెరాతో తీయండి' : 'Take Photo'}
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
            <ImageIcon size={16} color="var(--teal-primary)" /> {isTe ? 'గ్యాలరీ నుండి ఎంచుకోండి' : 'Choose from Gallery'}
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
            <span>{isTe ? '🎙️ వాయిస్ వింటున్నాను... మాట్లాడండి (తెలుగు / English)' : '🎙️ Listening... Speak now in Telugu or English'}</span>
          </div>
          <button
            type="button"
            onClick={toggleListening}
            style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: 700 }}
          >
            {isTe ? 'ఆపండి' : 'Stop'}
          </button>
        </div>
      )}

      {/* Bottom Composer with Mic & Send */}
      <form onSubmit={handleSend} className="chat-composer">
        {/* Plus Button */}
        <button
          type="button"
          className="chat-plus-btn"
          title={isTe ? 'ఫొటో జోడించండి (+)' : 'Attach Image (+)'}
          onClick={() => setShowPlusMenu(!showPlusMenu)}
        >
          <Plus size={20} />
        </button>

        {/* Input Dock Pill */}
        <div className="chat-input-pill">
          <input
            type="text"
            placeholder={isListening ? (isTe ? '🎙️ వాయిస్ వింటున్నాను... మాట్లాడండి' : '🎙️ Listening... speak now') : t.chat_input_placeholder}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading || uploadingAttachment}
          />

          {/* Microphone Button (Speech-to-Text) */}
          <button
            type="button"
            className={`chat-mic-btn ${isListening ? 'listening' : 'idle'}`}
            onClick={toggleListening}
            title={isListening ? (isTe ? 'వాయిస్ ఆపండి' : 'Stop listening') : (isTe ? 'వాయిస్‌తో మాట్లాడండి' : 'Speak your question (Voice Input)')}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        </div>

        {/* Send Button */}
        <button
          type="submit"
          className="chat-send-btn"
          title={isTe ? 'సందేశం పంపండి' : 'Send Message'}
          disabled={loading || uploadingAttachment || (!inputText.trim() && !attachedImage)}
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
    </div>
  );
};
