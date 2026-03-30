# Flexdatalist

Flexdatalist is a standalone (zero-dependency) autocomplete / datalist input widget written in modern ES6+. It supports remote and static data sources, `<datalist>` elements, multiple-value tag input, result grouping, keyboard navigation, localStorage caching, and a clean chainable API.

**v3 is a complete rewrite -- jQuery is no longer required.**

> Looking for the jQuery version? See the [`v2` branch](https://github.com/sergiodlopes/flexdatalist/tree/v2).

## Quick Start

Include the CSS and JS files:

```html
<link rel="stylesheet" href="flexdatalist.css">
<script src="flexdatalist.js"></script>
```

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

## Features

- **Zero dependencies** -- no jQuery or other libraries required
- **Auto-discovery** -- any `<input class="flexdatalist">` initialises on `DOMContentLoaded`
- **Remote data** -- fetch results from any URL using native `fetch()`, with GET or POST support
- **Static data** -- pass an array of objects or a URL to a static JSON file
- **`<datalist>` support** -- reads `<option>` elements from a linked datalist
- **Multiple values** -- tag-style input with add, remove, toggle, collapse, and paste support
- **Result grouping** -- group results by any property with headers and item counts
- **Keyboard navigation** -- arrow keys, Enter, Escape, Backspace, Tab
- **Search modes** -- starts-with, contains, exact match, word-by-word, or fully server-side
- **Accent-insensitive** -- diacritics are stripped before comparison (NFD normalisation)
- **Custom normaliser** -- plug in your own `normalizeString` function
- **Keyword highlighting** -- matched text is wrapped in `<span class="highlight">`
- **localStorage caching** -- cache remote and search results with configurable TTL and automatic garbage collection
- **Chained relatives** -- link inputs so their values are sent with every request, with optional auto-disable
- **Theming via CSS custom properties** -- override `--fdl-accent`, `--fdl-tag-bg`, etc.
- **Dialog support** -- dropdown positions correctly inside `<dialog>` elements
- **ARIA attributes** -- `aria-autocomplete`, `aria-expanded`, `aria-owns`, `role="listbox"` on results
- **Async-ready** -- `Flexdatalist.init()` and `instance.ready` return Promises
- **Chainable public API** -- `setValue()`, `addValue()`, `removeValue()`, `clear()`, `disable()`, `enable()`, `search()`, etc.

## Options

All options can be set via the constructor, via `data-*` attributes (camelCase becomes kebab-case), or at runtime with `setOption()`.

### Data Source

| Option | Type | Default | Description |
|---|---|---|---|
| `url` | `string\|null` | `null` | Remote URL to fetch results from |
| `data` | `array\|string` | `[]` | Static data array or URL to a JSON file |
| `params` | `object\|function` | `{}` | Extra params sent with every request (or a `(keyword) => object` function) |
| `relatives` | `string\|NodeList\|null` | `null` | CSS selector of inputs whose values are sent as `relatives[name]` |
| `chainedRelatives` | `boolean` | `false` | Disable this input when all relatives are empty |
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
| `redoSearchOnFocus` | `boolean` | `true` | Re-trigger search when the input re-gains focus |
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
| `setOption(name, value)` | Set an option value at runtime |
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

## CSS Theming

Override CSS custom properties on any ancestor to theme the widget:

```css
:root {
    --fdl-accent:       #6366f1;   /* highlight / active color */
    --fdl-accent-fg:    #fff;      /* text on accent background */
    --fdl-accent-light: #eef2ff;   /* soft tint for keyword highlight */
    --fdl-tag-bg:       #eef2ff;   /* tag background */
    --fdl-tag-border:   #c7d2fe;   /* tag border */
    --fdl-tag-fg:       #4338ca;   /* tag text */
    --fdl-radius:       0.5rem;    /* border radius */
    --fdl-font-size:    0.875rem;  /* base font size */
    --fdl-shadow:       0 4px 6px -1px rgba(0,0,0,.08),
                        0 10px 25px -3px rgba(0,0,0,.08);
}
```

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

## Demo & Documentation

Check out the [examples and documentation](http://projects.sergiodinislopes.pt/flexdatalist/) page.

## License

Flexdatalist is licensed under the [MIT license](http://opensource.org/licenses/MIT).

Copyright (c) 2016 -- 2026 [Sergio Dinis Lopes](https://github.com/sergiodlopes)
