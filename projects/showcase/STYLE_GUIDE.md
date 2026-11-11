# Guía de estilos del Showcase

Los estilos compartidos viven en `projects/showcase/src/styles.scss` y se exponen mediante clases con el prefijo `sm-`. Están pensados para que los paneles de LocalStorage y Cache Storage los adopten de forma gradual.

Los estilos globales no usan selectores genéricos como `button`, `input` o `h2`. Por eso, aplicar una clase `sm-*` es siempre una decisión explícita y no altera los componentes que todavía no las usan.

## Clases reutilizables

| Clase | Qué hace | Ejemplo mínimo |
|---|---|---|
| `.sm-card` | Tarjeta contenedora con borde, fondo, radio y sombra. | `<section class="sm-card">Contenido</section>` |
| `.sm-card__title` | Título de una tarjeta, con margen y tamaño consistente. | `<h3 class="sm-card__title">Título</h3>` |
| `.sm-field` | Agrupa una etiqueta y su control en columna. | `<label class="sm-field"><span>Nombre</span><input class="sm-input" /></label>` |
| `.sm-input` | Campo de texto con estados hover, foco y deshabilitado. | `<input class="sm-input" placeholder="Texto" />` |
| `.sm-textarea` | Área de texto redimensionable verticalmente. | `<textarea class="sm-textarea" rows="4"></textarea>` |
| `.sm-btn` | Botón base. También funciona sobre enlaces. | `<button class="sm-btn" type="button">Acción</button>` |
| `.sm-btn--primary` | Modificador de acción principal. Se usa junto con `.sm-btn`. | `<button class="sm-btn sm-btn--primary" type="button">Guardar</button>` |
| `.sm-btn--danger` | Modificador de acción destructiva. Se usa junto con `.sm-btn`. | `<button class="sm-btn sm-btn--danger" type="button">Eliminar</button>` |
| `.sm-btn--ghost` | Modificador de acción secundaria o discreta. Se usa junto con `.sm-btn`. | `<button class="sm-btn sm-btn--ghost" type="button">Cancelar</button>` |
| `.sm-actions` | Fila flexible de botones con separación uniforme. | `<div class="sm-actions"><button class="sm-btn">A</button><button class="sm-btn">B</button></div>` |
| `.sm-output` | Bloque monoespaciado para resultados o JSON, con desplazamiento. | `<pre class="sm-output">{{ resultado }}</pre>` |
| `.sm-error` | Mensaje de error con fondo y borde de alerta. | `<p class="sm-error">No se pudo guardar.</p>` |
| `.sm-success` | Mensaje de éxito con fondo y borde de confirmación. | `<p class="sm-success">Operación completada.</p>` |
| `.sm-list` | Lista sin viñetas, con elementos separados y legibles. | `<ul class="sm-list"><li>Clave uno</li><li>Clave dos</li></ul>` |
| `.sm-grid` | Rejilla de dos columnas que pasa a una columna en móvil. | `<div class="sm-grid"><section class="sm-card">A</section><section class="sm-card">B</section></div>` |

## Variables CSS

Las clases usan variables definidas en `:root` y adaptadas con `prefers-color-scheme: dark`:

- Tipografía: `--sm-font-sans`, `--sm-font-mono`.
- Colores: `--sm-bg`, `--sm-surface`, `--sm-surface-muted`, `--sm-text`, `--sm-text-muted`, `--sm-border`, `--sm-primary`, `--sm-danger`, `--sm-success`, `--sm-error`, `--sm-focus`.
- Espaciados: `--sm-space-1` a `--sm-space-6`.
- Radios: `--sm-radius-sm`, `--sm-radius-md`, `--sm-radius-lg`.
- Sombra: `--sm-shadow`.

## Ejemplo de composición

```html
<section class="sm-card">
  <h3 class="sm-card__title">Guardar valor</h3>

  <label class="sm-field">
    <span>Clave</span>
    <input class="sm-input" placeholder="mi-clave" />
  </label>

  <div class="sm-actions">
    <button class="sm-btn sm-btn--primary" type="button">Guardar</button>
    <button class="sm-btn sm-btn--ghost" type="button">Cancelar</button>
  </div>

  <p class="sm-success">Valor guardado correctamente.</p>
</section>
```
