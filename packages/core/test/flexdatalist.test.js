import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Flexdatalist from '../src/flexdatalist.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const created = [];

/** Create an instance and remember it so afterEach() can destroy it. */
function make(target, options = {}) {
    const instance = new Flexdatalist(target, { cache: false, ...options });
    created.push(instance);
    return instance;
}

const wait = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

/** Simulate the user typing `text` into the alias (fires `input`). */
function type(instance, text) {
    instance._alias.value = text;
    instance._alias.dispatchEvent(new Event('input', { bubbles: true }));
}

function key(target, type, keyName) {
    target.dispatchEvent(new KeyboardEvent(type, { key: keyName, bubbles: true, cancelable: true }));
}

function press(target, keyName) {
    key(target, 'keydown', keyName);
    key(target, 'keyup', keyName);
}

const resultTexts = () => [...document.querySelectorAll('.flexdatalist-results li.item')].map(li => li.textContent.trim());

/** A fetch mock answering every request with `body` (or calling `respond(url, options)`). */
function mockFetch(respond) {
    const calls = [];
    vi.stubGlobal('fetch', vi.fn((url, options) => {
        calls.push({ url, options });
        const body = typeof respond === 'function' ? respond(url, options) : respond;
        if (body instanceof Error) return Promise.reject(body);
        if (body?.status) return Promise.resolve({ ok: false, status: body.status, statusText: '', json: () => Promise.reject(new SyntaxError('not json')) });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
    }));
    return calls;
}

const CITIES = [
    { id: 1, label: 'Paris' },
    { id: 2, label: 'Porto' },
    { id: 3, label: 'Lisboa' },
];

beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
});

