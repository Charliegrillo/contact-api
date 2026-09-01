import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';
import { registerUserSchema, loginUserSchema } from '../validators/UserValidator';
import { CreateUser } from '../../../application/use-cases/user/CreateUser';
import { AuthenticateUser } from '../../../application/use-cases/user/AuthenticateUser';
import { GetUsers } from '../../../application/use-cases/user/GetUsers';
import { TursoUserRepository } from '../../repositories/TursoUserRepository';
import { JwtAuthService } from '../../services/JwtAuthService';
import { strictRateLimitMiddleware } from '../middleware/RateLimitMiddleware';

export function createUserRoutes(): Router {
  const router = Router();
  
  // Inicializar dependencias
  const userRepository = new TursoUserRepository();
  const authService = new JwtAuthService();
  
  const createUserUseCase = new CreateUser(userRepository, authService);
  const authenticateUserUseCase = new AuthenticateUser(userRepository, authService);
  const getUsersUseCase = new GetUsers(userRepository);
  
  const userController = new UserController(
    createUserUseCase,
    authenticateUserUseCase,
    getUsersUseCase
  );
  
  const authMiddleware = new AuthMiddleware();

  // Rutas públicas
  router.post(
    '/register',
    ValidationMiddleware.validate(registerUserSchema),
    userController.register.bind(userController)
  );

  router.post(
    '/login',
    strictRateLimitMiddleware,
    ValidationMiddleware.validate(loginUserSchema),
    userController.login.bind(userController)
  );

  // Rutas protegidas
  router.get(
    '/',
    authMiddleware.authenticate.bind(authMiddleware),
    authMiddleware.authorize('admin'),
    userController.getAll.bind(userController)
  );

  return router;
}