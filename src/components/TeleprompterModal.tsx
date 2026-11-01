import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Type,
  Maximize2,
  Minimize2,
  Clock,
  Sparkles,
  Loader2,
  Check,
  Copy,
  FileText,
  AlertCircle,
  Undo2,
} from 'lucide-react';

interface TeleprompterModalProps {
  isOpen: boolean;
  onClose: () => void;
  script: string;
  movieTitle: string;
}

export const TeleprompterModal: React.FC<TeleprompterModalProps> = ({
  isOpen,
  onClose,
  script,
  movieTitle,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2); // 1 to 5
  const [fontSize, setFontSize] = useState(32); // px
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Script customization & AI Summarization states
  const [displayedScript, setDisplayedScript] = useState(script);
  const [summarizedScript, setSummarizedScript] = useState<string | null>(null);
  const [activeScriptMode, setActiveScriptMode] = useState<'original' | 'summarized'>('original');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [reductionStats, setReductionStats] = useState<{
    originalChars: number;
    summarizedChars: number;
    ratio: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  // Sync script prop on open or change
  useEffect(() => {
    setDisplayedScript(script);
    setSummarizedScript(null);
    setActiveScriptMode('original');
    setReductionStats(null);
    setErrorMsg(null);
  }, [script, movieTitle]);

  // Timer counter
  useEffect(() => {
    if (isPlaying) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [isPlaying]);

  // Auto-scroll logic
  useEffect(() => {
    if (isPlaying) {
      scrollIntervalRef.current = setInterval(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop += speed * 0.8;
        }
      }, 30);
    } else {
      clearInterval(scrollIntervalRef.current);
    }
    return () => clearInterval(scrollIntervalRef.current);
  }, [isPlaying, speed]);

  // Reset scroll and timer on open/close
  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setElapsedSeconds(0);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [isOpen]);

  // Keyboard shortcut: Spacebar to toggle play/pause, ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReset = () => {
    setIsPlaying(false);
    setElapsedSeconds(0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  // Summarize Script using Gemini
  const handleSummarizeScript = async () => {
    if (summarizedScript) {
      // If already summarized, switch to it immediately
      setDisplayedScript(summarizedScript);
      setActiveScriptMode('summarized');
      handleReset();
      return;
    }

    try {
      setIsSummarizing(true);
      setErrorMsg(null);

      const res = await fetch('/api/recap/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          movieTitle,
        }),
      });

      const data = await res.json();
      if (!data.success || !data.summarizedScript) {
        throw new Error(data.error || 'ဇာတ်ညွှန်း တိုတိုချုပ်ခြင်း မအောင်မြင်ပါ');
      }

      setSummarizedScript(data.summarizedScript);
      setDisplayedScript(data.summarizedScript);
      setActiveScriptMode('summarized');
      setReductionStats({
        originalChars: data.originalLength || script.length,
        summarizedChars: data.summarizedLength || data.summarizedScript.length,
        ratio: data.reductionRatio || Math.round((1 - data.summarizedScript.length / script.length) * 100),
      });
      handleReset();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gemini ဖြင့် ဇာတ်ညွှန်း အကျဉ်းချုပ်ရာတွင် ချို့ယွင်းချက် ရှိပါသည်');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSwitchToOriginal = () => {
    setDisplayedScript(script);
    setActiveScriptMode('original');
    handleReset();
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(displayedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Estimate reading time (~130 words per minute or ~400 chars per min)
  const estimatedReadMinutes = Math.max(1, Math.round(displayedScript.length / 400));

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none animate-fade-in">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-8 py-3 bg-neutral-950 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-ping shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-white text-sm sm:text-base tracking-tight truncate">
                Teleprompter: {movieTitle}
              </h3>
              {activeScriptMode === 'summarized' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  Gemini Summarized
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400">
              Spacebar နှိပ်၍ စတင်/ရပ်တန့်ပါ • ဖတ်ရှုချိန်ခန့်မှန်းခြေ: ~{estimatedReadMinutes} မိနစ်
            </p>
          </div>
        </div>

        {/* AI Summarize Script & Stopwatch & Close */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 justify-end">
          {/* Summarize Script Button */}
          <button
            type="button"
            onClick={handleSummarizeScript}
            disabled={isSummarizing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-md border ${
              activeScriptMode === 'summarized'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400 ring-2 ring-purple-500/30'
                : 'bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-cyan-500/20 text-purple-200 border-purple-500/40 hover:from-purple-500/30 hover:to-indigo-500/30 hover:text-white hover:border-purple-300'
            }`}
            title="Gemini AI ဖြင့် အဓိကဇာတ်ကွက်များ မပျောက်ဘဲ စာသားကို ၄၀-၅၀% ပိုမိုတိုတိုကျစ်လျစ်အောင် ချုပ်ပေးမည်"
          >
            {isSummarizing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-300" />
                <span>Gemini ဖြင့် တိုတိုချုပ်နေသည်...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                <span>Summarize Script (Gemini AI)</span>
              </>
            )}
          </button>

          {/* If summarized, toggle back to original */}
          {summarizedScript && (
            <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={handleSwitchToOriginal}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  activeScriptMode === 'original'
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                မူရင်း (Original)
              </button>
              <button
                type="button"
                onClick={() => {
                  setDisplayedScript(summarizedScript);
                  setActiveScriptMode('summarized');
                  handleReset();
                }}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  activeScriptMode === 'summarized'
                    ? 'bg-purple-600 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                တိုတိုချုပ် (Short)
              </button>
            </div>
          )}

          {/* Copy Script */}
          <button
            type="button"
            onClick={handleCopyScript}
            className="p-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition-colors cursor-pointer"
            title="ဇာတ်ညွှန်း ကူးယူမည်"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Timer display */}
          <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-xl font-mono text-xs sm:text-sm text-amber-400 font-bold">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="ပိတ်မည် (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sub-header info if summarized */}
      {activeScriptMode === 'summarized' && reductionStats && (
        <div className="bg-purple-950/40 border-b border-purple-500/20 px-4 sm:px-8 py-2 flex items-center justify-between text-xs text-purple-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>
              Gemini AI က ဇာတ်လမ်းအဓိကအချက်များကို ထိန်းသိမ်းပြီး စာသားကို{' '}
              <strong className="text-purple-300 font-bold font-mono">
                {reductionStats.ratio}%
              </strong>{' '}
              ပိုမိုကျစ်လျစ်အောင် ချုံ့ပေးထားပါသည်။
            </span>
          </div>
          <button
            type="button"
            onClick={handleSwitchToOriginal}
            className="text-[11px] text-purple-400 hover:text-purple-200 underline cursor-pointer"
          >
            မူရင်းဇာတ်ညွှန်း ပြန်ကြည့်မည်
          </button>
        </div>
      )}

      {/* Error Message if any */}
      {errorMsg && (
        <div className="bg-rose-950/50 border-b border-rose-500/30 px-4 py-2 flex items-center gap-2 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Prompter Body */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-6 sm:px-16 lg:px-32 py-24 scroll-smooth text-center"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="max-w-3xl mx-auto space-y-6">
          <p className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-8">
            --- စတင်ဖတ်ရှုရန် အသင့်ဖြစ်ပါပြီ ---
          </p>
          <div
            className="text-neutral-100 font-medium leading-relaxed tracking-wide font-serif whitespace-pre-line"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.65 }}
          >
            {displayedScript}
          </div>
          <p className="text-xs font-mono uppercase tracking-widest text-neutral-600 pt-16">
            --- ဇာတ်လမ်း ပြီးဆုံးပါပြီ ---
          </p>
        </div>
      </div>

      {/* Reading focus guide line */}
      <div className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 h-20 border-y border-amber-500/20 bg-amber-500/5 z-10" />

      {/* Bottom Floating Controls */}
      <div className="p-4 bg-neutral-950/95 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-4 px-4 sm:px-8">
        {/* Play/Pause & Reset */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all cursor-pointer ${
              isPlaying
                ? 'bg-amber-500 text-neutral-950 hover:bg-amber-400'
                : 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-neutral-950" />
                <span>ရပ်မည် (Pause)</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-neutral-950" />
                <span>စတင်ပြသမည် (Play)</span>
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition-colors cursor-pointer"
            title="အစသို့ ပြန်သွားမည်"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Adjustment */}
        <div className="flex items-center gap-3 text-xs sm:text-sm">
          <span className="text-neutral-400 font-medium">အရှိန်:</span>
          <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  speed === s
                    ? 'bg-amber-500 text-neutral-950'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Font Size Adjustment */}
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <span className="text-neutral-400 font-medium">စာလုံးအရွယ်:</span>
          <div className="flex items-center gap-1.5 bg-neutral-900 px-2 py-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => setFontSize((prev) => Math.max(20, prev - 4))}
              className="px-2 py-0.5 rounded text-neutral-300 hover:bg-neutral-800 font-bold cursor-pointer"
              title="စာလုံးသေးမည်"
            >
              A-
            </button>
            <span className="font-mono text-xs text-amber-400 font-bold px-1">
              {fontSize}px
            </span>
            <button
              onClick={() => setFontSize((prev) => Math.min(56, prev + 4))}
              className="px-2 py-0.5 rounded text-neutral-300 hover:bg-neutral-800 font-bold cursor-pointer"
              title="စာလုံးကြီးမည်"
            >
              A+
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
