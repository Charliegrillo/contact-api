import { Client } from '@libsql/client';
import { TursoClient } from '../../database/TursoClient';
import { ICacheProvider } from '../../../domain/cache/ICacheProvider';

export class TursoKVCacheProvider implements ICacheProvider {
    private client: Client;
    private isInit: boolean = false;

    constructor() {
        this.client = TursoClient.getInstance();
        this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            await this.client.execute(`
                CREATE TABLE IF NOT EXISTS kv_cache (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    ttl_seconds INTEGER NOT NULL DEFAULT 300,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL
                )
            `);
            this.isInit = true;
            console.log('✅ Turso KV Cache Provider initialized');
        } catch (error) {
            console.error('❌ Error initializing Turso KV:', error);
        }
    }

    getName(): string {
        return 'turso-kv';
    }

    isAvailable(): boolean {
        return this.isInit;
    }

    async get<T>(key: string): Promise<T | null> {
        if (!this.isInit) return null;

        try {
            const result = await this.client.execute({
                sql: `SELECT value FROM kv_cache WHERE key = ? AND expires_at > ?`,
                args: [key, new Date().toISOString()]
            });

            if (result.rows.length === 0) return null;
            return JSON.parse(result.rows[0].value as string) as T;
        } catch (error) {
            console.error(`Error getting cache ${key}:`, error);
            return null;
        }
    }

    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
        if (!this.isInit) return;

        try {
            const ttl = ttlSeconds || 300;
            const now = new Date();
            const expiresAt = new Date(now.getTime() + ttl * 1000);

            await this.client.execute({
                sql: `INSERT OR REPLACE INTO kv_cache (key, value, ttl_seconds, created_at, expires_at) 
                      VALUES (?, ?, ?, ?, ?)`,
                args: [key, JSON.stringify(value), ttl, now.toISOString(), expiresAt.toISOString()]
            });
        } catch (error) {
            console.error(`Error setting cache ${key}:`, error);
        }
    }

    async delete(key: string): Promise<void> {
        if (!this.isInit) return;

        try {
            await this.client.execute({
                sql: 'DELETE FROM kv_cache WHERE key = ?',
                args: [key]
            });
        } catch (error) {
            console.error(`Error deleting cache ${key}:`, error);
        }
    }

    async deleteByPattern(pattern: string): Promise<void> {
        if (!this.isInit) return;

        try {
            await this.client.execute({
                sql: 'DELETE FROM kv_cache WHERE key LIKE ?',
                args: [`%${pattern}%`]
            });
        } catch (error) {
            console.error(`Error deleting pattern ${pattern}:`, error);
        }
    }

    async cleanExpired(): Promise<void> {
        if (!this.isInit) return;

        try {
            await this.client.execute(
                'DELETE FROM kv_cache WHERE expires_at < ?',
                [new Date().toISOString()]
            );
        } catch (error) {
            console.error('Error cleaning expired:', error);
        }
    }
}