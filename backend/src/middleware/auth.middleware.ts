import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/** Datos del usuario autenticado que se adjuntan a la petición. */
export interface UsuarioAutenticado {
  id: string;
  email: string;
}

export type PeticionAutenticada = Request & { usuario?: UsuarioAutenticado };

/**
 * Devuelve el id del usuario autenticado. Las rutas que lo usan están
 * protegidas por `requireAuth`, así que siempre hay un usuario detrás.
 */
export function idUsuario(req: Request): string {
  return String((req as PeticionAutenticada).usuario?.id ?? '');
}

/** Devuelve el secreto con el que se firman los JWT. */
export function obtenerJwtSecret(): string {
  const secret = process.env['JWT_SECRET'];

  if (!secret) {
    throw new Error('Falta configurar JWT_SECRET en .env');
  }

  return secret;
}

/**
 * Middleware que exige un token JWT válido en la cabecera
 * `Authorization: Bearer <token>`. Si no es válido responde 401.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const cabecera = req.headers.authorization;

  if (!cabecera || !cabecera.startsWith('Bearer ')) {
    res.status(401).json({ mensaje: 'No autorizado. Inicia sesión para continuar.' });
    return;
  }

  try {
    const payload = jwt.verify(cabecera.slice(7), obtenerJwtSecret()) as jwt.JwtPayload;

    (req as PeticionAutenticada).usuario = {
      id: String(payload.sub ?? ''),
      email: String(payload['email'] ?? '')
    };

    next();
  } catch {
    res.status(401).json({ mensaje: 'La sesión no es válida o ha caducado.' });
  }
};
