import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  CacheStorageService,
  StorageError,
  StorageErrorCode,
  type CacheEntryInfo,
} from 'ngx-uceva-storage-manager';
import { CacheStoragePanel } from './cache-storage-panel';

function createServiceMock(supported = true) {
  return {
    isSupported: vi.fn(() => supported),
    createCache: vi.fn(async (_name: string) => undefined),
    listCaches: vi.fn(async (): Promise<string[]> => []),
    hasCache: vi.fn(async (_name: string) => false),
    put: vi.fn(async (_cache: string, _req: string | Request, _res: Response) => undefined),
    putJson: vi.fn(async (_cache: string, _url: string, _data: unknown) => undefined),
    fetchAndStore: vi.fn(async (_cache: string, _url: string) => undefined),
    get: vi.fn(
      async (_cache: string, _req: string | Request): Promise<Response | undefined> => undefined,
    ),
    getJson: vi.fn(async (_cache: string, _url: string): Promise<unknown> => null),
    keys: vi.fn(async (_cache: string): Promise<CacheEntryInfo[]> => []),
    delete: vi.fn(async (_cache: string, _req: string | Request) => true),
    deleteCache: vi.fn(async (_name: string) => true),
  };
}

type ServiceMock = ReturnType<typeof createServiceMock>;

