/**
 * Información descriptiva de un recurso almacenado en una caché.
 */
export interface CacheEntryInfo {
  /** URL del recurso almacenado. */
  url: string;

  /** Método HTTP con el que se guardó el recurso. */
  method: string;
}
