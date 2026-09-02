import { Router } from 'express';
import { TestController } from '../controllers/TestController';
import { TestEmail } from '../../../application/use-cases/email/TestEmail';
import { NodemailerEmailService } from '../../services/NodemailerEmailService';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { strictRateLimitMiddleware } from '../middleware/RateLimitMiddleware';

export function createTestRoutes(): Router {
    const router = Router();
    
    // Servicios
    const emailService = new NodemailerEmailService();
    
    // Casos de uso
    const testEmailUseCase = new TestEmail(emailService);
    
    // Controlador
    const testController = new TestController(testEmailUseCase);
    
    // Middleware
    const authMiddleware = new AuthMiddleware();
    
    // ✅ Ruta de health check (pública)
    router.get(
        '/health',
        testController.healthCheck.bind(testController)
    );
    
    // ✅ Ruta para test de email (protegida con rate limit)
    router.get(
        '/email',
        strictRateLimitMiddleware,  // Máximo 5 requests por 15 min
        testController.testEmail.bind(testController)
    );
    
    // ✅ Ruta POST para test de email (más flexible)
    router.post(
        '/email',
        strictRateLimitMiddleware,
        testController.testEmail.bind(testController)
    );
    
    return router;
}