import React, { useEffect } from 'react';
import { Clock, Sparkles } from 'lucide-react';
import { useGame } from '../../context/GameContext.js';
import { sounds } from '../../audio/SoundEngine.js';

export const WordHintBar: React.FC = () => {
  const { gameState, isDrawer, room } = useGame();

  if (!gameState) return null;

  const time = gameState.timeRemaining;
  const isUrgent = time <= 10 && time > 0 && gameState.phase === 'DRAWING';

  useEffect(() => {
    if (time <= 5 && time > 0 && gameState.phase === 'DRAWING') {
      sounds.playTick();
    }
  }, [time, gameState.phase]);

  const drawer = gameState.currentDrawerId && room?.players[gameState.currentDrawerId]
    ? room.players[gameState.currentDrawerId].nickname
    : 'Player';

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-b-2 border-blue-400 dark:border-blue-600/60 px-2 sm:px-3 py-1 sm:py-1.5 flex items-center justify-between gap-1 sm:gap-2 select-none shadow-xs">
      {/* Round & Drawer info */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full bg-blue-500 text-white shrink-0">
          R{gameState.currentRound}/{gameState.totalRounds}
        </span>
        <span className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 hidden md:inline truncate max-w-[120px]">
          Drawer: <strong className="text-gray-800 dark:text-white">{isDrawer ? 'YOU' : drawer}</strong>
        </span>
      </div>

      {/* Word hint / status center */}
      <div className="flex-1 flex flex-col items-center justify-center min-w-0 px-1 text-center">
        {gameState.phase === 'CHOOSING_WORD' ? (
          <div className="flex items-center gap-1 text-xs sm:text-sm text-amber-600 dark:text-amber-400 font-bold animate-pulse truncate">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{isDrawer ? 'Choose your word!' : `${drawer} is choosing...`}</span>
          </div>
        ) : gameState.phase === 'DRAWING' ? (
          isDrawer ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400 hidden xs:inline">Draw:</span>
              <span className="text-sm sm:text-lg font-black text-gray-900 dark:text-white tracking-wider truncate">
                {gameState.lastWordRevealed || gameState.hint?.displayed.replace(/\s+/g, '') || 'DRAW!'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2 justify-center">
              <span className="text-base sm:text-xl font-mono font-black tracking-widest text-blue-600 dark:text-blue-400">
                {gameState.hint?.displayed || '_ _ _ _'}
              </span>
              <span className="text-[9px] sm:text-[10px] text-gray-500 dark:text-slate-400 font-bold bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 px-1.5 py-0.5 rounded-full shrink-0">
                {gameState.hint?.letterCount || 0}
              </span>
              {gameState.hint?.category && (
                <span className="text-[9px] text-gray-400 dark:text-slate-500 hidden sm:inline">
                  ({gameState.hint.category})
                </span>
              )}
            </div>
          )
        ) : gameState.phase === 'ROUND_END' ? (
          <div className="flex items-center gap-1 text-xs sm:text-sm font-bold text-green-600 dark:text-green-400">
            <span>Word was:</span>
            <span className="text-xs sm:text-base font-black text-gray-900 dark:text-white underline decoration-green-500">
              {gameState.lastWordRevealed}
            </span>
          </div>
        ) : (
          <span className="text-xs font-bold text-gray-500 dark:text-slate-400">Game Over</span>
        )}
      </div>

      {/* Timer */}
      <div className="flex items-center gap-1 shrink-0">
        <div
          className={`flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-mono font-black text-xs sm:text-sm border transition-all ${
            isUrgent
              ? 'bg-red-50 dark:bg-red-950/60 text-red-500 dark:text-red-400 border-red-400 dark:border-red-500 animate-timer-urgent'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-gray-300 dark:border-slate-700'
          }`}
        >
          <Clock className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isUrgent ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-slate-400'}`} />
          <span>{time}s</span>
        </div>
      </div>
    </div>
  );
};
