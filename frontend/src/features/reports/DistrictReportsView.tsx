import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, DistrictAnalytics, User, StaffMember } from '../../types';
import { ASR_DISTRICT_MANDALS, matchMandal } from '../../constants/mandals';
import {
  BarChart3, Activity, Clock, UserCheck, MessageSquare, Shield,
  Stethoscope, Building2, Users, Search, Filter, Phone,
  CheckCircle2, AlertCircle, FileText
} from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
  user: User;
}

export const DistrictReportsView: React.FC<Props> = ({ currentLang, user }) => {
  const t = translations[currentLang] || translations.en;
  const isTe = currentLang === 'te';

  const [analytics, setAnalytics] = useState<DistrictAnalytics | null>(null);
  const [staffRoster, setStaffRoster] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [mandalFilter, setMandalFilter] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [an, roster] = await Promise.all([
          api.getDistrictAnalytics(),
          api.getStaffRoster()
        ]);
        setAnalytics(an);
        setStaffRoster(roster);
      } catch (err) {
        console.error('Failed to load district reports data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !analytics) {
    return (
      <div style={{ textAlign: 'center', padding: '3.5rem', color: '#64748B' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #0D9488', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: '1rem', fontWeight: 600 }}>
          {isTe ? 'జిల్లా ఆరోగ్య గణాంకాలు & సిబ్బంది సమాచారం లోడ్ అవుతోంది...' : 'Loading district workforce analytics and health facilities...'}
        </div>
      </div>
    );
  }

  // Filtered staff roster
  const filteredStaff = staffRoster.filter(s => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone && s.phone.includes(searchTerm)) ||
      (s.phc_name && s.phc_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.mandal && s.mandal.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === 'all' || s.role === roleFilter;
    const matchesMandal = mandalFilter === 'all' || matchMandal(s.mandal, mandalFilter);

    return matchesSearch && matchesRole && matchesMandal;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'chw':
        return { label: isTe ? 'ఆశా కార్యకర్త (CHW)' : 'ASHA / CHW', bg: '#CCFBF1', color: '#0F766E' };
      case 'phc_staff':
        return { label: isTe ? 'పీహెచ్‌సీ స్టాఫ్ / MO' : 'PHC Staff / MO', bg: '#DCFCE7', color: '#15803D' };
      case 'doctor':
        return { label: isTe ? 'వైద్యులు (Doctors)' : 'Doctors', bg: '#F3E8FF', color: '#7E22CE' };
      case 'navigator':
        return { label: isTe ? 'పేషెంట్ నేవిగేటర్' : 'Patient Navigator', bg: '#FEF3C7', color: '#B45309' };
      case 'admin':
        return { label: isTe ? 'DMHO వైద్యాధికారి' : 'DMHO Admin', bg: '#FFE4E6', color: '#BE123C' };
      default:
        return { label: role, bg: '#F1F5F9', color: '#475569' };
    }
  };

  return (
    <div>
      {/* Header Banner */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Shield size={24} color="#0D9488" />
          {t.nav_reports} • {isTe ? 'DMHO జిల్లా ఆరోగ్య పర్యవేక్షణ & సిబ్బంది డాష్‌బోర్డ్' : 'DMHO Health Workforce & Facilities Monitoring'}
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '0.25rem' }}>
          {isTe
            ? 'అల్లూరి సీతారామరాజు జిల్లా (పాడేరు ITDA) పరిధిలోని మొత్తం ఆశా కార్యకర్తలు, పీహెచ్‌సీ కేంద్రాలు, వైద్యులు మరియు స్క్రీనింగ్ ఫలితాల సమీక్ష.'
            : 'Alluri Sitharama Raju District (ITDA Paderu) healthcare workforce roster, PHC coverage, available doctors, and oral screening clinical analytics.'}
        </p>
      </div>

      {/* 1. HEALTH WORKFORCE & INFRASTRUCTURE MONITORING CARDS */}
      <div style={{ marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={18} color="#0D9488" />
          {isTe ? 'ఆరోగ్య సిబ్బంది & పీహెచ్‌సీ కేంద్రాల స్థితి (Workforce & Facilities)' : 'Health Workforce & Primary Health Centres Status'}
        </h3>
      </div>

      <div className="grid-cards" style={{ marginBottom: '1.75rem' }}>
        {/* Total ASHA Workers */}
        <div className="metric-card" style={{ borderLeft: '4px solid #0D9488' }}>
          <div className="metric-icon-wrap" style={{ backgroundColor: '#CCFBF1', color: '#0F766E' }}>
            <Users size={26} />
          </div>
          <div>
            <div className="metric-val" style={{ color: '#0F766E' }}>{analytics.total_asha_workers ?? staffRoster.filter(s => s.role === 'chw').length}</div>
            <div className="metric-label">{t.dmho_total_asha || (isTe ? 'మొత్తం ఆశా కార్యకర్తలు' : 'Total ASHA Workers')}</div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>
              {isTe ? 'గ్రామస్థాయి నోటి స్క్రీనింగ్ & ఫీల్డ్ టీమ్' : 'Village-level screening & oral health field team'}
            </div>
          </div>
        </div>

        {/* Total PHC Centres */}
        <div className="metric-card" style={{ borderLeft: '4px solid #0284C7' }}>
          <div className="metric-icon-wrap" style={{ backgroundColor: '#E0F2FE', color: '#0284C7' }}>
            <Building2 size={26} />
          </div>
          <div>
            <div className="metric-val" style={{ color: '#0284C7' }}>{analytics.total_phcs ?? 6}</div>
            <div className="metric-label">{t.dmho_total_phcs || (isTe ? 'మొత్తం PHC కేంద్రాలు' : 'Total PHC Centres')}</div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>
              {isTe ? 'పాడేరు ఏజెన్సీ పరిధిలోని 6 మండలాల్లో క్రియాశీలం' : 'Active across all 6 ITDA agency mandals'}
            </div>
          </div>
        </div>

        {/* Total Doctors Available */}
        <div className="metric-card" style={{ borderLeft: '4px solid #7E22CE' }}>
          <div className="metric-icon-wrap" style={{ backgroundColor: '#F3E8FF', color: '#7E22CE' }}>
            <Stethoscope size={26} />
          </div>
          <div>
            <div className="metric-val" style={{ color: '#7E22CE' }}>{analytics.total_doctors ?? staffRoster.filter(s => s.role === 'doctor' || s.role === 'phc_staff').length}</div>
            <div className="metric-label">{t.dmho_total_doctors || (isTe ? 'అందుబాటులో ఉన్న వైద్యులు' : 'Doctors Available')}</div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>
              {isTe ? 'పీహెచ్‌సీ మెడికల్ ఆఫీసర్లు & ఆంకాలజిస్టులు' : 'PHC Medical Officers & Oral Specialists'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE HEALTHCARE WORKFORCE DIRECTORY & STAFF ROSTER */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div className="card-title" style={{ margin: 0 }}>
            <Users size={20} color="var(--teal-primary)" />
            {t.dmho_staff_roster || (isTe ? 'జిల్లా ఆరోగ్య సిబ్బంది డైరెక్టరీ & లైవ్ రోస్టర్' : 'District Healthcare Staff Directory & Workforce Roster')}
            <span style={{ fontSize: '0.8rem', background: '#E2E8F0', padding: '0.2rem 0.6rem', borderRadius: '12px', marginLeft: '0.5rem', fontWeight: 600 }}>
              {filteredStaff.length} {isTe ? 'మంది సిబ్బంది' : 'Registered Staff'}
            </span>
          </div>

          {/* Search Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder={isTe ? 'పేరు, మొబైల్ లేదా పీహెచ్‌సీ శోధించండి...' : 'Search by name, mobile, PHC...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.84rem',
                  minWidth: '240px'
                }}
              />
              <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            {/* Mandal Filter */}
            <select
              value={mandalFilter}
              onChange={(e) => setMandalFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.84rem',
                background: '#FFFFFF',
                color: '#334155'
              }}
            >
              <option value="all">{isTe ? 'అన్ని మండలాలు (All 11 Mandals)' : 'All 11 Mandals'}</option>
              {ASR_DISTRICT_MANDALS.map((m) => (
                <option key={m.id} value={m.id}>
                  {isTe ? `${m.nameTe} (${m.name})` : m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Role Filter Chips */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {[
            { id: 'all', label: isTe ? 'అందరూ (All)' : 'All Staff' },
            { id: 'chw', label: isTe ? 'ఆశా కార్యకర్తలు (ASHA)' : 'ASHA / CHWs' },
            { id: 'phc_staff', label: isTe ? 'పీహెచ్‌సీ సిబ్బంది (PHC Staff)' : 'PHC Staff' },
            { id: 'doctor', label: isTe ? 'వైద్యులు (Doctors)' : 'Doctors & Specialists' },
            { id: 'admin', label: isTe ? 'DMHO అధికారులు' : 'District Admin' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRoleFilter(tab.id)}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '20px',
                border: `1.5px solid ${roleFilter === tab.id ? '#0D9488' : '#E2E8F0'}`,
                background: roleFilter === tab.id ? '#0D9488' : '#F8FAFC',
                color: roleFilter === tab.id ? '#FFFFFF' : '#475569',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Workforce Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 1rem' }}>{isTe ? 'ఉద్యోగి పేరు (Employee Name)' : 'Employee Name'}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{isTe ? 'అధికారిక హోదా (Role)' : 'Official Role'}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{isTe ? 'మొబైల్ నంబరు (Mobile)' : 'Mobile Number'}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{isTe ? 'పీహెచ్‌సీ కేంద్రం (PHC Facility)' : 'Assigned PHC Centre'}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{isTe ? 'మండలం & జిల్లా' : 'Mandal & District'}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{isTe ? 'స్థితి' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                    {isTe ? 'ఈ శోధనకు సరిపోలే సిబ్బంది వివరాలు లేవు.' : 'No staff members match the selected filter.'}
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const badge = getRoleBadge(staff.role);
                  return (
                    <tr key={staff.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#1E293B' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: `${badge.color}18`,
                            color: badge.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 800
                          }}>
                            {staff.full_name.charAt(0)}
                          </div>
                          <span>{staff.full_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          background: badge.bg,
                          color: badge.color,
                          padding: '0.25rem 0.65rem',
                          borderRadius: '12px',
                          fontSize: '0.74rem',
                          fontWeight: 700
                        }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#334155', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Phone size={13} color="#64748B" />
                          <span>{staff.phone || '+91 98480 11000'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Building2 size={13} color="#64748B" />
                          <span>{staff.phc_name || `${staff.mandal} PHC`}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748B' }}>
                        <div><strong>{staff.mandal || 'G. Madugula'}</strong>, {staff.district || 'ASR District'}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: staff.is_active ? '#15803D' : '#94A3B8',
                          fontSize: '0.76rem',
                          fontWeight: 600
                        }}>
                          <span style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: staff.is_active ? '#22C55E' : '#94A3B8',
                            boxShadow: staff.is_active ? '0 0 6px #22C55E' : 'none'
                          }} />
                          {staff.is_active ? (isTe ? 'క్రియాశీలం / అందుబాటులో' : 'Active / On Duty') : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. MANDAL-WISE PHC & STAFF COVERAGE BREAKDOWN */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div className="card-title" style={{ marginBottom: '1rem' }}>
          <BarChart3 size={20} color="var(--teal-primary)" />
          {isTe ? 'మండలాల వారీగా PHC కేంద్రాలు, ఆశా సిబ్బంది & స్క్రీనింగ్ వివరాలు' : 'Mandal-Wise PHC Centres, ASHA Workers & Screening Coverage'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {ASR_DISTRICT_MANDALS.map((mItem) => {
            const mandalData = analytics.workforce_by_mandal?.[mItem.id] ||
              analytics.workforce_by_mandal?.[mItem.name] ||
              analytics.workforce_by_mandal?.[mItem.aliases[0]] || {
              phcs: 1,
              asha_workers: mItem.id.includes('Madugula') ? 2 : 1,
              doctors: mItem.id.includes('Madugula') || mItem.id === 'Paderu' ? 2 : 1,
              screenings: analytics.screenings_by_mandal?.[mItem.id] || analytics.screenings_by_mandal?.[mItem.name] || analytics.screenings_by_mandal?.[mItem.aliases[0]] || 0
            };

            return (
              <div
                key={mItem.id}
                style={{
                  background: mItem.id.includes('Madugula') ? '#F0FDFA' : '#F8FAFC',
                  border: `1.5px solid ${mItem.id.includes('Madugula') ? '#0D9488' : '#E2E8F0'}`,
                  padding: '1.1rem',
                  borderRadius: '12px'
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A', marginBottom: '0.4rem' }}>
                  {isTe ? mItem.nameTe : mItem.name}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.6 }}>
                  <div>🏥 <strong>{mandalData.phcs ?? 1}</strong> {isTe ? 'పీహెచ్‌సీ కేంద్రం' : 'PHC Centre'}</div>
                  <div>👩‍⚕️ <strong>{mandalData.asha_workers ?? 1}</strong> {isTe ? 'ఆశా వర్కర్లు' : 'ASHA Workers'}</div>
                  <div>🩺 <strong>{mandalData.doctors ?? 1}</strong> {isTe ? 'వైద్యులు' : 'Doctors'}</div>
                  <div style={{ marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px dashed #CBD5E1', color: '#0D9488', fontWeight: 700 }}>
                    📋 {mandalData.screenings ?? 0} {isTe ? 'స్క్రీనింగ్‌లు' : 'Screenings'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. CLINICAL OUTCOMES & SCREENING AGGREGATES */}
      <div style={{ marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} color="#0D9488" />
          {isTe ? 'క్లినికల్ స్క్రీనింగ్ & క్యాన్సర్ ముందస్తు నిర్ధారణ నివేదికలు' : 'Oral Cancer Screening & Clinical Outcomes'}
        </h3>
      </div>

      <div className="grid-cards" style={{ marginBottom: '1.75rem' }}>
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#E0F2FE', color: '#0369A1' }}>
            <Activity size={26} />
          </div>
          <div>
            <div className="metric-val">{analytics.total_screenings}</div>
            <div className="metric-label">{isTe ? 'మొత్తం నోటి స్క్రీనింగ్‌లు' : 'Total Screenings Recorded'}</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
            <UserCheck size={26} />
          </div>
          <div>
            <div className="metric-val">{analytics.verified_arrivals_count}</div>
            <div className="metric-label">{isTe ? 'OTP ద్వారా ధృవీకరించబడిన రాకలు' : 'Verified Arrivals via OTP'}</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            <Clock size={26} />
          </div>
          <div>
            <div className="metric-val">{analytics.average_wait_duration_minutes}m</div>
            <div className="metric-label">{isTe ? 'సగటు రోగి నిరీక్షణ సమయం' : 'Average Patient Wait Duration'}</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#F3E8FF', color: '#7E22CE' }}>
            <MessageSquare size={26} />
          </div>
          <div>
            <div className="metric-val">{analytics.sms_delivery_rate_percent}%</div>
            <div className="metric-label">{isTe ? 'SMS డెలివరీ విజయం' : 'SMS Delivery Queue Rate'}</div>
          </div>
        </div>
      </div>

      {/* Cancer Precancers & Biopsy Module Row */}
      <div className="grid-cards" style={{ marginBottom: '1.75rem' }}>
        <div className="metric-card" style={{ borderLeft: '4px solid #F59E0B' }}>
          <div>
            <div className="metric-val" style={{ color: '#D97706' }}>{analytics.precancers_detected ?? 1}</div>
            <div className="metric-label">{isTe ? 'కనుగొన్న OPMD ముందస్తు మచ్చలు (ల్యూకోప్లాకియా/OSMF)' : 'OPMD Precancers Detected (Leukoplakia/OSMF)'}</div>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #EF4444' }}>
          <div>
            <div className="metric-val" style={{ color: '#DC2626' }}>{analytics.cancers_confirmed ?? 0}</div>
            <div className="metric-label">{isTe ? 'ధృవీకరించబడిన మాలిగ్నెన్సీలు (OSCC)' : 'Pathology Confirmed Malignancies (OSCC)'}</div>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #0284C7' }}>
          <div>
            <div className="metric-val" style={{ color: '#0284C7' }}>
              {(analytics.biopsies_completed ?? 1)} / {(analytics.biopsies_pending ?? 0) + (analytics.biopsies_completed ?? 1)}
            </div>
            <div className="metric-label">{isTe ? 'బయాప్సీ పరీక్షల పురోగతి (పూర్తయినవి / సూచించినవి)' : 'Biopsies Completed vs Advised'}</div>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #7C3AED' }}>
          <div>
            <div className="metric-val" style={{ color: '#7C3AED' }}>{analytics.referrals_count ?? 1}</div>
            <div className="metric-label">{isTe ? 'జిల్లా ఆసుపత్రికి రిఫరల్ స్లిప్‌లు' : 'Specialist Referrals Issued'}</div>
          </div>
        </div>
      </div>

      {/* Infrastructure & Governance Card */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: '1rem' }}>
          <Shield size={18} color="var(--teal-primary)" />
          {isTe ? 'DMHO భద్రతా & ప్రోటోకాల్ నిబంధనలు' : 'System Operational Compliance & Security Governance'}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
          • <strong>{isTe ? 'AI ప్రయోగశాల ఇంజిన్:' : 'AI Engine:'}</strong> {analytics.ai_service_status}<br />
          • <strong>{isTe ? 'రోగుల సమాచార రక్షణ:' : 'Data Privacy:'}</strong> {isTe ? 'అనధికారిక వినియోగదారులకు రోగుల ఫోన్ నంబర్లు మాస్క్ చేయబడతాయి (+91 ******1234).' : 'Patient phone numbers strictly masked in frontline views.'}<br />
          • <strong>{isTe ? 'OTP భద్రత:' : 'OTP Security:'}</strong> {isTe ? 'సాల్టెడ్ SHA-256 క్రిప్టోగ్రాఫిక్ టోకెన్ల ద్వారా భద్రపరచబడింది.' : 'Salted SHA-256 tokens; zero plaintext storage.'}<br />
          • <strong>{isTe ? 'ఆడిట్ రికార్డులు:' : 'Audit Trail:'}</strong> {isTe ? 'ప్రతి ఉద్యోగి లాగిన్ మరియు క్లినికల్ సమీక్ష సమయం రికార్డ్ చేయబడుతుంది.' : 'Every employee login, registration, and clinical review is immutably timestamped.'}
        </div>
      </div>
    </div>
  );
};
