# flexdatalist

Standalone autocomplete / tag input with no dependencies.

Remote & static data, grouping, keyboard navigation, localStorage caching, and a clean chainable API.

## Install

```bash
npm install flexdatalist
```

## Usage

### Standalone (script tag)

```html
<link rel="stylesheet" href="flexdatalist.css" />
<script src="flexdatalist.js"></script>

<input type="text" id="city" fdl-url="/api/cities" fdl-min-length="2" />
```

The class auto-initialises on `DOMContentLoaded` for inputs with `fdl-*` (or `data-fdl-*`) attributes, or with the `flexdatalist` class. The v2 `data-*` attributes still work.

Files for a `<script>` tag (both define a global `Flexdatalist` class):

- `src/flexdatalist.js` (+ `src/flexdatalist.css`): the readable source, also exported as `flexdatalist/standalone` (+ `flexdatalist/standalone/css`) so tools can resolve its path. It is a classic script, not an ES module, so `import` it only for its side effect; use `import Flexdatalist from 'flexdatalist'` to get the class.
- `dist/flexdatalist.umd.js` (+ `dist/flexdatalist.css`): the minified build.

### Running v2 + v3 side-by-side (avoiding CSS conflicts)

Flexdatalist v3 can namespace its CSS classes so it can coexist with v2 on the same page.

- **Option**: `classPrefix` (default: empty string)
  - When empty, v3 uses the legacy class names (compatible with v2 CSS).
  - When set (e.g. `fd3-`), v3 will emit prefixed classes like `fd3-flexdatalist-results`: every styled `flexdatalist-*` class (alias, tags wrapper, results, loader, collapsed tags) gets the prefix.
  - Not prefixed: the `flexdatalist` / `flexdatalist-set` markers on the original input (used to find inputs to auto-initialise), the v3-only `fdl-*` classes, and generic classes such as `item`, `value` or `active`, which only appear inside the prefixed elements.

Example (using attributes):

```html
<!-- v2 input (default classes) -->
<input fdl-url="/api/v2/cities" />

<!-- v3 input (prefixed classes) -->
<input fdl-class-prefix="fd3-" fdl-url="/api/v3/cities" />
```

Example (JS init):

```js
await Flexdatalist.init('#cityV3', { classPrefix: 'fd3-' });
```

**Important**: your CSS must match the prefix. The easiest approach is to copy `flexdatalist.css` and prefix its selectors (e.g. replace `.flexdatalist-results` with `.fd3-flexdatalist-results`, etc.).

### ES module (bundler)

```js
import Flexdatalist from 'flexdatalist';
import 'flexdatalist/css';

const [fd] = await Flexdatalist.init('#city', {
    url: '/api/cities',
    minLength: 2,
});

fd.on('select:flexdatalist', (e) => {
    console.log('Selected:', e.detail);
});
```

### CommonJS

```js
const { Flexdatalist } = require('flexdatalist');
```

## API

### Static methods

| Method | Description |
|--------|-------------|
| `Flexdatalist.init(selector, options?)` | Init on one or more elements. Returns `Promise<Flexdatalist[]>`. |
| `Flexdatalist.getInstance(el)` | Get the instance attached to an element, or `null`. |

### Instance methods

| Method | Description |
|--------|-------------|
| `getValue()` | Get the current value (string, array, or object). |
| `setValue(val)` | Replace the current value. |
| `addValue(val)` | Append value(s) in multiple mode. |
| `removeValue(val)` | Remove a specific value in multiple mode. |
| `toggleValue(val)` | Toggle a tag's disabled state. |
| `clear()` | Clear all values. |
| `getText(format?)` | Get display text(s). |
| `search(keyword)` | Programmatically trigger a search. |
| `closeResults()` | Close the results dropdown. |
| `disable()` / `enable()` | Disable or enable the widget. |
| `readonly(state?)` | Set or query readonly state. |
| `on(event, handler)` | Subscribe to an event. |
| `off(event, handler)` | Unsubscribe from an event. |
| `destroy(clear?)` | Destroy the instance and restore the original input. |

### Events

All events are dispatched as `CustomEvent` on the original `<input>`. Access data via `e.detail`.

| Event | Payload |
|-------|---------|
| `init:flexdatalist` | Resolved options |
| `select:flexdatalist` | Selected item |
| `change:flexdatalist` | `{ value, text }` |
| `clear:flexdatalist` | — |
| `addnew:flexdatalist` | Keyword string |
| `error:flexdatalist` | `{ error, url }` (remote request failed) |
| `before:flexdatalist.search` | `{ keywords, data }` |
| `after:flexdatalist.search` | `{ keywords, data, results }` |

See the [source documentation](src/flexdatalist.js) for the full event list.

## For AI assistants

[`llms.txt`](llms.txt) is a compact reference written for LLMs and coding agents. It covers the server response format, every option, and the most common integration mistakes. It is included in the npm package (`node_modules/flexdatalist/llms.txt`).

## React, Vue, Svelte

Use this package directly from a small component. Copy-paste versions for each framework are in the [main README](https://github.com/sergiodlopes/flexdatalist#using-with-react-vue-or-svelte).

The `flexdatalist-vue`, `flexdatalist-react` and `flexdatalist-svelte` packages are deprecated.

## License

MIT
