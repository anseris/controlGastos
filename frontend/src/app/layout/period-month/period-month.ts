import { Component, OnInit, signal } from '@angular/core';
import { SelectModule } from 'primeng/select';
import { Movimiento, MovimientosService } from '../../services/movimientos';
import { FormsModule } from '@angular/forms';

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

@Component({
  selector: 'app-period-month',
  imports: [SelectModule, FormsModule],
  templateUrl: './period-month.html',
  styleUrl: './period-month.scss',
})
export class PeriodMonth implements OnInit{
  readonly monthOptions: {label: string; value: string}[] = [];
  readonly movimientos = signal<Movimiento[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  selectedMonth = '';

  constructor(
    private movimientosService: MovimientosService
  ) {}

  ngOnInit(): void {
    this.loadData();
    const months = new Set(this.movimientos().map(m => m.fecha.slice(0, 7)));
    const now = new Date();
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    this.monthOptions.push({ label: 'Todos los meses', value: 'all' });
    [...months].sort().reverse().forEach(value => this.monthOptions.push({ label: this.monthLabel(value), value }));
    this.selectedMonth = [...months].sort().reverse()[0] ?? 'all';
  }

  private loadData(): void {
   this.movimientosService.obtenerMovimientos().subscribe({
      next: (datos) => {
        console.log('mes',datos)
        this.movimientos.set(datos);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar movimientos:', err);
        this.error.set('No se han podido cargar los movimientos.');
        this.cargando.set(false);
      }
    });
  }

    monthLabel(value: string): string {
    if (!value || value === 'all') return 'Todos los meses';
    const [year, month] = value.split('-').map(Number);
    return `${MESES[month - 1]} ${year}`;
  }


}

