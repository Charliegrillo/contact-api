import helmet from 'helmet';
import cors from 'cors';
import { Express } from 'express';

export class SecurityMiddleware {
  static configure(app: Express): void {
    // Helmet para seguridad HTTP headers
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      dnsPrefetchControl: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: true,
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: true,
      referrerPolicy: { policy: 'no-referrer' },
      xssFilter: true,
    }));

    // CORS
    app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400
    }));
  }
}