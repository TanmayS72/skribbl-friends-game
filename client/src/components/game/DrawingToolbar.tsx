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

  // Close size picker on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (sizePickerRef.current && !sizePickerRef.current.contains(e.target as Node)) {
        setShowSizePicker(false);
      }
    };
    if (showSizePicker) {
      document.addEventListener('pointerdown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
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
    <div className="w-full bg-white dark:bg-slate-900 border-t-2 border-blue-400 dark:border-blue-600/60 px-1.5 py-1 sm:px-3 sm:py-1.5 flex flex-col gap-1 select-none shadow-sm">
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
              onClick={() => setShowSizePicker(prev => !prev)}
              title={`Brush Size: ${currentSizeObj.label}`}
              className="h-8 px-2 sm:h-9 rounded-md border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 flex items-center gap-1 text-xs font-bold hover:border-blue-400 transition-colors"
            >
              <div
                className="rounded-full bg-current"
                style={{ width: Math.max(3, Math.min(12, brushSize * 0.4)), height: Math.max(3, Math.min(12, brushSize * 0.4)) }}
              />
              <span className="text-[10px] sm:text-xs">{currentSizeObj.label}</span>
            </button>

            {/* Size Popover */}
            {showSizePicker && (
              <div className="absolute bottom-full mb-1.5 right-0 z-50 bg-white dark:bg-slate-800 border-2 border-blue-400 dark:border-blue-500 rounded-lg shadow-xl p-1.5 flex items-center gap-1 animate-in fade-in zoom-in-95 duration-100">
                {SIZES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => {
                      sounds.playPop();
                      setSize(s.value);
                      setShowSizePicker(false);
                    }}
                    title={`Size ${s.label}`}
                    className={`h-8 w-8 rounded flex flex-col items-center justify-center transition-all ${
                      brushSize === s.value
                        ? 'bg-blue-500 text-white font-bold shadow'
                        : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div
                      className="rounded-full bg-current mb-0.5"
                      style={{ width: Math.max(3, Math.min(14, s.value * 0.5)), height: Math.max(3, Math.min(14, s.value * 0.5)) }}
                    />
                    <span className="text-[8px] leading-none">{s.label}</span>
                  </button>
                ))}
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
