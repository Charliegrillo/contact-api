import express from 'express';
import dotenv from 'dotenv';
import { TursoClient } from './infrastructure/database/TursoClient';
import { SecurityMiddleware } from './infrastructure/web/middleware/SecurityMiddleware';
import { rateLimitMiddleware } from './infrastructure/web/middleware/RateLimitMiddleware';
import { createContactRoutes } from './infrastructure/web/routes/contact.routes';
import { createUserRoutes } from './infrastructure/web/routes/user.routes';
import { TursoUserRepository } from './infrastructure/repositories/TursoUserRepository';
import { JwtAuthService } from './infrastructure/services/JwtAuthService';
import { CreateUser } from './application/use-cases/user/CreateUser';
import { v4 as uuidv4 } from 'uuid';
import { HybridCacheManager } from './infrastructure/cache/HybridCacheManager';
import { CacheFactory } from './infrastructure/cache/CacheFactory';

dotenv.config();

class Server {
  private app: express.Express;
  private port: number;
  private cacheManager: HybridCacheManager;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000');
    this.initializeCache();
    this.initializeMiddlewares();
    this.initializeRoutes();
  }

  private initializeMiddlewares(): void {
    // Middlewares básicos
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Seguridad
    SecurityMiddleware.configure(this.app);
    
    // Rate limiting global
    this.app.use('/api', rateLimitMiddleware);
    
    // Logging middleware
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private initializeRoutes(): void {
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Contact API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString()
      });
    });

    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    });

    this.app.use('/api/contacts', createContactRoutes());
    this.app.use('/api/users', createUserRoutes());

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    });

    // Error handler
    this.app.use((err: any, req: any, res: any, next: any) => {
      console.error('Unhandled error:', err);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });
  }

  async initializeDatabase(): Promise<void> {
    try {
      await TursoClient.initialize();
      console.log('✅ Database connected and initialized');
      
      // Crear usuario admin por defecto si no existe
      await this.createDefaultAdmin();
    } catch (error) {
      console.error('❌ Error initializing database:', error);
      process.exit(1);
    }
  }

  private async createDefaultAdmin(): Promise<void> {
    try {
      const userRepository = new TursoUserRepository();
      const authService = new JwtAuthService();
      const createUser = new CreateUser(userRepository, authService);
      
      const existingAdmin = await userRepository.findByEmail(
        process.env.ADMIN_EMAIL || 'admin@example.com'
      );
      
      if (!existingAdmin) {
        await createUser.execute({
          id: uuidv4(),
          email: process.env.ADMIN_EMAIL || 'admin@example.com',
          password: process.env.ADMIN_PASSWORD || 'Admin123456',
          name: process.env.ADMIN_NAME || 'Administrator',
          role: 'admin'
        } as any);
        
        console.log('✅ Default admin user created');
      }
    } catch (error) {
      console.error('Error creating default admin:', error);
    }
  }

   /**
   * Inicializar sistema de caché
   * Esto asegura que solo se cree UN proveedor
   */
  private initializeCache(): void {
    console.log('\n🔧 Inicializando sistema de caché...');
    console.log(`   CACHE_PROVIDER: ${process.env.CACHE_PROVIDER || 'turso-kv'}`);
    
    // ✅ Inicializar HybridCacheManager (que usa CacheFactory)
    this.cacheManager = HybridCacheManager.getInstance();
    
    // ✅ Verificar qué proveedor se creó
    const provider = CacheFactory.getProvider();
    console.log(`   ✅ Proveedor activo: ${provider.getName()}`);
    
    // ✅ Verificar que es el correcto
    const expectedProvider = process.env.CACHE_PROVIDER || 'turso-kv';
    const actualProvider = provider.getName();
    
    if (expectedProvider === 'upstash' && actualProvider !== 'upstash-redis') {
      console.error('❌ ERROR: Se esperaba Upstash Redis pero se creó otro proveedor');
    }
    
    if (expectedProvider === 'turso-kv' && actualProvider !== 'turso-kv') {
      console.error('❌ ERROR: Se esperaba Turso KV pero se creó otro proveedor');
    }
    
    console.log('');
  }

  async start(): Promise<void> {
    await this.initializeDatabase();
    
    this.app.listen(this.port, () => {
      console.log(`🚀 Server running on http://localhost:${this.port}`);
      console.log(`📚 API Documentation: http://localhost:${this.port}/health`);
      console.log(`🔐 Default admin: ${process.env.ADMIN_EMAIL} / ${process.env.ADMIN_PASSWORD}`);
    });
  }
}

// Iniciar servidor
const server = new Server();
server.start().catch(console.error);

export default Server;