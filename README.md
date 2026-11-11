# ngx-uceva-storage-manager

Workspace de Angular que contiene la librería `ngx-uceva-storage-manager` y una aplicación de demostración (Showcase). La librería ofrece una API tipada para gestionar `LocalStorage` y `Cache Storage` con claves prefijadas y errores identificables.

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
- `projects/showcase`: aplicación que consume la librería y muestra sus operaciones.

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
| `build:lib` | `ng build storage-manager` | Compila la librería en `dist/storage-manager`. |
| `test` | `ng test storage-manager --watch=false` | Ejecuta las pruebas unitarias una vez. |
| `test:coverage` | `ng test storage-manager --watch=false --coverage` | Ejecuta las pruebas y genera el reporte de cobertura. |
| `docs` | `compodoc -p projects/storage-manager/tsconfig.doc.json -d documentation --name "ngx-uceva-storage-manager" --disablePrivate --disableProtected --disableInternal --disableDependencies` | Genera la documentación técnica en `documentation/`. |
| `docs:serve` | `compodoc -p projects/storage-manager/tsconfig.doc.json -d documentation --name "ngx-uceva-storage-manager" --disablePrivate --disableProtected --disableInternal --disableDependencies -s` | Genera la documentación y la sirve localmente. |
| `docs:coverage` | `compodoc -p projects/storage-manager/tsconfig.doc.json -d documentation --name "ngx-uceva-storage-manager" --disablePrivate --disableProtected --disableInternal --disableDependencies --coverageTest 100 --silent` | Verifica que la API pública esté documentada al 100 %. |
| `start:showcase` | `npm run build:lib && ng serve showcase` | Compila la librería y levanta el Showcase. |
| `build:showcase` | `ng build showcase` | Compila el Showcase para producción. |

## Ejecutar el Showcase

```bash
npm run start:showcase
```

El comando compila primero la librería y después inicia el servidor de desarrollo del Showcase. Abre `http://localhost:4200/` en el navegador.

Para generar únicamente la compilación de producción del Showcase:

```bash
npm run build:showcase
```

Este script requiere que la librería esté compilada previamente en `dist/storage-manager`; si no lo está, ejecuta antes `npm run build:lib`.

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
