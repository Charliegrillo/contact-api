import { createClient, RedisClientType } from 'redis';
import { ICacheProvider } from '../../../domain/cache/ICacheProvider';

export class RedisCacheProvider implements ICacheProvider {
    private client: RedisClientType;
    private isConnected: boolean = false;

    constructor() {
        this.client = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            password: process.env.REDIS_PASSWORD,
            socket: {
                connectTimeout: 5000,
                reconnectStrategy: (retries) => {
                    if (retries > 5) return new Error('Max retries');
                    return Math.min(retries * 1000, 3000);
                }
            }
        });

        this.setupEvents();
        this.connect();
    }

    private setupEvents(): void {
        this.client.on('connect', () => {
            this.isConnected = true;
            console.log('✅ Redis Cache Provider connected');
        });

        this.client.on('error', (error) => {
            this.isConnected = false;
            if (error.code !== 'ECONNREFUSED') {
                console.error('Redis error:', error);
            }
        });
    }

    private async connect(): Promise<void> {
        try {
            await this.client.connect();
        } catch (error) {
            console.warn('⚠️ Redis not available, using fallback');
        }
    }

    getName(): string {
        return 'redis';
    }

    isAvailable(): boolean {
        return this.isConnected;
    }

    async get<T>(key: string): Promise<T | null> {
        if (!this.isConnected) return null;

        try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) as T : null;
        } catch (error) {
            console.error(`Error getting ${key}:`, error);
            return null;
        }
    }

    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
        if (!this.isConnected) return;

        try {
            const ttl = ttlSeconds || 300;
            await this.client.setEx(key, ttl, JSON.stringify(value));
        } catch (error) {
            console.error(`Error setting ${key}:`, error);
        }
    }

    async delete(key: string): Promise<void> {
        if (!this.isConnected) return;

        try {
            await this.client.del(key);
        } catch (error) {
            console.error(`Error deleting ${key}:`, error);
        }
    }

    async deleteByPattern(pattern: string): Promise<void> {
        if (!this.isConnected) return;

        try {
            const keys = await this.client.keys(`*${pattern}*`);
            if (keys.length > 0) {
                await this.client.del(keys);
            }
        } catch (error) {
            console.error(`Error deleting pattern ${pattern}:`, error);
        }
    }

    async cleanExpired(): Promise<void> {
        // Redis maneja expiración automáticamente
        // No necesita limpieza manual
    }
}