import React, { useState } from 'react';
import { X, Sliders, Check, HelpCircle } from 'lucide-react';
import { useGame } from '../../context/GameContext.js';
import { GameSettings, WordDifficulty } from '../../types/game.js';
import { sounds } from '../../audio/SoundEngine.js';

interface GameSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ALL_CATEGORIES = [
  'Animals',
  'Food',
  'Technology',
  'Objects',
  'Nature',
  'Sports',
  'Movies',
  'Professions',
  'Transportation',
  'Everyday activities',
  'Difficult words',
  'Funny words',
];

export const GameSettingsModal: React.FC<GameSettingsModalProps> = ({ isOpen, onClose }) => {
  const { room, updateSettings } = useGame();

  const [rounds, setRounds] = useState(room?.settings.rounds || 3);
  const [drawTime, setDrawTime] = useState(room?.settings.drawTime || 80);
  const [wordCount, setWordCount] = useState(room?.settings.wordCount || 3);
  const [difficulty, setDifficulty] = useState<WordDifficulty>(room?.settings.difficulty || 'all');
  const [categories, setCategories] = useState<string[]>(room?.settings.categories || ALL_CATEGORIES);
  const [customWordsText, setCustomWordsText] = useState((room?.settings.customWords || []).join(', '));
  const [customWordsOnly, setCustomWordsOnly] = useState(room?.settings.customWordsOnly || false);
  const [maxPlayers, setMaxPlayers] = useState(room?.settings.maxPlayers || 10);
  const [hintsEnabled, setHintsEnabled] = useState(room?.settings.hintsEnabled ?? true);

  if (!isOpen) return null;

  const toggleCategory = (cat: string) => {
    sounds.playPop();
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleSave = () => {
    sounds.playPop();
    const parsedCustom = customWordsText
      .split(/[,\n]/)
      .map(w => w.trim())
      .filter(w => w.length > 0);

    const updated: Partial<GameSettings> = {
      rounds,
      drawTime,
      wordCount,
      difficulty,
      categories: categories.length > 0 ? categories : ALL_CATEGORIES,
      customWords: parsedCustom,
      customWordsOnly,
      maxPlayers,
      hintsEnabled,
    };

    updateSettings(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
            <Sliders className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-white">Room & Game Settings</h2>
        </div>

        <div className="space-y-6">
          {/* Rounds & Drawing Time Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rounds</span>
                <span className="font-mono font-bold text-brand-300 text-base">{rounds}</span>
              </div>
              <input
                type="range"
                min={2}
                max={10}
                value={rounds}
                onChange={(e) => setRounds(Number(e.target.value))}
                className="w-full accent-brand-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>2</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>

            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Drawing Time</span>
                <span className="font-mono font-bold text-brand-300 text-base">{drawTime}s</span>
              </div>
              <input
                type="range"
                min={30}
                max={180}
                step={5}
                value={drawTime}
                onChange={(e) => setDrawTime(Number(e.target.value))}
                className="w-full accent-brand-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>30s</span>
                <span>80s</span>
                <span>180s</span>
              </div>
            </div>
          </div>

          {/* Difficulty & Word Choice Count */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Difficulty
              </label>
              <div className="grid grid-cols-4 gap-1.5 bg-slate-900/60 p-1 rounded-xl">
                {(['all', 'easy', 'medium', 'hard'] as WordDifficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`py-1.5 text-xs font-bold capitalize rounded-lg transition-all ${
                      difficulty === d
                        ? 'bg-brand-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Word Choices to Drawer
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[3, 4, 5].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setWordCount(cnt)}
                    className={`py-1.5 text-xs font-bold rounded-xl border transition-all ${
                      wordCount === cnt
                        ? 'bg-brand-600/30 border-brand-500 text-brand-300'
                        : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cnt} Words
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Categories Multiselect */}
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50">
            <div className="flex justify-between items-center mb-2.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Word Categories ({categories.length} selected)
              </label>
              <button
                type="button"
                onClick={() => setCategories(categories.length === ALL_CATEGORIES.length ? [] : ALL_CATEGORIES)}
                className="text-xs text-brand-400 hover:underline"
              >
                {categories.length === ALL_CATEGORIES.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((cat) => {
                const selected = categories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                      selected
                        ? 'bg-brand-600/30 border-brand-500 text-brand-300'
                        : 'bg-slate-900/40 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {selected && <Check className="w-3.5 h-3.5 text-brand-400" />}
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Words */}
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Custom Words (Comma separated)
            </label>
            <textarea
              rows={2}
              value={customWordsText}
              onChange={(e) => setCustomWordsText(e.target.value)}
              placeholder="e.g. Iron Man, Millennium Falcon, Rick Roll..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={customWordsOnly}
                onChange={(e) => setCustomWordsOnly(e.target.checked)}
                className="rounded accent-brand-500"
              />
              <span className="text-xs text-slate-300 font-medium">Only use custom words</span>
            </label>
          </div>

          {/* Toggles: Hints and Max Players */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50 flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Word Hints</span>
                <span className="text-xs text-slate-500">Gradually reveal letters</span>
              </div>
              <input
                type="checkbox"
                checked={hintsEnabled}
                onChange={(e) => setHintsEnabled(e.target.checked)}
                className="w-5 h-5 accent-brand-500 cursor-pointer"
              />
            </div>

            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Max Players</span>
                <span className="font-mono font-bold text-brand-300 text-sm">{maxPlayers}</span>
              </div>
              <input
                type="range"
                min={2}
                max={16}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full accent-brand-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="mt-6 w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-base shadow-lg shadow-brand-500/30 transition-all active:scale-[0.98]"
        >
          Apply Settings
        </button>
      </div>
    </div>
  );
};
