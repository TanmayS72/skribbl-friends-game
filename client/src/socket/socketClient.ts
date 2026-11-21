import { io, Socket } from 'socket.io-client';

class SocketClient {
  private socket: Socket | null = null;
  private url: string;

  constructor() {
    this.url = (import.meta as any).env?.VITE_SERVER_URL || '';
    this.setupWindowListeners();
  }

  private setupWindowListeners(): void {
    if (typeof window === 'undefined') return;

    // Fast-reconnect when device regains network connectivity
    window.addEventListener('online', () => {
      console.log('🌐 Browser went online. Re-engaging socket connection...');
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    });

    // Fast-reconnect when user returns to tab / unlocks mobile device
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.socket && !this.socket.connected) {
        console.log('📱 Tab became active. Checking connection...');
        this.socket.connect();
      }
    });
  }

  public connect(): Socket {
    if (!this.socket) {
      this.socket = io(this.url, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity, // Never permanently abandon reconnection on free Render tier
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000, // Exponential backoff capped at 5s
        randomizationFactor: 0.5,
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        console.log('⚡ Connected to DoodleDash server:', this.socket?.id);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('⚠️ Disconnected from server:', reason);
      });

      this.socket.on('reconnect_attempt', (attempt) => {
        console.log(`🔄 Reconnect attempt #${attempt}...`);
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
