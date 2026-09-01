import { Request, Response } from 'express';
import { CreateContact } from '../../../application/use-cases/contact/CreateContact';
import { GetContacts } from '../../../application/use-cases/contact/GetContacts';
import { GetContactById } from '../../../application/use-cases/contact/GetContactById';
import { UpdateContactStatus } from '../../../application/use-cases/contact/UpdateContactStatus';
import { CreateContactDTO } from '../../../domain/entities/Contact';
import { DeleteContact } from '../../../application/use-cases/contact/DeleteContact';
import { getRouteParam, isValidUUID, getNumericQueryParam, getQueryParam } from '../utils/request.utils';


export class ContactController {
  constructor(
    private createContactUseCase: CreateContact,
    private getContactsUseCase: GetContacts,
    private getContactByIdUseCase: GetContactById,
    private deleteContactUseCase: DeleteContact,
    private updateContactStatusUseCase?: UpdateContactStatus
  ) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const contactData: CreateContactDTO = req.body;
      const contact = await this.createContactUseCase.execute(contactData);
      
      res.status(201).json({
        success: true,
        message: 'Contact created successfully',
        data: contact
      });
    } catch (error) {
      console.error('Error creating contact:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating contact',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      // Opcional: agregar paginación
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const contacts = await this.getContactsUseCase.execute();
      
      // Aplicar paginación simple
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedContacts = contacts.slice(startIndex, endIndex);
      
      res.status(200).json({
        success: true,
        data: paginatedContacts,
        pagination: {
          page,
          limit,
          total: contacts.length,
          totalPages: Math.ceil(contacts.length / limit)
        }
      });
    } catch (error) {
      console.error('Error getting contacts:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting contacts',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      // Solución 1: Validación explícita con tipo guard
      const id = req.params.id;
      
      // Verificar que id existe y es string
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Invalid contact ID'
        });
        return;
      }

      const contact = await this.getContactByIdUseCase.execute(id);
      
      if (!contact) {
        res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: contact
      });
    } catch (error) {
      console.error('Error getting contact:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting contact',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      // Validar ID
      const id = req.params.id;
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Invalid contact ID'
        });
        return;
      }

      // Validar status
      const { status } = req.body;
      if (!status || !['pending', 'contacted', 'completed'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status. Must be: pending, contacted, or completed'
        });
        return;
      }

      // Verificar que el caso de uso existe
      if (!this.updateContactStatusUseCase) {
        res.status(500).json({
          success: false,
          message: 'Update status functionality not available'
        });
        return;
      }

      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const updatedContact = await this.updateContactStatusUseCase.execute({
        contactId: id,
        status,
        updatedBy: userId
      });

      res.status(200).json({
        success: true,
        message: 'Contact status updated successfully',
        data: updatedContact
      });
    } catch (error) {
      console.error('Error updating contact status:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating contact status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

 async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = getRouteParam(req, 'id');
      
      console.log(`🗑️  Delete request received for contact ID: ${id}`);
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Contact ID is required'
        });
        return;
      }

      if (!isValidUUID(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid contact ID format'
        });
        return;
      }

      // Verificar que el caso de uso existe
      if (!this.deleteContactUseCase) {
        console.error('❌ DeleteContact use case is not initialized');
        res.status(500).json({
          success: false,
          message: 'Delete functionality not available'
        });
        return;
      }

      // Obtener usuario que elimina
      const userId = (req as any).user?.userId || (req as any).user?.id || 'system';
      console.log(`   Deleted by user: ${userId}`);

      // Ejecutar eliminación
      await this.deleteContactUseCase.execute({
        contactId: id,
        deletedBy: userId
      });

      console.log(`✅ Contact ${id} deleted successfully`);

      res.status(200).json({
        success: true,
        message: 'Contact deleted successfully',
        data: {
          contactId: id,
          deletedAt: new Date().toISOString(),
          deletedBy: userId
        }
      });
    } catch (error) {
      console.error('Error deleting contact:', error);
      
      if (error instanceof Error && error.message === 'Contact not found') {
        res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Error deleting contact',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
}