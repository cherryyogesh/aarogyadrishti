import React from 'react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showSubtitle?: boolean;
  lightText?: boolean;
  currentLang?: string;
  className?: string;
}

export const AarogyaLogo: React.FC<LogoProps> = ({
  size = 'medium',
  showSubtitle = true,
  lightText = true,
  currentLang = 'en',
  className = ''
}) => {
  const iconSize = size === 'small' ? 36 : size === 'large' ? 68 : 46;
  const titleSize = size === 'small' ? '0.98rem' : size === 'large' ? '1.5rem' : '1.18rem';
  const subSize = size === 'small' ? '0.66rem' : size === 'large' ? '0.84rem' : '0.73rem';

  return (
    <div
      className={`aarogya-logo-wrap ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: size === 'large' ? '1rem' : '0.75rem',
        userSelect: 'none'
      }}
    >
      {/* Official State Health Emblem */}
      <div
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          position: 'relative',
          filter: lightText
            ? 'drop-shadow(0 0 10px rgba(94, 234, 212, 0.45)) drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
            : 'drop-shadow(0 2px 8px rgba(13, 148, 136, 0.22))'
        }}
      >
        <img
          src="/assets/aarogya_drishti_logo.png"
          alt="Aarogya Drishti National Emblem"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block'
          }}
          onError={(e) => {
            // Fallback to logo.png or svg if assets path fails
            const target = e.currentTarget;
            if (target.src.indexOf('aarogya_drishti_logo.png') !== -1) {
              target.src = '/logo.png';
            }
          }}
        />
      </div>

      {/* Brand Typography */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'nowrap' }}>
          <span
            style={{
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              fontSize: titleSize,
              fontWeight: 800,
              letterSpacing: '0.03em',
              color: lightText ? '#FFFFFF' : '#0F172A',
              lineHeight: 1.15
            }}
          >
            AAROGYA DRISHTI
          </span>
          <span
            style={{
              background: 'linear-gradient(135deg, #0D9488 0%, #06B6D4 100%)',
              color: '#FFFFFF',
              fontSize: size === 'small' ? '0.58rem' : '0.64rem',
              fontWeight: 800,
              padding: '0.12rem 0.4rem',
              borderRadius: '4px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              boxShadow: '0 1px 3px rgba(13, 148, 136, 0.3)'
            }}
          >
            ASR ITDA
          </span>
        </div>

        {showSubtitle && (
          <span
            style={{
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              fontSize: subSize,
              fontWeight: 600,
              color: lightText ? '#94A3B8' : '#64748B',
              marginTop: '0.2rem',
              letterSpacing: '0.01em'
            }}
          >
            {currentLang === 'te'
              ? 'ఆరోగ్య దృష్టి • కమ్యూనిటీ ఓరల్ హెల్త్ & టెలిమెడిసిన్'
              : currentLang === 'hi'
              ? 'आरोग्य दृष्टि • सामुदायिक मुख स्वास्थ्य और टेलीमेडिसिन'
              : 'Community Oral Health & Telemedicine'}
          </span>
        )}
      </div>
    </div>
  );
};

export default AarogyaLogo;
