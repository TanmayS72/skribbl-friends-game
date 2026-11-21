import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DrawingEngine, VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../../drawing/DrawingEngine.js';
import { useGame } from '../../context/GameContext.js';
import { DrawingTool, DrawPoint, StrokeAction, ShapeAction, FillAction, DrawAction } from '../../types/game.js';

interface DrawingCanvasProps {
  currentTool: DrawingTool;
  currentColor: string;
  brushSize: number;
  className?: string;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  currentTool,
  currentColor,
  brushSize,
  className = '',
}) => {
  const { isDrawer, gameState, latestDrawAction, canvasSnapshot, sendDrawAction } = useGame();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<DrawingEngine | null>(null);

  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<DrawPoint[]>([]);
  const shapeStartRef = useRef<DrawPoint | null>(null);

  // Initialize Canvas & Engine
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new DrawingEngine(canvasRef.current);
    engineRef.current = engine;

    if (previewCanvasRef.current) {
      previewCanvasRef.current.width = VIRTUAL_WIDTH;
      previewCanvasRef.current.height = VIRTUAL_HEIGHT;
    }

    // Replay initial snapshot if already loaded
    if (canvasSnapshot && canvasSnapshot.length > 0) {
      engine.replayHistory(canvasSnapshot);
    }
  }, []);

  // Listen to remote draw actions from socket
  useEffect(() => {
    if (!latestDrawAction || !engineRef.current) return;
    engineRef.current.executeAction(latestDrawAction);
  }, [latestDrawAction]);

  // Listen to full history snapshot (on join or undo)
  useEffect(() => {
    if (!canvasSnapshot || !engineRef.current) return;
    engineRef.current.replayHistory(canvasSnapshot);
  }, [canvasSnapshot]);

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Only current drawer during DRAWING phase can draw
    if (!isDrawer || gameState?.phase !== 'DRAWING') return;

    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;

    // Capture pointer for touch devices
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}

    const pt = engine.getVirtualCoords(e.clientX, e.clientY);
    isDrawingRef.current = true;

    // Flood fill tool
    if (currentTool === 'bucket') {
      const fillAction: FillAction = {
        type: 'fill',
        x: pt.x,
        y: pt.y,
        color: currentColor,
      };
      engine.executeAction(fillAction);
      sendDrawAction(fillAction);
      isDrawingRef.current = false;
      return;
    }

    // Shapes
    if (currentTool === 'line' || currentTool === 'rectangle' || currentTool === 'circle') {
      shapeStartRef.current = pt;
      return;
    }

    // Brush, Pencil, Eraser
    currentPointsRef.current = [pt];
    const strokeAction: StrokeAction = {
      type: 'stroke',
      tool: currentTool,
      color: currentColor,
      size: brushSize,
      points: [pt],
    };

    engine.renderStroke(strokeAction);
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !isDrawer || gameState?.phase !== 'DRAWING') return;

    const engine = engineRef.current;
    if (!engine) return;

    // Support coalesced events for high-precision Apple Pencil / touch / stylus input
    const nativeEvent = e.nativeEvent as PointerEvent;
    const coalescedEvents = (typeof nativeEvent.getCoalescedEvents === 'function')
      ? nativeEvent.getCoalescedEvents()
      : [nativeEvent];

    // Shape preview drag on top preview layer
    if (shapeStartRef.current) {
      const pt = engine.getVirtualCoords(e.clientX, e.clientY);
      const pCanvas = previewCanvasRef.current;
      if (!pCanvas) return;
      const pCtx = pCanvas.getContext('2d');
      if (!pCtx) return;

      pCtx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
      pCtx.save();
      pCtx.strokeStyle = currentColor;
      pCtx.lineWidth = brushSize;
      pCtx.lineCap = 'round';
      pCtx.lineJoin = 'round';

      const start = shapeStartRef.current;
      if (currentTool === 'line') {
        pCtx.beginPath();
        pCtx.moveTo(start.x, start.y);
        pCtx.lineTo(pt.x, pt.y);
        pCtx.stroke();
      } else if (currentTool === 'rectangle') {
        pCtx.strokeRect(start.x, start.y, pt.x - start.x, pt.y - start.y);
      } else if (currentTool === 'circle') {
        const rx = Math.abs(pt.x - start.x) / 2;
        const ry = Math.abs(pt.y - start.y) / 2;
        const cx = (start.x + pt.x) / 2;
        const cy = (start.y + pt.y) / 2;
        pCtx.beginPath();
        pCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        pCtx.stroke();
      }
      pCtx.restore();
      return;
    }

    // Normal stroke: process points (with deduplication for minimal overhead)
    for (let i = 0; i < coalescedEvents.length; i++) {
      const cEvent = coalescedEvents[i];
      const pt = engine.getVirtualCoords(cEvent.clientX, cEvent.clientY);
      const points = currentPointsRef.current;
      const lastPt = points[points.length - 1];

      // Skip duplicate zero-distance points to prevent memory bloat and redundant network payload
      if (lastPt && lastPt.x === pt.x && lastPt.y === pt.y) continue;

      points.push(pt);

      // Incremental draw for silky smooth responsive rendering
      const strokeAction: StrokeAction = {
        type: 'stroke',
        tool: currentTool as 'pencil' | 'brush' | 'eraser',
        color: currentColor,
        size: brushSize,
        points: points.slice(-3),
      };
      engine.renderStroke(strokeAction);
    }
  };

  // Pointer Up / Cancel
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}

    const engine = engineRef.current;
    if (!engine) return;

    // Handle shape finish
    if (shapeStartRef.current) {
      const pCanvas = previewCanvasRef.current;
      if (pCanvas) {
        const pCtx = pCanvas.getContext('2d');
        pCtx?.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
      }

      const endPt = engine.getVirtualCoords(e.clientX, e.clientY);
      const shapeAction: ShapeAction = {
        type: 'shape',
        tool: currentTool as 'line' | 'rectangle' | 'circle',
        startX: shapeStartRef.current.x,
        startY: shapeStartRef.current.y,
        endX: endPt.x,
        endY: endPt.y,
        color: currentColor,
        size: brushSize,
      };

      engine.renderShape(shapeAction);
      sendDrawAction(shapeAction);
      shapeStartRef.current = null;
      return;
    }

    // Handle stroke finish
    if (currentPointsRef.current.length > 0) {
      const finalStroke: StrokeAction = {
        type: 'stroke',
        tool: currentTool as 'pencil' | 'brush' | 'eraser',
        color: currentColor,
        size: brushSize,
        points: currentPointsRef.current,
      };
      sendDrawAction(finalStroke);
      currentPointsRef.current = [];
    }
  };

  return (
    <div
      className={`relative aspect-[4/3] max-w-full max-h-full bg-white overflow-hidden border-2 sm:border-4 border-blue-500 shadow-sm select-none ${className}`}
      style={{ touchAction: 'none', aspectRatio: '4 / 3' }}
    >
      {/* Main Persistent Canvas */}
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

      {/* Floating Preview Canvas for Shape Rubber-banding */}
      <canvas
        ref={previewCanvasRef}
        width={VIRTUAL_WIDTH}
        height={VIRTUAL_HEIGHT}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
};
