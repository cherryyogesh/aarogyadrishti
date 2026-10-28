import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, ChatMessage, ImageUploadResponse } from '../../types';
import {
  Plus, Send, Camera, Image as ImageIcon, X, AlertTriangle,
  Copy, RefreshCw, ShieldAlert, Sparkles, Check, HelpCircle,
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

  const quickPrompts = isTe ? [
    { label: 'నోటి పూత తగ్గడానికి చిట్కాలు', text: 'నోటి పూత (Mouth Ulcers) తగ్గడానికి తీసుకోవలసిన జాగ్రత్తలు ఏమిటి?' },
    { label: 'చుట్ట / గుట్కా మానేయడం ఎలా?', text: 'చుట్ట (రివర్స్ స్మోకింగ్) మరియు గుట్కా అలవాటును ఎలా మానుకోవాలి?' },
    { label: 'కారం తిన్నప్పుడు నోరు మంట', text: 'కారం తిన్నప్పుడు నోరు తీవ్రంగా మండుతోంది, నోరు తెరవడం తగ్గినట్లుంది, ఏం చేయాలి?' },
    { label: 'డాక్టర్‌ను ఎప్పుడు కలవాలి?', text: 'నోటిలో పుండ్లు లేదా మచ్చలు ఉన్నప్పుడు డాక్టర్‌ను తప్పనిసరిగా ఎప్పుడు సంప్రదించాలి?' }
  ] : [
    { label: 'Tips for Mouth Ulcers', text: 'What are safe home care tips for simple mouth ulcers or canker sores?' },
    { label: 'Quitting Tobacco & Chutta', text: 'How can someone successfully quit chewing gutkha and reverse smoking (chutta)?' },
    { label: 'Burning Mouth with Spices', text: 'My mouth burns when eating spicy food and feels tight. What should I do?' },
    { label: 'When to See a Doctor?', text: 'How do I know if an oral sore requires an in-person doctor examination?' }
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
        ? 'నమస్కారం! నేను ఆరోగ్య మిత్ర (Aarogya Mitra) — మీ వాయిస్ మరియు చాట్‌బాట్ ఆరోగ్య సహాయకుడిని. నోటి పూత, తెల్లటి మచ్చలు, కారం తిన్నప్పుడు మంట లేదా పొగాకు/చుట్ట అలవాటు మానేయడంపై మీరు నాతో మాట్లాడవచ్చు లేదా టైప్ చేయవచ్చు.\n\n⚠️ ముఖ్య గమనిక: నేను వైద్య నిర్ధారణ (డయాగ్నోసిస్) చేయను మరియు క్యాన్సర్‌ను ఎప్పటికీ నిర్ధారించను. అనుమానాస్పద లేదా 14 రోజుల కంటే ఎక్కువ కాలం ఉండే లక్షణాలకు సమీప PHC డాక్టర్‌ను సంప్రదించడం తప్పనిసరి.'
        : 'Hello! I am Aarogya Mitra — your voice and chatbot health assistant. You can speak or type oral health doubts, sore care, or tobacco habit cessation.\n\n⚠️ Essential Medical Guardrail: I provide educational guidance and NEVER diagnose or confirm cancer. For any persistent patch (>14 days), an in-person doctor evaluation is strictly mandatory.',
      language: currentLang,
      has_attachment: false,
      disclaimer: t.chat_disclaimer,
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

      {/* Chat Header with Voice Assistance Controls */}
      <div className="chat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0D9488 0%, #06B6D4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF'
          }}>
            <Sparkles size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {isTe ? 'ఆరోగ్య మిత్ర AI సహాయకుడు' : 'Arogya Mitra AI Assistant'}
              <span style={{ fontSize: '0.65rem', background: '#DCFCE7', color: '#166534', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                {isTe ? 'వాయిస్ + చాట్‌బాట్' : 'Voice + Chatbot'}
              </span>
            </h3>
            <p style={{ fontSize: '0.76rem', color: '#64748B' }}>
              {isTe ? 'ఉచిత ఆరోగ్య సలహా • స్వదేశీ జ్ఞానంతో సురక్షిత మార్గదర్శకత్వం' : 'Free Clinical AI Assistant • Voice Enabled & Safe Triage'}
            </p>
          </div>
        </div>

        {/* Voice Auto-Speak Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              minHeight: '32px',
              padding: '0.2rem 0.6rem',
              fontSize: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: autoSpeak ? '#ECFDF5' : '#F8FAFC',
              borderColor: autoSpeak ? '#10B981' : '#CBD5E1',
              color: autoSpeak ? '#065F46' : '#475569'
            }}
            onClick={() => setAutoSpeak(!autoSpeak)}
            title="Automatically read aloud AI responses using Speech Synthesis"
          >
            <Volume2 size={14} color={autoSpeak ? '#059669' : '#64748B'} />
            {autoSpeak
              ? (isTe ? 'వాయిస్ మోడ్: ఆన్‌లో ఉంది' : 'Auto-Speak: ON')
              : (isTe ? 'వాయిస్ మోడ్' : 'Auto-Speak')}
          </button>
        </div>
      </div>

      {/* Mandatory Non-Diagnostic Disclaimer Banner */}
      <div className="chat-disclaimer-banner">
        <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#D97706' }} />
        <span>
          {isTe
            ? 'ముఖ్య గమనిక: ఆరోగ్య మిత్ర AI ఎట్టి పరిస్థితుల్లోనూ క్యాన్సర్‌ను నిర్ధారించదు. లక్షణాలు 14 రోజుల కంటే ఎక్కువ కొనసాగితే లేదా అనుమానాస్పదంగా ఉంటే PHC డాక్టర్‌ను సంప్రదించడం మరియు బయాప్సీ తప్పనిసరి.'
            : 'Crucial Medical Boundary: Arogya Mitra AI NEVER diagnoses or confirms cancer. If symptoms last >14 days or appear suspicious, an in-person doctor evaluation and punch biopsy are mandatory.'}
        </span>
      </div>

      {/* Messages Scroll Viewport */}
      <div className="chat-messages-viewport">
        {messages.map((m) => {
          const isUser = m.role === 'user';
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
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                  {m.content}
                </div>

                {/* Assistant Footer Actions (Voice Readout & Copy) */}
                {!isUser && (
                  <div className="message-action-bar" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '0.45rem' }}>
                    <button
                      className="message-action-btn"
                      onClick={() => speakText(m.id, m.content)}
                      title={speakingMsgId === m.id ? 'Stop speaking' : 'Listen via voice'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: speakingMsgId === m.id ? '#DCFCE7' : '#F1F5F9',
                        color: speakingMsgId === m.id ? '#166534' : '#0D9488',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {speakingMsgId === m.id ? <VolumeX size={13} /> : <Volume2 size={13} />}
                      <span>{speakingMsgId === m.id ? (isTe ? 'మాట్లాడుతోంది...' : 'Speaking...') : (isTe ? 'వినండి' : 'Listen')}</span>
                    </button>

                    <button
                      className="message-action-btn"
                      onClick={() => handleCopyMessage(m.id, m.content)}
                      title="Copy advice text"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#F1F5F9',
                        color: '#64748B',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        border: 'none',
                        cursor: 'pointer'
                      }}
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
      <form onSubmit={handleSend} className="chat-composer" style={{ position: 'relative' }}>
        {/* Plus Button */}
        <button
          type="button"
          className="chat-plus-btn"
          title="Attach Image (+)"
          onClick={() => setShowPlusMenu(!showPlusMenu)}
        >
          <Plus size={22} />
        </button>

        <input
          type="text"
          className="form-control"
          placeholder={isListening ? (isTe ? 'వాయిస్ రికార్డ్ అవుతోంది...' : 'Transcribing voice...') : t.chat_input_placeholder}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={loading || uploadingAttachment}
          style={{ flex: 1 }}
        />

        {/* Microphone Button (Speech-to-Text) */}
        <button
          type="button"
          onClick={toggleListening}
          style={{
            background: isListening ? '#DC2626' : '#F1F5F9',
            color: isListening ? '#FFFFFF' : '#0D9488',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            width: '42px',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0
          }}
          title={isListening ? 'Stop listening' : 'Speak your question (Voice Input)'}
        >
          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Send Button */}
        <button
          type="submit"
          className="btn btn-primary"
          style={{ minHeight: '42px', padding: '0 1.25rem', fontWeight: 700 }}
          disabled={loading || uploadingAttachment || (!inputText.trim() && !attachedImage)}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
