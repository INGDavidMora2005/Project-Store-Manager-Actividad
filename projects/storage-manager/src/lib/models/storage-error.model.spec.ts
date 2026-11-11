import { StorageError, StorageErrorCode } from './storage-error.model';

describe('StorageError', () => {
  it('debe crear un error con nombre, mensaje y código', () => {
    const error = new StorageError('No se pudo guardar', StorageErrorCode.OPERATION_FAILED);

    expect(error).toBeInstanceOf(StorageError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('StorageError');
    expect(error.message).toBe('No se pudo guardar');
    expect(error.code).toBe(StorageErrorCode.OPERATION_FAILED);
    expect(error.cause).toBeUndefined();
  });

  it('debe conservar la causa original', () => {
    const cause = new Error('Origen del fallo');
    const error = new StorageError('Cuota excedida', StorageErrorCode.QUOTA_EXCEEDED, cause);

    expect(error.cause).toBe(cause);
    expect(error.code).toBe(StorageErrorCode.QUOTA_EXCEEDED);
  });

  it('debe exponer todos los códigos de error', () => {
    expect(Object.values(StorageErrorCode)).toEqual([
      StorageErrorCode.UNSUPPORTED,
      StorageErrorCode.QUOTA_EXCEEDED,
      StorageErrorCode.SERIALIZATION_ERROR,
      StorageErrorCode.PARSE_ERROR,
      StorageErrorCode.NOT_FOUND,
      StorageErrorCode.OPERATION_FAILED,
    ]);
  });
});
