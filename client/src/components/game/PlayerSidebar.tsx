import React from 'react';
import { Crown, Paintbrush, Check, Users } from 'lucide-react';
import { useGame } from '../../context/GameContext.js';

export const PlayerSidebar: React.FC = () => {
  const { room, gameState, profile } = useGame();

  if (!room || !gameState) return null;

  // Sort players descending by score
  const players = Object.values(room.players).sort((a, b) => b.score - a.score);

  return (
    <div className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3 sm:p-4 shadow-xl backdrop-blur-md flex flex-col h-full max-h-[640px]">
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-400" />
          <h3 className="font-extrabold text-white text-sm">Leaderboard</h3>
        </div>
        <span className="text-xs text-slate-400 font-semibold">
          {players.filter(p => p.isConnected).length} Players
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {players.map((p, index) => {
          const isMe = p.id === profile.id;
          const isDrawer = p.id === gameState.currentDrawerId;
          const hasGuessed = gameState.guessedPlayerIds.includes(p.id);
          const roundScore = gameState.roundScores[p.id];

          return (
            <div
              key={p.id}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-between relative ${
                hasGuessed
                  ? 'bg-emerald-950/30 border-emerald-500/40 shadow-emerald-500/5'
                  : isDrawer
                  ? 'bg-brand-950/40 border-brand-500/40'
                  : 'bg-slate-800/70 border-slate-700/60'
              } ${!p.isConnected ? 'opacity-40' : ''}`}
            >
              {/* Left: Rank, Avatar, Name */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-mono text-xs font-bold text-slate-400 w-4 text-center">
                  #{index + 1}
                </span>

                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-lg relative shrink-0"
                  style={{ backgroundColor: p.color + '25', border: `1.5px solid ${p.color}` }}
                >
                  <span>{p.avatar}</span>
                  {p.isHost && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center shadow">
                      <Crown className="w-2.5 h-2.5 fill-slate-900" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-bold text-xs sm:text-sm text-white truncate">
                      {p.nickname}
                    </span>
                    {isMe && (
                      <span className="text-[9px] font-bold px-1 rounded bg-brand-500/30 text-brand-300">
                        YOU
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <span className="font-bold text-slate-300">{p.score} pts</span>
                    {roundScore ? (
                      <span className="text-emerald-400 font-bold text-[10px]">
                        (+{roundScore})
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Right status icon */}
              <div className="flex items-center gap-1 shrink-0">
                {isDrawer && (
                  <div
                    title="Currently drawing"
                    className="p-1 rounded-md bg-brand-500/20 text-brand-300 border border-brand-500/40"
                  >
                    <Paintbrush className="w-3.5 h-3.5 animate-bounce-subtle" />
                  </div>
                )}
                {hasGuessed && !isDrawer && (
                  <div
                    title="Guessed correctly!"
                    className="p-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
