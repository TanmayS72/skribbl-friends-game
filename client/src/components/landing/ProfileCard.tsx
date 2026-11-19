import React from 'react';
import { Sparkles, Dices, User } from 'lucide-react';
import { useGame } from '../../context/GameContext.js';
import { sounds } from '../../audio/SoundEngine.js';

const AVATARS = ['🦊', '🐼', '🦁', '🐯', '🐸', '🦄', '🤖', '👾', '🚀', '🎨', '⚡', '🍕', '🐱', '🐶', '🐙', '🦖'];
const COLORS = [
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Teal', hex: '#14b8a6' },
];

export const ProfileCard: React.FC = () => {
  const { profile, updateProfile } = useGame();

  const handleRandomize = () => {
    sounds.playPop();
    const randomAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)].hex;
    const randomNum = Math.floor(Math.random() * 900) + 100;
    updateProfile({
      avatar: randomAvatar,
      color: randomColor,
      nickname: `Doodler#${randomNum}`,
    });
  };

  return (
    <div className="w-full bg-slate-800/70 border border-slate-700/80 rounded-3xl p-6 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-brand-400" />
          <h2 className="text-lg font-bold text-white tracking-wide">Player Profile</h2>
        </div>
        <button
          onClick={handleRandomize}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-700/80 hover:bg-brand-600 text-slate-300 hover:text-white transition-all active:scale-95 border border-slate-600/50"
        >
          <Dices className="w-3.5 h-3.5" />
          <span>Randomize</span>
        </button>
      </div>

      {/* Live Preview & Nickname */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-md transition-all transform hover:scale-105 select-none relative group"
          style={{ backgroundColor: profile.color + '25', border: `3px solid ${profile.color}` }}
        >
          <span>{profile.avatar}</span>
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-800"
            style={{ backgroundColor: profile.color }}
          />
        </div>

        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Nickname
          </label>
          <input
            type="text"
            maxLength={18}
            value={profile.nickname}
            onChange={(e) => updateProfile({ nickname: e.target.value })}
            placeholder="Enter nickname..."
            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-base"
          />
        </div>
      </div>

      {/* Avatar Picker */}
      <div className="mb-5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Choose Avatar
        </label>
        <div className="grid grid-cols-8 gap-2 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800/80">
          {AVATARS.map((av) => (
            <button
              key={av}
              onClick={() => {
                sounds.playPop();
                updateProfile({ avatar: av });
              }}
              className={`h-10 rounded-xl flex items-center justify-center text-xl transition-all transform hover:scale-110 active:scale-95 ${
                profile.avatar === av
                  ? 'bg-brand-600/50 border-2 border-brand-400 scale-105 shadow-md shadow-brand-500/20'
                  : 'hover:bg-slate-800/80'
              }`}
            >
              {av}
            </button>
          ))}
        </div>
      </div>

      {/* Color Accent Picker */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Accent Color
        </label>
        <div className="flex items-center justify-between gap-2 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800/80">
          {COLORS.map((col) => (
            <button
              key={col.hex}
              title={col.name}
              onClick={() => {
                sounds.playPop();
                updateProfile({ color: col.hex });
              }}
              className={`w-8 h-8 rounded-xl transition-all transform hover:scale-110 active:scale-95 relative flex items-center justify-center ${
                profile.color === col.hex ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110' : ''
              }`}
              style={{ backgroundColor: col.hex }}
            >
              {profile.color === col.hex && (
                <div className="w-2 h-2 rounded-full bg-white shadow" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
