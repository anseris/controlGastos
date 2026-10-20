import { Component, OnInit, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Categoria, CategoriasService } from '../../../services/categorias';
import { AddCategorias } from '../../../shared/modals/add-categorias/add-categorias';

@Component({
  selector: 'app-listado-categorias',
  imports: [ButtonModule, TagModule, ConfirmDialogModule, AddCategorias],
  providers: [ConfirmationService],
  templateUrl: './listado-categorias.html',
  styleUrl: './listado-categorias.scss',
})
export class ListadoCategorias implements OnInit {
  private readonly categoriasService = inject(CategoriasService);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly categorias = signal<Categoria[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');

  /** Controla la visibilidad del modal de alta/edición. */
  readonly showModalAddCategorias = signal(false);
  /** Categoría que se está editando (null cuando se crea una nueva). */
  readonly categoriaEditando = signal<Categoria | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.cargando.set(true);
    this.error.set('');
    this.categoriasService.obtenerCategorias().subscribe({
      next: (datos) => {
        this.categorias.set(datos);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar categorías:', err);
        this.error.set('No se han podido cargar las categorías.');
        this.cargando.set(false);
      },
    });
  }

  /** Abre el modal para crear una categoría nueva. */
  anadirCategoria(): void {
    this.categoriaEditando.set(null);
    this.showModalAddCategorias.set(true);
  }

  /** Abre el modal cargando los datos de la categoría seleccionada. */
  editarCategoria(categoria: Categoria): void {
    this.categoriaEditando.set(categoria);
    this.showModalAddCategorias.set(true);
  }

  /** Pide confirmación y elimina la categoría en el backend. */
  eliminarCategoria(categoria: Categoria): void {
    this.confirm.confirm({
      key: 'categorias',
      header: 'Eliminar categoría',
      message: `¿Seguro que quieres eliminar «${categoria.nombre}»?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.eliminar(categoria),
    });
  }

  private eliminar(categoria: Categoria): void {
    this.categoriasService.eliminarCategoria(categoria._id).subscribe({
      next: () => {
        this.categorias.update((lista) => lista.filter((c) => c._id !== categoria._id));
        this.messages.add({
          severity: 'success',
          summary: 'Eliminada',
          detail: 'La categoría se ha eliminado correctamente.',
        });
      },
      error: (err) => {
        console.error('Error al eliminar la categoría:', err);
        this.messages.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.mensaje ?? 'No se pudo eliminar la categoría.',
        });
      },
    });
  }

  /** Se invoca cuando el modal guarda (alta o edición) para refrescar la lista. */
  onSaved(): void {
    this.loadData();
  }

  /** Se invoca cuando el modal se cierra. */
  returnCloseModal(): void {
    this.showModalAddCategorias.set(false);
    this.categoriaEditando.set(null);
  }
}
