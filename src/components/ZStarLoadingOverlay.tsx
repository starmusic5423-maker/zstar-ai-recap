import React from 'react';
import { Film, FileText, Mic, Sparkles, Video, CheckCircle2 } from 'lucide-react';

export type LoadingStep = 'video' | 'script' | 'voice' | 'movie';

export interface ZStarLoadingOverlayProps {
  isOpen: boolean;
  title?: string;
  statusText?: string;
  subtext?: string;
  progress?: number | null; // 0 - 100 or null for indeterminate
  currentStep?: LoadingStep;
  onCancel?: () => void;
}

const STEPS: { id: LoadingStep; label: string; burmese: string; icon: React.ElementType }[] = [
  { id: 'video', label: 'Video Clip', burmese: 'ဗီဒီယို', icon: Video },
  { id: 'script', label: 'AI Script', burmese: 'ဇာတ်ညွှန်း', icon: FileText },
  { id: 'voice', label: 'Voiceover', burmese: 'အသံသွင်း', icon: Mic },
  { id: 'movie', label: 'Movie Recap', burmese: 'အပြီးသတ်', icon: Film },
];

export const ZStarLoadingOverlay: React.FC<ZStarLoadingOverlayProps> = ({
  isOpen,
  title = 'Processing...',
  statusText,
  subtext = 'Please wait while our AI edits your Recap...',
  progress = null,
  currentStep = 'video',
  onCancel,
}) => {
  if (!isOpen) return null;

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const displayProgress = typeof progress === 'number' && !isNaN(progress) ? Math.min(100, Math.max(0, Math.round(progress))) : null;

  // Calculate SVG circular stroke offset if progress is available
  const radius = 96;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = displayProgress !== null ? circumference - (displayProgress / 100) * circumference : circumference * 0.25;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#030712]/85 backdrop-blur-md animate-fadeIn select-none"
    >
      {/* Background radial ambient glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="w-[500px] h-[500px] bg-gradient-to-tr from-[#00F0FF]/15 via-[#FFE600]/10 to-transparent rounded-full blur-3xl animate-pulse-glow" />
      </div>

      {/* Main Glass Card Container */}
      <div className="relative w-full max-w-lg rounded-3xl border border-[#00F0FF]/30 bg-[#08101e]/95 p-6 sm:p-8 shadow-[0_0_60px_rgba(0,240,255,0.25)] text-center overflow-hidden flex flex-col items-center">
        {/* Subtle decorative top neon beam */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent shadow-[0_0_12px_#00F0FF]" />

        {/* Centerpiece: Spinning Cinematic Golden Star & Film-Reel Logo Container */}
        <div className="relative w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center my-2">
          {/* Outer Pulsing Glow Aura */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#00F0FF]/20 via-[#FFE600]/25 to-transparent blur-xl animate-pulse" />

          {/* SVG Progress / Kinetic Orbit Rings */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 220 220">
            {/* Background Track */}
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="transparent"
              stroke="#0f1f38"
              strokeWidth="5"
            />
            {/* Dynamic Progress / Active Glow Ring */}
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="transparent"
              stroke="url(#zstar-loading-gradient)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={`transition-all duration-300 ${displayProgress === null ? 'animate-spin-slow origin-center' : ''}`}
            />
            <defs>
              <linearGradient id="zstar-loading-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00F0FF" />
                <stop offset="50%" stopColor="#FFE600" />
                <stop offset="100%" stopColor="#00F0FF" />
              </linearGradient>
            </defs>
          </svg>

          {/* Outer Rotating Neon Cyan Dashed Orbit */}
          <div className="absolute inset-2 sm:inset-3 rounded-full border border-dashed border-[#00F0FF]/40 animate-spin-slow pointer-events-none" />

          {/* Inner Counter-Rotating Golden Perforations Ring */}
          <div className="absolute inset-6 sm:inset-7 rounded-full border border-dotted border-[#FFE600]/50 animate-spin-reverse pointer-events-none" />

          {/* Orbiting Neon Glow Particle Dots */}
          <div className="absolute inset-0 animate-spin-slow pointer-events-none">
            <span className="absolute top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#00F0FF] shadow-[0_0_10px_#00F0FF]" />
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#FFE600] shadow-[0_0_10px_#FFE600]" />
          </div>

          {/* Golden Star Logo Center Hub (Requirement 2: Strictly circular with border-radius: 50%, overflow: hidden, object-fit: cover) */}
          <div
            className="relative z-10 w-36 h-36 sm:w-40 sm:h-40 rounded-full overflow-hidden border-2 border-[#FFE600]/80 bg-[#08101e] flex items-center justify-center shadow-[0_0_35px_rgba(255,230,0,0.4)]"
            style={{ borderRadius: '50%' }}
          >
            {/* Golden Star & Film-Reel Logo Image from 1000025092.png */}
            <img
              src="/1000025092.png"
              alt="Z Star Movie Recap Studio"
              className="w-full h-full rounded-full object-cover filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] animate-pulse-glow"
              style={{ borderRadius: '50%', objectFit: 'cover' }}
              loading="eager"
            />
          </div>

          {/* Live Percentage Badge (if available) */}
          {displayProgress !== null && (
            <div className="absolute bottom-0 z-20 px-3 py-1 rounded-full bg-[#040812]/95 border border-[#00F0FF] shadow-[0_0_16px_rgba(0,240,255,0.4)] flex items-center gap-1.5 text-xs font-bold text-[#00F0FF]">
              <Sparkles className="w-3 h-3 text-[#FFE600] animate-spin" />
              <span>{displayProgress}%</span>
            </div>
          )}
        </div>

        {/* Dynamic Status Typography */}
        <div className="mt-3 space-y-1.5 w-full">
          <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-wide flex items-center justify-center gap-2">
            <span className="text-[#00F0FF] drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
              {title}
            </span>
          </h3>

          {statusText && (
            <p className="text-sm font-medium text-slate-300 font-burmese max-w-md mx-auto line-clamp-2 px-2">
              {statusText}
            </p>
          )}

          {/* Animated Linear Progress Bar */}
          <div className="w-full max-w-xs mx-auto mt-3 h-2 rounded-full bg-slate-900/90 border border-slate-800 overflow-hidden relative">
            {displayProgress !== null ? (
              <div
                className="h-full bg-gradient-to-r from-[#00F0FF] via-[#38bdf8] to-[#FFE600] transition-all duration-300 rounded-full shadow-[0_0_10px_#00F0FF]"
                style={{ width: `${displayProgress}%` }}
              />
            ) : (
              <div className="h-full w-1/3 bg-gradient-to-r from-[#00F0FF] to-[#FFE600] rounded-full animate-pulse-glow shadow-[0_0_12px_#00F0FF] mx-auto" />
            )}
          </div>
        </div>

        {/* Animated Icon Step Indicators (Requirement 2: Progress Line perfectly aligned through icon centers without offset or breaks) */}
        <div className="mt-6 w-full max-w-md pt-4 border-t border-slate-800/80">
          <div className="relative px-3 sm:px-4">
            {/* Background connecting track running exactly through icon centers */}
            <div className="absolute top-[18px] sm:top-[20px] left-8 sm:left-10 right-8 sm:right-10 h-0.5 -translate-y-1/2 bg-slate-800 z-0" />
            
            {/* Active glowing progress line running smoothly between step centers */}
            <div
              className="absolute top-[18px] sm:top-[20px] left-8 sm:left-10 h-0.5 -translate-y-1/2 bg-gradient-to-r from-[#00F0FF] to-[#FFE600] shadow-[0_0_10px_#00F0FF] transition-all duration-500 z-0"
              style={{
                width: currentStepIndex > 0 ? `calc(${(currentStepIndex / (STEPS.length - 1)) * 100}% - 12px)` : '0%',
                maxWidth: 'calc(100% - 64px)',
              }}
            />

            {/* Step Nodes Row */}
            <div className="relative z-10 flex items-start justify-between">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isPast = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;

                return (
                  <div key={step.id} className="flex flex-col items-center text-center w-14 sm:w-16">
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 border ${
                        isCurrent
                          ? 'bg-gradient-to-br from-[#00F0FF] to-[#0284c7] text-slate-950 border-[#FFE600] shadow-[0_0_18px_#00F0FF] scale-110 ring-2 ring-[#FFE600]'
                          : isPast
                          ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400 bg-slate-950'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      {isPast ? (
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                      ) : (
                        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isCurrent ? 'animate-pulse' : ''}`} />
                      )}
                    </div>

                    <span
                      className={`mt-2 text-[10px] sm:text-xs font-semibold tracking-tight transition-colors line-clamp-1 ${
                        isCurrent
                          ? 'text-[#00F0FF]'
                          : isPast
                          ? 'text-emerald-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="text-[9px] text-slate-500 font-burmese line-clamp-1">
                      {step.burmese}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Reassuring Subtext at Bottom */}
        <div className="mt-5 text-xs text-slate-400 flex items-center justify-center gap-1.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FFE600] animate-ping" />
          <span>{subtext}</span>
        </div>

        {/* Optional Cancel Action */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-4 text-xs text-slate-500 hover:text-slate-300 underline underline-offset-4 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default ZStarLoadingOverlay;
