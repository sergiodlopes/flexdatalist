# flexdatalist-vue

Vue 3 adapter for the [Flexdatalist](https://github.com/sergiodlopes/flexdatalist) autocomplete / tag input.

## Install

```bash
npm install flexdatalist flexdatalist-vue
```

## Usage

```vue
<script setup>
import { ref } from 'vue';
import { Flexdatalist } from 'flexdatalist-vue';
import 'flexdatalist/css';

const city = ref('');
</script>

<template>
    <Flexdatalist
        v-model="city"
        url="/api/cities"
        :min-length="2"
        placeholder="Search for a city..."
        @select="(item) => console.log('Selected:', item)"
    />
</template>
```

## Props

All [Flexdatalist options](https://github.com/sergiodlopes/flexdatalist) are available as props:

```vue
<Flexdatalist
    v-model="value"
    url="/api/search"
    :data="staticItems"
    :min-length="1"
    :multiple="true"
    :search-contain="true"
    :selection-required="true"
    text-property="name"
    value-property="id"
    placeholder="Search..."
    name="my-field"
    input-class="my-input-class"
/>
```

## Events

All Flexdatalist events are re-emitted with shortened names. The `e.detail` payload is passed directly.

| Flexdatalist event | Vue event |
|---|---|
| `select:flexdatalist` | `@select` |
| `change:flexdatalist` | `@change` |
| `clear:flexdatalist` | `@clear` |
| `addnew:flexdatalist` | `@addnew` |
| `before:flexdatalist.search` | `@before-search` |
| `after:flexdatalist.search` | `@after-search` |
| `show:flexdatalist.results` | `@show-results` |

Plus: `@init`, `@before-value`, `@after-value`, `@before-select`, `@after-select`, `@before-remove`, `@after-remove`, `@before-remove-all`, `@after-remove-all`, `@before-toggle`, `@after-toggle`, `@before-data`, `@after-data`, `@shown-results`, `@item-result`, `@empty-results`, `@remove-results`, `@removed-results`.

## Ref methods

Access the underlying Flexdatalist instance via a template ref:

```vue
<script setup>
import { ref } from 'vue';
import { Flexdatalist } from 'flexdatalist-vue';

const fdRef = ref(null);

function doSearch() {
    fdRef.value.search('paris');
}
</script>

<template>
    <Flexdatalist ref="fdRef" url="/api/cities" />
    <button @click="doSearch">Search Paris</button>
</template>
```

Available methods: `getInstance()`, `getValue()`, `setValue(val)`, `addValue(val)`, `removeValue(val)`, `toggleValue(val)`, `clear()`, `getText(format)`, `search(keyword)`, `closeResults()`, `disable()`, `enable()`, `readonly(state)`.

## License

MIT
