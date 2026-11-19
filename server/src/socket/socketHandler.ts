import { Server, Socket } from 'socket.io';
import { RoomManager } from '../rooms/RoomManager.js';
import { Player, GameSettings, DrawAction } from '../types/game.js';
import { sanitizeNickname } from '../utils/sanitizer.js';

export function setupSocketHandlers(io: Server, roomManager: RoomManager) {
  io.on('connection', (socket: Socket) => {
    // 1. Create Room
    socket.on('create_room', (playerData: { id: string; nickname: string; avatar: string; color: string }, callback) => {
      try {
        const hostPlayer: Player = {
          id: playerData.id || socket.id,
          socketId: socket.id,
          nickname: sanitizeNickname(playerData.nickname),
          avatar: playerData.avatar || '🦊',
          color: playerData.color || '#6366f1',
          score: 0,
          roundScore: 0,
          isHost: true,
          isReady: true,
          isConnected: true,
          hasGuessed: false,
        };

        const room = roomManager.createRoom(hostPlayer);
        socket.join(room.id);

        if (typeof callback === 'function') {
          callback({ success: true, room: room.toJSON() });
        }
      } catch (err: any) {
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    // 2. Join Room
    socket.on('join_room', (data: { roomId: string; player: { id: string; nickname: string; avatar: string; color: string } }, callback) => {
      try {
        const { roomId, player: pData } = data;
        const newPlayer: Player = {
          id: pData.id || socket.id,
          socketId: socket.id,
          nickname: sanitizeNickname(pData.nickname),
          avatar: pData.avatar || '🐼',
          color: pData.color || '#ec4899',
          score: 0,
          roundScore: 0,
          isHost: false,
          isReady: false,
          isConnected: true,
          hasGuessed: false,
        };

        const result = roomManager.joinRoom(roomId, newPlayer);
        if (!result.success || !result.room) {
          if (typeof callback === 'function') {
            callback({ success: false, error: result.error });
          }
          return;
        }

        const room = result.room;
        socket.join(room.id);

        // Notify room members
        io.to(room.id).emit('room_data', room.toJSON());
        io.to(room.id).emit('chat_message', {
          id: Math.random().toString(36).substring(2, 9),
          senderName: 'Game',
          text: `${newPlayer.nickname} joined the room!`,
          type: 'join',
          timestamp: Date.now(),
        });

        // Send existing draw history to joining player so they see active canvas!
        socket.emit('canvas_snapshot', room.gameEngine.getDrawHistory());

        if (typeof callback === 'function') {
          callback({ success: true, room: room.toJSON() });
        }
      } catch (err: any) {
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    // 3. Update Settings (Host only)
    socket.on('update_settings', (data: { roomId: string; settings: Partial<GameSettings> }) => {
      const room = roomManager.getRoom(data.roomId);
      if (!room) return;

      const player = Array.from(room.players.values()).find(p => p.socketId === socket.id);
      if (!player || !player.isHost) return;

      room.settings = { ...room.settings, ...data.settings };
      room.gameEngine.updateSettings(room.settings);

      io.to(room.id).emit('settings_updated', room.settings);
      io.to(room.id).emit('room_data', room.toJSON());
    });

    // 4. Toggle Ready Status
    socket.on('toggle_ready', (data: { roomId: string }) => {
      const room = roomManager.getRoom(data.roomId);
      if (!room) return;

      const player = Array.from(room.players.values()).find(p => p.socketId === socket.id);
      if (!player) return;

      player.isReady = !player.isReady;
      io.to(room.id).emit('room_data', room.toJSON());
    });

    // 5. Start Game (Host only)
    socket.on('start_game', (data: { roomId: string }) => {
      const room = roomManager.getRoom(data.roomId);
      if (!room) return;

      const player = Array.from(room.players.values()).find(p => p.socketId === socket.id);
      if (!player || !player.isHost) return;

      room.gameEngine.startGame();
    });

    // 6. Select Word (Drawer only)
    socket.on('select_word', (data: { roomId: string; word: string }) => {
      const room = roomManager.getRoom(data.roomId);
      if (!room) return;

      const currentDrawerId = room.gameEngine.getGameState().currentDrawerId;
      const player = Array.from(room.players.values()).find(p => p.socketId === socket.id);

      if (!player || player.id !== currentDrawerId) return;

      room.gameEngine.selectWord(data.word);
    });

    // 7. Draw Action (Drawer only!)
    socket.on('draw_action', (data: { roomId: string; action: DrawAction }) => {
      const room = roomManager.getRoom(data.roomId);
      if (!room) return;

      const gameState = room.gameEngine.getGameState();
      if (gameState.phase !== 'DRAWING') return;

      const currentDrawerId = gameState.currentDrawerId;
      const player = Array.from(room.players.values()).find(p => p.socketId === socket.id);

      if (!player || player.id !== currentDrawerId) return;

      // Authoritative drawing record
      room.gameEngine.addDrawAction(data.action);

      // Broadcast immediately to other players in the room
      socket.to(room.id).emit('draw_action', data.action);
    });

    // 8. Undo Draw Action (Drawer only)
    socket.on('draw_undo', (data: { roomId: string }) => {
      const room = roomManager.getRoom(data.roomId);
      if (!room) return;

      const gameState = room.gameEngine.getGameState();
      if (gameState.phase !== 'DRAWING') return;

      const currentDrawerId = gameState.currentDrawerId;
      const player = Array.from(room.players.values()).find(p => p.socketId === socket.id);
      if (!player || player.id !== currentDrawerId) return;

      room.gameEngine.undoLastDrawAction();

      // Broadcast full sync snapshot to keep everyone identical
      io.to(room.id).emit('canvas_snapshot', room.gameEngine.getDrawHistory());
    });

    // 9. Clear Canvas (Drawer only)
    socket.on('draw_clear', (data: { roomId: string }) => {
      const room = roomManager.getRoom(data.roomId);
      if (!room) return;

      const gameState = room.gameEngine.getGameState();
      if (gameState.phase !== 'DRAWING') return;

      const currentDrawerId = gameState.currentDrawerId;
      const player = Array.from(room.players.values()).find(p => p.socketId === socket.id);
      if (!player || player.id !== currentDrawerId) return;

      room.gameEngine.clearDrawHistory();
      io.to(room.id).emit('draw_action', { type: 'clear' });
    });

    // 10. Chat & Guess
    socket.on('chat_message', (data: { roomId: string; text: string }) => {
      const room = roomManager.getRoom(data.roomId);
      if (!room) return;

      const player = Array.from(room.players.values()).find(p => p.socketId === socket.id);
      if (!player) return;

      room.gameEngine.handleChatGuess(player.id, data.text);
    });

    // 11. Kick Player (Host only)
    socket.on('kick_player', (data: { roomId: string; targetPlayerId: string }) => {
      const room = roomManager.getRoom(data.roomId);
      if (!room) return;

      const host = Array.from(room.players.values()).find(p => p.socketId === socket.id);
      if (!host || !host.isHost) return;

      roomManager.kickPlayer(room.id, data.targetPlayerId);
    });

    // 12. Transfer Host (Host only)
    socket.on('transfer_host', (data: { roomId: string; targetPlayerId: string }) => {
      const room = roomManager.getRoom(data.roomId);
      if (!room) return;

      const currentHost = Array.from(room.players.values()).find(p => p.socketId === socket.id);
      if (!currentHost || !currentHost.isHost) return;

      const target = room.players.get(data.targetPlayerId);
      if (!target) return;

      currentHost.isHost = false;
      target.isHost = true;
      room.hostId = target.id;

      io.to(room.id).emit('room_data', room.toJSON());
      io.to(room.id).emit('chat_message', {
        id: Math.random().toString(36).substring(2, 9),
        senderName: 'Game',
        text: `${target.nickname} is now the host.`,
        type: 'system',
        timestamp: Date.now(),
      });
    });

    // 13. Rematch (Host or any player when game over)
    socket.on('rematch', (data: { roomId: string }) => {
      const room = roomManager.getRoom(data.roomId);
      if (!room) return;

      room.gameEngine.resetToLobby();
      io.to(room.id).emit('room_data', room.toJSON());
    });

    // 14. Disconnection
    socket.on('disconnect', () => {
      roomManager.handleDisconnect(socket.id);
    });
  });
}
