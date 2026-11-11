import { Injectable, inject } from '@angular/core';
import { CACHE_STORAGE_TOKEN } from '../internal/browser-tokens';
import { CacheEntryInfo } from '../models/cache-entry.model';
import { StorageError, StorageErrorCode } from '../models/storage-error.model';

/**
 * Servicio asíncrono para gestionar Cache Storage mediante una API tipada
 * basada en Promises.
 *
 * Las operaciones de escritura (`put`, `putJson` y `fetchAndStore`) crean la
 * caché de destino si todavía no existe. Las operaciones de lectura y
 * eliminación (`get`, `getJson`, `keys` y `delete`) nunca crean cachés: si la
 * caché no existe, devuelven un resultado vacío.
 *
 * El acceso a Cache Storage se realiza a través de un token interno de
 * inyección, nunca directamente sobre `window` o `caches`. Todos los errores
 * se traducen a {@link StorageError}.
 *
 * @example
 * ```ts
 * private readonly cache = inject(CacheStorageService);
 *
 * await this.cache.putJson('api-v1', 'https://api.ejemplo.com/usuarios', usuarios);
 * const guardados = await this.cache.getJson<Usuario[]>('api-v1', 'https://api.ejemplo.com/usuarios');
 * ```
 */
@Injectable({ providedIn: 'root' })
export class CacheStorageService {
  private readonly storage = inject(CACHE_STORAGE_TOKEN);

  /**
   * Indica si el entorno ofrece soporte para Cache Storage.
   *
   * @returns `true` si `CacheStorage` está disponible; `false` en caso
   * contrario.
   * @example
   * ```ts
   * if (service.isSupported()) {
   *   await service.createCache('recursos');
   * }
   * ```
   */
  isSupported(): boolean {
    return this.storage !== null;
  }

  /**
   * Crea (o abre, si ya existe) una caché con el nombre indicado.
   *
   * @param name Nombre de la caché.
   * @returns Una promesa que se resuelve cuando la caché está creada.
   * @throws {StorageError} Con código `UNSUPPORTED` si Cache Storage no está
   * disponible, `QUOTA_EXCEEDED` si la cuota está llena u `OPERATION_FAILED`
   * si la operación falla por otro motivo.
   * @example
   * ```ts
   * await service.createCache('recursos');
   * ```
   */
  async createCache(name: string): Promise<void> {
    await this.run(`No se pudo crear la caché "${name}".`, async (storage) => {
      await storage.open(name);
    });
  }

  /**
   * Lista los nombres de todas las cachés existentes.
   *
   * @returns Una promesa con los nombres de las cachés.
   * @throws {StorageError} Con código `UNSUPPORTED` si Cache Storage no está
   * disponible u `OPERATION_FAILED` si la operación falla.
   * @example
   * ```ts
   * const nombres = await service.listCaches();
   * ```
   */
  async listCaches(): Promise<string[]> {
    return this.run('No se pudieron listar las cachés.', (storage) => storage.keys());
  }

  /**
   * Indica si una caché existe.
   *
   * @param name Nombre de la caché que se desea comprobar.
   * @returns Una promesa que resuelve `true` si la caché existe.
   * @throws {StorageError} Con código `UNSUPPORTED` si Cache Storage no está
   * disponible u `OPERATION_FAILED` si la operación falla.
   * @example
   * ```ts
   * const existe = await service.hasCache('recursos');
   * ```
   */
  async hasCache(name: string): Promise<boolean> {
    return this.run(`No se pudo comprobar la caché "${name}".`, (storage) => storage.has(name));
  }

  /**
   * Guarda una respuesta asociada a un recurso en una caché. Si la caché no
   * existe, se crea.
   *
   * @param cacheName Nombre de la caché de destino.
   * @param request URL o petición que identifica el recurso.
   * @param response Respuesta que se desea almacenar.
   * @returns Una promesa que se resuelve cuando el recurso está guardado.
   * @throws {StorageError} Con código `UNSUPPORTED` si Cache Storage no está
   * disponible, `QUOTA_EXCEEDED` si la cuota está llena u `OPERATION_FAILED`
   * si el almacenamiento falla por otro motivo.
   * @example
   * ```ts
   * await service.put('recursos', '/logo.svg', new Response(svg));
   * ```
   */
  async put(cacheName: string, request: string | Request, response: Response): Promise<void> {
    await this.run(
      `No se pudo guardar "${this.describe(request)}" en la caché "${cacheName}".`,
      async (storage) => {
        const cache = await storage.open(cacheName);
        await cache.put(request, response);
      },
    );
  }

