import { Request, Response, NextFunction } from 'express';
import { HybridCacheManager } from '../../cache/HybridCacheManager';

/**
 * Middleware de caché para controlar qué endpoints se cachean
 * y con qué estrategia (solo memoria, solo Redis, etc.)
 */
export class CacheMiddleware {
    private static cacheManager = HybridCacheManager.getInstance();

    /**
     * Cachear usando TODAS las capas (Memoria + Redis/Upstash)
     * @param ttlSeconds - TTL en segundos
     */
    static cache(ttlSeconds?: number) {
        return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
            // Solo cachear GET
            if (req.method !== 'GET') {
                next();
                return;
            }

             const key = CacheMiddleware.generateKey(req);
            
            try {
                // Verificar que el cache manager existe
                if (!CacheMiddleware.cacheManager) {
                    console.error('❌ CacheManager no inicializado');
                    next();
                    return;
                }

                // Buscar en caché
                const cached = await CacheMiddleware.cacheManager.get(key);
                
                if (cached) {
                    console.log(`✅ Middleware Caché HIT: ${key}`);
                    res.setHeader('X-Cache', 'HIT');
                    res.setHeader('X-Cache-Layer', 'middleware');
                    res.json(cached);
                    return;
                }

                // No hay caché, continuar
                res.setHeader('X-Cache', 'MISS');
                const originalJson = res.json.bind(res);
                
                (res as any).json = (body: any) => {
                    if (res.statusCode === 200 && body?.success) {
                        // Cachear la respuesta completa
                        CacheMiddleware.cacheManager.set(key, body, undefined)
                            .catch(err => console.error('Error caching:', err));
                    }
                    return originalJson(body);
                };

                next();
            } catch (error) {
                console.error('Cache middleware error:', error);
                next();
            }
        };
    }

    /**
     * Cachear SOLO en Memoria (más rápido, pero se pierde al reiniciar)
     * @param ttlSeconds - TTL en segundos (default: 30)
     */
    static memoryOnly(ttlSeconds: number = 30) {
        return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
            if (req.method !== 'GET') {
                next();
                return;
            }

            const key = `memory:${req.originalUrl}`;
            
            try {
                const cached = await CacheMiddleware.cacheManager.get(key);
                
                if (cached) {
                    console.log(`✅ Memoria Caché HIT: ${key}`);
                    res.setHeader('X-Cache', 'HIT');
                    res.setHeader('X-Cache-Layer', 'memory');
                    res.json(cached);
                    return;
                }

                res.setHeader('X-Cache', 'MISS');
                const originalJson = res.json.bind(res);
                
                (res as any).json = (body: any) => {
                    if (res.statusCode === 200 && body?.success) {
                        CacheMiddleware.cacheManager.set(key, body, undefined)
                            .catch(err => console.error('Error caching:', err));
                    }
                    return originalJson(body);
                };

                next();
            } catch (error) {
                console.error('Cache middleware error:', error);
                next();
            }
        };
    }

    /**
     * Cachear SOLO en Redis/Upstash (persistente, compartido)
     * @param ttlSeconds - TTL en segundos (default: 300)
     */
    static redisOnly(ttlSeconds: number = 300) {
        return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
            if (req.method !== 'GET') {
                next();
                return;
            }

            const key = `redis:${req.originalUrl}`;
            
            try {
                const cached = await CacheMiddleware.cacheManager.get(key);
                
                if (cached) {
                    console.log(`✅ Redis Caché HIT: ${key}`);
                    res.setHeader('X-Cache', 'HIT');
                    res.setHeader('X-Cache-Layer', 'redis');
                    res.json(cached);
                    return;
                }

                res.setHeader('X-Cache', 'MISS');
                const originalJson = res.json.bind(res);
                
                (res as any).json = (body: any) => {
                    if (res.statusCode === 200 && body?.success) {
                        CacheMiddleware.cacheManager.set(key, body, undefined)
                            .catch(err => console.error('Error caching:', err));
                    }
                    return originalJson(body);
                };

                next();
            } catch (error) {
                console.error('Cache middleware error:', error);
                next();
            }
        };
    }

    /**
     * NO cachear este endpoint
     */
    static noCache() {
        return (req: Request, res: Response, next: NextFunction): void => {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            next();
        };
    }

    /**
     * Invalidar caché después de mutaciones
     */
    static invalidateOnMutation(pattern: string) {
        return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
            const originalJson = res.json.bind(res);
            
            (res as any).json = async (body: any) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    await CacheMiddleware.cacheManager.deleteByPattern(pattern);
                    console.log(`🔄 Caché invalidada: ${pattern}`);
                }
                return originalJson(body);
            };

            next();
        };
    }

    /**
     * Generar clave de caché limpia
     */
   private static generateKey(req: Request): string {
    const method = req.method;
    const path = req.originalUrl.split('?')[0];
    const query = req.originalUrl.split('?')[1];
    
    // Limpiar ruta
    const cleanPath = path
        .replace(/^\/api\//, '')
        .replace(/\/$/, '');  // Quitar slash final
    
    // Dividir en partes
    const parts = cleanPath.split('/');
    
    // Construir clave según el tipo
    let key: string;
    
    if (parts.length === 1) {
        // GET /api/contacts → endpoint:contacts:list
        key = `endpoint:${parts[0]}:list`;
    } else if (parts.length === 2) {
        // GET /api/contacts/abc123 → endpoint:contacts:detail:abc123
        key = `endpoint:${parts[0]}:detail:${parts[1]}`;
    } else {
        // Otros casos
        key = `endpoint:${parts.join(':')}`;
    }
    
    // Agregar query params relevantes
    if (query) {
        const params = new URLSearchParams(query);
        const relevantParams = ['page', 'limit', 'status', 'search', 'category'];
        
        const queryParts: string[] = [];
        relevantParams.forEach(param => {
            if (params.has(param)) {
                queryParts.push(`${param}:${params.get(param)}`);
            }
        });
        
        if (queryParts.length > 0) {
            key += `:${queryParts.join(':')}`;
        }
    }
    
    console.log(`🔑 Clave generada: ${key}`);
    return key;
    }    
}