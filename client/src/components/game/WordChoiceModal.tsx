import React from 'react';
import { Sparkles, Clock } from 'lucide-react';
import { useGame } from '../../context/GameContext.js';
import { sounds } from '../../audio/SoundEngine.js';

export const WordChoiceModal: React.FC = () => {
  const { wordChoices, selectWord, gameState, isDrawer } = useGame();

  if (!isDrawer || gameState?.phase !== 'CHOOSING_WORD' || !wordChoices || wordChoices.length === 0) {
    return null;
  }

  const handleSelect = (word: string) => {
    sounds.playPop();
    selectWord(word);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/20 text-brand-300 text-xs font-bold border border-brand-500/30 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>YOUR TURN TO DRAW</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
          Choose a Word to Draw
        </h2>

        <p className="text-slate-400 text-xs sm:text-sm mb-6 flex items-center justify-center gap-1.5 font-medium">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Select within <strong className="text-white font-mono">{gameState.timeRemaining}s</strong> or a word will be picked for you</span>
        </p>

        {/* Word Choice Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {wordChoices.map((word) => (
            <button
              key={word}
              onClick={() => handleSelect(word)}
              className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-800/60 hover:from-brand-600 hover:to-indigo-600 border border-slate-700 hover:border-brand-400 text-white font-extrabold text-lg sm:text-xl shadow-lg transition-all transform hover:-translate-y-1 hover:shadow-brand-500/20 active:scale-95 group flex flex-col items-center justify-center gap-2"
            >
              <span className="tracking-wide group-hover:scale-105 transition-transform">{word}</span>
              <span className="text-[11px] font-semibold text-slate-400 group-hover:text-brand-200">
                {word.length} letters
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
