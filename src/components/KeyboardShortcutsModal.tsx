import React from 'react';
import { X, Command, Keyboard, ArrowRight } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMac?: boolean;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  isMac = false,
}) => {
  if (!isOpen) return null;

  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcutGroups = [
    {
      category: 'Navigation (တက်ဘ်များ ကူးပြောင်းခြင်း)',
      items: [
        { keys: [modKey, '1'], description: 'Home တက်ဘ်သို့ ကူးပြောင်းမည် (Browse & Batch Recaps)' },
        { keys: [modKey, '2'], description: 'Create Recap စတူဒီယိုသို့ ကူးပြောင်းမည် (Video & AI Generation)' },
        { keys: [modKey, '3'], description: 'Account & Settings တက်ဘ်သို့ ကူးပြောင်းမည်' },
      ],
    },
    {
      category: 'Batch Export & Actions (အမြန်လုပ်ဆောင်ချက်များ)',
      items: [
        { keys: [modKey, 'E'], description: 'Batch Export ZIP Modal ချက်ချင်း ဖွင့်မည်' },
        { keys: [modKey, 'B'], description: 'Batch Selection Mode ဖွင့်/ပိတ်မည် (Toggle Select)' },
        { keys: [modKey, 'S'], description: 'သိမ်းဆည်းထားသော (Saved) ဇာတ်ကားအားလုံး ရွေးချယ်မည်' },
        { keys: ['/'], description: 'ဇာတ်ကားရှာဖွေရန် Search Bar သို့ Focus ပြုလုပ်မည်' },
      ],
    },
    {
      category: 'General & Windows (အထွေထွေ)',
      items: [
        { keys: ['Esc'], description: 'ဖွင့်ထားသော Modal များကို ပိတ်မည် (Close modal / Deselect)' },
        { keys: [modKey, '/'], description: 'Keyboard Shortcuts လမ်းညွှန် ဖွင့်/ပိတ်မည်' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#080d18] border border-cyan-500/40 rounded-3xl shadow-2xl shadow-cyan-950/60 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-[#0b1322]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/20">
              <Keyboard className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white flex items-center gap-2">
                <span>Keyboard Shortcuts (ကီးဘုတ် ဖြတ်လမ်းများ)</span>
              </h3>
              <p className="text-xs text-slate-400">
                အချိန်ကုန်သက်သာစေရန် တစ်ချက်နှိပ် ဖြတ်လမ်းများ
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {shortcutGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-2.5">
              <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                {group.category}
              </h4>
              <div className="space-y-1.5">
                {group.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#0b1322] border border-slate-800/80 text-xs hover:border-slate-700 transition-colors"
                  >
                    <span className="text-slate-300 font-medium">
                      {item.description}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, kIdx) => (
                        <React.Fragment key={kIdx}>
                          <kbd className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 font-mono font-bold text-[11px] shadow-sm min-w-[24px] text-center inline-block">
                            {k}
                          </kbd>
                          {kIdx < item.keys.length - 1 && (
                            <span className="text-slate-600 text-xs">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#0b1322] flex items-center justify-between text-xs text-slate-400">
          <span>💡 ကီးဘုတ်ပေါ်မှ <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-[10px]">Esc</kbd> နှိပ်၍ ပိတ်နိုင်ပါသည်</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            နားလည်ပါပြီ
          </button>
        </div>
      </div>
    </div>
  );
};
