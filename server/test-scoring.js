import assert from 'assert';
import { ScoringSystem } from './dist/game/ScoringSystem.js';
import { GameEngine } from './dist/game/GameEngine.js';

console.log('🧪 Starting Time-Based Scoring & Lifecycle Test Suite...\n');

// ======================================================================
// 1. PURE FORMULA TESTS: Guesser Scoring
// Formula: remainingRatio = remainingTime / totalRoundTime
//          guesserPoints = 100 + floor(400 * remainingRatio)
// ======================================================================
console.log('--- 1. Testing Guesser Scoring Formula ---');

const TOTAL_TIME = 80;

// Test exact examples from specification
assert.strictEqual(
  ScoringSystem.calculateGuesserScore(80, TOTAL_TIME),
  500,
  'Max score immediately at start should be 500'
);

assert.strictEqual(
  ScoringSystem.calculateGuesserScore(75, TOTAL_TIME),
  475,
  'Guess after 5 seconds (75s left) must be 475'
);

assert.strictEqual(
  ScoringSystem.calculateGuesserScore(60, TOTAL_TIME),
  400,
  'Guess after 20 seconds (60s left) must be 400'
);

assert.strictEqual(
  ScoringSystem.calculateGuesserScore(40, TOTAL_TIME),
  300,
  'Guess after 40 seconds (40s left) must be 300'
);

assert.strictEqual(
  ScoringSystem.calculateGuesserScore(20, TOTAL_TIME),
  200,
  'Guess after 60 seconds (20s left) must be 200'
);

assert.strictEqual(
  ScoringSystem.calculateGuesserScore(1, TOTAL_TIME),
  105,
  'Guess after 79 seconds (1s left) must be 105'
);

assert.strictEqual(
  ScoringSystem.calculateGuesserScore(0, TOTAL_TIME),
  100,
  'Guess right before timeout (0s left) must be 100'
);

// Bounds & Clamping checks
assert.strictEqual(
  ScoringSystem.calculateGuesserScore(100, TOTAL_TIME),
  500,
  'Remaining time exceeding total should be clamped to 500'
);

assert.strictEqual(
  ScoringSystem.calculateGuesserScore(-5, TOTAL_TIME),
  100,
  'Negative remaining time should return minimum 100'
);

console.log('✅ Guesser scoring formula verified with 100% precision (100 to 500 range).');

// ======================================================================
// 2. PURE FORMULA TESTS: Drawer Scoring
// Formula: drawerBonus = 25 + floor(75 * remainingRatio)
// ======================================================================
console.log('\n--- 2. Testing Drawer Scoring Formula ---');

assert.strictEqual(
  ScoringSystem.calculateDrawerBonus(80, TOTAL_TIME),
  100,
  'Max drawer bonus for instantaneous guess must be 100'
);

// 75s / 80s = 0.9375 -> 25 + floor(75 * 0.9375) = 25 + 70 = 95
assert.strictEqual(
  ScoringSystem.calculateDrawerBonus(75, TOTAL_TIME),
  95,
  'Drawer bonus at 75s left must be 95'
);

// 60s / 80s = 0.75 -> 25 + floor(75 * 0.75) = 25 + 56 = 81
assert.strictEqual(
  ScoringSystem.calculateDrawerBonus(60, TOTAL_TIME),
  81,
  'Drawer bonus at 60s left must be 81'
);

// 40s / 80s = 0.5 -> 25 + floor(75 * 0.5) = 25 + 37 = 62
assert.strictEqual(
  ScoringSystem.calculateDrawerBonus(40, TOTAL_TIME),
  62,
  'Drawer bonus at 40s left must be 62'
);

// 20s / 80s = 0.25 -> 25 + floor(75 * 0.25) = 25 + 18 = 43
assert.strictEqual(
  ScoringSystem.calculateDrawerBonus(20, TOTAL_TIME),
  43,
  'Drawer bonus at 20s left must be 43'
);

// 1s / 80s = 0.0125 -> 25 + floor(75 * 0.0125) = 25 + 0 = 25
assert.strictEqual(
  ScoringSystem.calculateDrawerBonus(1, TOTAL_TIME),
  25,
  'Drawer bonus at 1s left must be 25'
);

assert.strictEqual(
  ScoringSystem.calculateDrawerBonus(0, TOTAL_TIME),
  25,
  'Drawer bonus at timeout must be 25'
);

console.log('✅ Drawer scoring formula verified with 100% precision (25 to 100 range).');

// ======================================================================
// 3. INTEGRATED GAME ENGINE SCORING TESTS
// ======================================================================
console.log('\n--- 3. Testing GameEngine Scoring Lifecycle & Edge Cases ---');

