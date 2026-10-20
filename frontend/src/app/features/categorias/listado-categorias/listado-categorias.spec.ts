import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfirmationService, MessageService } from 'primeng/api';

import { ListadoCategorias } from './listado-categorias';

describe('ListadoCategorias', () => {
  let component: ListadoCategorias;
  let fixture: ComponentFixture<ListadoCategorias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListadoCategorias],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ListadoCategorias);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
