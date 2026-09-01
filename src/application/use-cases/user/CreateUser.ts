import { CreateUserDTO, User } from '../../../domain/entities/User';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IAuthService } from '../../../domain/services/IAuthService';
import { IUseCase } from '../../interfaces/IUseCase';
import { v4 as uuidv4 } from 'uuid';

export class CreateUser implements IUseCase<CreateUserDTO, User> {
  constructor(
    private userRepository: IUserRepository,
    private authService: IAuthService
  ) {}

  async execute(data: CreateUserDTO): Promise<User> {
    const normalizedEmail = data.email.trim().toLowerCase();
    const existingUser = await this.userRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await this.authService.hashPassword(data.password);

    const user: User = {
      id: uuidv4(),
      email: normalizedEmail,
      password: hashedPassword,
      name: data.name,
      role: data.role || 'user',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await this.userRepository.create(user);
  }
}