import React from 'react';
import { Film, Sparkles, Bookmark, Search, SlidersHorizontal } from 'lucide-react';

interface NavbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenGenerator: () => void;
  savedCount: number;
  showSavedOnly: boolean;
  setShowSavedOnly: (v: boolean) => void;
  selectedGenre: string;
  setSelectedGenre: (g: string) => void;
}

const GENRES = [
  'All',
  'Action',
  'Sci-Fi',
  'Thriller',
  'Horror',
  'Mystery',
  'Drama',
];

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  setSearchQuery,
  onOpenGenerator,
  savedCount,
  showSavedOnly,
  setShowSavedOnly,
  selectedGenre,
  setSelectedGenre,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-neutral-950/85 border-b border-neutral-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setSelectedGenre('All'); setShowSavedOnly(false); }}>
            <div className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/30">
              <Film className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-neutral-950 flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
                  CineRecap
                </span>
                <span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  MM
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-medium hidden sm:block">
                ရုပ်ရှင်ဇာတ်လမ်းစုံ အကျဉ်းချုပ် & AI Recap
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="ရုပ်ရှင်အမည်၊ ဒါရိုက်တာ သို့မဟုတ် ဇာတ်ကွက်ရှာဖွေပါ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-900/90 text-sm text-neutral-200 placeholder-neutral-500 pl-10 pr-4 py-2 rounded-xl border border-neutral-800 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            {/* Bookmarks toggle */}
            <button
              onClick={() => setShowSavedOnly(!showSavedOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-all ${
                showSavedOnly
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-neutral-900/80 text-neutral-300 border-neutral-800 hover:bg-neutral-850 hover:text-white'
              }`}
              title="သိမ်းဆည်းထားသော Recap များ"
            >
              <Bookmark className={`w-4 h-4 ${showSavedOnly ? 'fill-amber-400 text-amber-400' : 'text-neutral-400'}`} />
              <span className="hidden sm:inline">သိမ်းထားရာ</span>
              {savedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-neutral-950">
                  {savedCount}
                </span>
              )}
            </button>

            {/* AI Generator Button */}
            <button
              onClick={onOpenGenerator}
              className="group relative inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-neutral-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-amber-200 shadow-md shadow-amber-500/20 hover:shadow-amber-500/30 transition-all transform active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-neutral-950 group-hover:rotate-12 transition-transform" />
              <span className="font-bold">AI Recap ရေးမည်</span>
              <span className="hidden lg:inline text-[10px] bg-neutral-950/10 px-1 rounded uppercase font-extrabold">
                Gemini
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="pb-3 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="ရုပ်ရှင်အမည် ရှာရန်..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 text-xs text-neutral-200 placeholder-neutral-500 pl-9 pr-4 py-2 rounded-lg border border-neutral-800 focus:outline-none focus:border-amber-500/60"
            />
          </div>
        </div>

        {/* Genre Pill filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-0.5 scrollbar-none text-xs">
          <div className="flex items-center text-neutral-500 mr-1 text-[11px] font-medium shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1" />
            အမျိုးအစား:
          </div>
          {GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`shrink-0 px-3 py-1 rounded-full font-medium transition-all ${
                selectedGenre === genre
                  ? 'bg-amber-500 text-neutral-950 font-semibold shadow-sm shadow-amber-500/20'
                  : 'bg-neutral-900/90 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/90 border border-neutral-800/60'
              }`}
            >
              {genre === 'All' ? 'အားလုံး (All)' : genre}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
