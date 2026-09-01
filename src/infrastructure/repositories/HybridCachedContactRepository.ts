import { Contact } from '../../domain/entities/Contact';
import { IContactRepository } from '../../domain/repositories/IContactRepository';
import { TursoContactRepository } from './TursoContactRepository';
import { HybridCacheManager } from '../cache/HybridCacheManager';

export class HybridCachedContactRepository implements IContactRepository {
    private cacheManager: HybridCacheManager;
    private repository: TursoContactRepository;
    
    constructor() {
        this.cacheManager = HybridCacheManager.getInstance();
        this.repository = new TursoContactRepository();
    }

    /**
     * Obtener contactos con paginación
     * SOLO cachea la página 1
     * Páginas 2+ se consultan directo a BD
     */
    async findAllPaginated(page: number = 1, limit: number = 10): Promise<{
        data: Contact[];
        pagination: any;
    }> {
        // ✅ SOLO cachear si es página 1
        if (page === 1) {
            return this.getPage1WithCache(limit);
        }
        
        // Páginas 2+ van directo a BD
        return this.getPageDirectFromBD(page, limit);
    }

    /**
     * Página 1: CON caché
     */
    private async getPage1WithCache(limit: number): Promise<{
        data: Contact[];
        pagination: any;
    }> {
        const cacheKey = `contacts:page:1:limit:${limit}`;
        
        console.log(`\n🔍 [PÁGINA 1] Buscando en caché: ${cacheKey}`);
        
        // 1. Buscar en caché
        const cached = await this.cacheManager.get<any>(cacheKey, 'contacts');
        
        if (cached) {
            console.log('✅ Página 1 servida desde caché');
            return cached;
        }

        // 2. Consultar BD
        console.log('🔄 Página 1 no está en caché, consultando BD...');
        const result = await this.getPageDirectFromBD(1, limit);
        
        // 3. Cachear página 1
        await this.cacheManager.set(cacheKey, result, 'contacts');
        console.log('💾 Página 1 cacheada');
        
        return result;
    }

    /**
     * Páginas 2+: SIN caché (directo a BD)
     */
    private async getPageDirectFromBD(page: number, limit: number): Promise<{
        data: Contact[];
        pagination: any;
    }> {
        console.log(`\n🔄 [PÁGINA ${page}] Consultando BD directamente (sin caché)...`);
        
        // Consultar todos los contactos
        const allContacts = await this.repository.findAll();
        
        // Aplicar paginación
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedData = allContacts.slice(startIndex, endIndex);
        
        const result = {
            data: paginatedData,
            pagination: {
                page,
                limit,
                total: allContacts.length,
                totalPages: Math.ceil(allContacts.length / limit),
                cached: page === 1 // Solo página 1 tiene caché
            }
        };
        
        return result;
    }

    // ✅ BIEN: Primero busca en caché, luego en BD
    async findAll(): Promise<Contact[]> {
        const cacheKey = 'contacts:all';
        
        // 1. Buscar en caché
        const cached = await this.cacheManager.get<Contact[]>(cacheKey, 'contacts');
        
        if (cached) {
            console.log('✅ Caché HIT: Sirviendo desde caché');
            return cached;
        }
        
        // 2. Si no hay caché, consultar BD
        console.log('🔄 Caché MISS: Consultando BD...');
        const contacts = await this.repository.findAll();
        
        // 3. Guardar en caché
        if (contacts.length > 0) {
            await this.cacheManager.set(cacheKey, contacts, 'contacts');
            console.log('💾 Guardado en caché');
        }
        
        return contacts;
    }

    async findById(id: string): Promise<Contact | null> {
        return this.repository.findById(id);
    }

    async findByEmail(email: string): Promise<Contact | null> {
        return this.repository.findByEmail(email);
    }

    async create(contact: Contact): Promise<Contact> {
        const created = await this.repository.create(contact);
        
        // ✅ Invalidar SOLO la página 1 cacheada
        await this.cacheManager.deleteByPattern('contacts:page:1:');
        console.log('⚡ Página 1 cacheada invalidada');
        
        return created;
    }

    async update(id: string, contact: Partial<Contact>): Promise<Contact> {
        const updated = await this.repository.update(id, contact);
        
        // ✅ Invalidar SOLO la página 1 cacheada
        await this.cacheManager.deleteByPattern('contacts:page:1:');
        console.log('⚡ Página 1 cacheada invalidada');
        
        return updated;
    }

    async delete(id: string): Promise<void> {
        await this.repository.delete(id);
        
        // ✅ Invalidar SOLO la página 1 cacheada
        await this.cacheManager.deleteByPattern('contacts:page:1:');
        console.log('⚡ Página 1 cacheada invalidada');
    }
}