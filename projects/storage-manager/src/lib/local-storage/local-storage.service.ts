import { Injectable, inject } from '@angular/core';
import { LOCAL_STORAGE_TOKEN } from '../internal/browser-tokens';
import { StorageError, StorageErrorCode } from '../models/storage-error.model';
import { STORAGE_MANAGER_CONFIG } from '../models/storage-config.model';

/**
 * Nombres con los que algunos navegadores reportan la cuota llena.
 *
 * @internal
 */
const QUOTA_ERROR_NAMES: ReadonlySet<string> = new Set([
  'QuotaExceededError',
  'NS_ERROR_DOM_QUOTA_REACHED',
]);

/**
 * Códigos con los que algunos navegadores reportan la cuota llena.
 *
 * @internal
 */
const QUOTA_ERROR_CODES: ReadonlySet<number> = new Set([22, 1014]);

/**
 * Servicio síncrono para gestionar LocalStorage de forma tipada y consistente.
 *
 * Los valores se serializan con JSON, por lo que se admiten primitivos
 * (`string`, `number`, `boolean`), objetos y arreglos anidados. Todas las
 * claves se guardan con el prefijo definido en
 * {@link STORAGE_MANAGER_CONFIG}; si no hay configuración o el prefijo está
 * vacío, se usan las claves tal cual.
 *
 * El acceso al almacenamiento se realiza a través de un token interno de
 * inyección, nunca directamente sobre `window`.
 *
 * @example
 * ```ts
 * private readonly storage = inject(LocalStorageService);
 *
 * this.storage.set('usuario', { id: 1, nombre: 'Ana' });
 * const usuario = this.storage.get<{ id: number; nombre: string }>('usuario');
 * ```
 */
