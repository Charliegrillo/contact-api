import { Contact } from '../../domain/entities/Contact';
import { IContactRepository } from '../../domain/repositories/IContactRepository';
import { TursoContactRepository } from './TursoContactRepository';
import { HybridCacheManager } from '../cache/HybridCacheManager';

/**
 * Repositorio con caché híbrido
 * - Invalidación por eventos (inmediata)
 * - TTL de respaldo (60 minutos)
 */
export class HybridCachedContactRepository implements IContactRepository {
    private cacheManager: HybridCacheManager;
    private repository: TursoContactRepository;
    
    private readonly LIST_KEY = 'contacts:all';

    constructor() {
        this.cacheManager = HybridCacheManager.getInstance();
        this.repository = new TursoContactRepository();
    }

    async findAll(): Promise<Contact[]> {
        // 1. Buscar en caché (con verificación híbrida)
        const cached = await this.cacheManager.get<Contact[]>(this.LIST_KEY, 'contacts');
        
        if (cached) {
            console.log('✅ Contactos servidos desde caché');
            return cached;
        }

        // 2. Consultar BD (primera vez, después de evento, o TTL expirado)
        console.log('🔄 Consultando BD para contactos...');
        const contacts = await this.repository.findAll();
        
        // 3. Guardar en caché con TTL de respaldo
        await this.cacheManager.set(this.LIST_KEY, contacts, 'contacts');
        
        return contacts;
    }

    async findById(id: string): Promise<Contact | null> {
        const cacheKey = `contacts:${id}`;
        
        const cached = await this.cacheManager.get<Contact>(cacheKey, 'contacts');
        if (cached) {
            return cached;
        }

        const contact = await this.repository.findById(id);
        
        if (contact) {
            await this.cacheManager.set(cacheKey, contact, 'contacts');
        }
        
        return contact;
    }

    async findByEmail(email: string): Promise<Contact | null> {
        const cacheKey = `contacts:email:${email}`;
        
        const cached = await this.cacheManager.get<Contact>(cacheKey, 'contacts');
        if (cached) {
            return cached;
        }

        const contact = await this.repository.findByEmail(email);
        
        if (contact) {
            await this.cacheManager.set(cacheKey, contact, 'contacts');
        }
        
        return contact;
    }

    async create(contact: Contact): Promise<Contact> {
        // 1. Guardar en BD
        const created = await this.repository.create(contact);
        
        // 2. Invalidar caché por EVENTO (inmediato)
        await this.cacheManager.invalidateByEvent('contact');
        console.log('⚡ Evento: Contacto creado, caché invalidada');
        
        return created;
    }

    async update(id: string, contact: Partial<Contact>): Promise<Contact> {
        const updated = await this.repository.update(id, contact);
        
        // Invalidar por evento
        await this.cacheManager.invalidateByEvent(`contact:${id}`);
        console.log('⚡ Evento: Contacto actualizado, caché invalidada');
        
        return updated;
    }

    async delete(id: string): Promise<void> {
        await this.repository.delete(id);
        
        // Invalidar por evento
        await this.cacheManager.invalidateByEvent(`contact:${id}`);
        console.log('⚡ Evento: Contacto eliminado, caché invalidada');
    }
}