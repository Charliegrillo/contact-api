import { Contact } from '../../../domain/entities/Contact';
import { IContactRepository } from '../../../domain/repositories/IContactRepository';
import { IUseCase } from '../../interfaces/IUseCase';

export class GetContactById implements IUseCase<string, Contact | null> {
  constructor(private contactRepository: IContactRepository) {}

  async execute(id: string): Promise<Contact | null> {
    return await this.contactRepository.findById(id);
  }
}