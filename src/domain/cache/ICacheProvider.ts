/**
 * Interfaz de caché genérica
 * Cualquier proveedor (Turso KV, Redis, Memcached) debe implementar esto
 */
export interface ICacheProvider {
    /**
     * Obtener valor del caché
     */
    get<T>(key: string): Promise<T | null>;
    
    /**
     * Guardar valor en caché
     */
    set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
    
    /**
     * Eliminar valor del caché
     */
    delete(key: string): Promise<void>;
    
    /**
     * Eliminar por patrón
     */
    deleteByPattern(pattern: string): Promise<void>;
    
    /**
     * Limpiar caché expirado
     */
    cleanExpired(): Promise<void>;
    
    /**
     * Verificar si está disponible
     */
    isAvailable(): boolean;
    
    /**
     * Obtener nombre del proveedor
     */
    getName(): string;
}