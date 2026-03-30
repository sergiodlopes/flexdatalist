# Flexdatalist

Flexdatalist is a standalone (zero-dependency) autocomplete / datalist input widget written in modern ES6+. It supports remote & static data, multiple-value tags, grouping, keyboard navigation, localStorage caching, and a clean chainable API.

**v3 is a complete rewrite — jQuery is no longer required.**

> Looking for the jQuery version? See the [`v2` branch](https://github.com/sergiodlopes/flexdatalist/tree/v2).

## Quick start

```html
<link rel="stylesheet" href="flexdatalist.css">
<script src="flexdatalist.js"></script>

<input type="text" class="flexdatalist" data-url="/api/cities" data-min-length="2">
```

Auto-discovery works out of the box: any `<input class="flexdatalist">` is initialised on `DOMContentLoaded`.

### Programmatic initialisation

```js
const [fd] = await Flexdatalist.init('#city', {
    url: '/api/cities',
    minLength: 2,
    multiple: true,
});

fd.on('select:flexdatalist', e => console.log(e.detail));
```

## Demo & Documentation

Check out the [examples and documentation](http://projects.sergiodinislopes.pt/flexdatalist/) page.

## License

Flexdatalist is licensed under the [MIT license](http://opensource.org/licenses/MIT).

Copyright (c) 2016 – 2026 [Sérgio Dinis Lopes](https://github.com/sergiodlopes)
