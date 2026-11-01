import React from 'react';

interface ZStarLogoProps {
  size?: number;
  className?: string;
  showGlow?: boolean;
}

export const ZStarLogo: React.FC<ZStarLogoProps> = ({
  size = 42,
  className = '',
  showGlow = true,
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Neon Glow Halo */}
      {showGlow && (
        <div
          className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#00F0FF]/30 via-sky-500/20 to-[#FFE600]/30 blur-md pointer-events-none transition-all duration-300 group-hover:from-[#00F0FF]/50 group-hover:to-[#FFE600]/50"
          style={{ width: size + 8, height: size + 8 }}
        />
      )}

      {/* SVG Icon Element */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 shrink-0 drop-shadow-[0_2px_12px_rgba(0,240,255,0.35)]"
      >
        <defs>
          <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#040814" />
            <stop offset="50%" stopColor="#0a1526" />
            <stop offset="100%" stopColor="#050a12" />
          </linearGradient>

          <linearGradient id="logoBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00F0FF" />
            <stop offset="50%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#FFE600" />
          </linearGradient>

          <linearGradient id="cyanLensGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="100%" stopColor="#00F0FF" />
          </linearGradient>

          <linearGradient id="yellowWaveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFF066" />
            <stop offset="100%" stopColor="#FFE600" />
          </linearGradient>
        </defs>

        {/* Outer Rounded Badge */}
        <rect
          x="2.5"
          y="2.5"
          width="59"
          height="59"
          rx="15"
          fill="url(#logoBgGrad)"
          stroke="url(#logoBorderGrad)"
          strokeWidth="2.5"
        />

        {/* Inner Highlight Ring */}
        <rect
          x="5"
          y="5"
          width="54"
          height="54"
          rx="13"
          fill="none"
          stroke="#00F0FF"
          strokeOpacity="0.18"
          strokeWidth="1"
        />

        {/* Video Camera Body (Electric Blue) */}
        <rect
          x="12"
          y="20"
          width="22"
          height="24"
          rx="4.5"
          fill="url(#cyanLensGrad)"
        />

        {/* Camera Lens Cone */}
        <path
          d="M34 26 L43 20.5 C44.5 19.5 45 20.5 45 22.5 L45 41.5 C45 43.5 44.5 44.5 43 43.5 L34 38 Z"
          fill="url(#cyanLensGrad)"
        />

        {/* Camera Aperture / Center Eye */}
        <circle cx="23" cy="32" r="5" fill="#06101d" stroke="#00F0FF" strokeWidth="1.5" />
        <circle cx="23" cy="32" r="2.2" fill="#FFE600" />
        <circle cx="21.5" cy="30.5" r="1" fill="#ffffff" />

        {/* Audio Wave Equalizer Bars (TikTok Yellow Neon) */}
        {/* Bar 1 */}
        <rect x="47.5" y="27" width="2.5" height="10" rx="1.25" fill="url(#yellowWaveGrad)" />
        {/* Bar 2 (Peak) */}
        <rect x="52" y="21" width="2.5" height="22" rx="1.25" fill="url(#yellowWaveGrad)" />
        {/* Bar 3 */}
        <rect x="56.5" y="28" width="2.5" height="8" rx="1.25" fill="url(#yellowWaveGrad)" />

        {/* Top-left Star Sparkle (TikTok Yellow) */}
        <path
          d="M16 12.5 L17.2 15.3 L20 16.5 L17.2 17.7 L16 20.5 L14.8 17.7 L12 16.5 L14.8 15.3 Z"
          fill="#FFE600"
          opacity="0.95"
        />
      </svg>
    </div>
  );
};

export default ZStarLogo;