  /**
   * Guarda un valor como respuesta JSON (`Content-Type: application/json`)
   * asociada a una URL. Si la caché no existe, se crea.
   *
   * @param cacheName Nombre de la caché de destino.
   * @param url URL que identifica el recurso.
   * @param data Valor que se serializará como JSON (objeto, arreglo o
   * primitivo).
   * @returns Una promesa que se resuelve cuando el recurso está guardado.
   * @throws {StorageError} Con código `SERIALIZATION_ERROR` si el valor no se
   * puede serializar, `UNSUPPORTED` si Cache Storage no está disponible,
   * `QUOTA_EXCEEDED` si la cuota está llena u `OPERATION_FAILED` si el
   * almacenamiento falla por otro motivo.
   * @example
   * ```ts
   * await service.putJson('api-v1', 'https://api.ejemplo.com/config', { tema: 'oscuro' });
   * ```
   */
  async putJson<T>(cacheName: string, url: string, data: T): Promise<void> {
    this.requireStorage();

    let body: string | undefined;

    try {
      body = JSON.stringify(data);
    } catch (error) {
      throw this.toStorageError(
        error,
        `No se pudo serializar el valor para "${url}".`,
        StorageErrorCode.SERIALIZATION_ERROR,
      );
    }

    if (body === undefined) {
      throw new StorageError(
        `No se pudo serializar el valor para "${url}": JSON.stringify devolvió undefined.`,
        StorageErrorCode.SERIALIZATION_ERROR,
      );
    }

    const response = new Response(body, {
      headers: { 'Content-Type': 'application/json' },
    });

    await this.put(cacheName, url, response);
  }

  /**
   * Descarga un recurso con `fetch` y lo guarda en una caché. Si la caché no
   * existe, se crea.
   *
   * @param cacheName Nombre de la caché de destino.
   * @param url URL del recurso que se desea descargar.
   * @returns Una promesa que se resuelve cuando el recurso está guardado.
   * @throws {StorageError} Con código `OPERATION_FAILED` si la descarga falla
   * o la respuesta no es exitosa (el mensaje incluye el estado HTTP),
   * `UNSUPPORTED` si Cache Storage no está disponible o `QUOTA_EXCEEDED` si la
   * cuota está llena.
   * @example
   * ```ts
   * await service.fetchAndStore('recursos', 'https://api.ejemplo.com/productos');
   * ```
   */
  async fetchAndStore(cacheName: string, url: string): Promise<void> {
    this.requireStorage();

    let response: Response;

    try {
      response = await globalThis.fetch(url);
    } catch (error) {
      throw new StorageError(
        `No se pudo descargar "${url}".`,
        StorageErrorCode.OPERATION_FAILED,
        error,
      );
    }

    if (!response.ok) {
      throw new StorageError(
        `No se pudo descargar "${url}": la respuesta tiene estado ${response.status}.`,
        StorageErrorCode.OPERATION_FAILED,
      );
    }

    await this.put(cacheName, url, response);
  }

  /**
   * Recupera un recurso almacenado en una caché.
   *
   * @param cacheName Nombre de la caché que se desea consultar.
   * @param request URL o petición que identifica el recurso.
   * @returns Una promesa con la respuesta encontrada o `undefined` si el
   * recurso o la caché no existen.
   * @throws {StorageError} Con código `UNSUPPORTED` si Cache Storage no está
   * disponible u `OPERATION_FAILED` si la lectura falla.
   * @example
   * ```ts
   * const respuesta = await service.get('recursos', '/logo.svg');
   * ```
   */
  async get(cacheName: string, request: string | Request): Promise<Response | undefined> {
    return this.run(
      `No se pudo leer "${this.describe(request)}" de la caché "${cacheName}".`,
      async (storage) => {
        if (!(await storage.has(cacheName))) {
          return undefined;
        }

        const cache = await storage.open(cacheName);

        return cache.match(request);
      },
    );
  }

  /**
   * Recupera y deserializa un recurso JSON almacenado en una caché.
   *
   * @param cacheName Nombre de la caché que se desea consultar.
   * @param url URL que identifica el recurso.
   * @returns Una promesa con el valor deserializado o `null` si el recurso o
   * la caché no existen.
   * @throws {StorageError} Con código `PARSE_ERROR` si el cuerpo no es JSON
   * válido, `UNSUPPORTED` si Cache Storage no está disponible u
   * `OPERATION_FAILED` si la lectura falla.
   * @example
   * ```ts
   * const config = await service.getJson<{ tema: string }>('api-v1', 'https://api.ejemplo.com/config');
   * ```
   */
  async getJson<T>(cacheName: string, url: string): Promise<T | null> {
    const response = await this.get(cacheName, url);

    if (response === undefined) {
      return null;
    }

    let body: string;

    try {
      body = await response.text();
    } catch (error) {
      throw this.toStorageError(error, `No se pudo leer el cuerpo de "${url}".`);
    }

    try {
      return JSON.parse(body) as T;
    } catch (error) {
      throw this.toStorageError(
        error,
        `El contenido de "${url}" no es un JSON válido.`,
        StorageErrorCode.PARSE_ERROR,
      );
    }
  }

