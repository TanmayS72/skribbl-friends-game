export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics/accents
    .replace(/[^a-z0-9 ]/g, '')     // remove punctuation
    .replace(/\s+/g, ' ')           // collapse multiple spaces
    .trim();
}

export function sanitizeNickname(name: string): string {
  if (!name) return 'Guest';
  const cleaned = name
    .replace(/[<>'"/\\&]/g, '')
    .trim()
    .slice(0, 18);
  return cleaned.length > 0 ? cleaned : 'Guest';
}

export function sanitizeChatMessage(text: string): string {
  if (!text) return '';
  return text
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 140);
}

// Levenshtein distance for "You are close!" feedback
export function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix: number[][] = [];
  for (let i = 0; i <= bn; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= an; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[bn][an];
}

export function isCloseGuess(guess: string, target: string): boolean {
  const normGuess = normalizeText(guess);
  const normTarget = normalizeText(target);
  if (normGuess === normTarget) return false; // exact match handled separately
  if (normTarget.length <= 3) return false;   // too short for fuzzy distance 1

  const dist = levenshteinDistance(normGuess, normTarget);
  return dist === 1;
}
