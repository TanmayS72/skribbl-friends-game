export class ScoringSystem {
  /**
   * Calculates points for a guesser based on remaining round time.
   * Formula:
   * remainingRatio = remainingTime / totalRoundTime (clamped 0..1)
   * guesserPoints = 100 + floor(400 * remainingRatio)
   *
   * Expected range:
   * - Maximum: 500 points (immediate guess)
   * - Minimum: 100 points (guess right before timeout)
   * - 0 points if round ended or time expired
   *
   * @param remainingTime authoritative seconds left on the round timer
   * @param totalRoundTime total seconds allocated for the round
   */
  public static calculateGuesserScore(
    remainingTime: number,
    totalRoundTime: number
  ): number {
    if (totalRoundTime <= 0 || remainingTime <= 0) {
      return 100;
    }
    const remainingRatio = Math.max(0, Math.min(1, remainingTime / totalRoundTime));
    return 100 + Math.floor(400 * remainingRatio);
  }

  /**
   * Calculates the bonus points awarded to the drawer for a single correct guesser.
   * Formula:
   * remainingRatio = remainingTime / totalRoundTime (clamped 0..1)
   * drawerBonus = 25 + floor(75 * remainingRatio)
   *
   * Expected range:
   * - Maximum: 100 points per guesser (immediate guess)
   * - Minimum: 25 points per guesser (guess right before timeout)
   *
   * @param remainingTime authoritative seconds left when the correct guess occurred
   * @param totalRoundTime total seconds allocated for the round
   */
  public static calculateDrawerBonus(
    remainingTime: number,
    totalRoundTime: number
  ): number {
    if (totalRoundTime <= 0 || remainingTime <= 0) {
      return 25;
    }
    const remainingRatio = Math.max(0, Math.min(1, remainingTime / totalRoundTime));
    return 25 + Math.floor(75 * remainingRatio);
  }
}

