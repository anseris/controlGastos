import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';

import { AddCategorias } from './add-categorias';

describe('AddCategorias', () => {
  let component: AddCategorias;
  let fixture: ComponentFixture<AddCategorias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddCategorias],
      providers: [provideHttpClient(), provideHttpClientTesting(), MessageService],
    }).compileComponents();

    fixture = TestBed.createComponent(AddCategorias);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
