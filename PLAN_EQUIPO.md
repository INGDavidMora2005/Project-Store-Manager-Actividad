# Storage Manager Project — Plan de equipo

**Materia:** Arquitectura de Software · UCEVA · Docente: Jesus David Mejia Vergara
**Entrega:** domingo 15 de noviembre de 2026 (meta interna: sábado 14 por la noche)
**Repo:** https://github.com/INGDavidMora2005/Project-Store-Manager-Actividad.git
**Equipo:** David Mora Duque (líder y publicador NPM) · Juan Diego Rodrigues · Juan Pablo Devia

---

## 1. ¿Qué vamos a construir?

1. **Librería Angular** reutilizable que simplifica el uso de **LocalStorage** y **Cache Storage** con una API tipada y consistente.
2. Publicada en **NPM**.
3. **Showcase**: app Angular independiente que instala la librería desde NPM y demuestra todas sus funciones.
4. Calidad: **pruebas unitarias con 100 % de cobertura** (statements, branches, functions, lines), **Compodoc**, **README.md** completo y **Conventional Commits**.

### Rúbrica conocida
| Ítem | Puntos |
|---|---|
| Servicio LocalStorage | 2.0 |
| Servicio Cache Storage | 2.0 |
| Showcase | 1.0 |
| Resto (API pública, pruebas, docs, NPM, commits, organización) | Se evalúa según el enunciado |

### Contenido del PDF de entrega
Nombres completos · enlace GitHub · enlace NPM · evidencia de pruebas con 100 % · evidencia de Compodoc · evidencia de ejecución del Showcase.

### Alcance
Solo lo que pide el enunciado. **Quedan descartados** los extras (pipelines de GitHub Actions, despliegue en GitHub Pages y patrones de diseño adicionales).

---

## 2. Stack y decisiones

| Tema | Decisión |
|---|---|
| Angular CLI | 22.1.8 |
| Node / npm | v24.18.1 / 12.2.1 |
| Pruebas | **Vitest** (runner por defecto del CLI) con umbral de cobertura del 100 % |
| Estructura | Workspace único: `projects/storage-manager` (librería) y `projects/showcase` (app) |
| Documentación | Compodoc + README |
| Commits | Conventional Commits |
| Nombre del paquete NPM | `ngx-uceva-storage-manager` (verificar con `npm view ngx-uceva-storage-manager`; un error E404 significa que está libre) |

---

## 3. Arquitectura de la librería

```
projects/storage-manager/src/
├── public-api.ts                 ← SOLO lo que se exporta (dueño: David)
└── lib/
    ├── models/                   ← PÚBLICO (dueño: David)
    │   ├── storage-error.model.ts
    │   ├── storage-config.model.ts
    │   └── cache-entry.model.ts
    ├── local-storage/            ← PÚBLICO (dueño: Juan Diego)
    │   ├── local-storage.service.ts
    │   └── local-storage.service.spec.ts
    ├── cache-storage/            ← PÚBLICO (dueño: Juan Pablo)
    │   ├── cache-storage.service.ts
    │   └── cache-storage.service.spec.ts
    └── internal/                 ← PRIVADO, no se exporta (dueño: David)
        └── browser-tokens.ts     ← InjectionTokens sobre Storage / CacheStorage
```

**Principios:** cada servicio tiene una sola responsabilidad; los servicios no dependen directamente de `window`, usan los tokens internos (así se pueden probar sin navegador real); `public-api.ts` no exporta nada de `internal/`.

---

## 4. Contrato público (se congela al terminar la Fase 0)

> Cambiar este contrato después de la Fase 0 requiere aprobación del líder.

### 4.1 Modelos (`models/`)
- `StorageErrorCode` (enum): `UNSUPPORTED`, `QUOTA_EXCEEDED`, `SERIALIZATION_ERROR`, `PARSE_ERROR`, `NOT_FOUND`, `OPERATION_FAILED`.
- `StorageError extends Error`: propiedades `code: StorageErrorCode` y `cause?: unknown`.
- `StorageConfig`: `{ prefix?: string }`, con token público `STORAGE_MANAGER_CONFIG` (`InjectionToken<StorageConfig>`).
- `CacheEntryInfo`: `{ url: string; method: string }`.

