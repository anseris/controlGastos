import { Component, signal, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { Movimiento } from './services/movimientos';

const STORAGE_KEY = 'control-gastos-angular21-v1';
const CATEGORIAS = [
  'Sueldo', 'Otros ingresos', 'Casa', 'Prestamo', 'Internet', 'Ayuntamiento', 'Luz',
  'Ahorro', 'Tabaco', 'Comida', 'Caprichos', 'Ocio', 'Imprevistos', 'Gasolina',
  'Otros gastos', 'Subscripciones'
];
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const CATEGORY_TAG_CLASSES: Record<string, string> = {
  'sueldo': 'cat-sueldo', 'otros ingresos': 'cat-ingresos', 'casa': 'cat-casa', 'prestamo': 'cat-prestamo',
  'internet': 'cat-internet', 'ayuntamiento': 'cat-ayuntamiento', 'luz': 'cat-luz', 'ahorro': 'cat-ahorro',
  'tabaco': 'cat-tabaco', 'comida': 'cat-comida', 'caprichos': 'cat-caprichos', 'ocio': 'cat-ocio',
  'imprevistos': 'cat-imprevistos', 'gasolina': 'cat-gasolina', 'subscripciones': 'cat-subscripciones',
  'otros gastos': 'cat-otros'
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastModule],
  templateUrl: './app.component.html'
})


export class AppComponent implements OnInit {
  protected readonly title = signal('frontend');
  private readonly messages = inject(MessageService);
  readonly Math = Math;
  readonly categories = CATEGORIAS;
  readonly categoryOptions = CATEGORIAS.map(value => ({ label: value, value }));
  readonly monthOptions: {label: string; value: string}[] = [];
  movements: Movimiento[] = [];
  selectedMonth = '';
  searchText = '';
  showDialog = false;
  editingId: string | null = null;
  submitted = false;
  // form: { date: Date | null; description: string; category: string; income: number | null; expense: number | null } = this.emptyForm();

  ngOnInit(): void {
    // this.loadData();
    // const months = new Set(this.movements.map(m => m.date.slice(0, 7)));
    const now = new Date();
    // months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    // this.monthOptions.push({ label: 'Todos los meses', value: 'all' });
    // [...months].sort().reverse().forEach(value => this.monthOptions.push({ label: this.monthLabel(value), value }));
    // this.selectedMonth = [...months].sort().reverse()[0] ?? 'all';
  }

  // private loadData(): void {
  //   try {
  //     const saved = localStorage.getItem(STORAGE_KEY);
  //     this.movements = saved ? JSON.parse(saved) as Movimiento[] : (seedMovimientos as Movimiento[]).map(m => ({...m}));
  //   } catch {
  //     this.movements = (seedMovimientos as Movimiento[]).map(m => ({...m}));
  //   }
  //   this.persist();
  // }

  // private persist(): void {
  //   localStorage.setItem(STORAGE_KEY, JSON.stringify(this.movements));
  // }

  // get filteredMovements(): Movimiento[] {
  //   const query = this.searchText.trim().toLocaleLowerCase('es');
  //   return [...this.movements]
  //     .filter(m => this.selectedMonth === 'all' || m.date.startsWith(this.selectedMonth))
  //     .filter(m => !query || [m.description, m.category, m.date].some(v => v.toLocaleLowerCase('es').includes(query)))
  //     .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  // }

  // get monthMovements(): Movimiento[] {
  //   return this.movements.filter(m => this.selectedMonth === 'all' || m.date.startsWith(this.selectedMonth));
  // }

  // get totalIncome(): number { return this.monthMovements.reduce((sum, m) => sum + Number(m.income || 0), 0); }
  // get totalExpense(): number { return this.monthMovements.reduce((sum, m) => sum + Number(m.expense || 0), 0); }
  // get monthlyBalance(): number { return this.totalIncome - this.totalExpense; }
  // private get annualMovements(): Movimiento[] {
  //   const year = this.selectedMonth === 'all' ? String(new Date().getFullYear()) : this.selectedMonth.slice(0, 4);
  //   return this.movements.filter(m => m.date.slice(0, 4) === year);
  // }
  // get annualIncome(): number { return this.annualMovements.reduce((sum, m) => sum + m.income, 0); }
  // get annualExpense(): number { return this.annualMovements.reduce((sum, m) => sum + m.expense, 0); }
  // get annualBalance(): number { return this.annualIncome - this.annualExpense; }
  // get averageMonthlyBalance(): number {
  //   const year = this.selectedMonth === 'all' ? new Date().getFullYear() : Number(this.selectedMonth.slice(0, 4));
  //   const elapsed = year === new Date().getFullYear() ? Math.max(1, new Date().getMonth() + 1) : 12;
  //   return this.movements.filter(m => Number(m.date.slice(0, 4)) === year).reduce((sum, m) => sum + m.income - m.expense, 0) / elapsed;
  // }

