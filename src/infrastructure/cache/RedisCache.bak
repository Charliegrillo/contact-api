import { createClient, RedisClientType } from 'redis';

/**
 * CAPA 2: Caché en Redis
 * - Almacenamiento en Redis (key-value store)
 * - Rápido (5-10ms)
 * - Persiste entre reinicios
 * - Compartido entre múltiples instancias
 * - Ideal para datos frecuentes
 */
export class RedisCache {
    private static instance: RedisCache;
    private client: RedisClientType;
    private isConnected: boolean = false;

    private constructor() {
        this.client = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            password: process.env.REDIS_PASSWORD,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        console.error('❌ Redis: Demasiados reintentos');
                        return new Error('Max retries reached');
                    }
                    return Math.min(retries * 100, 3000);
                }
            }
        });

        // Eventos
        this.client.on('connect', () => {
            console.log('✅ CAPA 2: Redis connected');
            this.isConnected = true;
        });

        this.client.on('error', (error) => {
            console.error('❌ CAPA 2: Redis error:', error);
            this.isConnected = false;
        });

        this.client.on('end', () => {
            console.log('🔌 CAPA 2: Redis disconnected');
            this.isConnected = false;
        });

        // Conectar
        this.connect();
    }

    private async connect(): Promise<void> {
        try {
            await this.client.connect();
        } catch (error) {
            console.error('❌ Error connecting to Redis:', error);
            // No lanzar error, la app funciona sin Redis
        }
    }

    public static getInstance(): RedisCache {
        if (!RedisCache.instance) {
            RedisCache.instance = new RedisCache();
        }
        return RedisCache.instance;
    }

    /**
     * Obtener valor
     */
    public async get<T>(key: string): Promise<T | null> {
        if (!this.isConnected) {
            console.log('⚠️ CAPA 2: Redis no conectado');
            return null;
        }

        try {
            const value = await this.client.get(key);
            
            if (value) {
                console.log(`✅ CAPA 2 HIT: ${key}`);
                return JSON.parse(value) as T;
            }
            
            console.log(`❌ CAPA 2 MISS: ${key}`);
            return null;
        } catch (error) {
            console.error(`Error getting Redis key ${key}:`, error);
            return null;
        }
    }

    /**
     * Guardar valor
     */
    public async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
        if (!this.isConnected) {
            console.log('⚠️ CAPA 2: Redis no conectado');
            return;
        }

        try {
            const jsonValue = JSON.stringify(value);
            const ttl = ttlSeconds || 300; // Default 5 minutos
            
            await this.client.setEx(key, ttl, jsonValue);
            console.log(`💾 CAPA 2 SET: ${key} (TTL: ${ttl}s)`);
        } catch (error) {
            console.error(`Error setting Redis key ${key}:`, error);
        }
    }

    /**
     * Eliminar valor
     */
    public async delete(key: string): Promise<void> {
        if (!this.isConnected) return;

        try {
            await this.client.del(key);
            console.log(`🗑️ CAPA 2 DELETE: ${key}`);
        } catch (error) {
            console.error(`Error deleting Redis key ${key}:`, error);
        }
    }

    /**
     * Eliminar por patrón
     */
    public async deleteByPattern(pattern: string): Promise<void> {
        if (!this.isConnected) return;

        try {
            const keys = await this.client.keys(pattern);
            
            if (keys.length > 0) {
                await this.client.del(keys);
                console.log(`🗑️ CAPA 2 DELETE PATTERN: ${pattern} (${keys.length} keys)`);
            }
        } catch (error) {
            console.error(`Error deleting Redis pattern ${pattern}:`, error);
        }
    }

    /**
     * Limpiar todo
     */
    public async clear(): Promise<void> {
        if (!this.isConnected) return;

        try {
            await this.client.flushAll();
            console.log('🧹 CAPA 2 CLEARED');
        } catch (error) {
            console.error('Error clearing Redis:', error);
        }
    }

    /**
     * Verificar si existe
     */
    public async has(key: string): Promise<boolean> {
        if (!this.isConnected) return false;

        try {
            return await this.client.exists(key) === 1;
        } catch (error) {
            return false;
        }
    }

    /**
     * Obtener TTL restante
     */
    public async getTtl(key: string): Promise<number> {
        if (!this.isConnected) return -1;

        try {
            return await this.client.ttl(key);
        } catch (error) {
            return -1;
        }
    }

    /**
     * Incrementar contador
     */
    public async increment(key: string): Promise<number> {
        if (!this.isConnected) return 0;

        try {
            return await this.client.incr(key);
        } catch (error) {
            return 0;
        }
    }
}

export default RedisCache;