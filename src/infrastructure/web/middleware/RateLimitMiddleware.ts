import rateLimit from 'express-rate-limit';

export const rateLimitMiddleware = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // límite de 100 peticiones
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const strictRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again in 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});