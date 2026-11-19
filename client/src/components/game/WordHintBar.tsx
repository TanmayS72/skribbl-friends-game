import React, { useEffect } from 'react';
import { Clock, Eye, Sparkles } from 'lucide-react';
import { useGame } from '../../context/GameContext.js';
import { sounds } from '../../audio/SoundEngine.js';

export const WordHintBar: React.FC = () => {
  const { gameState, isDrawer, room } = useGame();

  if (!gameState) return null;

  const time = gameState.timeRemaining;
  const isUrgent = time <= 10 && time > 0 && gameState.phase === 'DRAWING';

  // Sound ticking alert for last 5 seconds
  useEffect(() => {
    if (time <= 5 && time > 0 && gameState.phase === 'DRAWING') {
      sounds.playTick();
    }
  }, [time, gameState.phase]);

  // Current drawer nickname
  const drawer = gameState.currentDrawerId && room?.players[gameState.currentDrawerId]
    ? room.players[gameState.currentDrawerId].nickname
    : 'Player';

  return (
    <div className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl px-4 py-2.5 sm:px-6 sm:py-3 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3 select-none mb-3">
      {/* 1. Round & Drawer info */}
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-xs sm:text-sm font-extrabold px-3 py-1 rounded-xl bg-brand-500/20 text-brand-300 border border-brand-500/30">
          Round {gameState.currentRound} of {gameState.totalRounds}
        </span>
        <span className="text-xs text-slate-400 hidden md:inline">
          Drawer: <strong className="text-white">{isDrawer ? 'YOU' : drawer}</strong>
        </span>
      </div>

      {/* 2. Word Hint or Secret Word */}
      <div className="flex-1 flex flex-col items-center justify-center min-w-[180px]">
        {gameState.phase === 'CHOOSING_WORD' ? (
          <div className="flex items-center gap-2 text-sm text-amber-300 font-bold animate-pulse">
            <Sparkles className="w-4 h-4" />
            <span>{isDrawer ? 'Choose your word!' : `${drawer} is choosing a word...`}</span>
          </div>
        ) : gameState.phase === 'DRAWING' ? (
          isDrawer ? (
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">Your Word to Draw</span>
              <span className="text-xl sm:text-2xl font-black text-white tracking-wider">
                {gameState.lastWordRevealed || gameState.hint?.displayed.replace(/\s+/g, '') || 'DRAW!'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-mono font-black tracking-widest text-brand-300">
                  {gameState.hint?.displayed || '_ _ _ _'}
                </span>
                <span className="text-xs text-slate-400 font-semibold bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                  {gameState.hint?.letterCount || 0} letters
                </span>
              </div>
              {gameState.hint?.category && (
                <span className="text-[11px] font-semibold text-slate-400 mt-0.5">
                  Category: <span className="text-indigo-400">{gameState.hint.category}</span>
                </span>
              )}
            </div>
          )
        ) : gameState.phase === 'ROUND_END' ? (
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
            <span>Word was:</span>
            <span className="text-lg font-black text-white underline decoration-emerald-500">
              {gameState.lastWordRevealed}
            </span>
          </div>
        ) : (
          <span className="text-sm font-bold text-slate-400">Game Over</span>
        )}
      </div>

      {/* 3. Authoritative Timer */}
      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-black text-sm sm:text-base border transition-all ${
            isUrgent
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 animate-pulse'
              : 'bg-slate-800 text-slate-200 border-slate-700'
          }`}
        >
          <Clock className={`w-4 h-4 ${isUrgent ? 'text-rose-400' : 'text-slate-400'}`} />
          <span>{time}s</span>
        </div>
      </div>
    </div>
  );
};
