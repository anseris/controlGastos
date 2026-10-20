import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ResumenCategorias } from './resumen-categorias';

describe('ResumenCategorias', () => {
  let component: ResumenCategorias;
  let fixture: ComponentFixture<ResumenCategorias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumenCategorias],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ResumenCategorias);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
