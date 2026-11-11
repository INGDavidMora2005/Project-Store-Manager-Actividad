import { Component } from '@angular/core';
import { CacheStoragePanel } from './cache-storage-panel/cache-storage-panel';
import { LocalStoragePanel } from './local-storage-panel/local-storage-panel';

@Component({
  imports: [LocalStoragePanel, CacheStoragePanel],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
