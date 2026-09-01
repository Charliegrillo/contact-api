import { User } from '../entities/User';

export interface IAuthService {
  hashPassword(password: string): Promise<string>;
  comparePassword(password: string, hashedPassword: string): Promise<boolean>;
  generateToken(user: User): string;
  verifyToken(token: string): any;
}