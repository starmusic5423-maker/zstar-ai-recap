import React from 'react';
import { Star, Clock, Bookmark, Layers, Mic, Eye, Sparkles, Check } from 'lucide-react';
import { MovieRecap } from '../types';

interface RecapCardProps {
  movie: MovieRecap;
  onSelect: (movie: MovieRecap) => void;
  isSaved: boolean;
  onToggleSave: (id: string, e: React.MouseEvent) => void;
  isBatchMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string, e: React.MouseEvent) => void;
}

export const RecapCard: React.FC<RecapCardProps> = ({
  movie,
  onSelect,
  isSaved,
  onToggleSave,
  isBatchMode = false,
  isSelected = false,
  onToggleSelect,
}) => {
  const handleCardClick = (e: React.MouseEvent) => {
    if (isBatchMode && onToggleSelect) {
      onToggleSelect(movie.id, e);
    } else {
      onSelect(movie);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer flex-1 border ${
        isSelected
          ? 'bg-[#09152a] border-cyan-400 ring-2 ring-cyan-400/60 shadow-xl shadow-cyan-500/20'
          : 'bg-neutral-900/70 hover:bg-neutral-900 border-neutral-800/80 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/10'
      }`}
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[16/10] sm:aspect-[16/9] overflow-hidden bg-neutral-950">
        <img
          src={movie.posterUrl || movie.backdropUrl}
          alt={movie.title}
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent" />

        {/* Top Badges & Actions */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5">
            {/* Batch Selection Checkbox */}
            {isBatchMode && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect?.(movie.id, e);
                }}
                className={`pointer-events-auto w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-md backdrop-blur-md ${
                  isSelected
                    ? 'bg-cyan-400 text-slate-950 ring-2 ring-cyan-300'
                    : 'bg-neutral-950/80 border border-neutral-600 text-transparent hover:border-cyan-400'
                }`}
                title={isSelected ? 'ရွေးချယ်ထားမှုကို ဖယ်ရှားမည်' : 'ရွေးချယ်မည်'}
              >
                <Check className={`w-3.5 h-3.5 stroke-[3] ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
              </button>
            )}

            {movie.isCustom && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-600/90 text-white shadow-sm backdrop-blur-md">
                <Sparkles className="w-3 h-3" />
                AI Generated
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-900/90 text-amber-300 border border-amber-500/30 backdrop-blur-md">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {movie.imdbRating || '8.0/10'}
            </span>
          </div>

          {/* Bookmark Button */}
          <button
            type="button"
            onClick={(e) => onToggleSave(movie.id, e)}
            className="pointer-events-auto p-1.5 rounded-lg bg-neutral-950/80 hover:bg-neutral-800 text-neutral-300 border border-neutral-700/60 backdrop-blur-md transition-colors"
            title={isSaved ? 'သိမ်းဆည်းမှု ပယ်ဖျက်မည်' : 'သိမ်းဆည်းမည်'}
          >
            <Bookmark
              className={`w-4 h-4 transition-colors ${
                isSaved ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'
              }`}
            />
          </button>
        </div>

        {/* Bottom Poster Info (Duration & Scenes) */}
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-neutral-300 font-medium">
          <span className="flex items-center gap-1 bg-neutral-950/70 px-2 py-0.5 rounded backdrop-blur-sm">
            <Clock className="w-3 h-3 text-neutral-400" />
            {movie.duration}
          </span>
          <span className="flex items-center gap-1 bg-neutral-950/70 px-2 py-0.5 rounded backdrop-blur-sm text-amber-300/90">
            <Layers className="w-3 h-3" />
            {movie.scenes?.length || 4} ဇာတ်ကွက်
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Genre Chips */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {movie.genre?.slice(0, 3).map((g) => (
              <span
                key={g}
                className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-800/80 text-neutral-400 font-medium"
              >
                {g}
              </span>
            ))}
            <span className="text-[10px] text-neutral-500 font-mono ml-auto">
              {movie.year}
            </span>
          </div>

          {/* Titles */}
          <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-amber-300 transition-colors line-clamp-1 mb-1">
            {movie.burmeseTitle ? `${movie.burmeseTitle}` : movie.title}
          </h3>
          <p className="text-xs text-neutral-400 font-medium line-clamp-1 mb-2">
            {movie.title} • {movie.director}
          </p>

          {/* Logline */}
          <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mb-3">
            {movie.logline || movie.overview}
          </p>
        </div>

        {/* Footer info: Voiceover status & Button */}
        <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
            <Mic className="w-3.5 h-3.5" />
            <span>ဇာတ်ညွှန်းပါရှိ</span>
          </div>
          <span className="text-amber-400 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
            ဖတ်ရှုရန် →
          </span>
        </div>
      </div>
    </div>
  );
};
