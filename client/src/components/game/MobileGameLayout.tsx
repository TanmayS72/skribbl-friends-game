import React, { useState } from 'react';
import { MessageSquare, Users, X, Send } from 'lucide-react';
import { DrawingCanvas } from './DrawingCanvas.js';
import { DrawingToolbar } from './DrawingToolbar.js';
import { WordHintBar } from './WordHintBar.js';
import { ChatBox } from './ChatBox.js';
import { PlayerSidebar } from './PlayerSidebar.js';
import { WordChoiceModal } from './WordChoiceModal.js';
import { RoundOverlay } from './RoundOverlay.js';
import { useGame } from '../../context/GameContext.js';
import { DrawingTool } from '../../types/game.js';

interface MobileGameLayoutProps {
  currentTool: DrawingTool;
  setTool: (tool: DrawingTool) => void;
  currentColor: string;
  setColor: (color: string) => void;
  brushSize: number;
  setSize: (size: number) => void;
}

export const MobileGameLayout: React.FC<MobileGameLayoutProps> = ({
  currentTool,
  setTool,
  currentColor,
  setColor,
  brushSize,
  setSize,
}) => {
  const { isDrawer, gameState } = useGame();
  const [activePanel, setActivePanel] = useState<'none' | 'chat' | 'players'>('none');

  return (
    <div className="flex flex-col w-full h-[calc(100dvh-64px)] max-h-[100dvh] overflow-hidden bg-slate-950 p-2 sm:hidden select-none">
      {/* 1. Word Hint & Timer Bar */}
      <div className="shrink-0">
        <WordHintBar />
      </div>

      {/* 2. Drawing Canvas (Maximized) */}
      <div className="flex-1 min-h-0 flex items-center justify-center relative">
        <DrawingCanvas
          currentTool={currentTool}
          currentColor={currentColor}
          brushSize={brushSize}
          className="w-full max-h-full"
        />
      </div>

      {/* 3. Floating Bottom Controls: Toggle Chat / Scoreboard Pills */}
      <div className="shrink-0 flex items-center justify-between gap-2 mt-2">
        <button
          onClick={() => setActivePanel(activePanel === 'chat' ? 'none' : 'chat')}
          className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activePanel === 'chat'
              ? 'bg-brand-600 text-white border-brand-400'
              : 'bg-slate-900 text-slate-300 border-slate-700'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat / Guesses</span>
        </button>

        <button
          onClick={() => setActivePanel(activePanel === 'players' ? 'none' : 'players')}
          className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activePanel === 'players'
              ? 'bg-brand-600 text-white border-brand-400'
              : 'bg-slate-900 text-slate-300 border-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Leaderboard</span>
        </button>
      </div>

      {/* 4. Drawer's Toolbar (if active drawer during DRAWING phase) */}
      {isDrawer && gameState?.phase === 'DRAWING' && (
        <div className="shrink-0 mt-2 max-h-[140px] overflow-y-auto">
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

      {/* Slide-over Overlay for Chat / Players on Mobile */}
      {activePanel !== 'none' && (
        <div className="fixed inset-x-0 bottom-0 top-16 z-40 bg-slate-950/95 backdrop-blur-md flex flex-col p-4 animate-in slide-in-from-bottom duration-200">
          <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-800">
            <span className="font-bold text-white text-sm">
              {activePanel === 'chat' ? 'Live Chat & Guesses' : 'Game Scores'}
            </span>
            <button
              onClick={() => setActivePanel('none')}
              className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {activePanel === 'chat' ? <ChatBox /> : <PlayerSidebar />}
          </div>
        </div>
      )}

      {/* Modals & Overlays */}
      <WordChoiceModal />
      <RoundOverlay />
    </div>
  );
};
