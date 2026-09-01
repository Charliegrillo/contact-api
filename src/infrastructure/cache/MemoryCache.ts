import NodeCache from 'node-cache';

/**
 * CAPA 1: Caché en Memoria
 * - Almacenamiento en RAM del servidor
 * - Ultra rápido (1-5ms)
 * - No persiste entre reinicios
 * - Ideal para datos ultra frecuentes
 */
export class MemoryCache {
    private static instance: MemoryCache;
    private cache: NodeCache;

    private constructor() {
        this.cache = new NodeCache({
            stdTTL: 60,           // 60 segundos por defecto
            checkperiod: 30,      // Verificar expiración cada 30 segundos
            useClones: false,     // No clonar (mejor rendimiento)
            maxKeys: 1000,        // Máximo 1000 claves
            deleteOnExpire: true  // Eliminar al expirar
        });

        // Eventos
        this.cache.on('expired', (key, value) => {
            console.log(`⏰ Memory Cache EXPIRED: ${key}`);
        });

        this.cache.on('del', (key, value) => {
            console.log(`🗑️ Memory Cache DELETED: ${key}`);
        });

        this.cache.on('flush', () => {
            console.log('🧹 Memory Cache FLUSHED');
        });

        console.log('✅ CAPA 1: Memory Cache initialized');
    }

    public static getInstance(): MemoryCache {
        if (!MemoryCache.instance) {
            MemoryCache.instance = new MemoryCache();
        }
        return MemoryCache.instance;
    }

    /**
     * Obtener valor
     */
    public get<T>(key: string): T | undefined {
        const value = this.cache.get<T>(key);
        
        if (value !== undefined) {
            console.log(`✅ CAPA 1 HIT: ${key}`);
        } else {
            console.log(`❌ CAPA 1 MISS: ${key}`);
        }
        
        return value;
    }

    /**
     * Guardar valor
     */
    public set<T>(key: string, value: T, ttlSeconds?: number): void {
        const ttl = ttlSeconds || 60; // Default 60 segundos
        this.cache.set(key, value, ttl);
        console.log(`💾 CAPA 1 SET: ${key} (TTL: ${ttl}s)`);
    }

    /**
     * Eliminar valor
     */
    public delete(key: string): void {
        this.cache.del(key);
        console.log(`🗑️ CAPA 1 DELETE: ${key}`);
    }

    /**
     * Limpiar todo
     */
    public clear(): void {
        this.cache.flushAll();
        console.log('🧹 CAPA 1 CLEARED');
    }

    /**
     * Verificar si existe
     */
    public has(key: string): boolean {
        return this.cache.has(key);
    }

    /**
     * Obtener todas las claves
     */
    public getKeys(): string[] {
        return this.cache.keys();
    }

    /**
     * Obtener estadísticas
     */
    public getStats(): any {
        return this.cache.getStats();
    }

    /**
     * Obtener TTL restante
     */
    public getTtl(key: string): number | undefined {
        return this.cache.getTtl(key);
    }
}

export default MemoryCache;