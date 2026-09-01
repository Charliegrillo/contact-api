import { Router } from 'express';
import { ContactController } from '../controllers/ContactController';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';
import { contactSchema } from '../validators/ContactValidator';
import { CreateContact } from '../../../application/use-cases/contact/CreateContact';
import { DeleteContact } from '../../../application/use-cases/contact/DeleteContact';
import { UpdateContactStatus } from '../../../application/use-cases/contact/UpdateContactStatus';
import { GetContacts } from '../../../application/use-cases/contact/GetContacts';
import { GetContactById } from '../../../application/use-cases/contact/GetContactById';
// import { TursoContactRepository } from '../../repositories/TursoContactRepository';
import { NodemailerEmailService } from '../../services/NodemailerEmailService';
import { ThreeLayerCachedContactRepository } from '../../repositories/ThreeLayerCachedContactRepository';
import { CacheMiddleware } from '../middleware/CacheMiddleware';

export function createContactRoutes(): Router {
  const router = Router();
  
  // Inicializar dependencias
  //const contactRepository = new TursoContactRepository();
  const contactRepository = new ThreeLayerCachedContactRepository();

  const emailService = new NodemailerEmailService();
  
  const createContactUseCase = new CreateContact(contactRepository, emailService);
  const getContactsUseCase = new GetContacts(contactRepository);
  const getContactByIdUseCase = new GetContactById(contactRepository);
  const deleteContactUseCase = new DeleteContact(contactRepository);
  const updateContactStatusUseCase = new UpdateContactStatus(contactRepository);
  
  const contactController = new ContactController(
    createContactUseCase,
    getContactsUseCase,
    getContactByIdUseCase,
    deleteContactUseCase,
    updateContactStatusUseCase
  );

  const authMiddleware = new AuthMiddleware();

  // Rutas públicas
  router.post(
    '/',
    ValidationMiddleware.validate(contactSchema),
    contactController.create.bind(contactController)
  );

  // Rutas protegidas
  router.get(
    '/',
    CacheMiddleware.cache(30),  // ← Cachear 30 segundos    
    authMiddleware.authenticate.bind(authMiddleware),
    authMiddleware.authorize('admin'),
    contactController.getAll.bind(contactController)
  );

  router.get(
    '/:id',
    CacheMiddleware.cache(60),  // ← Cachear 60 segundos
    authMiddleware.authenticate.bind(authMiddleware),
    contactController.getById.bind(contactController)
  );
  router.patch(
    '/:id/status',
     CacheMiddleware.noCache(),  // ← No cachear
    authMiddleware.authenticate.bind(authMiddleware),
    authMiddleware.authorize('admin'),
    contactController.updateStatus.bind(contactController)
  );
  router.delete(
    '/:id',
     CacheMiddleware.noCache(),  // ← No cachear
    authMiddleware.authenticate.bind(authMiddleware),
    authMiddleware.authorize('admin'),
    contactController.delete.bind(contactController)
  );
  return router;
}