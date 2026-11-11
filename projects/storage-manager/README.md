# ngx-uceva-storage-manager

Librería de Angular para gestionar el almacenamiento del navegador con una API tipada y consistente. Resuelve dos necesidades habituales de una aplicación Angular: persistir datos sencillos en `LocalStorage` sin repetir conversiones JSON y trabajar con `Cache Storage` mediante promesas, sin depender directamente de las APIs del navegador.

Está pensada para equipos que desarrollan aplicaciones Angular y necesitan una capa común de almacenamiento, con claves prefijadas, errores identificables y tipos explícitos.

## Características

- API tipada para `LocalStorage` con serialización JSON automática.
- API asíncrona basada en promesas para `Cache Storage`.
- Prefijo configurable para aislar las claves de `LocalStorage` por aplicación.
- Errores unificados mediante `StorageError` y el enum `StorageErrorCode`.
- Compatible con componentes y servicios standalone de Angular.
- Sin dependencias de ejecución adicionales aparte de Angular y `tslib`.

## Requisitos

- Angular `^22.2.0`. Las dependencias declaradas como peer son `@angular/common` y `@angular/core` en la versión `^22.2.0`.
- Un navegador con soporte para `LocalStorage` para usar `LocalStorageService`.
- Un contexto seguro para usar `CacheStorageService`: `Cache Storage` solo está disponible en páginas servidas por HTTPS o desde `localhost`.

## Instalación

```bash
npm install ngx-uceva-storage-manager
```

## Configuración

La configuración es opcional. `STORAGE_MANAGER_CONFIG` permite definir un prefijo que se antepone a todas las claves de `LocalStorage`. Si no se proporciona, el prefijo es una cadena vacía y las claves se usan tal cual.

```ts
// app.config.ts
import type { ApplicationConfig } from '@angular/core';
import { STORAGE_MANAGER_CONFIG } from 'ngx-uceva-storage-manager';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: STORAGE_MANAGER_CONFIG,
      useValue: { prefix: 'mi-app:' },
    },
  ],
};
```

Con esta configuración, una llamada a `set('usuario', datos)` guarda el valor bajo la clave física `mi-app:usuario`. El prefijo solo afecta a `LocalStorageService`; los nombres de caché de `CacheStorageService` se usan tal como se reciben.

## Uso de LocalStorageService

`LocalStorageService` es síncrono y se inyecta como cualquier servicio de Angular. Serializa los valores con `JSON.stringify` y los recupera con `JSON.parse`, por lo que admite primitivos (`string`, `number`, `boolean`), objetos y arreglos anidados.

### set

Guarda un valor serializado. Si el valor no se puede serializar, lanza `StorageError` con código `SERIALIZATION_ERROR`.

```ts
import { Component, inject } from '@angular/core';
import { LocalStorageService } from 'ngx-uceva-storage-manager';

@Component({
  selector: 'app-local-set',
  standalone: true,
  template: '<button (click)="guardar()">Guardar</button>',
})
export class LocalSetComponent {
  private readonly storage = inject(LocalStorageService);

  guardar(): void {
    this.storage.set('tema', 'oscuro');
    this.storage.set('intentos', 3);
    this.storage.set('usuario', { id: 1, nombre: 'Ana', activo: true });
    this.storage.set('etiquetas', ['angular', 'storage']);
  }
}
```

### get

Recupera y deserializa un valor. Devuelve `null` si la clave no existe.

```ts
import { Component, inject } from '@angular/core';
import { LocalStorageService } from 'ngx-uceva-storage-manager';

@Component({
  selector: 'app-local-get',
  standalone: true,
  template: '<button (click)="leer()">Leer</button>',
})
export class LocalGetComponent {
  private readonly storage = inject(LocalStorageService);

  leer(): void {
    const tema = this.storage.get<string>('tema');
    const usuario = this.storage.get<{ id: number; nombre: string; activo: boolean }>('usuario');

    console.log(tema, usuario);
  }

  distinguirValorNulo(): void {
    if (this.storage.has('preferencia')) {
      const preferencia = this.storage.get<string | null>('preferencia');
      console.log(preferencia);
    }
  }
}
```

`get` devuelve `null` en dos casos distintos: cuando la clave no existe y cuando la clave existe pero se guardó el valor `null`. Para distinguirlos, usa `has` antes de llamar a `get`.

### update

Lee el valor actual, aplica una función de transformación, guarda el resultado y lo devuelve. Si la clave no existe, la función recibe `null`.