describe('CacheStoragePanel', () => {
  let fixture: ComponentFixture<CacheStoragePanel>;
  let serviceMock: ServiceMock;

  async function setup(mock: ServiceMock = createServiceMock()): Promise<void> {
    serviceMock = mock;

    await TestBed.configureTestingModule({
      imports: [CacheStoragePanel],
      providers: [{ provide: CacheStorageService, useValue: serviceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(CacheStoragePanel);
    await settle();
  }

  /** Deja que se resuelvan las promesas pendientes y actualiza la vista. */
  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function query<T extends HTMLElement>(selector: string): T {
    return fixture.nativeElement.querySelector(selector) as T;
  }

  async function setInput(selector: string, value: string): Promise<void> {
    const element = query<HTMLInputElement | HTMLTextAreaElement>(selector);
    element.value = value;
    element.dispatchEvent(new Event('input'));
    await settle();
  }

  async function click(selector: string): Promise<void> {
    query<HTMLButtonElement>(selector).click();
    await settle();
  }

  function text(): string {
    return fixture.nativeElement.textContent as string;
  }

  async function createActiveCache(name = 'demo'): Promise<void> {
    serviceMock.listCaches.mockResolvedValue([name]);
    await setInput('#new-cache-name', name);
    await click('#create-cache');
  }

  it('debe crearse y cargar la lista inicial de cachés', async () => {
    await setup();

    expect(fixture.componentInstance).toBeTruthy();
    expect(serviceMock.listCaches).toHaveBeenCalled();
    expect(text()).toContain('devolvió true');
  });

  it('debe deshabilitar las acciones cuando Cache Storage no es compatible', async () => {
    await setup(createServiceMock(false));

    expect(text()).toContain('devolvió false');
    expect(serviceMock.listCaches).not.toHaveBeenCalled();
    expect(query<HTMLButtonElement>('#create-cache').matches(':disabled')).toBe(true);
  });

  it('debe crear una caché y dejarla como activa', async () => {
    await setup();
    await createActiveCache('recursos');

    expect(serviceMock.createCache).toHaveBeenCalledWith('recursos');
    expect(serviceMock.keys).toHaveBeenCalledWith('recursos');
    expect(query('#active-cache-name').textContent).toContain('recursos');
  });

  it('debe comprobar si una caché existe', async () => {
    await setup();
    serviceMock.hasCache.mockResolvedValue(true);

    await setInput('#check-cache-name', 'recursos');
    await click('#check-cache');

    expect(serviceMock.hasCache).toHaveBeenCalledWith('recursos');
    expect(query('#has-result').textContent).toContain('existe');
  });

  it('debe pedir confirmación antes de eliminar una caché', async () => {
    serviceMock = createServiceMock();
    serviceMock.listCaches.mockResolvedValue(['vieja']);
    await setup(serviceMock);

    await click('.delete-cache');
    expect(serviceMock.deleteCache).not.toHaveBeenCalled();

    serviceMock.listCaches.mockResolvedValue([]);
    await click('.confirm-delete-cache');

    expect(serviceMock.deleteCache).toHaveBeenCalledWith('vieja');
    expect(text()).toContain('Se eliminó la caché "vieja".');
  });

  it('debe guardar con put construyendo un Response con Content-Type', async () => {
    await setup();
    await createActiveCache();
    await setInput('#put-url', '/demo/a.txt');
    await setInput('#put-body', 'hola');

    await click('#put-button');

    const [cache, url, response] = serviceMock.put.mock.calls[0];
    expect(cache).toBe('demo');
    expect(url).toBe('/demo/a.txt');
    expect(response.headers.get('Content-Type')).toBe('text/plain');
    expect(await response.text()).toBe('hola');
  });

  it('no debe llamar a putJson cuando el JSON es inválido', async () => {
    await setup();
    await createActiveCache();
    await setInput('#json-body', '{"nombre":');

    await click('#put-json-button');

    expect(serviceMock.putJson).not.toHaveBeenCalled();
    expect(text()).toContain('El JSON ingresado no es válido');
  });

  it('debe guardar JSON válido con putJson y refrescar los recursos', async () => {
    await setup();
    await createActiveCache();
    serviceMock.keys.mockResolvedValue([
      { url: 'http://localhost/demo/usuario.json', method: 'GET' },
    ]);

    await click('#put-json-button');

    expect(serviceMock.putJson).toHaveBeenCalledWith('demo', '/demo/usuario.json', {
      id: 1,
      nombre: 'Ana',
      activo: true,
    });
    expect(text()).toContain('http://localhost/demo/usuario.json');
  });

  it('debe descargar con fetchAndStore usando la URL por defecto', async () => {
    await setup();
    await createActiveCache();

    await click('#fetch-button');

    expect(serviceMock.fetchAndStore).toHaveBeenCalledWith(
      'demo',
      'https://jsonplaceholder.typicode.com/todos/1',
    );
  });

  it('debe mostrar status, Content-Type y cuerpo con get', async () => {
    await setup();
    await createActiveCache();
    serviceMock.get.mockResolvedValue(
      new Response('contenido', { status: 200, headers: { 'Content-Type': 'text/plain' } }),
    );

    await setInput('#get-url', '/demo/a.txt');
    await click('#get-button');

    expect(text()).toContain('200');
    expect(text()).toContain('text/plain');
    expect(text()).toContain('contenido');
  });

  it('debe indicar "no encontrado (null)" con getJson', async () => {
    await setup();
    await createActiveCache();

    await setInput('#get-json-url', '/demo/x.json');
    await click('#get-json-button');

    expect(query('#get-json-result').textContent).toContain('No encontrado (null)');
  });

  it('debe eliminar un recurso desde la tabla', async () => {
    await setup();
    serviceMock.keys.mockResolvedValue([{ url: 'http://localhost/demo/a.txt', method: 'GET' }]);
    await createActiveCache();

    await click('.delete-entry');

    expect(serviceMock.delete).toHaveBeenCalledWith('demo', 'http://localhost/demo/a.txt');
  });

  it('debe mostrar el código y el mensaje de un StorageError', async () => {
    await setup();
    await createActiveCache();
    serviceMock.getJson.mockRejectedValue(
      new StorageError(
        'El contenido no es JSON',
        StorageErrorCode.PARSE_ERROR,
        new SyntaxError('x'),
      ),
    );

    await setInput('#get-json-url', '/demo/a.txt');
    await click('#get-json-button');

    expect(query('#cache-feedback').textContent).toContain('PARSE_ERROR:');
    expect(text()).toContain('El contenido no es JSON');
    expect(text()).toContain('SyntaxError: x');
  });
});
