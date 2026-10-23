import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResumenAnual } from './resumen-anual';

describe('ResumenAnual', () => {
  let component: ResumenAnual;
  let fixture: ComponentFixture<ResumenAnual>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumenAnual],
    }).compileComponents();

    fixture = TestBed.createComponent(ResumenAnual);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
