import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Prestamo } from './prestamo';

describe('Prestamo', () => {
  let component: Prestamo;
  let fixture: ComponentFixture<Prestamo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Prestamo],
    }).compileComponents();

    fixture = TestBed.createComponent(Prestamo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
