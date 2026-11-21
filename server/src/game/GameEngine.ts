import { Server } from 'socket.io';
import { GameState, GameSettings, Player, WordHint, DrawAction, ChatMessage } from '../types/game.js';
import { WordManager } from './WordManager.js';
import { HintSystem } from './HintSystem.js';
import { ScoringSystem } from './ScoringSystem.js';
import { normalizeText, isCloseGuess, sanitizeChatMessage } from '../utils/sanitizer.js';

export interface GameEngineCallbacks {
  onStateUpdate: (state: GameState) => void;
  onDrawerWordChoices: (drawerSocketId: string, choices: string[]) => void;
  onChatMessage: (message: ChatMessage) => void;
  onCloseGuessNotification: (socketId: string) => void;
  onCanvasClear: () => void;
  onSoundTrigger: (sound: string, targetSocketId?: string) => void;
  onScoresUpdate?: () => void;
}

export class GameEngine {
  private roomId: string;
  private settings: GameSettings;
  private players: Map<string, Player>;
  private gameState: GameState;
  private wordManager: WordManager;
  private hintSystem: HintSystem;
  private callbacks: GameEngineCallbacks;

  // Active turn state
  private selectedWord: string = '';
  private timerInterval: NodeJS.Timeout | null = null;
  private roundDeadline: number = 0; // Authoritative epoch ms for round timeout
  private currentPhaseDeadline: number = 0;
  private isTransitioning: boolean = false;
  private isPausedForDisconnect: boolean = false;
  private currentWordChoices: string[] = [];
  private guessTimes: number[] = []; // record timeRemaining when correct guesses occur
  private drawHistory: DrawAction[] = [];

  constructor(
    roomId: string,
    settings: GameSettings,
    players: Map<string, Player>,
    callbacks: GameEngineCallbacks
  ) {
    this.roomId = roomId;
    this.settings = settings;
    this.players = players;
    this.callbacks = callbacks;
    this.wordManager = new WordManager();
    this.hintSystem = new HintSystem();

    this.gameState = {
      phase: 'LOBBY',
      currentRound: 1,
      totalRounds: settings.rounds,
      currentDrawerId: null,
      timeRemaining: 0,
      totalTime: 0,
      hint: null,
      turnOrder: [],
      currentTurnIndex: 0,
      guessedPlayerIds: [],
      currentWordLength: 0,
      roundScores: {},
    };
  }

  public getGameState(): GameState {
    return { ...this.gameState };
  }

  public getDrawHistory(): DrawAction[] {
    return this.drawHistory;
  }

  public addDrawAction(action: DrawAction): void {
    if (action.type === 'clear') {
      this.drawHistory = [];
    } else {
      this.drawHistory.push(action);
    }
  }

  public undoLastDrawAction(): DrawAction | null {
    if (this.drawHistory.length === 0) return null;
    return this.drawHistory.pop() || null;
  }

  public clearDrawHistory(): void {
    this.drawHistory = [];
  }

  public updateSettings(newSettings: GameSettings): void {
    this.settings = newSettings;
    this.gameState.totalRounds = newSettings.rounds;
  }

  /**
   * Starts or restarts the game.
   */
  public startGame(): void {
    // Generate randomized turn order from currently connected players
    const connectedPlayerIds = Array.from(this.players.values())
      .filter(p => p.isConnected)
      .map(p => p.id);

    if (connectedPlayerIds.length < 2) {
      // In development or solo practice mode we can allow 1 player, but standard is >= 2
      // We will allow starting even with 1 player for testing/solo practice!
    }

    // Shuffle players for fair turn order
    this.gameState.turnOrder = [...connectedPlayerIds].sort(() => 0.5 - Math.random());
    this.gameState.currentRound = 1;
    this.gameState.currentTurnIndex = 0;
    this.gameState.totalRounds = this.settings.rounds;
    this.wordManager.resetUsedWords();

    // Reset scores
    this.players.forEach(p => {
      p.score = 0;
      p.roundScore = 0;
      p.hasGuessed = false;
    });
    this.callbacks.onScoresUpdate?.();

    this.startTurn();
  }

