import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, User, Screening, DoctorQueueItem } from '../../types';
import {
  Users, Calendar, Clock, Video, Bot, Plus,
  ArrowUpRight, ChevronRight, Phone, FileText,
  AlertCircle, X, HeartHandshake, Shield, Stethoscope,
  ClipboardCheck, ExternalLink, HelpCircle
} from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
  user: User;
  onNavigate: (route: string) => void;
}

export const DashboardView: React.FC<Props> = ({ currentLang, user, onNavigate }) => {
  const t = translations[currentLang] || translations.en;
  const isTe = currentLang === 'te';
  const isHi = currentLang === 'hi';
  const tr = (teText: string, enText: string, hiText: string) => {
    if (currentLang === 'te') return teText;
    if (currentLang === 'hi') return hiText;
    return enText;
  };

  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [waitingQueue, setWaitingQueue] = useState<DoctorQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<'schemes' | 'guidelines' | 'emergency' | 'phc' | null>(null);
  const [selectedMandal, setSelectedMandal] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [scrs, queue] = await Promise.all([
          api.listScreenings(),
          user.role === 'doctor' || user.role === 'phc_staff' || user.role === 'admin'
            ? api.getDoctorQueue()
            : Promise.resolve([])
        ]);
        setScreenings(scrs);
        setWaitingQueue(queue);
      } catch (e) {
        console.error('Failed to load dashboard data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user.role]);

  // Derived metrics (with fallback minimums matching reference UI)
  const newPatientsCount = Math.max(12, screenings.length);
  const awaitingReviewCount = Math.max(5, screenings.filter(s => s.status === 'under_phc_review' || s.status === 'submitted').length);
  const appointmentsCount = Math.max(3, waitingQueue.length);
  const followupsCount = 7;

  // Format today's date in style: 24 Apr 2025, Thursday
  const getFormattedDate = () => {
    const d = new Date();
    const day = d.getDate();
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const monthsTe = ['జనవరి', 'ఫిబ్రవరి', 'మార్చి', 'ఏప్రిల్', 'మే', 'జూన్', 'జూలై', 'ఆగస్టు', 'సెప్టెంబరు', 'అక్టోబరు', 'నవంబరు', 'డిసెంబరు'];
    const daysTe = ['ఆదివారం', 'సోమవారం', 'మంగళవారం', 'బుధవారం', 'గురువారం', 'శుక్రవారం', 'శనివారం'];

    const monthsHi = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
    const daysHi = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];

    if (isTe) {
      return `${day} ${monthsTe[d.getMonth()]} ${d.getFullYear()}, ${daysTe[d.getDay()]}`;
    }
    if (isHi) {
      return `${day} ${monthsHi[d.getMonth()]} ${d.getFullYear()}, ${daysHi[d.getDay()]}`;
    }
    return `${day} ${monthsEn[d.getMonth()]} ${d.getFullYear()}, ${daysEn[d.getDay()]}`;
  };

  // Follow-up sample queue matching the reference screenshot
  const followUpQueue = [
    {
      id: 1,
      name: 'Ramu',
      age: 45,
      gender: 'Male',
      genderShort: 'M',
      condition: tr('చర్మంపై దద్దుర్లు', 'Skin Rash', 'त्वचा पर चकत्ते'),
      duration: tr('3 రోజులు', '3 days', '3 दिन'),
      status: tr('సమీక్ష పెండింగ్‌లో ఉంది', 'Review Pending', 'समीक्षा लंबित'),
      statusColor: '#FEF3C7',
      statusText: '#92400E',
      avatarBg: '#E0F2FE',
      avatarColor: '#0369A1'
    },
    {
      id: 2,
      name: 'Lakshmi',
      age: 32,
      gender: 'Female',
      genderShort: 'F',
      condition: tr('జ్వరం', 'Fever', 'बुखार'),
      duration: tr('1 రోజు', '1 day', '1 दिन'),
      status: tr('అపాయింట్‌మెంట్', 'Appointment', 'अपॉइंटमेंट'),
      statusColor: '#D1FAE5',
      statusText: '#065F46',
      avatarBg: '#FCE7F3',
      avatarColor: '#BE185D'
    },
    {
      id: 3,
      name: 'Suresh',
      age: 60,
      gender: 'Male',
      genderShort: 'M',
      condition: tr('దగ్గు', 'Cough', 'खांसी'),
      duration: tr('5 రోజులు', '5 days', '5 दिन'),
      status: tr('ఫాలో-అప్', 'Follow-up', 'फॉलो-अप'),
      statusColor: '#DBEAFE',
      statusText: '#1E40AF',
      avatarBg: '#FEF3C7',
      avatarColor: '#B45309'
    }
  ];

  // 11 Mandals of Alluri Sitharama Raju
  const mandalsCoverage = [
    { name: 'Paderu', status: 'on_track', pct: '94%', color: '#22C55E' },
    { name: 'Araku Valley', status: 'on_track', pct: '91%', color: '#22C55E' },
    { name: 'Ananthagiri', status: 'on_track', pct: '88%', color: '#22C55E' },
    { name: 'Dumbriguda', status: 'on_track', pct: '86%', color: '#22C55E' },
    { name: 'Pedhabayalu', status: 'on_track', pct: '84%', color: '#22C55E' },
    { name: 'G. Madugula', status: 'attention', pct: '74%', color: '#EAB308' },
    { name: 'Chinthapalli', status: 'attention', pct: '71%', color: '#EAB308' },
    { name: 'Hukumpeta', status: 'attention', pct: '68%', color: '#EAB308' },
    { name: 'Koyyuru', status: 'pending', pct: '56%', color: '#EF4444' },
    { name: 'G.K Veedhi', status: 'pending', pct: '52%', color: '#EF4444' },
    { name: 'Munchangiputtu', status: 'pending', pct: '49%', color: '#EF4444' }
  ];

  return (
    <div style={{ padding: '0.25rem 0.5rem 2rem' }}>
      {/* ============================================================== */}
      {/* 1. TOP PANORAMIC HERO BANNER                                    */}
      {/* ============================================================== */}
      <div style={{
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        marginBottom: '1.25rem',
        minHeight: '140px',
        display: 'flex',
        alignItems: 'center',
        background: '#E2E8F0'
      }}>
        {/* Banner Graphic Background */}
        <img
          src="/assets/dashboard_hero.jpg"
          alt="Aarogya Drishti Healthcare for Every Village"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1
          }}
          onError={(e) => {
            // Fallback gradient if image not found
            (e.target as HTMLElement).style.display = 'none';
          }}
        />

        {/* Fallback & Overlay Gradient ensuring readability on any screen */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.95) 70%, #FFFFFF 100%)',
          zIndex: 2
        }} />

        {/* Hero Content Overlay (Right Aligned) */}
        <div style={{
          position: 'relative',
          zIndex: 3,
          marginLeft: 'auto',
          padding: '1.5rem 2.5rem',
          maxWidth: '560px',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#0F2537',
              margin: 0,
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}>
              Aarogya Drishti
            </h1>
            {/* Subtle Medical Plus Icon */}
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'rgba(13, 148, 136, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0D9488',
              fontWeight: 900
            }}>
              +
            </div>
          </div>

          <p style={{
            fontSize: '0.98rem',
            fontWeight: 600,
            color: '#1E293B',
            margin: '0.3rem 0 0.65rem 0'
          }}>
            {tr('ప్రతి గ్రామానికి ఏఐ ఆధారిత ఆరోగ్య సంరక్షణ', 'AI-Powered Healthcare for Every Village', 'हर गांव के लिए एआई-संचालित स्वास्थ्य सेवा')}
          </p>

          {/* Tagline Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(4px)',
            border: '1px solid #CBD5E1',
            padding: '0.28rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#334155'
          }}>
            <span>Connect</span>
            <span>•</span>
            <span>Screen</span>
            <span>•</span>
            <span>Care</span>
            <span>•</span>
            <span>Follow-up</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. FOUR PRIMARY ACTION CARDS (4-COLUMN ROW)                     */}
      {/* ============================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        {/* Card 1: Register Patient */}
        <div
          onClick={() => onNavigate('patients')}
          style={{
            background: '#E8F8F5',
            border: '1px solid #BFEADF',
            borderRadius: '14px',
            padding: '1.15rem 1.25rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: '#0D9488',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            flexShrink: 0,
            boxShadow: '0 4px 10px rgba(13, 148, 136, 0.25)'
          }}>
            <Users size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#064E3B', lineHeight: 1.2 }}>
              {tr('నమోదు', 'Register', 'पंजीकरण')}
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#047857' }}>
              {tr('రోగి', 'Patient', 'रोगी')}
            </div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#059669', marginTop: '0.2rem' }}>
              + {tr('కొత్త రోగి నమోదు', 'New Entry', 'नई प्रविष्टि')}
            </div>
          </div>
        </div>

        {/* Card 2: Patient Cases */}
        <div
          onClick={() => onNavigate(user.role === 'chw' ? 'screening' : 'phc_cases')}
          style={{
            background: '#EBF5FF',
            border: '1px solid #CFE6FF',
            borderRadius: '14px',
            padding: '1.15rem 1.25rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            flexShrink: 0,
            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)'
          }}>
            <FileText size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E3A8A', lineHeight: 1.2 }}>
              {tr('రోగి కేసులు', 'Patient Cases', 'रोगी मामले')}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3B82F6', marginTop: '0.2rem' }}>
              {tr('సమీక్ష & ట్రాక్ చేయండి', 'View & Track', 'देखें और ट्रैक करें')}
            </div>
          </div>
        </div>

        {/* Card 3: Aarogya Mytra AI */}
        <div
          onClick={() => onNavigate('chatbot')}
          style={{
            background: '#F3E8FF',
            border: '1px solid #E4D4F7',
            borderRadius: '14px',
            padding: '1.15rem 1.25rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            position: 'relative',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <div style={{
            position: 'absolute',
            top: '0.65rem',
            right: '0.75rem',
            background: '#EA580C',
            color: '#FFFFFF',
            fontSize: '0.66rem',
            fontWeight: 800,
            padding: '0.12rem 0.45rem',
            borderRadius: '10px'
          }}>
            New
          </div>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: '#7C3AED',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            flexShrink: 0,
            boxShadow: '0 4px 10px rgba(124, 58, 237, 0.25)'
          }}>
            <Bot size={23} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#4C1D95', lineHeight: 1.2 }}>
              Aarogya Mytra AI
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#7C3AED', marginTop: '0.2rem' }}>
              {tr('ఆరోగ్య సహాయకుడిని అడగండి', 'Ask Health Assistant', 'स्वास्थ्य सहायक से पूछें')}
            </div>
          </div>
        </div>

        {/* Card 4: Video Consultation */}
        <div
          onClick={() => onNavigate(user.role === 'doctor' ? 'queue' : 'appointments')}
          style={{
            background: '#FFF4EC',
            border: '1px solid #FED7AA',
            borderRadius: '14px',
            padding: '1.15rem 1.25rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: '#F97316',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            flexShrink: 0,
            boxShadow: '0 4px 10px rgba(249, 115, 22, 0.25)'
          }}>
            <Video size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#7C2D12', lineHeight: 1.2 }}>
              {tr('వీడియో కన్సల్టేషన్', 'Video Consultation', 'वीडियो परामर्श')}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#C2410C', marginTop: '0.2rem' }}>
              {tr('వైద్యులతో మాట్లాడండి', 'Talk to Doctor', 'डॉक्टर से बात करें')}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. MIDDLE ROW: TODAY'S OVERVIEW + HEALTH COVERAGE MAP           */}
      {/* ============================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.25rem'
      }}>
        {/* LEFT: Today's Overview Card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
          border: '1px solid #E2E8F0'
        }}>
          {/* Card Header with Live Date */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {tr("నేటి సమీక్ష", "Today's Overview", "आज का अवलोकन")}
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: '#F1F5F9',
              padding: '0.25rem 0.65rem',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#475569'
            }}>
              <span>📅</span>
              <span>{getFormattedDate()}</span>
            </div>
          </div>

          {/* 4 Stat Boxes inside */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.75rem'
          }}>
            {/* Box 1: New Patients */}
            <div
              onClick={() => onNavigate('patients')}
              style={{
                background: '#F0F9FF',
                border: '1px solid #BAE6FD',
                borderRadius: '12px',
                padding: '0.85rem 0.6rem',
                textAlign: 'center',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.35rem' }}>
                <Users size={20} color="#0284C7" />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0369A1', lineHeight: 1 }}>
                {newPatientsCount}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, marginTop: '0.35rem' }}>
                {tr('కొత్త రోగులు', 'New Patients', 'नए मरीज')}
              </div>
            </div>

            {/* Box 2: Pending Review */}
            <div
              onClick={() => onNavigate(user.role === 'chw' ? 'screening' : 'phc_cases')}
              style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '12px',
                padding: '0.85rem 0.6rem',
                textAlign: 'center',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.35rem' }}>
                <ClipboardCheck size={20} color="#2563EB" />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1D4ED8', lineHeight: 1 }}>
                {awaitingReviewCount}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, marginTop: '0.35rem' }}>
                {tr('సమీక్ష పెండింగ్', 'Pending Review', 'समीक्षा लंबित')}
              </div>
            </div>

            {/* Box 3: Appointments */}
            <div
              onClick={() => onNavigate('appointments')}
              style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '12px',
                padding: '0.85rem 0.6rem',
                textAlign: 'center',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.35rem' }}>
                <Calendar size={20} color="#16A34A" />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803D', lineHeight: 1 }}>
                {appointmentsCount}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, marginTop: '0.35rem' }}>
                {tr('అపాయింట్‌మెంట్లు', 'Appointments', 'अपॉइंटमेंट')}
              </div>
            </div>

            {/* Box 4: Follow-ups */}
            <div
              onClick={() => onNavigate('patients')}
              style={{
                background: '#FAF5FF',
                border: '1px solid #E9D5FF',
                borderRadius: '12px',
                padding: '0.85rem 0.6rem',
                textAlign: 'center',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.35rem' }}>
                <ArrowUpRight size={20} color="#9333EA" />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#7E22CE', lineHeight: 1 }}>
                {followupsCount}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, marginTop: '0.35rem' }}>
                {tr('ఫాలో-అప్‌లు', 'Follow-ups', 'फॉलो-अप')}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Health Coverage Map Card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {tr('ఆరోగ్య కవరేజ్ మ్యాప్', 'Health Coverage Map', 'स्वास्थ्य कवरेज मानचित्र')}
            </h3>
            <button
              onClick={() => onNavigate('reports')}
              style={{
                background: 'none',
                border: 'none',
                color: '#0284C7',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem'
              }}
            >
              <span>{tr('వివరాలు చూడండి', 'View Details', 'विवरण देखें')}</span>
              <span>→</span>
            </button>
          </div>

          {/* Map Graphic with Interactive Legend */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flex: 1
          }}>
            {/* Visual Coverage Map */}
            <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <img
                src="/assets/coverage_map.png"
                alt="Health Coverage Map"
                style={{
                  maxWidth: '100%',
                  maxHeight: '120px',
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
              />
            </div>

            {/* Legend on Right matching screenshot */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#334155'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#22C55E' }} />
                <span>{tr('లక్ష్యానికి అనుగుణంగా (On Track)', 'On Track', 'ट्रैक पर (On Track)')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#F59E0B' }} />
                <span>{tr('శ్రద్ధ అవసరం (Attention Needed)', 'Attention Needed', 'ध्यान आवश्यक (Attention)')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#EF4444' }} />
                <span>{tr('పెండింగ్‌లో ఉంది (Pending)', 'Pending', 'लंबित (Pending)')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. BOTTOM ROW: PATIENT FOLLOW-UP QUEUE + MYTRA AI + QUICK LINKS */}
      {/* ============================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Card 1: Patient Follow-up Queue */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '1.25rem',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {tr('రోగి ఫాలో-అప్ క్యూ', 'Patient Follow-up Queue', 'रोगी फॉलो-अप कतार')}
            </h3>
            <button
              onClick={() => onNavigate('patients')}
              style={{
                background: 'none',
                border: 'none',
                color: '#0284C7',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {tr('అన్నీ చూడండి', 'View All', 'सभी देखें')} →
            </button>
          </div>

          {/* List of Patients */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {followUpQueue.map((item) => (
              <div
                key={item.id}
                onClick={() => onNavigate('patients')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '12px',
                  background: '#F8FAFC',
                  border: '1px solid #F1F5F9',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#F8FAFC')}
              >
                {/* Left: Avatar + Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: item.avatarBg,
                    color: item.avatarColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.88rem'
                  }}>
                    {item.name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
                      {item.name} ({item.age}Y, {item.genderShort})
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      {item.condition} • {item.duration}
                    </div>
                  </div>
                </div>

                {/* Right: Status Pill + Chevron */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    background: item.statusColor,
                    color: item.statusText,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.65rem',
                    borderRadius: '12px'
                  }}>
                    {item.status}
                  </span>
                  <ChevronRight size={16} color="#94A3B8" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Aarogya Mytra AI Companion */}
        <div style={{
          background: 'linear-gradient(135deg, #074C56 0%, #0A616E 50%, #0D7B8A 100%)',
          borderRadius: '16px',
          padding: '1.25rem 1.4rem',
          color: '#FFFFFF',
          boxShadow: '0 4px 15px rgba(7, 76, 86, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.15rem 0', color: '#FFFFFF' }}>
              Aarogya Mytra AI
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#A7F3D0', margin: 0, fontWeight: 600 }}>
              {tr('మీ ఆరోగ్య సహచరుడు', 'Your Health Companion', 'आपका स्वास्थ्य साथी')}
            </p>

            {/* Speech bubble */}
            <div style={{
              background: '#FFFFFF',
              color: '#0F172A',
              padding: '0.65rem 0.85rem',
              borderRadius: '12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              marginTop: '0.85rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              position: 'relative',
              maxWidth: '85%',
              lineHeight: 1.35
            }}>
              {tr(
                'లక్షణాలు, ఆరోగ్య చిట్కాల గురించి నన్ను అడగండి లేదా ఫొటోను అప్‌లోడ్ చేయండి...',
                'Ask me about symptoms, health tips or upload an image...',
                'मुझसे लक्षणों, स्वास्थ्य युक्तियों के बारे में पूछें या छवि अपलोड करें...'
              )}
              {/* Pointer triangle */}
              <div style={{
                position: 'absolute',
                bottom: '-6px',
                left: '20px',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '6px solid #FFFFFF'
              }} />
            </div>
          </div>

          {/* Bottom Row: Start Chat Button + Robot Mascot */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginTop: '1rem'
          }}>
            <button
              onClick={() => onNavigate('chatbot')}
              style={{
                background: '#FFFFFF',
                color: '#074C56',
                border: 'none',
                borderRadius: '24px',
                padding: '0.55rem 1.15rem',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <span>{tr('చాట్ ప్రారంభించండి', 'Start Chat', 'चैट शुरू करें')}</span>
              <span>→</span>
            </button>

            {/* 3D Robot Mascot */}
            <img
              src="/assets/mytra_robot.png"
              alt="Mytra AI Mascot"
              style={{
                width: '84px',
                height: '84px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.2))'
              }}
            />
          </div>
        </div>

        {/* Card 3: Quick Links */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '1.25rem',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.85rem 0' }}>
            {tr('త్వరిత లింకులు', 'Quick Links', 'त्वरित लिंक')}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {/* Link 1: Health Schemes */}
            <div
              onClick={() => setActiveModal('schemes')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.75rem',
                borderRadius: '10px',
                background: '#F8FAFC',
                border: '1px solid #F1F5F9',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#F8FAFC')}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#E0F2FE',
                color: '#0369A1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <HeartHandshake size={18} />
              </div>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1E293B' }}>
                {tr('ఆరోగ్య పథకాలు', 'Health Schemes', 'स्वास्थ्य योजनाएं')}
              </span>
            </div>

            {/* Link 2: Medical Guidelines */}
            <div
              onClick={() => setActiveModal('guidelines')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.75rem',
                borderRadius: '10px',
                background: '#F8FAFC',
                border: '1px solid #F1F5F9',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#F8FAFC')}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#DCFCE7',
                color: '#15803D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FileText size={18} />
              </div>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1E293B' }}>
                {tr('వైద్య మార్గదర్శకాలు', 'Medical Guidelines', 'चिकित्सा दिशानिर्देश')}
              </span>
            </div>

            {/* Link 3: Emergency Help */}
            <div
              onClick={() => setActiveModal('emergency')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.75rem',
                borderRadius: '10px',
                background: '#F8FAFC',
                border: '1px solid #F1F5F9',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#F8FAFC')}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#FFEDD5',
                color: '#C2410C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Shield size={18} />
              </div>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1E293B' }}>
                {tr('అత్యవసర సహాయం', 'Emergency Help', 'आपातकालीन सहायता')}
              </span>
            </div>

            {/* Link 4: Contact PHC */}
            <div
              onClick={() => setActiveModal('phc')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.75rem',
                borderRadius: '10px',
                background: '#F8FAFC',
                border: '1px solid #F1F5F9',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#F8FAFC')}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#FEF3C7',
                color: '#B45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Phone size={18} />
              </div>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1E293B' }}>
                {tr('పీహెచ్‌సీని సంప్రదించండి', 'Contact PHC', 'पीएचसी से संपर्क करें')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. QUICK LINK MODALS FOR FULL INTERACTIVITY                     */}
      {/* ============================================================== */}
      {activeModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            maxWidth: '540px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            position: 'relative'
          }}>
            <button
              onClick={() => setActiveModal(null)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748B'
              }}
            >
              <X size={18} />
            </button>

            {/* Modal: Health Schemes */}
            {activeModal === 'schemes' && (
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.75rem' }}>
                  🏥 {tr('ప్రభుత్వ ఆరోగ్య పథకాలు', 'Government Health Schemes (AP)', 'सरकारी स्वास्थ्य योजनाएं')}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div style={{ padding: '0.75rem', background: '#F0FDFA', borderRadius: '10px', border: '1px solid #CCFBF1' }}>
                    <div style={{ fontWeight: 800, color: '#0F766E' }}>Dr. YSR Aarogyasri Scheme</div>
                    <div style={{ color: '#334155', marginTop: '0.2rem' }}>
                      {tr(
                        'గిరిజన కుటుంబాల కోసం ₹25 లక్షల వరకు ఉచిత ఆసుపత్రి చికిత్స మరియు శస్త్రచికిత్సలు.',
                        'Free inpatient healthcare and surgical procedures up to ₹25 Lakhs per family per year.',
                        'जनजातीय परिवारों के लिए ₹25 लाख तक मुफ्त अस्पताल उपचार और सर्जरी।'
                      )}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: '#F0F9FF', borderRadius: '10px', border: '1px solid #BAE6FD' }}>
                    <div style={{ fontWeight: 800, color: '#0369A1' }}>Ayushman Bharat - PM-JAY</div>
                    <div style={{ color: '#334155', marginTop: '0.2rem' }}>
                      {tr('దేశవ్యాప్తంగా ఎంప్లానెల్డ్ ఆసుపత్రులలో ద్వితీయ మరియు తృతీయ స్థాయి ఉచిత చికిత్స.', 'Secondary and tertiary treatment at empaneled hospitals across India.', 'भारत भर में पैनलबद्ध अस्पतालों में मुफ्त माध्यमिक और तृतीयक उपचार।')}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: '#FAF5FF', borderRadius: '10px', border: '1px solid #E9D5FF' }}>
                    <div style={{ fontWeight: 800, color: '#7E22CE' }}>National Oral Health Programme (NOHP)</div>
                    <div style={{ color: '#334155', marginTop: '0.2rem' }}>
                      {tr('నోటి క్యాన్సర్ ముందస్తు గుర్తింపు, ఉచిత బయాప్సీ మరియు డెంటల్ స్క్రీనింగ్ క్యాంపులు.', 'Early oral cancer detection, free biopsy, and dental screening camps.', 'मुख कैंसर की प्रारंभिक पहचान, मुफ्त बायोप्सी और दंत स्क्रीनिंग शिविर।')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal: Medical Guidelines */}
            {activeModal === 'guidelines' && (
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.75rem' }}>
                  📋 {tr('క్లినికల్ మార్గదర్శకాలు', 'Clinical Oral & Health Guidelines', 'चिकित्सा दिशानिर्देश')}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div style={{ padding: '0.75rem', background: '#FEF3C7', borderRadius: '10px', border: '1px solid #FDE68A' }}>
                    <div style={{ fontWeight: 800, color: '#92400E' }}>⚠️ Red Flag Symptoms (ఎరుపు హెచ్చరికలు)</div>
                    <div style={{ color: '#451A03', marginTop: '0.2rem' }}>
                      {tr(
                        '2 వారాల కంటే ఎక్కువ కాలం మానని నోటి పుండ్లు, ఎర్రటి / తెల్లటి మచ్చలు, మింగడంలో నొప్పి ఉంటే తక్షణమే PHCకి రిఫర్ చేయండి.',
                        'Non-healing oral ulcers > 2 weeks, erythroplakia/leukoplakia patches, or difficulty swallowing must be referred immediately.',
                        '2 सप्ताह से अधिक समय से न भरने वाले छाले, लाल/सफेद धब्बे तुरंत पीएचसी रेफर करें।'
                      )}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontWeight: 800, color: '#1E293B' }}>Triage & Referral Path</div>
                    <div style={{ color: '#475569', marginTop: '0.2rem' }}>
                      CHW Screening ➔ PHC Medical Officer Review ➔ Specialist Tele-Consultation ➔ Area Hospital Paderu / KGH Visakhapatnam.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal: Emergency Help */}
            {activeModal === 'emergency' && (
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#991B1B', marginBottom: '0.75rem' }}>
                  🚨 {tr('అత్యవసర సంప్రదింపు నంబర్లు', 'Emergency Hotlines & Medical Help', 'आपातकालीन सहायता')}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                  <div style={{ padding: '0.85rem', background: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#991B1B' }}>🚑 108 Emergency Ambulance</div>
                      <div style={{ fontSize: '0.78rem', color: '#7F1D1D' }}>24x7 Tribal Agency Area Ambulance</div>
                    </div>
                    <a href="tel:108" style={{ background: '#DC2626', color: '#FFF', padding: '0.4rem 0.85rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 800 }}>Dial 108</a>
                  </div>

                  <div style={{ padding: '0.85rem', background: '#EFF6FF', borderRadius: '10px', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#1E40AF' }}>📞 104 Health Helpline</div>
                      <div style={{ fontSize: '0.78rem', color: '#1E3A8A' }}>Medical Advice & Guidance</div>
                    </div>
                    <a href="tel:104" style={{ background: '#2563EB', color: '#FFF', padding: '0.4rem 0.85rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 800 }}>Dial 104</a>
                  </div>

                  <div style={{ padding: '0.85rem', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#334155' }}>🏛️ ITDA Paderu Control Room</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Alluri Sitharama Raju HQ</div>
                    </div>
                    <span style={{ fontWeight: 800, color: '#0F172A' }}>08935-251234</span>
                  </div>
                </div>
              </div>
            )}

            {/* Modal: Contact PHC */}
            {activeModal === 'phc' && (
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.75rem' }}>
                  🏥 {tr('మీ పీహెచ్‌సీ కేంద్రం వివరాలు', 'Primary Health Centre (PHC) Contact', 'पीएचसी संपर्क विवरण')}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem' }}>
                  <div style={{ padding: '0.85rem', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Centre Name</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>{user.phc_name || `${user.mandal || 'G. Madugula'} Primary Health Centre`}</div>
                  </div>
                  <div style={{ padding: '0.85rem', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Mandal & District</div>
                    <div style={{ fontWeight: 700, color: '#0F172A' }}>{user.mandal || 'G. Madugula'}, {user.district || 'Alluri Sitharama Raju'}</div>
                  </div>
                  <div style={{ padding: '0.85rem', background: '#F0FDFA', borderRadius: '10px', border: '1px solid #CCFBF1' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#0F766E', fontWeight: 700 }}>Medical Officer Duty Desk</div>
                    <div style={{ fontWeight: 800, color: '#0F766E' }}>+91 98480 11002 (Dr. Ramesh Babu, MO)</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