### 4.2 `LocalStorageService` (síncrono)
| Método | Comportamiento |
|---|---|
| `set<T>(key, value: T): void` | Serializa con JSON y guarda. Lanza `StorageError` (`SERIALIZATION_ERROR`, `QUOTA_EXCEEDED`, `UNSUPPORTED`). |
| `get<T>(key): T \| null` | `null` si la clave no existe. Lanza `PARSE_ERROR` si el JSON guardado está corrupto. |
| `update<T>(key, updater: (current: T \| null) => T): T` | Lee, aplica `updater`, guarda y devuelve el nuevo valor. |
| `has(key): boolean` | Indica si existe la clave. |
| `remove(key): void` | Elimina la clave (no falla si no existe). |
| `clear(): void` | Elimina solo las claves del prefijo configurado (todo si no hay prefijo). |
| `keys(): string[]` | Lista las claves (sin el prefijo). |

Soporta primitivos (`string`, `number`, `boolean`) y objetos/arreglos.

### 4.3 `CacheStorageService` (asíncrono, con Promises)
| Método | Comportamiento |
|---|---|
| `isSupported(): boolean` | `true` si existe `CacheStorage` en el entorno. |
| `createCache(name): Promise<void>` | Crea (abre) una caché. |
| `listCaches(): Promise<string[]>` | Nombres de todas las cachés. |
| `hasCache(name): Promise<boolean>` | Indica si existe la caché. |
| `put(cacheName, request: string \| Request, response: Response): Promise<void>` | Guarda un recurso/respuesta. |
| `putJson<T>(cacheName, url: string, data: T): Promise<void>` | Atajo: guarda un objeto como respuesta JSON. |
| `fetchAndStore(cacheName, url: string): Promise<void>` | Descarga una URL y la guarda en la caché. |
| `get(cacheName, request: string \| Request): Promise<Response \| undefined>` | Consulta un recurso. |
| `getJson<T>(cacheName, url: string): Promise<T \| null>` | Consulta y parsea JSON. |
| `keys(cacheName): Promise<CacheEntryInfo[]>` | Lista los recursos de una caché. |
| `delete(cacheName, request: string \| Request): Promise<boolean>` | Elimina un recurso. |
| `deleteCache(name): Promise<boolean>` | Elimina una caché completa. |

Todos los errores se traducen a `StorageError`.

---

## 5. Reparto de trabajo (equilibrado)

### 🔷 David — Líder y publicador
| # | Tarea | Prioridad |
|---|---|---|
| D1 | **Fase 0:** workspace, librería, Vitest con umbral 100 %, modelos, tokens internos, `public-api.ts`, stubs de ambos servicios, subir a `main` | P0 (bloquea a todos) |
| D2 | Configuración de Compodoc y scripts npm | P1 |
| D3 | README.md completo (instalación, configuración, ejemplos, API) | P1 |
| D4 | Cuenta NPM, `package.json` de distribución, build de producción y **publicación** | P1 |
| D5 | Showcase: **shell** (layout, navegación, página de inicio, instalación desde NPM) | P1 |
| D6 | Integración final, revisión de PRs, evidencias (capturas de pruebas, Compodoc y Showcase) y **PDF de entrega** | P1 |

### 🟩 Juan Diego — LocalStorage
| # | Tarea |
|---|---|
| JD1 | Implementar `LocalStorageService` según el contrato 4.2 |
| JD2 | Pruebas unitarias del servicio al 100 % (éxito, errores y casos límite: clave inexistente, JSON corrupto, cuota llena, sin soporte, objetos anidados, prefijo) |
| JD3 | Comentarios TSDoc en todo lo público (para Compodoc) |
| JD4 | Showcase: **panel de LocalStorage** (guardar, consultar, actualizar, eliminar, listar, limpiar) |

