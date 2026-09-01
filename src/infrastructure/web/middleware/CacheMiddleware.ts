import { Request, Response, NextFunction } from 'express';
import { CacheManager } from '../../cache/CacheManager';

/**
 * Middleware de caché configurable
 */
export class CacheMiddleware {
    private static cacheManager = CacheManager.getInstance();

    /**
     * Cachear respuesta con TTL específico
     * @param ttlSeconds - Tiempo de vida en segundos (0 = no cachear)
     */
    static cache(ttlSeconds?: number) {
        return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
            // NO cachear si:
            // 1. No es GET
            // 2. TTL es 0
            if (req.method !== 'GET' || ttlSeconds === 0) {
                next();
                return;
            }

            const key = `http:${req.originalUrl}`;
            
            try {
                // Buscar en caché
                const cached = await CacheMiddleware.cacheManager.get(key);
                
                if (cached) {
                    console.log(`✅ Endpoint cacheado: ${req.originalUrl}`);
                    res.json(cached);
                    return;
                }

                // No hay caché, continuar
                const originalJson = res.json.bind(res);
                
                (res as any).json = (body: any) => {
                    // Guardar en caché si es exitoso
                    if (res.statusCode === 200 && ttlSeconds !== undefined) {
                        CacheMiddleware.cacheManager.set(key, body, {
                            memory: ttlSeconds,
                            kv: ttlSeconds * 5,
                            database: ttlSeconds * 10
                        }).catch(err => console.error('Error caching:', err));
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
     * No cachear este endpoint
     */
    static noCache() {
        return (req: Request, res: Response, next: NextFunction): void => {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            next();
        };
    }
}