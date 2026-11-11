import { Component, inject } from '@angular/core';
import { CacheStorageService } from 'ngx-uceva-storage-manager';

@Component({
  imports: [],
  selector: 'app-cache-storage-panel',
  styleUrl: './cache-storage-panel.scss',
  templateUrl: './cache-storage-panel.html',
})
export class CacheStoragePanel {
  protected readonly cacheStorageService = inject(CacheStorageService);
}
