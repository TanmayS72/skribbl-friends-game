import { Server } from 'socket.io';
import crypto from 'crypto';
import { RoomData, GameSettings, Player, DrawAction, ChatMessage } from '../types/game.js';
import { GameEngine } from '../game/GameEngine.js';
import { CATEGORIES } from '../utils/words.js';
import { RoomStore, PersistedRoomRecord, PlayerSessionRecord } from '../storage/RoomStore.js';

export const DEFAULT_SETTINGS: GameSettings = {
  rounds: 3,
  drawTime: 80,
  wordCount: 3,
  difficulty: 'all',
  categories: [...CATEGORIES],
  customWords: [],
  customWordsOnly: false,
  maxPlayers: 10,
  hintsEnabled: true,
};

export const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export class Room {
  public id: string;
  public hostId: string;
  public settings: GameSettings;
  public players: Map<string, Player> = new Map();
  public playerSessions: Map<string, PlayerSessionRecord> = new Map();
  public gameEngine: GameEngine;
  public chatHistory: ChatMessage[] = [];
  public createdAt: number = Date.now();
  public lastActiveAt: number = Date.now();

  constructor(id: string, hostPlayer: Player, io: Server, existingSettings?: GameSettings) {
    this.id = id;
    this.hostId = hostPlayer.id;
    this.settings = existingSettings ? { ...existingSettings } : { ...DEFAULT_SETTINGS };
    this.players.set(hostPlayer.id, hostPlayer);

    this.gameEngine = new GameEngine(
      this.id,
      this.settings,
      this.players,
      {
        onStateUpdate: (state) => {
          io.to(this.id).emit('game_state_update', state);
        },
        onDrawerWordChoices: (drawerSocketId, choices) => {
          io.to(drawerSocketId).emit('word_choices', choices);
        },
        onChatMessage: (msg) => {
          this.chatHistory.push(msg);
          if (this.chatHistory.length > 80) this.chatHistory.shift();
          io.to(this.id).emit('chat_message', msg);
        },
        onCloseGuessNotification: (socketId) => {
          io.to(socketId).emit('close_guess_notification');
        },
        onCanvasClear: () => {
          io.to(this.id).emit('draw_action', { type: 'clear' });
        },
        onSoundTrigger: (sound, targetSocketId) => {
          if (targetSocketId) {
            io.to(targetSocketId).emit('sound_effect', sound);
          } else {
            io.to(this.id).emit('sound_effect', sound);
          }
        },
        onScoresUpdate: () => {
          io.to(this.id).emit('room_data', this.toJSON());
        },
      }
    );
  }

  public toPersistedRecord(): PersistedRoomRecord {
    const sessionsObj: Record<string, PlayerSessionRecord> = {};
    this.playerSessions.forEach((s, id) => {
      sessionsObj[id] = s;
    });

    return {
      id: this.id,
      host_id: this.hostId,
      settings: this.settings,
      status: this.gameEngine.getGameState().phase,
      created_at: this.createdAt,
      last_active_at: this.lastActiveAt,
      expires_at: this.lastActiveAt + TWENTY_FOUR_HOURS,
      player_sessions: sessionsObj,
    };
  }

  public toJSON(): RoomData {
    const playersObj: Record<string, Player> = {};
    this.players.forEach((p, id) => {
      playersObj[id] = p;
    });

    return {
      id: this.id,
      hostId: this.hostId,
      settings: this.settings,
      players: playersObj,
      gameState: this.gameEngine.getGameState(),
      drawHistory: this.gameEngine.getDrawHistory(),
      createdAt: this.createdAt,
    };
  }
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private socketToPlayerMap: Map<string, { roomId: string; playerId: string }> = new Map();
  private io: Server;
  private roomStore: RoomStore;

  constructor(io: Server) {
    this.io = io;
    this.roomStore = new RoomStore();

    // Periodic sweep for 24-hour inactive rooms (every 5 minutes)
    setInterval(() => {
      this.cleanupInactiveRooms();
    }, 5 * 60 * 1000);
  }

  public async initialize(): Promise<void> {
    try {
      const activeRecords = await this.roomStore.loadAllActiveRooms();
      for (const rec of activeRecords) {
        if (!this.rooms.has(rec.id)) {
          this.rehydrateRoom(rec);
        }
      }
      if (activeRecords.length > 0) {
        console.log(`📦 Re-hydrated ${activeRecords.length} active room(s) from persistent store.`);
      }
    } catch (err: any) {
      console.warn('⚠️ RoomManager initialization warning:', err.message);
    }
  }

  private rehydrateRoom(record: PersistedRoomRecord): Room {
    const hostSession = record.player_sessions[record.host_id] || Object.values(record.player_sessions)[0];
    const dummyHost: Player = {
      id: record.host_id,
      socketId: '',
      nickname: hostSession?.nickname || 'Host',
      avatar: hostSession?.avatar || '🦊',
      color: hostSession?.color || '#ec4899',
      score: hostSession?.score || 0,
      roundScore: 0,
      isHost: true,
      isReady: false,
      isConnected: false,
      hasGuessed: false,
    };

    const room = new Room(record.id, dummyHost, this.io, record.settings);
    room.createdAt = record.created_at;
    room.lastActiveAt = record.last_active_at;

    // Populate all known player sessions with isConnected = false
    for (const [pId, sess] of Object.entries(record.player_sessions)) {
      room.playerSessions.set(pId, sess);
      room.players.set(pId, {
        id: pId,
        socketId: '',
        nickname: sess.nickname,
        avatar: sess.avatar,
        color: sess.color,
        score: sess.score,
        roundScore: 0,
        isHost: sess.isHost,
        isReady: false,
        isConnected: false,
        hasGuessed: false,
      });
    }

    // Interrupted game recovery: always reset phase to LOBBY
    room.gameEngine.resetToLobby();

    this.rooms.set(record.id, room);
    return room;
  }

  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing 0/O, 1/I
    let code = '';
    for (let attempt = 0; attempt < 100; attempt++) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (!this.rooms.has(code)) return code;
    }
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  public createRoom(hostPlayer: Player): { room: Room; sessionToken: string } {
    const roomId = this.generateRoomCode();
    const room = new Room(roomId, hostPlayer, this.io);
    const sessionToken = crypto.randomBytes(16).toString('hex');

    room.playerSessions.set(hostPlayer.id, {
      playerId: hostPlayer.id,
      sessionToken,
      nickname: hostPlayer.nickname,
      avatar: hostPlayer.avatar,
      color: hostPlayer.color,
      isHost: true,
      score: hostPlayer.score,
      lastSeen: Date.now(),
    });

    this.rooms.set(roomId, room);
    this.socketToPlayerMap.set(hostPlayer.socketId, { roomId, playerId: hostPlayer.id });

    // Persist room metadata
    this.roomStore.saveRoom(room.toPersistedRecord());

    return { room, sessionToken };
  }

  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId.toUpperCase().trim());
  }

  public async getRoomAsync(roomId: string): Promise<Room | undefined> {
    const cleanId = roomId.toUpperCase().trim();
    const existing = this.rooms.get(cleanId);
    if (existing) return existing;

    // Check persistent store if not found in memory
    const record = await this.roomStore.getRoom(cleanId);
    if (record) {
      return this.rehydrateRoom(record);
    }
    return undefined;
  }

  public getPlayerRoom(socketId: string): { roomId: string; playerId: string } | undefined {
    return this.socketToPlayerMap.get(socketId);
  }

  public leaveRoom(socketId: string): { roomId: string; playerId: string; roomDeleted: boolean } | null {
    const mapping = this.socketToPlayerMap.get(socketId);
    if (!mapping) return null;

    const { roomId, playerId } = mapping;
    this.socketToPlayerMap.delete(socketId);

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.get(playerId);
    const playerName = player ? player.nickname : 'A player';

    // Remove player from active list
    room.players.delete(playerId);
    room.lastActiveAt = Date.now();

    // Check how many players are still connected
    const remainingConnected = Array.from(room.players.values()).filter(p => p.isConnected);

    // If nobody remains, DO NOT delete room immediately! Keep it joinable for 24 hours.
    if (remainingConnected.length === 0) {
      room.gameEngine.clearTimer();
      this.roomStore.saveRoom(room.toPersistedRecord());
      return { roomId, playerId, roomDeleted: false };
    }

    // Inform game engine if game was active (explicit leave: advance turn if drawer left)
    room.gameEngine.handlePlayerDisconnect(playerId, true);

    // If host left, migrate host to next connected player
    if (room.hostId === playerId) {
      const nextHost = remainingConnected[0];
      if (nextHost) {
        room.hostId = nextHost.id;
        nextHost.isHost = true;
        const hostSession = room.playerSessions.get(nextHost.id);
        if (hostSession) hostSession.isHost = true;

        this.io.to(roomId).emit('chat_message', {
          id: Math.random().toString(36).substring(2, 9),
          senderName: 'Game',
          text: `${nextHost.nickname} is now the host.`,
          type: 'system',
          timestamp: Date.now(),
        });
      }
    }

    this.roomStore.saveRoom(room.toPersistedRecord());

    // Broadcast updated room data and leave message
    this.io.to(roomId).emit('room_data', room.toJSON());
    this.io.to(roomId).emit('chat_message', {
      id: Math.random().toString(36).substring(2, 9),
      senderName: 'Game',
      text: `${playerName} left the room.`,
      type: 'leave',
      timestamp: Date.now(),
    });

    return { roomId, playerId, roomDeleted: false };
  }

  public joinRoom(
    roomId: string,
    player: Player
  ): { success: boolean; room?: Room; sessionToken?: string; error?: string } {
    const cleanId = roomId.toUpperCase().trim();
    let room = this.rooms.get(cleanId);

    if (!room) {
      return { success: false, error: 'Room not found. Check the code and try again.' };
    }

    // Check capacity
    const connectedCount = Array.from(room.players.values()).filter(p => p.isConnected).length;
    if (connectedCount >= room.settings.maxPlayers) {
      return { success: false, error: 'Room is full! Maximum capacity reached.' };
    }

    // Check duplicate nickname for newly joining different players
    const existingNick = Array.from(room.players.values()).find(
      p => p.isConnected && p.nickname.toLowerCase() === player.nickname.toLowerCase() && p.id !== player.id
    );
    if (existingNick) {
      player.nickname = `${player.nickname} (${Math.floor(Math.random() * 90) + 10})`;
    }

    // Generate or refresh session token
    let sessionToken = room.playerSessions.get(player.id)?.sessionToken;
    if (!sessionToken) {
      sessionToken = crypto.randomBytes(16).toString('hex');
    }

    // Reconnection or new join
    const existingPlayer = room.players.get(player.id);
    if (existingPlayer) {
      existingPlayer.socketId = player.socketId;
      existingPlayer.isConnected = true;
      existingPlayer.nickname = player.nickname;
      existingPlayer.avatar = player.avatar;
      existingPlayer.color = player.color;
    } else {
      room.players.set(player.id, player);
    }

    room.playerSessions.set(player.id, {
      playerId: player.id,
      sessionToken,
      nickname: player.nickname,
      avatar: player.avatar,
      color: player.color,
      isHost: room.hostId === player.id,
      score: existingPlayer ? existingPlayer.score : player.score,
      lastSeen: Date.now(),
    });

    this.socketToPlayerMap.set(player.socketId, { roomId: cleanId, playerId: player.id });
    room.lastActiveAt = Date.now();

    // Persist room metadata
    this.roomStore.saveRoom(room.toPersistedRecord());

    return { success: true, room, sessionToken };
  }

  public reconnectSession(
    roomId: string,
    playerId: string,
    sessionToken: string,
    newSocketId: string
  ): { success: boolean; room?: Room; player?: Player; error?: string } {
    const cleanId = roomId.toUpperCase().trim();
    let room = this.rooms.get(cleanId);
    if (!room) {
      return { success: false, error: 'Room expired or not found.' };
    }

    const session = room.playerSessions.get(playerId);
    if (!session || session.sessionToken !== sessionToken) {
      return { success: false, error: 'Invalid or expired session token.' };
    }

    // Validate and rebind player
    let player = room.players.get(playerId);
    if (!player) {
      player = {
        id: playerId,
        socketId: newSocketId,
        nickname: session.nickname,
        avatar: session.avatar,
        color: session.color,
        score: session.score,
        roundScore: 0,
        isHost: session.isHost,
        isReady: false,
        isConnected: true,
        hasGuessed: false,
      };
      room.players.set(playerId, player);
    } else {
      player.socketId = newSocketId;
      player.isConnected = true;
    }

    session.lastSeen = Date.now();
    this.socketToPlayerMap.set(newSocketId, { roomId: room.id, playerId });
    room.lastActiveAt = Date.now();

    // Re-engage game engine if in progress
    room.gameEngine.handlePlayerReconnect(playerId, newSocketId);

    // Persist room metadata
    this.roomStore.saveRoom(room.toPersistedRecord());

    return { success: true, room, player };
  }

  public handleDisconnect(socketId: string): void {
    const mapping = this.socketToPlayerMap.get(socketId);
    if (!mapping) return;

    const { roomId, playerId } = mapping;
    this.socketToPlayerMap.delete(socketId);

    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(playerId);
    if (!player) return;

    player.isConnected = false;
    room.lastActiveAt = Date.now();

    const session = room.playerSessions.get(playerId);
    if (session) {
      session.lastSeen = Date.now();
      session.score = player.score;
    }

    // Notify game engine of temporary disconnect (with grace period)
    room.gameEngine.handlePlayerDisconnect(playerId, false);

    // If host disconnected, migrate host to next active connected player
    if (room.hostId === playerId) {
      const nextConnected = Array.from(room.players.values()).find(p => p.isConnected && p.id !== playerId);
      if (nextConnected) {
        room.hostId = nextConnected.id;
        nextConnected.isHost = true;
        player.isHost = false;
        const nextSession = room.playerSessions.get(nextConnected.id);
        if (nextSession) nextSession.isHost = true;
        if (session) session.isHost = false;

        this.io.to(roomId).emit('chat_message', {
          id: Math.random().toString(36).substring(2, 9),
          senderName: 'Game',
          text: `${nextConnected.nickname} is now the host.`,
          type: 'system',
          timestamp: Date.now(),
        });
      }
    }

    this.roomStore.saveRoom(room.toPersistedRecord());

    // Broadcast updated player list and room data
    this.io.to(roomId).emit('room_data', room.toJSON());
    this.io.to(roomId).emit('chat_message', {
      id: Math.random().toString(36).substring(2, 9),
      senderName: 'Game',
      text: `${player.nickname} disconnected.`,
      type: 'leave',
      timestamp: Date.now(),
    });
  }

  public kickPlayer(roomId: string, targetPlayerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const targetPlayer = room.players.get(targetPlayerId);
    if (!targetPlayer) return false;

    this.io.to(targetPlayer.socketId).emit('kicked', 'You were removed from the room by the host.');
    room.players.delete(targetPlayerId);
    room.playerSessions.delete(targetPlayerId);
    this.socketToPlayerMap.delete(targetPlayer.socketId);

    const targetSocket = this.io.sockets.sockets.get(targetPlayer.socketId);
    if (targetSocket) {
      targetSocket.leave(roomId);
    }

    this.roomStore.saveRoom(room.toPersistedRecord());

    this.io.to(roomId).emit('room_data', room.toJSON());
    this.io.to(roomId).emit('chat_message', {
      id: Math.random().toString(36).substring(2, 9),
      senderName: 'Game',
      text: `${targetPlayer.nickname} was kicked by the host.`,
      type: 'system',
      timestamp: Date.now(),
    });

    return true;
  }

  private cleanupInactiveRooms(): void {
    const now = Date.now();

    this.rooms.forEach((room, id) => {
      // Room expires ONLY after 24 hours of inactivity
      if (now - room.lastActiveAt > TWENTY_FOUR_HOURS) {
        room.gameEngine.clearTimer();
        this.rooms.delete(id);
        this.roomStore.deleteRoom(id);
      }
    });

    this.roomStore.cleanupExpiredRooms();
  }
}
