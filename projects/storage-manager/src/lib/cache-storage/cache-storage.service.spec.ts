import { TestBed } from '@angular/core/testing';
import { CACHE_STORAGE_TOKEN } from '../internal/browser-tokens';
import { StorageError, StorageErrorCode } from '../models/storage-error.model';
import { CacheStorageService } from './cache-storage.service';

const BASE = 'https://api.test';

/**
 * Normaliza una petición a un `Request` para usarla como clave del mock.
 */
function toRequest(request: RequestInfo | URL): Request {
  return request instanceof Request ? request : new Request(request);
}

/**
 * Crea un mock de `Cache` en memoria. Las respuestas se guardan por método y
 * URL, y `match` devuelve un clon para poder leer el cuerpo varias veces.
 */
function createFakeCache() {
  const entries = new Map<string, { request: Request; response: Response }>();
  const keyOf = (request: Request) => `${request.method} ${request.url}`;

  return {
    entries,
    put: vi.fn(async (request: RequestInfo | URL, response: Response): Promise<void> => {
      const normalized = toRequest(request);
      entries.set(keyOf(normalized), { request: normalized, response });
    }),
    match: vi.fn(async (request: RequestInfo | URL): Promise<Response | undefined> => {
      return entries.get(keyOf(toRequest(request)))?.response.clone();
    }),
    keys: vi.fn(async (): Promise<Request[]> => Array.from(entries.values(), (e) => e.request)),
    delete: vi.fn(async (request: RequestInfo | URL): Promise<boolean> => {
      return entries.delete(keyOf(toRequest(request)));
    }),
  };
}

type FakeCache = ReturnType<typeof createFakeCache>;

/**
 * Crea un mock de `CacheStorage` respaldado por un `Map` de cachés.
 */
function createFakeCacheStorage() {
  const caches = new Map<string, FakeCache>();

  return {
    caches,
    open: vi.fn(async (name: string): Promise<FakeCache> => {
      let cache = caches.get(name);

      if (!cache) {
        cache = createFakeCache();
        caches.set(name, cache);
      }

      return cache;
    }),
    has: vi.fn(async (name: string): Promise<boolean> => caches.has(name)),
    keys: vi.fn(async (): Promise<string[]> => Array.from(caches.keys())),
    delete: vi.fn(async (name: string): Promise<boolean> => caches.delete(name)),
  };
}

type FakeCacheStorage = ReturnType<typeof createFakeCacheStorage>;

function setup(): { service: CacheStorageService; storage: FakeCacheStorage };
function setup(storage: null): { service: CacheStorageService; storage: null };
function setup(storage: FakeCacheStorage | null = createFakeCacheStorage()) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: CACHE_STORAGE_TOKEN, useValue: storage }],
  });

  return { service: TestBed.inject(CacheStorageService), storage };
}

/**
 * Espera que la promesa se rechace con un {@link StorageError} del código
 * indicado y devuelve el error para hacer más comprobaciones.
 */
async function expectStorageError(
  promise: Promise<unknown>,
  code: StorageErrorCode,
): Promise<StorageError> {
  let captured: unknown;

  try {
    await promise;
  } catch (error) {
    captured = error;
  }

  expect(captured).toBeInstanceOf(StorageError);
  expect((captured as StorageError).code).toBe(code);

  return captured as StorageError;
}

