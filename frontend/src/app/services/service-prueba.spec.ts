import { TestBed } from '@angular/core/testing';

import { ServicePrueba } from './service-prueba';

describe('ServicePrueba', () => {
  let service: ServicePrueba;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServicePrueba);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
