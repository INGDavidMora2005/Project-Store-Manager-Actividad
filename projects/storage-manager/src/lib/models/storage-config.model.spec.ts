import { TestBed } from '@angular/core/testing';
import { STORAGE_MANAGER_CONFIG } from './storage-config.model';

describe('STORAGE_MANAGER_CONFIG', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('debe entregar un prefijo vacío por defecto', () => {
    const config = TestBed.inject(STORAGE_MANAGER_CONFIG);

    expect(config).toEqual({ prefix: '' });
  });

  it('debe permitir sobrescribir la configuración', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: STORAGE_MANAGER_CONFIG, useValue: { prefix: 'showcase:' } }],
    });

    expect(TestBed.inject(STORAGE_MANAGER_CONFIG)).toEqual({ prefix: 'showcase:' });
  });
});
