import { InjectionToken } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CACHE_STORAGE_TOKEN, LOCAL_STORAGE_TOKEN } from './browser-tokens';

interface TokenWithFactory<T> {
  ɵprov?: { factory?: () => T };
}

/**
 * Extrae la factory interna del token para poder probar sus ramas sin
 * depender del estado global del navegador.
 */
function factoryOf<T>(token: InjectionToken<T>): () => T {
  const factory = (token as unknown as TokenWithFactory<T>).ɵprov?.factory;

  if (!factory) {
    throw new Error('El token no tiene una factory de inyección.');
  }

  return factory;
}

const localStorageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
const cachesDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'caches');

function restoreProperty(target: object, key: PropertyKey, descriptor?: PropertyDescriptor): void {
  if (descriptor) {
    Object.defineProperty(target, key, descriptor);
  } else {
    Reflect.deleteProperty(target, key);
  }
}

describe('LOCAL_STORAGE_TOKEN', () => {
  afterEach(() => {
    restoreProperty(window, 'localStorage', localStorageDescriptor);
  });

  it('debe entregar window.localStorage cuando está disponible', () => {
    expect(factoryOf(LOCAL_STORAGE_TOKEN)()).toBe(window.localStorage);
  });

  it('debe entregar null cuando localStorage no existe', () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: undefined,
    });

    expect(factoryOf(LOCAL_STORAGE_TOKEN)()).toBeNull();
  });

  it('debe entregar null cuando el acceso lanza un SecurityError', () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new DOMException('Acceso denegado', 'SecurityError');
      },
    });

    expect(factoryOf(LOCAL_STORAGE_TOKEN)()).toBeNull();
  });

  it('debe poder inyectarse mediante el inyector de Angular', () => {
    TestBed.configureTestingModule({});

    expect(TestBed.inject(LOCAL_STORAGE_TOKEN)).toBe(window.localStorage);
  });
});

describe('CACHE_STORAGE_TOKEN', () => {
  afterEach(() => {
    restoreProperty(globalThis, 'caches', cachesDescriptor);
  });

  it('debe entregar globalThis.caches cuando está disponible', () => {
    const fakeCaches = {} as CacheStorage;
    Object.defineProperty(globalThis, 'caches', {
      configurable: true,
      value: fakeCaches,
    });

    expect(factoryOf(CACHE_STORAGE_TOKEN)()).toBe(fakeCaches);
  });

  it('debe entregar null cuando CacheStorage no existe', () => {
    expect(factoryOf(CACHE_STORAGE_TOKEN)()).toBeNull();
  });

  it('debe entregar null cuando el acceso lanza un error', () => {
    Object.defineProperty(globalThis, 'caches', {
      configurable: true,
      get: () => {
        throw new DOMException('Acceso denegado', 'SecurityError');
      },
    });

    expect(factoryOf(CACHE_STORAGE_TOKEN)()).toBeNull();
  });

  it('debe poder inyectarse mediante el inyector de Angular', () => {
    TestBed.configureTestingModule({});

    expect(TestBed.inject(CACHE_STORAGE_TOKEN)).toBeNull();
  });
});