### 🟧 Juan Pablo — Cache Storage
| # | Tarea |
|---|---|
| JP1 | Implementar `CacheStorageService` según el contrato 4.3 |
| JP2 | Pruebas unitarias del servicio al 100 % (crear/listar/eliminar cachés, put/get, JSON, fetch fallido, sin soporte, recurso inexistente) |
| JP3 | Comentarios TSDoc en todo lo público |
| JP4 | Showcase: **panel de Cache Storage** (crear caché, guardar recurso, consultar, listar, eliminar recurso, eliminar caché) |

---

## 6. Cómo trabajar en paralelo sin pisarse

**Regla de propiedad de archivos:** cada persona solo edita su carpeta.

| Carpeta | Dueño |
|---|---|
| `lib/local-storage/` y `showcase/.../local-storage-panel/` | Juan Diego |
| `lib/cache-storage/` y `showcase/.../cache-storage-panel/` | Juan Pablo |
| `lib/models/`, `lib/internal/`, `public-api.ts`, configuración raíz, README, docs | David |

Si necesitas cambiar algo fuera de tu carpeta, **pídeselo al líder**.

**Flujo Git**
1. `main` siempre debe compilar y pasar pruebas.
2. Cada tarea va en una rama: `feat/local-storage-service`, `feat/cache-storage-service`, `feat/showcase-local-panel`, `feat/showcase-cache-panel`, `docs/readme`, etc.
3. Se integra por **Pull Request** hacia `main`, revisado por David.
4. Antes de abrir el PR: `git pull --rebase origin main`, `npm test` con 100 % y `npm run build` sin errores.

**Conventional Commits:** `tipo(alcance): descripción en minúscula`.
Tipos: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `build`.
Alcances sugeridos: `lib`, `local-storage`, `cache-storage`, `showcase`, `docs`, `release`.
Ejemplos: `feat(local-storage): add set and get methods` · `test(cache-storage): cover fetch failure branch`.
Commits pequeños y frecuentes; cada integrante commitea con su propio usuario.

---

## 7. Cronograma

| Día | David | Juan Diego | Juan Pablo |
|---|---|---|---|
| **Mar 10** | **Fase 0 (D1)**: sube la base a `main` | Clona, instala, lee este plan | Clona, instala, lee este plan |
| **Mié 11** | D2 Compodoc · cuenta NPM · verificar nombre del paquete · D5 shell | JD1 servicio + JD2 pruebas | JP1 servicio + JP2 pruebas |
| **Jue 12** | D3 README · D5 shell | JD2 al 100 % + JD3 TSDoc · PR | JP2 al 100 % + JP3 TSDoc · PR |
| **Vie 13** | Revisa PRs · D4 **build y publicación en NPM** | JD4 panel (contra la librería local) | JP4 panel (contra la librería local) |
| **Sáb 14** | Showcase pasa a consumir **NPM** · D6 integración, evidencias y PDF | Ajustes del panel con la versión de NPM | Ajustes del panel con la versión de NPM |
| **Dom 15** | Buffer / entrega | Buffer | Buffer |

> **Dependencia crítica:** el Showcase final debe consumir la librería desde NPM, así que la publicación del viernes es el hito más importante. Los paneles se desarrollan antes contra el build local.

---

## 8. Definición de "terminado"

- [ ] Servicios implementados según el contrato.
- [ ] `npm test`: 100 % en statements, branches, functions y lines.
- [ ] `public-api.ts` exporta solo servicios, interfaces y modelos (nada de `internal/`).
- [ ] Compodoc genera sin advertencias de elementos sin documentar.
- [ ] README con instalación, configuración, funcionalidades y ejemplos.
- [ ] Librería publicada e instalable desde un proyecto Angular externo.
- [ ] Showcase instala desde NPM y usa solo la API pública.
- [ ] Historial con Conventional Commits.
- [ ] PDF con nombres, enlaces y evidencias.

---

## 9. Mapa de dependencias

```
Fase 0 (D1)
   ├──▶ JD1–JD3  (LocalStorage)  ──┐
   ├──▶ JP1–JP3  (CacheStorage)  ──┤
   ├──▶ D2, D3   (docs)            ├──▶ D4 publicación NPM ──▶ Showcase con NPM ──▶ D6 PDF
   └──▶ D5       (shell)         ──┘
JD4 y JP4 arrancan contra el build local y se ajustan tras D4.
```
