import { Contact, CreateContactDTO } from '../entities/Contact';

export interface IContactRepository {
  create(contact: Contact): Promise<Contact>;
  findById(id: string): Promise<Contact | null>;
  findByEmail(email: string): Promise<Contact | null>;
  findAll(): Promise<Contact[]>;
  update(id: string, contact: Partial<Contact>): Promise<Contact>;
  delete(id: string): Promise<void>;
}