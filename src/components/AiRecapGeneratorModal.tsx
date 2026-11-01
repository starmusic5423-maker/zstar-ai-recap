import React, { useState } from 'react';
import { Sparkles, X, Loader2, Film, CheckCircle2, AlertCircle } from 'lucide-react';
import { MovieRecap } from '../types';
import { CustomDarkDropdown } from './CustomDarkDropdown';

interface AiRecapGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecapGenerated: (newRecap: MovieRecap) => void;
}

const POPULAR_SUGGESTIONS = [
  'Oppenheimer',
  'The Dark Knight',
  'Fight Club',
  'Squid Game',
  'Avatar',
  'Spirited Away',
  'The Matrix',
  'Titanic',
  'John Wick',
  'Get Out',
];

export const AiRecapGeneratorModal: React.FC<AiRecapGeneratorModalProps> = ({
  isOpen,
  onClose,
  onRecapGenerated,
}) => {
  const [movieTitle, setMovieTitle] = useState('');
  const [year, setYear] = useState('');
  const [language, setLanguage] = useState<'burmese' | 'english' | 'dual'>('burmese');
  const [style, setStyle] = useState<'detailed' | 'voiceover' | 'fast' | 'twist_analysis' | 'horror'>('voiceover');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movieTitle.trim()) {
      setErrorMessage('ကျေးဇူးပြု၍ ရုပ်ရှင်အမည် ထည့်သွင်းပါ');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/recap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieTitle: movieTitle.trim(),
          year: year.trim(),
          language,
          style,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.details || data.error || 'Recap ဖန်တီးရာတွင် အဆင်မပြေဖြစ်သွားပါသည်');
      }

      const generated = data.recap;
      const newRecap: MovieRecap = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: generated.title || movieTitle,
        originalTitle: generated.originalTitle || movieTitle,
        burmeseTitle: generated.title?.includes('(') ? generated.title.split('(')[0].trim() : generated.title,
        year: generated.year || year || '2024',
        genre: Array.isArray(generated.genre) ? generated.genre : ['Drama', 'Thriller'],
        director: generated.director || 'Famous Director',
        duration: generated.duration || '2h 00m',
        imdbRating: generated.imdbRating || '8.2/10',
        posterUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&auto=format&fit=crop',
        backdropUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=1600&auto=format&fit=crop',
        tagline: generated.tagline || 'စိတ်လှုပ်ရှားဖွယ် ရုပ်ရှင်ဇာတ်လမ်း',
        logline: generated.logline || generated.overview?.slice(0, 150) || '',
        overview: generated.overview || '',
        characters: generated.characters || [],
        scenes: generated.scenes || [],
        twistEnding: generated.twistEnding || {
          hasMajorTwist: true,
          twistSummary: '',
          endingExplanation: '',
          hiddenClues: [],
        },
        voiceoverScript: generated.voiceoverScript || {
          hook: '',
          fullScript: generated.overview || '',
          estimatedNarrationTime: '၅ မိနစ်',
          toneRecommendation: 'စိတ်လှုပ်ရှားဖွယ်',
        },
        moralAndThemes: generated.moralAndThemes || [],
        creatorPack: generated.creatorPack || {
          suggestedVideoTitle: `${movieTitle} ဇာတ်လမ်းစုံအကျဉ်း | Movie Recap MM`,
          thumbnailConcept: `${movieTitle} ရဲ့ အဓိက ဇာတ်ကွက် အရေးပါပုံ`,
          hashtags: ['#MovieRecapMM', '#ရုပ်ရှင်ဇာတ်လမ်းအကျဉ်း', `#${movieTitle.replace(/\s+/g, '')}`],
        },
        isCustom: true,
        createdAt: new Date().toISOString(),
      };

      onRecapGenerated(newRecap);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Recap ထုတ်လုပ်ရာတွင် အမှားတစ်ခု ဖြစ်ပေါ်ခဲ့သည်');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden my-auto p-5 sm:p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-neutral-950 shadow-lg shadow-amber-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              AI Movie Recap Studio
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400">
              မည်သည့်ရုပ်ရှင်ကိုမဆို မြန်မာဘာသာဖြင့် ဇာတ်လမ်းအကျဉ်းနှင့် Voiceover Script ဖန်တီးပါ
            </p>
          </div>
        </div>

        {/* Error notice */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Movie Title Input */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
              🎬 ရုပ်ရှင်အမည် (Movie Title) <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              placeholder="ဥပမာ - Inception, Squid Game, John Wick, Avatar..."
              value={movieTitle}
              onChange={(e) => setMovieTitle(e.target.value)}
              disabled={isLoading}
              className="w-full bg-neutral-950 text-white text-sm sm:text-base px-4 py-3 rounded-xl border border-neutral-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder-neutral-600"
            />

            {/* Quick Suggestions */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-neutral-500 text-[11px]">အကြံပြု:</span>
              {POPULAR_SUGGESTIONS.map((sug) => (
                <button
                  type="button"
                  key={sug}
                  onClick={() => setMovieTitle(sug)}
                  disabled={isLoading}
                  className="px-2 py-0.5 rounded-md bg-neutral-800/70 hover:bg-neutral-800 text-neutral-300 hover:text-amber-300 text-[11px] border border-neutral-700/50 transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Release Year (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                📅 ထွက်ရှိသည့်ခုနှစ် (Year - စိတ်ကြိုက်)
              </label>
              <input
                type="text"
                placeholder="ဥပမာ - 2023, 2014..."
                value={year}
                onChange={(e) => setYear(e.target.value)}
                disabled={isLoading}
                className="w-full bg-neutral-950 text-white text-sm px-4 py-2.5 rounded-xl border border-neutral-800 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                🌐 ဘာသာစကား (Language)
              </label>
              <CustomDarkDropdown
                value={language}
                onChange={(val) => setLanguage(val as any)}
                disabled={isLoading}
                theme="amber"
                options={[
                  { value: 'burmese', label: 'မြန်မာဘာသာ (Burmese Narrative)', flag: '🇲🇲', badge: 'Default' },
                  { value: 'dual', label: 'မြန်မာ + English (Dual Subtitles)', flag: '🌐' },
                  { value: 'english', label: 'အင်္ဂလိပ်ဘာသာ (English)', flag: '🇺🇸' },
                ]}
              />
            </div>
          </div>

          {/* Recap Style Selector */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
              🎙️ Recap ပုံစံနှင့် ရည်ရွယ်ချက် (Recap Style)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  style === 'voiceover'
                    ? 'bg-amber-500/10 border-amber-500/50 text-white ring-1 ring-amber-500/20'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <input
                  type="radio"
                  name="style"
                  value="voiceover"
                  checked={style === 'voiceover'}
                  onChange={() => setStyle('voiceover')}
                  className="mt-1 accent-amber-500"
                />
                <div>
                  <span className="font-bold text-xs sm:text-sm block text-amber-300">
                    🎙️ YouTube/TikTok Voiceover Script
                  </span>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                    အသံသွင်းရန် အသင့်သုံး ဇာတ်လမ်းပြော စကားပြောဟန် ဇာတ်ညွှန်း
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  style === 'detailed'
                    ? 'bg-amber-500/10 border-amber-500/50 text-white ring-1 ring-amber-500/20'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <input
                  type="radio"
                  name="style"
                  value="detailed"
                  checked={style === 'detailed'}
                  onChange={() => setStyle('detailed')}
                  className="mt-1 accent-amber-500"
                />
                <div>
                  <span className="font-bold text-xs sm:text-sm block text-amber-300">
                    🎬 အသေးစိတ် ဇာတ်ကွက်စုံ (Detailed Breakdown)
                  </span>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                    ဇာတ်ကွက်တစ်ခုချင်းစီ အချိန်နှင့်တကွ ပြည့်စုံစွာ ခွဲခြမ်းစိတ်ဖြာချက်
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  style === 'fast'
                    ? 'bg-amber-500/10 border-amber-500/50 text-white ring-1 ring-amber-500/20'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <input
                  type="radio"
                  name="style"
                  value="fast"
                  checked={style === 'fast'}
                  onChange={() => setStyle('fast')}
                  className="mt-1 accent-amber-500"
                />
                <div>
                  <span className="font-bold text-xs sm:text-sm block text-amber-300">
                    ⚡ အချိန်တို ၃ မိနစ် Recap (Fast-Paced)
                  </span>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                    အဓိက အလှည့်အပြောင်းတွေကိုသာ တိုတိုတုတ်တုတ် ဆွဲဆောင်မှုရှိစွာ တင်ဆက်ခြင်း
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  style === 'twist_analysis'
                    ? 'bg-amber-500/10 border-amber-500/50 text-white ring-1 ring-amber-500/20'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <input
                  type="radio"
                  name="style"
                  value="twist_analysis"
                  checked={style === 'twist_analysis'}
                  onChange={() => setStyle('twist_analysis')}
                  className="mt-1 accent-amber-500"
                />
                <div>
                  <span className="font-bold text-xs sm:text-sm block text-amber-300">
                    🧠 လှည့်ကွက်နှင့် ဇာတ်သိမ်းရှင်းတမ်း (Ending Explained)
                  </span>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                    မသိမသာ ဖုံးကွယ်ထားသော သဲလွန်စများနှင့် လျှို့ဝှက်ချက် အားလုံး ရှင်းလင်းချက်
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !movieTitle.trim()}
              className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm sm:text-base text-neutral-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-amber-200 shadow-xl shadow-amber-500/20 transition-all transform active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-neutral-950" />
                  <span>Gemini AI ဖြင့် ဇာတ်လမ်း ရေးဖွဲ့နေပါသည် (ခေတ္တစောင့်ပါ)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-neutral-950" />
                  <span>Movie Recap စတင်ဖန်တီးမည်</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-neutral-500 mt-2">
              Gemini 3.8 Flash AI Model ကို အသုံးပြု၍ ဇာတ်လမ်း၊ ဇာတ်ကွက်များနှင့် ဇာတ်ညွှန်းများကို တိကျစွာ ရေးသားပေးပါသည်
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
