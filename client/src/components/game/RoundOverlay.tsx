import React from 'react';
import { Trophy, Clock } from 'lucide-react';
import { useGame } from '../../context/GameContext.js';

export const RoundOverlay: React.FC = () => {
  const { gameState, room } = useGame();

  if (gameState?.phase !== 'ROUND_END') return null;

  const word = gameState.lastWordRevealed;
  const roundScores = gameState.roundScores || {};
  const scorers = Object.entries(roundScores)
    .filter(([_, pts]) => pts > 0)
    .map(([playerId, pts]) => ({
      player: room?.players[playerId],
      points: pts,
    }))
    .filter(item => item.player);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in select-none">
      <div className="bg-white dark:bg-slate-900 border-2 border-blue-500 dark:border-blue-500/60 rounded-2xl p-5 sm:p-7 max-w-md w-full shadow-2xl text-center">
        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1 block">
          Round Intermission
        </span>

        <h2 className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-slate-400 mb-0.5">The word was:</h2>
        <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tracking-wider mb-5">
          "{word}"
        </div>

        {/* Points awarded this turn */}
        <div className="bg-gray-50 dark:bg-slate-800/70 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-slate-700/60 mb-5">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-slate-400 mb-2 flex items-center justify-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Points Earned This Turn</span>
          </h4>

          {scorers.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-slate-500 italic">No one guessed the word in time!</p>
          ) : (
            <div className="space-y-1.5">
              {scorers.map(({ player, points }) => (
                <div
                  key={player?.id}
                  className="flex items-center justify-between text-xs py-1 border-b border-gray-200 dark:border-slate-700/40 last:border-none"
                >
                  <div className="flex items-center gap-2">
                    <span>{player?.avatar}</span>
                    <span className="font-bold text-gray-800 dark:text-slate-100">{player?.nickname}</span>
                  </div>
                  <span className="font-mono font-bold text-green-600 dark:text-emerald-400">+{points} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Next turn countdown */}
        <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-gray-500 dark:text-slate-400">
          <Clock className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
          <span>Next turn in <strong className="text-gray-900 dark:text-white font-mono">{gameState.timeRemaining}s</strong>...</span>
        </div>
      </div>
    </div>
  );
};
