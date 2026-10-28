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

  // Voice Assistance (Speech-to-Text & Text-to-Speech)
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<number | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const recognitionRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

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

  const quickPrompts = isTe ? [
    { label: '💡 నోటి పూత నివారణ చిట్కాలు', text: 'నోటి పూత (Mouth Ulcers) తగ్గడానికి తీసుకోవలసిన జాగ్రత్తలు ఏమిటి?' },
    { label: '🚭 చుట్ట / గుట్కా మానేయడం ఎలా?', text: 'చుట్ట (రివర్స్ స్మోకింగ్) మరియు గుట్కా అలవాటును ఎలా మానుకోవాలి?' },
    { label: '🌶️ కారం తిన్నప్పుడు నోరు మంట', text: 'కారం తిన్నప్పుడు నోరు తీవ్రంగా మండుతోంది, నోరు తెరవడం తగ్గినట్లుంది, ఏం చేయాలి?' },
    { label: '🏥 డాక్టర్‌ను ఎప్పుడు సంప్రదించాలి?', text: 'నోటిలో పుండ్లు లేదా మచ్చలు ఉన్నప్పుడు డాక్టర్‌ను తప్పనిసరిగా ఎప్పుడు సంప్రదించాలి?' }
  ] : [
    { label: '💡 Tips for Mouth Ulcers', text: 'What are safe home care tips for simple mouth ulcers or canker sores?' },
    { label: '🚭 Quitting Tobacco & Chutta', text: 'How can someone successfully quit chewing gutkha and reverse smoking (chutta)?' },
    { label: '🌶️ Burning Mouth with Spices', text: 'My mouth burns when eating spicy food and feels tight. What should I do?' },
    { label: '🏥 When to See a Doctor?', text: 'How do I know if an oral sore requires an in-person doctor examination?' }
  ];

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
        recognition.lang = isTe ? 'te-IN' : 'en-IN';

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
  }, [isTe]);

  // Initial welcome message
  useEffect(() => {
    const welcomeMsg: ChatMessage = {
      id: 0,
      session_id: sessionId,
      role: 'assistant',
      content: isTe
        ? 'నమస్కారం! నేను ఆరోగ్య మిత్ర (Aarogya Mitra) — మీ క్లినికల్ AI ఆరోగ్య సహాయకుడిని. నోటి పూత, తెల్లటి లేదా ఎర్రటి మచ్చలు, కారం తిన్నప్పుడు మంట లేదా పొగాకు/చుట్ట అలవాటు మానుకోవడంపై సందేహాలను మీరు ఇక్కడ అడగవచ్చు లేదా మాట్లాడవచ్చు.'
        : 'Hello! I am Aarogya Mitra — your clinical AI health companion. You can ask questions or speak about mouth sores, persistent patches, burning sensations, or strategies to quit tobacco and chutta habits.',
      language: currentLang,
      has_attachment: false,
      disclaimer: '',
      created_at: new Date().toISOString()
    };
    setMessages([welcomeMsg]);
  }, [currentLang, sessionId, isTe]);

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
        recognitionRef.current.lang = isTe ? 'te-IN' : 'en-IN';
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
    utterance.lang = isTe ? 'te-IN' : 'en-IN';
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
      content: isTe
        ? 'నమస్కారం! నేను ఆరోగ్య మిత్ర (Aarogya Mitra) — మీ క్లినికల్ AI ఆరోగ్య సహాయకుడిని. నోటి పూత, తెల్లటి లేదా ఎర్రటి మచ్చలు, కారం తిన్నప్పుడు మంట లేదా పొగాకు/చుట్ట అలవాటు మానుకోవడంపై సందేహాలను మీరు ఇక్కడ అడగవచ్చు లేదా మాట్లాడవచ్చు.'
        : 'Hello! I am Aarogya Mitra — your clinical AI health companion. You can ask questions or speak about mouth sores, persistent patches, burning sensations, or strategies to quit tobacco and chutta habits.',
      language: currentLang,
      has_attachment: false,
      disclaimer: '',
      created_at: new Date().toISOString()
    };
    setMessages([welcomeMsg]);
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
                {isTe ? 'ఆరోగ్య మిత్ర AI అసిస్టెంట్' : 'Arogya Mitra AI Assistant'}
              </h3>
              <span className="ai-badge-voice">
                <Radio size={11} style={{ animation: 'pulse 1.5s infinite' }} />
                {isTe ? 'వాయిస్ + చాట్' : 'Voice + Chatbot'}
              </span>
            </div>
            <p style={{ fontSize: '0.76rem', color: '#64748B', margin: '2px 0 0' }}>
              {isTe ? 'నోటి & ముఖ ఆరోగ్య సలహాదారు • సురక్షిత క్లినికల్ ట్రయేజ్' : 'Multilingual Clinical Doubts, Self-Care & Habit Cessation'}
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

                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {displayedText}
                </div>

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
            onClick={() => cameraInputRef.current?.click()}
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
            onClick={() => fileInputRef.current?.click()}
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
    </div>
  );
};
