import type { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LOCAL_STORAGE_TOKEN } from '../internal/browser-tokens';
import { StorageError, StorageErrorCode } from '../models/storage-error.model';
import { STORAGE_MANAGER_CONFIG } from '../models/storage-config.model';
import type { StorageConfig } from '../models/storage-config.model';
import { LocalStorageService } from './local-storage.service';

/**
 * Crea un fake de Storage en memoria. Los métodos son `vi.fn()` para poder
 * espiarlos o hacer que lancen un error en una prueba concreta.
 */
function createFakeStorage(initial: Record<string, string> = {}) {
  const data = new Map<string, string>(Object.entries(initial));

  return {
    data,
    getItem: vi.fn((key: string): string | null => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string): void => {
      data.set(key, value);
    }),
    removeItem: vi.fn((key: string): void => {
      data.delete(key);
    }),
    key: vi.fn((index: number): string | null => Array.from(data.keys())[index] ?? null),
    get length(): number {
      return data.size;
    },
  };
}

type FakeStorage = ReturnType<typeof createFakeStorage>;

interface SetupConfig {
  prefix?: string;
  config?: StorageConfig | null;
}

/**
 * Configura TestBed antes de inyectar el servicio, porque el prefijo se lee
 * durante la construcción.
 */
function setup(options: SetupConfig & { storage: null }): {
  service: LocalStorageService;
  storage: null;
};
function setup(options?: SetupConfig & { storage?: FakeStorage }): {
  service: LocalStorageService;
  storage: FakeStorage;
};
function setup(options: SetupConfig & { storage?: FakeStorage | null } = {}): {
  service: LocalStorageService;
  storage: FakeStorage | null;
} {
  const storage = options.storage === undefined ? createFakeStorage() : options.storage;
  const providers: Provider[] = [{ provide: LOCAL_STORAGE_TOKEN, useValue: storage }];

  if ('config' in options) {
    providers.push({ provide: STORAGE_MANAGER_CONFIG, useValue: options.config });
  } else if (options.prefix !== undefined) {
    providers.push({ provide: STORAGE_MANAGER_CONFIG, useValue: { prefix: options.prefix } });
  }

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers });

  return { service: TestBed.inject(LocalStorageService), storage };
}

type CauseAssertion = (cause: unknown) => void;

const sameCause =
  (expected: unknown): CauseAssertion =>
  (cause) => {
    expect(cause).toBe(expected);
  };

const definedCause: CauseAssertion = (cause) => {
  expect(cause).toBeDefined();
};

const absentCause: CauseAssertion = (cause) => {
  expect(cause).toBeUndefined();
};

/**
 * Ejecuta una acción que debe lanzar un StorageError y comprueba su tipo,
 * código y causa.
 */
function expectStorageError(
  action: () => unknown,
  code: StorageErrorCode,
  assertCause: CauseAssertion,
): StorageError {
  let captured: unknown;

  try {
    action();
  } catch (error) {
    captured = error;
  }

  expect(captured).toBeInstanceOf(StorageError);

  const storageError = captured as StorageError;

  expect(storageError.code).toBe(code);
  assertCause(storageError.cause);

  return storageError;
}

