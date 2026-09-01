import { Redis } from '@upstash/redis';
import { ICacheProvider } from '../../../domain/cache/ICacheProvider';

/**
 * Proveedor de caché usando Upstash Redis
 * Usa REST API (funciona en serverless)
 */
export class UpstashRedisProvider implements ICacheProvider {
    private client: Redis;
    private isAvailableFlag: boolean = true;

    constructor() {
        // Verificar credenciales
        const url = process.env.UPSTASH_REDIS_REST_URL;
        const token = process.env.UPSTASH_REDIS_REST_TOKEN;

        if (!url || !token) {
            console.warn('⚠️ Upstash Redis no configurado');
            this.isAvailableFlag = false;
            return;
        }

        this.client = new Redis({
            url,
            token
        });

        console.log('✅ Upstash Redis Provider initialized');
    }

    getName(): string {
        return 'upstash-redis';
    }

    isAvailable(): boolean {
        return this.isAvailableFlag;
    }

    async get<T>(key: string): Promise<T | null> {
        if (!this.isAvailableFlag) return null;

        try {
            const value = await this.client.get<T>(key);
            return value ?? null;
        } catch (error) {
            console.error(`Error getting ${key}:`, error);
            return null;
        }
    }

    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
        if (!this.isAvailableFlag) return;

        try {
            const ttl = ttlSeconds || 300;
            await this.client.set(key, value, { ex: ttl });
        } catch (error) {
            console.error(`Error setting ${key}:`, error);
        }
    }

    async delete(key: string): Promise<void> {
        if (!this.isAvailableFlag) return;

        try {
            await this.client.del(key);
        } catch (error) {
            console.error(`Error deleting ${key}:`, error);
        }
    }

    async deleteByPattern(pattern: string): Promise<void> {
        if (!this.isAvailableFlag) return;

        try {
            const keys = await this.client.keys(`*${pattern}*`);
            if (keys.length > 0) {
                await this.client.del(...keys);
            }
        } catch (error) {
            console.error(`Error deleting pattern ${pattern}:`, error);
        }
    }

    async cleanExpired(): Promise<void> {
        // Upstash maneja expiración automáticamente
        // No necesita limpieza manual
    }
}