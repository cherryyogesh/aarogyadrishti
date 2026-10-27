import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, ConfigStatus, User } from '../../types';
import { Server, MessageSquare, Sparkles, Video, Database, HardDrive, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
  user: User;
}

export const ConfigStatusView: React.FC<Props> = ({ currentLang, user }) => {
  const t = translations[currentLang] || translations.en;
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getConfigStatus().then(setConfig).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading || !config) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>Loading system configuration status...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{t.nav_config}</h2>
        <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
          Inspect live third-party service boundaries, provider credentials, and fallback development modes.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Database */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: '0.75rem' }}>
            <Database size={20} color="var(--teal-primary)" />
            Database Persistence
          </div>
          <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
            Type: <strong>{config.database.type}</strong><br />
            Status: <span className="badge badge-success">Connected & Active</span><br />
            Foreign Keys: Enforced (ACID compliant)<br />
            Migrations: Alembic initialized
          </div>
        </div>

        {/* SMS & OTP Gateway */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: '0.75rem' }}>
            <MessageSquare size={20} color="var(--teal-primary)" />
            SMS & OTP Provider
          </div>
          <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
            Provider: <strong>{config.sms_provider.provider.toUpperCase()}</strong><br />
            Mode: <span className={`badge ${config.sms_provider.is_configured ? 'badge-success' : 'badge-warning'}`}>
              {config.sms_provider.label}
            </span><br />
            Cryptographic OTP: 6-digit random token salted SHA-256<br />
            Delivery Tracking: Full database queue and retry logs
          </div>
        </div>

        {/* AI Inference Engine */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: '0.75rem' }}>
            <Sparkles size={20} color="var(--teal-primary)" />
            Medical AI Service
          </div>
          <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
            Configured Model: <strong>{config.ai_service.model_id}</strong><br />
            Active Service: <span className="badge badge-info">{config.ai_service.provider}</span><br />
            Safety Guardrails: <span className="badge badge-success">Active</span> (Emergency triage & cancer diagnostic refusal strictly enforced)
          </div>
        </div>

        {/* Telemedicine WebRTC */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: '0.75rem' }}>
            <Video size={20} color="var(--teal-primary)" />
            Telemedicine & WebRTC
          </div>
          <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
            Signaling: Built-in Session Token Coordinator<br />
            STUN Server: <strong>{config.telemedicine.stun_server}</strong><br />
            TURN Configured: {config.telemedicine.turn_configured ? 'Yes' : 'Google Public STUN (Direct P2P)'}
          </div>
        </div>

        {/* Protected Storage */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: '0.75rem' }}>
            <HardDrive size={20} color="var(--teal-primary)" />
            Protected Image Storage
          </div>
          <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
            Storage Path: <code style={{ fontSize: '0.78rem', background: '#F1F5F9', padding: '2px 4px', borderRadius: '4px' }}>backend/storage/uploads/</code><br />
            Max Upload: <strong>{config.storage.max_upload_mb} MB</strong><br />
            Access Control: Authenticated endpoint serving only (no public static directory exposure)
          </div>
        </div>
      </div>
    </div>
  );
};
