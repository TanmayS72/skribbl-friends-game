import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { RoomData, GameState, ChatMessage, DrawAction, GameSettings, Player } from '../types/game.js';
import { socketService } from '../socket/socketClient.js';
import { sounds } from '../audio/SoundEngine.js';

export interface PlayerProfile {
  id: string;
  nickname: string;
  avatar: string;
  color: string;
}

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected' | 'restoring';

interface GameContextType {
  profile: PlayerProfile;
  updateProfile: (updates: Partial<PlayerProfile>) => void;
  room: RoomData | null;
  gameState: GameState | null;
  chatMessages: ChatMessage[];
  wordChoices: string[] | null;
  isDrawer: boolean;
  isHost: boolean;
  latestDrawAction: DrawAction | null;
  canvasSnapshot: DrawAction[] | null;
  closeGuessAlert: boolean;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  error: string | null;
  clearError: () => void;
  createRoom: () => Promise<string | null>;
  joinRoom: (roomId: string) => Promise<boolean>;
  leaveRoom: () => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  toggleReady: () => void;
  startGame: () => void;
  selectWord: (word: string) => void;
  sendChatMessage: (text: string) => void;
  sendDrawAction: (action: DrawAction) => void;
  sendUndo: () => void;
  sendClear: () => void;
  kickPlayer: (playerId: string) => void;
  transferHost: (playerId: string) => void;
  rematch: () => void;
}

