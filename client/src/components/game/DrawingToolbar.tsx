import React, { useState, useRef, useEffect } from 'react';
import { 
  Pencil, 
  Paintbrush, 
  Eraser, 
  Minus, 
  Square, 
  Circle as CircleIcon, 
  PaintBucket, 
  Undo2, 
  Trash2,
  Pipette,
  Check,
  X
} from 'lucide-react';
import { DrawingTool } from '../../types/game.js';
import { useGame } from '../../context/GameContext.js';
import { sounds } from '../../audio/SoundEngine.js';

interface DrawingToolbarProps {
  currentTool: DrawingTool;
  setTool: (tool: DrawingTool) => void;
  currentColor: string;
  setColor: (color: string) => void;
  brushSize: number;
  setSize: (size: number) => void;
}

const PALETTE = [
  '#000000', '#4b5563', '#9ca3af', '#ffffff',
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#10b981', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#ec4899', '#78350f',
];

const SIZES = [
  { label: 'XS', value: 3 },
  { label: 'S', value: 6 },
  { label: 'M', value: 12 },
  { label: 'L', value: 24 },
  { label: 'XL', value: 40 },
];

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  currentTool,
  setTool,
  currentColor,
  setColor,
  brushSize,
  setSize,
}) => {
  const { sendUndo, sendClear } = useGame();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const sizePickerRef = useRef<HTMLDivElement | null>(null);

  // Close size picker on outside tap/click
  useEffect(() => {
    if (!showSizePicker) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (sizePickerRef.current && !sizePickerRef.current.contains(e.target as Node)) {
        setShowSizePicker(false);
      }
    };

    // Small delay ensures the tap that opened the picker does not trigger immediate dismissal
    const timer = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
      document.addEventListener('touchend', handleOutsideClick);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('touchend', handleOutsideClick);
    };
  }, [showSizePicker]);

  const handleToolClick = (t: DrawingTool) => {
    sounds.playPop();
    setTool(t);
  };

  const handleColorClick = (c: string) => {
    sounds.playPop();
    setColor(c);
    if (currentTool === 'eraser') {
      setTool('brush');
    }
  };

  const handleUndo = () => {
    sounds.playPop();
    sendUndo();
  };

  const handleClear = () => {
    sounds.playPop();
    sendClear();
    setShowClearConfirm(false);
  };

  const currentSizeObj = SIZES.find(s => s.value === brushSize) || SIZES[1];

  const renderToolButton = (tool: DrawingTool, icon: React.ReactNode, title: string) => (
    <button
      key={tool}
      type="button"
      onClick={() => handleToolClick(tool)}
      title={title}
      className={`h-8 w-8 sm:h-9 sm:w-9 rounded-md flex items-center justify-center transition-all ${
        currentTool === tool
          ? 'bg-blue-500 text-white shadow-sm ring-1 ring-blue-600 scale-105'
          : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800'
      }`}
    >
      {icon}
    </button>
  );

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-1.5 py-1 sm:px-3 sm:py-1.5 flex flex-col gap-1 select-none shadow-xs">
      {/* ROW 1: Tools, Size Selector Popover, Undo & Clear */}
      <div className="flex items-center justify-between gap-1 w-full relative">
        {/* Drawing Tools Group */}
        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
          {renderToolButton('pencil', <Pencil className="w-4 h-4" />, 'Pencil')}
          {renderToolButton('brush', <Paintbrush className="w-4 h-4" />, 'Brush')}
          {renderToolButton('eraser', <Eraser className="w-4 h-4" />, 'Eraser')}
          {renderToolButton('bucket', <PaintBucket className="w-4 h-4" />, 'Flood Fill')}
          {renderToolButton('line', <Minus className="w-4 h-4" />, 'Line')}
          {renderToolButton('rectangle', <Square className="w-4 h-4" />, 'Rectangle')}
          {renderToolButton('circle', <CircleIcon className="w-4 h-4" />, 'Circle')}
        </div>

        {/* Action Controls & Popover Anchor */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Size Selector Button with Popover */}
          <div className="relative" ref={sizePickerRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                sounds.playPop();
                setShowSizePicker(prev => !prev);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title={`Brush & Eraser Size: ${currentSizeObj.label} (${currentSizeObj.value}px)`}
              className={`h-8 px-2 sm:h-9 rounded-md border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                showSizePicker
                  ? 'bg-blue-500 text-white border-blue-600 shadow-sm ring-2 ring-blue-300'
                  : 'border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:border-blue-400'
              }`}
            >
              <div
                className="rounded-full bg-current shrink-0"
                style={{
                  width: Math.max(4, Math.min(12, brushSize * 0.4)),
                  height: Math.max(4, Math.min(12, brushSize * 0.4)),
                }}
              />
              <span className="text-[11px] sm:text-xs font-black leading-none">{currentSizeObj.label}</span>
            </button>

            {/* Size Popover */}
            {showSizePicker && (
              <div
                className="absolute bottom-full mb-2.5 right-0 z-50 bg-white dark:bg-slate-800 border-2 border-blue-500 dark:border-blue-400 rounded-xl shadow-2xl p-2.5 min-w-[220px] select-none animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {/* Downward triangle/arrow pointing to the trigger button */}
                <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-white dark:bg-slate-800 border-r-2 border-b-2 border-blue-500 dark:border-blue-400 rotate-45 pointer-events-none" />

                {/* Header */}
                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-gray-100 dark:border-slate-700">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 dark:text-slate-200">
                    Brush & Eraser Size
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSizePicker(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-0.5 rounded transition-colors"
                    title="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 5 Preset Sizes */}
                <div className="flex items-center justify-between gap-1.5">
                  {SIZES.map((s) => {
                    const isSelected = brushSize === s.value;
                    const dotDiameter = s.value === 3 ? 4 : s.value === 6 ? 7 : s.value === 12 ? 12 : s.value === 24 ? 18 : 24;

                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          sounds.playPop();
                          setSize(s.value);
                          setShowSizePicker(false);
                        }}
                        title={`Size ${s.label} (${s.value}px)`}
                        className={`h-12 flex-1 rounded-lg flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                          isSelected
                            ? 'bg-blue-500 text-white font-black shadow-md ring-2 ring-blue-300 scale-105 z-10'
                            : 'bg-gray-100 dark:bg-slate-700/60 text-gray-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 border border-transparent hover:border-blue-300'
                        }`}
                      >
                        <div
                          className="rounded-full bg-current transition-transform"
                          style={{
                            width: `${dotDiameter}px`,
                            height: `${dotDiameter}px`,
                          }}
                        />
                        <span className="text-[9px] font-bold leading-none">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Thin Divider */}
          <div className="w-px h-5 bg-gray-300 dark:bg-slate-700 mx-0.5" />

          {/* Undo */}
          <button
            type="button"
            onClick={handleUndo}
            title="Undo stroke"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-md text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all active:scale-95"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          {/* Clear with Confirmation */}
          {showClearConfirm ? (
            <div className="flex items-center gap-0.5 bg-red-50 dark:bg-red-950/60 p-0.5 rounded-md border border-red-300 dark:border-red-600/60">
              <button
                type="button"
                onClick={handleClear}
                title="Confirm Clear"
                className="h-7 px-1.5 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold rounded flex items-center gap-0.5"
              >
                <Check className="w-3 h-3" />
                <span>Clear</span>
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                title="Cancel"
                className="h-7 w-6 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              title="Clear canvas"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-md text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center transition-all active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ROW 2: Compact Color Palette & Custom Pipette */}
      <div className="flex items-center justify-between gap-1 w-full overflow-x-auto no-scrollbar py-0.5">
        <div className="flex items-center gap-1 sm:gap-1.5 flex-1 justify-between">
          {PALETTE.map((c) => {
            const isSelected = currentColor.toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                onClick={() => handleColorClick(c)}
                className={`h-5 w-5 sm:h-6 sm:w-6 rounded-md transition-all shrink-0 relative ${
                  isSelected
                    ? 'ring-2 ring-blue-500 dark:ring-blue-400 scale-110 z-10 shadow-sm'
                    : 'hover:scale-105 opacity-90 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: c,
                  border: c === '#ffffff' ? '1.5px solid #CBD5E1' : '1px solid rgba(0,0,0,0.1)',
                }}
              />
            );
          })}

          {/* Custom Color Pipette */}
          <div
            className="relative h-5 w-5 sm:h-6 sm:w-6 rounded-md overflow-hidden ring-1 ring-gray-400 dark:ring-slate-600 shrink-0 flex items-center justify-center cursor-pointer shadow-sm hover:scale-105 transition-transform"
            style={{ backgroundColor: currentColor }}
            title="Custom Color"
          >
            <input
              type="color"
              value={currentColor}
              onChange={(e) => {
                setColor(e.target.value);
                if (currentTool === 'eraser') setTool('brush');
              }}
              className="absolute -inset-2 w-10 h-10 cursor-pointer opacity-0"
            />
            <Pipette className="w-3 h-3 text-white drop-shadow pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};