  // get categorySummary(): {category: string; income: number; expense: number}[] {
  //   return this.categories.map(category => ({
  //     category,
  //     income: this.monthMovements.filter(m => m.category === category).reduce((s, m) => s + m.income, 0),
  //     expense: this.monthMovements.filter(m => m.category === category).reduce((s, m) => s + m.expense, 0)
  //   })).filter(row => row.income !== 0 || row.expense !== 0).sort((a,b) => b.expense - a.expense);
  // }

  // get fixedBudget(): number { return this.totalIncome * 0.4; }
  // get savingsBudget(): number { return this.totalIncome * 0.3; }n
  // get personalBudget(): number { return this.totalIncome * 0.3; }
  // get fixedSpent(): number {
  //   const fixed = ['Casa','Prestamo','Internet','Ayuntamiento','Luz','Subscripciones'];
  //   return this.monthMovements.filter(m => fixed.includes(m.category)).reduce((s,m) => s + m.expense, 0);
  // }
  // get fixedSpentMio(): number {
  //   const fixed = ['Tabaco','Comida','Caprichos','Ocio','Gasolina','Imprevistos', 'Otros gastos'];
  //   return this.monthMovements.filter(m => fixed.includes(m.category)).reduce((s,m) => s + m.expense, 0);
  // }
  // get savingsSpent(): number { return this.monthMovements.filter(m => m.category === 'Ahorro').reduce((s,m) => s + m.expense, 0); }
  // get fixedPending(): number { return this.fixedBudget - this.fixedSpent; }
  // get savingsPending(): number { return this.savingsBudget - this.savingsSpent; }
  // get personalPending(): number { return this.personalBudget - this.fixedSpentMio; }

  // categoryTagClass(category: string): string {
  //   return CATEGORY_TAG_CLASSES[(category || '').trim().toLocaleLowerCase('es')] ?? 'cat-otros';
  // }

  // monthLabel(value: string): string {
  //   if (!value || value === 'all') return 'Todos los meses';
  //   const [year, month] = value.split('-').map(Number);
  //   return `${MESES[month - 1]} ${year}`;
  // }

  // formatMoney(value: number): string {
  //   return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value || 0);
  // }

  // balanceAfter(movement: Movimiento): number {
  //   const index = this.movements.findIndex(m => m.id === movement.id);
  //   return this.movements.slice(0, index + 1).reduce((sum, m) => sum + m.income - m.expense, 0);
  // }

  // openNew(): void {
  //   this.editingId = null;
  //   this.submitted = false;
  //   this.form = this.emptyForm();
  //   this.showDialog = true;
  // }

  // edit(movement: Movimiento): void {
  //   this.editingId = movement.id;
  //   this.submitted = false;
  //   this.form = { date: this.parseDate(movement.date), description: movement.description,
  //     category: movement.category, income: movement.income || null, expense: movement.expense || null };
  //   this.showDialog = true;
  // }

  // saveMovement(): void {
  //   this.submitted = true;
  //   if (!this.form.date || !this.form.description.trim() || !this.form.category) return;
  //   const income = Number(this.form.income || 0);
  //   const expense = Number(this.form.expense || 0);
  //   if ((income > 0 && expense > 0) || (income <= 0 && expense <= 0)) {
  //     this.messages.add({severity:'warn', summary:'Importe incorrecto', detail:'Introduce un ingreso o un gasto, pero no ambos.'});
  //     return;
  //   }
  //   const movement: Movimiento = {
  //     id: this.editingId ?? `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
  //     date: this.dateToIso(this.form.date), description: this.form.description.trim(), category: this.form.category,
  //     income, expense
  //   };
  //   if (this.editingId) this.movements = this.movements.map(m => m.id === this.editingId ? movement : m);
  //   else this.movements = [...this.movements, movement];
  //   this.persist();
  //   const month = movement.date.slice(0,7);
  //   if (!this.monthOptions.some(m => m.value === month)) this.monthOptions.splice(1, 0, {label:this.monthLabel(month), value:month});
  //   this.selectedMonth = month;
  //   this.showDialog = false;
  //   this.messages.add({severity:'success', summary:'Guardado', detail:'El movimiento se ha guardado correctamente.'});
  // }

