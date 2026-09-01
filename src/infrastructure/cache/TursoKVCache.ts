import { Client } from '@libsql/client';
import { TursoClient } from '../database/TursoClient';

/**
 * CAPA 2: Caché usando Turso KV
 * Reutiliza la conexión existente de Turso
 * No requiere Redis externo
 */
export class TursoKVCache {
    private static instance: TursoKVCache;
    private client: Client;
    private isInitialized: boolean = false;

    private constructor() {
        this.client = TursoClient.getInstance();
        this.initialize().catch(error => {
            console.error('❌ Error initializing Turso KV:', error);
        });
    }

    private async initialize(): Promise<void> {
        try {
            // Crear tabla KV si no existe
            await this.client.execute(`
                CREATE TABLE IF NOT EXISTS kv_cache (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    ttl_seconds INTEGER NOT NULL DEFAULT 300,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    hit_count INTEGER DEFAULT 0,
                    last_accessed_at TEXT
                )
            `);

            // Índice para expiración
            await this.client.execute(`
                CREATE INDEX IF NOT EXISTS idx_kv_expires 
                ON kv_cache(expires_at)
            `);

            // Índice para contador de hits
            await this.client.execute(`
                CREATE INDEX IF NOT EXISTS idx_kv_hits 
                ON kv_cache(hit_count)
            `);

            this.isInitialized = true;
            console.log('✅ CAPA 2: Turso KV Cache initialized');
        } catch (error) {
            console.error('❌ Error initializing Turso KV:', error);
            this.isInitialized = false;
        }
    }

    public static getInstance(): TursoKVCache {
        if (!TursoKVCache.instance) {
            TursoKVCache.instance = new TursoKVCache();
        }
        return TursoKVCache.instance;
    }

    /**
     * Verificar si está disponible
     */
    public isAvailable(): boolean {
        return this.isInitialized;
    }

    /**
     * Obtener valor
     */
    async get<T>(key: string): Promise<T | null> {
        if (!this.isInitialized) {
            return null;
        }

        try {
            const result = await this.client.execute({
                sql: `SELECT value, hit_count FROM kv_cache 
                      WHERE key = ? AND expires_at > ?`,
                args: [key, new Date().toISOString()]
            });

            if (result.rows.length === 0) {
                console.log(`❌ CAPA 2 MISS: ${key}`);
                return null;
            }

            const value = JSON.parse(result.rows[0].value as string);
            const hits = (result.rows[0].hit_count as number) + 1;

            // Actualizar contador de hits (asíncrono)
            this.client.execute({
                sql: `UPDATE kv_cache 
                      SET hit_count = ?, last_accessed_at = ? 
                      WHERE key = ?`,
                args: [hits, new Date().toISOString(), key]
            }).catch(err => console.error('Error updating hit count:', err));

            console.log(`✅ CAPA 2 HIT: ${key} (Hits: ${hits})`);
            return value as T;
        } catch (error) {
            console.error(`Error getting KV cache ${key}:`, error);
            return null;
        }
    }

    /**
     * Guardar valor
     */
    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
        if (!this.isInitialized) {
            return;
        }

        try {
            const ttl = ttlSeconds || 300;
            const now = new Date();
            const expiresAt = new Date(now.getTime() + ttl * 1000);

            await this.client.execute({
                sql: `INSERT OR REPLACE INTO kv_cache 
                      (key, value, ttl_seconds, created_at, expires_at, hit_count, last_accessed_at) 
                      VALUES (?, ?, ?, ?, ?, 0, ?)`,
                args: [
                    key,
                    JSON.stringify(value),
                    ttl,
                    now.toISOString(),
                    expiresAt.toISOString(),
                    now.toISOString()
                ]
            });

            console.log(`💾 CAPA 2 SET: ${key} (TTL: ${ttl}s)`);
        } catch (error) {
            console.error(`Error setting KV cache ${key}:`, error);
        }
    }

    /**
     * Eliminar valor
     */
    async delete(key: string): Promise<void> {
        if (!this.isInitialized) {
            return;
        }

        try {
            await this.client.execute({
                sql: 'DELETE FROM kv_cache WHERE key = ?',
                args: [key]
            });
            console.log(`🗑️ CAPA 2 DELETE: ${key}`);
        } catch (error) {
            console.error(`Error deleting KV cache ${key}:`, error);
        }
    }

    /**
     * Eliminar por patrón
     */
    async deleteByPattern(pattern: string): Promise<void> {
        if (!this.isInitialized) {
            return;
        }

        try {
            const result = await this.client.execute({
                sql: `DELETE FROM kv_cache WHERE key LIKE ?`,
                args: [`%${pattern}%`]
            });
            console.log(`🗑️ CAPA 2 DELETE PATTERN: ${pattern} (${result.rowsAffected} keys)`);
        } catch (error) {
            console.error(`Error deleting KV cache pattern ${pattern}:`, error);
        }
    }

    /**
     * Limpiar expirados
     */
    async cleanExpired(): Promise<void> {
        if (!this.isInitialized) {
            return;
        }

        try {
            const result = await this.client.execute(
                `DELETE FROM kv_cache WHERE expires_at < ?`,
                [new Date().toISOString()]
            );
            console.log(`🧹 CAPA 2 CLEANED: ${result.rowsAffected} expired entries`);
        } catch (error) {
            console.error('Error cleaning KV cache:', error);
        }
    }

    /**
     * Obtener estadísticas
     */
    async getStats(): Promise<any> {
        if (!this.isInitialized) {
            return null;
        }

        try {
            const result = await this.client.execute(`
                SELECT 
                    COUNT(*) as total_entries,
                    SUM(CASE WHEN expires_at > ? THEN 1 ELSE 0 END) as active_entries,
                    SUM(hit_count) as total_hits,
                    AVG(hit_count) as avg_hits
                FROM kv_cache
            `, [new Date().toISOString()]);

            return result.rows[0];
        } catch (error) {
            console.error('Error getting KV cache stats:', error);
            return null;
        }
    }
}

export default TursoKVCache;