const DEFAULT_AVATARS = ['🦊', '🐼', '🦁', '🐯', '🐸', '🦄', '🤖', '👾', '🚀', '🎨', '⚡', '🍕', '🐱', '🐶', '🐙', '🦖'];
const DEFAULT_COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#ef4444', '#14b8a6'];

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load saved profile or generate fresh defaults
  const [profile, setProfile] = useState<PlayerProfile>(() => {
    const saved = localStorage.getItem('doodledash_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    const randomAvatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
    const randomColor = DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
    const randomNum = Math.floor(Math.random() * 900) + 100;
    return {
      id: 'p_' + Math.random().toString(36).substring(2, 9),
      nickname: `Doodler#${randomNum}`,
      avatar: randomAvatar,
      color: randomColor,
    };
  });

  const [room, setRoom] = useState<RoomData | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [wordChoices, setWordChoices] = useState<string[] | null>(null);
  const [latestDrawAction, setLatestDrawAction] = useState<DrawAction | null>(null);
  const [canvasSnapshot, setCanvasSnapshot] = useState<DrawAction[] | null>(null);
  const [closeGuessAlert, setCloseGuessAlert] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const socket = socketService.getSocket();

  const updateProfile = (updates: Partial<PlayerProfile>) => {
    setProfile(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem('doodledash_profile', JSON.stringify(next));
      return next;
    });
  };

  const clearError = () => setError(null);

  // Setup Socket listeners
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);

      // Attempt automatic session restoration if reconnecting
      const savedSessionRaw = localStorage.getItem('doodledash_active_session');
      if (savedSessionRaw) {
        try {
          const session = JSON.parse(savedSessionRaw);
          if (session && session.roomId && session.sessionToken) {
            setConnectionStatus('restoring');
            socket.emit('reconnect_session', session, (response: any) => {
              if (response && response.success) {
                setRoom(response.room);
                if (response.room.gameState) {
                  setGameState(response.room.gameState);
                }
                setConnectionStatus('connected');
                try {
                  const url = new URL(window.location.href);
                  url.searchParams.set('room', response.room.id);
                  window.history.replaceState({}, document.title, url.pathname + url.search);
                } catch (e) {}
              } else {
                localStorage.removeItem('doodledash_active_session');
                setConnectionStatus('connected');
                if (response?.error && response.error.includes('expired')) {
                  setError('Room has expired after 24 hours of inactivity.');
                }
              }
            });
            return;
          }
        } catch (e) {
          localStorage.removeItem('doodledash_active_session');
        }
      }
      setConnectionStatus('connected');
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };

    const onReconnectAttempt = () => {
      setConnectionStatus('reconnecting');
    };

    const onRoomData = (data: RoomData) => {
      setRoom(data);
      if (data.gameState) {
        setGameState(data.gameState);
      }
    };

    const onGameStateUpdate = (state: GameState) => {
      setGameState(state);
      if (state.phase !== 'CHOOSING_WORD') {
        setWordChoices(null);
      }
    };

    const onWordChoices = (choices: string[]) => {
      setWordChoices(choices);
      sounds.playPop();
    };

    const onChatMessage = (msg: ChatMessage) => {
      setChatMessages(prev => {
        // Prevent duplicate message IDs
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev.slice(-80), msg];
      });
    };

    const onChatHistory = (history: ChatMessage[]) => {
      if (!Array.isArray(history)) return;
      setChatMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const newOnes = history.filter(m => !existingIds.has(m.id));
        return [...prev, ...newOnes].slice(-80);
      });
    };

    const onCloseGuess = () => {
      setCloseGuessAlert(true);
      setTimeout(() => setCloseGuessAlert(false), 2000);
    };

    const onDrawAction = (action: DrawAction) => {
      setLatestDrawAction(action);
    };

    const onCanvasSnapshot = (history: DrawAction[]) => {
      setCanvasSnapshot(history);
    };

    const onSoundEffect = (sound: string) => {
      switch (sound) {
        case 'ROUND_START':
          sounds.playRoundStart();
          break;
        case 'ROUND_END':
          sounds.playRoundEnd();
          break;
        case 'CORRECT_GUESS':
          sounds.playCorrect();
          break;
        case 'HINT_REVEAL':
          sounds.playHintReveal();
          break;
        case 'GAME_OVER':
          sounds.playGameOver();
          break;
        case 'DING':
          sounds.playPop();
          break;
        default:
          sounds.playPop();
          break;
      }
    };

    const onKicked = (reason: string) => {
      localStorage.removeItem('doodledash_active_session');
      setRoom(null);
      setGameState(null);
      setChatMessages([]);
      setWordChoices(null);
      setLatestDrawAction(null);
      setCanvasSnapshot(null);
      setError(reason || 'You were kicked from the room.');

      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('room')) {
          url.searchParams.delete('room');
          window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
        }
      } catch (e) {}
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reconnect_attempt', onReconnectAttempt);
    socket.on('room_data', onRoomData);
    socket.on('game_state_update', onGameStateUpdate);
    socket.on('word_choices', onWordChoices);
    socket.on('chat_message', onChatMessage);
    socket.on('chat_history', onChatHistory);
    socket.on('close_guess_notification', onCloseGuess);
    socket.on('draw_action', onDrawAction);
    socket.on('canvas_snapshot', onCanvasSnapshot);
    socket.on('sound_effect', onSoundEffect);
    socket.on('kicked', onKicked);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('reconnect_attempt', onReconnectAttempt);
      socket.off('room_data', onRoomData);
      socket.off('game_state_update', onGameStateUpdate);
      socket.off('word_choices', onWordChoices);
      socket.off('chat_message', onChatMessage);
      socket.off('chat_history', onChatHistory);
      socket.off('close_guess_notification', onCloseGuess);
      socket.off('draw_action', onDrawAction);
      socket.off('canvas_snapshot', onCanvasSnapshot);
      socket.off('sound_effect', onSoundEffect);
      socket.off('kicked', onKicked);
    };
  }, [socket]);

  // In-flight request guards
  const isCreatingRoomRef = useRef(false);
  const isJoiningRoomRef = useRef(false);

  // Actions
  const createRoom = useCallback(async (): Promise<string | null> => {
    if (isCreatingRoomRef.current) return null;
    isCreatingRoomRef.current = true;
    clearError();

    return new Promise((resolve) => {
      socket.emit('create_room', profile, (response: any) => {
        isCreatingRoomRef.current = false;
        if (response && response.success) {
          const sessionData = {
            roomId: response.room.id,
            playerId: response.playerId || profile.id,
            sessionToken: response.sessionToken,
          };
          localStorage.setItem('doodledash_active_session', JSON.stringify(sessionData));

          setRoom(response.room);
          setGameState(response.room.gameState);
          setChatMessages([]);
          setWordChoices(null);
          setLatestDrawAction(null);
          setCanvasSnapshot(null);

          try {
            const url = new URL(window.location.href);
            url.searchParams.set('room', response.room.id);
            window.history.replaceState({}, document.title, url.pathname + url.search);
          } catch (e) {}

          resolve(response.room.id);
        } else {
          setError(response?.error || 'Failed to create room');
          resolve(null);
        }
      });
    });
  }, [socket, profile]);

  const joinRoom = useCallback(async (roomId: string): Promise<boolean> => {
    if (isJoiningRoomRef.current) return false;
    isJoiningRoomRef.current = true;
    clearError();

    const cleanRoomId = (roomId || '').toUpperCase().trim();
    if (!cleanRoomId) {
      isJoiningRoomRef.current = false;
      return false;
    }

    return new Promise((resolve) => {
      socket.emit('join_room', { roomId: cleanRoomId, player: profile }, (response: any) => {
        isJoiningRoomRef.current = false;
        if (response && response.success) {
          const sessionData = {
            roomId: response.room.id,
            playerId: response.playerId || profile.id,
            sessionToken: response.sessionToken,
          };
          localStorage.setItem('doodledash_active_session', JSON.stringify(sessionData));

          setRoom(response.room);
          setGameState(response.room.gameState);
          setWordChoices(null);

          try {
            const url = new URL(window.location.href);
            url.searchParams.set('room', response.room.id);
            window.history.replaceState({}, document.title, url.pathname + url.search);
          } catch (e) {}

          resolve(true);
        } else {
          setError(response?.error || 'Failed to join room');
          resolve(false);
        }
      });
    });
  }, [socket, profile]);

  const leaveRoom = useCallback(() => {
    localStorage.removeItem('doodledash_active_session');
    socket.emit('leave_room');

    setRoom(null);
    setGameState(null);
    setChatMessages([]);
    setWordChoices(null);
    setLatestDrawAction(null);
    setCanvasSnapshot(null);
    clearError();

    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('room')) {
        url.searchParams.delete('room');
        window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
      }
    } catch (e) {}
  }, [socket]);

  const updateSettings = useCallback((settings: Partial<GameSettings>) => {
    if (!room) return;
    socket.emit('update_settings', { roomId: room.id, settings });
  }, [socket, room]);

  const toggleReady = useCallback(() => {
    if (!room) return;
    socket.emit('toggle_ready', { roomId: room.id });
  }, [socket, room]);

  const startGame = useCallback(() => {
    if (!room) return;
    socket.emit('start_game', { roomId: room.id });
  }, [socket, room]);

  const selectWord = useCallback((word: string) => {
    if (!room) return;
    socket.emit('select_word', { roomId: room.id, word });
    setWordChoices(null);
  }, [socket, room]);

  const sendChatMessage = useCallback((text: string) => {
    if (!room || !text.trim()) return;
    socket.emit('chat_message', { roomId: room.id, text });
  }, [socket, room]);

  const sendDrawAction = useCallback((action: DrawAction) => {
    if (!room) return;
    socket.emit('draw_action', { roomId: room.id, action });
  }, [socket, room]);

  const sendUndo = useCallback(() => {
    if (!room) return;
    socket.emit('draw_undo', { roomId: room.id });
  }, [socket, room]);

  const sendClear = useCallback(() => {
    if (!room) return;
    socket.emit('draw_clear', { roomId: room.id });
  }, [socket, room]);

  const kickPlayer = useCallback((playerId: string) => {
    if (!room) return;
    socket.emit('kick_player', { roomId: room.id, targetPlayerId: playerId });
  }, [socket, room]);

  const transferHost = useCallback((playerId: string) => {
    if (!room) return;
    socket.emit('transfer_host', { roomId: room.id, targetPlayerId: playerId });
  }, [socket, room]);

  const rematch = useCallback(() => {
    if (!room) return;
    socket.emit('rematch', { roomId: room.id });
  }, [socket, room]);

  const isDrawer = Boolean(gameState && gameState.currentDrawerId === profile.id);
  const isHost = Boolean(room && room.hostId === profile.id);

  return (
    <GameContext.Provider
      value={{
        profile,
        updateProfile,
        room,
        gameState,
        chatMessages,
        wordChoices,
        isDrawer,
        isHost,
        latestDrawAction,
        canvasSnapshot,
        closeGuessAlert,
        isConnected,
        connectionStatus,
        error,
        clearError,
        createRoom,
        joinRoom,
        leaveRoom,
        updateSettings,
        toggleReady,
        startGame,
        selectWord,
        sendChatMessage,
        sendDrawAction,
        sendUndo,
        sendClear,
        kickPlayer,
        transferHost,
        rematch,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
