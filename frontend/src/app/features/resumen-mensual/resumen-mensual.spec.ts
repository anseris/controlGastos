import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResumenMensual } from './resumen-mensual';

describe('ResumenMensual', () => {
  let component: ResumenMensual;
  let fixture: ComponentFixture<ResumenMensual>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumenMensual],
    }).compileComponents();

    fixture = TestBed.createComponent(ResumenMensual);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
