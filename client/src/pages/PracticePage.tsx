import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, RotateCcw, Clock, ArrowLeft } from 'lucide-react';
import { DrawingEngine, VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../drawing/DrawingEngine.js';
import { DrawingToolbar } from '../components/game/DrawingToolbar.js';
import { DrawingTool, DrawPoint, StrokeAction, ShapeAction, FillAction } from '../types/game.js';
import { sounds } from '../audio/SoundEngine.js';

const PRACTICE_WORDS = [
  'Rollercoaster', 'Campfire', 'Astronaut', 'Pineapple Pizza', 'Cyberpunk City',
  'Castle', 'Dragon', 'Helicopter', 'Octopus', 'Boomerang', 'Ice Cream Cone',
  'Skateboarder', 'Dinosaur', 'Lighthouse', 'Treasure Island', 'Guitar',
];

interface PracticePageProps {
  onBack: () => void;
}

export const PracticePage: React.FC<PracticePageProps> = ({ onBack }) => {
  const [word, setWord] = useState('Dinosaur');
  const [timer, setTimer] = useState(80);
  const [isRunning, setIsRunning] = useState(true);

  const [currentTool, setTool] = useState<DrawingTool>('brush');
  const [currentColor, setColor] = useState('#000000');
  const [brushSize, setSize] = useState(6);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<DrawingEngine | null>(null);

  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<DrawPoint[]>([]);
  const shapeStartRef = useRef<DrawPoint | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    engineRef.current = new DrawingEngine(canvasRef.current);
    if (previewCanvasRef.current) {
      previewCanvasRef.current.width = VIRTUAL_WIDTH;
      previewCanvasRef.current.height = VIRTUAL_HEIGHT;
    }
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (isRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer(t => t - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timer]);

  const handleNextWord = () => {
    sounds.playPop();
    const next = PRACTICE_WORDS[Math.floor(Math.random() * PRACTICE_WORDS.length)];
    setWord(next);
    setTimer(80);
    setIsRunning(true);
    engineRef.current?.clear();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    if (!engine) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}

    const pt = engine.getVirtualCoords(e.clientX, e.clientY);
    isDrawingRef.current = true;

    if (currentTool === 'bucket') {
      const fillAction: FillAction = { type: 'fill', x: pt.x, y: pt.y, color: currentColor };
      engine.executeAction(fillAction);
      isDrawingRef.current = false;
      return;
    }

    if (currentTool === 'line' || currentTool === 'rectangle' || currentTool === 'circle') {
      shapeStartRef.current = pt;
      return;
    }

    currentPointsRef.current = [pt];
    const strokeAction: StrokeAction = {
      type: 'stroke',
      tool: currentTool as any,
      color: currentColor,
      size: brushSize,
      points: [pt],
    };
    engine.renderStroke(strokeAction);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !engineRef.current) return;
    const pt = engineRef.current.getVirtualCoords(e.clientX, e.clientY);

    if (shapeStartRef.current) {
      const pCanvas = previewCanvasRef.current;
      const pCtx = pCanvas?.getContext('2d');
      if (pCtx) {
        pCtx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
        pCtx.save();
        pCtx.strokeStyle = currentColor;
        pCtx.lineWidth = brushSize;
        pCtx.lineCap = 'round';
        pCtx.lineJoin = 'round';

        const s = shapeStartRef.current;
        if (currentTool === 'line') {
          pCtx.beginPath();
          pCtx.moveTo(s.x, s.y);
          pCtx.lineTo(pt.x, pt.y);
          pCtx.stroke();
        } else if (currentTool === 'rectangle') {
          pCtx.strokeRect(s.x, s.y, pt.x - s.x, pt.y - s.y);
        } else if (currentTool === 'circle') {
          const rx = Math.abs(pt.x - s.x) / 2;
          const ry = Math.abs(pt.y - s.y) / 2;
          pCtx.beginPath();
          pCtx.ellipse((s.x + pt.x) / 2, (s.y + pt.y) / 2, rx, ry, 0, 0, Math.PI * 2);
          pCtx.stroke();
        }
        pCtx.restore();
      }
      return;
    }

    currentPointsRef.current.push(pt);
    const strokeAction: StrokeAction = {
      type: 'stroke',
      tool: currentTool as any,
      color: currentColor,
      size: brushSize,
      points: currentPointsRef.current.slice(-3),
    };
    engineRef.current.renderStroke(strokeAction);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}

    const engine = engineRef.current;
    if (!engine) return;

    if (shapeStartRef.current) {
      const pCanvas = previewCanvasRef.current;
      pCanvas?.getContext('2d')?.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

      const endPt = engine.getVirtualCoords(e.clientX, e.clientY);
      const shapeAction: ShapeAction = {
        type: 'shape',
        tool: currentTool as any,
        startX: shapeStartRef.current.x,
        startY: shapeStartRef.current.y,
        endX: endPt.x,
        endY: endPt.y,
        color: currentColor,
        size: brushSize,
      };
      engine.renderShape(shapeAction);
      shapeStartRef.current = null;
      return;
    }

    currentPointsRef.current = [];
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 select-none animate-in fade-in">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center gap-2 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 font-mono font-bold text-sm text-brand-300">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>{timer}s</span>
          </div>

          <button
            onClick={handleNextWord}
            className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-2 shadow"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Next Prompt</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-3 text-center mb-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 block mb-0.5">
          Practice Prompt
        </span>
        <span className="text-2xl font-black text-white">{word}</span>
      </div>

      <div className="relative w-full aspect-[3/2] bg-white rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-700 select-none mb-4">
        <canvas
          ref={canvasRef}
          width={VIRTUAL_WIDTH}
          height={VIRTUAL_HEIGHT}
          className="w-full h-full block cursor-crosshair"
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        <canvas
          ref={previewCanvasRef}
          width={VIRTUAL_WIDTH}
          height={VIRTUAL_HEIGHT}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ touchAction: 'none' }}
        />
      </div>

      <DrawingToolbar
        currentTool={currentTool}
        setTool={setTool}
        currentColor={currentColor}
        setColor={setColor}
        brushSize={brushSize}
        setSize={setSize}
      />
    </div>
  );
};
