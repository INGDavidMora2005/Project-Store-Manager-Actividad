/**
 * Códigos que identifican la causa de un error producido por la librería.
 *
 * Cada código permite a los consumidores distinguir el tipo de fallo y
 * reaccionar de forma adecuada sin depender del mensaje de error.
 */
export enum StorageErrorCode {
  /** El entorno no ofrece soporte para el almacenamiento solicitado. */
  UNSUPPORTED = 'UNSUPPORTED',

  /** Se superó la cuota de almacenamiento disponible. */
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  /** No fue posible serializar el valor antes de guardarlo. */
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',

  /** El contenido almacenado no es un JSON válido. */
  PARSE_ERROR = 'PARSE_ERROR',

  /** La clave o el recurso solicitado no existe. */
  NOT_FOUND = 'NOT_FOUND',

  /** Ocurrió un fallo no clasificado durante la operación. */
  OPERATION_FAILED = 'OPERATION_FAILED',
}

/**
 * Error propio de la librería Storage Manager.
 *
 * Extiende de {@link Error} e incorpora un {@link StorageErrorCode} para que
 * los consumidores puedan identificar la causa del fallo. La causa original
 * (por ejemplo, una `DOMException`) se conserva en la propiedad `cause`.
 *
 * @example
 * ```ts
 * try {
 *   service.set('clave', valor);
 * } catch (error) {
 *   if (error instanceof StorageError && error.code === StorageErrorCode.QUOTA_EXCEEDED) {
 *     // Gestionar la cuota llena.
 *   }
 * }
 * ```
 */
export class StorageError extends Error {
  /** Código que identifica el tipo de fallo. */
  readonly code: StorageErrorCode;

  /** Causa original del error, si está disponible. */
  override readonly cause?: unknown;

  /**
   * Crea una nueva instancia de {@link StorageError}.
   *
   * @param message Mensaje descriptivo del error.
   * @param code Código que identifica el tipo de fallo.
   * @param cause Causa original del error, si existe.
   */
  constructor(message: string, code: StorageErrorCode, cause?: unknown) {
    super(message);

    // Restaura el prototipo para que `instanceof StorageError` funcione al
    // compilar a ES2022 o superior.
    Object.setPrototypeOf(this, StorageError.prototype);

    this.name = 'StorageError';
    this.code = code;
    this.cause = cause;
  }
}
