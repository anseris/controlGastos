import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HacerTraspaso } from './hacer-traspaso';

describe('HacerTraspaso', () => {
  let component: HacerTraspaso;
  let fixture: ComponentFixture<HacerTraspaso>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HacerTraspaso],
    }).compileComponents();

    fixture = TestBed.createComponent(HacerTraspaso);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
