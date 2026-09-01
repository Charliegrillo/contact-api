import { Client } from '@libsql/client';
import { User } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { TursoClient } from '../database/TursoClient';

export class TursoUserRepository implements IUserRepository {
  private client: Client;

  constructor() {
    this.client = TursoClient.getInstance();
  }

  async create(user: User): Promise<User> {
    await this.client.execute({
      sql: `INSERT INTO users (id, email, password, name, role, is_active, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        user.id,
        user.email,
        user.password,
        user.name,
        user.role,
        user.isActive ? 1 : 0,
        user.createdAt.toISOString(),
        user.updatedAt.toISOString()
      ]
    });

    return user;
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [id]
    });

    if (result.rows.length === 0) return null;
    return this.mapToUser(result.rows[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    console.log('Finding user by email:', normalizedEmail);
    const result = await this.client.execute({
      sql: 'SELECT * FROM users WHERE LOWER(email) = ?',
      args: [normalizedEmail]
    });
  

    if (result.rows.length === 0) return null;
    return this.mapToUser(result.rows[0]);
  }

  async findAll(): Promise<User[]> {
    const result = await this.client.execute('SELECT * FROM users ORDER BY created_at DESC');
    return result.rows.map(row => this.mapToUser(row));
  }

  async update(id: string, user: Partial<User>): Promise<User> {
    const existing = await this.findById(id);
    if (!existing) throw new Error('User not found');

    const updated = { ...existing, ...user, updatedAt: new Date() };
    
    await this.client.execute({
      sql: `UPDATE users SET email = ?, password = ?, name = ?, role = ?, 
            is_active = ?, updated_at = ? WHERE id = ?`,
      args: [
        updated.email,
        updated.password,
        updated.name,
        updated.role,
        updated.isActive ? 1 : 0,
        updated.updatedAt.toISOString(),
        id
      ]
    });

    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.client.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [id]
    });
  }

  private mapToUser(row: any): User {
    return {
      id: row.id as string,
      email: row.email as string,
      password: row.password as string,
      name: row.name as string,
      role: row.role as 'admin' | 'user',
      isActive: (row.is_active as number) === 1,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string)
    };
  }
}