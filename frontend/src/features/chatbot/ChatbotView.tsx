import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, ChatMessage, ImageUploadResponse } from '../../types';
import {
  Plus, Send, Camera, Image as ImageIcon, X, AlertTriangle,
  Copy, RefreshCw, ShieldAlert, Sparkles, Check
} from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
}

export const ChatbotView: React.FC<Props> = ({ currentLang }) => {
  const t = translations[currentLang] || translations.en;
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Initial welcome message
    const welcomeMsg: ChatMessage = {
      id: 0,
      session_id: sessionId,
      role: 'assistant',
      content: currentLang === 'te'
        ? 'నమస్కారం! నేను ఆరోగ్య దృష్టి మెడికల్ AI సహాయకుడిని. మీరు మీ సాధారణ ఆరోగ్య సమస్యలు లేదా కనిపించే చర్మ, నోటి లక్షణాల గురించి అడగవచ్చు. ఫోటోను జతచేయడానికి (+) బటన్ నొక్కండి.'
        : currentLang === 'hi'
        ? 'नमस्ते! मैं आरोग्य दृष्टि मेडिकल एआई सहायक हूँ। आप अपने स्वास्थ्य संबंधी प्रश्न पूछ सकते हैं या त्वचा/मुंह के लक्षणों की फोटो जोड़ सकते हैं।'
        : 'Hello! I am Aarogya Drishti Medical AI Assistant. You can ask general health questions or share visible skin/oral concerns. Tap (+) to attach an image for non-diagnostic guidance.',
      language: currentLang,
      has_attachment: false,
      disclaimer: t.chat_disclaimer,
      created_at: new Date().toISOString()
    };
    setMessages([welcomeMsg]);
  }, [currentLang, sessionId]);

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedImage) return;

    const userText = inputText.trim() || 'Attached photograph for review.';
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
        attachment_image_id: imageIdToSend
      });
      setMessages((prev) => [...prev, response]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: Date.now() + 1,
        session_id: sessionId,
        role: 'assistant',
        content: 'Error: ' + (err.message || 'Unable to generate response. Please try again.'),
        language: currentLang,
        has_attachment: false,
        disclaimer: t.chat_disclaimer,
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="chat-container">
      {/* Medical Disclaimer Alert Banner */}
      <div className="chat-disclaimer-box">
        <ShieldAlert size={16} style={{ flexShrink: 0 }} />
        <span>{t.chat_disclaimer}</span>
      </div>

      {/* Hidden File Inputs */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Message History */}
      <div className="chat-messages">
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble ${m.role}`}>
            {m.has_attachment && m.attachment_preview_url && (
              <div style={{ marginBottom: '0.65rem' }}>
                <img
                  src={m.attachment_preview_url}
                  alt="Attachment Preview"
                  style={{
                    maxHeight: '180px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    display: 'block'
                  }}
                />
              </div>
            )}

            {m.warning_flag === 'EMERGENCY_RED_FLAG' && (
              <div style={{
                background: '#FEE2E2',
                border: '1px solid #F87171',
                color: '#991B1B',
                padding: '0.65rem',
                borderRadius: '8px',
                marginBottom: '0.65rem',
                fontWeight: 700,
                fontSize: '0.84rem'
              }}>
                <AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                EMERGENCY ALERT: Immediate Hospital Care Required!
              </div>
            )}

            <div style={{ whiteSpace: 'pre-line' }}>{m.content}</div>

            {m.role === 'assistant' && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '0.65rem',
                paddingTop: '0.5rem',
                borderTop: '1px solid #E2E8F0',
                fontSize: '0.72rem',
                color: '#64748B'
              }}>
                <span>Non-Diagnostic Triage</span>
                <button
                  onClick={() => handleCopy(m.content, m.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px' }}
                >
                  {copiedId === m.id ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                  {copiedId === m.id ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="chat-bubble assistant" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={16} color="var(--teal-primary)" />
            <span>Analyzing symptoms with clinical guardrails...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Preview Box (if attached before send) */}
      {attachedImage && (
        <div style={{
          padding: '0.5rem 1.25rem',
          background: '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img
              src={attachedImage.preview_url}
              alt="Attachment"
              style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }}
            />
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Image Ready for Triage</div>
              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                OpenCV Quality: {attachedImage.quality.quality_state}
              </div>
            </div>
          </div>
          <button
            onClick={() => setAttachedImage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}
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
            <Camera size={16} color="var(--teal-primary)" /> Take Photo
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
            <ImageIcon size={16} color="var(--teal-primary)" /> Choose from Gallery
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
          style={{ minHeight: '44px', padding: '0 1.25rem' }}
          disabled={loading || uploadingAttachment || (!inputText.trim() && !attachedImage)}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
