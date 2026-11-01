import React, { useState } from 'react';
import {
  Archive,
  Download,
  X,
  FileText,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Film,
  Sparkles,
  Bookmark,
  Check,
} from 'lucide-react';
import { MovieRecap } from '../types';
import { exportRecapsAsZip, BatchExportOptions } from '../utils/batchExport';

interface BatchExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRecaps: MovieRecap[];
  onRemoveFromSelection?: (id: string) => void;
  onClearSelection?: () => void;
}

export const BatchExportModal: React.FC<BatchExportModalProps> = ({
  isOpen,
  onClose,
  selectedRecaps,
  onRemoveFromSelection,
  onClearSelection,
}) => {
  const [includeTxtScript, setIncludeTxtScript] = useState(true);
  const [includeSrtSubtitles, setIncludeSrtSubtitles] = useState(true);
  const [includeVttSubtitles, setIncludeVttSubtitles] = useState(true);
  const [includeJsonMetadata, setIncludeJsonMetadata] = useState(true);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentProgressItem, setCurrentProgressItem] = useState('');
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    if (selectedRecaps.length === 0) {
      setErrorMsg('ကျေးဇူးပြု၍ ဒေါင်းလုဒ်ဆွဲမည့် ရုပ်ရှင်ဇာတ်ကား အနည်းဆုံးတစ်ခု ရွေးချယ်ပေးပါ');
      return;
    }

    if (!includeTxtScript && !includeSrtSubtitles && !includeVttSubtitles && !includeJsonMetadata) {
      setErrorMsg('ကျေးဇူးပြု၍ ထည့်သွင်းမည့် ဖိုင်အမျိုးအစား အနည်းဆုံးတစ်ခုကို ရွေးချယ်ပါ');
      return;
    }

    try {
      setIsExporting(true);
      setErrorMsg(null);
      setExportSuccess(null);
      setExportProgress(10);
      setCurrentProgressItem('ဖိုင်များ ပြင်ဆင်နေပါသည်...');

      const options: BatchExportOptions = {
        includeTxtScript,
        includeSrtSubtitles,
        includeVttSubtitles,
        includeJsonMetadata,
        onProgress: (percent, currentItem) => {
          setExportProgress(percent);
          setCurrentProgressItem(currentItem);
        },
      };

      const result = await exportRecapsAsZip(selectedRecaps, options);

      setExportSuccess(
        `ရုပ်ရှင် (${selectedRecaps.length}) ကားအတွက် ဇာတ်ညွှန်းနှင့် Subtitle ဖိုင်များကို ZIP အဖြစ် အောင်မြင်စွာ ဒေါင်းလုဒ်ဆွဲပြီးပါပြီ!`
      );
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'ZIP ဖိုင် ထုတ်ယူရာတွင် အမှားတစ်ခု ဖြစ်ပေါ်ခဲ့သည်');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#080d18] border border-cyan-500/40 rounded-3xl shadow-2xl shadow-cyan-950/50 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-[#0b1322]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/20">
              <Archive className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white flex items-center gap-2">
                <span>Batch ZIP Export (စုစည်းဒေါင်းလုဒ်)</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono">
                  {selectedRecaps.length} Movies
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                ရွေးချယ်ထားသော ဇာတ်ကားများ၏ Scripts နှင့် Subtitles (.srt) များကို ZIP တစ်ခုတည်းဖြင့် ထုတ်ယူမည်
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Export File Format Options */}
          <div className="bg-[#0b1322] border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-3">
            <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">
              ZIP အတွင်း ထည့်သွင်းမည့် ဖိုင်ပုံစံများ (EXPORT FORMATS)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* .txt Master Script */}
              <label
                onClick={() => setIncludeTxtScript(!includeTxtScript)}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  includeTxtScript
                    ? 'bg-sky-950/60 border-cyan-400/80 text-white shadow-sm'
                    : 'bg-[#080d18] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 mt-0.5 rounded-md flex items-center justify-center shrink-0 border ${
                    includeTxtScript
                      ? 'bg-cyan-400 border-cyan-400 text-slate-950'
                      : 'border-slate-600 bg-slate-900'
                  }`}
                >
                  {includeTxtScript && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div>
                  <span className="font-bold text-xs sm:text-sm text-cyan-200 block">
                    📄 Production Script (.txt)
                  </span>
                  <span className="text-[11px] text-slate-400 leading-snug block mt-0.5">
                    Viral Hook၊ မြန်မာဘာသာ ဇာတ်ညွှန်းအပြည့်အစုံ၊ အချိန်မှတ်နှင့် Creator Pack
                  </span>
                </div>
              </label>

              {/* .srt Subtitles */}
              <label
                onClick={() => setIncludeSrtSubtitles(!includeSrtSubtitles)}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  includeSrtSubtitles
                    ? 'bg-sky-950/60 border-cyan-400/80 text-white shadow-sm'
                    : 'bg-[#080d18] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 mt-0.5 rounded-md flex items-center justify-center shrink-0 border ${
                    includeSrtSubtitles
                      ? 'bg-cyan-400 border-cyan-400 text-slate-950'
                      : 'border-slate-600 bg-slate-900'
                  }`}
                >
                  {includeSrtSubtitles && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div>
                  <span className="font-bold text-xs sm:text-sm text-cyan-200 block">
                    🎬 SubRip Subtitles (.srt)
                  </span>
                  <span className="text-[11px] text-slate-400 leading-snug block mt-0.5">
                    CapCut, Adobe Premiere, DaVinci Resolve တိုက်ရိုက် ထည့်သွင်းနိုင်သော စာတန်းထိုးဖိုင်
                  </span>
                </div>
              </label>

              {/* .vtt WebVTT */}
              <label
                onClick={() => setIncludeVttSubtitles(!includeVttSubtitles)}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  includeVttSubtitles
                    ? 'bg-sky-950/60 border-cyan-400/80 text-white shadow-sm'
                    : 'bg-[#080d18] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 mt-0.5 rounded-md flex items-center justify-center shrink-0 border ${
                    includeVttSubtitles
                      ? 'bg-cyan-400 border-cyan-400 text-slate-950'
                      : 'border-slate-600 bg-slate-900'
                  }`}
                >
                  {includeVttSubtitles && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div>
                  <span className="font-bold text-xs sm:text-sm text-cyan-200 block">
                    🌐 WebVTT Subtitles (.vtt)
                  </span>
                  <span className="text-[11px] text-slate-400 leading-snug block mt-0.5">
                    Web Video Player များနှင့် TikTok/Reels အတွက် ခေတ်မီစာတန်းထိုး
                  </span>
                </div>
              </label>

              {/* .json Data */}
              <label
                onClick={() => setIncludeJsonMetadata(!includeJsonMetadata)}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  includeJsonMetadata
                    ? 'bg-sky-950/60 border-cyan-400/80 text-white shadow-sm'
                    : 'bg-[#080d18] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 mt-0.5 rounded-md flex items-center justify-center shrink-0 border ${
                    includeJsonMetadata
                      ? 'bg-cyan-400 border-cyan-400 text-slate-950'
                      : 'border-slate-600 bg-slate-900'
                  }`}
                >
                  {includeJsonMetadata && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div>
                  <span className="font-bold text-xs sm:text-sm text-cyan-200 block">
                    📊 Structured Recap Data (.json)
                  </span>
                  <span className="text-[11px] text-slate-400 leading-snug block mt-0.5">
                    အချက်အလက်အပြည့်အစုံ (Characters, Scenes, Metadata)
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Selected Movies List Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                ရွေးချယ်ထားသော ရုပ်ရှင်များ ({selectedRecaps.length})
              </label>
              {onClearSelection && (
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="text-[11px] text-slate-400 hover:text-rose-400 font-medium transition-colors cursor-pointer"
                >
                  အားလုံး ပြန်ဖျက်မည်
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {selectedRecaps.map((movie, idx) => (
                <div
                  key={movie.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#0b1322] border border-slate-800/80 text-xs text-slate-300 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 font-mono text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    {movie.posterUrl && (
                      <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        className="w-7 h-10 object-cover rounded shrink-0 bg-slate-950"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">
                        {movie.burmeseTitle || movie.title}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {movie.title} ({movie.year}) • {movie.director}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-cyan-300 border border-cyan-800/50 font-mono">
                      {movie.subtitles?.length || 'Auto'} Cues
                    </span>
                    {onRemoveFromSelection && (
                      <button
                        type="button"
                        onClick={() => onRemoveFromSelection(movie.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="ဖယ်ရှားမည်"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Indicator while exporting */}
          {isExporting && (
            <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-300">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>{currentProgressItem || 'Processing...'}</span>
                </span>
                <span>{exportProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success Banner */}
          {exportSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 flex items-start gap-3 text-xs text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-emerald-200">ဒေါင်းလုဒ် အောင်မြင်ပါသည်!</span>
                <span>{exportSuccess}</span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/50 flex items-center gap-3 text-xs text-rose-300">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-slate-800 bg-[#0b1322] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            ပိတ်မည် (Close)
          </button>

          <button
            type="button"
            onClick={handleStartExport}
            disabled={isExporting || selectedRecaps.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-xl shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>ZIP ဖိုင် ထုတ်ယူနေပါသည်...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-slate-950" />
                <span>EXPORT ZIP ARCHIVE ({selectedRecaps.length})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