  // deleteMovement(movement: Movimiento): void {
  //   if (!window.confirm(`¿Quieres eliminar el movimiento «${movement.description}»?`)) return;
  //   this.movements = this.movements.filter(m => m.id !== movement.id);
  //   this.persist();
  //   this.messages.add({severity:'success', summary:'Eliminado', detail:'Se ha eliminado el movimiento.'});
  // }

  // exportCsv(): void {
  //   const rows = [['Fecha','Mes','Descripcion','Categoria','Ingresos','Gastos','Balance'], ...this.filteredMovements.map(m => [m.date, this.monthName(m.date), m.description, m.category, m.income, m.expense, m.income - m.expense])];
  //   const csv = '\ufeff' + rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g,'""')}"`).join(';')).join('\r\n');
  //   this.downloadFile(csv, `movimientos-${this.selectedMonth}.csv`, 'text/csv;charset=utf-8;');
  // }

  // async importExcel(event: Event): Promise<void> {
  //   const input = event.target as HTMLInputElement;
  //   const file = input.files?.[0];
  //   if (!file) return;
  //   try {
  //     const data = await file.arrayBuffer();
  //     const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  //     const sheet = workbook.Sheets[workbook.SheetNames[0]];
  //     const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  //     const imported = rows.map((row, index) => {
  //       const values = new Map(Object.entries(row).map(([key,value]) => [this.normalizeHeader(key), value]));
  //       const rawDate = values.get('fecha');
  //       const date = this.importDate(rawDate);
  //       const description = String(values.get('descripcion') ?? '').trim();
  //       const category = String(values.get('categoria') ?? 'Otros gastos').trim();
  //       const income = this.numberValue(values.get('ingresos') ?? values.get('infresos'));
  //       const expense = this.numberValue(values.get('gastos'));
  //       return { id:`xlsx-${Date.now()}-${index}`, date, description, category, income, expense } as Movimiento;
  //     }).filter(m => m.date && m.description && (m.income > 0 || m.expense > 0));
  //     if (!imported.length) throw new Error('No se han encontrado movimientos. Comprueba que la primera hoja contiene Fecha, Descripcion, Categoria, Ingresos y Gastos.');
  //     this.movements = [...this.movements, ...imported];
  //     this.persist();
  //     imported.forEach(m => { const key = m.date.slice(0,7); if (!this.monthOptions.some(x => x.value === key)) this.monthOptions.splice(1,0,{label:this.monthLabel(key),value:key}); });
  //     this.selectedMonth = imported[0].date.slice(0,7);
  //     this.messages.add({severity:'success', summary:'Importación completada', detail:`Se han importado ${imported.length} movimientos.`});
  //   } catch (error) {
  //     this.messages.add({severity:'error', summary:'No se pudo importar', detail:error instanceof Error ? error.message : 'Revisa el archivo Excel.'});
  //   } finally { input.value = ''; }
  // }

  // restoreExamples(): void {
  //   this.movements = (seedMovimientos as Movimiento[]).map(m => ({...m}));
  //   this.persist();
  //   const months = [...new Set(this.movements.map(m => m.date.slice(0,7)))].sort().reverse();
  //   this.selectedMonth = months[0] ?? 'all';
  //   this.messages.add({severity:'success', summary:'Datos restaurados', detail:'Se han restaurado los movimientos del Excel de ejemplo.'});
  // }

  // private emptyForm() { return { date: new Date(), description: '', category: 'Comida', income: null as number | null, expense: null as number | null }; }
  // private dateToIso(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
  // private parseDate(value: string): Date { const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d); }
  // private monthName(value: string): string { return MESES[Number(value.slice(5,7))-1]; }
  // private normalizeHeader(value: string): string { return value.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
  // private importDate(value: unknown): string {
  //   if (value instanceof Date && !Number.isNaN(value.getTime())) return this.dateToIso(value);
  //   if (typeof value === 'number') { const parsed = XLSX.SSF.parse_date_code(value); if (parsed) return this.dateToIso(new Date(parsed.y,parsed.m-1,parsed.d)); }
  //   const text = String(value ?? '').trim();
  //   if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0,10);
  //   const match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  //   if (match) return `${match[3].length===2?'20':''}${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`;
  //   return '';
  // }
  // private numberValue(value: unknown): number {
  //   if (typeof value === 'number') return value;
  //   if (value == null || value === '') return 0;
  //   const parsed = Number(String(value).replace(/\s/g,'').replace(/€/g,'').replace(/\./g,'').replace(',','.'));
  //   return Number.isFinite(parsed) ? parsed : 0;
  // }
  // private downloadFile(content: string, name: string, type: string): void {
  //   const blob = new Blob([content], {type});
  //   const url = URL.createObjectURL(blob);
  //   const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
  // }
}
