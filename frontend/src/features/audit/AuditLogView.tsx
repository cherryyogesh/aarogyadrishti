import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, AuditEvent, User } from '../../types';
import { Shield, FileText, RefreshCw, Filter } from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
  user: User;
}

export const AuditLogView: React.FC<Props> = ({ currentLang, user }) => {
  const t = translations[currentLang] || translations.en;
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditEvents();
      setEvents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{t.nav_audit}</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
            Immutable security and transactional audit trail for district administrators.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={fetchAudit}>
          <RefreshCw size={16} /> Refresh Audit Trail
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>Loading audit logs...</div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748B' }}>No audit events recorded yet.</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>User / Actor</th>
                  <th>Target Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td style={{ fontSize: '0.78rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                      {new Date(e.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontWeight: 700 }}>
                        {e.action}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {e.user_name || 'System / Automated'}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: '#334155' }}>
                        {e.entity_type} {e.entity_id ? `(${e.entity_id})` : ''}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#475569', maxWidth: '350px' }}>
                      {e.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