  /**
   * Lista los recursos almacenados en una caché.
   *
   * @param cacheName Nombre de la caché que se desea inspeccionar.
   * @returns Una promesa con la URL y el método de cada recurso, o un arreglo
   * vacío si la caché no existe.
   * @throws {StorageError} Con código `UNSUPPORTED` si Cache Storage no está
   * disponible u `OPERATION_FAILED` si la operación falla.
   * @example
   * ```ts
   * const recursos = await service.keys('recursos');
   * // [{ url: 'https://ejemplo.com/logo.svg', method: 'GET' }]
   * ```
   */
  async keys(cacheName: string): Promise<CacheEntryInfo[]> {
    return this.run(
      `No se pudieron listar los recursos de la caché "${cacheName}".`,
      async (storage) => {
        if (!(await storage.has(cacheName))) {
          return [];
        }

        const cache = await storage.open(cacheName);
        const requests = await cache.keys();

        return requests.map(({ url, method }) => ({ url, method }));
      },
    );
  }

  /**
   * Elimina un recurso de una caché.
   *
   * @param cacheName Nombre de la caché.
   * @param request URL o petición que identifica el recurso.
   * @returns Una promesa que resuelve `true` si el recurso fue eliminado, o
   * `false` si el recurso o la caché no existen.
   * @throws {StorageError} Con código `UNSUPPORTED` si Cache Storage no está
   * disponible u `OPERATION_FAILED` si la eliminación falla.
   * @example
   * ```ts
   * const eliminado = await service.delete('recursos', '/logo.svg');
   * ```
   */
  async delete(cacheName: string, request: string | Request): Promise<boolean> {
    return this.run(
      `No se pudo eliminar "${this.describe(request)}" de la caché "${cacheName}".`,
      async (storage) => {
        if (!(await storage.has(cacheName))) {
          return false;
        }

        const cache = await storage.open(cacheName);

        return cache.delete(request);
      },
    );
  }

  /**
   * Elimina una caché completa.
   *
   * @param name Nombre de la caché que se desea eliminar.
   * @returns Una promesa que resuelve `true` si la caché fue eliminada, o
   * `false` si no existía.
   * @throws {StorageError} Con código `UNSUPPORTED` si Cache Storage no está
   * disponible u `OPERATION_FAILED` si la eliminación falla.
   * @example
   * ```ts
   * const eliminada = await service.deleteCache('recursos');
   * ```
   */
  async deleteCache(name: string): Promise<boolean> {
    return this.run(`No se pudo eliminar la caché "${name}".`, (storage) =>
      storage.delete(name),
    );
  }

  /**
   * Ejecuta una operación sobre Cache Storage y traduce cualquier fallo a
   * {@link StorageError}.
   *
   * @param message Mensaje descriptivo usado si la operación falla.
   * @param operation Operación que recibe el `CacheStorage` disponible.
   * @returns El resultado de la operación.
   * @throws {StorageError} Con el código correspondiente al fallo.
   */
  private async run<R>(
    message: string,
    operation: (storage: CacheStorage) => Promise<R>,
  ): Promise<R> {
    const storage = this.requireStorage();

    try {
      return await operation(storage);
    } catch (error) {
      throw this.toStorageError(error, message);
    }
  }

  /**
   * Obtiene el `CacheStorage` inyectado o lanza un error si no está
   * disponible.
   *
   * @returns El objeto `CacheStorage` listo para usarse.
   * @throws {StorageError} Con código `UNSUPPORTED` si el token entrega
   * `null`.
   */
  private requireStorage(): CacheStorage {
    if (this.storage === null) {
      throw new StorageError(
        'Cache Storage no está disponible en este entorno.',
        StorageErrorCode.UNSUPPORTED,
      );
    }

    return this.storage;
  }

  /**
   * Obtiene una descripción legible de un recurso para los mensajes de error.
   *
   * @param request URL o petición que identifica el recurso.
   * @returns La URL del recurso.
   */
  private describe(request: string | Request): string {
    return typeof request === 'string' ? request : request.url;
  }

  /**
   * Traduce un error a {@link StorageError} conservando la causa original.
   *
   * @param error Error original lanzado por Cache Storage, `fetch` o JSON.
   * @param message Mensaje descriptivo de la operación fallida.
   * @param code Código que identifica el tipo de fallo. Si es
   * `OPERATION_FAILED`, se detecta automáticamente si la cuota está llena.
   * @returns Un {@link StorageError} nuevo, o el mismo si `error` ya lo era.
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
   * @param error Error original.
   * @returns `true` si el error tiene el nombre `QuotaExceededError`.
   */
  private isQuotaError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { name?: unknown }).name === 'QuotaExceededError'
    );
  }
}
