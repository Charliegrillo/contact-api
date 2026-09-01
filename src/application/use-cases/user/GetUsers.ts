import { User } from '../../../domain/entities/User';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IUseCase } from '../../interfaces/IUseCase';

export class GetUsers implements IUseCase<void, User[]> {
  constructor(private userRepository: IUserRepository) {}

  async execute(): Promise<User[]> {
    return await this.userRepository.findAll();
  }
}