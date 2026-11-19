import React, { useState } from 'react';
import { X, ArrowRight, KeyRound, AlertCircle } from 'lucide-react';
import { useGame } from '../../context/GameContext.js';
import { sounds } from '../../audio/SoundEngine.js';

interface JoinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinModal: React.FC<JoinModalProps> = ({ isOpen, onClose }) => {
  const { joinRoom, error, clearError } = useGame();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || loading) return;

    sounds.playPop();
    setLoading(true);
    clearError();

    const success = await joinRoom(code.toUpperCase().trim());
    setLoading(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent-green/20 border border-accent-green/30 flex items-center justify-center text-accent-green">
            <KeyRound className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-white">Join Private Room</h2>
        </div>

        <p className="text-sm text-slate-300 mb-5">
          Enter the 6-character room code shared by your friend to join their game session.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center gap-2.5 text-rose-300 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Room Code
            </label>
            <input
              type="text"
              maxLength={8}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABCDEF"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-2xl font-mono font-bold tracking-widest text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all uppercase placeholder:text-slate-600"
            />
          </div>

          <button
            type="submit"
            disabled={!code.trim() || loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-accent-green to-emerald-600 hover:from-accent-green/90 hover:to-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-slate-950 font-extrabold text-base shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-block animate-spin mr-2">⚪</span>
            ) : (
              <>
                <span>Enter Room</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
