export type GamePhase = 'LOBBY' | 'CHOOSING_WORD' | 'DRAWING' | 'ROUND_END' | 'GAME_OVER';

export type DrawingTool = 'pencil' | 'brush' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'bucket';

export type WordDifficulty = 'all' | 'easy' | 'medium' | 'hard';

export interface Player {
  id: string;
  socketId: string;
  nickname: string;
  avatar: string;
  color: string;
  score: number;
  roundScore: number;
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
  hasGuessed: boolean;
}

export interface GameSettings {
  rounds: number;             // default: 3 (2-10)
  drawTime: number;           // default: 80 seconds (30-180)
  wordCount: number;          // choices presented: 3, 4, 5
  difficulty: WordDifficulty; // easy | medium | hard | all
  categories: string[];       // active categories
  customWords: string[];      // user provided custom words
  customWordsOnly: boolean;   // if true, only use custom words
  maxPlayers: number;         // default: 8 (2-16)
  hintsEnabled: boolean;      // reveal letters progressively
}

export interface WordHint {
  displayed: string;          // e.g. "_ _ P _ E"
  length: number;
  letterCount: number;        // alphanumeric count (excluding spaces/hyphens)
  revealedIndices: number[];
  category: string;
}

export interface DrawPoint {
  x: number;
  y: number;
}

export interface StrokeAction {
  type: 'stroke';
  tool: 'pencil' | 'brush' | 'eraser';
  color: string;
  size: number;
  points: DrawPoint[];
}

export interface ShapeAction {
  type: 'shape';
  tool: 'line' | 'rectangle' | 'circle';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  size: number;
}

export interface FillAction {
  type: 'fill';
  x: number;
  y: number;
  color: string;
}

export interface ClearAction {
  type: 'clear';
}

export type DrawAction = StrokeAction | ShapeAction | FillAction | ClearAction;

export interface ChatMessage {
  id: string;
  senderId?: string;
  senderName: string;
  senderColor?: string;
  text: string;
  type: 'chat' | 'guess' | 'correct' | 'close' | 'system' | 'drawer' | 'join' | 'leave';
  timestamp: number;
}

export interface GameState {
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  currentDrawerId: string | null;
  timeRemaining: number;
  totalTime: number;
  hint: WordHint | null;
  turnOrder: string[];
  currentTurnIndex: number;
  guessedPlayerIds: string[];
  currentWordLength: number;
  wordChoices?: string[];       // ONLY populated for current drawer in private payload!
  lastWordRevealed?: string;     // Revealed at ROUND_END
  roundScores: Record<string, number>;
}

export interface RoomData {
  id: string;
  hostId: string;
  settings: GameSettings;
  players: Record<string, Player>;
  gameState: GameState;
  drawHistory: DrawAction[];
  createdAt: number;
}
