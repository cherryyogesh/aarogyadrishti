import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, ChatMessage, ImageUploadResponse } from '../../types';
import {
  Plus, Send, Camera, Image as ImageIcon, X, AlertTriangle,
  Copy, RefreshCw, ShieldAlert, Sparkles, Check, HelpCircle
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

  useEffect(() => {
    // Initial welcome message
    const welcomeMsg: ChatMessage = {
      id: 0,
      session_id: sessionId,
      role: 'assistant',
      content: isTe
        ? 'నమస్కారం! నేను ఆరోగ్య మిత్ర (Aarogya Mitra) — మీ ఉచిత ఆరోగ్య సందేహాల నివృత్తి AI సహాయకుడిని. నోటి పూత, పుండ్లు, చిగుళ్ల సమస్యలు లేదా పొగాకు/చుట్ట మానేయడం వంటి చిన్న చిన్న సందేహాలపై మీరు నన్ను అడగవచ్చు. నేను తగిన స్పష్టతనిస్తాను. నేను వైద్య నిర్ధారణ (డయాగ్నోసిస్) చేయను లేదా క్యాన్సర్‌ను నిర్ధారించను.'
        : 'Hello! I am Aarogya Mitra — your free healthcare assistant. You can ask me everyday oral health questions, home care tips for simple sores, or guidance on quitting tobacco/chutta. I provide rational clarity without needing to rush to the doctor for minor issues. Note: I cannot diagnose cancer or replace an in-person doctor examination.',
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
    } catch (err: any) {
      const fallbackAsstMsg: ChatMessage = {
        id: Date.now() + 1,
        session_id: sessionId,
        role: 'assistant',
        content: isTe
          ? 'క్షమించండి, సర్వర్ స్పందించడంలో ఆలస్యమైంది. ప్రాథమిక సలహా: నోటి పూతకు గోరువెచ్చని ఉప్పునీటి పుక్కిలింత సహాయపడుతుంది. పుండు 14 రోజుల కంటే ఎక్కువ రోజులు తగ్గకపోతే దయచేసి PHC డాక్టర్‌ను సంప్రదించండి.'
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

      {/* Chat Header */}
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
              {t.chat_title}
              <span style={{ fontSize: '0.65rem', background: '#DCFCE7', color: '#166534', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                {isTe ? 'ఉచిత ఆరోగ్య సలహా' : 'Free AI Health Guide'}
              </span>
            </h3>
            <p style={{ fontSize: '0.76rem', color: '#64748B' }}>
              {t.chat_subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Mandatory Non-Diagnostic Disclaimer Banner */}
      <div className="chat-disclaimer-banner">
        <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#D97706' }} />
        <span>{t.chat_disclaimer}</span>
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

                {/* Assistant Footer Actions (Copy & Disclaimer) */}
                {!isUser && (
                  <div className="message-action-bar">
                    <button
                      className="message-action-btn"
                      onClick={() => handleCopyMessage(m.id, m.content)}
                      title="Copy advice text"
                    >
                      {copiedId === m.id ? (
                        <>
                          <Check size={12} color="#10B981" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copy
                        </>
                      )}
                    </button>
                    {m.disclaimer && (
                      <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontStyle: 'italic', marginLeft: 'auto' }}>
                        Non-clinical guidance
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="chat-message-row assistant-row">
            <div className="chat-bubble chat-bubble-assistant" style={{ fontStyle: 'italic', color: '#64748B' }}>
              <RefreshCw size={14} className="spin" style={{ display: 'inline', marginRight: '6px' }} />
              {isTe ? 'ఆరోగ్య మిత్ర ఆలోచిస్తోంది...' : 'Aarogya Mitra is analyzing your query...'}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Carousel for Instant Answers */}
      <div style={{
        padding: '0.5rem 1rem 0.25rem',
        display: 'flex',
        gap: '0.45rem',
        overflowX: 'auto',
        background: '#F8FAFC',
        borderTop: '1px solid #E2E8F0'
      }}>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleQuickPromptClick(p.text)}
            disabled={loading}
            style={{
              whiteSpace: 'nowrap',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '16px',
              padding: '0.3rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#0F766E',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              transition: 'all 0.15s ease'
            }}
          >
            <HelpCircle size={12} color="#0D9488" />
            {p.label}
          </button>
        ))}
      </div>

      {/* Attachment Staging Strip */}
      {attachedImage && (
        <div className="attachment-staging-strip">
          <img
            src={attachedImage.preview_url}
            alt="Staged Attachment"
            style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {attachedImage.original_filename}
            </div>
            <div style={{ fontSize: '0.72rem', color: attachedImage.quality.quality_state === 'poor' ? '#DC2626' : '#166534' }}>
              Quality: {attachedImage.quality.quality_state} • Blur: {attachedImage.quality.blur_score}
            </div>
          </div>
          <button
            type="button"
            className="btn-icon"
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

      {/* Bottom Composer */}
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
          placeholder={t.chat_input_placeholder}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={loading || uploadingAttachment}
          style={{ flex: 1 }}
        />

        <button
          type="submit"
          className="btn btn-primary"
          style={{ minHeight: '44px', padding: '0 1.25rem', fontWeight: 700 }}
          disabled={loading || uploadingAttachment || (!inputText.trim() && !attachedImage)}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
