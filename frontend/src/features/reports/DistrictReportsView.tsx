import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, DistrictAnalytics, User } from '../../types';
import { BarChart3, Activity, Clock, UserCheck, MessageSquare, Shield, CheckCircle } from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
  user: User;
}

export const DistrictReportsView: React.FC<Props> = ({ currentLang, user }) => {
  const t = translations[currentLang] || translations.en;
  const [analytics, setAnalytics] = useState<DistrictAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDistrictAnalytics().then(setAnalytics).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading || !analytics) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>Calculating district metrics from database...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{t.nav_reports}</h2>
        <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
          District aggregate operational data, screening volume, arrival rates, and wait times.
        </p>
      </div>

      {/* Aggregate Cards */}
      <div className="grid-cards">
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#E0F2FE', color: '#0369A1' }}>
            <Activity size={26} />
          </div>
          <div>
            <div className="metric-val">{analytics.total_screenings}</div>
            <div className="metric-label">Total Screenings Recorded</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
            <UserCheck size={26} />
          </div>
          <div>
            <div className="metric-val">{analytics.verified_arrivals_count}</div>
            <div className="metric-label">Verified Arrivals via OTP</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            <Clock size={26} />
          </div>
          <div>
            <div className="metric-val">{analytics.average_wait_duration_minutes}m</div>
            <div className="metric-label">Average Patient Wait Duration</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#F3E8FF', color: '#7E22CE' }}>
            <MessageSquare size={26} />
          </div>
          <div>
            <div className="metric-val">{analytics.sms_delivery_rate_percent}%</div>
            <div className="metric-label">SMS Delivery Queue Rate</div>
          </div>
        </div>
      </div>

      {/* Screenings by Category Distribution */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div className="card-title" style={{ marginBottom: '1.25rem' }}>
          <BarChart3 size={20} color="var(--teal-primary)" />
          Screening Distribution by Visible Body Category
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {Object.entries(analytics.screenings_by_category).map(([cat, count]) => (
            <div key={cat} style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>
                {cat}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--teal-primary)', marginTop: '0.3rem' }}>
                {count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Infrastructure & Service Health Card */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: '1rem' }}>
          <Shield size={18} color="var(--teal-primary)" />
          System Operational Compliance & Privacy
        </div>
        <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
          • <strong>AI Engine:</strong> {analytics.ai_service_status}<br />
          • <strong>Data Redaction:</strong> Non-administrative views strictly mask patient phone numbers (`+91 ******1234`).<br />
          • <strong>OTP Cryptography:</strong> Salted SHA-256 tokens; zero plaintext storage.<br />
          • <strong>Audit Trail:</strong> Every status transition and clinical note is immutably timestamped.
        </div>
      </div>
    </div>
  );
};
