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
  const iconSize = size === 'small' ? 32 : size === 'large' ? 60 : 40;
  const titleSize = size === 'small' ? '0.92rem' : size === 'large' ? '1.4rem' : '1.08rem';
  const subSize = size === 'small' ? '0.64rem' : size === 'large' ? '0.8rem' : '0.7rem';

  return (
    <div
      className={`aarogya-logo-wrap ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: size === 'large' ? '0.85rem' : '0.65rem',
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
            ? 'drop-shadow(0 0 8px rgba(94, 234, 212, 0.45)) drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
            : 'drop-shadow(0 2px 6px rgba(13, 148, 136, 0.22))'
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
            const target = e.currentTarget;
            if (target.src.indexOf('aarogya_drishti_logo.png') !== -1) {
              target.src = '/logo.png';
            }
          }}
        />
      </div>

      {/* Brand Typography */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'nowrap' }}>
          <span
            style={{
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              fontSize: titleSize,
              fontWeight: 800,
              letterSpacing: '-0.01em',
              color: lightText ? '#FFFFFF' : '#0F172A',
              lineHeight: 1.15
            }}
          >
            {currentLang === 'te' ? 'ఆరోగ్య దృష్టి' : currentLang === 'hi' ? 'आरोग्य दृष्टि' : 'Aarogya Drishti'}
          </span>
        </div>

        {showSubtitle && (
          <span
            style={{
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              fontSize: subSize,
              fontWeight: 600,
              color: lightText ? '#A7F3D0' : '#0D9488',
              marginTop: '0.15rem',
              letterSpacing: '0.01em'
            }}
          >
            {currentLang === 'te'
              ? 'కమ్యూనిటీ ఓరల్ హెల్త్'
              : currentLang === 'hi'
              ? 'सामुदायिक मुख स्वास्थ्य'
              : 'AI Oral Healthcare'}
          </span>
        )}
      </div>
    </div>
  );
};

export default AarogyaLogo;