  /**
   * Starts a turn for the current drawer: presents word choices.
   */
  private startTurn(): void {
    this.clearTimer();
    this.drawHistory = [];
    this.callbacks.onCanvasClear();
    this.guessTimes = [];
    this.gameState.guessedPlayerIds = [];
    this.gameState.roundScores = {};

    // Reset round scores and guessed status for this turn
    this.players.forEach(p => {
      p.roundScore = 0;
      p.hasGuessed = false;
    });
    this.callbacks.onScoresUpdate?.();

    // Determine current drawer
    const drawerId = this.gameState.turnOrder[this.gameState.currentTurnIndex];
    const drawer = this.players.get(drawerId);

    if (!drawer || !drawer.isConnected) {
      // Drawer left, advance to next
      this.advanceTurn();
      return;
    }

    this.gameState.currentDrawerId = drawerId;
    this.gameState.phase = 'CHOOSING_WORD';
    this.gameState.timeRemaining = 15; // 15 seconds to pick a word
    this.gameState.totalTime = 15;
    this.gameState.hint = null;
    this.gameState.lastWordRevealed = undefined;
    this.currentPhaseDeadline = Date.now() + 15 * 1000;
    this.roundDeadline = this.currentPhaseDeadline;

    // Pick 3 word choices
    const count = this.settings.wordCount || 3;
    const wordChoices = this.wordManager.getWordChoices(this.settings, count);
    const choiceWords = wordChoices.map(c => c.word);
    this.currentWordChoices = choiceWords;

    // Send word choices ONLY to the drawer's socket
    this.callbacks.onDrawerWordChoices(drawer.socketId, choiceWords);

    // Broadcast state update to everyone
    this.broadcastState();

    this.callbacks.onChatMessage({
      id: Math.random().toString(36).substring(2, 9),
      senderName: 'Game',
      text: `${drawer.nickname} is choosing a word...`,
      type: 'drawer',
      timestamp: Date.now(),
    });

    // Start 15s authoritative countdown for word selection
    this.clearTimer();
    this.timerInterval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((this.currentPhaseDeadline - Date.now()) / 1000));
      this.gameState.timeRemaining = remaining;

