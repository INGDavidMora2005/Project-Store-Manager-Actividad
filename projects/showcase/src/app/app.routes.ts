import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Inicio | Storage Manager Showcase',
    loadComponent: () => import('./pages/home/home').then((module) => module.HomePage),
  },
  {
    path: 'local-storage',
    title: 'LocalStorage | Storage Manager Showcase',
    loadComponent: () =>
      import('./local-storage-panel/local-storage-panel').then(
        (module) => module.LocalStoragePanel,
      ),
  },
  {
    path: 'cache-storage',
    title: 'Cache Storage | Storage Manager Showcase',
    loadComponent: () =>
      import('./cache-storage-panel/cache-storage-panel').then(
        (module) => module.CacheStoragePanel,
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
