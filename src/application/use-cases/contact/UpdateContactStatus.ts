import { Contact } from '../../../domain/entities/Contact';
import { IContactRepository } from '../../../domain/repositories/IContactRepository';
import { IWebhookService } from '../../../domain/services/IWebhookService';
import { INotificationRepository } from '../../../domain/repositories/INotificationRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { Notification } from '../../../domain/entities/Notification';
import { IUseCase } from '../../interfaces/IUseCase';
import { v4 as uuidv4 } from 'uuid';

interface UpdateStatusDTO {
  contactId: string;
  status: 'pending' | 'contacted' | 'completed';
  updatedBy: string;
}

export class UpdateContactStatus implements IUseCase<UpdateStatusDTO, Contact> {
  constructor(
    private contactRepository: IContactRepository,
    //private notificationRepository?: INotificationRepository,
    private userRepository?: IUserRepository,
    //private webhookService?: IWebhookService
  ) {}

  async execute(data: UpdateStatusDTO): Promise<Contact> {
    const contact = await this.contactRepository.findById(data.contactId);
    if (!contact) throw new Error('Contact not found');

    const updatedContact = await this.contactRepository.update(data.contactId, {
      status: data.status
    });

    // Notificar cambio de estado
    //await this.processStatusChangeNotification(updatedContact, data.updatedBy);

    return updatedContact;
  }
  /*
  private async processStatusChangeNotification(contact: Contact, updatedBy: string): Promise<void> {
    try {
      // Crear notificación
      if (this.notificationRepository && this.userRepository) {
        const admins = (await this.userRepository.findAll())
          .filter(user => user.role === 'admin' && user.isActive && user.id !== updatedBy);

        for (const admin of admins) {
          const notification: Notification = {
            id: uuidv4(),
            userId: admin.id,
            contactId: contact.id,
            title: 'Estado Actualizado',
            message: `El contacto ${contact.name} cambió a estado: ${contact.status}`,
            type: 'status_change',
            isRead: false,
            createdAt: new Date()
          };

          await this.notificationRepository.create(notification);
        }
      }

      // Enviar webhook
      if (this.webhookService) {
        await this.webhookService.sendToAllAdmins({
          type: 'contact_status_changed',
          data: {
            contactId: contact.id,
            contactName: contact.name,
            newStatus: contact.status,
            updatedBy,
            timestamp: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error processing status change notification:', error);
    }
  }
    */
}