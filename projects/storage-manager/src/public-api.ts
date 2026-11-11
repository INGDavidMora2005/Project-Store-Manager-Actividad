/*
 * Public API Surface of ngx-uceva-storage-manager
 */

export { LocalStorageService } from './lib/local-storage/local-storage.service';
export { CacheStorageService } from './lib/cache-storage/cache-storage.service';
export { StorageError, StorageErrorCode } from './lib/models/storage-error.model';
export { STORAGE_MANAGER_CONFIG } from './lib/models/storage-config.model';
export type { StorageConfig } from './lib/models/storage-config.model';
export type { CacheEntryInfo } from './lib/models/cache-entry.model';
