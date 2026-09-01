import { MemoryCache } from './MemoryCache';
// import { RedisCache } from './RedisCache';
import { DatabaseCache } from './DatabaseCache';
import { TursoKVCache } from './TursoKVCache';

/**
 * Orquestador de caché en 3 capas
 * Implementa patrón Chain of Responsibility
 */
export class CacheManager {
    private static instance: CacheManager;
    private memoryCache: MemoryCache;
    //private redisCache: RedisCache;
    private tursoKVCache: TursoKVCache;
    private databaseCache: DatabaseCache;

    // TTL por capa (segundos)
    private readonly MEMORY_TTL = 30;    // 30 segundos
    private readonly REDIS_TTL = 300;    // 5 minutos
    private readonly KV_TTL = 300;       // 5 minutos
    private readonly DATABASE_TTL = 900; // 15 minutos

    private constructor() {
        this.memoryCache = MemoryCache.getInstance();
        //this.redisCache = RedisCache.getInstance();
        this.tursoKVCache = TursoKVCache.getInstance();
        this.databaseCache = DatabaseCache.getInstance();
        console.log('✅ Cache Manager initialized (3 layers)');
    }

    public static getInstance(): CacheManager {
        if (!CacheManager.instance) {
            CacheManager.instance = new CacheManager();
        }
        return CacheManager.instance;
    }

    /**
     * Obtener valor (busca en las 3 capas)
     */
    public async get<T>(key: string): Promise<T | null> {
        console.log(`\n🔍 Buscando en caché: ${key}`);

        // CAPA 1: Memoria
        const memoryValue = this.memoryCache.get<T>(key);
        if (memoryValue !== undefined) {
            console.log('⚡ Servido desde CAPA 1 (Memoria)');
            return memoryValue;
        }

        // CAPA 2: Redis
        /*
        const redisValue = await this.redisCache.get<T>(key);
        if (redisValue !== null) {
            console.log('🚀 Servido desde CAPA 2 (Redis)');
            // Promover a Capa 1
            this.memoryCache.set(key, redisValue, this.MEMORY_TTL);
            return redisValue;
        }
        */

        // CAPA 2: Turso KV
        const kvValue = await this.tursoKVCache.get<T>(key);
        if (kvValue !== null) {
            console.log('🚀 Servido desde CAPA 2 (Turso KV)');
            // Promover a Capa 1
            this.memoryCache.set(key, kvValue, this.MEMORY_TTL);
            return kvValue;
        }

        // CAPA 3: Base de datos
        const dbValue = await this.databaseCache.get<T>(key);
        if (dbValue !== null) {
            console.log('💾 Servido desde CAPA 3 (Database)');
            // Promover a Capa 1 y 2
            this.memoryCache.set(key, dbValue, this.MEMORY_TTL);
            // await this.redisCache.set(key, dbValue, this.REDIS_TTL);
            await this.tursoKVCache.set(key, dbValue, this.KV_TTL);
            return dbValue;
        }

        console.log('❌ No encontrado en ninguna capa');
        return null;
    }

    /**
     * Guardar valor (en las 3 capas)
     */
    public async set<T>(key: string, value: T, customTtl?: {
        memory?: number;
        //redis?: number;
        kv?: number;
        database?: number;
    }): Promise<void> {
        console.log(`\n💾 Guardando en caché: ${key}`);

        // CAPA 1: Memoria
        const memoryTtl = customTtl?.memory || this.MEMORY_TTL;
        this.memoryCache.set(key, value, memoryTtl);
        console.log(`✅ Guardado en CAPA 1 (TTL: ${memoryTtl}s)`);

        // CAPA 2: Redis
         const kvTtl = customTtl?.kv || this.KV_TTL;
        //const redisTtl = customTtl?.redis || this.REDIS_TTL;
        // await this.redisCache.set(key, value, redisTtl);
        await this.tursoKVCache.set(key, value, kvTtl);
        console.log(`✅ Guardado en CAPA 2 (TTL: ${kvTtl}s)`);

        // CAPA 3: Database
        const databaseTtl = customTtl?.database || this.DATABASE_TTL;
        await this.databaseCache.set(key, value, databaseTtl);
        console.log(`✅ Guardado en CAPA 3 (TTL: ${databaseTtl}s)`);
    }

    /**
     * Eliminar valor (de las 3 capas)
     */
    public async delete(key: string): Promise<void> {
        console.log(`\n🗑️ Eliminando de caché: ${key}`);

        // Capa 1
        this.memoryCache.delete(key);
        console.log('✅ Eliminado de CAPA 1');

        // Capa 2
        // await this.redisCache.delete(key);
        await this.tursoKVCache.delete(key);
        console.log('✅ Eliminado de CAPA 2');

        // Capa 3
        await this.databaseCache.delete(key);
        console.log('✅ Eliminado de CAPA 3');
    }

    /**
     * Eliminar por patrón
     */
    public async deleteByPattern(pattern: string): Promise<void> {
        console.log(`\n🗑️ Eliminando por patrón: ${pattern}`);

        // Capa 1
        const memoryKeys = this.memoryCache.getKeys();
        memoryKeys.forEach(key => {
            if (key.includes(pattern)) {
                this.memoryCache.delete(key);
            }
        });

        // Capa 2
        //await this.redisCache.deleteByPattern(`*${pattern}*`);
        await this.tursoKVCache.deleteByPattern(pattern);
        // Capa 3
        await this.databaseCache.deleteByPattern(pattern);
    }

    /**
     * Limpiar todas las capas
     */
    public async clearAll(): Promise<void> {
        console.log('\n🧹 Limpiando todas las capas de caché');

        this.memoryCache.clear();
        console.log('✅ CAPA 1 limpiada');

        //await this.redisCache.clear();
        await this.tursoKVCache.cleanExpired();
        console.log('✅ CAPA 2 limpiada');

        await this.databaseCache.cleanExpired();
        console.log('✅ CAPA 3 limpiada');
    }

    /**
     * Obtener estadísticas de todas las capas
     */
    public async getStats(): Promise<any> {
        return {
            layer1_memory: this.memoryCache.getStats(),
            layer2_kv: await this.tursoKVCache.getStats(),
            layer3_database: await this.databaseCache.getStats()
        };
    }
}

export default CacheManager;