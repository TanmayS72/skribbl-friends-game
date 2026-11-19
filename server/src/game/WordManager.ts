import { WORD_DATABASE, WordEntry } from '../utils/words.js';
import { GameSettings } from '../types/game.js';

export class WordManager {
  private usedWords: Set<string> = new Set();

  public getWordChoices(settings: GameSettings, count: number = 3): WordEntry[] {
    let pool: WordEntry[] = [];

    // If customWordsOnly is checked and there are custom words
    if (settings.customWordsOnly && settings.customWords && settings.customWords.length > 0) {
      pool = settings.customWords.map(w => ({
        word: w.trim(),
        category: 'Custom',
        difficulty: 'medium' as const,
      }));
    } else {
      // Filter database by categories & difficulty
      pool = WORD_DATABASE.filter(entry => {
        const matchesCategory = settings.categories.length === 0 || settings.categories.includes(entry.category);
        const matchesDifficulty = settings.difficulty === 'all' || entry.difficulty === settings.difficulty;
        return matchesCategory && matchesDifficulty;
      });

      // Add custom words if any
      if (settings.customWords && settings.customWords.length > 0) {
        const customEntries: WordEntry[] = settings.customWords.map(w => ({
          word: w.trim(),
          category: 'Custom',
          difficulty: 'medium' as const,
        }));
        pool = [...pool, ...customEntries];
      }
    }

    if (pool.length === 0) {
      // Fallback in case filter was too strict
      pool = WORD_DATABASE;
    }

    // Try picking unused words first
    let available = pool.filter(e => !this.usedWords.has(e.word.toLowerCase()));
    if (available.length < count) {
      this.usedWords.clear();
      available = pool;
    }

    // Shuffle and pick `count`
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));

    selected.forEach(e => this.usedWords.add(e.word.toLowerCase()));
    return selected;
  }

  public resetUsedWords(): void {
    this.usedWords.clear();
  }
}
