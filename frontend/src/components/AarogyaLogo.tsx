import React from 'react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showSubtitle?: boolean;
  lightText?: boolean;
  currentLang?: string;
}

export const AarogyaLogo: React.FC<LogoProps> = ({
  size = 'medium',
  showSubtitle = true,
  lightText = true,
  currentLang = 'en'
}) => {
  const iconSize = size === 'small' ? 32 : size === 'large' ? 56 : 42;
  const titleSize = size === 'small' ? '1rem' : size === 'large' ? '1.5rem' : '1.2rem';
  const subSize = size === 'small' ? '0.68rem' : size === 'large' ? '0.85rem' : '0.75rem';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', userSelect: 'none' }}>
      {/* High-Definition Medical Crest with Eye/Drishti & Cross */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, filter: 'drop-shadow(0 4px 12px rgba(13, 148, 136, 0.35))' }}
      >
        <defs>
          <linearGradient id="shieldGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0F766E" />
            <stop offset="50%" stopColor="#0D9488" />
            <stop offset="100%" stopColor="#042F2E" />
          </linearGradient>
          <linearGradient id="crossGrad" x1="0" y1="0" x2="50" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
          <linearGradient id="eyeGrad" x1="20" y1="50" x2="80" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#5EEAD4" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#2DD4BF" />
          </linearGradient>
          <radialGradient id="irisGrad" cx="50" cy="50" r="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="60%" stopColor="#0D9488" />
            <stop offset="100%" stopColor="#14B8A6" />
          </radialGradient>
        </defs>

        {/* Outer Hexagonal Medical Shield */}
        <path
          d="M50 4 L88 22 V54 C88 74 50 94 50 94 C50 94 12 74 12 54 V22 Z"
          fill="url(#shieldGrad)"
          stroke="#5EEAD4"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Inner Golden Ring of Care */}
        <path
          d="M50 10 L82 25 V52 C82 68 50 85 50 85 C50 85 18 68 18 52 V25 Z"
          fill="#0B1E38"
          fillOpacity="0.85"
          stroke="#F59E0B"
          strokeWidth="1.2"
          strokeDasharray="2 2"
        />

        {/* Universal Red/Teal Medical Cross in background */}
        <path
          d="M45 28 H55 V44 H71 V54 H55 V70 H45 V54 H29 V44 H45 Z"
          fill="#0D9488"
          fillOpacity="0.4"
        />

        {/* Drishti Eye Shape (Translational Vision & Early Screening) */}
        <path
          d="M26 49 C34 38 66 38 74 49 C66 60 34 60 26 49 Z"
          fill="none"
          stroke="url(#eyeGrad)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        {/* Eye Iris / Aperture */}
        <circle cx="50" cy="49" r="12" fill="url(#irisGrad)" stroke="#5EEAD4" strokeWidth="2" />
        
        {/* Core Medical Cross Center Star */}
        <path
          d="M47 43 H53 V46 H56 V52 H53 V55 H47 V52 H44 V46 H47 Z"
          fill="#FFFFFF"
        />

        {/* Healing Leaves / Tribal Flora Motif at the bottom */}
        <path
          d="M40 76 C45 70 50 72 50 78 C50 72 55 70 60 76 C55 81 45 81 40 76 Z"
          fill="#10B981"
        />
      </svg>

      {/* Brand Typography */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem'
        }}>
          <span style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: titleSize,
            fontWeight: 800,
            letterSpacing: '0.04em',
            color: lightText ? '#F8FAFC' : '#0F172A',
            lineHeight: 1.15
          }}>
            AAROGYA DRISHTI
          </span>
          <span style={{
            background: 'linear-gradient(135deg, #0D9488 0%, #06B6D4 100%)',
            color: '#FFFFFF',
            fontSize: '0.62rem',
            fontWeight: 700,
            padding: '0.1rem 0.35rem',
            borderRadius: '4px',
            letterSpacing: '0.03em',
            textTransform: 'uppercase'
          }}>
            ASR ITDA
          </span>
        </div>

        {showSubtitle && (
          <span style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: subSize,
            fontWeight: 500,
            color: lightText ? '#94A3B8' : '#64748B',
            marginTop: '0.15rem',
            letterSpacing: '0.01em'
          }}>
            {currentLang === 'te'
              ? 'ఆరోగ్య దృష్టి • గిరిజన నోటి ఆరోగ్యం & టెలిమెడిసిన్'
              : currentLang === 'hi'
              ? 'आरोग्य दृष्टि • जनजातीय मुख स्वास्थ्य और टेलीमेडिसिन'
              : 'Tribal Oral Health & Telemedicine'}
          </span>
        )}
      </div>
    </div>
  );
};