```ts
import { Component, inject } from '@angular/core';
import { LocalStorageService } from 'ngx-uceva-storage-manager';

@Component({
  selector: 'app-local-update',
  standalone: true,
  template: '<button (click)="actualizar()">Actualizar</button>',
})
export class LocalUpdateComponent {
  private readonly storage = inject(LocalStorageService);

  actualizar(): void {
    const contador = this.storage.update<number>('contador', (actual) => (actual ?? 0) + 1);

    const usuario = this.storage.update<{ id: number; nombre: string }>('usuario', (actual) => ({
      id: actual?.id ?? 0,
      nombre: 'Ana',
    }));

    console.log(contador, usuario);
  }
}
```

Los errores lanzados por la función de transformación se propagan sin modificar.

### has

Indica si una clave existe. No deserializa el contenido, por lo que una clave con JSON corrupto sigue existiendo.

```ts
import { Component, inject } from '@angular/core';
import { LocalStorageService } from 'ngx-uceva-storage-manager';

@Component({
  selector: 'app-local-has',
  standalone: true,
  template: '<p>{{ existe() ? "Existe" : "No existe" }}</p>',
})
export class LocalHasComponent {
  private readonly storage = inject(LocalStorageService);

  existe(): boolean {
    return this.storage.has('token');
  }
}
```

### remove

Elimina una clave. No falla si la clave no existe.

```ts
import { Component, inject } from '@angular/core';
import { LocalStorageService } from 'ngx-uceva-storage-manager';

@Component({
  selector: 'app-local-remove',
  standalone: true,
  template: '<button (click)="eliminar()">Eliminar</button>',
})
export class LocalRemoveComponent {
  private readonly storage = inject(LocalStorageService);

  eliminar(): void {
    this.storage.remove('token');
  }
}
```

### clear

Elimina todas las claves que pertenecen al prefijo configurado. Si no hay prefijo, elimina todas las claves de `LocalStorage`.

```ts
import { Component, inject } from '@angular/core';
import { LocalStorageService } from 'ngx-uceva-storage-manager';

@Component({
  selector: 'app-local-clear',
  standalone: true,
  template: '<button (click)="limpiar()">Limpiar</button>',
})
export class LocalClearComponent {
  private readonly storage = inject(LocalStorageService);

  limpiar(): void {
    this.storage.clear();
  }
}
```

### keys

Lista las claves que pertenecen al prefijo configurado. Devuelve las claves sin el prefijo.

```ts
import { Component, inject } from '@angular/core';
import { LocalStorageService } from 'ngx-uceva-storage-manager';

@Component({
  selector: 'app-local-keys',
  standalone: true,
  template: '<p>{{ claves.length }} claves</p>',
})
export class LocalKeysComponent {
  private readonly storage = inject(LocalStorageService);

  get claves(): string[] {
    return this.storage.keys();
  }
}
```

## Uso de CacheStorageService

`CacheStorageService` es asíncrono y trabaja con promesas. Todos sus métodos, salvo `isSupported`, se usan con `async`/`await`. Antes de operar conviene comprobar el soporte del entorno.

Sin soporte de `CacheStorage`, todos los métodos salvo `isSupported` lanzan `StorageError` con código `UNSUPPORTED`. Las escrituras (`put`, `putJson` y `fetchAndStore`) crean la caché si no existe; las lecturas y eliminaciones (`get`, `getJson`, `keys` y `delete`) no la crean. Los nombres de caché se usan tal como se reciben: el prefijo de `STORAGE_MANAGER_CONFIG` solo afecta a `LocalStorage`.

### isSupported

Indica si el entorno ofrece `CacheStorage`. Devuelve `false` cuando el token interno entrega `null`. Es el único método síncrono del servicio y el único que no lanza `UNSUPPORTED`.

```ts
import { Component, inject } from '@angular/core';
import { CacheStorageService } from 'ngx-uceva-storage-manager';

@Component({
  selector: 'app-cache-support',
  standalone: true,
  template: '<p>{{ soportado ? "Compatible" : "No compatible" }}</p>',
})
export class CacheSupportComponent {
  private readonly cache = inject(CacheStorageService);

  get soportado(): boolean {
    return this.cache.isSupported();
  }
}
```

### createCache

Crea una caché o abre una existente con el nombre indicado. Es idempotente: llamarlo de nuevo con el mismo nombre no falla.

