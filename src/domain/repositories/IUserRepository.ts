import { User, UserResponse } from '../entities/User';

export interface IUserRepository {
  create(user: User): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  update(id: string, user: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
}