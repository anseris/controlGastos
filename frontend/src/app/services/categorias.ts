import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Base de la API del backend (Express en el puerto 3000). */
const url = window.location.href;
const API_BASE = url.includes('localhost') ? 'http://localhost:3000/api' : 'https://controlgastos-8fb2.onrender.com/api';
// const API_BASE = 'http://localhost:3000/api';
// const API_BASE = 'https://controlgastos-8fb2.onrender.com/api';




// /** Valores admitidos por el enum `tipo` del modelo Mongoose. */
export type TipoCategoria = 'gasto' | 'ingreso';

/** Documento tal y como lo devuelve el backend (colección `categorias`). */
export interface Categoria {
  _id: string;
  nombre: string;
  tipo: TipoCategoria;
  /** Clase de PrimeIcons (p. ej. 'pi pi-home'). Cadena vacía = sin icono. */
  icono: string;
  /** Color en formato hexadecimal (p. ej. '#22C55E'). */
  color: string;
  hasIcono: boolean;
  primeraLetra: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Cuerpo para crear una categoría (POST).
 * El backend exige `nombre` y `tipo`; `icono` y `color` son opcionales.
 */
export interface CrearCategoria {
  nombre: string;
  /** Por defecto `gasto` si no se envía. */
  tipo: TipoCategoria;
  /** Cadena vacía = sin icono. */
  icono?: string;
  color?: string;
  hasIcono: boolean;
  primeraLetra: string;
}

/** Cuerpo para modificar una categoría (PUT): todos los campos son opcionales. */
export type ActualizarCategoria = Partial<CrearCategoria>;

/** Respuesta genérica del backend para mensajes (delete, errores 4xx/5xx). */
export interface ApiMensaje {
  mensaje: string;
}

/**
 * Llamadas al backend de categorías (`/api/categorias`).
 * Espeja los endpoints definidos en `backend/src/routes/categorias.routes.ts`.
 */
@Injectable({
  providedIn: 'root',
})
export class CategoriasService {
  private readonly apiUrl = `${API_BASE}/categorias`;

  constructor(private http: HttpClient) {}

  /** GET /api/categorias — lista todas las categorías. */
  obtenerCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.apiUrl);
  }

  /** GET /api/categorias/:id — obtiene una categoría por su _id. */
  obtenerCategoriaPorId(id: string): Observable<Categoria> {
    return this.http.get<Categoria>(`${this.apiUrl}/${id}`);
  }

  /** POST /api/categorias — crea una categoría. */
  crearCategoria(categoria: CrearCategoria): Observable<Categoria> {
    return this.http.post<Categoria>(this.apiUrl, categoria);
  }

  /** PUT /api/categorias/:id — modifica una categoría existente. */
  actualizarCategoria(id: string, categoria: ActualizarCategoria): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.apiUrl}/${id}`, categoria);
  }

  /** DELETE /api/categorias/:id — elimina una categoría. */
  eliminarCategoria(id: string): Observable<ApiMensaje> {
    return this.http.delete<ApiMensaje>(`${this.apiUrl}/${id}`);
  }
}
