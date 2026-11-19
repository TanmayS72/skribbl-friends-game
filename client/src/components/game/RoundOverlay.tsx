import React from 'react';
import { Trophy, CheckCircle, Clock } from 'lucide-react';
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
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-400 mb-1 block">
          Round Intermission
        </span>

        <h2 className="text-sm font-semibold text-slate-300 mb-1">The word was:</h2>
        <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-300 via-indigo-300 to-accent-pink tracking-wider mb-6">
          "{word}"
        </div>

        {/* Points awarded this turn */}
        <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 mb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Points Earned This Turn</span>
          </h4>

          {scorers.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No one guessed the word in time!</p>
          ) : (
            <div className="space-y-2">
              {scorers.map(({ player, points }) => (
                <div
                  key={player?.id}
                  className="flex items-center justify-between text-xs py-1 border-b border-slate-700/40 last:border-none"
                >
                  <div className="flex items-center gap-2">
                    <span>{player?.avatar}</span>
                    <span className="font-bold text-white">{player?.nickname}</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">+{points} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Next turn countdown */}
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
          <Clock className="w-4 h-4 text-brand-400" />
          <span>Next turn starting in <strong className="text-white font-mono">{gameState.timeRemaining}s</strong>...</span>
        </div>
      </div>
    </div>
  );
};
