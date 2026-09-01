import { MemoryCache } from './MemoryCache';
import { TursoKVCache } from './TursoKVCache';

/**
 * Caché Híbrido: Eventos + TTL
 * 
 * - Invalidación por eventos: Inmediata cuando hay cambios
 * - TTL de respaldo: 60 minutos máximo (evita datos obsoletos)
 */
export class HybridCacheManager {
    private static instance: HybridCacheManager;
    private memoryCache: MemoryCache;
    private tursoKVCache: TursoKVCache;

    // TTL de respaldo (segundos)
    private readonly BACKUP_TTL = 3600; // 60 minutos

    // TTL por recurso (segundos)
    private readonly RESOURCE_TTL: Record<string, number> = {
        'contacts': 3600,      // 60 minutos
        'users': 7200,         // 2 horas
        'notifications': 300,  // 5 minutos (cambian más)
        'stats': 1800,         // 30 minutos
        'config': 86400        // 24 horas
    };

    // Registrar última invalidación
    private lastInvalidation = new Map<string, number>();

    private constructor() {
        this.memoryCache = MemoryCache.getInstance();
        this.tursoKVCache = TursoKVCache.getInstance();
        console.log('✅ Hybrid Cache Manager initialized (Eventos + TTL)');
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
        
        // 1. Buscar en memoria
        const memoryValue = this.memoryCache.get<T>(key);
        if (memoryValue !== undefined) {
            // Verificar si el TTL de respaldo expiró
            if (this.isStale(key, resourceType)) {
                console.log(`⚠️ TTL de respaldo expirado para: ${key}`);
                console.log('🔄 Forzando actualización desde BD');
                
                // Invalidar caché obsoleta
                await this.invalidateKey(key, resourceType);
                return null;
            }
            
            console.log(`⚡ Caché HIT (Memoria): ${key}`);
            return memoryValue;
        }

        // 2. Buscar en Turso KV
        const kvValue = await this.tursoKVCache.get<T>(key);
        if (kvValue !== null) {
            // Verificar TTL de respaldo
            if (this.isStale(key, resourceType)) {
                await this.invalidateKey(key, resourceType);
                return null;
            }
            
            console.log(`🚀 Caché HIT (KV): ${key}`);
            // Promover a memoria
            this.memoryCache.set(key, kvValue);
            return kvValue;
        }

        console.log(`❌ Caché MISS: ${key}`);
        return null;
    }

    /**
     * Guardar en caché con TTL de respaldo
     */
    async set<T>(key: string, value: T, resource?: string): Promise<void> {
        const resourceType = resource || this.extractResource(key);
        const ttl = this.RESOURCE_TTL[resourceType] || this.BACKUP_TTL;

        // Guardar en memoria con TTL
        this.memoryCache.set(key, value, ttl);
        
        // Guardar en KV con TTL
        await this.tursoKVCache.set(key, value, ttl);
        
        // Registrar timestamp
        this.lastInvalidation.set(key, Date.now());
        
        console.log(`💾 Caché SET: ${key} (TTL respaldo: ${ttl}s)`);
    }

    /**
     * Invalidar por evento (inmediato)
     */
    async invalidateByEvent(resource: string): Promise<void> {
        console.log(`\n⚡ Evento detectado: Invalidando caché para "${resource}"`);
        
        const relatedKeys = this.getRelatedKeys(resource);
        
        for (const key of relatedKeys) {
            await this.invalidateKey(key, resource);
        }
    }

    /**
     * Invalidar una clave específica
     */
    private async invalidateKey(key: string, resourceType?: string): Promise<void> {
        console.log(`\n🗑️ Invalidando caché: ${key}`);
        
        // Eliminar de memoria
        this.memoryCache.delete(key);
        
        // Eliminar de KV
        await this.tursoKVCache.delete(key);
        
        // Registrar invalidación
        this.lastInvalidation.set(key, Date.now());
        
        console.log(`✅ Invalidado: ${key}`);
    }

    /**
     * Invalidar por TTL (respaldo)
     */
    async invalidateByTTL(key: string): Promise<void> {
        console.log(`\n⏰ TTL expirado: Invalidando "${key}"`);
        await this.invalidateKey(key);
    }

    /**
     * Verificar si el dato está obsoleto (TTL de respaldo)
     */
    private isStale(key: string, resourceType: string): boolean {
        const lastInvalidation = this.lastInvalidation.get(key);
        
        if (!lastInvalidation) {
            return false;
        }
        
        const ttl = this.RESOURCE_TTL[resourceType] || this.BACKUP_TTL;
        const elapsed = (Date.now() - lastInvalidation) / 1000;
        
        return elapsed > ttl;
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
     * Obtener estadísticas
     */
    getStats(): any {
        return {
            lastInvalidations: Object.fromEntries(this.lastInvalidation),
            memoryStats: this.memoryCache.getStats()
        };
    }
}

export default HybridCacheManager;