```ts
import { Component, inject } from '@angular/core';
import { CacheStorageService } from 'ngx-uceva-storage-manager';

@Component({
  selector: 'app-cache-create',
  standalone: true,
  template: '<button (click)="crear()">Crear caché</button>',
})
export class CacheCreateComponent {
  private readonly cache = inject(CacheStorageService);

  async crear(): Promise<void> {
    await this.cache.createCache('api');
  }
}
```

### listCaches

Devuelve los nombres de todas las cachés existentes. Devuelve un arreglo vacío si no hay cachés.

```ts
import { Component, inject } from '@angular/core';
import { CacheStorageService } from 'ngx-uceva-storage-manager';

@Component({
  selector: 'app-cache-list',
  standalone: true,
  template: '<p>{{ nombres.length }} cachés</p>',
})
export class CacheListComponent {
  private readonly cache = inject(CacheStorageService);

  nombres: string[] = [];

  async listar(): Promise<void> {
    this.nombres = await this.cache.listCaches();
  }
}
```

### hasCache

Indica si una caché existe.

```ts
import { Component, inject } from '@angular/core';
import { CacheStorageService } from 'ngx-uceva-storage-manager';

@Component({
  selector: 'app-cache-has',
  standalone: true,
  template: '<p>{{ existe ? "Existe" : "No existe" }}</p>',
})
export class CacheHasComponent {
  private readonly cache = inject(CacheStorageService);

  existe = false;

  async comprobar(): Promise<void> {
    this.existe = await this.cache.hasCache('api');
  }
}
```

### put

Guarda una respuesta asociada a una URL o a un objeto `Request` en una caché. Si la caché no existe, se crea.

```ts
import { Component, inject } from '@angular/core';
import { CacheStorageService } from 'ngx-uceva-storage-manager';

@Component({
  selector: 'app-cache-put',
  standalone: true,
  template: '<button (click)="guardar()">Guardar respuesta</button>',
})
export class CachePutComponent {
  private readonly cache = inject(CacheStorageService);

  async guardar(): Promise<void> {
    const response = new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });

    await this.cache.put('api', '/estado', response);
  }
}
```

### putJson

Guarda un objeto como respuesta JSON (`Content-Type: application/json`) asociada a una URL. Si la caché no existe, se crea. Lanza `SERIALIZATION_ERROR` si `JSON.stringify` falla o devuelve `undefined`.

```ts
import { Component, inject } from '@angular/core';
import { CacheStorageService } from 'ngx-uceva-storage-manager';

@Component({
  selector: 'app-cache-put-json',
  standalone: true,
  template: '<button (click)="guardar()">Guardar JSON</button>',
})
export class CachePutJsonComponent {
  private readonly cache = inject(CacheStorageService);

  async guardar(): Promise<void> {
    await this.cache.putJson('api', '/usuarios/1', { id: 1, nombre: 'Ana' });
  }
}
```

### fetchAndStore

Descarga un recurso con el `fetch` global y lo guarda en una caché. Si la caché no existe, se crea. Si `fetch` rechaza, lanza `OPERATION_FAILED` conservando la causa; si la respuesta no es `ok`, lanza `OPERATION_FAILED` con el estado HTTP en el mensaje. En ambos casos no guarda nada.

```ts
import { Component, inject } from '@angular/core';
import { CacheStorageService } from 'ngx-uceva-storage-manager';

@Component({
  selector: 'app-cache-fetch',
  standalone: true,
  template: '<button (click)="descargar()">Descargar</button>',
})
export class CacheFetchComponent {
  private readonly cache = inject(CacheStorageService);

  async descargar(): Promise<void> {
    await this.cache.fetchAndStore('api', '/datos.json');
  }
}
```

### get

Recupera un recurso almacenado. Devuelve `undefined` si la caché o el recurso no existen. No crea la caché.

```ts
import { Component, inject } from '@angular/core';
import { CacheStorageService } from 'ngx-uceva-storage-manager';

@Component({
  selector: 'app-cache-get',
  standalone: true,
  template: '<button (click)="leer()">Leer recurso</button>',
})
export class CacheGetComponent {
  private readonly cache = inject(CacheStorageService);

  async leer(): Promise<void> {
    const response = await this.cache.get('api', '/datos.json');

    if (response !== undefined) {
      const datos: unknown = await response.json();
      console.log(datos);
    }
  }
}
```

### getJson

Recupera y deserializa un recurso JSON. Devuelve `null` si la caché o el recurso no existen, y también si el recurso existe pero se guardó el valor JSON `null`. Para distinguir ambos casos, usa `get` o `keys` antes de llamar a `getJson`. Lanza `PARSE_ERROR` si el contenido no es JSON válido. No crea la caché.

