import { io, Socket } from 'socket.io-client';

class SocketClient {
  private socket: Socket | null = null;
  private url: string;

  constructor() {
    // If running in development with Vite proxy, use empty string or relative path,
    // or explicit env VITE_SERVER_URL / localhost:4000
    this.url = (import.meta as any).env?.VITE_SERVER_URL || '';
  }

  public connect(): Socket {
    if (!this.socket) {
      this.socket = io(this.url, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        console.log('⚡ Connected to DoodleDash server:', this.socket?.id);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('⚠️ Disconnected from server:', reason);
      });
    }
    return this.socket;
  }

  public getSocket(): Socket {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }
}

export const socketService = new SocketClient();
