import React from 'react';
import { Crown, Paintbrush, Check } from 'lucide-react';
import { useGame } from '../../context/GameContext.js';

export const PlayerSidebar: React.FC = () => {
  const { room, gameState, profile } = useGame();

  if (!room || !gameState) return null;

  const players = Object.values(room.players).sort((a, b) => b.score - a.score);

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-2 border-blue-400 dark:border-blue-600/60 flex flex-col h-full overflow-hidden shadow-xs">
      {/* Header */}
      <div className="bg-blue-500 px-2.5 py-1 sm:py-1.5 flex items-center justify-between shrink-0">
        <h3 className="font-extrabold text-white text-[11px] sm:text-xs uppercase tracking-wider">Players</h3>
        <span className="text-[10px] sm:text-xs text-blue-100 font-semibold">
          {players.filter(p => p.isConnected).length} online
        </span>
      </div>

      {/* Player rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800/80">
        {players.map((p, index) => {
          const isMe = p.id === profile.id;
          const isDrawer = p.id === gameState.currentDrawerId;
          const hasGuessed = gameState.guessedPlayerIds.includes(p.id);
          const roundScore = gameState.roundScores[p.id];

          return (
            <div
              key={p.id}
              className={`flex items-center px-1.5 py-1 sm:px-2 sm:py-1.5 transition-colors ${
                hasGuessed
                  ? 'bg-green-50 dark:bg-emerald-950/40 text-green-900 dark:text-emerald-200'
                  : isDrawer
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                  : index % 2 === 0
                  ? 'bg-white dark:bg-slate-900'
                  : 'bg-gray-50/80 dark:bg-slate-800/50'
              } ${!p.isConnected ? 'opacity-40' : ''} ${isMe ? 'ring-1 ring-inset ring-blue-400' : ''}`}
            >
              {/* Rank */}
              <span className="font-mono text-[9px] sm:text-[10px] font-bold text-gray-400 dark:text-slate-500 w-3.5 text-center shrink-0">
                {index + 1}
              </span>

              {/* Avatar */}
              <div
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs sm:text-sm mx-1 shrink-0 relative shadow-2xs"
                style={{ backgroundColor: p.color + '30', border: `1.5px solid ${p.color}` }}
              >
                <span>{p.avatar}</span>
                {p.isHost && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 flex items-center justify-center shadow-xs">
                    <Crown className="w-2 h-2 fill-white text-white" />
                  </div>
                )}
              </div>

              {/* Name & Score */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[10px] sm:text-[11px] text-gray-800 dark:text-slate-200 truncate max-w-[85px] sm:max-w-[130px]">
                    {p.nickname}
                  </span>
                  {isMe && (
                    <span className="text-[7px] sm:text-[8px] font-black px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 shrink-0">
                      YOU
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[9px] sm:text-[10px] leading-tight">
                  <span className="font-bold text-gray-700 dark:text-slate-400">{p.score} pts</span>
                  {roundScore ? (
                    <span className="text-green-600 dark:text-emerald-400 font-bold text-[8px] sm:text-[9px] animate-score-bounce">
                      +{roundScore}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Status icon */}
              <div className="shrink-0">
                {isDrawer && (
                  <span title="Drawing">
                    <Paintbrush className="w-3.5 h-3.5 text-blue-500 animate-bounce-subtle" />
                  </span>
                )}
                {hasGuessed && !isDrawer && (
                  <span title="Guessed!">
                    <Check className="w-3.5 h-3.5 text-green-500 dark:text-emerald-400" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
