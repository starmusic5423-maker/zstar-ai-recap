import React, { useState } from 'react';
import {
  Mic,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Download,
  Sparkles,
  Sliders,
  Play,
  Pause,
  AlertCircle,
  FileText,
  Clock,
  User,
  Heart,
  Flame,
  Radio,
  BookOpen,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { VoiceoverNarrationGuide, VoiceoverGuideItem } from '../types';
import { CustomDarkDropdown, DropdownOption } from './CustomDarkDropdown';

interface VoiceoverGeneratorModuleProps {
  guide: VoiceoverNarrationGuide | null;
  isLoading: boolean;
  onGenerate: (tone: 'dramatic' | 'enthusiastic' | 'calm' | 'suspenseful') => void;
  onPlayLineAudio?: (text: string, speaker?: string, gender?: 'male' | 'female' | 'narrator') => void;
  currentTone: 'dramatic' | 'enthusiastic' | 'calm' | 'suspenseful';
  movieTitle: string;
}

export const VoiceoverGeneratorModule: React.FC<VoiceoverGeneratorModuleProps> = ({
  guide,
  isLoading,
  onGenerate,
  onPlayLineAudio,
  currentTone,
  movieTitle,
}) => {
  const [selectedToneFilter, setSelectedToneFilter] = useState<string>('all');
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedLineId, setCopiedLineId] = useState<number | null>(null);
  const [playingLineId, setPlayingLineId] = useState<number | null>(null);
  const [selectedTone, setSelectedTone] = useState<'dramatic' | 'enthusiastic' | 'calm' | 'suspenseful'>(currentTone);

  // Tone color helper
  const getToneBadgeStyle = (toneType: string) => {
    switch (toneType) {
      case 'tension':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/50';
      case 'whisper':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/50';
      case 'dramatic':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'twist':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
      case 'pause':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
    }
  };

  const handleCopyFull = () => {
    if (!guide) return;
    const text = guide.fullGuideScript || guide.lines.map((l) => `[${l.timestamp}] ${l.speaker} ${l.tone}\n${l.actingDirection ? `Direction: ${l.actingDirection}\n` : ''}"${l.spokenBurmese}"`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2000);
  };

  const handleCopyLine = (line: VoiceoverGuideItem) => {
    navigator.clipboard.writeText(`[${line.timestamp}] ${line.speaker} ${line.tone}: "${line.spokenBurmese}"`);
    setCopiedLineId(line.id);
    setTimeout(() => setCopiedLineId(null), 2000);
  };

  const handleDownloadTxt = () => {
    if (!guide) return;
    const content = `=== VOICEOVER NARRATION GUIDE FOR VOICE ACTORS ===
Movie / Video: ${movieTitle}
Tone: ${guide.recommendedTone}
Total Duration: ${guide.totalDuration}
Overall Mood: ${guide.overallMood}

=== ACTOR PACING & VOCAL TIPS ===
${guide.voiceActorPacingTips.map((tip, idx) => `${idx + 1}. ${tip}`).join('\n')}

=== LINE-BY-LINE SCRIPT & CUES ===
${guide.lines.map((l) => `【${l.timestamp}】${l.speaker} ${l.tone}
Acting Direction: ${l.actingDirection}
Burmese Dialogue: "${l.spokenBurmese}"
${l.originalDialogue ? `Original Reference: ${l.originalDialogue}\n` : ''}`).join('\n')}
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(movieTitle || 'video').replace(/[^a-zA-Z0-9_\u1000-\u109F-]/g, '_')}_Voiceover_Guide.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLines = (guide?.lines || []).filter((line) => {
    if (selectedToneFilter === 'all') return true;
    return line.toneType === selectedToneFilter;
  });

  return (
    <div className="bg-[#080d1a] border border-cyan-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
            <Mic className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>VOICEOVER GENERATOR & ACTOR GUIDE</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <span>ရုပ်ရှင်ဇာတ်လမ်းပြော & Dubbing လမ်းညွှန်</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gemini Multimodal Script မှ အသံသွင်းသူများ (Voice Actors) အတွက် သဘာဝကျသော မြန်မာစကားပြောနှင့် Tone လမ်းညွှန်
          </p>
        </div>

        {/* Tone Selector & Regenerate Trigger */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-56">
            <CustomDarkDropdown
              value={selectedTone}
              onChange={(val) => {
                const nextTone = val as any;
                setSelectedTone(nextTone);
                onGenerate(nextTone);
              }}
              options={[
                { value: 'dramatic', label: '🎭 Dramatic', description: 'ရုပ်ရှင်ဇာတ်ဆောင်ဟန်', badge: 'Cinema', badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-800' },
                { value: 'suspenseful', label: '⚡ Suspenseful', description: 'သည်းထိတ်ရင်ဖို လျှို့ဝှက်သံ', badge: 'Thriller', badgeColor: 'bg-rose-950/80 text-rose-300 border-rose-800' },
                { value: 'enthusiastic', label: '🔥 Enthusiastic', description: 'တက်ကြွသော Viral တင်ဆက်မှု', badge: 'High Energy', badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-800' },
                { value: 'calm', label: '🎙️ Calm', description: 'တည်ငြိမ်သော သုံးသပ်ချက်ဟန်', badge: 'Review', badgeColor: 'bg-blue-950/80 text-blue-300 border-blue-800' },
              ]}
              theme="cyan"
              buttonClassName="!py-2 !px-3 !text-xs font-bold"
            />
          </div>

          <button
            type="button"
            onClick={() => onGenerate(selectedTone)}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-cyan-500/25 ring-1 ring-cyan-300/40 hover:scale-105 active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'ထုတ်လုပ်နေသည်...' : 'ပြန်ထုတ်မည်'}</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 animate-spin">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-cyan-300">
            Gemini API ဖြင့် သဘာဝကျသော Voiceover Guide & Tone လမ်းညွှန် ရေးသားနေပါသည်...
          </p>
          <p className="text-xs text-slate-500">
            စကားပြောတစ်ခုချင်းစီအတွက် လေသံနှင့် အသံနေအထား (Acting Direction) များကို ချိန်ညှိနေသည်
          </p>
        </div>
      ) : !guide || guide.lines.length === 0 ? (
        <div className="py-10 text-center space-y-3">
          <Mic className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-slate-300">Voiceover Guide မထုတ်ရသေးပါ</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            ဗီဒီယိုကို ဦးစွာ Analyze လုပ်ပြီးပါက Gemini ဖြင့် စကားပြောတစ်ခုချင်းစီအတွက် Voice Actor လမ်းညွှန်များ အလိုအလျောက် ထွက်ပေါ်လာပါမည်။
          </p>
          <button
            type="button"
            onClick={() => onGenerate(selectedTone)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs cursor-pointer shadow-lg"
          >
            ✨ Voiceover Guide စတင်ထုတ်လုပ်မည်
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#0b1322] p-3.5 rounded-2xl border border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 block mb-1">RECOMMENDED TONE</span>
              <span className="text-sm font-bold text-cyan-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>{guide.recommendedTone.toUpperCase()}</span>
              </span>
            </div>

            <div className="bg-[#0b1322] p-3.5 rounded-2xl border border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 block mb-1">TOTAL LINES / DURATION</span>
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>{guide.lines.length} Lines ({guide.totalDuration})</span>
              </span>
            </div>

            <div className="bg-[#0b1322] p-3.5 rounded-2xl border border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 block mb-1">OVERALL MOOD</span>
              <span className="text-sm font-bold text-emerald-300 flex items-center gap-1.5 truncate">
                <Heart className="w-4 h-4 text-pink-400" />
                <span className="truncate">{guide.overallMood || 'Cinematic Storytelling'}</span>
              </span>
            </div>
          </div>

          {/* Actor Pacing Tips */}
          {guide.voiceActorPacingTips && guide.voiceActorPacingTips.length > 0 && (
            <div className="bg-[#0c1629] border border-cyan-500/20 rounded-2xl p-4 space-y-2">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>အသံသွင်းသူများအတွက် အထူးသတိပြုရန် လမ်းညွှန်ချက် (Pacing & Delivery Tips):</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {guide.voiceActorPacingTips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="font-mono text-cyan-400 font-bold shrink-0">{idx + 1}.</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Bar & Quick Export Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {/* Tone Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-500 mr-1">လေသံအလိုက် စစ်ထုတ်ရန်:</span>
              {[
                { id: 'all', label: 'အားလုံး (All)' },
                { id: 'tension', label: '🔥 စိတ်လှုပ်ရှားသံ' },
                { id: 'whisper', label: '🤫 အသံတိုးတိုး' },
                { id: 'dramatic', label: '🎭 လေးနက်သံ' },
                { id: 'twist', label: '⚡ လှည့်ကွက်' },
                { id: 'pause', label: '⏸️ ခေတ္တရပ်' },
              ].map((btn) => (
                <button
                  type="button"
                  key={btn.id}
                  onClick={() => setSelectedToneFilter(btn.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    selectedToneFilter === btn.id
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-sm'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyFull}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedFull ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{copiedFull ? 'ကူးပြီးပါပြီ' : 'Copy All'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTxt}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold border border-cyan-500/40 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export TXT</span>
              </button>
            </div>
          </div>

          {/* Line-by-Line Narration Cards */}
          <div className="space-y-3">
            {filteredLines.map((line) => (
              <div
                key={line.id}
                className="bg-[#0b1322] border border-slate-800/90 hover:border-cyan-500/40 rounded-2xl p-4 transition-all space-y-3 group"
              >
                {/* Line Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-900 text-cyan-300 border border-slate-700">
                      ⏱️ {line.timestamp}
                    </span>
                    <span className="text-xs font-bold text-white flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{line.speaker}</span>
                    </span>
                    {/* Speaker Role / Gender Tag */}
                    {(() => {
                      const spkLower = `${line.gender || ''} ${line.speaker || ''}`.toLowerCase();
                      const isNarrator = spkLower.includes('narrator') || spkLower.includes('ဇာတ်လမ်းပြောသူ');
                      const isMale = !isNarrator && (line.gender === 'male' || /\[male\]|\[အမျိုးသား\]|မင်းထက်|ဇေယျာ|\bmale\b/i.test(spkLower));
                      const isFemale = !isNarrator && !isMale;

                      if (isNarrator) {
                        return (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            🎙️ Narrator
                          </span>
                        );
                      }
                      if (isMale) {
                        return (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                            👦 Male (အမျိုးသား)
                          </span>
                        );
                      }
                      return (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/40">
                          👧 Female (အမျိုးသမီး)
                        </span>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${getToneBadgeStyle(line.toneType)}`}>
                      {line.tone}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleCopyLine(line)}
                      className="text-slate-500 hover:text-cyan-300 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                      title="ဒီစာကြောင်းကို ကူးမည်"
                    >
                      {copiedLineId === line.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    {onPlayLineAudio && (
                      <button
                        type="button"
                        onClick={() => {
                          setPlayingLineId(line.id);
                          onPlayLineAudio(line.spokenBurmese, line.speaker, line.gender);
                          setTimeout(() => setPlayingLineId(null), 3000);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 p-1.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-700/50 transition-colors cursor-pointer flex items-center gap-1"
                        title="ဒီဇာတ်ကောင် အသံဖြင့် နားထောင်မည် (Play Line Audio)"
                      >
                        <Volume2 className={`w-3.5 h-3.5 ${playingLineId === line.id ? 'animate-bounce text-cyan-300' : ''}`} />
                        <span className="text-[10px] font-bold font-mono">နားထောင်မည်</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Acting Direction Cue */}
                {line.actingDirection && (
                  <div className="flex items-start gap-2 bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800 text-xs text-amber-200/90 font-medium">
                    <Radio className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-amber-400 font-mono mr-1">[Voice Direction]:</strong>
                      {line.actingDirection}
                    </span>
                  </div>
                )}

                {/* Spoken Burmese Line */}
                <div className="text-sm sm:text-base font-bold text-white leading-relaxed pl-1 border-l-2 border-cyan-400/60 py-0.5">
                  "{line.spokenBurmese}"
                </div>

                {/* Original dialogue reference if present */}
                {line.originalDialogue && (
                  <div className="text-xs text-slate-500 font-mono pl-1">
                    Ref: {line.originalDialogue}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