@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  private readonly storage = inject(LOCAL_STORAGE_TOKEN);
  private readonly config = inject(STORAGE_MANAGER_CONFIG, { optional: true });
  private readonly prefix = this.config?.prefix ?? '';

  /**
   * Guarda un valor serializado en LocalStorage.
   *
   * @param key Clave con la que se guardará el valor, sin el prefijo.
   * @param value Valor que se serializará y almacenará.
   * @returns No devuelve ningún valor.
   * @throws {StorageError} Con código `SERIALIZATION_ERROR` si el valor no se
   * puede serializar, `QUOTA_EXCEEDED` si la cuota está llena,
   * `UNSUPPORTED` si LocalStorage no está disponible u `OPERATION_FAILED` si
   * el almacenamiento falla por otro motivo.
   * @example
   * ```ts
   * service.set('tema', 'oscuro');
   * ```
   */
  set<T>(key: string, value: T): void {
    const storage = this.requireStorage();

    let serialized: string | undefined;

    try {
      serialized = JSON.stringify(value);
    } catch (error) {
      throw this.toStorageError(
        error,
        `No se pudo serializar el valor de la clave "${key}".`,
        StorageErrorCode.SERIALIZATION_ERROR,
      );
    }

    if (serialized === undefined) {
      throw new StorageError(
        `No se pudo serializar el valor de la clave "${key}": JSON.stringify devolvió undefined.`,
        StorageErrorCode.SERIALIZATION_ERROR,
      );
    }

    try {
      storage.setItem(this.withPrefix(key), serialized);
    } catch (error) {
      throw this.toStorageError(error, `No se pudo guardar la clave "${key}" en LocalStorage.`);
    }
  }

  /**
   * Recupera y deserializa un valor de LocalStorage.
   *
   * @param key Clave que se desea consultar, sin el prefijo.
   * @returns El valor deserializado o `null` si la clave no existe.
   * @throws {StorageError} Con código `PARSE_ERROR` si el contenido almacenado
   * no es JSON válido, `UNSUPPORTED` si LocalStorage no está disponible u
   * `OPERATION_FAILED` si la lectura falla por otro motivo.
   * @example
   * ```ts
   * const tema = service.get<string>('tema');
   * ```
   */
  get<T>(key: string): T | null {
    const storage = this.requireStorage();

    let serialized: string | null;

    try {
      serialized = storage.getItem(this.withPrefix(key));
    } catch (error) {
      throw this.toStorageError(error, `No se pudo leer la clave "${key}" de LocalStorage.`);
    }

    if (serialized === null) {
      return null;
    }

    try {
      return JSON.parse(serialized) as T;
    } catch (error) {
      throw this.toStorageError(
        error,
        `No se pudo deserializar el valor de la clave "${key}".`,
        StorageErrorCode.PARSE_ERROR,
      );
    }
  }

  /**
   * Lee un valor, lo transforma con la función indicada y guarda el resultado.
   *
   * @param key Clave que se desea actualizar, sin el prefijo.
   * @param updater Función que recibe el valor actual (o `null` si la clave no
   * existe) y devuelve el nuevo valor.
   * @returns El nuevo valor ya guardado.
   * @throws {StorageError} Si la lectura, la serialización o la escritura
   * fallan. Los errores de la función `updater` se propagan sin modificar.
   * @example
   * ```ts
   * const contador = service.update<number>('contador', (actual) => (actual ?? 0) + 1);
   * ```
   */
  update<T>(key: string, updater: (current: T | null) => T): T {
    const current = this.get<T>(key);
    const next = updater(current);

    this.set(key, next);

    return next;
  }

  /**
   * Indica si una clave existe en LocalStorage.
   *
   * No intenta deserializar el contenido: una clave con JSON corrupto sigue
   * existiendo.
   *
   * @param key Clave que se desea comprobar, sin el prefijo.
   * @returns `true` si la clave existe; `false` en caso contrario.
   * @throws {StorageError} Con código `UNSUPPORTED` si LocalStorage no está
   * disponible u `OPERATION_FAILED` si la comprobación falla por otro motivo.
   * @example
   * ```ts
   * if (service.has('token')) {
   *   // La clave existe.
   * }
   * ```
   */
  has(key: string): boolean {
    const storage = this.requireStorage();

    try {
      return storage.getItem(this.withPrefix(key)) !== null;
    } catch (error) {
      throw this.toStorageError(error, `No se pudo comprobar la clave "${key}" en LocalStorage.`);
    }
  }

  /**
   * Elimina una clave de LocalStorage.
   *
   * No falla si la clave no existe.
   *
   * @param key Clave que se desea eliminar, sin el prefijo.
   * @returns No devuelve ningún valor.
   * @throws {StorageError} Con código `UNSUPPORTED` si LocalStorage no está
   * disponible u `OPERATION_FAILED` si la eliminación falla por otro motivo.
   * @example
   * ```ts
   * service.remove('token');
   * ```
   */
  remove(key: string): void {
    const storage = this.requireStorage();

    try {
      storage.removeItem(this.withPrefix(key));
    } catch (error) {
      throw this.toStorageError(error, `No se pudo eliminar la clave "${key}" de LocalStorage.`);
    }
  }

  /**
   * Elimina todas las claves de LocalStorage que pertenecen al prefijo
   * configurado. Si no hay prefijo, elimina todas las claves.
   *
   * Primero recolecta las claves y después las elimina, porque los índices de
   * LocalStorage cambian a medida que se borran elementos.
   *
   * @returns No devuelve ningún valor.
   * @throws {StorageError} Con código `UNSUPPORTED` si LocalStorage no está
   * disponible u `OPERATION_FAILED` si la limpieza falla por otro motivo.
   * @example
   * ```ts
   * service.clear();
   * ```
   */
  clear(): void {
    const keys = this.keys();

    for (const key of keys) {
      this.remove(key);
    }
  }

  /**
   * Lista las claves de LocalStorage que pertenecen al prefijo configurado.
   *
   * @returns Arreglo con las claves encontradas, sin el prefijo configurado.
   * @throws {StorageError} Con código `UNSUPPORTED` si LocalStorage no está
   * disponible u `OPERATION_FAILED` si el listado falla por otro motivo.
   * @example
   * ```ts
   * const claves = service.keys();
   * ```
   */
  keys(): string[] {
    const storage = this.requireStorage();
    const result: string[] = [];

    try {
      for (let index = 0; index < storage.length; index++) {
        const storageKey = storage.key(index);

        if (storageKey !== null && storageKey.startsWith(this.prefix)) {
          result.push(storageKey.slice(this.prefix.length));
        }
      }
    } catch (error) {
      throw this.toStorageError(error, 'No se pudieron listar las claves de LocalStorage.');
    }

    return result;
  }

  /**
   * Construye la clave física que se usa en LocalStorage.
   *
   * @param key Clave lógica recibida por la API pública.
   * @returns La clave con el prefijo configurado.
   */
  private withPrefix(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Obtiene el almacenamiento inyectado o lanza un error si no está
   * disponible.
   *
   * @returns El objeto `Storage` listo para usarse.
   * @throws {StorageError} Con código `UNSUPPORTED` si el token entrega
   * `null`.
   */
  private requireStorage(): Storage {
    if (!this.storage) {
      throw new StorageError(
        'LocalStorage no está disponible en este entorno.',
        StorageErrorCode.UNSUPPORTED,
      );
    }

    return this.storage;
  }

  /**
   * Traduce un error a {@link StorageError} conservando la causa original.
   *
   * @param error Error original lanzado por el almacenamiento o por JSON.
   * @param message Mensaje descriptivo de la operación fallida.
   * @param code Código que identifica el tipo de fallo. Si se omite, se
   * detecta automáticamente si la cuota está llena.
   * @returns Un {@link StorageError} nuevo o el mismo si `error` ya lo era.
   */
  private toStorageError(
    error: unknown,
    message: string,
    code: StorageErrorCode = StorageErrorCode.OPERATION_FAILED,
  ): StorageError {
    if (error instanceof StorageError) {
      return error;
    }

    if (code === StorageErrorCode.OPERATION_FAILED && this.isQuotaError(error)) {
      return new StorageError(
        `${message} Se superó la cuota de almacenamiento.`,
        StorageErrorCode.QUOTA_EXCEEDED,
        error,
      );
    }

    return new StorageError(message, code, error);
  }

  /**
   * Determina si un error representa una cuota de almacenamiento llena.
   *
   * Reconoce los nombres `QuotaExceededError` y
   * `NS_ERROR_DOM_QUOTA_REACHED`, además de los códigos `22` y `1014`.
   *
   * @param error Error original lanzado por el almacenamiento.
   * @returns `true` si el error corresponde a cuota llena.
   */
  private isQuotaError(error: unknown): boolean {
    if (error === null || typeof error !== 'object') {
      return false;
    }

    const { name, code } = error as { name?: string; code?: number };

    return QUOTA_ERROR_NAMES.has(name as string) || QUOTA_ERROR_CODES.has(code as number);
  }
}
