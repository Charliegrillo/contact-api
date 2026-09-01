import { Contact, CreateContactDTO } from '../entities/Contact';

export interface IContactRepository {
    create(contact: Contact): Promise<Contact>;
    findById(id: string): Promise<Contact | null>;
    findByEmail(email: string): Promise<Contact | null>;
    findAll(): Promise<Contact[]>;
    update(id: string, contact: Partial<Contact>): Promise<Contact>;
    delete(id: string): Promise<void>;
    
    // Métodos opcionales para caché
    findCached?<T>(key: string): Promise<T | null>;
    saveCached?<T>(key: string, value: T, resource?: string): Promise<void>;
    deleteCachedByPattern?(pattern: string): Promise<void>;
}