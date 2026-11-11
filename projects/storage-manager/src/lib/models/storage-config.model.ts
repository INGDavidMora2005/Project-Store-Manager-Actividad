import { InjectionToken } from '@angular/core';

/**
 * Configuración global de la librería Storage Manager.
 */
export interface StorageConfig {
  /**
   * Prefijo que se antepondrá a todas las claves de LocalStorage.
   *
   * Si se omite o se usa una cadena vacía, se trabajará con las claves tal
   * como las recibe la API.
   */
  prefix?: string;
}

/**
 * Token de inyección para proporcionar la configuración de la librería.
 *
 * Por defecto entrega un prefijo vacío. Los consumidores pueden
 * sobrescribirlo mediante los `providers` de su aplicación.
 *
 * @example
 * ```ts
 * providers: [
 *   { provide: STORAGE_MANAGER_CONFIG, useValue: { prefix: 'mi-app:' } },
 * ]
 * ```
 */
export const STORAGE_MANAGER_CONFIG = new InjectionToken<StorageConfig>('STORAGE_MANAGER_CONFIG', {
  providedIn: 'root',
  factory: () => ({ prefix: '' }),
});
