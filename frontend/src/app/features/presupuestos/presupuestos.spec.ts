import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';

import { Presupuestos } from './presupuestos';

describe('Presupuestos', () => {
  let component: Presupuestos;
  let fixture: ComponentFixture<Presupuestos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Presupuestos],
      providers: [provideHttpClient(), provideHttpClientTesting(), MessageService],
    }).compileComponents();

    fixture = TestBed.createComponent(Presupuestos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