describe('CacheStorageService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('isSupported', () => {
    it('debe devolver true cuando el token entrega un CacheStorage', () => {
      const { service } = setup();

      expect(service.isSupported()).toBe(true);
    });

    it('debe devolver false cuando el token entrega null', () => {
      const { service } = setup(null);

      expect(service.isSupported()).toBe(false);
    });
  });

  describe('createCache, listCaches y hasCache', () => {
    it('debe crear una caché y listarla', async () => {
      const { service, storage } = setup();

      await service.createCache('recursos');
      await service.createCache('api-v1');

      expect(storage.open).toHaveBeenCalledWith('recursos');
      expect(await service.listCaches()).toEqual(['recursos', 'api-v1']);
    });

    it('debe devolver un arreglo vacío cuando no hay cachés', async () => {
      const { service } = setup();

      expect(await service.listCaches()).toEqual([]);
    });

    it('debe indicar si una caché existe', async () => {
      const { service } = setup();
      await service.createCache('recursos');

      expect(await service.hasCache('recursos')).toBe(true);
      expect(await service.hasCache('inexistente')).toBe(false);
    });
  });

  describe('put y get', () => {
    it('debe guardar y recuperar un recurso usando una URL', async () => {
      const { service, storage } = setup();
      const url = `${BASE}/logo.svg`;

      await service.put('recursos', url, new Response('<svg></svg>'));
      const response = await service.get('recursos', url);

      expect(storage.caches.has('recursos')).toBe(true);
      expect(await response?.text()).toBe('<svg></svg>');
    });

    it('debe guardar y recuperar un recurso usando un Request', async () => {
      const { service } = setup();
      const request = new Request(`${BASE}/datos`);

      await service.put('recursos', request, new Response('contenido'));

      expect(await (await service.get('recursos', request))?.text()).toBe('contenido');
      expect(await (await service.get('recursos', `${BASE}/datos`))?.text()).toBe('contenido');
    });

    it('debe devolver undefined cuando el recurso no existe', async () => {
      const { service } = setup();
      await service.createCache('recursos');

      expect(await service.get('recursos', `${BASE}/inexistente`)).toBeUndefined();
    });

    it('debe devolver undefined sin crear la caché cuando no existe', async () => {
      const { service, storage } = setup();

      expect(await service.get('inexistente', `${BASE}/recurso`)).toBeUndefined();
      expect(storage.open).not.toHaveBeenCalled();
      expect(storage.caches.has('inexistente')).toBe(false);
    });

    it('debe incluir la URL del Request en el mensaje de error de put', async () => {
      const { service, storage } = setup();
      storage.open.mockRejectedValueOnce(new Error('Fallo'));

      const error = await expectStorageError(
        service.put('recursos', new Request(`${BASE}/datos`), new Response('x')),
        StorageErrorCode.OPERATION_FAILED,
      );

      expect(error.message).toContain(`${BASE}/datos`);
    });
  });

  describe('putJson y getJson', () => {
    it('debe guardar y recuperar un objeto como JSON', async () => {
      const { service, storage } = setup();
      const url = `${BASE}/usuario`;
      const value = { id: 1, nombre: 'Ana', roles: ['admin'], perfil: { activo: true } };

      await service.putJson('api', url, value);

      const stored = storage.caches.get('api')?.entries.get(`GET ${url}`)?.response;
      expect(stored?.headers.get('Content-Type')).toBe('application/json');
      expect(await service.getJson<typeof value>('api', url)).toEqual(value);
    });

    it('debe guardar y recuperar un arreglo', async () => {
      const { service } = setup();
      const value = [{ id: 1 }, { id: 2 }];

      await service.putJson('api', `${BASE}/lista`, value);

      expect(await service.getJson<typeof value>('api', `${BASE}/lista`)).toEqual(value);
    });

    it('debe guardar y recuperar primitivos', async () => {
      const { service } = setup();

      await service.putJson('api', `${BASE}/texto`, 'hola');
      await service.putJson('api', `${BASE}/numero`, 42);
      await service.putJson('api', `${BASE}/booleano`, false);
      await service.putJson('api', `${BASE}/nulo`, null);

      expect(await service.getJson<string>('api', `${BASE}/texto`)).toBe('hola');
      expect(await service.getJson<number>('api', `${BASE}/numero`)).toBe(42);
      expect(await service.getJson<boolean>('api', `${BASE}/booleano`)).toBe(false);
      expect(await service.getJson<null>('api', `${BASE}/nulo`)).toBeNull();
    });

    it('debe devolver null cuando el recurso no existe', async () => {
      const { service } = setup();
      await service.createCache('api');

      expect(await service.getJson('api', `${BASE}/inexistente`)).toBeNull();
    });

    it('debe devolver null cuando la caché no existe', async () => {
      const { service } = setup();

      expect(await service.getJson('inexistente', `${BASE}/recurso`)).toBeNull();
    });

    it('debe lanzar PARSE_ERROR cuando el cuerpo no es JSON válido', async () => {
      const { service } = setup();
      const url = `${BASE}/texto-plano`;
      await service.put('api', url, new Response('esto no es JSON'));

      const error = await expectStorageError(
        service.getJson('api', url),
        StorageErrorCode.PARSE_ERROR,
      );

      expect(error.cause).toBeInstanceOf(SyntaxError);
    });

    it('debe lanzar OPERATION_FAILED cuando no se puede leer el cuerpo', async () => {
      const { service, storage } = setup();
      const cause = new TypeError('Cuerpo ya consumido');
      await service.createCache('api');
      storage.caches.get('api')!.match.mockResolvedValueOnce({
        text: () => Promise.reject(cause),
      } as unknown as Response);

      const error = await expectStorageError(
        service.getJson('api', `${BASE}/recurso`),
        StorageErrorCode.OPERATION_FAILED,
      );

      expect(error.cause).toBe(cause);
    });

    it('debe lanzar SERIALIZATION_ERROR con una referencia circular', async () => {
      const { service, storage } = setup();
      const circular: Record<string, unknown> = { nombre: 'ciclo' };
      circular['self'] = circular;

      const error = await expectStorageError(
        service.putJson('api', `${BASE}/ciclo`, circular),
        StorageErrorCode.SERIALIZATION_ERROR,
      );

      expect(error.cause).toBeInstanceOf(TypeError);
      expect(storage.open).not.toHaveBeenCalled();
    });

    it('debe lanzar SERIALIZATION_ERROR cuando JSON.stringify devuelve undefined', async () => {
      const { service, storage } = setup();

      await expectStorageError(
        service.putJson('api', `${BASE}/indefinido`, undefined),
        StorageErrorCode.SERIALIZATION_ERROR,
      );
      await expectStorageError(
        service.putJson('api', `${BASE}/funcion`, () => 1),
        StorageErrorCode.SERIALIZATION_ERROR,
      );

      expect(storage.open).not.toHaveBeenCalled();
    });
  });

  describe('fetchAndStore', () => {
    it('debe descargar y guardar el recurso', async () => {
      const { service } = setup();
      const url = `${BASE}/productos`;
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('[1,2,3]', { status: 200 }));

      await service.fetchAndStore('api', url);

      expect(fetchSpy).toHaveBeenCalledWith(url);
      expect(await service.getJson<number[]>('api', url)).toEqual([1, 2, 3]);
    });

    it('debe lanzar OPERATION_FAILED con causa cuando fetch lanza', async () => {
      const { service, storage } = setup();
      const cause = new TypeError('Failed to fetch');
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(cause));

      const error = await expectStorageError(
        service.fetchAndStore('api', `${BASE}/caido`),
        StorageErrorCode.OPERATION_FAILED,
      );

      expect(error.cause).toBe(cause);
      expect(storage.open).not.toHaveBeenCalled();
    });

    it('debe lanzar OPERATION_FAILED con el estado cuando la respuesta no es ok', async () => {
      const { service, storage } = setup();
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('No existe', { status: 404 }));

      const error = await expectStorageError(
        service.fetchAndStore('api', `${BASE}/no-existe`),
        StorageErrorCode.OPERATION_FAILED,
      );

      expect(error.message).toContain('404');
      expect(storage.open).not.toHaveBeenCalled();
    });
  });

  describe('keys', () => {
    it('debe listar la URL y el método de cada recurso', async () => {
      const { service } = setup();
      await service.put('api', `${BASE}/a`, new Response('a'));
      await service.put('api', new Request(`${BASE}/b`), new Response('b'));

      expect(await service.keys('api')).toEqual([
        { url: `${BASE}/a`, method: 'GET' },
        { url: `${BASE}/b`, method: 'GET' },
      ]);
    });

    it('debe devolver un arreglo vacío sin crear la caché cuando no existe', async () => {
      const { service, storage } = setup();

      expect(await service.keys('inexistente')).toEqual([]);
      expect(storage.open).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('debe eliminar un recurso existente', async () => {
      const { service } = setup();
      const url = `${BASE}/a`;
      await service.put('api', url, new Response('a'));

      expect(await service.delete('api', url)).toBe(true);
      expect(await service.get('api', url)).toBeUndefined();
    });

    it('debe eliminar un recurso usando un Request', async () => {
      const { service } = setup();
      await service.put('api', `${BASE}/a`, new Response('a'));

      expect(await service.delete('api', new Request(`${BASE}/a`))).toBe(true);
    });

    it('debe devolver false cuando el recurso no existe', async () => {
      const { service } = setup();
      await service.createCache('api');

      expect(await service.delete('api', `${BASE}/inexistente`)).toBe(false);
    });

    it('debe devolver false sin crear la caché cuando no existe', async () => {
      const { service, storage } = setup();

      expect(await service.delete('inexistente', `${BASE}/a`)).toBe(false);
      expect(storage.open).not.toHaveBeenCalled();
    });
  });

  describe('deleteCache', () => {
    it('debe eliminar una caché existente', async () => {
      const { service } = setup();
      await service.createCache('api');

      expect(await service.deleteCache('api')).toBe(true);
      expect(await service.hasCache('api')).toBe(false);
    });

    it('debe devolver false cuando la caché no existe', async () => {
      const { service } = setup();

      expect(await service.deleteCache('inexistente')).toBe(false);
    });
  });

  describe('sin soporte de Cache Storage', () => {
    const url = `${BASE}/recurso`;
    const operations: [string, (service: CacheStorageService) => Promise<unknown>][] = [
      ['createCache', (s) => s.createCache('api')],
      ['listCaches', (s) => s.listCaches()],
      ['hasCache', (s) => s.hasCache('api')],
      ['put', (s) => s.put('api', url, new Response('x'))],
      ['putJson', (s) => s.putJson('api', url, { a: 1 })],
      ['fetchAndStore', (s) => s.fetchAndStore('api', url)],
      ['get', (s) => s.get('api', url)],
      ['getJson', (s) => s.getJson('api', url)],
      ['keys', (s) => s.keys('api')],
      ['delete', (s) => s.delete('api', url)],
      ['deleteCache', (s) => s.deleteCache('api')],
    ];

    it.each(operations)('%s debe lanzar UNSUPPORTED', async (_name, operation) => {
      const { service } = setup(null);
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      await expectStorageError(operation(service), StorageErrorCode.UNSUPPORTED);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('traducción de errores', () => {
    it('debe traducir QuotaExceededError a QUOTA_EXCEEDED conservando la causa', async () => {
      const { service, storage } = setup();
      const cause = new DOMException('Cuota llena', 'QuotaExceededError');
      await service.createCache('api');
      storage.caches.get('api')!.put.mockRejectedValueOnce(cause);

      const error = await expectStorageError(
        service.put('api', `${BASE}/grande`, new Response('x')),
        StorageErrorCode.QUOTA_EXCEEDED,
      );

      expect(error.cause).toBe(cause);
    });

    it('debe traducir un error genérico a OPERATION_FAILED conservando la causa', async () => {
      const { service, storage } = setup();
      const cause = new Error('Fallo inesperado');
      storage.keys.mockRejectedValueOnce(cause);

      const error = await expectStorageError(
        service.listCaches(),
        StorageErrorCode.OPERATION_FAILED,
      );

      expect(error.cause).toBe(cause);
    });

    it.each([
      ['una cadena', 'fallo'],
      ['null', null],
      ['un objeto sin nombre', {}],
    ])('debe traducir %s lanzado a OPERATION_FAILED', async (_desc, cause) => {
      const { service, storage } = setup();
      storage.has.mockRejectedValueOnce(cause);

      const error = await expectStorageError(
        service.hasCache('api'),
        StorageErrorCode.OPERATION_FAILED,
      );

      expect(error.cause).toBe(cause);
    });

    it('debe re-lanzar un StorageError sin envolverlo', async () => {
      const { service, storage } = setup();
      const original = new StorageError('Error previo', StorageErrorCode.SERIALIZATION_ERROR);
      storage.open.mockRejectedValueOnce(original);

      const error = await expectStorageError(
        service.createCache('api'),
        StorageErrorCode.SERIALIZATION_ERROR,
      );

      expect(error).toBe(original);
      expect(error.cause).toBeUndefined();
    });

    it('debe re-lanzar un StorageError al leer el cuerpo en getJson', async () => {
      const { service, storage } = setup();
      const original = new StorageError('Error previo', StorageErrorCode.SERIALIZATION_ERROR);
      await service.createCache('api');
      storage.caches.get('api')!.match.mockResolvedValueOnce({
        text: () => Promise.reject(original),
      } as unknown as Response);

      const error = await expectStorageError(
        service.getJson('api', `${BASE}/recurso`),
        StorageErrorCode.SERIALIZATION_ERROR,
      );

      expect(error).toBe(original);
    });
  });
});
