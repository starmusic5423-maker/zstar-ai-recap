import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  group?: string;
  flag?: string;
  badge?: string;
  badgeColor?: string;
  description?: string;
}

export interface CustomDarkDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  theme?: 'cyan' | 'purple' | 'blue' | 'slate' | 'amber' | 'emerald';
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export const CustomDarkDropdown: React.FC<CustomDarkDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  theme = 'cyan',
  className = '',
  buttonClassName = '',
  disabled = false,
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  // Theme borders and focus rings
  const themeStyles = {
    cyan: {
      buttonBorder: 'border-slate-700 hover:border-cyan-400 focus:border-cyan-400 focus:ring-cyan-500/30',
      activeBorder: 'border-cyan-400 ring-2 ring-cyan-500/25',
      popoverBorder: 'border-cyan-500/40',
      selectedBg: 'bg-cyan-500/15 text-cyan-300 font-semibold border-l-2 border-cyan-400',
      groupText: 'text-cyan-400',
      badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80',
      checkColor: 'text-cyan-400',
    },
    blue: {
      buttonBorder: 'border-slate-700 hover:border-blue-400 focus:border-blue-400 focus:ring-blue-500/30',
      activeBorder: 'border-blue-400 ring-2 ring-blue-500/25',
      popoverBorder: 'border-blue-500/40',
      selectedBg: 'bg-blue-500/15 text-blue-300 font-semibold border-l-2 border-blue-400',
      groupText: 'text-blue-400',
      badge: 'bg-blue-950/80 text-blue-300 border-blue-800/80',
      checkColor: 'text-blue-400',
    },
    purple: {
      buttonBorder: 'border-slate-700 hover:border-purple-400 focus:border-purple-400 focus:ring-purple-500/30',
      activeBorder: 'border-purple-400 ring-2 ring-purple-500/25',
      popoverBorder: 'border-purple-500/40',
      selectedBg: 'bg-purple-500/15 text-purple-300 font-semibold border-l-2 border-purple-400',
      groupText: 'text-purple-400',
      badge: 'bg-purple-950/80 text-purple-300 border-purple-800/80',
      checkColor: 'text-purple-400',
    },
    amber: {
      buttonBorder: 'border-slate-700 hover:border-amber-400 focus:border-amber-400 focus:ring-amber-500/30',
      activeBorder: 'border-amber-400 ring-2 ring-amber-500/25',
      popoverBorder: 'border-amber-500/40',
      selectedBg: 'bg-amber-500/15 text-amber-300 font-semibold border-l-2 border-amber-400',
      groupText: 'text-amber-400',
      badge: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
      checkColor: 'text-amber-400',
    },
    emerald: {
      buttonBorder: 'border-slate-700 hover:border-emerald-400 focus:border-emerald-400 focus:ring-emerald-500/30',
      activeBorder: 'border-emerald-400 ring-2 ring-emerald-500/25',
      popoverBorder: 'border-emerald-500/40',
      selectedBg: 'bg-emerald-500/15 text-emerald-300 font-semibold border-l-2 border-emerald-400',
      groupText: 'text-emerald-400',
      badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
      checkColor: 'text-emerald-400',
    },
    slate: {
      buttonBorder: 'border-slate-700 hover:border-slate-500 focus:border-slate-400 focus:ring-slate-500/30',
      activeBorder: 'border-slate-400 ring-2 ring-slate-500/25',
      popoverBorder: 'border-slate-700',
      selectedBg: 'bg-slate-800 text-white font-semibold border-l-2 border-slate-400',
      groupText: 'text-slate-300',
      badge: 'bg-slate-800 text-slate-300 border-slate-700',
      checkColor: 'text-slate-300',
    },
  }[theme];

  // Group options if any option has group
  const groupedOptions: { [group: string]: DropdownOption[] } = {};
  const hasGroups = options.some((opt) => !!opt.group);

  if (hasGroups) {
    options.forEach((opt) => {
      const g = opt.group || 'Options';
      if (!groupedOptions[g]) groupedOptions[g] = [];
      groupedOptions[g].push(opt);
    });
  }

  return (
    <div ref={containerRef} className={`relative w-full text-left ${className}`}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-[#0f172a] text-white text-xs sm:text-sm font-medium px-3.5 py-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-cyan-500/10 ${
          isOpen ? themeStyles.activeBorder : themeStyles.buttonBorder
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {selectedOption?.flag && <span className="text-base shrink-0">{selectedOption.flag}</span>}
          <span className={`truncate ${selectedOption ? 'text-slate-100 font-semibold' : 'text-slate-400'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${
                selectedOption.badgeColor || themeStyles.badge
              }`}
            >
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-cyan-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Options Popover */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 z-50 mt-1.5 bg-[#0f172a] border ${themeStyles.popoverBorder} rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden py-1 max-h-72 overflow-y-auto ring-1 ring-white/10 animate-fadeIn`}
          style={{ scrollbarWidth: 'thin' }}
        >
          {hasGroups ? (
            Object.entries(groupedOptions).map(([groupTitle, groupItems], gIdx) => (
              <div key={groupTitle} className={gIdx > 0 ? 'border-t border-slate-800/80 pt-1 mt-1' : ''}>
                <div className={`px-3 py-1.5 text-[11px] font-bold font-mono tracking-wider uppercase ${themeStyles.groupText} bg-slate-950/60 sticky top-0 backdrop-blur-md`}>
                  {groupTitle}
                </div>
                {groupItems.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`w-full px-3.5 py-2.5 text-left text-xs sm:text-sm flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? themeStyles.selectedBg
                          : 'text-slate-200 hover:bg-slate-800/90 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {opt.flag && <span className="text-base shrink-0">{opt.flag}</span>}
                        <div className="min-w-0">
                          <span className="block truncate font-medium">{opt.label}</span>
                          {opt.description && (
                            <span className="block text-[11px] text-slate-400 truncate mt-0.5">
                              {opt.description}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {opt.badge && (
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${opt.badgeColor || themeStyles.badge}`}>
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && <Check className={`w-4 h-4 ${themeStyles.checkColor} shrink-0`} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 text-left text-xs sm:text-sm flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? themeStyles.selectedBg
                      : 'text-slate-200 hover:bg-slate-800/90 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {opt.flag && <span className="text-base shrink-0">{opt.flag}</span>}
                    <div className="min-w-0">
                      <span className="block truncate font-medium">{opt.label}</span>
                      {opt.description && (
                        <span className="block text-[11px] text-slate-400 truncate mt-0.5">
                          {opt.description}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {opt.badge && (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${opt.badgeColor || themeStyles.badge}`}>
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && <Check className={`w-4 h-4 ${themeStyles.checkColor} shrink-0`} />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
