import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import {
  CacheStorageService,
  StorageError,
  StorageErrorCode,
  type CacheEntryInfo,
} from 'ngx-uceva-storage-manager';

/** Identificador de la operación que está en curso. */
type Action =
  | 'create'
  | 'list'
  | 'has'
  | 'delete-cache'
  | 'put'
  | 'put-json'
  | 'fetch'
  | 'get'
  | 'get-json'
  | 'keys'
  | 'delete';

interface Feedback {
  kind: 'success' | 'error';
  message: string;
  code?: StorageErrorCode;
  cause?: string;
}

interface HasResult {
  name: string;
  exists: boolean;
}

interface GetResult {
  url: string;
  found: boolean;
  status?: number;
  contentType?: string;
  body?: string;
}

interface GetJsonResult {
  url: string;
  value: string | null;
}

/** URL pública con CORS habilitado que se usa como ejemplo de descarga. */
const DEFAULT_FETCH_URL = 'https://jsonplaceholder.typicode.com/todos/1';

@Component({
  imports: [],
  selector: 'app-cache-storage-panel',
  styleUrl: './cache-storage-panel.scss',
  templateUrl: './cache-storage-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CacheStoragePanel {
  protected readonly cacheStorageService = inject(CacheStorageService);

  protected readonly supported = signal(this.cacheStorageService.isSupported());
  protected readonly pending = signal<Action | null>(null);
  protected readonly busy = computed(() => this.pending() !== null);
  protected readonly feedback = signal<Feedback | null>(null);

  protected readonly caches = signal<string[]>([]);
  protected readonly activeCache = signal<string | null>(null);
  protected readonly confirmingDelete = signal<string | null>(null);

  protected readonly newCacheName = signal('');
  protected readonly checkCacheName = signal('');
  protected readonly hasResult = signal<HasResult | null>(null);

  protected readonly putUrl = signal('/demo/saludo.txt');
  protected readonly putBody = signal('Hola desde Cache Storage');
  protected readonly putContentType = signal('text/plain');

  protected readonly jsonUrl = signal('/demo/usuario.json');
  protected readonly jsonBody = signal('{\n  "id": 1,\n  "nombre": "Ana",\n  "activo": true\n}');

  protected readonly fetchUrl = signal(DEFAULT_FETCH_URL);

  protected readonly getUrl = signal('');
  protected readonly getResult = signal<GetResult | null>(null);

  protected readonly getJsonUrl = signal('');
  protected readonly getJsonResult = signal<GetJsonResult | null>(null);

  protected readonly entries = signal<CacheEntryInfo[]>([]);

  constructor() {
    if (this.supported()) {
      void this.run('list', async () => {
        await this.loadCaches();
        return 'Se cargó la lista de cachés.';
      });
    }
  }

  protected setFromInput(target: WritableSignal<string>, event: Event): void {
    target.set((event.target as HTMLInputElement | HTMLTextAreaElement).value);
  }

  // ---------------------------------------------------------------------------
  // Cachés
  // ---------------------------------------------------------------------------

  protected async createCache(event: Event): Promise<void> {
    event.preventDefault();
    const name = this.newCacheName().trim();

    if (!name) {
      this.showInputError('Escribe un nombre para la caché.');
      return;
    }

    await this.run('create', async () => {
      await this.cacheStorageService.createCache(name);
      this.newCacheName.set('');
      await this.loadCaches();
      await this.selectCache(name);
      return `Se creó la caché "${name}" y quedó como caché activa.`;
    });
  }

  protected async refreshCaches(): Promise<void> {
    await this.run('list', async () => {
      await this.loadCaches();
      const count = this.caches().length;

      return count === 0
        ? 'No hay cachés creadas.'
        : `Se listaron ${count} caché${count === 1 ? '' : 's'}.`;
    });
  }

  protected async checkCache(event: Event): Promise<void> {
    event.preventDefault();
    const name = this.checkCacheName().trim();

    if (!name) {
      this.showInputError('Escribe el nombre de la caché que quieres comprobar.');
      return;
    }

    this.hasResult.set(null);

    await this.run('has', async () => {
      const exists = await this.cacheStorageService.hasCache(name);

      this.hasResult.set({ name, exists });
      return `La caché "${name}" ${exists ? 'existe' : 'no existe'}.`;
    });
  }

  protected async activate(name: string): Promise<void> {
    await this.run('keys', async () => {
      await this.selectCache(name);
      return `La caché "${name}" es ahora la caché activa.`;
    });
  }

  protected requestDeleteCache(name: string): void {
    this.confirmingDelete.set(name);
  }

  protected cancelDeleteCache(): void {
    this.confirmingDelete.set(null);
  }

  protected async confirmDeleteCache(name: string): Promise<void> {
    this.confirmingDelete.set(null);

    await this.run('delete-cache', async () => {
      const deleted = await this.cacheStorageService.deleteCache(name);

      if (this.activeCache() === name) {
        this.clearActiveCache();
      }

      this.hasResult.set(null);
      await this.loadCaches();

      return deleted
        ? `Se eliminó la caché "${name}".`
        : `La caché "${name}" no existía, no se eliminó nada.`;
    });
  }

  // ---------------------------------------------------------------------------
  // Guardar recursos
  // ---------------------------------------------------------------------------

  protected async put(event: Event): Promise<void> {
    event.preventDefault();
    const cacheName = this.activeCache();
    const url = this.putUrl().trim();

    if (!cacheName || !this.requireUrl(url)) {
      return;
    }

    const contentType = this.putContentType().trim();
    const headers: HeadersInit = contentType ? { 'Content-Type': contentType } : {};

    await this.run('put', async () => {
      await this.cacheStorageService.put(cacheName, url, new Response(this.putBody(), { headers }));
      await this.loadEntries(cacheName);
      return `Se guardó "${url}" en la caché "${cacheName}" con put().`;
    });
  }

  protected async putJson(event: Event): Promise<void> {
    event.preventDefault();
    const cacheName = this.activeCache();
    const url = this.jsonUrl().trim();

    if (!cacheName || !this.requireUrl(url)) {
      return;
    }

    let data: unknown;

    try {
      data = JSON.parse(this.jsonBody());
    } catch (error) {
      this.showInputError(
        `El JSON ingresado no es válido: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }

    await this.run('put-json', async () => {
      await this.cacheStorageService.putJson(cacheName, url, data);
      await this.loadEntries(cacheName);
      return `Se guardó el JSON de "${url}" en la caché "${cacheName}" con putJson().`;
    });
  }

  protected async fetchAndStore(event: Event): Promise<void> {
    event.preventDefault();
    const cacheName = this.activeCache();
    const url = this.fetchUrl().trim();

    if (!cacheName || !this.requireUrl(url)) {
      return;
    }

    await this.run('fetch', async () => {
      await this.cacheStorageService.fetchAndStore(cacheName, url);
      await this.loadEntries(cacheName);
      return `Se descargó "${url}" y se guardó en la caché "${cacheName}".`;
    });
  }

  // ---------------------------------------------------------------------------
  // Consultar
  // ---------------------------------------------------------------------------

  protected async get(event?: Event): Promise<void> {
    event?.preventDefault();
    const cacheName = this.activeCache();
    const url = this.getUrl().trim();

    if (!cacheName || !this.requireUrl(url)) {
      return;
    }

    this.getResult.set(null);

    await this.run('get', async () => {
      const response = await this.cacheStorageService.get(cacheName, url);

      if (!response) {
        this.getResult.set({ url, found: false });
        return `No se encontró "${url}" en la caché "${cacheName}".`;
      }

      this.getResult.set({
        url,
        found: true,
        status: response.status,
        contentType: response.headers.get('Content-Type') ?? '(sin Content-Type)',
        body: await response.text(),
      });
      return `Se consultó "${url}" con get().`;
    });
  }

  protected async getJson(event: Event): Promise<void> {
    event.preventDefault();
    const cacheName = this.activeCache();
    const url = this.getJsonUrl().trim();

    if (!cacheName || !this.requireUrl(url)) {
      return;
    }

    this.getJsonResult.set(null);

    await this.run('get-json', async () => {
      const value = await this.cacheStorageService.getJson<unknown>(cacheName, url);

      if (value === null) {
        this.getJsonResult.set({ url, value: null });
        return `getJson() devolvió null para "${url}".`;
      }

      this.getJsonResult.set({ url, value: JSON.stringify(value, null, 2) });
      return `Se consultó y parseó el JSON de "${url}" con getJson().`;
    });
  }

  // ---------------------------------------------------------------------------
  // Recursos de la caché activa
  // ---------------------------------------------------------------------------

  protected async refreshEntries(): Promise<void> {
    const cacheName = this.activeCache();

    if (!cacheName) {
      return;
    }

    await this.run('keys', async () => {
      await this.loadEntries(cacheName);
      const count = this.entries().length;

      return `La caché "${cacheName}" tiene ${count} recurso${count === 1 ? '' : 's'}.`;
    });
  }

  protected async inspectEntry(entry: CacheEntryInfo): Promise<void> {
    this.getUrl.set(entry.url);
    await this.get();
  }

  protected async deleteEntry(entry: CacheEntryInfo): Promise<void> {
    const cacheName = this.activeCache();

    if (!cacheName) {
      return;
    }

    await this.run('delete', async () => {
      const deleted = await this.cacheStorageService.delete(cacheName, entry.url);

      await this.loadEntries(cacheName);
      return deleted
        ? `Se eliminó "${entry.url}" de la caché "${cacheName}".`
        : `El recurso "${entry.url}" no existía en la caché "${cacheName}".`;
    });
  }

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------

  /**
   * Ejecuta una operación asíncrona marcándola como pendiente para evitar
   * dobles clics, y muestra su resultado o su error.
   */
  private async run(action: Action, task: () => Promise<string>): Promise<void> {
    if (this.pending() !== null) {
      return;
    }

    this.pending.set(action);

    try {
      this.showSuccess(await task());
    } catch (error) {
      this.showError(error);
    } finally {
      this.pending.set(null);
    }
  }

  private async loadCaches(): Promise<void> {
    this.caches.set(await this.cacheStorageService.listCaches());

    const active = this.activeCache();

    if (active && !this.caches().includes(active)) {
      this.clearActiveCache();
    }
  }

  private async selectCache(name: string): Promise<void> {
    this.activeCache.set(name);
    this.getResult.set(null);
    this.getJsonResult.set(null);
    await this.loadEntries(name);
  }

  private clearActiveCache(): void {
    this.activeCache.set(null);
    this.entries.set([]);
    this.getResult.set(null);
    this.getJsonResult.set(null);
  }

  private async loadEntries(cacheName: string): Promise<void> {
    this.entries.set(await this.cacheStorageService.keys(cacheName));
  }

  private requireUrl(url: string): boolean {
    if (!url) {
      this.showInputError('La URL es obligatoria.');
      return false;
    }

    return true;
  }

  private showSuccess(message: string): void {
    this.feedback.set({ kind: 'success', message });
  }

  private showInputError(message: string): void {
    this.feedback.set({ kind: 'error', message });
  }

  private showError(error: unknown): void {
    if (error instanceof StorageError) {
      this.feedback.set({
        kind: 'error',
        message: error.message,
        code: error.code,
        cause: error.cause === undefined ? undefined : this.describeCause(error.cause),
      });
      return;
    }

    this.feedback.set({
      kind: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  private describeCause(cause: unknown): string {
    if (cause instanceof Error) {
      return `${cause.name}: ${cause.message}`;
    }

    return String(cause);
  }
}
