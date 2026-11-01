import React, { useState } from 'react';
import { MovieRecap } from './types';
import ZStarRecapStudio from './components/ZStarRecapStudio';
import { TeleprompterModal } from './components/TeleprompterModal';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [activeStudioRecap, setActiveStudioRecap] = useState<MovieRecap | null>(null);
  const [teleprompterData, setTeleprompterData] = useState<{
    isOpen: boolean;
    script: string;
    title: string;
  }>({ isOpen: false, script: '', title: '' });

  const handleRecapReady = (newRecap: MovieRecap) => {
    setActiveStudioRecap(newRecap);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#040812] text-slate-100 flex flex-col font-sans selection:bg-[#00F0FF] selection:text-slate-950">
      {/* Slim Borderless Top Navigation Bar with Minimal Vertical Space */}
      <header className="sticky top-0 z-40 bg-[#040812] px-3 sm:px-6 py-1 flex items-center">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center">
            {/* Slim, Borderless Brand Logo */}
            <img
              src="/1000025092.png"
              alt="Z STAR MOVIE RECAP STUDIO"
              className="h-8 sm:h-10 w-auto max-w-[220px] sm:max-w-[280px] object-contain"
              loading="eager"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/40 text-cyan-300 border border-cyan-500/20 text-[10px] font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>AI Movie Dubbing Suite</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Studio Viewport (Pure Single-Page Experience) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3">
        <ZStarRecapStudio
          onRecapReady={handleRecapReady}
          initialRecap={activeStudioRecap}
          onOpenTeleprompter={(script, title) =>
            setTeleprompterData({ isOpen: true, script, title })
          }
        />
      </main>

      {/* Teleprompter Modal */}
      <TeleprompterModal
        isOpen={teleprompterData.isOpen}
        onClose={() => setTeleprompterData({ isOpen: false, script: '', title: '' })}
        script={teleprompterData.script}
        movieTitle={teleprompterData.title}
      />
    </div>
    </ErrorBoundary>
  );
}
