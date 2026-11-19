import React, { useState } from 'react';
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
  Pipette
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
  '#000000', // Black
  '#4b5563', // Gray
  '#9ca3af', // Light gray
  '#ffffff', // White
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#eab308', // Yellow
  '#84cc16', // Lime
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#78350f', // Brown
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

  return (
    <div className="w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-2.5 sm:p-3 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-2.5 select-none">
      {/* 1. Tools Group */}
      <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-700/50">
        <button
          onClick={() => handleToolClick('pencil')}
          title="Pencil"
          className={`p-2 rounded-lg transition-all ${
            currentTool === 'pencil' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Pencil className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleToolClick('brush')}
          title="Smooth Brush"
          className={`p-2 rounded-lg transition-all ${
            currentTool === 'brush' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Paintbrush className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleToolClick('bucket')}
          title="Fill Bucket"
          className={`p-2 rounded-lg transition-all ${
            currentTool === 'bucket' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <PaintBucket className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleToolClick('eraser')}
          title="Eraser"
          className={`p-2 rounded-lg transition-all ${
            currentTool === 'eraser' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Eraser className="w-4 h-4" />
        </button>

        {/* Separator */}
        <div className="w-px h-5 bg-slate-700 mx-0.5" />

        {/* Shapes */}
        <button
          onClick={() => handleToolClick('line')}
          title="Line Tool"
          className={`p-2 rounded-lg transition-all ${
            currentTool === 'line' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleToolClick('rectangle')}
          title="Rectangle"
          className={`p-2 rounded-lg transition-all ${
            currentTool === 'rectangle' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Square className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleToolClick('circle')}
          title="Circle"
          className={`p-2 rounded-lg transition-all ${
            currentTool === 'circle' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <CircleIcon className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Brush Sizes */}
      <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-700/50">
        {SIZES.map((s) => (
          <button
            key={s.value}
            onClick={() => {
              sounds.playPop();
              setSize(s.value);
            }}
            title={`Size: ${s.label}`}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              brushSize === s.value ? 'bg-slate-700 text-brand-300 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <div
              className="rounded-full bg-current transition-all"
              style={{ width: Math.max(3, Math.min(18, s.value * 0.6)), height: Math.max(3, Math.min(18, s.value * 0.6)) }}
            />
          </button>
        ))}
      </div>

      {/* 3. Color Palette & Native Color Picker */}
      <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-700/50 max-w-full overflow-x-auto">
        <div className="grid grid-cols-8 sm:grid-cols-16 gap-1">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => handleColorClick(c)}
              className={`w-6 h-6 rounded-md transition-all transform hover:scale-110 relative ${
                currentColor.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-brand-400 scale-105 z-10' : ''
              }`}
              style={{
                backgroundColor: c,
                border: c === '#ffffff' ? '1px solid #cbd5e1' : 'none',
              }}
            />
          ))}
        </div>

        {/* Custom Color Input */}
        <div className="relative ml-1 w-6 h-6 rounded-md overflow-hidden ring-1 ring-slate-600 flex items-center justify-center cursor-pointer">
          <input
            type="color"
            value={currentColor}
            onChange={(e) => {
              setColor(e.target.value);
              if (currentTool === 'eraser') setTool('brush');
            }}
            title="Custom Color"
            className="absolute -inset-2 w-10 h-10 cursor-pointer opacity-0"
          />
          <div
            className="w-full h-full pointer-events-none flex items-center justify-center"
            style={{ backgroundColor: currentColor }}
          >
            <Pipette className="w-3 h-3 text-white drop-shadow" />
          </div>
        </div>
      </div>

      {/* 4. Undo & Clear Actions */}
      <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-700/50 relative">
        <button
          onClick={handleUndo}
          title="Undo last stroke"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-95"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        {showClearConfirm ? (
          <div className="flex items-center gap-1 bg-rose-950/80 p-0.5 rounded-lg border border-rose-500/50">
            <button
              onClick={handleClear}
              className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded"
            >
              Confirm Clear
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-1.5 py-1 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowClearConfirm(true)}
            title="Clear entire canvas"
            className="p-2 rounded-lg text-rose-400 hover:text-white hover:bg-rose-600/40 transition-all active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
