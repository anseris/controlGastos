import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModelPrueba } from './model-prueba';

describe('ModelPrueba', () => {
  let component: ModelPrueba;
  let fixture: ComponentFixture<ModelPrueba>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModelPrueba],
    }).compileComponents();

    fixture = TestBed.createComponent(ModelPrueba);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
