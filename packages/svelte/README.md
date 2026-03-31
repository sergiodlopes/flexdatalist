# flexdatalist-svelte

Svelte adapter for the [Flexdatalist](https://github.com/sergiodlopes/flexdatalist) autocomplete / tag input.

## Install

```bash
npm install flexdatalist flexdatalist-svelte
```

## Usage

```svelte
<script>
    import { Flexdatalist } from 'flexdatalist-svelte';
    import 'flexdatalist/css';

    let city = '';
</script>

<Flexdatalist
    bind:value={city}
    url="/api/cities"
    minLength={2}
    placeholder="Search for a city..."
    on:select={(e) => console.log('Selected:', e.detail)}
/>

<p>Selected: {city}</p>
```

## Props

All [Flexdatalist options](https://github.com/sergiodlopes/flexdatalist) are available as props:

```svelte
<Flexdatalist
    bind:value
    url="/api/search"
    data={staticItems}
    minLength={1}
    multiple={true}
    searchContain={true}
    selectionRequired={true}
    textProperty="name"
    valueProperty="id"
    placeholder="Search..."
    name="my-field"
    inputClass="my-input-class"
/>
```

## Events

All Flexdatalist events are re-dispatched with shortened names. Access data via `e.detail`.

| Flexdatalist event | Svelte event |
|---|---|
| `select:flexdatalist` | `on:select` |
| `change:flexdatalist` | `on:change` |
| `clear:flexdatalist` | `on:clear` |
| `addnew:flexdatalist` | `on:addnew` |
| `before:flexdatalist.search` | `on:beforesearch` |
| `after:flexdatalist.search` | `on:aftersearch` |
| `show:flexdatalist.results` | `on:showresults` |

Plus: `on:init`, `on:beforevalue`, `on:aftervalue`, `on:beforeselect`, `on:afterselect`, `on:beforeremove`, `on:afterremove`, `on:beforeremoveall`, `on:afterremoveall`, `on:beforetoggle`, `on:aftertoggle`, `on:beforedata`, `on:afterdata`, `on:shownresults`, `on:itemresult`, `on:emptyresults`, `on:removeresults`, `on:removedresults`.

## Component methods

Access the underlying Flexdatalist instance via `bind:this`:

```svelte
<script>
    import { Flexdatalist } from 'flexdatalist-svelte';

    let fd;
</script>

<Flexdatalist bind:this={fd} url="/api/cities" />
<button on:click={() => fd.search('paris')}>Search Paris</button>
```

Available methods: `getInstance()`, `getValue()`, `setValue(val)`, `addValue(val)`, `removeValue(val)`, `toggleValue(val)`, `clear()`, `getText(format)`, `search(keyword)`, `closeResults()`, `disable()`, `enable()`, `setReadonly(state)`.

## License

MIT
