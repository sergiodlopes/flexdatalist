# Flexdatalist

[![npm version](https://img.shields.io/npm/v/flexdatalist)](https://www.npmjs.com/package/flexdatalist)
[![bundle size](https://img.shields.io/bundlephobia/minzip/flexdatalist)](https://bundlephobia.com/package/flexdatalist)
[![license](https://img.shields.io/npm/l/flexdatalist)](https://opensource.org/licenses/MIT)

Flexdatalist is a standalone (zero-dependency) autocomplete / datalist input widget written in modern ES6+. It supports remote and static data sources, `<datalist>` elements, multiple-value tag input, result grouping, keyboard navigation, localStorage caching, and a clean chainable API.

**v3 is a complete rewrite -- jQuery is no longer required.**

> Looking for the jQuery version? See the [`v2` branch](https://github.com/sergiodlopes/flexdatalist/tree/v2).

## Install

### npm (recommended for bundlers)

```bash
npm install flexdatalist
```

```js
import Flexdatalist from 'flexdatalist';
import 'flexdatalist/css';
```

### CDN / standalone

No build step needed -- just drop in the files:

```html
<link rel="stylesheet" href="flexdatalist.css">
<script src="flexdatalist.js"></script>
```

### React, Vue, Svelte

Use the core package directly. See [Using with React, Vue or Svelte](#using-with-react-vue-or-svelte) for short, copy-paste components.

> The `flexdatalist-vue`, `flexdatalist-react` and `flexdatalist-svelte` packages are **deprecated** and no longer maintained. Existing installs keep working.

## Quick Start

Add the `flexdatalist` class to any `<input>` -- it will be initialised automatically on page load:

```html
<input type="text" class="flexdatalist"
       data-url="/api/cities"
       data-min-length="2"
       data-search-in="name"
       data-value-property="id">
```

### Programmatic Initialisation

```js
const [fd] = await Flexdatalist.init('#city', {
    url: '/api/cities',
    minLength: 2,
    multiple: true,
});

// Chainable API
fd.setValue('Paris')
  .on('select:flexdatalist', e => console.log(e.detail));

// Get the stored value at any time
console.log(fd.getValue());
```

### Grouped results as tabs

When `groupBy` is set, you can render grouped results as tab “pills” instead of inline group headers:

```js
const [fd] = await Flexdatalist.init('#people', {
    url: '/api/people',
    minLength: 1,
    groupBy: 'type',          // e.g. "People", "Task", "Pages"...
    groupView: 'tabs',        // 'headers' (default) | 'tabs'
    visibleProperties: ['name', 'email'],
});
```

## Features

- **Zero dependencies** -- no jQuery or other libraries required
- **Auto-discovery** -- any `<input class="flexdatalist">` initialises on `DOMContentLoaded`
- **Remote data** -- fetch results from any URL using native `fetch()`, with GET or POST support
- **Static data** -- pass an array of objects or a URL to a static JSON file
- **`<datalist>` support** -- reads `<option>` elements from a linked datalist
- **Multiple values** -- tag-style input with add, remove, toggle, collapse, and paste support
- **Result grouping** -- group results by any property with headers (default) or tabs, with item counts
- **Keyboard navigation** -- arrow keys, Enter, Escape, Backspace, Tab
- **Search modes** -- starts-with, contains, exact match, word-by-word, or fully server-side
- **Accent-insensitive** -- diacritics are stripped before comparison (NFD normalisation)
- **Custom normaliser** -- plug in your own `normalizeString` function
- **Keyword highlighting** -- matched text is wrapped in `<span class="highlight">`
- **localStorage caching** -- cache remote and search results with configurable TTL and automatic garbage collection
- **Chained relatives** -- link inputs so their values are sent with every request, optionally read-only until a relative has a value
- **Theming via CSS custom properties** -- override `--fdl-accent`, `--fdl-tag-bg`, etc.
- **Dialog support** -- dropdown positions correctly inside `<dialog>` elements
- **ARIA attributes** -- `aria-autocomplete`, `aria-expanded`, `aria-owns`, `role="listbox"` on results
- **Async-ready** -- `Flexdatalist.init()` and `instance.ready` return Promises
- **Chainable public API** -- `setValue()`, `addValue()`, `removeValue()`, `clear()`, `disable()`, `enable()`, `search()`, etc.

## Options

All options can be set via the constructor, via `data-*` attributes (camelCase becomes kebab-case), or at runtime with `setOption()` (except `multiple`, `classPrefix` and `resultsContainer`, which need a new instance).

**Nested properties.** Every option that names an item property (`searchIn`, `textProperty`, `valueProperty`, `visibleProperties`, `iconProperty`, `groupBy`, `resultsProperty` and `{placeholder}` patterns) also takes a dotted path into nested objects:

```js
// { name: 'Ana', office: { city: { name: 'Lisboa' } }, employee: { number: 'E-101' } }
Flexdatalist.init('#people', {
    data: people,
    searchIn: ['name', 'office.city.name'],
    visibleProperties: ['name', 'office.city.name'],
    valueProperty: 'employee.number',
    textProperty: '{name} ({office.city.name})',
});
```

### Data Source

| Option | Type | Default | Description |
|---|---|---|---|
| `url` | `string\|null` | `null` | Remote URL to fetch results from |
| `data` | `array\|string` | `[]` | Static data array or URL to a JSON file |
| `params` | `object\|function` | `{}` | Extra params sent with every request (or a `(keyword) => object` function) |
| `relatives` | `string\|NodeList\|null` | `null` | CSS selector of inputs whose values are sent as `relatives[name]` |
| `chainedRelatives` | `boolean` | `false` | Make this input read-only while all relatives are empty (its value is still submitted) |
| `resultsProperty` | `string` | `'results'` | Key in the JSON response holding the results array |

### Search

| Option | Type | Default | Description |
|---|---|---|---|
| `minLength` | `number` | `3` | Minimum characters before searching (0 = show all on focus) |
| `searchIn` | `string[]` | `['label']` | Properties to search within each item |
| `searchContain` | `boolean` | `false` | Match anywhere in the string (not just the start) |
| `searchEqual` | `boolean` | `false` | Require exact full-string match |
| `searchByWord` | `boolean` | `false` | Split keyword on spaces, match all words independently |
| `searchDisabled` | `boolean` | `false` | Skip local filtering (rely on server-side search) |
| `searchDelay` | `number` | `300` | Debounce delay in ms |
| `normalizeString` | `function\|null` | `null` | Custom `(string) => string` normaliser |

### Display

| Option | Type | Default | Description |
|---|---|---|---|
| `textProperty` | `string\|null` | `null` | Property or `{placeholder}` pattern for display text |
| `valueProperty` | `string\|string[]\|null` | `null` | Property stored as the value (`'*'` = entire object as JSON) |
| `visibleProperties` | `string[]` | `[]` | Properties rendered in each result item |
| `iconProperty` | `string` | `'thumb'` | Property containing an image URL |
| `groupBy` | `string\|false` | `false` | Property to group results by |
| `groupView` | `'headers'\|'tabs'` | `'headers'` | Grouped results renderer (requires `groupBy`) |
| `maxShownResults` | `number` | `100` | Maximum results rendered (0 = unlimited) |
| `focusFirstResult` | `boolean` | `false` | Auto-activate the first result |
| `noResultsText` | `string` | `'No results found for "{keyword}"'` | Message when no results match |
| `resultsLoader` | `string\|null` | `null` | URL of a loading spinner image |

### Multiple Values

| Option | Type | Default | Description |
|---|---|---|---|
| `multiple` | `boolean\|null` | `null` | Enable tag input (inferred from `[multiple]` attribute) |
| `limitOfValues` | `number` | `0` | Maximum number of tags (0 = unlimited) |
| `valuesSeparator` | `string` | `','` | Separator for serialising multiple values |
| `allowDuplicateValues` | `boolean` | `false` | Allow the same value more than once |
| `removeOnBackspace` | `boolean` | `true` | Backspace removes the last tag |
| `toggleSelected` | `boolean` | `false` | Click a tag to toggle its enabled/disabled state |
| `collapseAfterN` | `number\|false` | `50` | Collapse tags after N items into a "{count} More" control |
| `collapsedValuesText` | `string` | `'{count} More'` | Label for the collapse toggle |

### Behaviour

| Option | Type | Default | Description |
|---|---|---|---|
| `selectionRequired` | `boolean` | `false` | Require selecting a result (disables free-text) |
| `disabled` | `boolean\|null` | `null` | Start disabled (inferred from `[disabled]` attribute) |
| `showAddNewItem` | `boolean` | `false` | Show "Add new item" option when no results match |
| `addNewItemText` | `string` | `'No results found for "{keyword}". Click to add it.'` | Text for the add-new option |

### Request

| Option | Type | Default | Description |
|---|---|---|---|
| `requestType` | `string` | `'get'` | HTTP method (`'get'` or `'post'`) |
| `requestContentType` | `string` | `'x-www-form-urlencoded'` | POST content type (`'x-www-form-urlencoded'` or `'json'`) |
| `requestHeaders` | `object\|null` | `null` | Extra HTTP headers for every request |
| `keywordParamName` | `string` | `'keyword'` | Query parameter name for the typed keyword |
| `searchContainParamName` | `string` | `'contain'` | Query parameter name for the searchContain flag |

#### Request parameters

Every remote request sends the keyword (`keyword`), the `contain` flag, `selected` (current value) and `original` (initial value) as strings, plus your `params`. When values are being resolved (an initial value or `setValue()` with a `valueProperty`), they are sent in `load`. GET query strings and urlencoded POST bodies encode nested data with bracket keys, like jQuery's `$.param`:

```
keyword=Lis&contain=false&selected=1,2&original=1,2
&load[]=1&load[]=2
&relatives[country]=PT
&tags[]=a&tags[]=b&filter[active]=true
```

PHP, Rails or Express (`qs`) read these back as arrays/objects (`$_GET['load']` is an array). With `requestContentType: 'json'` the same data is sent as a JSON body.

### Cache

| Option | Type | Default | Description |
|---|---|---|---|
| `cache` | `boolean` | `true` | Enable localStorage caching |
| `cacheLifetime` | `number` | `60` | Cache TTL in seconds |

## Public API

All setter methods return `this` for chaining.

```js
const [fd] = await Flexdatalist.init('#input', options);
```

| Method | Description |
|---|---|
| `getValue()` | Get the current value (string, array, or object depending on mode) |
| `getText(format?)` | Get the user-facing display text. Single mode returns a `string`. Multiple mode: `'array'` (default) returns `string[]`; `'string'` joins with `valuesSeparator`; any other string is used as a custom separator |
| `setValue(val)` | Replace the current value |
| `addValue(val)` | Append value(s) in multiple mode |
| `removeValue(val)` | Remove a specific tag in multiple mode |
| `toggleValue(val)` | Toggle a tag's disabled state (when `toggleSelected` is on) |
| `clear()` | Clear all values and reset the input |
| `disable()` | Disable the widget |
| `enable()` | Enable the widget |
| `readonly(state)` | Set or query the readonly state |
| `isDisabled()` | Check if disabled |
| `isReadonly()` | Check if readonly |
| `search(keyword)` | Programmatically trigger a search |
| `closeResults()` | Close the results dropdown |
| `getOption(name)` | Get an option value |
| `setOption(name, value)` | Set an option value at runtime (normalised and applied like constructor options; `multiple`, `classPrefix` and `resultsContainer` need a new instance) |
| `on(event, handler)` | Subscribe to an event |
| `off(event, handler)` | Unsubscribe from an event |
| `destroy(clear?)` | Destroy the instance and restore the original input |

### Static Methods

| Method | Description |
|---|---|
| `Flexdatalist.init(selector, options)` | Initialise one or more inputs (returns `Promise<Flexdatalist[]>`) |
| `Flexdatalist.getInstance(el)` | Get the instance attached to an element |

## Events

Events are dispatched as native `CustomEvent` on the original `<input>` element. The payload is in `e.detail`.

| Event | Payload | Description |
|---|---|---|
| `init:flexdatalist` | options | Widget initialised |
| `select:flexdatalist` | item | A result was selected |
| `change:flexdatalist` | `{ value, text }` | Value changed |
| `clear:flexdatalist` | -- | Values were cleared |
| `addnew:flexdatalist` | keyword | "Add new item" was clicked |
| `before:flexdatalist.select` | item | Before selection is applied |
| `after:flexdatalist.select` | item | After selection is applied |
| `before:flexdatalist.value` | values | Before value extraction |
| `after:flexdatalist.value` | result | After value extraction |
| `before:flexdatalist.remove` | val | Before a tag is removed |
| `after:flexdatalist.remove` | `{ value, text }` | After a tag is removed |
| `before:flexdatalist.search` | `{ keywords, data }` | Before local filtering |
| `after:flexdatalist.search` | `{ keywords, data, results }` | After local filtering |
| `show:flexdatalist.results` | items | Results about to render |
| `shown:flexdatalist.results` | items | Results rendered |
| `item:flexdatalist.results` | item | A result `<li>` was created |
| `empty:flexdatalist.results` | text | No results found |
| `remove:flexdatalist.results` | -- | Dropdown being removed |
| `before:flexdatalist.data` | -- | Before data loading |
| `after:flexdatalist.data` | data | Data loaded |
| `error:flexdatalist` | `{ error, url }` | A remote request failed (network, HTTP or JSON error) |

## CSS Theming

Override CSS custom properties on any ancestor to theme the widget:

```css
:root {
    --fdl-accent:       #5a46df;   /* accent: tabs, focus, "add" option */
    --fdl-accent-fg:    #fff;      /* text on accent background */
    --fdl-accent-light: #e6e0ff;   /* keyword highlight background */
    --fdl-highlight-fg: #3b2aa8;   /* keyword highlight text */
    --fdl-hover-bg:     #f3f3f1;   /* hovered / keyboard-active result */
    --fdl-hover-fg:     #17171a;   /* text of the active result */
    --fdl-tag-bg:       #efecfe;   /* tag background */
    --fdl-tag-border:   #d5cefb;   /* tag border */
    --fdl-tag-fg:       #4936c8;   /* tag text */
    --fdl-radius:       0.625rem;  /* border radius */
    --fdl-item-radius:  0.5rem;    /* result item radius */
    --fdl-icon-size:    1.75rem;   /* thumbnail size (iconProperty) */
    --fdl-icon-radius:  0.375rem;  /* thumbnail radius; 50% for round */
    --fdl-font-size:    0.875rem;  /* base font size */
    --fdl-shadow:       0 2px 4px rgba(23,23,26,.05),
                        0 16px 40px -12px rgba(23,23,26,.18);
}
```

Surface colours (`--fdl-bg`, `--fdl-border`, `--fdl-text`, `--fdl-text-muted`, `--fdl-group-bg`, `--fdl-disabled-bg`, `--fdl-scrollbar`) have light and dark values. Dark mode follows the OS, or `data-theme="dark"` / the `.fdl-dark` class on an ancestor.

Thumbnails from `iconProperty` are sized by the default CSS. Change them with `.flexdatalist-results { --fdl-icon-size: 2rem; --fdl-icon-radius: 50%; }`, which works whatever order the stylesheets load in, or with your own rule such as `.flexdatalist-results li img.prop-thumb { … }`.

## Migrating from v2 (jQuery)

| v2 (jQuery) | v3 (Standalone) |
|---|---|
| `$('#input').flexdatalist(options)` | `await Flexdatalist.init('#input', options)` |
| `$('#input').on('select:flexdatalist', fn)` | `fd.on('select:flexdatalist', fn)` |
| `$('#input').flexdatalist('value')` | `fd.getValue()` |
| `$('#input').flexdatalist('value', val)` | `fd.setValue(val)` |
| `$('#input').flexdatalist('destroy')` | `fd.destroy()` |
| `jquery.flexdatalist.js` + `jquery.flexdatalist.css` | `flexdatalist.js` + `flexdatalist.css` |
| jQuery `$.ajax` | Native `fetch()` |
| jQuery events | Native `CustomEvent` (same event names) |

CSS class names are backwards-compatible -- swap the stylesheet and it works.

## Using with React, Vue or Svelte

There's no adapter package: a component that owns one `<input>` is enough. Every framework follows the same four steps:

1. Render an `<input>` inside a wrapper element that only this component uses. Flexdatalist adds its own elements next to the input, and the wrapper keeps them out of the framework's way.
2. On mount, set the initial value, add your listeners, then create the instance with `new Flexdatalist(input, options)`. Add the listeners first, because the constructor can already fire `init`/`change` events. Create the instance synchronously, so that unmounting early can still destroy it.
3. Read changes from `change:flexdatalist`. `event.detail.value` is always the string the form submits: comma-separated in `multiple` mode, JSON with `valueProperty: '*'`. It also fires while the initial value loads, and `setValue()` reports `''` (the clear) before the new value, so handlers should be idempotent.
4. On unmount, call `instance.destroy()`.

The components below are uncontrolled: the value goes in once and comes out through the change callback. To change the value from outside later, keep the instance and call `instance.setValue(value)`. Skip that call when the value is already the one the input holds, otherwise you get a needless clear/change cycle.

### React

```jsx
import { useEffect, useRef } from 'react';
import Flexdatalist from 'flexdatalist';
import 'flexdatalist/css';

export function CityPicker({ name, defaultValue = '', onChange }) {
    const inputRef = useRef(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        const input = inputRef.current;
        input.value = defaultValue;

        const handleChange = (event) => onChangeRef.current?.(event.detail.value);
        input.addEventListener('change:flexdatalist', handleChange);

        const instance = new Flexdatalist(input, {
            url: '/api/cities',
            minLength: 2,
            searchIn: ['name'],
            valueProperty: 'id',
        });

        return () => {
            input.removeEventListener('change:flexdatalist', handleChange);
            instance.destroy();
        };
    }, []);

    return (
        <div>
            <input ref={inputRef} type="text" name={name} />
        </div>
    );
}
```

The empty dependency array means the options are read once. To apply new options, give the component a `key` that changes with them so React recreates it. StrictMode's mount/unmount/mount works, because each mount creates its own instance and destroys it.

### Vue 3

```vue
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import Flexdatalist from 'flexdatalist';
import 'flexdatalist/css';

const props = defineProps({
    modelValue: { type: String, default: '' },
    name: { type: String, default: null },
});
const emit = defineEmits(['update:modelValue']);

const inputRef = ref(null);
let instance = null;

function handleChange(event) {
    emit('update:modelValue', event.detail.value);
}

onMounted(() => {
    const input = inputRef.value;
    input.value = props.modelValue;
    input.addEventListener('change:flexdatalist', handleChange);

    instance = new Flexdatalist(input, {
        url: '/api/cities',
        minLength: 2,
        searchIn: ['name'],
        valueProperty: 'id',
    });
});

onBeforeUnmount(() => {
    inputRef.value?.removeEventListener('change:flexdatalist', handleChange);
    instance?.destroy();
    instance = null;
});
</script>

<template>
    <div>
        <input ref="inputRef" type="text" :name="name" />
    </div>
</template>
```

Use it with `<CityPicker v-model="cityId" name="city_id" />`. Here `v-model` carries changes out of the component. The initial value is read once, on mount.

### Svelte

```svelte
<script>
    import { onMount } from 'svelte';
    import Flexdatalist from 'flexdatalist';
    import 'flexdatalist/css';

    export let value = '';
    export let name = null;

    let inputElement;

    onMount(() => {
        inputElement.value = value;

        const handleChange = (event) => { value = event.detail.value; };
        inputElement.addEventListener('change:flexdatalist', handleChange);

        const instance = new Flexdatalist(inputElement, {
            url: '/api/cities',
            minLength: 2,
            searchIn: ['name'],
            valueProperty: 'id',
        });

        return () => {
            inputElement.removeEventListener('change:flexdatalist', handleChange);
            instance.destroy();
        };
    });
</script>

<div>
    <input bind:this={inputElement} type="text" {name} />
</div>
```

Use it with `<CityPicker bind:value={cityId} name="city_id" />`. This works in Svelte 4 and in Svelte 5 (legacy component syntax).

## Demo & Documentation

Check out the [examples and documentation](http://projects.sergiodinislopes.pt/flexdatalist/) page.

Using an AI coding assistant? Point it at [`packages/core/llms.txt`](packages/core/llms.txt), a compact reference with the server response format, all options and the most common integration mistakes. It is also shipped in the npm package.

## Development

```bash
pnpm install
pnpm build   # build every package
pnpm test    # run the core test suite (Vitest + happy-dom)
```

### Demo page tests

`pnpm test:demos` opens [`docs/examples.html`](docs/examples.html) in headless Chromium and uses every demo the way a person would: typing, clicking, the keyboard and pasting. It then checks the stored values, the displayed text, the requests received by the page's simulated server, and the browser console. The demos load `packages/core/src` directly, so no build is needed.

```bash
pnpm exec playwright install chromium   # once, downloads the browser
pnpm test:demos                         # every demo
pnpm test:demos -- remote               # only tests whose name contains "remote"
```

When you add or change a demo, add or update its test in [`tests/demos.test.mjs`](tests/demos.test.mjs).

### Publishing the docs

On the website the docs pages sit at the site root, next to a `core/` folder with the plugin. `pnpm docs:build` writes that layout to `docs-dist/`, rewriting the `../packages/core/src/` paths to `core/`:

```
docs-dist/
  index.html, examples.html, docs.css, docs.js, demo-api.js, demo-data.js, countries.json
  llms.txt
  core/flexdatalist.js
  core/flexdatalist.css
```

Upload the contents of `docs-dist/` to the site root as they are. `pnpm test:docs-build` builds the folder and runs every demo test against it, served the way the website serves it.

```bash
pnpm docs:build        # writes docs-dist/
pnpm test:docs-build   # builds, then tests the built site
```

## License

Flexdatalist is licensed under the [MIT license](http://opensource.org/licenses/MIT).

Copyright (c) 2016 -- 2026 [Sergio Dinis Lopes](https://github.com/sergiodlopes)
