import { Contact } from '../../domain/entities/Contact';
import { IContactRepository } from '../../domain/repositories/IContactRepository';
import { TursoContactRepository } from './TursoContactRepository';
import { CacheManager } from '../cache/CacheManager';

/**
 * Repositorio con caché en 3 capas
 */
export class ThreeLayerCachedContactRepository implements IContactRepository {
    private cacheManager: CacheManager;
    private repository: TursoContactRepository;

    constructor() {
        this.cacheManager = CacheManager.getInstance();
        this.repository = new TursoContactRepository();
    }

    async findAll(): Promise<Contact[]> {
        const cacheKey = 'contacts:all';
        
        // Buscar en caché (3 capas)
        const cached = await this.cacheManager.get<Contact[]>(cacheKey);
        
        if (cached) {
            return cached;
        }

        // Obtener de BD original
        console.log('🔄 Consultando BD original...');
        const contacts = await this.repository.findAll();
        
        // Guardar en caché (3 capas)
        await this.cacheManager.set(cacheKey, contacts, {
            memory: 30,    // 30 segundos en memoria
            //redis: 300,    // 5 minutos en Redis
            kv: 600,        // 10 minutos en KV
            database: 900  // 15 minutos en BD
        });
        
        return contacts;
    }

    async findById(id: string): Promise<Contact | null> {
        const cacheKey = `contacts:${id}`;
        
        const cached = await this.cacheManager.get<Contact>(cacheKey);
        
        if (cached) {
            return cached;
        }

        const contact = await this.repository.findById(id);
        
        if (contact) {
            await this.cacheManager.set(cacheKey, contact);
        }
        
        return contact;
    }

    async findByEmail(email: string): Promise<Contact | null> {
        const cacheKey = `contacts:email:${email}`;
        
        const cached = await this.cacheManager.get<Contact>(cacheKey);
        
        if (cached) {
            return cached;
        }

        const contact = await this.repository.findByEmail(email);
        
        if (contact) {
            await this.cacheManager.set(cacheKey, contact);
        }
        
        return contact;
    }

    async create(contact: Contact): Promise<Contact> {
        const created = await this.repository.create(contact);
        
        // Invalidar caché
        await this.invalidateCache();
        
        return created;
    }

    async update(id: string, contact: Partial<Contact>): Promise<Contact> {
        const updated = await this.repository.update(id, contact);
        
        // Invalidar caché
        await this.invalidateCache(id);
        
        return updated;
    }

    async delete(id: string): Promise<void> {
        await this.repository.delete(id);
        
        // Invalidar caché
        await this.invalidateCache(id);
    }

    private async invalidateCache(contactId?: string): Promise<void> {
        // Limpiar caché de listados
        await this.cacheManager.deleteByPattern('contacts:all');
        await this.cacheManager.deleteByPattern('contacts:list');
        
        // Limpiar caché del contacto específico
        if (contactId) {
            await this.cacheManager.delete(`contacts:${contactId}`);
        }
    }
}