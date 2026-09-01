import { ICacheProvider } from '../../domain/cache/ICacheProvider';
import { TursoKVCacheProvider } from './providers/TursoKVCacheProvider';
import { RedisCacheProvider } from './providers/RedisCacheProvider';
import { UpstashRedisProvider } from './providers/UpstashRedisProvider';

export class CacheFactory {
    private static provider: ICacheProvider | null = null;

    static getProvider(): ICacheProvider {
        if (CacheFactory.provider) {
            return CacheFactory.provider;
        }

        const providerType = process.env.CACHE_PROVIDER || 'turso-kv';
        
        console.log(`\n🔧 Inicializando proveedor de caché: ${providerType}`);

        switch (providerType) {
            case 'redis':
                CacheFactory.provider = new RedisCacheProvider();
                break;
            case 'upstash':
                CacheFactory.provider = new UpstashRedisProvider();
                break;            
            case 'turso-kv':
            default:
                CacheFactory.provider = new TursoKVCacheProvider();
                break;
        }

        return CacheFactory.provider;
    }
     /**
     * Resetear proveedor (para testing)
     */
    static resetProvider(): void {
        CacheFactory.provider = null;
    }

    /**
     * Cambiar proveedor en runtime
     */
    static setProvider(provider: ICacheProvider): void {
        CacheFactory.provider = provider;
        console.log(`🔄 Proveedor cambiado a: ${provider.getName()}`);
    }
}