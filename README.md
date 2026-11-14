# ngx-uceva-storage-manager

[![CI/CD](https://github.com/INGDavidMora2005/Project-Store-Manager-Actividad/actions/workflows/deploy.yml/badge.svg)](https://github.com/INGDavidMora2005/Project-Store-Manager-Actividad/actions/workflows/deploy.yml)

Demo del Showcase desplegada: [https://ingdavidmora2005.github.io/Project-Store-Manager-Actividad/](https://ingdavidmora2005.github.io/Project-Store-Manager-Actividad/)

Workspace de Angular que contiene la librería `ngx-uceva-storage-manager` y una aplicación de demostración (Showcase). La librería ofrece una API tipada para gestionar `LocalStorage` y `Cache Storage` con claves prefijadas y errores identificables.

Paquete publicado en NPM: [ngx-uceva-storage-manager](https://www.npmjs.com/package/ngx-uceva-storage-manager).

## Descripción del proyecto

El repositorio agrupa dos proyectos:

- Una librería publicable que abstrae el almacenamiento del navegador.
- Una aplicación Angular que muestra el uso de los servicios de la librería.

La librería está pensada para aplicaciones Angular que necesitan persistir datos de forma sencilla y trabajar con cachés de recursos sin depender directamente de las APIs del navegador.

## Estructura del workspace

```text
projects/
  storage-manager/   Librería ngx-uceva-storage-manager
  showcase/          Aplicación Angular de demostración
```

- `projects/storage-manager`: código de la librería, modelos, servicios y API pública.
- `projects/showcase`: aplicación que consume la librería publicada en NPM y muestra sus operaciones.

## Requisitos

- Angular `^22.2.0`.
- Node.js y npm en versiones compatibles con Angular 22.
- Un navegador con soporte para `LocalStorage`.
- Un contexto seguro (HTTPS o `localhost`) para usar `Cache Storage`.

## Instalación de dependencias

Desde la raíz del repositorio:

```bash
npm install
```

## Scripts disponibles

| Script | Comando | Descripción |
|---|---|---|
| `build:lib` | `ng build storage-manager` | Compila la librería en `dist/storage-manager` para desarrollo local. |
| `test` | `ng test storage-manager --watch=false` | Ejecuta las 111 pruebas unitarias de la librería una vez. |
| `test:coverage` | `ng test storage-manager --watch=false --coverage` | Ejecuta las pruebas y genera el reporte de cobertura. |
| `docs` | `compodoc -p projects/storage-manager/tsconfig.doc.json -d documentation --name "ngx-uceva-storage-manager" --disablePrivate --disableProtected --disableInternal --disableDependencies` | Genera la documentación técnica en `documentation/`. |
| `docs:serve` | `compodoc -p projects/storage-manager/tsconfig.doc.json -d documentation --name "ngx-uceva-storage-manager" --disablePrivate --disableProtected --disableInternal --disableDependencies -s` | Genera la documentación y la sirve localmente. |
| `docs:coverage` | `compodoc -p projects/storage-manager/tsconfig.doc.json -d documentation --name "ngx-uceva-storage-manager" --disablePrivate --disableProtected --disableInternal --disableDependencies --coverageTest 100 --silent` | Verifica que la API pública esté documentada al 100 %. |
| `start:showcase` | `ng serve showcase` | Levanta el Showcase usando la librería instalada desde NPM. |
| `build:showcase` | `ng build showcase` | Compila el Showcase para producción. |

## Ejecutar el Showcase

```bash
npm run start:showcase
```

El Showcase consume la librería publicada en NPM (`ngx-uceva-storage-manager@^1.0.0`), que se instala con `npm install`. El comando inicia el servidor de desarrollo del Showcase sin compilar la librería localmente. Abre `http://localhost:4200/` en el navegador.

Para generar únicamente la compilación de producción del Showcase:

```bash
npm run build:showcase
```

El Showcase resuelve la librería desde `node_modules`, por lo que no necesita que exista `dist/storage-manager`. `npm run build:lib` sigue disponible para compilar y desarrollar la librería en `dist/storage-manager`; el Showcase no consume esa carpeta, sino la versión instalada desde NPM.

## Despliegue (CI/CD)

El Showcase se publica en GitHub Pages: [https://ingdavidmora2005.github.io/Project-Store-Manager-Actividad/](https://ingdavidmora2005.github.io/Project-Store-Manager-Actividad/). GitHub Pages sirve por HTTPS, por lo que `Cache Storage` dispone de un contexto seguro en la demo.

El workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) se ejecuta en cada `push` y `pull_request` sobre `main` y también de forma manual (`workflow_dispatch`). Tiene tres jobs:

- **Pruebas y compilación**: instala con `npm ci`, ejecuta las 111 pruebas unitarias de la librería (`npm test`), compila la librería (`npm run build:lib`, solo como validación, sin publicar en NPM) y compila el Showcase con `--base-href /Project-Store-Manager-Actividad/`. Después copia `index.html` a `404.html` y valida que existan ambos archivos y el base href. El artefacto de Pages solo se prepara en `push` o ejecución manual sobre `main`, nunca en pull requests.
- **Desplegar en GitHub Pages**: publica el artefacto con `actions/deploy-pages` en el entorno `github-pages`.
- **Verificar despliegue**: consulta la URL base con barra final y exige HTTP 200 y el marcador `<app-root`; comprueba que el bundle principal responda 200 y que una ruta profunda real (`/local-storage`) contenga `<app-root`. El resultado se escribe en el resumen de la ejecución.

### Estrategia de enrutamiento

El Showcase usa `PathLocationStrategy`, el comportamiento por defecto de Angular (`provideRouter(routes)` sin `useHash`). GitHub Pages solo sirve archivos estáticos, así que una ruta profunda como `/local-storage` responde HTTP 404 aunque el cuerpo sea el `404.html`. Por eso el pipeline copia `index.html` a `404.html`: la aplicación carga correctamente en esas rutas, pero la respuesta HTTP sigue siendo 404 por el diseño de GitHub Pages. La alternativa para evitarlo sería usar `HashLocationStrategy` (`useHash`).

### Configuración manual de Pages

En el repositorio, una única vez: **Settings → Pages → Source = GitHub Actions**.

## Uso rápido

### LocalStorageService

```ts
import { Component, inject } from '@angular/core';
import { LocalStorageService } from 'ngx-uceva-storage-manager';

@Component({
  selector: 'app-ejemplo-local',
  standalone: true,
  template: '<button (click)="guardar()">Guardar</button>',
})
export class EjemploLocalComponent {
  private readonly storage = inject(LocalStorageService);

  guardar(): void {
    this.storage.set('usuario', { id: 1, nombre: 'Ana' });

    const usuario = this.storage.get<{ id: number; nombre: string }>('usuario');
    console.log(usuario);
  }
}
```

### CacheStorageService

```ts
import { Component, inject } from '@angular/core';
import { CacheStorageService } from 'ngx-uceva-storage-manager';

@Component({
  selector: 'app-ejemplo-cache',
  standalone: true,
  template: '<button (click)="cargar()">Cargar</button>',
})
export class EjemploCacheComponent {
  private readonly cache = inject(CacheStorageService);

  async cargar(): Promise<void> {
    await this.cache.createCache('api');
    await this.cache.putJson('api', '/usuarios/1', { id: 1, nombre: 'Ana' });

    const usuario = await this.cache.getJson<{ id: number; nombre: string }>(
      'api',
      '/usuarios/1',
    );

    console.log(usuario);
  }
}
```

Las operaciones de escritura (`put`, `putJson` y `fetchAndStore`) crean la caché si no existe; las de lectura y eliminación (`get`, `getJson`, `keys` y `delete`) no la crean. `get` devuelve `undefined` y `getJson` devuelve `null` cuando la caché o el recurso no existen. `getJson` tampoco distingue un recurso inexistente de un JSON guardado con valor `null`; para diferenciarlos usa `get` o `keys`. Los nombres de caché no llevan el prefijo de `STORAGE_MANAGER_CONFIG`.

## Documentación completa

Consulta el [README de la librería](projects/storage-manager/README.md) para ver la instalación, la configuración, los ejemplos de todos los métodos, el manejo de errores y la referencia completa de la API.

## Autores

- David Mora Duque
- Juan Diego Rodríguez Ortiz
- Juan Pablo Devia Masso

Proyecto de la asignatura Arquitectura de Software, Facultad de Ingeniería, Unidad Central del Valle del Cauca (UCEVA). Docente: Jesús David Mejía Vergara.

## Convención de commits

El repositorio utiliza Conventional Commits. Los mensajes siguen el formato `tipo(alcance): descripción`, por ejemplo:

```text
feat(local-storage): agregar soporte para prefijos
fix(cache-storage): corregir el manejo de recursos inexistentes
docs(readme): documentar la API pública
```

Los tipos habituales son `feat`, `fix`, `docs`, `test`, `build`, `refactor` y `chore`.

## Licencia

Este proyecto se distribuye bajo la licencia MIT. Consulta el archivo `LICENSE`.
