import React from 'react';
import { Play, Sparkles, Star, Clock, Layers, ArrowRight } from 'lucide-react';
import { MovieRecap } from '../types';

interface HeroBannerProps {
  movie: MovieRecap;
  onSelectMovie: (movie: MovieRecap) => void;
  onOpenGenerator: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  movie,
  onSelectMovie,
  onOpenGenerator,
}) => {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-neutral-800/80 bg-neutral-900 shadow-2xl mb-8 sm:mb-12">
      {/* Background image & gradient overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={movie.backdropUrl || movie.posterUrl}
          alt={movie.title}
          className="w-full h-full object-cover object-center brightness-40 scale-105 filter blur-[1px]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-transparent" />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 p-5 sm:p-8 lg:p-12 max-w-4xl">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider shadow-sm">
            🔥 Featured Recap
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-neutral-900/90 text-amber-300 border border-amber-500/30">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            {movie.imdbRating}
          </span>
          <span className="flex items-center gap-1 text-xs text-neutral-300 px-2.5 py-1 rounded-md bg-neutral-900/80 border border-neutral-800">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            {movie.duration}
          </span>
          <span className="text-xs text-neutral-400 px-2 py-0.5 rounded bg-neutral-800/60">
            {movie.year}
          </span>
        </div>

        {/* Titles */}
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-2 drop-shadow-md">
          {movie.burmeseTitle ? `${movie.burmeseTitle} (${movie.title})` : movie.title}
        </h1>

        {/* Tagline */}
        <p className="text-sm sm:text-base font-semibold text-amber-300/90 italic mb-3">
          "{movie.tagline}"
        </p>

        {/* Logline */}
        <p className="text-xs sm:text-sm text-neutral-300 line-clamp-3 mb-6 max-w-2xl leading-relaxed">
          {movie.logline || movie.overview}
        </p>

        {/* Genre Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {movie.genre.map((g) => (
            <span
              key={g}
              className="text-xs px-2.5 py-1 rounded-lg bg-neutral-900/80 text-neutral-300 border border-neutral-700/60 font-medium"
            >
              {g}
            </span>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onSelectMovie(movie)}
            className="flex items-center gap-2.5 px-5 sm:px-6 py-3 rounded-xl font-bold text-sm text-neutral-950 bg-amber-400 hover:bg-amber-300 shadow-lg shadow-amber-500/25 transition-all transform active:scale-95 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-neutral-950 text-neutral-950" />
            <span>Recap ဇာတ်လမ်းအပြည့်ဖတ်ရန်</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenGenerator}
            className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm text-white bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>အခြားကား AI ဖြင့်ရေးခိုင်းမည်</span>
          </button>
        </div>
      </div>
    </div>
  );
};
