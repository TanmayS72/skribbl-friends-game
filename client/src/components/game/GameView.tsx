import React, { useState } from 'react';
import { WordHintBar } from './WordHintBar.js';
import { DrawingCanvas } from './DrawingCanvas.js';
import { DrawingToolbar } from './DrawingToolbar.js';
import { PlayerSidebar } from './PlayerSidebar.js';
import { ChatBox } from './ChatBox.js';
import { WordChoiceModal } from './WordChoiceModal.js';
import { RoundOverlay } from './RoundOverlay.js';
import { MobileGameLayout } from './MobileGameLayout.js';
import { useGame } from '../../context/GameContext.js';
import { DrawingTool } from '../../types/game.js';

export const GameView: React.FC = () => {
  const { isDrawer, gameState } = useGame();

  const [currentTool, setTool] = useState<DrawingTool>('brush');
  const [currentColor, setColor] = useState<string>('#000000');
  const [brushSize, setSize] = useState<number>(6);

  return (
    <>
      {/* Mobile Dedicated View (< sm screen) */}
      <MobileGameLayout
        currentTool={currentTool}
        setTool={setTool}
        currentColor={currentColor}
        setColor={setColor}
        brushSize={brushSize}
        setSize={setSize}
      />

      {/* Desktop & Tablet 3-Section Layout (>= sm screen) */}
      <div className="hidden sm:block max-w-7xl mx-auto px-4 py-4 h-[calc(100vh-64px)] select-none">
        <div className="grid grid-cols-12 gap-4 h-full">
          {/* Left: Players Leaderboard (3 cols) */}
          <div className="col-span-3 h-full">
            <PlayerSidebar />
          </div>

          {/* Center: Canvas & Hint Bar (6 cols) */}
          <div className="col-span-6 flex flex-col h-full">
            <WordHintBar />

            <div className="flex-1 min-h-0 flex items-center justify-center">
              <DrawingCanvas
                currentTool={currentTool}
                currentColor={currentColor}
                brushSize={brushSize}
              />
            </div>

            {/* Drawing Toolbar (only active for current drawer in DRAWING phase) */}
            {isDrawer && gameState?.phase === 'DRAWING' && (
              <div className="mt-3">
                <DrawingToolbar
                  currentTool={currentTool}
                  setTool={setTool}
                  currentColor={currentColor}
                  setColor={setColor}
                  brushSize={brushSize}
                  setSize={setSize}
                />
              </div>
            )}
          </div>

          {/* Right: Live Chat & Guesses (3 cols) */}
          <div className="col-span-3 h-full">
            <ChatBox />
          </div>
        </div>

        {/* Modals & Overlays */}
        <WordChoiceModal />
        <RoundOverlay />
      </div>
    </>
  );
};