describe('LocalStorageService', () => {
  describe('set', () => {
    it('debe serializar y guardar primitivos', () => {
      const { service, storage } = setup();

      service.set('texto', 'hola');
      service.set('numero', 42);
      service.set('booleano', true);

      expect(storage.data.get('texto')).toBe('"hola"');
      expect(storage.data.get('numero')).toBe('42');
      expect(storage.data.get('booleano')).toBe('true');
      expect(storage.setItem).toHaveBeenNthCalledWith(1, 'texto', '"hola"');
      expect(storage.setItem).toHaveBeenNthCalledWith(2, 'numero', '42');
      expect(storage.setItem).toHaveBeenNthCalledWith(3, 'booleano', 'true');
    });

    it('debe serializar objetos anidados', () => {
      const { service, storage } = setup();
      const value = {
        usuario: { id: 1, nombre: 'Ana', roles: ['admin', 'editor'] },
        activo: true,
      };

      service.set('usuario', value);

      expect(storage.data.get('usuario')).toBe(JSON.stringify(value));
    });

    it('debe serializar arreglos anidados', () => {
      const { service, storage } = setup();
      const value = [
        { id: 1, etiquetas: ['a', 'b'] },
        { id: 2, etiquetas: [] },
      ];

      service.set('elementos', value);

      expect(storage.data.get('elementos')).toBe(JSON.stringify(value));
    });

    it('debe anteponer el prefijo configurado a la clave física', () => {
      const { service, storage } = setup({ prefix: 'app:' });

      service.set('clave', 'valor');

      expect(storage.data.get('app:clave')).toBe('"valor"');
      expect(storage.setItem).toHaveBeenCalledWith('app:clave', '"valor"');
    });

    it('debe lanzar SERIALIZATION_ERROR con causa para un objeto circular', () => {
      const { service } = setup();
      const circular: Record<string, unknown> = {};
      circular['self'] = circular;

      expectStorageError(
        () => service.set('circular', circular),
        StorageErrorCode.SERIALIZATION_ERROR,
        definedCause,
      );
    });

    it('debe lanzar SERIALIZATION_ERROR con causa para un BigInt', () => {
      const { service } = setup();

      expectStorageError(
        () => service.set('grande', BigInt(10)),
        StorageErrorCode.SERIALIZATION_ERROR,
        definedCause,
      );
    });

    it('debe lanzar SERIALIZATION_ERROR sin causa para undefined', () => {
      const { service } = setup();

      expectStorageError(
        () => service.set('indefinido', undefined),
        StorageErrorCode.SERIALIZATION_ERROR,
        absentCause,
      );
    });

    it('debe lanzar SERIALIZATION_ERROR sin causa para una función', () => {
      const { service } = setup();

      expectStorageError(
        () => service.set('funcion', () => 'valor'),
        StorageErrorCode.SERIALIZATION_ERROR,
        absentCause,
      );
    });

    it('debe lanzar QUOTA_EXCEEDED para DOMException QuotaExceededError', () => {
      const { service, storage } = setup();
      const cause = new DOMException('Cuota llena', 'QuotaExceededError');
      storage.setItem.mockImplementationOnce(() => {
        throw cause;
      });

      expectStorageError(
        () => service.set('clave', 'valor'),
        StorageErrorCode.QUOTA_EXCEEDED,
        sameCause(cause),
      );
    });

    it('debe lanzar QUOTA_EXCEEDED por el nombre NS_ERROR_DOM_QUOTA_REACHED', () => {
      const { service, storage } = setup();
      const cause = { name: 'NS_ERROR_DOM_QUOTA_REACHED', code: 0 };
      storage.setItem.mockImplementationOnce(() => {
        throw cause;
      });

      expectStorageError(
        () => service.set('clave', 'valor'),
        StorageErrorCode.QUOTA_EXCEEDED,
        sameCause(cause),
      );
    });

    it.each([22, 1014])(
      'debe lanzar QUOTA_EXCEEDED cuando solo el código %i indica cuota llena',
      (code) => {
        const { service, storage } = setup();
        const cause = { name: 'Error', code };
        storage.setItem.mockImplementationOnce(() => {
          throw cause;
        });

        expectStorageError(
          () => service.set('clave', 'valor'),
          StorageErrorCode.QUOTA_EXCEEDED,
          sameCause(cause),
        );
      },
    );

    it('debe lanzar OPERATION_FAILED con causa para un error genérico', () => {
      const { service, storage } = setup();
      const cause = new Error('Fallo inesperado');
      storage.setItem.mockImplementationOnce(() => {
        throw cause;
      });

      expectStorageError(
        () => service.set('clave', 'valor'),
        StorageErrorCode.OPERATION_FAILED,
        sameCause(cause),
      );
    });

    it.each([null, 'fallo de texto'])(
      'debe lanzar OPERATION_FAILED cuando se lanza un valor no objeto: %s',
      (cause) => {
        const { service, storage } = setup();
        storage.setItem.mockImplementationOnce(() => {
          throw cause;
        });

        expectStorageError(
          () => service.set('clave', 'valor'),
          StorageErrorCode.OPERATION_FAILED,
          sameCause(cause),
        );
      },
    );

    it('debe relanzar sin envolver un StorageError lanzado por setItem', () => {
      const { service, storage } = setup();
      const cause = new Error('Causa original');
      const existing = new StorageError(
        'Error ya construido',
        StorageErrorCode.OPERATION_FAILED,
        cause,
      );
      storage.setItem.mockImplementationOnce(() => {
        throw existing;
      });

      const error = expectStorageError(
        () => service.set('clave', 'valor'),
        StorageErrorCode.OPERATION_FAILED,
        sameCause(cause),
      );

      expect(error).toBe(existing);
    });
  });

  describe('get', () => {
    it('debe deserializar primitivos', () => {
      const { service, storage } = setup();
      storage.data.set('texto', '"hola"');
      storage.data.set('numero', '42');
      storage.data.set('booleano', 'true');

      expect(service.get<string>('texto')).toBe('hola');
      expect(service.get<number>('numero')).toBe(42);
      expect(service.get<boolean>('booleano')).toBe(true);
    });

    it('debe deserializar objetos anidados', () => {
      const { service, storage } = setup();
      const value = { usuario: { id: 1, roles: ['admin'] }, activo: true };

      storage.data.set('usuario', JSON.stringify(value));

      expect(service.get<typeof value>('usuario')).toEqual(value);
    });

    it('debe deserializar arreglos', () => {
      const { service, storage } = setup();
      const value = [{ id: 1 }, { id: 2, etiquetas: ['a'] }];

      storage.data.set('elementos', JSON.stringify(value));

      expect(service.get<typeof value>('elementos')).toEqual(value);
    });

    it('debe devolver null cuando la clave no existe', () => {
      const { service } = setup();

      expect(service.get('inexistente')).toBeNull();
    });

    it('debe lanzar PARSE_ERROR con causa cuando el JSON está corrupto', () => {
      const { service, storage } = setup();
      storage.data.set('corrupta', '{ "usuario": ');

      expectStorageError(() => service.get('corrupta'), StorageErrorCode.PARSE_ERROR, definedCause);
    });

    it('debe lanzar OPERATION_FAILED cuando getItem lanza', () => {
      const { service, storage } = setup();
      const cause = new Error('Fallo de lectura');
      storage.getItem.mockImplementationOnce(() => {
        throw cause;
      });

      expectStorageError(
        () => service.get('clave'),
        StorageErrorCode.OPERATION_FAILED,
        sameCause(cause),
      );
    });
  });

  describe('update', () => {
    it('debe pasar null al updater y guardar el valor cuando la clave no existe', () => {
      const { service } = setup();
      const updater = vi.fn((current: number | null) => {
        expect(current).toBeNull();
        return 1;
      });

      const result = service.update<number>('contador', updater);

      expect(result).toBe(1);
      expect(updater).toHaveBeenCalledWith(null);
      expect(service.get<number>('contador')).toBe(1);
    });

    it('debe transformar el valor existente, guardarlo y devolverlo', () => {
      const { service } = setup();
      service.set('contador', 10);

      const result = service.update<number>('contador', (current) => (current ?? 0) + 1);

      expect(result).toBe(11);
      expect(service.get<number>('contador')).toBe(11);
    });

    it('debe propagar sin modificar el error lanzado por el updater', () => {
      const { service, storage } = setup();
      const cause = new Error('Fallo del updater');
      let captured: unknown;

      try {
        service.update<number>('contador', () => {
          throw cause;
        });
      } catch (error) {
        captured = error;
      }

      expect(captured).toBe(cause);
      expect(storage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('has', () => {
    it('debe devolver true cuando la clave existe', () => {
      const { service } = setup();
      service.set('clave', 'valor');

      expect(service.has('clave')).toBe(true);
    });

    it('debe devolver false cuando la clave no existe', () => {
      const { service } = setup();

      expect(service.has('inexistente')).toBe(false);
    });

    it('debe devolver true aunque el JSON guardado esté corrupto', () => {
      const { service, storage } = setup();
      storage.data.set('corrupta', '{ "usuario": ');

      expect(service.has('corrupta')).toBe(true);
    });

    it('debe lanzar OPERATION_FAILED cuando getItem lanza', () => {
      const { service, storage } = setup();
      const cause = new Error('Fallo de comprobación');
      storage.getItem.mockImplementationOnce(() => {
        throw cause;
      });

      expectStorageError(
        () => service.has('clave'),
        StorageErrorCode.OPERATION_FAILED,
        sameCause(cause),
      );
    });
  });

  describe('remove', () => {
    it('debe eliminar una clave existente', () => {
      const { service, storage } = setup();
      service.set('clave', 'valor');

      service.remove('clave');

      expect(storage.data.has('clave')).toBe(false);
      expect(storage.removeItem).toHaveBeenCalledWith('clave');
    });

    it('no debe fallar al eliminar una clave inexistente', () => {
      const { service, storage } = setup();
      storage.data.set('otra', '"valor"');

      expect(() => service.remove('inexistente')).not.toThrow();
      expect(storage.data.get('otra')).toBe('"valor"');
    });

    it('debe lanzar OPERATION_FAILED cuando removeItem lanza', () => {
      const { service, storage } = setup();
      const cause = new Error('Fallo de eliminación');
      storage.removeItem.mockImplementationOnce(() => {
        throw cause;
      });

      expectStorageError(
        () => service.remove('clave'),
        StorageErrorCode.OPERATION_FAILED,
        sameCause(cause),
      );
    });
  });

  describe('clear', () => {
    it('debe borrar todas las claves cuando no hay prefijo', () => {
      const { service, storage } = setup();
      storage.data.set('uno', '"1"');
      storage.data.set('dos', '"2"');

      expect(service.keys()).toEqual(['uno', 'dos']);

      service.clear();

      expect(storage.data.size).toBe(0);
    });

    it('debe borrar solo las claves del prefijo y dejar las ajenas', () => {
      const { service, storage } = setup({
        prefix: 'app:',
        storage: createFakeStorage({
          'app:a': '"1"',
          'app:b': '"2"',
          ajena: '"3"',
        }),
      });

      expect(service.keys()).toEqual(['a', 'b']);

      service.clear();

      expect(Array.from(storage.data.keys())).toEqual(['ajena']);
      expect(storage.removeItem).toHaveBeenCalledWith('app:a');
      expect(storage.removeItem).toHaveBeenCalledWith('app:b');
      expect(storage.removeItem).not.toHaveBeenCalledWith('ajena');
    });

    it('no debe fallar cuando no hay claves que borrar', () => {
      const { service, storage } = setup();

      expect(() => service.clear()).not.toThrow();
      expect(storage.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('keys', () => {
    it('debe devolver todas las claves cuando no hay prefijo', () => {
      const { service } = setup({
        storage: createFakeStorage({ uno: '"1"', dos: '"2"' }),
      });

      expect(service.keys()).toEqual(['uno', 'dos']);
    });

    it('debe devolver solo las claves del prefijo y sin el prefijo', () => {
      const { service } = setup({
        prefix: 'app:',
        storage: createFakeStorage({
          'app:uno': '"1"',
          'app:dos': '"2"',
          ajena: '"3"',
        }),
      });

      expect(service.keys()).toEqual(['uno', 'dos']);
    });

    it('debe ignorar las posiciones cuyo key devuelve null', () => {
      const storage = createFakeStorage({ uno: '"1"' });
      storage.key.mockReturnValue(null);
      const { service } = setup({ storage });

      expect(service.keys()).toEqual([]);
    });

    it('debe devolver un arreglo vacío cuando el storage no tiene claves', () => {
      const { service } = setup();

      expect(service.keys()).toEqual([]);
    });

    it('debe lanzar OPERATION_FAILED cuando el storage lanza', () => {
      const storage = createFakeStorage({ uno: '"1"' });
      const cause = new Error('Fallo de listado');
      storage.key.mockImplementationOnce(() => {
        throw cause;
      });
      const { service } = setup({ storage });

      expectStorageError(() => service.keys(), StorageErrorCode.OPERATION_FAILED, sameCause(cause));
    });
  });

  describe('configuración del prefijo', () => {
    it('debe funcionar sin prefijo cuando la configuración no lo define', () => {
      const { service, storage } = setup({ config: {} });

      service.set('clave', 'valor');

      expect(storage.data.get('clave')).toBe('"valor"');
      expect(service.keys()).toEqual(['clave']);
    });

    it('debe tratar un prefijo vacío como ausencia de prefijo', () => {
      const { service, storage } = setup({ prefix: '' });

      service.set('clave', 'valor');

      expect(storage.data.get('clave')).toBe('"valor"');
      expect(service.keys()).toEqual(['clave']);
    });

    it('debe funcionar sin prefijo cuando no hay configuración', () => {
      const { service, storage } = setup({ config: null });

      service.set('clave', 'valor');

      expect(storage.data.get('clave')).toBe('"valor"');
      expect(service.keys()).toEqual(['clave']);
    });
  });

  describe('cuando LocalStorage no está disponible', () => {
    let service: LocalStorageService;

    beforeEach(() => {
      service = setup({ storage: null, config: null }).service;
    });

    it('set debe lanzar UNSUPPORTED', () => {
      expectStorageError(
        () => service.set('clave', 'valor'),
        StorageErrorCode.UNSUPPORTED,
        absentCause,
      );
    });

    it('get debe lanzar UNSUPPORTED', () => {
      expectStorageError(() => service.get('clave'), StorageErrorCode.UNSUPPORTED, absentCause);
    });

    it('update debe lanzar UNSUPPORTED sin ejecutar el updater', () => {
      const updater = vi.fn();

      expectStorageError(
        () => service.update('clave', updater),
        StorageErrorCode.UNSUPPORTED,
        absentCause,
      );
      expect(updater).not.toHaveBeenCalled();
    });

    it('has debe lanzar UNSUPPORTED', () => {
      expectStorageError(() => service.has('clave'), StorageErrorCode.UNSUPPORTED, absentCause);
    });

    it('remove debe lanzar UNSUPPORTED', () => {
      expectStorageError(() => service.remove('clave'), StorageErrorCode.UNSUPPORTED, absentCause);
    });

    it('clear debe lanzar UNSUPPORTED', () => {
      expectStorageError(() => service.clear(), StorageErrorCode.UNSUPPORTED, absentCause);
    });

    it('keys debe lanzar UNSUPPORTED', () => {
      expectStorageError(() => service.keys(), StorageErrorCode.UNSUPPORTED, absentCause);
    });
  });
});
