import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComponentPrueba } from './component-prueba';

describe('ComponentPrueba', () => {
  let component: ComponentPrueba;
  let fixture: ComponentFixture<ComponentPrueba>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentPrueba],
    }).compileComponents();

    fixture = TestBed.createComponent(ComponentPrueba);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
