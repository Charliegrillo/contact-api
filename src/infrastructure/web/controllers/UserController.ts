import { Request, Response } from 'express';
import { AuthenticateUser } from '../../../application/use-cases/user/AuthenticateUser';
import { CreateUser } from '../../../application/use-cases/user/CreateUser';
import { GetUsers } from '../../../application/use-cases/user/GetUsers';
import { CreateUserDTO, AuthenticateUserDTO } from '../../../domain/entities/User';

export class UserController {
  constructor(
    private createUserUseCase: CreateUser,
    private authenticateUserUseCase: AuthenticateUser,
    private getUsersUseCase: GetUsers
  ) {}

  async register(req: Request, res: Response): Promise<void> {
    try {
      const userData: CreateUserDTO = req.body;
      const user = await this.createUserUseCase.execute(userData);
      
      // No devolver la contraseña
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: userWithoutPassword
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(400).json({
        success: false,
        message: 'Error creating user',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const credentials: AuthenticateUserDTO = req.body;
      const authResult = await this.authenticateUserUseCase.execute(credentials);
      
      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        data: authResult
      });
    } catch (error) {
      console.error('Error authenticating user:', error);
      res.status(401).json({
        success: false,
        message: 'Authentication failed',
        error: error instanceof Error ? error.message : 'Invalid credentials'
      });
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const users = await this.getUsersUseCase.execute();
      
      // No devolver contraseñas
      const usersWithoutPassword = users.map(({ password, ...user }) => user);
      
      res.status(200).json({
        success: true,
        data: usersWithoutPassword
      });
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting users',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}