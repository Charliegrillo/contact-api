import { Contact, CreateContactDTO } from '../../../domain/entities/Contact';
import { IContactRepository } from '../../../domain/repositories/IContactRepository';
import { IEmailService } from '../../../domain/services/IEmailService';
import { IUseCase } from '../../interfaces/IUseCase';
import { v4 as uuidv4 } from 'uuid';

export class CreateContact implements IUseCase<CreateContactDTO, Contact> {
  constructor(
    private contactRepository: IContactRepository,
    private emailService: IEmailService
  ) {}

  async execute(data: CreateContactDTO): Promise<Contact> {
    const contact: Contact = {
      id: uuidv4(),
      ...data,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Registrar en BD (asíncrono)
    const savedContact = await this.contactRepository.create(contact);

    // Enviar email (asíncrono, no bloquea la respuesta)
    this.emailService.sendBudgetNotification(
      data.name,
      data.email
    ).catch(error => {
      console.error('Error sending email:', error);
      // Aquí podrías implementar un sistema de colas o reintentos
    });

    return savedContact;
  }
}