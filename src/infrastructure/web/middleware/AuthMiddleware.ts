import { Request, Response, NextFunction } from 'express';
import { JwtAuthService } from '../../services/JwtAuthService';

export class AuthMiddleware {
  private authService: JwtAuthService;

  constructor() {
    this.authService = new JwtAuthService();
  }

  authenticate(req: Request, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const token = authHeader.substring(7);
      const decoded = this.authService.verifyToken(token);
      
      (req as any).user = decoded;
      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  }

  authorize(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as any).user;
      
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (roles.length > 0 && !roles.includes(user.role)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      next();
    };
  }
}