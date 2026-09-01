import { Client } from '@libsql/client';
import { TursoClient } from '../database/TursoClient';

/**
 * CAPA 3: Caché en Base de Datos
 * - Almacenamiento en tablas de caché en Turso
 * - Velocidad media (20-50ms)
 * - Persistente
 * - Compartido entre instancias
 * - Ideal para datos menos frecuentes
 */
export class DatabaseCache {
    private static instance: DatabaseCache;
    private client: Client;

    private constructor() {
        this.client = TursoClient.getInstance();
        this.initialize();
    }

    private async initialize(): Promise<void> {
        // Tabla principal de caché
        await this.client.execute(`
            CREATE TABLE IF NOT EXISTS cache_store (
                cache_key TEXT PRIMARY KEY,
                cache_value TEXT NOT NULL,
                layer TEXT NOT NULL DEFAULT 'database',
                ttl_seconds INTEGER NOT NULL DEFAULT 300,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                hit_count INTEGER DEFAULT 0,
                last_accessed_at TEXT
            )
        `);

        // Índice para búsqueda rápida
        await this.client.execute(`
            CREATE INDEX IF NOT EXISTS idx_cache_expires 
            ON cache_store(expires_at)
        `);

        // Índice para capa
        await this.client.execute(`
            CREATE INDEX IF NOT EXISTS idx_cache_layer 
            ON cache_store(layer)
        `);

        console.log('✅ CAPA 3: Database Cache initialized');
    }

    public static getInstance(): DatabaseCache {
        if (!DatabaseCache.instance) {
            DatabaseCache.instance = new DatabaseCache();
        }
        return DatabaseCache.instance;
    }

    /**
     * Obtener valor del caché
     */
    public async get<T>(key: string): Promise<T | null> {
        try {
            const result = await this.client.execute({
                sql: `SELECT cache_value, hit_count FROM cache_store 
                      WHERE cache_key = ? AND expires_at > ?`,
                args: [key, new Date().toISOString()]
            });

            if (result.rows.length === 0) {
                console.log(`❌ CAPA 3 MISS: ${key}`);
                return null;
            }

            const value = JSON.parse(result.rows[0].cache_value as string);
            const hitCount = (result.rows[0].hit_count as number) + 1;

            // Actualizar contador de hits
            await this.client.execute({
                sql: `UPDATE cache_store 
                      SET hit_count = ?, last_accessed_at = ? 
                      WHERE cache_key = ?`,
                args: [hitCount, new Date().toISOString(), key]
            });

            console.log(`✅ CAPA 3 HIT: ${key} (Hits: ${hitCount})`);
            return value as T;
        } catch (error) {
            console.error(`Error getting DB cache ${key}:`, error);
            return null;
        }
    }

    /**
     * Guardar valor en caché
     */
    public async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
        try {
            const ttl = ttlSeconds || 300; // Default 5 minutos
            const now = new Date();
            const expiresAt = new Date(now.getTime() + ttl * 1000);

            await this.client.execute({
                sql: `INSERT OR REPLACE INTO cache_store 
                      (cache_key, cache_value, layer, ttl_seconds, created_at, expires_at, hit_count, last_accessed_at) 
                      VALUES (?, ?, 'database', ?, ?, ?, 0, ?)`,
                args: [
                    key,
                    JSON.stringify(value),
                    ttl,
                    now.toISOString(),
                    expiresAt.toISOString(),
                    now.toISOString()
                ]
            });

            console.log(`💾 CAPA 3 SET: ${key} (TTL: ${ttl}s)`);
        } catch (error) {
            console.error(`Error setting DB cache ${key}:`, error);
        }
    }

    /**
     * Eliminar valor del caché
     */
    public async delete(key: string): Promise<void> {
        try {
            await this.client.execute({
                sql: 'DELETE FROM cache_store WHERE cache_key = ?',
                args: [key]
            });
            console.log(`🗑️ CAPA 3 DELETE: ${key}`);
        } catch (error) {
            console.error(`Error deleting DB cache ${key}:`, error);
        }
    }

    /**
     * Eliminar por patrón
     */
    public async deleteByPattern(pattern: string): Promise<void> {
        try {
            const result = await this.client.execute({
                sql: `DELETE FROM cache_store WHERE cache_key LIKE ?`,
                args: [`%${pattern}%`]
            });
            console.log(`🗑️ CAPA 3 DELETE PATTERN: ${pattern}`);
        } catch (error) {
            console.error(`Error deleting DB cache pattern ${pattern}:`, error);
        }
    }

    /**
     * Limpiar caché expirado
     */
    public async cleanExpired(): Promise<void> {
        try {
            const result = await this.client.execute(
                `DELETE FROM cache_store WHERE expires_at < ?`,
                [new Date().toISOString()]
            );
            console.log(`🧹 CAPA 3 CLEANED: ${result.rowsAffected} expired entries`);
        } catch (error) {
            console.error('Error cleaning expired cache:', error);
        }
    }

    /**
     * Obtener estadísticas
     */
    public async getStats(): Promise<any> {
        try {
            const result = await this.client.execute(`
                SELECT 
                    COUNT(*) as total_entries,
                    SUM(CASE WHEN expires_at > datetime('now') THEN 1 ELSE 0 END) as active_entries,
                    SUM(hit_count) as total_hits,
                    AVG(hit_count) as avg_hits
                FROM cache_store
            `);

            return result.rows[0];
        } catch (error) {
            console.error('Error getting cache stats:', error);
            return null;
        }
    }
}

export default DatabaseCache;