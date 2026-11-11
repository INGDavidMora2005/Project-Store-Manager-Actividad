import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocalStorageService, StorageError, StorageErrorCode } from 'ngx-uceva-storage-manager';
import { LocalStoragePanel } from './local-storage-panel';

function createServiceMock() {
  return {
    set: vi.fn<(key: string, value: unknown) => void>(),
    get: vi.fn<(key: string) => unknown>().mockReturnValue(null),
    update: vi.fn<(key: string, updater: (current: unknown) => unknown) => unknown>(),
    has: vi.fn<(key: string) => boolean>().mockReturnValue(false),
    remove: vi.fn<(key: string) => void>(),
    clear: vi.fn<() => void>(),
    keys: vi.fn<() => string[]>().mockReturnValue([]),
  };
}

describe('LocalStoragePanel', () => {
  let component: LocalStoragePanel;
  let fixture: ComponentFixture<LocalStoragePanel>;
  let serviceMock: ReturnType<typeof createServiceMock>;

  beforeEach(async () => {
    serviceMock = createServiceMock();

    await TestBed.configureTestingModule({
      imports: [LocalStoragePanel],
      providers: [{ provide: LocalStorageService, useValue: serviceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(LocalStoragePanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function setInput(selector: string, value: string): void {
    const element = fixture.nativeElement.querySelector(selector) as
      HTMLInputElement | HTMLTextAreaElement;
    element.value = value;
    element.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function setSelect(selector: string, value: string): void {
    const element = fixture.nativeElement.querySelector(selector) as HTMLSelectElement;
    element.value = value;
    element.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function click(selector: string): void {
    const button = fixture.nativeElement.querySelector(selector) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
  }

  function pageText(): string {
    return fixture.nativeElement.textContent as string;
  }

  it('debe crear el panel y cargar la lista inicial', () => {
    expect(component).toBeTruthy();
    expect(pageText()).toContain('LocalStorage');
    expect(serviceMock.keys).toHaveBeenCalled();
  });

  it('debe guardar un valor de texto', () => {
    setInput('#save-key', 'usuario');
    setInput('#save-value', 'Ana');

    click('#save-button');

    expect(serviceMock.set).toHaveBeenCalledWith('usuario', 'Ana');
    expect(pageText()).toContain('Se guardó la clave "usuario".');
  });

  it('debe convertir el texto a number antes de guardar', () => {
    setInput('#save-key', 'edad');
    setSelect('#save-type', 'number');
    setInput('#save-value', '42');

    click('#save-button');

    expect(serviceMock.set).toHaveBeenCalledWith('edad', 42);
  });

  it('debe convertir JSON válido a objeto antes de guardar', () => {
    setInput('#save-key', 'perfil');
    setSelect('#save-type', 'json');
    setInput('#save-value', '{"nombre":"Ana","activo":true}');

    click('#save-button');

    expect(serviceMock.set).toHaveBeenCalledWith('perfil', { nombre: 'Ana', activo: true });
  });

  it('no debe llamar al servicio cuando el JSON es inválido', () => {
    setInput('#save-key', 'perfil');
    setSelect('#save-type', 'json');
    setInput('#save-value', '{"nombre":');

    click('#save-button');

    expect(serviceMock.set).not.toHaveBeenCalled();
    expect(pageText()).toContain('El JSON ingresado no es válido.');
  });

  it('debe consultar una clave y mostrar su JSON formateado', () => {
    serviceMock.get.mockReturnValue({ id: 1, nombre: 'Ana' });

    setInput('#query-key', 'usuario');
    click('#query-button');

    expect(serviceMock.get).toHaveBeenCalledWith('usuario');
    expect(pageText()).toContain('"id": 1');
    expect(pageText()).toContain('"nombre": "Ana"');
  });

  it('debe indicar cuando la clave consultada no existe', () => {
    serviceMock.get.mockReturnValue(null);

    setInput('#query-key', 'inexistente');
    click('#query-button');

    expect(pageText()).toContain('La clave "inexistente" no existe.');
  });

  it('debe actualizar un número y mostrar el valor devuelto', () => {
    serviceMock.update.mockReturnValue(11);

    setInput('#update-key', 'contador');
    click('#update-button');

    expect(serviceMock.update).toHaveBeenCalledWith('contador', expect.any(Function));
    expect(pageText()).toContain('Nuevo valor devuelto');
    expect(pageText()).toContain('11');

    const updater = serviceMock.update.mock.calls[0][1] as (current: unknown) => unknown;
    expect(updater(10)).toBe(11);
  });

  it('debe comprobar si una clave existe y luego eliminarla', () => {
    serviceMock.has.mockReturnValue(true);

    setInput('#remove-key', 'usuario');
    click('#has-button');

    expect(serviceMock.has).toHaveBeenCalledWith('usuario');
    expect(pageText()).toContain('La clave existe.');

    click('#remove-button');

    expect(serviceMock.remove).toHaveBeenCalledWith('usuario');
    expect(pageText()).toContain('Se eliminó la clave "usuario".');
  });

  it('debe listar las claves con sus valores', () => {
    serviceMock.keys.mockReturnValue(['uno', 'dos']);
    serviceMock.get.mockImplementation((key: string) => (key === 'uno' ? 1 : { valor: 2 }));

    click('#list-button');

    expect(pageText()).toContain('uno');
    expect(pageText()).toContain('dos');
    expect(pageText()).toContain('"valor": 2');
  });

  it('debe pedir confirmación antes de limpiar y ejecutar clear al confirmar', () => {
    click('#clear-request');

    expect(serviceMock.clear).not.toHaveBeenCalled();
    expect(pageText()).toContain('¿Seguro que quieres eliminar todas las claves?');

    click('#clear-confirm');

    expect(serviceMock.clear).toHaveBeenCalled();
    expect(pageText()).toContain('Se limpiaron todas las claves de LocalStorage.');
  });

  it('debe mostrar código, mensaje y causa de un StorageError', () => {
    const cause = new Error('El origen del fallo');
    serviceMock.set.mockImplementation(() => {
      throw new StorageError('No hay espacio disponible', StorageErrorCode.QUOTA_EXCEEDED, cause);
    });

    setInput('#save-key', 'usuario');
    setInput('#save-value', 'Ana');
    click('#save-button');

    const text = pageText();
    expect(text).toContain('QUOTA_EXCEEDED');
    expect(text).toContain('No hay espacio disponible');
    expect(text).toContain('Causa:');
    expect(text).toContain('El origen del fallo');
  });
});
