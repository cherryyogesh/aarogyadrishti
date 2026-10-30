import React, { useState, useEffect } from 'react';
import { AppNotification, LanguageCode, User } from '../../types';
import { api } from '../../services/api';
import {
  Bell, BellRing, Check, CheckCheck, X, AlertTriangle,
  FileText, Users, Sparkles, Shield, Clock, ExternalLink, RefreshCw
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentLang: LanguageCode;
  user: User;
  notifications: AppNotification[];
  onMarkRead: (id?: string) => void;
  onClearAll: () => void;
  onNavigate: (route: string) => void;
  onRefresh: () => void;
}

export const NotificationDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  currentLang,
  user,
  notifications,
  onMarkRead,
  onClearAll,
  onNavigate,
  onRefresh,
}) => {
  const isTe = currentLang === 'te';
  const isHi = currentLang === 'hi';

  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const [requestingPerm, setRequestingPerm] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setDesktopPermission(Notification.permission);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Request browser desktop push permission
  const handleEnableDesktopNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert(isTe
        ? 'మీ బ్రౌజర్ డెస్క్‌టాప్ నోటిఫికేషన్లకు మద్దతు ఇవ్వదు.'
        : isHi
        ? 'आपका ब्राउज़र डेस्कटॉप सूचनाओं का समर्थन नहीं करता है।'
        : 'Your browser does not support desktop notifications.');
      return;
    }

    try {
      setRequestingPerm(true);
      const perm = await Notification.requestPermission();
      setDesktopPermission(perm);

      if (perm === 'granted') {
        new Notification(
          isTe ? 'ఆరోగ్య దృష్టి నోటిఫికేషన్లు ప్రారంభించబడ్డాయి!' : isHi ? 'आरोग्य दृष्टि सूचनाएं सक्रिय हैं!' : 'Aarogya Drishti Alerts Enabled!',
          {
            body: isTe
              ? 'మీకు తాజా స్క్రీనింగ్‌లు, డాక్టర్ క్యూ మరియు క్లినికల్ అప్‌డేట్లు క్రమం తప్పకుండా అందుతాయి.'
              : isHi
              ? 'आपको नई स्क्रीनिंग, डॉक्टर कतार और नैदानिक अपडेट नियमित रूप से प्राप्त होंगे।'
              : 'You will receive real-time notifications for screenings, doctor queues, and health alerts.',
            icon: '/assets/logo-192.png'
          }
        );
      }
    } catch (e) {
      console.error('Failed to request notification permission:', e);
    } finally {
      setRequestingPerm(false);
    }
  };

  // Test live notification
  const handleSendTestAlert = async () => {
    setTestingAlert(true);
    try {
      const testItem = await api.sendTestNotification();

      // Trigger native browser desktop notification if permission granted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const title = isTe ? testItem.title_te : isHi ? testItem.title_hi : testItem.title;
        const msg = isTe ? testItem.message_te : isHi ? testItem.message_hi : testItem.message;
        new Notification(title, {
          body: msg,
          icon: '/assets/logo-192.png'
        });
      }

      onRefresh();
    } catch (e) {
      console.error('Test notification failed:', e);
    } finally {
      setTestingAlert(false);
    }
  };

  const getLocalizedTitle = (n: AppNotification) => {
    if (isTe && n.title_te) return n.title_te;
    if (isHi && n.title_hi) return n.title_hi;
    return n.title;
  };

  const getLocalizedMessage = (n: AppNotification) => {
    if (isTe && n.message_te) return n.message_te;
    if (isHi && n.message_hi) return n.message_hi;
    return n.message;
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return <AlertTriangle size={18} color="#EF4444" />;
      case 'screening':
        return <FileText size={18} color="#0D9488" />;
      case 'queue':
        return <Users size={18} color="#2563EB" />;
      case 'advisory':
        return <Sparkles size={18} color="#7C3AED" />;
      default:
        return <Shield size={18} color="#0284C7" />;
    }
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'urgent':
        return { bg: '#FEE2E2', text: '#991B1B', label: isTe ? 'అత్యవసరం' : isHi ? 'अति आवश्यक' : 'URGENT' };
      case 'screening':
        return { bg: '#CCFBF1', text: '#0F766E', label: isTe ? 'స్క్రీనింగ్' : isHi ? 'स्क्रीनिंग' : 'SCREENING' };
      case 'queue':
        return { bg: '#DBEAFE', text: '#1E40AF', label: isTe ? 'డాక్టర్ క్యూ' : isHi ? 'डॉक्टर कतार' : 'QUEUE' };
      case 'advisory':
        return { bg: '#F3E8FF', text: '#6B21A8', label: isTe ? 'మార్గదర్శకం' : isHi ? 'सलाह' : 'ADVISORY' };
      default:
        return { bg: '#F1F5F9', text: '#475569', label: isTe ? 'సిస్టమ్' : isHi ? 'सिस्टम' : 'SYSTEM' };
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(3px)',
          zIndex: 998,
        }}
      />

      {/* Floating Notification Panel */}
      <div
        style={{
          position: 'fixed',
          top: '72px',
          right: 'clamp(1rem, 3vw, 2.5rem)',
          width: 'clamp(320px, 92vw, 440px)',
          maxHeight: 'calc(100vh - 96px)',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 20px 40px -8px rgba(15, 23, 42, 0.28), 0 0 0 1px rgba(15, 23, 42, 0.08)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeInSlide 0.2s ease-out'
        }}
      >
        {/* Panel Header */}
        <div style={{
          padding: '1.1rem 1.25rem',
          borderBottom: '1px solid #E2E8F0',
          background: 'linear-gradient(135deg, #024B5A 0%, #03515E 100%)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BellRing size={18} color="#5EEAD4" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>{isTe ? 'నోటిఫికేషన్లు & అప్‌డేట్లు' : isHi ? 'सूचनाएं एवं अपडेट' : 'Notifications & Alerts'}</span>
                {unreadCount > 0 && (
                  <span style={{
                    background: '#EF4444',
                    color: '#FFFFFF',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '0.1rem 0.45rem',
                    borderRadius: '12px'
                  }}>
                    {unreadCount} {isTe ? 'కొత్తవి' : isHi ? 'नए' : 'new'}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#99F6E4', marginTop: '0.1rem' }}>
                {user.full_name} • {user.phc_name || user.mandal || 'ASR District'}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: '#FFFFFF',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Desktop Push Notification Banner */}
        <div style={{
          padding: '0.85rem 1.15rem',
          background: desktopPermission === 'granted' ? '#ECFDF5' : '#FFFBEB',
          borderBottom: `1px solid ${desktopPermission === 'granted' ? '#A7F3D0' : '#FDE68A'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem'
        }}>
          <div style={{ fontSize: '0.76rem', color: desktopPermission === 'granted' ? '#065F46' : '#92400E', lineHeight: 1.4 }}>
            {desktopPermission === 'granted' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
                <Check size={14} color="#10B981" />
                <span>{isTe ? 'డెస్క్‌టాప్ హెచ్చరికలు సక్రియంగా ఉన్నాయి' : isHi ? 'डेस्कटॉप अलर्ट सक्रिय हैं' : 'Desktop Push Alerts Active'}</span>
              </div>
            ) : (
              <div>
                <span style={{ fontWeight: 700 }}>
                  {isTe ? 'డెస్క్‌టాప్ నోటిఫికేషన్లు ప్రారంభించండి:' : isHi ? 'डेस्कटॉप अलर्ट चालू करें:' : 'Enable Desktop Notifications:'}
                </span>{' '}
                {isTe ? 'కొత్త కేసులపై తక్షణ సందేశాలు పొందండి.' : isHi ? 'नए मामलों पर तुरंत सूचनाएं प्राप्त करें।' : 'Get instant alerts for new cases.'}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
            {desktopPermission !== 'granted' ? (
              <button
                type="button"
                onClick={handleEnableDesktopNotifications}
                disabled={requestingPerm}
                style={{
                  background: '#0D9488',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <Bell size={13} />
                <span>{requestingPerm ? (isTe ? 'అనుమతిస్తోంది...' : 'Enabling...') : (isTe ? 'ప్రారంభించు' : isHi ? 'चालू करें' : 'Enable')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSendTestAlert}
                disabled={testingAlert}
                style={{
                  background: '#FFFFFF',
                  color: '#065F46',
                  border: '1px solid #A7F3D0',
                  borderRadius: '8px',
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
                title="Send test desktop notification"
              >
                <RefreshCw size={11} className={testingAlert ? 'spin' : ''} />
                <span>{testingAlert ? (isTe ? 'పంపుతోంది...' : 'Testing...') : (isTe ? 'టెస్ట్ అలర్ట్' : isHi ? 'टेस्ट अलर्ट' : 'Test Alert')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Controls (Mark all read / Refresh) */}
        <div style={{
          padding: '0.55rem 1.15rem',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.74rem'
        }}>
          <button
            onClick={() => onMarkRead()}
            style={{
              background: 'none',
              border: 'none',
              color: '#0D9488',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <CheckCheck size={14} />
            <span>{isTe ? 'అన్నీ చదివినట్లు గుర్తించు' : isHi ? 'सभी पढ़े हुए चिह्नित करें' : 'Mark all as read'}</span>
          </button>

          <button
            onClick={onClearAll}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748B',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {isTe ? 'క్లియర్ చేయండి' : isHi ? 'हटाएं' : 'Clear all'}
          </button>
        </div>

        {/* Scrollable Notification List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.5rem 0',
          maxHeight: '440px'
        }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', color: '#64748B' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#F0FDFA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem',
                color: '#0D9488'
              }}>
                <Check size={22} />
              </div>
              <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.88rem' }}>
                {isTe ? 'కొత్త నోటిఫికేషన్లు లేవు' : isHi ? 'कोई नई सूचना नहीं है' : 'No new notifications'}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '0.2rem' }}>
                {isTe ? 'మీరు అన్ని తాజా కేసుల సమాచారంతో అప్‌డేట్ అయ్యారు.' : isHi ? 'आप सभी अपडेट के साथ अप-टू-डेट हैं।' : "You're all caught up with your healthcare tasks."}
              </div>
            </div>
          ) : (
            notifications.map((item) => {
              const badge = getBadgeStyle(item.type);
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onMarkRead(item.id);
                    if (item.target_route) {
                      onNavigate(item.target_route);
                      onClose();
                    }
                  }}
                  style={{
                    padding: '0.75rem 1.15rem',
                    borderBottom: '1px solid #F1F5F9',
                    backgroundColor: item.is_read ? '#FFFFFF' : '#F0FDFA',
                    cursor: item.target_route ? 'pointer' : 'default',
                    transition: 'background-color 0.15s ease',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = item.is_read ? '#F8FAFC' : '#E6FFFA';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = item.is_read ? '#FFFFFF' : '#F0FDFA';
                  }}
                >
                  {/* Unread dot */}
                  {!item.is_read && (
                    <span style={{
                      position: 'absolute',
                      top: '1rem',
                      left: '0.45rem',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#0D9488'
                    }} />
                  )}

                  {/* Icon */}
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    background: '#F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '0.1rem'
                  }}>
                    {renderIcon(item.type)}
                  </div>

                  {/* Text details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', marginBottom: '0.2rem' }}>
                      <span style={{
                        background: badge.bg,
                        color: badge.text,
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        padding: '0.1rem 0.35rem',
                        borderRadius: '4px',
                        letterSpacing: '0.03em'
                      }}>
                        {badge.label}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Clock size={10} />
                        {item.created_at}
                      </span>
                    </div>

                    <div style={{
                      fontSize: '0.82rem',
                      fontWeight: item.is_read ? 600 : 800,
                      color: item.is_read ? '#334155' : '#0F172A',
                      lineHeight: 1.3
                    }}>
                      {getLocalizedTitle(item)}
                    </div>

                    <div style={{
                      fontSize: '0.74rem',
                      color: '#64748B',
                      marginTop: '0.2rem',
                      lineHeight: 1.4
                    }}>
                      {getLocalizedMessage(item)}
                    </div>

                    {item.target_route && (
                      <div style={{
                        marginTop: '0.4rem',
                        fontSize: '0.7rem',
                        color: '#0D9488',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        <span>{isTe ? 'వివరాలు చూడండి' : isHi ? 'विवरण देखें' : 'View Action'}</span>
                        <ExternalLink size={10} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Panel Footer */}
        <div style={{
          padding: '0.65rem 1.15rem',
          borderTop: '1px solid #E2E8F0',
          background: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.7rem',
          color: '#64748B'
        }}>
          <span>{isTe ? 'ఆటో-సింక్ సక్రియం (ప్రతి 30 సెకన్లకు)' : isHi ? 'ऑटो-सिंक सक्रिय (हर 30 सेकंड)' : 'Auto-sync active (every 30s)'}</span>
          <button
            onClick={onRefresh}
            style={{
              background: 'none',
              border: 'none',
              color: '#0D9488',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <RefreshCw size={11} />
            <span>{isTe ? 'రిఫ్రెష్' : isHi ? 'रिफ्रेश' : 'Refresh'}</span>
          </button>
        </div>
      </div>
    </>
  );
};

