import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListadoCategorias } from './listado-categorias';

describe('ListadoCategorias', () => {
  let component: ListadoCategorias;
  let fixture: ComponentFixture<ListadoCategorias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListadoCategorias],
    }).compileComponents();

    fixture = TestBed.createComponent(ListadoCategorias);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
