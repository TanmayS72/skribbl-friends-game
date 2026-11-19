import React, { useState, useEffect } from 'react';
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

  // Responsive layout mode: Portrait/Compact vs Landscape Tablet/Desktop
  const [isPortraitMode, setIsPortraitMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 960 || window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    const checkLayout = () => {
      // Switches to stacked portrait layout for phones and portrait tablets (e.g. 768x1024, 820x1180, 1024x1366)
      // Switches to 3-column landscape layout for landscape tablets (e.g. 1180x820, 1366x1024) and desktop displays
      const portrait = window.innerWidth < 960 || window.innerHeight > window.innerWidth;
      setIsPortraitMode(portrait);
    };

    window.addEventListener('resize', checkLayout);
    window.addEventListener('orientationchange', checkLayout);
    return () => {
      window.removeEventListener('resize', checkLayout);
      window.removeEventListener('orientationchange', checkLayout);
    };
  }, []);

  return (
    <div className="w-full h-full select-none overflow-hidden">
      {isPortraitMode ? (
        /* Portrait Adaptive Layout (Phones & Portrait Tablets: 768x1024, 820x1180, 1024x1366) */
        <MobileGameLayout
          currentTool={currentTool}
          setTool={setTool}
          currentColor={currentColor}
          setColor={setColor}
          brushSize={brushSize}
          setSize={setSize}
        />
      ) : (
        /* Landscape Adaptive 3-Column Layout (Landscape Tablets: 1180x820, 1366x1024, Laptops & Desktops) */
        <div className="w-full h-full max-w-[1700px] mx-auto p-2 sm:p-3 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 sm:gap-3 h-full">
            {/* Left: Players Leaderboard (3 cols on small landscape, 2.5 on wide) */}
            <div className="col-span-3 xl:col-span-2 h-full overflow-hidden shadow-xs">
              <PlayerSidebar />
            </div>

            {/* Center: WordHintBar + Maximized Canvas + Toolbar (6 cols on small landscape, 7 on wide) */}
            <div className="col-span-6 xl:col-span-7 flex flex-col h-full min-h-0 overflow-hidden">
              <div className="shrink-0">
                <WordHintBar />
              </div>

              {/* Canvas Center Stage (Expands to fill all vertical space at 3:2 ratio) */}
              <div className="flex-1 min-h-0 flex items-center justify-center p-2 bg-white dark:bg-slate-900 border-x-2 border-blue-400 dark:border-blue-600/60 overflow-hidden shadow-xs">
                <div className="w-full h-full flex items-center justify-center">
                  <DrawingCanvas
                    currentTool={currentTool}
                    currentColor={currentColor}
                    brushSize={brushSize}
                    className="w-auto h-auto max-w-full max-h-full"
                  />
                </div>
              </div>

              {/* Drawing Toolbar (Only rendered for current drawer in DRAWING phase) */}
              {isDrawer && gameState?.phase === 'DRAWING' && (
                <div className="shrink-0 border-t-2 border-blue-400 dark:border-blue-600/60 overflow-visible relative z-20">
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
            <div className="col-span-3 xl:col-span-3 h-full overflow-hidden shadow-xs">
              <ChatBox />
            </div>
          </div>
        </div>
      )}

      {/* Global Modals & Overlays */}
      <WordChoiceModal />
      <RoundOverlay />
    </div>
  );
};
