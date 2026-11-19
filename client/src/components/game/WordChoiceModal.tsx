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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in select-none">
      <div className="bg-white dark:bg-slate-900 border-2 border-blue-500 dark:border-blue-500/60 rounded-2xl p-5 sm:p-7 max-w-lg w-full shadow-2xl text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-300 dark:border-blue-700 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>YOUR TURN TO DRAW</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-1">
          Choose a Word to Draw
        </h2>

        <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm mb-5 flex items-center justify-center gap-1.5 font-medium">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>Select within <strong className="text-gray-900 dark:text-white font-mono">{gameState.timeRemaining}s</strong></span>
        </p>

        {/* Word Choice Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {wordChoices.map((word) => (
            <button
              key={word}
              type="button"
              onClick={() => handleSelect(word)}
              className="p-4 sm:p-5 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-blue-500 hover:text-white border-2 border-gray-200 dark:border-slate-700 hover:border-blue-600 text-gray-800 dark:text-slate-100 font-extrabold text-base sm:text-lg shadow-sm transition-all transform hover:-translate-y-0.5 active:scale-95 group flex flex-col items-center justify-center gap-1"
            >
              <span className="tracking-wide group-hover:scale-105 transition-transform">{word}</span>
              <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-400 group-hover:text-blue-100">
                {word.length} letters
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
