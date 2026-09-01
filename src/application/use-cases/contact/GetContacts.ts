import { Contact } from '../../../domain/entities/Contact';
import { IContactRepository } from '../../../domain/repositories/IContactRepository';
import { IUseCase } from '../../interfaces/IUseCase';

export class GetContacts implements IUseCase<void, Contact[]> {
  constructor(private contactRepository: IContactRepository) {}

  async execute(): Promise<Contact[]> {
    return await this.contactRepository.findAll();
  }
}