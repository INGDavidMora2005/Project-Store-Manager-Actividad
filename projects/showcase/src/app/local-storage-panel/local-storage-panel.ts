import { Component, inject } from '@angular/core';
import { LocalStorageService } from 'ngx-uceva-storage-manager';

@Component({
  imports: [],
  selector: 'app-local-storage-panel',
  styleUrl: './local-storage-panel.scss',
  templateUrl: './local-storage-panel.html',
})
export class LocalStoragePanel {
  protected readonly localStorageService = inject(LocalStorageService);
}
