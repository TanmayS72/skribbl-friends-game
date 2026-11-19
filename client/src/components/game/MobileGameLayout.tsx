import React, { useState, useRef, useEffect } from 'react';
import { Send, Flame, Crown, Paintbrush, Check } from 'lucide-react';
import { DrawingCanvas } from './DrawingCanvas.js';
import { DrawingToolbar } from './DrawingToolbar.js';
import { WordHintBar } from './WordHintBar.js';
import { WordChoiceModal } from './WordChoiceModal.js';
import { RoundOverlay } from './RoundOverlay.js';
import { useGame } from '../../context/GameContext.js';
import { DrawingTool } from '../../types/game.js';
import { sounds } from '../../audio/SoundEngine.js';

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
  const { isDrawer, gameState, room, profile, chatMessages, sendChatMessage, closeGuessAlert } = useGame();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const myPlayer = gameState?.guessedPlayerIds.includes(profile.id);
  const isDrawing = gameState?.phase === 'DRAWING';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, closeGuessAlert]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sounds.playPop();
    sendChatMessage(inputText);
    setInputText('');
  };

  if (!gameState || !room) return null;

  const players = Object.values(room.players).sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col w-full h-full max-h-full overflow-hidden select-none bg-[#F5F7FA] dark:bg-slate-950">
      {/* 1. Word Hint & Timer Bar (Compact single row) */}
      <div className="shrink-0 z-10">
        <WordHintBar />
      </div>

      {/* 2. Drawing Canvas (FLEX-1: Expands to maximum available remaining space) */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center p-1 sm:p-2 overflow-hidden">
        <div className="w-full h-full flex items-center justify-center">
          <DrawingCanvas
            currentTool={currentTool}
            currentColor={currentColor}
            brushSize={brushSize}
            className="w-auto h-auto max-w-full max-h-full"
          />
        </div>
      </div>

      {/* 3. Compact Drawing Toolbar (Rendered ONLY when current user is drawing in DRAWING phase) */}
      {isDrawer && gameState.phase === 'DRAWING' && (
        <div className="shrink-0 z-10">
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

      {/* 4. Split Section: Player Leaderboard (Left) + Live Chat (Right) */}
      <div className="h-[125px] xs:h-[140px] sm:h-[180px] md:h-[220px] shrink-0 flex border-t-2 border-blue-400 dark:border-blue-600/70 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        {/* Left: Player Leaderboard (42% width) */}
        <div className="w-[42%] sm:w-[45%] border-r-2 border-blue-300 dark:border-blue-600/50 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
          <div className="bg-blue-500 px-2 py-0.5 sm:py-1 shrink-0 flex items-center justify-between">
            <span className="font-extrabold text-white text-[9px] sm:text-[11px] uppercase tracking-wider">Players</span>
            <span className="text-[8px] sm:text-[10px] text-blue-100 font-bold">{players.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
            {players.map((p, index) => {
              const isMe = p.id === profile.id;
              const isPlayerDrawer = p.id === gameState.currentDrawerId;
              const hasGuessed = gameState.guessedPlayerIds.includes(p.id);
              const roundScore = gameState.roundScores[p.id];

              return (
                <div
                  key={p.id}
                  className={`flex items-center px-1 py-0.5 sm:px-1.5 sm:py-1 transition-colors ${
                    hasGuessed
                      ? 'bg-green-50 dark:bg-emerald-950/40 text-green-900 dark:text-emerald-200'
                      : isPlayerDrawer
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                      : index % 2 === 0
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-gray-50 dark:bg-slate-800/40'
                  } ${!p.isConnected ? 'opacity-40' : ''} ${isMe ? 'ring-1 ring-inset ring-blue-400' : ''}`}
                >
                  <span className="font-mono text-[8px] sm:text-[9px] font-bold text-gray-400 dark:text-slate-500 w-3 text-center shrink-0">
                    {index + 1}
                  </span>

                  <div
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs mx-0.5 sm:mx-1 shrink-0 relative"
                    style={{ backgroundColor: p.color + '30', border: `1.5px solid ${p.color}` }}
                  >
                    <span>{p.avatar}</span>
                    {p.isHost && (
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400 flex items-center justify-center">
                        <Crown className="w-1.5 h-1.5 fill-white text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pr-0.5">
                    <div className="flex items-center gap-0.5">
                      <span className="font-bold text-[9px] sm:text-[10px] text-gray-800 dark:text-slate-200 truncate max-w-[55px] sm:max-w-[90px]">
                        {p.nickname}
                      </span>
                      {isMe && (
                        <span className="text-[6px] sm:text-[7px] font-black px-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 shrink-0">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 text-[8px] sm:text-[9px] leading-none">
                      <span className="font-bold text-gray-600 dark:text-slate-400">{p.score}</span>
                      {roundScore ? (
                        <span className="text-green-600 dark:text-emerald-400 font-bold text-[7px] sm:text-[8px] animate-score-bounce">
                          +{roundScore}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="shrink-0 ml-0.5">
                    {isPlayerDrawer && <Paintbrush className="w-3 h-3 text-blue-500 animate-bounce-subtle" />}
                    {hasGuessed && !isPlayerDrawer && <Check className="w-3 h-3 text-green-500 dark:text-emerald-400" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Chat Messages (58% width) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
          <div className="bg-blue-500 px-2 py-0.5 sm:py-1 shrink-0">
            <span className="font-extrabold text-white text-[9px] sm:text-[11px] uppercase tracking-wider">Live Chat</span>
          </div>

          <div className="flex-1 overflow-y-auto px-1.5 py-1 space-y-0.5 text-[10px] sm:text-[11px]">
            {chatMessages.length === 0 ? (
              <p className="text-gray-400 dark:text-slate-500 text-center py-4 italic text-[10px]">Type your guesses below!</p>
            ) : (
              chatMessages.map((msg) => {
                if (msg.type === 'correct') {
                  return (
                    <div
                      key={msg.id}
                      className="p-1 rounded bg-green-100 dark:bg-emerald-950/60 border border-green-300 dark:border-emerald-600/40 text-green-800 dark:text-emerald-300 font-bold flex items-center gap-1 text-[10px] sm:text-[11px] animate-correct-flash"
                    >
                      <span>🎉</span>
                      <span className="truncate">{msg.text}</span>
                    </div>
                  );
                }

                if (msg.type === 'drawer' || msg.type === 'system') {
                  return (
                    <div key={msg.id} className="text-gray-500 dark:text-slate-400 italic py-0.5 text-[9px] sm:text-[10px]">
                      {msg.text}
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="py-0.5 break-words leading-tight">
                    <span className="font-bold mr-1" style={{ color: msg.senderColor || '#3B82F6' }}>
                      {msg.senderName}:
                    </span>
                    <span className={msg.type === 'guess' ? 'text-gray-800 dark:text-slate-200 font-medium' : 'text-gray-600 dark:text-slate-400'}>
                      {msg.text}
                    </span>
                  </div>
                );
              })
            )}

            {closeGuessAlert && (
              <div className="p-1 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-600/40 text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1 text-[10px] animate-bounce">
                <Flame className="w-3 h-3 text-amber-500 shrink-0" />
                <span>So close! Keep guessing!</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* 5. Guess Input Form (Full-width, fixed at bottom with safe-area inset) */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 flex gap-1 p-1.5 sm:p-2 bg-white dark:bg-slate-900 border-t-2 border-blue-400 dark:border-blue-600/70"
        style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
      >
        <input
          type="text"
          maxLength={100}
          disabled={isDrawer && isDrawing}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isDrawer && isDrawing
              ? 'You are drawing!'
              : myPlayer && isDrawing
              ? 'Guessed! Chat away...'
              : 'Type your guess...'
          }
          className="flex-1 bg-gray-50 dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-700 rounded-md sm:rounded-lg px-2.5 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-slate-800"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || (isDrawer && isDrawing)}
          className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:pointer-events-none text-white font-bold transition-colors flex items-center justify-center shrink-0"
        >
          <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </form>

      {/* Modals & Overlays */}
      <WordChoiceModal />
      <RoundOverlay />
    </div>
  );
};
