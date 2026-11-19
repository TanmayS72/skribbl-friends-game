import { Server } from 'socket.io';
import { RoomData, GameSettings, Player, DrawAction, ChatMessage } from '../types/game.js';
import { GameEngine } from '../game/GameEngine.js';
import { CATEGORIES } from '../utils/words.js';

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

export class Room {
  public id: string;
  public hostId: string;
  public settings: GameSettings;
  public players: Map<string, Player> = new Map();
  public gameEngine: GameEngine;
  public chatHistory: ChatMessage[] = [];
  public createdAt: number = Date.now();
  public lastActiveAt: number = Date.now();

  constructor(id: string, hostPlayer: Player, io: Server) {
    this.id = id;
    this.hostId = hostPlayer.id;
    this.settings = { ...DEFAULT_SETTINGS };
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
          if (this.chatHistory.length > 100) this.chatHistory.shift();
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
      }
    );
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

  constructor(io: Server) {
    this.io = io;

    // Periodic sweep for empty/abandoned rooms (every 5 minutes)
    setInterval(() => {
      this.cleanupInactiveRooms();
    }, 5 * 60 * 1000);
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

  public createRoom(hostPlayer: Player): Room {
    const roomId = this.generateRoomCode();
    const room = new Room(roomId, hostPlayer, this.io);
    this.rooms.set(roomId, room);
    this.socketToPlayerMap.set(hostPlayer.socketId, { roomId, playerId: hostPlayer.id });
    return room;
  }

  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId.toUpperCase().trim());
  }

  public joinRoom(roomId: string, player: Player): { success: boolean; room?: Room; error?: string } {
    const cleanId = roomId.toUpperCase().trim();
    const room = this.rooms.get(cleanId);
    if (!room) {
      return { success: false, error: 'Room not found. Check the code and try again.' };
    }

    // Check capacity
    const connectedCount = Array.from(room.players.values()).filter(p => p.isConnected).length;
    if (connectedCount >= room.settings.maxPlayers) {
      return { success: false, error: 'Room is full! Maximum capacity reached.' };
    }

    // Check duplicate nickname
    const existingNick = Array.from(room.players.values()).find(
      p => p.isConnected && p.nickname.toLowerCase() === player.nickname.toLowerCase() && p.id !== player.id
    );
    if (existingNick) {
      player.nickname = `${player.nickname} (${Math.floor(Math.random() * 90) + 10})`;
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

    this.socketToPlayerMap.set(player.socketId, { roomId: cleanId, playerId: player.id });
    room.lastActiveAt = Date.now();

    return { success: true, room };
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

    // Notify game engine
    room.gameEngine.handlePlayerDisconnect(playerId);

    // If host disconnected, migrate host to next connected player
    if (room.hostId === playerId) {
      const nextConnected = Array.from(room.players.values()).find(p => p.isConnected && p.id !== playerId);
      if (nextConnected) {
        room.hostId = nextConnected.id;
        nextConnected.isHost = true;
        player.isHost = false;
        this.io.to(roomId).emit('chat_message', {
          id: Math.random().toString(36).substring(2, 9),
          senderName: 'Game',
          text: `${nextConnected.nickname} is now the host.`,
          type: 'system',
          timestamp: Date.now(),
        });
      }
    }

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
    this.socketToPlayerMap.delete(targetPlayer.socketId);

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
    const TWO_HOURS = 2 * 60 * 60 * 1000;

    this.rooms.forEach((room, id) => {
      const activeCount = Array.from(room.players.values()).filter(p => p.isConnected).length;
      if (activeCount === 0 || now - room.lastActiveAt > TWO_HOURS) {
        room.gameEngine.clearTimer();
        this.rooms.delete(id);
      }
    });
  }
}
