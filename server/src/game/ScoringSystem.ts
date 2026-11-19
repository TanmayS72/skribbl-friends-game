export class ScoringSystem {
  /**
   * Calculates points for a guesser who guessed correctly.
   * @param guessRank 1 for 1st guesser, 2 for 2nd, etc.
   * @param timeRemaining remaining seconds on the timer
   * @param totalTime total round drawing seconds
   */
  public static calculateGuesserScore(
    guessRank: number,
    timeRemaining: number,
    totalTime: number
  ): number {
    const timeFraction = Math.max(0, Math.min(1, timeRemaining / totalTime));
    
    // Base points scaled by how fast the guess was (100 to 350)
    const timePoints = Math.round(100 + timeFraction * 250);

    // Rank bonus
    let rankBonus = 0;
    if (guessRank === 1) {
      rankBonus = 150;
    } else if (guessRank === 2) {
      rankBonus = 90;
    } else if (guessRank === 3) {
      rankBonus = 50;
    } else {
      rankBonus = 20;
    }

    return timePoints + rankBonus;
  }

  /**
   * Calculates points for the drawer at the end of the turn.
   * @param correctGuessesCount number of players who guessed correctly
   * @param totalEligibleGuessers total players in room minus the drawer
   * @param averageTimeRemaining average time remaining when correct guesses occurred
   * @param totalTime total round time
   */
  public static calculateDrawerScore(
    correctGuessesCount: number,
    totalEligibleGuessers: number,
    averageTimeRemaining: number,
    totalTime: number
  ): number {
    if (correctGuessesCount === 0 || totalEligibleGuessers === 0) {
      return 0;
    }

    // Ratio of players who successfully guessed (0.0 - 1.0)
    const successRatio = correctGuessesCount / totalEligibleGuessers;
    const basePoints = Math.round(successRatio * 300);

    // Speed bonus: drawer drew clearly and quickly
    const speedRatio = Math.max(0, Math.min(1, averageTimeRemaining / totalTime));
    const speedBonus = Math.round(speedRatio * 150);

    return basePoints + speedBonus;
  }
}
