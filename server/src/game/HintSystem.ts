import { WordHint } from '../types/game.js';

export class HintSystem {
  private word: string = '';
  private category: string = '';
  private lettersOnlyIndices: number[] = [];
  private revealedIndices: Set<number> = new Set();
  private maxReveals: number = 0;

  public initialize(word: string, category: string): WordHint {
    this.word = word;
    this.category = category;
    this.revealedIndices.clear();
    this.lettersOnlyIndices = [];

    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      if (/[a-zA-Z0-9]/.test(char)) {
        this.lettersOnlyIndices.push(i);
      }
    }

    const totalLetters = this.lettersOnlyIndices.length;
    // Reveal at most 40-50% of letters, minimum 0 (if word <= 3 chars, maybe 1 at low time)
    if (totalLetters <= 3) {
      this.maxReveals = 1;
    } else if (totalLetters <= 6) {
      this.maxReveals = 2;
    } else if (totalLetters <= 9) {
      this.maxReveals = 3;
    } else {
      this.maxReveals = Math.floor(totalLetters * 0.45);
    }

    return this.getHintObject();
  }

  // Called each second with timeRemaining and totalTime
  public update(timeRemaining: number, totalTime: number): { hint: WordHint; newlyRevealed: boolean } {
    if (this.lettersOnlyIndices.length === 0 || this.maxReveals === 0) {
      return { hint: this.getHintObject(), newlyRevealed: false };
    }

    // Determine how many letters should be revealed by now based on fraction of time elapsed
    // E.g. at 60% remaining (40% elapsed), 1st reveal; at 35% remaining (65% elapsed), 2nd reveal; etc.
    const timeElapsedPercent = (totalTime - timeRemaining) / totalTime;
    
    // Milestones: e.g. for maxReveals = 2: milestone 1 at 35% elapsed, milestone 2 at 70% elapsed
    const targetRevealsCount = Math.min(
      this.maxReveals,
      Math.floor(timeElapsedPercent / (1 / (this.maxReveals + 1)))
    );

    let newlyRevealed = false;
    while (this.revealedIndices.size < targetRevealsCount) {
      const unrevealed = this.lettersOnlyIndices.filter(idx => !this.revealedIndices.has(idx));
      if (unrevealed.length === 0) break;
      const pick = unrevealed[Math.floor(Math.random() * unrevealed.length)];
      this.revealedIndices.add(pick);
      newlyRevealed = true;
    }

    return { hint: this.getHintObject(), newlyRevealed };
  }

  public getHintObject(): WordHint {
    let displayed = '';
    for (let i = 0; i < this.word.length; i++) {
      const char = this.word[i];
      if (!/[a-zA-Z0-9]/.test(char)) {
        // Space or punctuation
        displayed += char;
      } else if (this.revealedIndices.has(i)) {
        displayed += char.toUpperCase();
      } else {
        displayed += '_';
      }
      if (i < this.word.length - 1 && char !== ' ') {
        displayed += ' ';
      }
    }

    return {
      displayed,
      length: this.word.length,
      letterCount: this.lettersOnlyIndices.length,
      revealedIndices: Array.from(this.revealedIndices),
      category: this.category,
    };
  }
}
