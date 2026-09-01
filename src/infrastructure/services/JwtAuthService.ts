import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { IAuthService } from '../../domain/services/IAuthService';
import { User } from '../../domain/entities/User';
import dotenv from 'dotenv';

dotenv.config();

export class JwtAuthService implements IAuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-me';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    if (!hashedPassword) {
      return false;
    }

    // Soporta contraseñas nuevas hash y registros antiguos guardados en texto plano.
    const looksLikeHash = typeof hashedPassword === 'string' && (
      hashedPassword.startsWith('$2a$') ||
      hashedPassword.startsWith('$2b$') ||
      hashedPassword.startsWith('$2y$')
    );

    if (looksLikeHash) {
      return await bcrypt.compare(password, hashedPassword);
    }

    return password === hashedPassword;
  }

  generateToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn
    } as jwt.SignOptions);
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}