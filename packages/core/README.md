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

<input type="text" id="city" class="flexdatalist" data-url="/api/cities" data-min-length="2" />
```

The class auto-initialises on `DOMContentLoaded` for inputs with the `flexdatalist` class.

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
| `before:flexdatalist.search` | `{ keywords, data }` |
| `after:flexdatalist.search` | `{ keywords, data, results }` |

See the [source documentation](packages/core/src/flexdatalist.js) for the full event list.

## Framework Adapters

| Framework | Package | Install |
|-----------|---------|---------|
| Vue 3 | [flexdatalist-vue](../vue/) | `npm install flexdatalist-vue` |
| React | [flexdatalist-react](../react/) | `npm install flexdatalist-react` |
| Svelte | [flexdatalist-svelte](../svelte/) | `npm install flexdatalist-svelte` |

## License

MIT
