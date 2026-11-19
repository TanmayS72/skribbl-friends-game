import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Crown, RotateCcw, Home, Medal, Sparkles } from 'lucide-react';
import { useGame } from '../../context/GameContext.js';
import { sounds } from '../../audio/SoundEngine.js';

export const ResultsView: React.FC = () => {
  const { room, rematch, leaveRoom, profile } = useGame();

  const players = Object.values(room?.players || {}).sort((a, b) => b.score - a.score);

  const winner = players[0];
  const second = players[1];
  const third = players[2];

  // Confetti explosion on victory screen
  useEffect(() => {
    sounds.playGameOver();

    const count = 200;
    const defaults = { origin: { y: 0.7 } };

    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in select-none">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-sm border border-amber-500/30 mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>GAME OVER</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Victory Podium
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Congratulations to the master doodlers!
        </p>
      </div>

      {/* 3D-styled Victory Podium */}
      <div className="flex items-end justify-center gap-3 sm:gap-6 mb-10 pt-10">
        {/* 2nd Place */}
        {second && (
          <div className="flex flex-col items-center flex-1 max-w-[160px] animate-in slide-in-from-bottom duration-500 delay-100">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg relative mb-2"
              style={{ backgroundColor: second.color + '30', border: `2px solid ${second.color}` }}
            >
              <span>{second.avatar}</span>
              <div className="absolute -top-3 -right-2 w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-black text-xs flex items-center justify-center shadow">
                2
              </div>
            </div>
            <span className="font-bold text-white text-sm sm:text-base truncate max-w-full">
              {second.nickname}
            </span>
            <span className="text-xs text-slate-400 font-mono font-bold">{second.score} pts</span>
            <div className="w-full h-24 sm:h-32 bg-gradient-to-t from-slate-800 to-slate-700/80 rounded-t-2xl border-t-2 border-slate-400/50 mt-2 flex items-center justify-center text-slate-400 font-black text-2xl shadow-inner">
              🥈
            </div>
          </div>
        )}

        {/* 1st Place (Center, Tallest) */}
        {winner && (
          <div className="flex flex-col items-center flex-1 max-w-[190px] animate-in slide-in-from-bottom duration-500 -mt-6">
            <div className="relative mb-2">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-400 animate-bounce">
                <Crown className="w-8 h-8 fill-amber-400" />
              </div>
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-xl ring-4 ring-amber-400/50"
                style={{ backgroundColor: winner.color + '40', border: `3px solid ${winner.color}` }}
              >
                <span>{winner.avatar}</span>
              </div>
            </div>
            <span className="font-extrabold text-white text-base sm:text-lg truncate max-w-full">
              {winner.nickname}
            </span>
            <span className="text-sm text-amber-400 font-mono font-black">{winner.score} pts</span>
            <div className="w-full h-36 sm:h-48 bg-gradient-to-t from-amber-600/40 via-amber-500/20 to-amber-400/30 rounded-t-2xl border-t-4 border-amber-400 mt-2 flex items-center justify-center text-amber-300 font-black text-3xl shadow-xl">
              🥇
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {third && (
          <div className="flex flex-col items-center flex-1 max-w-[160px] animate-in slide-in-from-bottom duration-500 delay-200">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg relative mb-2"
              style={{ backgroundColor: third.color + '30', border: `2px solid ${third.color}` }}
            >
              <span>{third.avatar}</span>
              <div className="absolute -top-3 -right-2 w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center shadow">
                3
              </div>
            </div>
            <span className="font-bold text-white text-sm sm:text-base truncate max-w-full">
              {third.nickname}
            </span>
            <span className="text-xs text-slate-400 font-mono font-bold">{third.score} pts</span>
            <div className="w-full h-16 sm:h-24 bg-gradient-to-t from-slate-800 to-amber-950/40 rounded-t-2xl border-t-2 border-amber-700/50 mt-2 flex items-center justify-center text-amber-600 font-black text-2xl shadow-inner">
              🥉
            </div>
          </div>
        )}
      </div>

      {/* Full Leaderboard Table */}
      <div className="bg-slate-900/80 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-xl mb-8">
        <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
          <Medal className="w-5 h-5 text-brand-400" />
          <span>Full Rankings</span>
        </h3>

        <div className="space-y-2">
          {players.map((p, idx) => {
            const isMe = p.id === profile.id;
            return (
              <div
                key={p.id}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                  isMe
                    ? 'bg-brand-950/40 border-brand-500/50 shadow-brand-500/10'
                    : 'bg-slate-800/60 border-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-black text-sm text-slate-400 w-5 text-center">
                    #{idx + 1}
                  </span>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow"
                    style={{ backgroundColor: p.color + '25', border: `1.5px solid ${p.color}` }}
                  >
                    <span>{p.avatar}</span>
                  </div>
                  <div>
                    <span className="font-bold text-white text-sm">{p.nickname}</span>
                    {isMe && (
                      <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300">
                        YOU
                      </span>
                    )}
                  </div>
                </div>

                <span className="font-mono font-bold text-emerald-400 text-base">
                  {p.score} pts
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons: Rematch & Home */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={() => {
            sounds.playPop();
            rematch();
          }}
          className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-accent-pink hover:from-brand-500 hover:to-accent-pink/90 text-white font-extrabold text-base shadow-xl shadow-brand-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2.5"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Play Again (Rematch)</span>
        </button>

        <button
          onClick={() => {
            sounds.playPop();
            leaveRoom();
          }}
          className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Home className="w-5 h-5" />
          <span>Back to Home</span>
        </button>
      </div>
    </div>
  );
};
