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

    // 3. Enviar emails de forma asíncrona (no bloquea la respuesta)
    this.sendEmails(savedContact);
    
    return savedContact;
  }

   /**
     * Enviar emails al visitante y al administrador
     */
    private async sendEmails(contact: Contact): Promise<void> {
        try {
            // ✅ Email al VISITANTE (confirmación)
            console.log('📧 Enviando email de confirmación al visitante...');
            await this.emailService.sendBudgetNotification(
                contact.name,
                contact.email
            );
            console.log(`✅ Email enviado al visitante: ${contact.email}`);

            // ✅ Email al ADMINISTRADOR (notificación)
            console.log('📧 Enviando email de notificación al administrador...');
            await this.emailService.sendAdminNotification({
                name: contact.name,
                email: contact.email,
                phone: contact.phone,
                message: contact.message,
                budget: contact.budget,
                company: contact.company,
                createdAt: contact.createdAt
            });
            console.log(`✅ Email enviado al administrador: ${process.env.ADMIN_EMAIL}`);

        } catch (error) {
            console.error('❌ Error enviando emails:', error);
            // No lanzar el error para no afectar la respuesta principal
        }
    }
}