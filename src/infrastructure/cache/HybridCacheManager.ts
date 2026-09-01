import { MemoryCache } from './MemoryCache';
import { ICacheProvider } from '../../domain/cache/ICacheProvider';
import { CacheFactory } from './CacheFactory';

/**
 * Caché Híbrido: Eventos + TTL
 * 
 * Soporta múltiples proveedores:
 * - Turso KV (por defecto)
 * - Redis
 * - Memory
 * 
 * Cambiar proveedor = cambiar CACHE_PROVIDER en .env
 */
export class HybridCacheManager {
    private static instance: HybridCacheManager;
    private memoryCache: MemoryCache;
    private provider: ICacheProvider;

    // TTL de respaldo (segundos)
    private readonly BACKUP_TTL = 3600; // 60 minutos

    // TTL por recurso (segundos)
    private readonly RESOURCE_TTL: Record<string, number> = {
        'contacts': 3600,      // 60 minutos
        'users': 7200,         // 2 horas
        'notifications': 300,  // 5 minutos
        'stats': 1800,         // 30 minutos
        'config': 86400        // 24 horas
    };

    // Registrar última invalidación
    private lastInvalidation = new Map<string, number>();

    private constructor() {
        this.memoryCache = MemoryCache.getInstance();

        // ✅ Obtener proveedor del Factory (Turso KV o Redis)
        this.provider = CacheFactory.getProvider();

        const activeLayer2 = this.provider.getName();
        const activeLayer3 = 'Database Cache';

        console.log(`✅ Hybrid Cache Manager initialized`);
        console.log(`   ├── Capa 1: Memoria (Node-Cache)`);
        console.log(`   ├── Capa 2: ${activeLayer2} (active)`);
        console.log(`   ├── Capa 3: ${activeLayer3}`);
        console.log(`   └── Estrategia: Eventos + TTL de respaldo`);
    }

    public static getInstance(): HybridCacheManager {
        if (!HybridCacheManager.instance) {
            HybridCacheManager.instance = new HybridCacheManager();
        }
        return HybridCacheManager.instance;
    }

    /**
     * Obtener del caché con verificación híbrida
     */
    async get<T>(key: string, resource?: string): Promise<T | null> {
        const resourceType = resource || this.extractResource(key);
        
        // 1. CAPA 1: Memoria
        const memoryValue = this.memoryCache.get<T>(key);
        if (memoryValue !== undefined) {
            // Verificar TTL de respaldo
            if (this.isStale(key, resourceType)) {
                console.log(`⚠️ TTL de respaldo expirado: ${key}`);
                await this.invalidateKey(key);
                return null;
            }
            
            console.log(`⚡ HIT Capa 1 (Memoria): ${key}`);
            return memoryValue;
        }

        // 2. CAPA 2: Proveedor (Turso KV o Redis)
        const providerValue = await this.provider.get<T>(key);
        if (providerValue !== null) {
            // Verificar TTL de respaldo
            if (this.isStale(key, resourceType)) {
                await this.invalidateKey(key);
                return null;
            }
            
            console.log(`🚀 HIT Capa 2 (${this.provider.getName()}): ${key}`);
            // Promover a Capa 1
            this.memoryCache.set(key, providerValue, this.getTTL(resourceType));
            return providerValue;
        }

        console.log(`❌ MISS: ${key}`);
        return null;
    }

    /**
     * Guardar en caché con TTL de respaldo
     */
    async set<T>(key: string, value: T, resource?: string): Promise<void> {
        const resourceType = resource || this.extractResource(key);
        const ttl = this.getTTL(resourceType);

        // CAPA 1: Memoria
        this.memoryCache.set(key, value, ttl);
        
        // CAPA 2: Proveedor
        await this.provider.set(key, value, ttl);
        
        // Registrar timestamp
        this.lastInvalidation.set(key, Date.now());
        
        console.log(`💾 SET: ${key} (TTL: ${ttl}s, Proveedor: ${this.provider.getName()})`);
    }

    /**
     * Invalidar por evento (inmediato)
     */
    async invalidateByEvent(resource: string): Promise<void> {
        console.log(`\n⚡ Evento: Invalidando caché para "${resource}"`);
        
        const relatedKeys = this.getRelatedKeys(resource);
        
        for (const key of relatedKeys) {
            await this.invalidateKey(key);
        }
    }

    /**
     * Invalidar una clave específica
     */
    private async invalidateKey(key: string): Promise<void> {
        // Eliminar de memoria
        this.memoryCache.delete(key);
        
        // Eliminar del proveedor
        await this.provider.delete(key);
        
        // Registrar invalidación
        this.lastInvalidation.set(key, Date.now());
        
        console.log(`🗑️ Invalidado: ${key}`);
    }

    /**
     * Eliminar por patrón
     */
    async deleteByPattern(pattern: string): Promise<void> {
        // Capa 1: Memoria
        const memoryKeys = this.memoryCache.getKeys();
        memoryKeys.forEach(key => {
            if (key.includes(pattern)) {
                this.memoryCache.delete(key);
            }
        });

        // Capa 2: Proveedor
        await this.provider.deleteByPattern(pattern);
        
        console.log(`🗑️ Patrón invalidado: ${pattern}`);
    }

    /**
     * Limpiar todas las capas
     */
    async clearAll(): Promise<void> {
        this.memoryCache.clear();
        await this.provider.cleanExpired();
        console.log('🧹 Todas las capas limpiadas');
    }

    /**
     * Verificar si el dato está obsoleto
     */
    private isStale(key: string, resourceType: string): boolean {
        const lastInvalidation = this.lastInvalidation.get(key);
        
        if (!lastInvalidation) {
            return false;
        }
        
        const ttl = this.getTTL(resourceType);
        const elapsed = (Date.now() - lastInvalidation) / 1000;
        
        return elapsed > ttl;
    }

    /**
     * Obtener TTL por recurso
     */
    private getTTL(resourceType: string): number {
        return this.RESOURCE_TTL[resourceType] || this.BACKUP_TTL;
    }

    /**
     * Extraer tipo de recurso de la clave
     */
    private extractResource(key: string): string {
        if (key.includes('contact')) return 'contacts';
        if (key.includes('user')) return 'users';
        if (key.includes('notification')) return 'notifications';
        if (key.includes('stat')) return 'stats';
        if (key.includes('config')) return 'config';
        return 'default';
    }

    /**
     * Obtener claves relacionadas
     */
    private getRelatedKeys(resource: string): string[] {
        const keys: string[] = [];

        if (resource.includes('contact')) {
            keys.push(
                'contacts:all',
                'contacts:list',
                'contacts:page:1',
                `contacts:${resource}`
            );
        }

        if (resource.includes('user')) {
            keys.push(
                'users:all',
                'users:list',
                `users:${resource}`
            );
        }

        if (resource.includes('notification')) {
            keys.push(
                'notifications:all',
                'notifications:unread',
                `notifications:${resource}`
            );
        }

        return keys;
    }

    /**
     * Cambiar proveedor en runtime (para testing)
     */
    changeProvider(provider: ICacheProvider): void {
        this.provider = provider;
        console.log(`🔄 Proveedor cambiado a: ${provider.getName()}`);
    }

    /**
     * Obtener proveedor actual
     */
    getProvider(): ICacheProvider {
        return this.provider;
    }

    /**
     * Obtener estadísticas
     */
    getStats(): any {
        return {
            provider: this.provider.getName(),
            lastInvalidations: Object.fromEntries(this.lastInvalidation),
            memoryStats: this.memoryCache.getStats()
        };
    }
}

export default HybridCacheManager;