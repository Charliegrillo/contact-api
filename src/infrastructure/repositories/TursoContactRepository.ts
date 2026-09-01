import { Client } from '@libsql/client';
import { Contact } from '../../domain/entities/Contact';
import { IContactRepository } from '../../domain/repositories/IContactRepository';
import { TursoClient } from '../database/TursoClient';

export class TursoContactRepository implements IContactRepository {
  private client: Client;

  constructor() {
    this.client = TursoClient.getInstance();
  }

  
  async create(contact: Contact): Promise<Contact> {
    await this.client.execute({
      sql: `INSERT INTO contacts (id, name, email, phone, message, budget, company, status, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        contact.id,
        contact.name,
        contact.email,
        contact.phone,
        contact.message,
        contact.budget,
        contact.company || null,
        contact.status,
        contact.createdAt.toISOString(),
        contact.updatedAt.toISOString()
      ]
    });

    return contact;
  }

  async findById(id: string): Promise<Contact | null> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM contacts WHERE id = ?',
      args: [id]
    });

    if (result.rows.length === 0) return null;
    return this.mapToContact(result.rows[0]);
  }

  async findByEmail(email: string): Promise<Contact | null> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM contacts WHERE email = ?',
      args: [email]
    });

    if (result.rows.length === 0) return null;
    return this.mapToContact(result.rows[0]);
  }

  async findAll(): Promise<Contact[]> {
    const result = await this.client.execute('SELECT * FROM contacts ORDER BY created_at DESC');
    return result.rows.map(row => this.mapToContact(row));
  }

  async update(id: string, contact: Partial<Contact>): Promise<Contact> {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Contact not found');

    const updated = { ...existing, ...contact, updatedAt: new Date() };
    
    await this.client.execute({
      sql: `UPDATE contacts SET name = ?, email = ?, phone = ?, message = ?, budget = ?, 
            company = ?, status = ?, updated_at = ? WHERE id = ?`,
      args: [
        updated.name,
        updated.email,
        updated.phone,
        updated.message,
        updated.budget,
        updated.company || null,
        updated.status,
        updated.updatedAt.toISOString(),
        id
      ]
    });

    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.client.execute({
      sql: 'DELETE FROM contacts WHERE id = ?',
      args: [id]
    });
  }

  private mapToContact(row: any): Contact {
    return {
      id: row.id as string,
      name: row.name as string,
      email: row.email as string,
      phone: row.phone as string,
      message: row.message as string,
      budget: row.budget as number,
      company: row.company as string | undefined,
      status: row.status as 'pending' | 'contacted' | 'completed',
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string)
    };
  }
}