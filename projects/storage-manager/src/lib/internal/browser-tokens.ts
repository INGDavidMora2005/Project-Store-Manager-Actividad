import { InjectionToken } from '@angular/core';

/**
 * Token interno que expone el objeto `window.localStorage` cuando está
 * disponible.
 *
 * El acceso se realiza dentro de un bloque `try`/`catch` porque algunos
 * navegadores lanzan `SecurityError` al consultar `localStorage` (por
 * ejemplo, cuando las cookies están bloqueadas). Si el almacenamiento no
 * existe o el acceso falla, el token entrega `null`.
 *
 * Este token no forma parte de la API pública de la librería.
 *
 * @internal
 */
export const LOCAL_STORAGE_TOKEN = new InjectionToken<Storage | null>('LOCAL_STORAGE_TOKEN', {
  providedIn: 'root',
  factory: () => {
    try {
      return window.localStorage ?? null;
    } catch {
      return null;
    }
  },
});

/**
 * Token interno que expone el objeto `globalThis.caches` cuando está
 * disponible.
 *
 * Si `CacheStorage` no existe o el acceso falla, el token entrega `null`.
 *
 * Este token no forma parte de la API pública de la librería.
 *
 * @internal
 */
export const CACHE_STORAGE_TOKEN = new InjectionToken<CacheStorage | null>('CACHE_STORAGE_TOKEN', {
  providedIn: 'root',
  factory: () => {
    try {
      return globalThis.caches ?? null;
    } catch {
      return null;
    }
  },
});