```ts
import { Component, inject } from '@angular/core';
import { CacheStorageService } from 'ngx-uceva-storage-manager';

@Component({
  selector: 'app-cache-get-json',
  standalone: true,
  template: '<button (click)="leer()">Leer JSON</button>',
})
export class CacheGetJsonComponent {
  private readonly cache = inject(CacheStorageService);

  async leer(): Promise<void> {
    const usuario = await this.cache.getJson<{ id: number; nombre: string }>(
      'api',
      '/usuarios/1',
    );

    if (usuario !== null) {
      console.log(usuario);
      return;
    }

    const respuesta = await this.cache.get('api', '/usuarios/1');

    if (respuesta === undefined) {
      console.log('El recurso no existe.');
    } else {
      console.log('El recurso existe y su JSON es null.');
    }
  }
}
```

### keys

Lista los recursos almacenados en una caché. Cada elemento incluye la URL y el método HTTP del `Request` (por ejemplo, `GET` cuando se guardó con una URL). Devuelve `[]` si la caché no existe. No crea la caché.

```ts
import { Component, inject } from '@angular/core';
import { CacheStorageService } from 'ngx-uceva-storage-manager';
import type { CacheEntryInfo } from 'ngx-uceva-storage-manager';

@Component({
  selector: 'app-cache-keys',
  standalone: true,
  template: '<p>{{ recursos.length }} recursos</p>',
})
export class CacheKeysComponent {
  private readonly cache = inject(CacheStorageService);

  recursos: CacheEntryInfo[] = [];

  async listar(): Promise<void> {
    this.recursos = await this.cache.keys('api');

    for (const recurso of this.recursos) {
      console.log(recurso.url, recurso.method);
    }
  }
}
```

### delete

Elimina un recurso de una caché. Devuelve `true` si el recurso fue eliminado y `false` si la caché o el recurso no existen. No crea la caché.

```ts
import { Component, inject } from '@angular/core';
import { CacheStorageService } from 'ngx-uceva-storage-manager';

@Component({
  selector: 'app-cache-delete',
  standalone: true,
  template: '<button (click)="eliminar()">Eliminar recurso</button>',
})
export class CacheDeleteComponent {
  private readonly cache = inject(CacheStorageService);

  async eliminar(): Promise<boolean> {
    return this.cache.delete('api', '/usuarios/1');
  }
}
```

### deleteCache

Elimina una caché completa. Devuelve `true` si la caché fue eliminada y `false` si no existía.

```ts
import { Component, inject } from '@angular/core';
import { CacheStorageService } from 'ngx-uceva-storage-manager';

@Component({
  selector: 'app-cache-delete-cache',
  standalone: true,
  template: '<button (click)="eliminar()">Eliminar caché</button>',
})
export class CacheDeleteCacheComponent {
  private readonly cache = inject(CacheStorageService);

  async eliminar(): Promise<boolean> {
    return this.cache.deleteCache('api');
  }
}
```

## Manejo de errores

Las operaciones de almacenamiento traducen los fallos a `StorageError`. La clase extiende `Error` e incorpora la propiedad `code`, con un valor de `StorageErrorCode`, y la propiedad `cause`, que conserva el error original cuando está disponible. Los errores lanzados por la función `updater` de `update` se propagan sin modificar.

| Código | Cuándo ocurre |
|---|---|
| `UNSUPPORTED` | El entorno no ofrece soporte para el almacenamiento solicitado. En `CacheStorageService` lo lanzan todos los métodos salvo `isSupported`. |
| `QUOTA_EXCEEDED` | Se superó la cuota de almacenamiento disponible. |
| `SERIALIZATION_ERROR` | `JSON.stringify` falló o devolvió `undefined` al intentar guardar un valor con `set` o `putJson`. |
| `PARSE_ERROR` | El contenido almacenado no es un JSON válido al leerlo con `get` o `getJson`. |
| `OPERATION_FAILED` | Ocurrió un fallo no clasificado durante la operación. En `CacheStorageService` incluye los fallos de la API nativa y de `fetch`; conserva la causa original cuando está disponible. |

