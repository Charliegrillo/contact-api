import { Contact } from '../../../domain/entities/Contact';
import { IContactRepository } from '../../../domain/repositories/IContactRepository';
import { INotificationRepository } from '../../../domain/repositories/INotificationRepository';
import { IWebhookService } from '../../../domain/services/IWebhookService';
import { IUseCase } from '../../interfaces/IUseCase';

export interface DeleteContactDTO {
  contactId: string;
  deletedBy: string;
}

export class DeleteContact implements IUseCase<DeleteContactDTO, void> {
  constructor(
    private contactRepository: IContactRepository,
    private notificationRepository?: INotificationRepository,
    private webhookService?: IWebhookService
  ) {}

  async execute(data: DeleteContactDTO): Promise<void> {
    // 1. Buscar el contacto
    const contact = await this.contactRepository.findById(data.contactId);
    
    if (!contact) {
      throw new Error('Contact not found');
    }

    console.log(`🗑️  Deleting contact: ${contact.name}`);

    // 2. Eliminar notificaciones relacionadas (si existe el repositorio)
    if (this.notificationRepository) {
      try {
        // Buscar y eliminar notificaciones del contacto
        // Nota: Dependiendo de tu implementación, esto puede variar
        console.log('   Cleaning up related notifications...');
        // Aquí deberías tener un método para eliminar por contactId
        // await this.notificationRepository.deleteByContactId(contact.id);
      } catch (error) {
        console.error('   Error cleaning up notifications:', error);
        // No detener el proceso de eliminación
      }
    }

    // 3. Eliminar el contacto
    await this.contactRepository.delete(data.contactId);
    console.log(`✅ Contact deleted: ${contact.id}`);

    // 4. Notificar a administradores (asíncrono)
    if (this.webhookService) {
      this.webhookService.sendToAllAdmins({
        type: 'contact_deleted',
        data: {
          contactId: contact.id,
          contactName: contact.name,
          contactEmail: contact.email,
          deletedBy: data.deletedBy,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }).catch(error => {
        console.error('Error sending webhook notification:', error);
      });
    }
  }
}