import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { RoomManager } from './rooms/RoomManager.js';
import { setupSocketHandlers } from './socket/socketHandler.js';
import { CATEGORIES } from './utils/words.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || '*';

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
}));
app.use(express.json());

// Socket.io configuration with ping intervals and CORS
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  maxHttpBufferSize: 1e6, // 1MB buffer for stroke data
});

const roomManager = new RoomManager(io);
setupSocketHandlers(io, roomManager);

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

app.get('/api/categories', (req, res) => {
  res.json({ categories: CATEGORIES });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const room = roomManager.getRoom(req.params.roomId);
  if (!room) {
    return res.status(404).json({ exists: false, error: 'Room not found' });
  }
  const connectedCount = Array.from(room.players.values()).filter(p => p.isConnected).length;
  res.json({
    exists: true,
    roomId: room.id,
    playerCount: connectedCount,
    maxPlayers: room.settings.maxPlayers,
    phase: room.gameEngine.getGameState().phase,
  });
});

// Serve built React client in production / standalone mode
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

httpServer.listen(PORT, () => {
  console.log(`🚀 DoodleDash server listening on http://localhost:${PORT}`);
});