```ts
import { Component, inject } from '@angular/core';
import {
  LocalStorageService,
  StorageError,
  StorageErrorCode,
} from 'ngx-uceva-storage-manager';

@Component({
  selector: 'app-error-demo',
  standalone: true,
  template: '<button (click)="guardar()">Guardar configuración</button>',
})
export class ErrorDemoComponent {
  private readonly storage = inject(LocalStorageService);

  guardar(): void {
    try {
      this.storage.set('configuracion', { tema: 'oscuro', idioma: 'es' });
    } catch (error) {
      if (error instanceof StorageError) {
        console.error(error.code, error.message, error.cause);

        if (error.code === StorageErrorCode.QUOTA_EXCEEDED) {
          // Gestionar la cuota llena.
        }
      } else {
        throw error;
      }
    }
  }
}
```

## Referencia de la API

### LocalStorageService

| Firma | Descripción |
|---|---|
| `set<T>(key: string, value: T): void` | Serializa el valor con JSON y lo guarda bajo la clave indicada. |
| `get<T>(key: string): T \| null` | Recupera y deserializa el valor. Devuelve `null` si la clave no existe o si se guardó `null`. |
| `update<T>(key: string, updater: (current: T \| null) => T): T` | Lee el valor actual, aplica `updater`, guarda el resultado y lo devuelve. |
| `has(key: string): boolean` | Indica si la clave existe, sin deserializar el contenido. |
| `remove(key: string): void` | Elimina la clave. No falla si no existe. |
| `clear(): void` | Elimina las claves del prefijo configurado, o todas si no hay prefijo. |
| `keys(): string[]` | Lista las claves del prefijo configurado, sin incluir el prefijo. |

### CacheStorageService

| Firma | Descripción |
|---|---|
| `isSupported(): boolean` | Indica si el entorno ofrece `CacheStorage`. Devuelve `false` si no está disponible. |
| `createCache(name: string): Promise<void>` | Crea o abre una caché con el nombre indicado. Es idempotente. |
| `listCaches(): Promise<string[]>` | Devuelve los nombres de todas las cachés existentes. |
| `hasCache(name: string): Promise<boolean>` | Indica si una caché existe. |
| `put(cacheName: string, request: string \| Request, response: Response): Promise<void>` | Guarda una respuesta asociada a una URL o petición; crea la caché si no existe. |
| `putJson<T>(cacheName: string, url: string, data: T): Promise<void>` | Guarda un objeto como respuesta JSON (`Content-Type: application/json`); crea la caché si no existe. |
| `fetchAndStore(cacheName: string, url: string): Promise<void>` | Descarga una URL con el `fetch` global y la guarda; crea la caché si no existe. No guarda nada si la descarga falla. |
| `get(cacheName: string, request: string \| Request): Promise<Response \| undefined>` | Devuelve la respuesta o `undefined` si la caché o el recurso no existen. No crea la caché. |
| `getJson<T>(cacheName: string, url: string): Promise<T \| null>` | Devuelve el JSON o `null` si la caché o el recurso no existen, o si el JSON almacenado es `null`. No crea la caché. |
| `keys(cacheName: string): Promise<CacheEntryInfo[]>` | Lista los recursos (`url` y `method`) o `[]` si la caché no existe. No crea la caché. |
| `delete(cacheName: string, request: string \| Request): Promise<boolean>` | Devuelve `true` si eliminó el recurso; `false` si la caché o el recurso no existen. No crea la caché. |
| `deleteCache(name: string): Promise<boolean>` | Devuelve `true` si eliminó la caché; `false` si no existía. |

### Tipos públicos

| Tipo | Descripción |
|---|---|
| `StorageConfig` | Configuración de la librería. Contiene la propiedad opcional `prefix: string`. |
| `StorageErrorCode` | Enum con los códigos de error de la librería. |
| `StorageError` | Error propio de la librería, con `code` y `cause`. |
| `CacheEntryInfo` | Información de un recurso almacenado en caché: `url: string` y `method: string`. |

## Documentación técnica

La documentación de la API se genera con Compodoc desde el repositorio del proyecto. Los scripts están definidos en el `package.json` de la raíz:

```bash
npm run docs
```

El comando genera la documentación en la carpeta `documentation/`. Para servirla localmente:

```bash
npm run docs:serve
```

Para comprobar que toda la API pública está documentada:

```bash
npm run docs:coverage
```

## Licencia y autores

Este proyecto se distribuye bajo la licencia MIT. Consulta el archivo `LICENSE` del repositorio.

Autores:

- David Mora Duque
- Juan Diego Rodríguez Ortiz
- Juan Pablo Devia Masso

Proyecto de la asignatura Arquitectura de Software, Facultad de Ingeniería, Unidad Central del Valle del Cauca (UCEVA). Docente: Jesús David Mejía Vergara.