afterEach(() => {
    while (created.length) created.pop().destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('rendering', () => {
    it('escapes item data (no HTML injection)', () => {
        document.body.innerHTML = '<input id="t">';
        const fd = make('#t', {
            data: [{ label: 'Par<img src=x onerror=alert(1)>is', city: '<b>x</b>' }],
            visibleProperties: ['label', '<em>{city}</em>'],
            minLength: 1,
        });
        fd.search('Par');
        const item = document.querySelector('.flexdatalist-results li.item');
        expect(item.querySelector('img')).toBeNull();
        expect(item.querySelector('b')).toBeNull();
        expect(item.querySelector('em')).not.toBeNull(); // developer markup is kept
        expect(item.querySelector('.highlight').textContent).toBe('Par');
    });

    it('ignores _highlight fields in the data (no HTML injection)', () => {
        document.body.innerHTML = '<input id="t">';
        window.__highlightInjected = false;
        const fd = make('#t', {
            data: [
                { label: 'Paris', label_highlight: '<img src=x onerror="window.__highlightInjected = true">' },
                { label: 'Porto', city: 'Porto', city_highlight: '<b>bold</b>' },
            ],
            searchIn: ['label'], visibleProperties: ['label', 'city'], minLength: 1,
        });
        fd.search('xyz'); // no match: nothing rendered
        fd.search('P');
        const items = [...document.querySelectorAll('.flexdatalist-results li.item')];
        expect(items).toHaveLength(2);
        for (const item of items) {
            expect(item.querySelector('img')).toBeNull();
            expect(item.querySelector('b')).toBeNull();
        }
        expect(items[0].querySelector('.highlight').textContent).toBe('P'); // the plugin's own highlight still works
        expect(items[1].querySelector('.prop-city').textContent.trim()).toBe('Porto');
        expect(window.__highlightInjected).toBe(false);
    });

    it('still passes <property>_highlight to item:flexdatalist.results listeners', () => {
        document.body.innerHTML = '<input id="t">';
        const fd = make('#t', { data: CITIES, minLength: 1 });
        const highlights = [];
        fd.on('item:flexdatalist.results', event => highlights.push(event.detail.label_highlight));
        fd.search('Par');
        expect(highlights).toEqual(['<span class="highlight">Par</span>is']);
    });

    it('removes the dropdown instead of leaving it blank when noResultsText is empty', () => {
        document.body.innerHTML = '<input id="t">';
        const fd = make('#t', { data: CITIES, noResultsText: '' });
        fd.search('Pa');
        fd.search('zzz');
        expect(document.querySelectorAll('.flexdatalist-results')).toHaveLength(0);
    });

    it('still offers "add new item" when noResultsText is empty', () => {
        document.body.innerHTML = '<input id="t">';
        const fd = make('#t', { data: CITIES, noResultsText: '', showAddNewItem: true });
        fd.search('zzz');
        expect(document.querySelector('.add-new-item')).not.toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

describe('search', () => {
    it('searchByWord requires every word', () => {
        document.body.innerHTML = '<input id="t">';
        const fd = make('#t', { searchIn: ['city', 'state'], searchByWord: true });
        const data = [
            { city: 'New York', state: 'New York' },
            { city: 'Newark', state: 'New Jersey' },
            { city: 'York', state: 'Pennsylvania' },
        ];
        const search = keyword => { let found; fd._searchGet(keyword, data, matches => { found = matches.map(m => m.city); }); return found; };
        expect(search('new york')).toEqual(['New York']);
        expect(search('new jersey')).toEqual(['Newark']);
        expect(search('new  york')).toEqual(['New York']);
    });

    it('does not share local results between instances', async () => {
        document.body.innerHTML = '<input id="a"><input id="b">';
        const a = make('#a', { data: [{ label: 'Paris' }], minLength: 1, searchDelay: 1, cache: true });
        const b = make('#b', { data: [{ label: 'Pequim' }], minLength: 1, searchDelay: 1, cache: true });
        type(a, 'P'); await wait(20);
        expect(resultTexts()).toEqual(['Paris']);
        a.closeResults();
        type(b, 'P'); await wait(20);
        expect(resultTexts()).toEqual(['Pequim']);
    });

    it('does not reopen the results on Escape or modifier keys', async () => {
        document.body.innerHTML = '<input id="t">';
        const fd = make('#t', { data: CITIES, minLength: 1, searchDelay: 5 });
        fd._alias.focus();
        type(fd, 'P'); await wait(30);
        expect(document.querySelector('.flexdatalist-results')).not.toBeNull();
        press(fd._alias, 'Escape'); await wait(30);
        expect(document.querySelector('.flexdatalist-results')).toBeNull();
        press(fd._alias, 'Shift'); await wait(30);
        expect(document.querySelector('.flexdatalist-results')).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Option attributes (fdl-*, data-fdl-*, data-*)
// ---------------------------------------------------------------------------

describe('option attributes', () => {
    it('reads options from fdl-* attributes', () => {
        document.body.innerHTML = '<input id="t" fdl-min-length="2" fdl-search-in="name,city" fdl-value-property="id">';
        const fd = make('#t');
        expect(fd.getOption('minLength')).toBe(2);
        expect(fd.getOption('searchIn')).toEqual(['name', 'city']);
        expect(fd.getOption('valueProperty')).toBe('id');
    });

    it('reads options from data-fdl-* attributes', () => {
        document.body.innerHTML = '<input id="t" data-fdl-min-length="2" data-fdl-search-in="name">';
        const fd = make('#t');
        expect(fd.getOption('minLength')).toBe(2);
        expect(fd.getOption('searchIn')).toEqual(['name']);
    });

    it('still reads the v2 data-* attributes', () => {
        document.body.innerHTML = '<input id="t" data-min-length="2" data-search-in="name">';
        const fd = make('#t');
        expect(fd.getOption('minLength')).toBe(2);
        expect(fd.getOption('searchIn')).toEqual(['name']);
    });

    it('prefers fdl-* over data-fdl-* over data-*', () => {
        document.body.innerHTML = '<input id="a" fdl-min-length="1" data-fdl-min-length="2" data-min-length="3">'
            + '<input id="b" data-fdl-min-length="2" data-min-length="3">';
        expect(make('#a').getOption('minLength')).toBe(1);
        expect(make('#b').getOption('minLength')).toBe(2);
    });

    it('lets attributes override JS options', () => {
        document.body.innerHTML = '<input id="t" fdl-min-length="4">';
        expect(make('#t', { minLength: 1 }).getOption('minLength')).toBe(4);
    });

    // Auto-init runs on DOMContentLoaded, which has already passed here: it is
    // checked in a real browser by tests/demos.test.mjs (examples page).
});

// ---------------------------------------------------------------------------
// Nested properties (dotted paths)
// ---------------------------------------------------------------------------

describe('nested properties', () => {
    const PLACES = [
        { name: 'Lisboa', meta: { code: 'LIS', photo: { url: '/lis.jpg' } }, region: { country: { name: 'Portugal' } } },
        { name: 'Paris', meta: { code: 'PAR', photo: { url: '/par.jpg' } }, region: { country: { name: 'France' } } },
    ];

    it('loads an initial value through a dotted valueProperty', async () => {
        document.body.innerHTML = '<input id="t" value="PAR">';
        const fd = make('#t', { data: PLACES, searchIn: ['name'], valueProperty: 'meta.code' });
        await fd.ready;
        expect(fd._alias.value).toBe('Paris');
        expect(fd.getValue()).toBe('PAR');
    });

    it('resolves setValue() through a dotted valueProperty', async () => {
        document.body.innerHTML = '<input id="t">';
        const fd = make('#t', { data: PLACES, searchIn: ['name'], valueProperty: 'meta.code' });
        await fd.ready;
        fd.setValue('LIS');
        await wait(10);
        expect(fd._alias.value).toBe('Lisboa');
        expect(fd.getValue()).toBe('LIS');
    });

    it('highlights matches in a dotted searchIn property', () => {
        document.body.innerHTML = '<input id="t">';
        const fd = make('#t', {
            data: PLACES, searchIn: ['region.country.name'], textProperty: 'name',
            visibleProperties: ['name', 'region.country.name'], minLength: 1,
        });
        fd.search('Port');
        const item = document.querySelector('.flexdatalist-results li.item');
        expect(item.textContent).toContain('Lisboa');
        expect(item.querySelector('.highlight')?.textContent).toBe('Port');
    });

    it('shows the image of a dotted iconProperty', () => {
        document.body.innerHTML = '<input id="t">';
        const fd = make('#t', {
            data: PLACES, searchIn: ['name'], iconProperty: 'meta.photo.url',
            visibleProperties: ['meta.photo.url', 'name'], minLength: 1,
        });
        fd.search('Lis');
        const image = document.querySelector('.flexdatalist-results li.item img');
        expect(image.getAttribute('src')).toBe('/lis.jpg');
    });

    it('fills {placeholder} patterns from dotted paths', async () => {
        document.body.innerHTML = '<input id="t" value="LIS">';
        const fd = make('#t', {
            data: PLACES, searchIn: ['name'], valueProperty: 'meta.code',
            textProperty: '{name} ({region.country.name})',
        });
        await fd.ready;
        expect(fd._alias.value).toBe('Lisboa (Portugal)');
    });

    it('groups and labels by a dotted groupBy', () => {
        document.body.innerHTML = '<input id="t">';
        const fd = make('#t', { data: PLACES, searchIn: ['name'], groupBy: 'region.country.name', searchContain: true, minLength: 1 });
        fd.search('a');
        const headers = [...document.querySelectorAll('.flexdatalist-results li.group')].map(li => li.textContent.trim());
        expect(headers.join(' ')).toContain('Portugal');
        expect(headers.join(' ')).toContain('France');
    });
});

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

describe('values', () => {
    it('does not store search highlights in a JSON value', () => {
        document.body.innerHTML = '<input id="t">';
        const fd = make('#t', { data: CITIES, valueProperty: '*', selectionRequired: true, minLength: 1 });
        fd.search('Lis');
        document.querySelector('.flexdatalist-results li.item').click();
        expect(JSON.parse(fd._hiddenInput.value)).toEqual({ id: 3, label: 'Lisboa' });
    });

    it('keeps the selected value when non-editing keys are released', () => {
        document.body.innerHTML = '<input id="t">';
        const fd = make('#t', { data: CITIES, valueProperty: 'id', minLength: 1 });
        fd.search('Par');
        document.querySelector('.flexdatalist-results li.item').click();
        expect(fd._hiddenInput.value).toBe('1');
        key(fd._alias, 'keyup', 'Tab');
        key(fd._alias, 'keyup', 'ArrowLeft');
        expect(fd._hiddenInput.value).toBe('1');
    });

    it('copies same-length edits in free-text mode', () => {
        document.body.innerHTML = '<input id="t" value="Cat">';
        const fd = make('#t');
        type(fd, 'Bat');
        expect(fd.getValue()).toBe('Bat');
    });

    it('does not split a single value containing commas', () => {
        document.body.innerHTML = '<input id="t" value="1,2">';
        const fd = make('#t', { data: [...CITIES, { id: '1,2', label: 'Comma id' }], valueProperty: 'id' });
        expect(fd.getValue()).toBe('1,2');
        expect(fd.getText()).toBe('Comma id');
    });

    it('uses valuesSeparator for initial values, the tag key and paste', () => {
        document.body.innerHTML = '<input id="t" multiple value="1|2">';
        const fd = make('#t', { data: CITIES, valueProperty: 'id', valuesSeparator: '|' });
        expect(fd.getText()).toEqual(['Paris', 'Porto']);

        document.body.insertAdjacentHTML('beforeend', '<input id="free" multiple>');
        const free = make('#free', { valuesSeparator: '|' });
        free._alias.value = 'Lisboa, PT';
        key(free._alias, 'keydown', '|');
        const paste = new Event('paste', { bubbles: true, cancelable: true });
        paste.clipboardData = { getData: () => 'Porto, PT|Faro, PT\nBraga' };
        free._alias.dispatchEvent(paste);
        expect(free.getText()).toEqual(['Lisboa, PT', 'Porto, PT', 'Faro, PT', 'Braga']);
    });

    it('applies the initial value before init:flexdatalist fires', () => {
        document.body.innerHTML = '<input id="t" value="Paris">';
        const el = document.getElementById('t');
        let textAtInit;
        el.addEventListener('init:flexdatalist', () => { textAtInit = Flexdatalist.getInstance(el).getText(); });
        make(el, { data: CITIES });
        expect(textAtInit).toBe('Paris');
    });

    it('fires init:flexdatalist also without an initial value', () => {
        document.body.innerHTML = '<input id="t">';
        const listener = vi.fn();
        document.getElementById('t').addEventListener('init:flexdatalist', listener);
        make('#t');
        expect(listener).toHaveBeenCalledTimes(1);
    });
});

// ---------------------------------------------------------------------------
// Multiple values (tags)
// ---------------------------------------------------------------------------

describe('multiple values', () => {
    it('removes the right value when some tags are toggled off', () => {
        document.body.innerHTML = '<input id="t" multiple value="A,B,C">';
        const fd = make('#t', { toggleSelected: true });
        fd.toggleValue('A');
        expect(fd._hiddenInput.value).toBe('B,C');
        fd.removeValue('C');
        expect(fd._hiddenInput.value).toBe('B');
        expect(fd.getText()).toEqual(['A', 'B']);
    });

    it('stores toggled JSON values as objects, not strings', () => {
        document.body.innerHTML = '<input id="t" multiple>';
        const fd = make('#t', { toggleSelected: true, valueProperty: '*', selectionRequired: true });
        fd.addValue([{ id: 1, label: 'Paris' }, { id: 2, label: 'Porto' }]);
        fd.toggleValue(fd._multipleEl.querySelector('li.value').dataset.value);
        expect(JSON.parse(fd._hiddenInput.value)).toEqual([{ id: 2, label: 'Porto' }]);
    });

    it('keeps duplicate values with allowDuplicateValues and removes the clicked tag', () => {
        document.body.innerHTML = '<input id="t" multiple>';
        const fd = make('#t', { data: CITIES, allowDuplicateValues: true, minLength: 1 });
        fd.search('Par');
        document.querySelector('.flexdatalist-results li.item').click();
        fd.search('Par');
        document.querySelector('.flexdatalist-results li.item').click();
        fd.addValue('Lisboa');
        fd.addValue('Paris');
        expect(fd._hiddenInput.value).toBe('Paris,Paris,Lisboa,Paris');

        // The × of the last tag removes that tag, not the first "Paris".
        const tags = fd._multipleEl.querySelectorAll('li.value');
        tags[tags.length - 1].querySelector('.fdl-remove').click();
        expect(fd._hiddenInput.value).toBe('Paris,Paris,Lisboa');
        expect(fd.getText()).toEqual(['Paris', 'Paris', 'Lisboa']);
    });

    it('enforces limitOfValues for addValue() and paste', () => {
        document.body.innerHTML = '<input id="t" multiple>';
        const fd = make('#t', { limitOfValues: 3 });
        fd.addValue(['a', 'b', 'c', 'd']);
        const paste = new Event('paste', { bubbles: true, cancelable: true });
        paste.clipboardData = { getData: () => 'e,f' };
        fd._alias.dispatchEvent(paste);
        expect(fd.getValue()).toEqual(['a', 'b', 'c']);
    });

    it('refreshes the "N More" control when tags are removed', () => {
        document.body.innerHTML = '<input id="t" multiple>';
        const fd = make('#t', { collapseAfterN: 2 });
        fd.addValue(['a', 'b', 'c', 'd']);
        const control = () => fd._multipleEl.querySelector('.flexdatalist-collapsed-control')?.textContent ?? null;
        expect(control()).toBe('2 More');
        fd.removeValue('d');
        expect(control()).toBe('1 More');
        fd.removeValue('c');
        expect(control()).toBeNull();
    });

    it('Backspace marks the last tag first, then removes it', () => {
        document.body.innerHTML = '<input id="t" multiple value="a,b,c">';
        const fd = make('#t');
        press(fd._alias, 'Backspace');
        expect(fd.getValue()).toEqual(['a', 'b', 'c']);
        expect(fd._multipleEl.querySelector('li.value.marked').dataset.value).toBe('c');
        press(fd._alias, 'Backspace');
        expect(fd.getValue()).toEqual(['a', 'b']);
    });

    it('commits free text when focus leaves an input without id', async () => {
        document.body.innerHTML = '<input class="tags" multiple><button>next</button>';
        const fd = make('input.tags');
        fd._alias.focus();
        type(fd, 'foo');
        document.querySelector('button').focus();
        await wait(20);
        expect(fd.getValue()).toEqual(['foo']);
    });

    it('does not steal focus back after a selection', async () => {
        document.body.innerHTML = '<input id="tags" multiple><input id="other">';
        const fd = make('#tags', { data: CITIES, minLength: 1 });
        fd._alias.focus();
        fd.search('Pa');
        document.querySelector('.flexdatalist-results li.item').click();
        document.getElementById('other').focus();
        await wait(600);
        expect(document.activeElement.id).toBe('other');
    });

    it('clear() fires clear:flexdatalist when only toggled-off tags remain', () => {
        document.body.innerHTML = '<input id="t" multiple value="a">';
        const fd = make('#t', { toggleSelected: true });
        const listener = vi.fn();
        fd.on('clear:flexdatalist', listener);
        fd.toggleValue('a');
        fd.clear();
        expect(listener).toHaveBeenCalledTimes(1);
        expect(fd.getText()).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// Remote data
// ---------------------------------------------------------------------------

describe('remote data', () => {
    it('keeps every queued value load', async () => {
        mockFetch(() => new Promise(resolve => setTimeout(() => resolve({ results: [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }, { id: 'c', label: 'Gamma' }] }), 10)));
        document.body.innerHTML = '<input id="t" multiple>';
        const fd = make('#t', { url: '/api', valueProperty: 'id' });
        fd.addValue(['a', 'b', 'c']);
        await wait(100);
        expect(fd.getText()).toEqual(['Alpha', 'Beta', 'Gamma']);
    });

    it('resolves ready and dispatches error:flexdatalist on HTTP errors', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        mockFetch({ status: 500 });
        document.body.innerHTML = '<input id="t" value="1">';
        const errors = vi.fn();
        document.getElementById('t').addEventListener('error:flexdatalist', errors);
        const fd = make('#t', { url: '/api', valueProperty: 'id' });
        await expect(Promise.race([fd.ready.then(() => 'ready'), wait(300).then(() => 'hung')])).resolves.toBe('ready');
        expect(errors).toHaveBeenCalledTimes(1);
        expect(document.querySelector('.flexdatalist-fetch-animation')).toBeNull();
    });

    it('encodes relatives and nested params with bracket keys', async () => {
        const calls = mockFetch({ results: [] });
        document.body.innerHTML = '<input name="country" id="country" value="PT"><input id="t">';
        const fd = make('#t', { url: '/api', relatives: '#country', params: { tags: ['a', 'b'], filter: { active: true } }, minLength: 1 });
        fd.search('Lis');
        await wait(10);
        const query = decodeURIComponent(calls[0].url.split('?')[1]);
        expect(query).toContain('relatives[country]=PT');
        expect(query).toContain('tags[]=a&tags[]=b');
        expect(query).toContain('filter[active]=true');
    });

    it('does not share the remote cache between urls', async () => {
        mockFetch(url => ({ results: [{ label: url.startsWith('/countries') ? 'Portugal' : 'Porto' }] }));
        document.body.innerHTML = '<input id="countries"><input id="cities">';
        const countries = make('#countries', { url: '/countries', minLength: 1, searchDelay: 1, cache: true });
        const cities = make('#cities', { url: '/cities', minLength: 1, searchDelay: 1, cache: true });
        type(countries, 'Por'); await wait(20);
        expect(resultTexts()).toEqual(['Portugal']);
        countries.closeResults();
        type(cities, 'Por'); await wait(20);
        expect(resultTexts()).toEqual(['Porto']);
    });

    it('survives a corrupt cache entry', () => {
        localStorage.setItem('fdl-broken', 'not json');
        document.body.innerHTML = '<input id="t">';
        expect(() => make('#t', { cache: true })).not.toThrow();
    });

    it('applies option overrides sent by the server', async () => {
        mockFetch({ results: Array.from({ length: 10 }, (_, i) => ({ label: 'Item ' + i })), options: { maxShownResults: 3 } });
        document.body.innerHTML = '<input id="t">';
        const fd = make('#t', { url: '/api', minLength: 1 });
        fd.search('Item');
        await wait(10);
        expect(fd.getOption('maxShownResults')).toBe(3);
        expect(resultTexts()).toHaveLength(3);
    });
});

// ---------------------------------------------------------------------------
// Options and lifecycle
// ---------------------------------------------------------------------------

describe('setOption()', () => {
    it('normalises and applies options', () => {
        document.body.innerHTML = '<input id="rel"><input id="t">';
        const fd = make('#t', { data: [{ name: 'Paris', code: 'FR' }] });
        fd.setOption('searchIn', 'name,code');
        expect(fd.getOption('searchIn')).toEqual(['name', 'code']);
        expect(fd.getOption('textProperty')).toBe('name');

        fd.setOption('disabled', true);
        expect(fd._alias.disabled).toBe(true);
        fd.setOption('disabled', false);

        fd.setOption('relatives', '#rel');
        fd.setOption('chainedRelatives', true);
        expect(fd._alias.readOnly).toBe(true);
        const rel = document.getElementById('rel');
        rel.value = 'x';
        rel.dispatchEvent(new Event('change'));
        expect(fd._alias.readOnly).toBe(false);
    });

    it('ignores structural options', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        document.body.innerHTML = '<input id="t">';
        const fd = make('#t');
        fd.setOption('multiple', true);
        expect(fd.getOption('multiple')).toBe(false);
    });
});

describe('destroy()', () => {
    it('releases listeners, timers and DOM', () => {
        document.body.innerHTML = '<label for="city">City</label><input id="rel" value=""><input id="city">';
        const removed = [];
        const originalRemove = window.removeEventListener.bind(window);
        vi.spyOn(window, 'removeEventListener').mockImplementation((type, handler, options) => { removed.push(type); return originalRemove(type, handler, options); });

        const fd = new Flexdatalist('#city', { data: CITIES, minLength: 1, relatives: '#rel', chainedRelatives: true, cache: false });
        fd.search('P');
        const searchRan = vi.fn();
        fd._searchTimeout = setTimeout(searchRan, 5);
        fd.destroy();

        expect(document.querySelector('.flexdatalist-results')).toBeNull();
        expect(document.querySelector('.flexdatalist-alias')).toBeNull();
        expect(document.querySelector('label').getAttribute('for')).toBe('city');
        expect(removed).toContain('resize');
        return wait(20).then(() => expect(searchRan).not.toHaveBeenCalled());
    });

    it('lets a re-created instance load its initial value while the old request is in flight', async () => {
        mockFetch(() => new Promise(resolve => setTimeout(() => resolve({ results: [{ id: 1, label: 'Paris' }] }), 10)));
        document.body.innerHTML = '<input id="t" value="1">';
        new Flexdatalist('#t', { url: '/api', valueProperty: 'id', cache: false }); // destroyed by the next line
        const second = make('#t', { url: '/api', valueProperty: 'id' });
        await second.ready;
        expect(second.getText()).toBe('Paris');
    });
});

describe('classPrefix', () => {
    it('prefixes every styled flexdatalist-* class so v2 CSS does not apply', async () => {
        mockFetch(() => new Promise(resolve => setTimeout(() => resolve({ results: [{ id: 'a', label: 'Alpha' }] }), 20)));
        document.body.innerHTML = '<input id="t" multiple value="a">';
        const fd = make('#t', { classPrefix: 'fd3-', url: '/api', valueProperty: 'id', collapseAfterN: 0, minLength: 1 });
        // While the initial value loads: loading bar and fetching state.
        expect(document.querySelector('.fd3-flexdatalist-fetch-animation')).not.toBeNull();
        await fd.ready;
        fd.setOption('data', [{ id: 'b', label: 'Beta' }]);
        fd.search('B');
        await wait(40);

        const classes = new Set([...document.querySelectorAll('[class]')].flatMap(el => [...el.classList]));
        const unprefixed = [...classes].filter(cls => cls.startsWith('flexdatalist') && !['flexdatalist', 'flexdatalist-set'].includes(cls));
        expect(unprefixed).toEqual([]);
        for (const expected of ['fd3-flexdatalist-alias', 'fd3-flexdatalist-multiple', 'fd3-flexdatalist-multiple-value', 'fd3-flexdatalist-results', 'fd3-flexdatalist-collapsed-control']) {
            expect(classes).toContain(expected);
        }
        // The marker stays unprefixed, so v2's auto-init (".flexdatalist:not(.flexdatalist-set)") skips this input.
        expect(document.getElementById('t').classList.contains('flexdatalist-set')).toBe(true);
    });
});

describe('accessibility', () => {
    it('implements the combobox pattern', () => {
        document.body.innerHTML = '<input id="city" aria-label="City" required>';
        const fd = make('#city', { data: CITIES, minLength: 1 });
        const alias = fd._alias;
        expect(alias.getAttribute('role')).toBe('combobox');
        expect(alias.getAttribute('aria-label')).toBe('City');
        expect(alias.getAttribute('aria-required')).toBe('true');
        expect(document.getElementById('city').getAttribute('aria-hidden')).toBe('true');

        alias.focus();
        fd.search('P');
        expect(alias.getAttribute('aria-expanded')).toBe('true');
        expect(document.getElementById(alias.getAttribute('aria-controls')).getAttribute('role')).toBe('listbox');

        key(document.activeElement, 'keydown', 'ArrowDown');
        expect(document.getElementById(alias.getAttribute('aria-activedescendant')).textContent.trim()).toBe('Paris');

        key(document.activeElement, 'keydown', 'Escape');
        expect(alias.getAttribute('aria-expanded')).toBe('false');
        expect(alias.hasAttribute('aria-activedescendant')).toBe(false);
    });
});
