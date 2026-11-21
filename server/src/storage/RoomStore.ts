import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameSettings, GamePhase } from '../types/game.js';

export interface PlayerSessionRecord {
  playerId: string;
  sessionToken: string;
  nickname: string;
  avatar: string;
  color: string;
  isHost: boolean;
  score: number;
  lastSeen: number;
}

export interface PersistedRoomRecord {
  id: string;
  host_id: string;
  settings: GameSettings;
  status: string;
  created_at: number;
  last_active_at: number;
  expires_at: number;
  player_sessions: Record<string, PlayerSessionRecord>;
}

export class RoomStore {
  private supabaseUrl: string | null = null;
  private supabaseKey: string | null = null;
  private localMemory: Map<string, PersistedRoomRecord> = new Map();
  private localFilePath: string;

  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL || null;
    this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || null;

    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const dataDir = path.resolve(__dirname, '../../data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      this.localFilePath = path.join(dataDir, 'rooms_store.json');
      this.loadLocalBackup();
    } catch {
      this.localFilePath = '';
    }
  }

  public isSupabaseConfigured(): boolean {
    return Boolean(this.supabaseUrl && this.supabaseKey);
  }

  private loadLocalBackup(): void {
    if (!this.localFilePath || !fs.existsSync(this.localFilePath)) return;
    try {
      const raw = fs.readFileSync(this.localFilePath, 'utf-8');
      const data: PersistedRoomRecord[] = JSON.parse(raw);
      const now = Date.now();
      for (const item of data) {
        if (item.expires_at > now) {
          this.localMemory.set(item.id, item);
        }
      }
    } catch (err) {
      console.warn('⚠️ Could not load local rooms backup:', (err as any)?.message);
    }
  }

  private saveLocalBackup(): void {
    if (!this.localFilePath) return;
    try {
      const array = Array.from(this.localMemory.values());
      fs.writeFileSync(this.localFilePath, JSON.stringify(array, null, 2), 'utf-8');
    } catch (err) {
      // Non-fatal if disk write fails
    }
  }

  public async saveRoom(record: PersistedRoomRecord): Promise<void> {
    // Always update local memory cache first for instant synchronous reads
    this.localMemory.set(record.id, record);
    this.saveLocalBackup();

    if (!this.isSupabaseConfigured()) return;

    try {
      const res = await fetch(`${this.supabaseUrl}/rest/v1/rooms?on_conflict=id`, {
        method: 'POST',
        headers: {
          'apikey': this.supabaseKey!,
          'Authorization': `Bearer ${this.supabaseKey!}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify(record),
      });

      if (!res.ok) {
        const text = await res.text();
        console.warn(`[RoomStore] Supabase saveRoom failed (${res.status}): ${text}`);
      }
    } catch (err: any) {
      console.warn('[RoomStore] Supabase saveRoom error (using local cache):', err.message);
    }
  }

  public async getRoom(roomId: string): Promise<PersistedRoomRecord | null> {
    const cleanId = roomId.toUpperCase().trim();
    const local = this.localMemory.get(cleanId);
    const now = Date.now();

    if (local) {
      if (local.expires_at > now) {
        return local;
      } else {
        this.localMemory.delete(cleanId);
        this.saveLocalBackup();
      }
    }

    if (!this.isSupabaseConfigured()) return null;

    try {
      const res = await fetch(
        `${this.supabaseUrl}/rest/v1/rooms?id=eq.${encodeURIComponent(cleanId)}&select=*`,
        {
          headers: {
            'apikey': this.supabaseKey!,
            'Authorization': `Bearer ${this.supabaseKey!}`,
            'Accept': 'application/json',
          },
        }
      );

      if (res.ok) {
        const rows: PersistedRoomRecord[] = await res.json();
        if (rows && rows.length > 0) {
          const room = rows[0];
          if (room.expires_at > now) {
            this.localMemory.set(room.id, room);
            return room;
          }
        }
      }
    } catch (err: any) {
      console.warn('[RoomStore] Supabase getRoom error:', err.message);
    }

    return null;
  }

  public async loadAllActiveRooms(): Promise<PersistedRoomRecord[]> {
    const now = Date.now();
    const result: PersistedRoomRecord[] = [];

    // Check Supabase if configured
    if (this.isSupabaseConfigured()) {
      try {
        const res = await fetch(
          `${this.supabaseUrl}/rest/v1/rooms?expires_at=gt.${now}&select=*`,
          {
            headers: {
              'apikey': this.supabaseKey!,
              'Authorization': `Bearer ${this.supabaseKey!}`,
              'Accept': 'application/json',
            },
          }
        );

        if (res.ok) {
          const rows: PersistedRoomRecord[] = await res.json();
          for (const row of rows) {
            this.localMemory.set(row.id, row);
            result.push(row);
          }
          return result;
        }
      } catch (err: any) {
        console.warn('[RoomStore] Supabase loadAllActiveRooms error (falling back to memory):', err.message);
      }
    }

    // Fallback: load from local memory
    for (const item of this.localMemory.values()) {
      if (item.expires_at > now) {
        result.push(item);
      }
    }

    return result;
  }

  public async deleteRoom(roomId: string): Promise<void> {
    const cleanId = roomId.toUpperCase().trim();
    this.localMemory.delete(cleanId);
    this.saveLocalBackup();

    if (!this.isSupabaseConfigured()) return;

    try {
      await fetch(
        `${this.supabaseUrl}/rest/v1/rooms?id=eq.${encodeURIComponent(cleanId)}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': this.supabaseKey!,
            'Authorization': `Bearer ${this.supabaseKey!}`,
          },
        }
      );
    } catch (err: any) {
      console.warn('[RoomStore] Supabase deleteRoom error:', err.message);
    }
  }

  public async cleanupExpiredRooms(): Promise<void> {
    const now = Date.now();
    let changed = false;

    for (const [id, room] of this.localMemory.entries()) {
      if (room.expires_at <= now) {
        this.localMemory.delete(id);
        changed = true;
      }
    }

    if (changed) {
      this.saveLocalBackup();
    }

    if (!this.isSupabaseConfigured()) return;

    try {
      await fetch(
        `${this.supabaseUrl}/rest/v1/rooms?expires_at=lt.${now}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': this.supabaseKey!,
            'Authorization': `Bearer ${this.supabaseKey!}`,
          },
        }
      );
    } catch (err: any) {
      // Non-fatal
    }
  }
}
