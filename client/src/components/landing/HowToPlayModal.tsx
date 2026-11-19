import React from 'react';
import { X, Paintbrush, MessageSquare, Trophy, Clock, CheckCircle } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
          <span>🎨</span> How to Play DoodleDash
        </h2>

        <div className="space-y-4">
          <div className="flex gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50">
            <div className="w-12 h-12 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0">
              <Paintbrush className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base mb-1">1. When It's Your Turn to Draw</h3>
              <p className="text-sm text-slate-300">
                Pick 1 of 3 secret words. Use your pencil, smooth brush, shapes, and color palette to draw your masterpiece! Don't write letters or numbers directly.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50">
            <div className="w-12 h-12 rounded-xl bg-accent-green/20 border border-accent-green/30 flex items-center justify-center text-accent-green shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base mb-1">2. When Other Players Are Drawing</h3>
              <p className="text-sm text-slate-300">
                Watch strokes in real time and type your guesses into the chat box. Word hints will reveal letters periodically to assist you.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base mb-1">3. Speed & Scoring</h3>
              <p className="text-sm text-slate-300">
                The faster you guess, the more points you earn (up to 500 pts)! The drawer also earns points when players guess correctly.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50">
            <div className="w-12 h-12 rounded-xl bg-accent-pink/20 border border-accent-pink/30 flex items-center justify-center text-accent-pink shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base mb-1">4. Win & Rematch</h3>
              <p className="text-sm text-slate-300">
                After all rounds complete, the top 3 doodlers stand on the victory podium. Play instant rematches without recreating the room!
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-base shadow-lg shadow-brand-500/30 transition-all active:scale-[0.98]"
        >
          Got it, let's play!
        </button>
      </div>
    </div>
  );
};
