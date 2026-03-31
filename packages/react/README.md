# flexdatalist-react

React adapter for the [Flexdatalist](https://github.com/sergiodlopes/flexdatalist) autocomplete / tag input.

## Install

```bash
npm install flexdatalist flexdatalist-react
```

## Usage

```jsx
import { useRef } from 'react';
import { Flexdatalist } from 'flexdatalist-react';
import 'flexdatalist/css';

function CityPicker() {
    const ref = useRef(null);

    return (
        <Flexdatalist
            ref={ref}
            url="/api/cities"
            minLength={2}
            placeholder="Search for a city..."
            onSelect={(item) => console.log('Selected:', item)}
            onChange={({ value, text }) => console.log('Value:', value)}
        />
    );
}
```

## Props

All [Flexdatalist options](https://github.com/sergiodlopes/flexdatalist) are available as props:

```jsx
<Flexdatalist
    value={currentValue}
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
    className="my-input-class"
/>
```

## Event callbacks

All Flexdatalist events are available as callback props. Each receives `(detail, event)`.

| Flexdatalist event | React prop |
|---|---|
| `select:flexdatalist` | `onSelect` |
| `change:flexdatalist` | `onChange` |
| `clear:flexdatalist` | `onClear` |
| `addnew:flexdatalist` | `onAddNew` |
| `before:flexdatalist.search` | `onBeforeSearch` |
| `after:flexdatalist.search` | `onAfterSearch` |
| `show:flexdatalist.results` | `onShowResults` |

Plus: `onInit`, `onBeforeValue`, `onAfterValue`, `onBeforeSelect`, `onAfterSelect`, `onBeforeRemove`, `onAfterRemove`, `onBeforeRemoveAll`, `onAfterRemoveAll`, `onBeforeToggle`, `onAfterToggle`, `onBeforeData`, `onAfterData`, `onShownResults`, `onItemResult`, `onEmptyResults`, `onRemoveResults`, `onRemovedResults`.

## Ref methods

Access the underlying Flexdatalist instance via a ref:

```jsx
import { useRef } from 'react';
import { Flexdatalist } from 'flexdatalist-react';

function App() {
    const fdRef = useRef(null);

    return (
        <>
            <Flexdatalist ref={fdRef} url="/api/cities" />
            <button onClick={() => fdRef.current.search('paris')}>
                Search Paris
            </button>
        </>
    );
}
```

Available methods: `getInstance()`, `getValue()`, `setValue(val)`, `addValue(val)`, `removeValue(val)`, `toggleValue(val)`, `clear()`, `getText(format)`, `search(keyword)`, `closeResults()`, `disable()`, `enable()`, `readonly(state)`.

## License

MIT
