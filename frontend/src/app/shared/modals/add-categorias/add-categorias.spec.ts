import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddCategorias } from './add-categorias';

describe('AddCategorias', () => {
  let component: AddCategorias;
  let fixture: ComponentFixture<AddCategorias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddCategorias],
    }).compileComponents();

    fixture = TestBed.createComponent(AddCategorias);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
