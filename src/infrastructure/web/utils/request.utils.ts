import { Request } from 'express';

/**
 * Extrae y valida un parámetro de ruta
 */
export function getRouteParam(req: Request, paramName: string): string | null {
  const param = req.params[paramName];
  
  if (!param || typeof param !== 'string') {
    return null;
  }
  
  return param;
}

/**
 * Extrae y valida un query parameter
 */
export function getQueryParam(req: Request, paramName: string): string | null {
  const param = req.query[paramName];
  
  if (!param || typeof param !== 'string') {
    return null;
  }
  
  return param;
}

/**
 * Extrae y valida un query parameter numérico
 */
export function getNumericQueryParam(req: Request, paramName: string, defaultValue: number): number {
  const param = req.query[paramName];
  
  if (typeof param === 'string') {
    const parsed = parseInt(param, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  
  return defaultValue;
}

/**
 * Valida que un string sea un UUID válido
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}