import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Snowflake, Type, Palette, Music, Maximize2, Settings } from 'lucide-react';

export default function ZStarRecapStudio() {
  const [activeTab, setActiveTab] = useState<'script' | 'voice' | 'editor'>('editor');
  const [activeTool, setActiveTool] = useState<string | null>(null);
  
  // Video & Timeline States
  const [isPlaying, setIsPlaying] = useState(false);
  const [filter, setFilter] = useState('none');
  const [volume, setVolume] = useState(100);
  
  // Subtitle Customization States
  const [subX, setSubX] = useState(0); // Left / Right
  const [subY, setSubY] = useState(20); // Top / Bottom
  const [subSize, setSubSize] = useState(16); // Font size
  const [subText, setSubText] = useState('AI Subtitles will appear here');

  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white font-sans overflow-hidden">
      {/* 1. TOP NAVIGATION TABS */}
      <div className="flex justify-around items-center bg-slate-900 border-b border-slate-800 p-2 text-xs font-semibold">
        <button 
          onClick={() => setActiveTab('script')}
          className={`px-3 py-1.5 rounded-full transition ${activeTab === 'script' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400'}`}>
          1. Script ထုတ်ရန်
        </button>
        <button 
          onClick={() => setActiveTab('voice')}
          className={`px-3 py-1.5 rounded-full transition ${activeTab === 'voice' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400'}`}>
          2. အသံသွင်းရန်
        </button>
        <button 
          onClick={() => setActiveTab('editor')}
          className={`px-3 py-1.5 rounded-full transition ${activeTab === 'editor' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400'}`}>
          3. Video တည်းဖြတ်ရန်
        </button>
      </div>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col justify-between overflow-y-auto">
        
        {/* 2. EDGE-TO-EDGE 16:9 YOUTUBE VIDEO PLAYER */}
        <div className="w-full bg-black flex flex-col items-center justify-center relative shadow-lg">
          <div className="w-full aspect-video relative overflow-hidden bg-slate-900 flex items-center justify-center">
            
            {/* Video Element */}
            <video 
              ref={videoRef}
              className="w-full h-full object-contain"
              style={{ filter: filter }}
              src="" 
            />

            {/* Subtitle Overlay Layer */}
            <div 
              className="absolute text-center bg-black/60 px-2 py-1 rounded text-yellow-300 font-bold pointer-events-none transition-all"
              style={{
                bottom: `${subY}%`,
                transform: `translateX(${subX}px)`,
                fontSize: `${subSize}px`
              }}
            >
              {subText}
            </div>

            {/* Simple Play Overlay */}
            {!isPlaying && (
              <button onClick={togglePlay} className="absolute bg-cyan-500/80 text-black p-3 rounded-full hover:scale-110 transition">
                <Play className="w-6 h-6 fill-black" />
              </button>
            )}
          </div>
        </div>

        {/* 3. POP-UP CONTROL SLIDERS (Appears above bottom toolbar when tool clicked) */}
        {activeTool && (
          <div className="bg-slate-900/95 border-t border-slate-800 p-3 px-4 text-xs">
            {activeTool === 'subtitles' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-slate-300 font-semibold">
                  <span>💬 Subtitle Settings</span>
                  <button onClick={() => setActiveTool(null)} className="text-cyan-400">Done</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">အပေါ်/အောက် (Y-Axis)</label>
                    <input type="range" min="5" max="80" value={subY} onChange={(e) => setSubY(Number(e.target.value))} className="w-full accent-cyan-400" />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">ဘယ်/ညာ (X-Axis)</label>
                    <input type="range" min="-100" max="100" value={subX} onChange={(e) => setSubX(Number(e.target.value))} className="w-full accent-cyan-400" />
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">စာလုံး အကြီး/အသေး ({subSize}px)</label>
                  <input type="range" min="12" max="32" value={subSize} onChange={(e) => setSubSize(Number(e.target.value))} className="w-full accent-cyan-400" />
                </div>
              </div>
            )}

            {activeTool === 'filters' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-slate-300 font-semibold mb-1">
                  <span>🎨 Color Filters</span>
                  <button onClick={() => setActiveTool(null)} className="text-cyan-400">Done</button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {[
                    { name: 'Normal', value: 'none' },
                    { name: 'Vibrant', value: 'saturate(180%) contrast(110%)' },
                    { name: 'Moody', value: 'contrast(130%) brightness(80%) sepia(20%)' },
                    { name: 'Vintage', value: 'sepia(50%) contrast(90%)' },
                    { name: 'B&W', value: 'grayscale(100%)' },
                  ].map((f) => (
                    <button 
                      key={f.name} 
                      onClick={() => setFilter(f.value)} 
                      className={`px-3 py-1.5 rounded-lg border text-xs whitespace-nowrap ${filter === f.value ? 'border-cyan-400 bg-cyan-950 text-cyan-300' : 'border-slate-700 bg-slate-800 text-slate-300'}`}>
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTool === 'audio' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-slate-300 font-semibold">
                  <span>🎵 Audio & Voiceover</span>
                  <button onClick={() => setActiveTool(null)} className="text-cyan-400">Done</button>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Volume ({volume}%)</label>
                  <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-full accent-cyan-400" />
                </div>
              </div>
            )}

            {activeTool === 'freeze' && (
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-300 font-semibold">❄️ Frame Frozen for 3 Seconds</span>
                <button onClick={() => setActiveTool(null)} className="bg-cyan-500 text-black px-3 py-1 rounded font-bold">Apply</button>
              </div>
            )}
          </div>
        )}

        {/* 4. CAPCUT-STYLE BOTTOM TOOLBAR */}
        <div className="bg-slate-900 border-t border-slate-800 p-2 flex justify-around items-center overflow-x-auto">
          <button 
            onClick={() => setActiveTool(activeTool === 'freeze' ? null : 'freeze')}
            className={`flex flex-col items-center gap-1 p-2 min-w-[60px] rounded-lg transition ${activeTool === 'freeze' ? 'text-cyan-400 bg-slate-800' : 'text-slate-400 hover:text-white'}`}>
            <Snowflake className="w-5 h-5" />
            <span className="text-[10px]">Freeze</span>
          </button>

          <button 
            onClick={() => setActiveTool(activeTool === 'subtitles' ? null : 'subtitles')}
            className={`flex flex-col items-center gap-1 p-2 min-w-[60px] rounded-lg transition ${activeTool === 'subtitles' ? 'text-cyan-400 bg-slate-800' : 'text-slate-400 hover:text-white'}`}>
            <Type className="w-5 h-5" />
            <span className="text-[10px]">Subtitles</span>
          </button>

          <button 
            onClick={() => setActiveTool(activeTool === 'filters' ? null : 'filters')}
            className={`flex flex-col items-center gap-1 p-2 min-w-[60px] rounded-lg transition ${activeTool === 'filters' ? 'text-cyan-400 bg-slate-800' : 'text-slate-400 hover:text-white'}`}>
            <Palette className="w-5 h-5" />
            <span className="text-[10px]">Filters</span>
          </button>

          <button 
            onClick={() => setActiveTool(activeTool === 'audio' ? null : 'audio')}
            className={`flex flex-col items-center gap-1 p-2 min-w-[60px] rounded-lg transition ${activeTool === 'audio' ? 'text-cyan-400 bg-slate-800' : 'text-slate-400 hover:text-white'}`}>
            <Music className="w-5 h-5" />
            <span className="text-[10px]">Audio</span>
          </button>
        </div>

      </div>
    </div>
  );
}
 
