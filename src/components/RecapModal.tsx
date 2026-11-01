import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  Clock,
  Calendar,
  Layers,
  Mic,
  Eye,
  EyeOff,
  Copy,
  Check,
  Bookmark,
  Volume2,
  VolumeX,
  Sparkles,
  Share2,
  AlertTriangle,
  Lightbulb,
  Video,
  Play,
  Pause,
  ExternalLink,
} from 'lucide-react';
import { MovieRecap, ViewTab } from '../types';

interface RecapModalProps {
  movie: MovieRecap | null;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (id: string, e: React.MouseEvent) => void;
  onOpenTeleprompter: (script: string, title: string) => void;
}

export const RecapModal: React.FC<RecapModalProps> = ({
  movie,
  onClose,
  isSaved,
  onToggleSave,
  onOpenTeleprompter,
}) => {
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [showTwistSpoiler, setShowTwistSpoiler] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [copiedTags, setCopiedTags] = useState<boolean>(false);
  const [isPlayingSpeech, setIsPlayingSpeech] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(1);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [isLoadingTts, setIsLoadingTts] = useState<boolean>(false);

  // Reset tab and spoiler when movie changes
  useEffect(() => {
    setActiveTab('overview');
    setShowTwistSpoiler(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingSpeech(false);
  }, [movie?.id]);

  if (!movie) return null;

  // Copy Voiceover Script
  const handleCopyScript = () => {
    const textToCopy = `[ရုပ်ရှင်: ${movie.title} - ဇာတ်လမ်းပြောဇာတ်ညွှန်း]\n\n${movie.voiceoverScript?.fullScript || movie.overview}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  // Copy Hashtags
  const handleCopyHashtags = () => {
    const tags = movie.creatorPack?.hashtags?.join(' ') || '#MovieRecapMM #ရုပ်ရှင်ဇာတ်လမ်းအကျဉ်း';
    navigator.clipboard.writeText(tags);
    setCopiedTags(true);
    setTimeout(() => setCopiedTags(false), 2000);
  };

  // Web Speech API / TTS Synthesis toggle
  const toggleSpeechPlayback = () => {
    if (!('speechSynthesis' in window)) {
      alert('သင့် Browser တွင် Speech Synthesis မထောက်ပံ့ပါ');
      return;
    }

    if (isPlayingSpeech) {
      window.speechSynthesis.cancel();
      setIsPlayingSpeech(false);
    } else {
      window.speechSynthesis.cancel();
      // Remove bracket notes like [နိဒါန်း], [အသံတိုးတိုး] for cleaner audio reading
      const cleanScript = (movie.voiceoverScript?.fullScript || movie.overview)
        .replace(/\[.*?\]/g, '')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanScript);
      utterance.rate = speechRate;
      utterance.lang = 'my-MM'; // Burmese if supported by system, else fallback

      utterance.onend = () => setIsPlayingSpeech(false);
      utterance.onerror = () => setIsPlayingSpeech(false);

      window.speechSynthesis.speak(utterance);
      setIsPlayingSpeech(true);
    }
  };

  // Request high-quality AI speech preview from Gemini TTS endpoint
  const handleGenerateGeminiTTS = async () => {
    try {
      setIsLoadingTts(true);
      const cleanScript = (movie.voiceoverScript?.fullScript || movie.overview)
        .replace(/\[.*?\]/g, '')
        .slice(0, 1000);

      const res = await fetch('/api/recap/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanScript, voice: 'Kore' }),
      });
      const data = await res.json();
      if (data.audioBase64) {
        const audioSrc = `data:audio/wav;base64,${data.audioBase64}`;
        setTtsAudioUrl(audioSrc);
        const audio = new Audio(audioSrc);
        audio.play();
      } else {
        // Fallback to Web Speech
        toggleSpeechPlayback();
      }
    } catch (e) {
      console.error(e);
      toggleSpeechPlayback();
    } finally {
      setIsLoadingTts(false);
    }
  };

  const getIntensityBadge = (intensity: string) => {
    switch (intensity?.toLowerCase()) {
      case 'climax':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-neutral-800 text-neutral-400 border-neutral-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-neutral-925 bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header backdrop area */}
        <div className="relative h-48 sm:h-64 shrink-0 overflow-hidden bg-neutral-950">
          <img
            src={movie.backdropUrl || movie.posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover object-center filter brightness-40 blur-[0.5px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/60 to-transparent" />

          {/* Close button */}
          <button
            onClick={() => {
              if ('speechSynthesis' in window) window.speechSynthesis.cancel();
              onClose();
            }}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 p-2 rounded-full bg-neutral-950/70 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors border border-neutral-700/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Top bookmark button */}
          <button
            onClick={(e) => onToggleSave(movie.id, e)}
            className="absolute top-3 right-14 sm:top-4 sm:right-16 z-20 p-2 rounded-full bg-neutral-950/70 hover:bg-neutral-800 text-neutral-300 transition-colors border border-neutral-700/60 cursor-pointer"
            title={isSaved ? 'သိမ်းဆည်းထားပြီး' : 'သိမ်းဆည်းမည်'}
          >
            <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'}`} />
          </button>

          {/* Title & metadata in backdrop */}
          <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 flex items-end justify-between gap-4">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-amber-500 text-neutral-950">
                  <Star className="w-3.5 h-3.5 fill-neutral-950 text-neutral-950" />
                  {movie.imdbRating}
                </span>
                <span className="text-xs text-neutral-300 px-2 py-0.5 rounded bg-neutral-950/70 border border-neutral-800">
                  {movie.year}
                </span>
                <span className="text-xs text-neutral-300 px-2 py-0.5 rounded bg-neutral-950/70 border border-neutral-800">
                  {movie.duration}
                </span>
                <span className="text-xs text-neutral-400">
                  Dir: {movie.director}
                </span>
              </div>
              <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">
                {movie.burmeseTitle ? `${movie.burmeseTitle} (${movie.title})` : movie.title}
              </h2>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-2.5 bg-neutral-950/90 border-b border-neutral-800/80 overflow-x-auto scrollbar-none text-xs sm:text-sm font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
            }`}
          >
            ဇာတ်လမ်းအကျဉ်း (Overview)
          </button>
          <button
            onClick={() => setActiveTab('scenes')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'scenes'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>ဇာတ်ကွက်များ ({movie.scenes?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('voiceover')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'voiceover'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>ဇာတ်လမ်းပြော ဇာတ်ညွှန်း (Voiceover)</span>
          </button>
          <button
            onClick={() => setActiveTab('twist')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'twist'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>လှည့်ကွက် & ဇာတ်သိမ်း (Twist)</span>
          </button>
          <button
            onClick={() => setActiveTab('creator')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'creator'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>ဖန်တီးသူ Pack (Creator)</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Tagline & Logline */}
              <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-4 sm:p-5">
                <p className="text-amber-400 font-semibold text-sm sm:text-base italic mb-2">
                  "{movie.tagline}"
                </p>
                <p className="text-neutral-200 text-sm sm:text-base leading-relaxed">
                  {movie.logline}
                </p>
              </div>

              {/* Full Narrative Overview */}
              <div>
                <h4 className="text-base sm:text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-4 bg-amber-500 rounded-sm" />
                  ရုပ်ရှင်ဇာတ်လမ်း ပြည့်စုံချက်
                </h4>
                <div className="text-neutral-300 text-sm sm:text-base leading-relaxed space-y-4 whitespace-pre-line bg-neutral-950/40 p-4 sm:p-6 rounded-2xl border border-neutral-800/80">
                  {movie.overview}
                </div>
              </div>

              {/* Moral & Themes */}
              {movie.moralAndThemes && movie.moralAndThemes.length > 0 && (
                <div>
                  <h4 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    ရုပ်ရှင်မှ ရရှိသော သင်ခန်းစာနှင့် အတွေးအမြင်များ
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {movie.moralAndThemes.map((theme, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-xs sm:text-sm text-neutral-300 leading-relaxed"
                      >
                        <span className="text-amber-400 font-bold block mb-1">
                          #{idx + 1}
                        </span>
                        {theme}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Characters Dossier */}
              {movie.characters && movie.characters.length > 0 && (
                <div>
                  <h4 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                    <span className="w-2 h-4 bg-amber-500 rounded-sm" />
                    အဓိက ဇာတ်ကောင်များနှင့် ဇာတ်သိမ်းကံကြမ္မာ
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {movie.characters.map((char, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800/80 hover:border-neutral-700 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h5 className="font-bold text-white text-sm sm:text-base">
                            {char.name}
                          </h5>
                          {char.actor && (
                            <span className="text-xs text-amber-400/90 font-medium">
                              ({char.actor})
                            </span>
                          )}
                        </div>
                        <span className="inline-block text-[11px] font-semibold text-neutral-400 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 mb-2">
                          {char.role}
                        </span>
                        <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed mb-2">
                          {char.description}
                        </p>
                        {char.fate && (
                          <div className="text-[11px] sm:text-xs text-neutral-400 bg-neutral-900/90 p-2 rounded-lg border border-neutral-800">
                            <strong className="text-amber-400">ဇာတ်သိမ်း: </strong>
                            {char.fate}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SCENES BREAKDOWN */}
          {activeTab === 'scenes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm text-neutral-400">
                  ရုပ်ရှင်ဇာတ်ကား တစ်ကားလုံး၏ အချိန်အလိုက် အဓိကဇာတ်ကွက်များ ခွဲခြမ်းစိတ်ဖြာချက်
                </p>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-neutral-950 text-neutral-300 border border-neutral-800">
                  စုစုပေါင်း {movie.scenes?.length || 0} ကွက်
                </span>
              </div>

              <div className="relative pl-6 sm:pl-8 border-l-2 border-neutral-800 space-y-6">
                {movie.scenes?.map((scene, idx) => (
                  <div key={idx} className="relative group">
                    {/* Timeline dot */}
                    <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full bg-neutral-950 border-2 border-amber-500 group-hover:scale-125 transition-transform" />

                    <div className="bg-neutral-950/70 border border-neutral-800/80 hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 transition-all">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            ⏱ {scene.timestamp}
                          </span>
                          <h5 className="font-bold text-white text-sm sm:text-base">
                            {scene.title}
                          </h5>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md border ${getIntensityBadge(
                              scene.intensity
                            )}`}
                          >
                            အရှိန်: {scene.intensity}
                          </span>
                          {scene.mood && (
                            <span className="text-[10px] sm:text-xs text-neutral-400 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                              {scene.mood}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                        {scene.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: VOICEOVER SCRIPT */}
          {activeTab === 'voiceover' && (
            <div className="space-y-6">
              {/* Voiceover control bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-neutral-950 to-neutral-950 border border-amber-500/20">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      🎙️ YouTube / TikTok Voiceover Script
                    </span>
                    <span className="text-xs text-neutral-400">
                      • ကြာချိန်ခန့်မှန်း: {movie.voiceoverScript?.estimatedNarrationTime || '၅ မိနစ်'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300">
                    အသံနေအထား: <span className="text-amber-300 font-semibold">{movie.voiceoverScript?.toneRecommendation || 'သည်းထိတ်ရင်ဖို'}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Read Aloud Button */}
                  <button
                    onClick={toggleSpeechPlayback}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isPlayingSpeech
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                    }`}
                  >
                    {isPlayingSpeech ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>အသံရပ်မည်</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>အသံဖြင့် ဖတ်ပြမည်</span>
                      </>
                    )}
                  </button>

                  {/* Teleprompter Button */}
                  <button
                    onClick={() =>
                      onOpenTeleprompter(
                        movie.voiceoverScript?.fullScript || movie.overview,
                        movie.title
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                    <span>Teleprompter ဖွင့်မည်</span>
                  </button>

                  {/* Copy Script */}
                  <button
                    onClick={handleCopyScript}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-neutral-950 transition-all cursor-pointer"
                  >
                    {copiedScript ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-neutral-950" />
                        <span>ကူးယူပြီးပါပြီ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-neutral-950" />
                        <span>ဇာတ်ညွှန်းကူးမည်</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Hook Card */}
              {movie.voiceoverScript?.hook && (
                <div className="bg-neutral-950 border border-amber-500/30 rounded-2xl p-4">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                    ⚡ ပထမဆုံး ၅ စက္ကန့် စွဲဆောင်မှု (Opening Hook):
                  </span>
                  <p className="text-sm sm:text-base font-semibold text-white italic">
                    "{movie.voiceoverScript.hook}"
                  </p>
                </div>
              )}

              {/* Full Script */}
              <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-4 sm:p-6 font-normal">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-800">
                  <span className="text-xs text-neutral-400">
                    အသံဖမ်းယူရန် အသင့်သုံး Spoken Script:
                  </span>
                  <span className="text-[11px] text-amber-400 font-mono">
                    စကားပြော အရှိန်အကူအညီများ [ ] ပါဝင်သည်
                  </span>
                </div>
                <div className="text-neutral-200 text-sm sm:text-base leading-relaxed space-y-3 whitespace-pre-line font-serif selection:bg-amber-500/20">
                  {movie.voiceoverScript?.fullScript || movie.overview}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TWIST & ENDING EXPLAINED */}
          {activeTab === 'twist' && (
            <div className="space-y-6">
              {/* Spoiler alert container */}
              <div className="relative">
                {!showTwistSpoiler ? (
                  <div className="bg-neutral-950/90 border-2 border-dashed border-red-500/40 rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
                      <AlertTriangle className="w-8 h-8 text-red-400" />
                    </div>
                    <h4 className="text-xl sm:text-2xl font-black text-white mb-2">
                      ⚠️ ဇာတ်သိမ်း လှည့်ကွက် သတိပေးချက် (Spoiler Alert)
                    </h4>
                    <p className="text-sm text-neutral-400 max-w-md mb-6 leading-relaxed">
                      ဤအပိုင်းတွင် ရုပ်ရှင်၏ အကြီးမားဆုံး အလှည့်အပြောင်းနှင့် လျှို့ဝှက်ချက် အားလုံး ပါဝင်ပါသည်။ သင် ရုပ်ရှင်မကြည့်ရသေးပါက သတိထားဖတ်ရှုပါ။
                    </p>
                    <button
                      onClick={() => setShowTwistSpoiler(true)}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-all cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>လှည့်ကွက်နှင့် ဇာတ်သိမ်း ရှင်းတမ်း ဖတ်မည်</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                      <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
                        <AlertTriangle className="w-4 h-4" />
                        <span>ဇာတ်သိမ်းနှင့် လှည့်ကွက် ခွဲခြမ်းစိတ်ဖြာချက်</span>
                      </div>
                      <button
                        onClick={() => setShowTwistSpoiler(false)}
                        className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>ပြန်လည်ဝှက်ထားမည်</span>
                      </button>
                    </div>

                    {/* Twist Summary Box */}
                    <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/30">
                      <span className="text-xs font-bold uppercase tracking-wider text-red-400 block mb-1">
                        💥 အဓိက လှည့်ကွက် (Core Twist):
                      </span>
                      <p className="text-sm sm:text-base font-semibold text-white leading-relaxed">
                        {movie.twistEnding?.twistSummary}
                      </p>
                    </div>

                    {/* Ending Explanation */}
                    <div className="p-5 sm:p-6 rounded-2xl bg-neutral-950 border border-neutral-800">
                      <h5 className="font-bold text-white text-base mb-3 flex items-center gap-2">
                        <span className="w-2 h-4 bg-amber-500 rounded-sm" />
                        ဇာတ်သိမ်းမှာ ဘာဖြစ်သွားခဲ့သလဲ? (Ending Explained)
                      </h5>
                      <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed whitespace-pre-line">
                        {movie.twistEnding?.endingExplanation}
                      </p>
                    </div>

                    {/* Hidden Clues / Easter Eggs */}
                    {movie.twistEnding?.hiddenClues && movie.twistEnding.hiddenClues.length > 0 && (
                      <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800">
                        <h5 className="font-bold text-amber-300 text-sm sm:text-base mb-3 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-400" />
                          ဇာတ်ကားထဲက ပရိသတ် သတိမထားမိနိုင်သော သဲလွန်စများနှင့် အရိပ်အမြွက်များ (Hidden Clues):
                        </h5>
                        <ul className="space-y-2.5">
                          {movie.twistEnding.hiddenClues.map((clue, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2.5 text-xs sm:text-sm text-neutral-300"
                            >
                              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <span>{clue}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: CREATOR PACK */}
          {activeTab === 'creator' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">
                  🎬 YouTube & TikTok Creator Pack
                </span>
                <p className="text-xs text-neutral-400">
                  Movie Recap ဗီဒီယို ဖန်တီးရာတွင် အသုံးပြုရန် ခေါင်းစဉ်၊ Thumbnail စိတ်ကူးနှင့် Hashtags များ
                </p>
              </div>

              {/* Video Title Suggestion */}
              <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                  📌 အကြံပြု ဗီဒီယိုခေါင်းစဉ် (High CTR Title):
                </span>
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                  <p className="text-sm sm:text-base font-bold text-amber-300">
                    {movie.creatorPack?.suggestedVideoTitle}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(movie.creatorPack?.suggestedVideoTitle || '');
                    }}
                    className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors shrink-0"
                    title="ခေါင်းစဉ် ကူးမည်"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Thumbnail Concept */}
              <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                  🎨 Thumbnail ရုပ်ပုံ စိတ်ကူးဒီဇိုင်း (Thumbnail Concept):
                </span>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed bg-neutral-900/60 p-4 rounded-xl border border-neutral-800/80">
                  {movie.creatorPack?.thumbnailConcept}
                </p>
              </div>

              {/* Hashtags */}
              <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    🏷️ Tags & Hashtags:
                  </span>
                  <button
                    onClick={handleCopyHashtags}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 text-neutral-950 transition-all cursor-pointer"
                  >
                    {copiedTags ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTags ? 'Tags ကူးပြီးပါပြီ' : 'အားလုံးကူးမည်'}</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {movie.creatorPack?.hashtags?.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2.5 py-1 rounded-lg bg-neutral-900 text-amber-300 border border-neutral-800 font-mono"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Retention Tip */}
              {movie.creatorPack?.retentionTip && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs sm:text-sm text-emerald-300">
                  <strong>💡 Audience Retention အကြံပြုချက်: </strong>
                  {movie.creatorPack.retentionTip}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
