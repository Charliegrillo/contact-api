import { AuthenticateUserDTO, User } from '../../../domain/entities/User';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IAuthService } from '../../../domain/services/IAuthService';
import { IUseCase } from '../../interfaces/IUseCase';

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  token: string;
}

export class AuthenticateUser implements IUseCase<AuthenticateUserDTO, AuthResponse> {
  constructor(
    private userRepository: IUserRepository,
    private authService: IAuthService
  ) {}

  async execute(data: AuthenticateUserDTO): Promise<AuthResponse> {
    const normalizedEmail = data.email.trim().toLowerCase();
    console.log('Authenticating user with email:', normalizedEmail);

    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await this.authService.comparePassword(
      data.password,
      user.password
    );

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      throw new Error('User is inactive');
    }

    const token = this.authService.generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    };
  }
}