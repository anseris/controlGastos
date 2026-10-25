import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Usuario, type IUsuario } from '../models/usuario.model.js';
import {
  obtenerJwtSecret,
  requireAuth,
  type PeticionAutenticada
} from '../middleware/auth.middleware.js';
import { crearCategoriasPorDefecto } from '../services/datos-iniciales.service.js';
import { reclamarDatosHuerfanos } from '../services/migracion-usuarios.service.js';

const router = Router();

/** Número de rondas de bcrypt para el hash de contraseñas. */
const SALT_ROUNDS = 10;
/** Duración del token de sesión. */
const TOKEN_EXPIRES_IN = '7d';
/** Longitud mínima de la contraseña. */
const PASSWORD_MIN_LENGTH = 6;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Datos del usuario que se devuelven al cliente (nunca la contraseña). */
interface UsuarioPublico {
  id: string;
  nombre: string;
  email: string;
}

function usuarioPublico(usuario: IUsuario): UsuarioPublico {
  return {
    id: String(usuario._id),
    nombre: usuario.nombre,
    email: usuario.email
  };
}

function crearToken(usuario: IUsuario): string {
  return jwt.sign(
    { email: usuario.email },
    obtenerJwtSecret(),
    { subject: String(usuario._id), expiresIn: TOKEN_EXPIRES_IN }
  );
}

/**
 * POST /api/auth/registro
 * Crea un usuario nuevo y devuelve el token de sesión.
 */
router.post('/registro', async (req, res) => {
  try {
    const nombre = String(req.body?.nombre ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    if (!nombre || nombre.length < 2) {
      res.status(400).json({ mensaje: 'Introduce un nombre válido.' });
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({ mensaje: 'Introduce un correo electrónico válido.' });
      return;
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      res
        .status(400)
        .json({ mensaje: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.` });
      return;
    }

    const existente = await Usuario.findOne({ email });

    if (existente) {
      res.status(409).json({ mensaje: 'Ya existe una cuenta con ese correo electrónico.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const usuario = await Usuario.create({ nombre, email, password: passwordHash });

    // La primera cuenta hereda los datos que ya existieran sin dueño.
    if ((await Usuario.countDocuments()) === 1) {
      await reclamarDatosHuerfanos(String(usuario._id));
    }

    // Categorías base para que la cuenta se pueda usar desde el primer momento.
    await crearCategoriasPorDefecto(String(usuario._id));

    res.status(201).json({
      token: crearToken(usuario),
      usuario: usuarioPublico(usuario)
    });
  } catch (error) {
    // Índice único de email: puede saltar si dos registros llegan a la vez.
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      res.status(409).json({ mensaje: 'Ya existe una cuenta con ese correo electrónico.' });
      return;
    }

    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo crear la cuenta.' });
  }
});

/**
 * POST /api/auth/login
 * Comprueba las credenciales y devuelve el token de sesión.
 */
router.post('/login', async (req, res) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    if (!EMAIL_REGEX.test(email) || !password) {
      res.status(400).json({ mensaje: 'Introduce tu correo y tu contraseña.' });
      return;
    }

    const usuario = await Usuario.findOne({ email }).select('+password');

    if (!usuario) {
      res.status(401).json({ mensaje: 'Correo o contraseña incorrectos.' });
      return;
    }

    const passwordCorrecto = await bcrypt.compare(password, usuario.password);

    if (!passwordCorrecto) {
      res.status(401).json({ mensaje: 'Correo o contraseña incorrectos.' });
      return;
    }

    res.json({
      token: crearToken(usuario),
      usuario: usuarioPublico(usuario)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo iniciar sesión.' });
  }
});

/**
 * GET /api/auth/perfil
 * Devuelve los datos del usuario del token. Sirve para validar la sesión.
 */
router.get('/perfil', requireAuth, async (req, res) => {
  try {
    const { usuario } = req as PeticionAutenticada;
    const encontrado = await Usuario.findById(usuario?.id);

    if (!encontrado) {
      res.status(404).json({ mensaje: 'Usuario no encontrado.' });
      return;
    }

    res.json({ usuario: usuarioPublico(encontrado) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo consultar el perfil.' });
  }
});

export default router;