      if (remaining <= 0) {
        this.clearTimer();
        // Auto-select 1st word if drawer didn't pick in time
        this.selectWord(choiceWords[0] || 'Apple');
      } else {
        this.broadcastState();
      }
    }, 1000);
  }

  /**
   * Called when drawer clicks a word choice or when choice timer expires.
   */
  public selectWord(word: string): void {
    if (this.gameState.phase !== 'CHOOSING_WORD' || this.isTransitioning) return;
    this.isTransitioning = true;
    this.clearTimer();

    this.selectedWord = word;
    this.gameState.phase = 'DRAWING';
    this.gameState.timeRemaining = this.settings.drawTime;
    this.gameState.totalTime = this.settings.drawTime;
    this.gameState.currentWordLength = word.length;
    this.roundDeadline = Date.now() + this.settings.drawTime * 1000;
    this.currentPhaseDeadline = this.roundDeadline;

    // Initialize progressive hint
    const initialHint = this.hintSystem.initialize(word, 'Category');
    this.gameState.hint = initialHint;

    const drawer = this.gameState.currentDrawerId ? this.players.get(this.gameState.currentDrawerId) : null;
    this.callbacks.onChatMessage({
      id: Math.random().toString(36).substring(2, 9),
      senderName: 'Game',
      text: `${drawer ? drawer.nickname : 'Drawer'} is now drawing!`,
      type: 'drawer',
      timestamp: Date.now(),
    });

    this.callbacks.onSoundTrigger('ROUND_START');
    this.broadcastState();

    // Start drawing countdown timer with authoritative deadline
    this.timerInterval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((this.roundDeadline - Date.now()) / 1000));
      this.gameState.timeRemaining = remaining;

      // Hints progressive reveal (if enabled in settings)
      if (this.settings.hintsEnabled) {
        const { hint, newlyRevealed } = this.hintSystem.update(
          this.gameState.timeRemaining,
          this.gameState.totalTime
        );
        this.gameState.hint = hint;
        if (newlyRevealed) {
          this.callbacks.onSoundTrigger('HINT_REVEAL');
        }
      }

      // Check if time expired
      if (remaining <= 0) {
        this.clearTimer();
        this.endTurn('Time is up!');
      } else {
        this.broadcastState();
      }
    }, 1000);
    this.isTransitioning = false;
  }

  /**
   * Handle incoming guess or chat message.
   */
  public handleChatGuess(playerId: string, rawText: string): void {
    const player = this.players.get(playerId);
    if (!player || !player.isConnected) return;

    const sanitized = sanitizeChatMessage(rawText);
    if (!sanitized) return;

    // If game is in DRAWING phase
    if (this.gameState.phase === 'DRAWING') {
      const isDrawer = playerId === this.gameState.currentDrawerId;

      // Drawer cannot guess or type the word in chat
      if (isDrawer) {
        const normGuess = normalizeText(sanitized);
        const normTarget = normalizeText(this.selectedWord);
        if (normGuess.includes(normTarget)) {
          // Block message that reveals word
          this.callbacks.onChatMessage({
            id: Math.random().toString(36).substring(2, 9),
            senderName: 'Game',
            text: `You cannot give away the word in chat!`,
            type: 'system',
            timestamp: Date.now(),
          });
          return;
        }

        // Drawer regular chat
        this.callbacks.onChatMessage({
          id: Math.random().toString(36).substring(2, 9),
          senderId: player.id,
          senderName: player.nickname,
          senderColor: player.color,
          text: sanitized,
          type: 'chat',
          timestamp: Date.now(),
        });
        return;
      }

      // Player has already guessed correctly in this turn: don't let them spam answers or earn duplicate points
      if (player.hasGuessed || this.gameState.guessedPlayerIds.includes(player.id)) {
        this.callbacks.onChatMessage({
          id: Math.random().toString(36).substring(2, 9),
          senderId: player.id,
          senderName: player.nickname,
          senderColor: player.color,
          text: sanitized,
          type: 'chat',
          timestamp: Date.now(),
        });
        return;
      }

      // Check for exact guess match
      const normGuess = normalizeText(sanitized);
      const normTarget = normalizeText(this.selectedWord);

      if (normGuess === normTarget) {
        // Calculate authoritative remaining seconds
        const remaining = this.roundDeadline > 0
          ? Math.min(this.settings.drawTime, Math.max(0, Math.ceil((this.roundDeadline - Date.now()) / 1000)))
          : this.gameState.timeRemaining;

        // If time already expired, round is concluding; no points awarded
        if (remaining <= 0) {
          this.endTurn('Time is up!');
          return;
        }

        // CORRECT GUESS! Immediately mark player as guessed to block race conditions & duplicates
        player.hasGuessed = true;
        this.gameState.guessedPlayerIds.push(player.id);
        this.guessTimes.push(remaining);

        // 1. Calculate time-based score using Skribbl.io formulas
        const guesserPoints = ScoringSystem.calculateGuesserScore(remaining, this.gameState.totalTime);
        const drawerBonus = ScoringSystem.calculateDrawerBonus(remaining, this.gameState.totalTime);

        // 2. Award guesser points exactly once
        player.score += guesserPoints;
        player.roundScore = guesserPoints;
        this.gameState.roundScores[player.id] = guesserPoints;

        // 3. Award drawer bonus immediately
        const drawerId = this.gameState.currentDrawerId;
        const drawer = drawerId ? this.players.get(drawerId) : null;
        if (drawerId && drawer && drawerId !== player.id) {
          drawer.score += drawerBonus;
          drawer.roundScore = (drawer.roundScore || 0) + drawerBonus;
          this.gameState.roundScores[drawerId] = drawer.roundScore;
        }

        // Sound triggers
        this.callbacks.onSoundTrigger('CORRECT_GUESS', player.socketId);
        this.callbacks.onSoundTrigger('DING');

        // Announcements
        this.callbacks.onChatMessage({
          id: Math.random().toString(36).substring(2, 9),
          senderName: 'Game',
          text: `${player.nickname} guessed the word! (+${guesserPoints} pts)`,
          type: 'correct',
          timestamp: Date.now(),
        });

        if (drawer && drawerId !== player.id) {
          this.callbacks.onChatMessage({
            id: Math.random().toString(36).substring(2, 9),
            senderName: 'Game',
            text: `${drawer.nickname} earned +${drawerBonus} pts (correct guess)`,
            type: 'system',
            timestamp: Date.now(),
          });
        }

        // Broadcast game state AND synchronize updated player scores to all clients
        this.broadcastState();
        this.callbacks.onScoresUpdate?.();

        // Check if all eligible guessers have guessed
        const eligibleGuessers = Array.from(this.players.values()).filter(
          p => p.isConnected && p.id !== this.gameState.currentDrawerId
        );

        if (this.gameState.guessedPlayerIds.length >= eligibleGuessers.length) {
          // Everyone guessed! End turn early
          this.endTurn('Everyone guessed the word!');
        }
        return;
      }

      // Check if close guess (distance = 1)
      if (isCloseGuess(sanitized, this.selectedWord)) {
        this.callbacks.onCloseGuessNotification(player.socketId);
      }

      // Regular guess message
      this.callbacks.onChatMessage({
        id: Math.random().toString(36).substring(2, 9),
        senderId: player.id,
        senderName: player.nickname,
        senderColor: player.color,
        text: sanitized,
        type: 'guess',
        timestamp: Date.now(),
      });
      return;
    }

    // Outside DRAWING phase: standard lobby or intermission chat
    this.callbacks.onChatMessage({
      id: Math.random().toString(36).substring(2, 9),
      senderId: player.id,
      senderName: player.nickname,
      senderColor: player.color,
      text: sanitized,
      type: 'chat',
      timestamp: Date.now(),
    });
  }

  /**
   * Concludes the current drawing turn.
   */
  private endTurn(reason: string): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.clearTimer();

    this.gameState.phase = 'ROUND_END';
    this.gameState.lastWordRevealed = this.selectedWord;
    this.gameState.timeRemaining = 6; // 6 seconds intermission
    this.gameState.totalTime = 6;
    this.currentPhaseDeadline = Date.now() + 6 * 1000;
    this.roundDeadline = this.currentPhaseDeadline;

    // Note: Drawer points were already awarded dynamically upon each correct guess.
    // If nobody guessed, drawer receives 0 points as intended. No points awarded after round ends.

    this.callbacks.onChatMessage({
      id: Math.random().toString(36).substring(2, 9),
      senderName: 'Game',
      text: `The word was "${this.selectedWord}"!`,
      type: 'system',
      timestamp: Date.now(),
    });

    this.callbacks.onSoundTrigger('ROUND_END');
    this.broadcastState();
    this.callbacks.onScoresUpdate?.();

    // 6-second authoritative intermission timer before advancing to next turn
    this.timerInterval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((this.currentPhaseDeadline - Date.now()) / 1000));
      this.gameState.timeRemaining = remaining;

      if (remaining <= 0) {
        this.clearTimer();
        this.advanceTurn();
      } else {
        this.broadcastState();
      }
    }, 1000);
    this.isTransitioning = false;
  }

  /**
   * Advances turn to the next player, or next round, or GAME_OVER.
   */
  private advanceTurn(): void {
    this.clearTimer();
    this.isTransitioning = false;

    // Check if any connected players remain in the room
    const activePlayers = Array.from(this.players.values()).filter(p => p.isConnected);
    if (activePlayers.length === 0) {
      this.isPausedForDisconnect = true;
      return;
    }

    this.isPausedForDisconnect = false;
    this.gameState.currentTurnIndex++;

    // Check if round finished
    if (this.gameState.currentTurnIndex >= this.gameState.turnOrder.length) {
      this.gameState.currentTurnIndex = 0;
      this.gameState.currentRound++;

      if (this.gameState.currentRound > this.gameState.totalRounds) {
        // GAME OVER!
        this.endGame();
        return;
      }
    }

    // Start next turn
    this.startTurn();
  }

  /**
   * Game Over screen.
   */
  private endGame(): void {
    this.clearTimer();
    this.isTransitioning = false;
    this.gameState.phase = 'GAME_OVER';
    this.gameState.currentDrawerId = null;
    this.gameState.timeRemaining = 0;

    this.callbacks.onSoundTrigger('GAME_OVER');
    this.callbacks.onChatMessage({
      id: Math.random().toString(36).substring(2, 9),
      senderName: 'Game',
      text: 'Game over! Check out the final leaderboard!',
      type: 'system',
      timestamp: Date.now(),
    });

    this.broadcastState();
  }

  /**
   * Reset game back to lobby for instant Rematch.
   */
  public resetToLobby(): void {
    this.clearTimer();
    this.isTransitioning = false;
    this.isPausedForDisconnect = false;
    this.drawHistory = [];
    this.callbacks.onCanvasClear();
    this.gameState.phase = 'LOBBY';
    this.gameState.currentRound = 1;
    this.gameState.currentDrawerId = null;
    this.gameState.timeRemaining = 0;
    this.gameState.hint = null;
    this.gameState.guessedPlayerIds = [];
    this.gameState.roundScores = {};

    this.players.forEach(p => {
      p.score = 0;
      p.roundScore = 0;
      p.hasGuessed = false;
    });
    this.callbacks.onScoresUpdate?.();

    this.callbacks.onChatMessage({
      id: Math.random().toString(36).substring(2, 9),
      senderName: 'Game',
      text: 'Lobby reset for a rematch! Ready up to play again.',
      type: 'system',
      timestamp: Date.now(),
    });

    this.broadcastState();
  }

  public handlePlayerDisconnect(playerId: string, isExplicitLeave: boolean = false): void {
    // If the disconnecting player is currently drawing
    if (this.gameState.phase === 'DRAWING' || this.gameState.phase === 'CHOOSING_WORD') {
      if (this.gameState.currentDrawerId === playerId) {
        if (isExplicitLeave) {
          this.callbacks.onChatMessage({
            id: Math.random().toString(36).substring(2, 9),
            senderName: 'Game',
            text: 'The drawer left the game! Skipping to next turn...',
            type: 'system',
            timestamp: Date.now(),
          });
          this.advanceTurn();
        } else {
          // Temporary disconnection: keep timer running down so drawer has a grace period to reconnect
          this.callbacks.onChatMessage({
            id: Math.random().toString(36).substring(2, 9),
            senderName: 'Game',
            text: 'The drawer disconnected. Waiting for reconnection...',
            type: 'system',
            timestamp: Date.now(),
          });
        }
      } else {
        // If guesser disconnected, check if remaining players already guessed
        const eligibleGuessers = Array.from(this.players.values()).filter(
          p => p.isConnected && p.id !== this.gameState.currentDrawerId
        );
        if (
          eligibleGuessers.length > 0 &&
          this.gameState.guessedPlayerIds.length >= eligibleGuessers.length
        ) {
          this.endTurn('Everyone guessed the word!');
        }
      }
    }
  }

  public ensureTimerRunning(): void {
    if (this.timerInterval !== null) return;
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((this.currentPhaseDeadline - now) / 1000));
    this.gameState.timeRemaining = remaining;

    if (this.gameState.phase === 'CHOOSING_WORD') {
      if (remaining <= 0) {
        this.selectWord(this.currentWordChoices[0] || 'Apple');
      } else {
        this.timerInterval = setInterval(() => {
          const rem = Math.max(0, Math.ceil((this.currentPhaseDeadline - Date.now()) / 1000));
          this.gameState.timeRemaining = rem;
          if (rem <= 0) {
            this.clearTimer();
            this.selectWord(this.currentWordChoices[0] || 'Apple');
          } else {
            this.broadcastState();
          }
        }, 1000);
      }
    } else if (this.gameState.phase === 'DRAWING') {
      if (remaining <= 0) {
        this.endTurn('Time is up!');
      } else {
        this.timerInterval = setInterval(() => {
          const rem = Math.max(0, Math.ceil((this.roundDeadline - Date.now()) / 1000));
          this.gameState.timeRemaining = rem;
          if (this.settings.hintsEnabled) {
            const { hint, newlyRevealed } = this.hintSystem.update(rem, this.gameState.totalTime);
            this.gameState.hint = hint;
            if (newlyRevealed) {
              this.callbacks.onSoundTrigger('HINT_REVEAL');
            }
          }
          if (rem <= 0) {
            this.clearTimer();
            this.endTurn('Time is up!');
          } else {
            this.broadcastState();
          }
        }, 1000);
      }
    } else if (this.gameState.phase === 'ROUND_END') {
      if (remaining <= 0) {
        this.advanceTurn();
      } else {
        this.timerInterval = setInterval(() => {
          const rem = Math.max(0, Math.ceil((this.currentPhaseDeadline - Date.now()) / 1000));
          this.gameState.timeRemaining = rem;
          if (rem <= 0) {
            this.clearTimer();
            this.advanceTurn();
          } else {
            this.broadcastState();
          }
        }, 1000);
      }
    }
  }

  public handlePlayerReconnect(playerId: string, newSocketId?: string): void {
    const player = this.players.get(playerId);
    if (!player) return;

    if (this.isPausedForDisconnect) {
      this.isPausedForDisconnect = false;
      this.advanceTurn();
      return;
    }

    const now = Date.now();
    if (this.gameState.phase === 'CHOOSING_WORD') {
      if (this.currentPhaseDeadline > 0 && now >= this.currentPhaseDeadline) {
        this.selectWord(this.currentWordChoices[0] || 'Apple');
      } else {
        this.ensureTimerRunning();
        if (this.gameState.currentDrawerId === playerId && newSocketId) {
          const choices = this.currentWordChoices.length > 0 ? this.currentWordChoices : ['Apple', 'Tree', 'House'];
          this.callbacks.onDrawerWordChoices(newSocketId, choices);
        }
      }
    } else if (this.gameState.phase === 'DRAWING') {
      if (this.currentPhaseDeadline > 0 && now >= this.currentPhaseDeadline) {
        this.endTurn('Time is up!');
      } else {
        this.ensureTimerRunning();
      }
    } else if (this.gameState.phase === 'ROUND_END') {
      if (this.currentPhaseDeadline > 0 && now >= this.currentPhaseDeadline) {
        this.advanceTurn();
      } else {
        this.ensureTimerRunning();
      }
    }

    this.broadcastState();
  }

  public clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private broadcastState(): void {
    this.callbacks.onStateUpdate(this.getGameState());
  }
}