function setupTestEngine() {
  const players = new Map();
  players.set('p1', {
    id: 'p1',
    socketId: 's1',
    nickname: 'DrawerAlice',
    avatar: '🦊',
    color: '#6366f1',
    score: 0,
    roundScore: 0,
    isHost: true,
    isReady: true,
    isConnected: true,
    hasGuessed: false,
  });

  players.set('p2', {
    id: 'p2',
    socketId: 's2',
    nickname: 'GuesserBob',
    avatar: '🐼',
    color: '#10b981',
    score: 0,
    roundScore: 0,
    isHost: false,
    isReady: true,
    isConnected: true,
    hasGuessed: false,
  });

  players.set('p3', {
    id: 'p3',
    socketId: 's3',
    nickname: 'GuesserCharlie',
    avatar: '🦁',
    color: '#ec4899',
    score: 0,
    roundScore: 0,
    isHost: false,
    isReady: true,
    isConnected: true,
    hasGuessed: false,
  });

  let scoresUpdatedCount = 0;
  const chatMessages = [];
  const stateUpdates = [];

  const engine = new GameEngine(
    'TEST1',
    {
      rounds: 1,
      drawTime: 80,
      wordCount: 3,
      difficulty: 'all',
      categories: ['Animals'],
      customWords: [],
      customWordsOnly: false,
      maxPlayers: 8,
      hintsEnabled: false,
    },
    players,
    {
      onStateUpdate: (st) => stateUpdates.push(st),
      onDrawerWordChoices: () => {},
      onChatMessage: (msg) => chatMessages.push(msg),
      onCloseGuessNotification: () => {},
      onCanvasClear: () => {},
      onSoundTrigger: () => {},
      onScoresUpdate: () => { scoresUpdatedCount++; },
    }
  );

  return { engine, players, chatMessages, getScoresCount: () => scoresUpdatedCount };
}

// Sub-test A: Single Correct Guess & Immediate Realtime Award
{
  const { engine, players, chatMessages, getScoresCount } = setupTestEngine();
  engine.startGame();

  // Determine active drawer and eligible guesser
  const drawerId = engine.getGameState().currentDrawerId;
  const guesserId = Array.from(players.keys()).find(id => id !== drawerId);

  // Active drawer selects 'Elephant'
  engine.selectWord('Elephant');
  assert.strictEqual(engine.getGameState().phase, 'DRAWING');

  // Submit correct guess from eligible guesser
  engine.handleChatGuess(guesserId, 'Elephant');

  const guesser = players.get(guesserId);
  const drawer = players.get(drawerId);

  assert.ok(guesser.hasGuessed, 'Guesser must be marked hasGuessed');
  assert.ok(guesser.score >= 475 && guesser.score <= 500, `Guesser should receive ~500 points on immediate guess (got ${guesser.score})`);
  assert.strictEqual(guesser.roundScore, guesser.score, 'roundScore must equal turn points');
  assert.ok(drawer.score >= 95 && drawer.score <= 100, `Drawer should receive ~100 points for quick guess (got ${drawer.score})`);
  assert.strictEqual(drawer.roundScore, drawer.score, 'Drawer roundScore must match bonus');
  assert.ok(getScoresCount() >= 1, 'onScoresUpdate must be called on correct guess');

  const correctAnnounce = chatMessages.find(m => m.type === 'correct');
  assert.ok(correctAnnounce, 'Chat must announce correct guess');
  assert.ok(correctAnnounce.text.includes(guesser.score.toString()), 'Announcement must include exact points');

  engine.clearTimer();
  console.log('✅ Sub-test A: Single correct guess awarded guesser and drawer in real time.');
}

// Sub-test B: Duplicate Guess Prevention
{
  const { engine, players, getScoresCount } = setupTestEngine();
  engine.startGame();

  const drawerId = engine.getGameState().currentDrawerId;
  const guesserId = Array.from(players.keys()).find(id => id !== drawerId);

  engine.selectWord('Elephant');

  // First guess
  engine.handleChatGuess(guesserId, 'Elephant');
  const scoreAfterFirstGuess = players.get(guesserId).score;
  const drawerScoreAfterFirstGuess = players.get(drawerId).score;
  const countAfterFirst = getScoresCount();

  // Spam the same correct answer multiple times
  engine.handleChatGuess(guesserId, 'Elephant');
  engine.handleChatGuess(guesserId, 'elephant');
  engine.handleChatGuess(guesserId, 'ELEPHANT');

  assert.strictEqual(players.get(guesserId).score, scoreAfterFirstGuess, 'Guesser score must not increase on duplicate guess');
  assert.strictEqual(players.get(drawerId).score, drawerScoreAfterFirstGuess, 'Drawer score must not increase on duplicate guess');
  assert.strictEqual(getScoresCount(), countAfterFirst, 'Scores update must not trigger on duplicate guess');

  engine.clearTimer();
  console.log('✅ Sub-test B: Duplicate guess spam completely blocked (zero duplicate score awards).');
}

// Sub-test C: Drawer Cannot Guess Own Word
{
  const { engine, players } = setupTestEngine();
  engine.startGame();
  const drawerId = engine.getGameState().currentDrawerId;

  engine.selectWord('Elephant');

  // Drawer tries to guess own word
  engine.handleChatGuess(drawerId, 'Elephant');

  assert.strictEqual(players.get(drawerId).score, 0, 'Drawer must not receive points for typing own word');
  assert.strictEqual(players.get(drawerId).hasGuessed, false, 'Drawer must not be marked hasGuessed');

  engine.clearTimer();
  console.log('✅ Sub-test C: Drawer prevented from guessing or revealing own word.');
}

// Sub-test D: Multiple Guessers & Early Round Completion
{
  const { engine, players } = setupTestEngine();
  engine.startGame();
  const drawerId = engine.getGameState().currentDrawerId;
  const eligibleGuessers = Array.from(players.keys()).filter(id => id !== drawerId);

  engine.selectWord('Elephant');

  // Guesser 1 guesses
  engine.handleChatGuess(eligibleGuessers[0], 'Elephant');
  const drawerAfterG1 = players.get(drawerId).score;
  assert.ok(drawerAfterG1 > 0, 'Drawer receives bonus for first guesser');

  // Guesser 2 guesses (all eligible guessers have now guessed!)
  engine.handleChatGuess(eligibleGuessers[1], 'Elephant');
  const drawerAfterG2 = players.get(drawerId).score;
  assert.ok(drawerAfterG2 > drawerAfterG1, 'Drawer receives additional bonus for second guesser');

  // Because both eligible guessers guessed, phase should transition to ROUND_END early
  assert.strictEqual(engine.getGameState().phase, 'ROUND_END', 'Phase must transition to ROUND_END when all eligible guessers guess correctly');

  // Verify drawer is NOT awarded again on endTurn
  const drawerFinalScore = players.get(drawerId).score;
  assert.strictEqual(drawerFinalScore, drawerAfterG2, 'Drawer must NOT receive duplicate score upon round conclusion');

  engine.clearTimer();
  console.log('✅ Sub-test D: Multiple guessers accumulated drawer bonus and completed round early without duplicate awards.');
}

// Sub-test E: Zero Guessers Timeout
{
  const { engine, players } = setupTestEngine();
  engine.startGame();
  const drawerId = engine.getGameState().currentDrawerId;
  const eligibleGuessers = Array.from(players.keys()).filter(id => id !== drawerId);

  engine.selectWord('Elephant');

  // Simulate incorrect guesses during round
  engine.handleChatGuess(eligibleGuessers[0], 'Giraffe');
  engine.handleChatGuess(eligibleGuessers[1], 'Lion');

  assert.strictEqual(players.get(eligibleGuessers[0]).score, 0, 'Incorrect guesser receives 0');
  assert.strictEqual(players.get(eligibleGuessers[1]).score, 0, 'Incorrect guesser receives 0');

  // Trigger timeout (deadline elapsed)
  // When timer expires, endTurn is invoked
  engine.endTurn('Time is up!');

  // Verify round has ended and no points were awarded
  assert.strictEqual(engine.getGameState().phase, 'ROUND_END', 'Round should conclude upon timeout');
  assert.strictEqual(players.get(drawerId).score, 0, 'Drawer receives 0 points when nobody guessed');
  assert.strictEqual(players.get(eligibleGuessers[0]).score, 0, 'Guessers receive 0 points when nobody guessed');
  assert.strictEqual(players.get(eligibleGuessers[1]).score, 0, 'Guessers receive 0 points when nobody guessed');

  // A guess arriving after timeout / ROUND_END phase must NOT award any points
  engine.handleChatGuess(eligibleGuessers[0], 'Elephant');
  assert.strictEqual(players.get(eligibleGuessers[0]).score, 0, 'Guess submitted after timeout receives 0 points');
  assert.strictEqual(players.get(drawerId).score, 0, 'Drawer score remains 0 after timeout');

  engine.clearTimer();
  console.log('✅ Sub-test E: Zero correct guessers resulted in 0 points for drawer and all guessers.');
}

// Sub-test F: Rematch Resets All Scores to Zero
{
  const { engine, players } = setupTestEngine();
  engine.startGame();
  const drawerId = engine.getGameState().currentDrawerId;
  const guesserId = Array.from(players.keys()).find(id => id !== drawerId);

  engine.selectWord('Elephant');
  engine.handleChatGuess(guesserId, 'Elephant');

  assert.ok(players.get(guesserId).score > 0);
  assert.ok(players.get(drawerId).score > 0);

  // Trigger rematch
  engine.resetToLobby();

  assert.strictEqual(engine.getGameState().phase, 'LOBBY');
  players.forEach((p) => {
    assert.strictEqual(p.score, 0, `Player ${p.id} score must be 0 after rematch`);
    assert.strictEqual(p.roundScore, 0, `Player ${p.id} roundScore must be 0 after rematch`);
    assert.strictEqual(p.hasGuessed, false, `Player ${p.id} hasGuessed must be false after rematch`);
  });

  engine.clearTimer();
  console.log('✅ Sub-test F: Rematch completely reset scores and player states to 0.');
}

console.log('\n🌟 ALL SCORING UNIT AND LIFECYCLE TESTS PASSED WITH 100% SUCCESS! 🌟\n');
process.exit(0);
