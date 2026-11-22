<script>
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import FlexdatalistCore from 'flexdatalist';

    export let value = '';
    // Option props default to `undefined`: an unset prop is not sent, so the
    // core's `Flexdatalist.defaults` apply (including any global overrides).
    export let url = undefined;
    export let data = undefined;
    export let params = undefined;
    export let relatives = undefined;
    export let chainedRelatives = undefined;
    export let cache = undefined;
    export let cacheLifetime = undefined;
    export let minLength = undefined;
    export let groupBy = undefined;
    export let groupView = undefined;
    export let groupTabAnimation = undefined;
    export let textProperty = undefined;
    export let valueProperty = undefined;
    export let visibleProperties = undefined;
    export let iconProperty = undefined;
    export let searchIn = undefined;
    export let searchContain = undefined;
    export let searchEqual = undefined;
    export let searchByWord = undefined;
    export let searchDisabled = undefined;
    export let searchDelay = undefined;
    export let normalizeString = undefined;
    export let multiple = undefined;
    export let disabled = undefined;
    export let selectionRequired = undefined;
    export let focusFirstResult = undefined;
    export let resultsProperty = undefined;
    export let maxShownResults = undefined;
    export let collapseAfterN = undefined;
    export let collapsedValuesText = undefined;
    export let noResultsText = undefined;
    export let resultsLoader = undefined;
    export let toggleSelected = undefined;
    export let allowDuplicateValues = undefined;
    export let removeOnBackspace = undefined;
    export let requestType = undefined;
    export let requestContentType = undefined;
    export let requestHeaders = undefined;
    export let keywordParamName = undefined;
    export let searchContainParamName = undefined;
    export let limitOfValues = undefined;
    export let valuesSeparator = undefined;
    export let showAddNewItem = undefined;
    export let addNewItemText = undefined;
    export let resultsContainer = undefined;
    export let classPrefix = undefined;
    export let debug = undefined;
    export let inputClass = '';
    export let name = null;
    export let placeholder = null;

    const dispatch = createEventDispatcher();

    const EVENTS = [
        ['init:flexdatalist', 'init'],
        ['select:flexdatalist', 'select'],
        ['change:flexdatalist', 'change'],
        ['clear:flexdatalist', 'clear'],
        ['addnew:flexdatalist', 'addnew'],
        ['error:flexdatalist', 'error'],
        ['before:flexdatalist.value', 'beforevalue'],
        ['after:flexdatalist.value', 'aftervalue'],
        ['before:flexdatalist.select', 'beforeselect'],
        ['after:flexdatalist.select', 'afterselect'],
        ['before:flexdatalist.remove', 'beforeremove'],
        ['after:flexdatalist.remove', 'afterremove'],
        ['before:flexdatalist.remove.all', 'beforeremoveall'],
        ['after:flexdatalist.remove.all', 'afterremoveall'],
        ['before:flexdatalist.toggle', 'beforetoggle'],
        ['after:flexdatalist.toggle', 'aftertoggle'],
        ['before:flexdatalist.search', 'beforesearch'],
        ['after:flexdatalist.search', 'aftersearch'],
        ['before:flexdatalist.data', 'beforedata'],
        ['after:flexdatalist.data', 'afterdata'],
        ['show:flexdatalist.results', 'showresults'],
        ['shown:flexdatalist.results', 'shownresults'],
        ['item:flexdatalist.results', 'itemresult'],
        ['empty:flexdatalist.results', 'emptyresults'],
        ['remove:flexdatalist.results', 'removeresults'],
        ['removed:flexdatalist.results', 'removedresults'],
    ];

    const STRUCTURAL_KEYS = FlexdatalistCore.structuralOptions ?? ['multiple', 'classPrefix', 'resultsContainer'];

    let inputEl;
    let instance = null;
    let appliedOptions = {};

    /**
     * Shallow equality for option values, so inline literals such as
     * `searchIn={['name']}` do not count as a change on every update.
     */
    function isSameOption(a, b) {
        if (a === b) return true;
        if (Array.isArray(a) && Array.isArray(b)) {
            return a.length === b.length && a.every((item, index) => item === b[index]);
        }
        const isPlainObject = (v) => v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype;
        if (isPlainObject(a) && isPlainObject(b)) {
            const keys = Object.keys(a);
            return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
        }
        return false;
    }

    function pickOptions(mapping) {
        const opts = {};
        for (const [key, val] of Object.entries(mapping)) {
            if (val !== null && val !== undefined) {
                opts[key] = val;
            }
        }
        return opts;
    }

    // Referencing every option here makes Svelte re-run this statement (and
    // so applyOptions) whenever one of them changes.
    $: options = pickOptions({
        url, data, params, relatives, chainedRelatives, cache, cacheLifetime,
        minLength, groupBy, groupView, groupTabAnimation, textProperty,
        valueProperty, visibleProperties, iconProperty, searchIn, searchContain,
        searchEqual, searchByWord, searchDisabled, searchDelay, normalizeString,
        multiple, disabled, selectionRequired, focusFirstResult, resultsProperty,
        maxShownResults, collapseAfterN, collapsedValuesText, noResultsText,
        resultsLoader, toggleSelected, allowDuplicateValues, removeOnBackspace,
        requestType, requestContentType, requestHeaders, keywordParamName,
        searchContainParamName, limitOfValues, valuesSeparator, showAddNewItem,
        addNewItemText, resultsContainer, classPrefix, debug,
    });

    export function getInstance() { return instance; }
    export function getValue() { return instance?.getValue(); }
    export function setValue(val) { return instance?.setValue(val); }
    export function addValue(val) { return instance?.addValue(val); }
    export function removeValue(val) { return instance?.removeValue(val); }
    export function toggleValue(val) { return instance?.toggleValue(val); }
    export function clear() { return instance?.clear(); }
    export function getText(format) { return instance?.getText(format); }
    export function search(keyword) { return instance?.search(keyword); }
    export function closeResults() { return instance?.closeResults(); }
    export function disable() { return instance?.disable(); }
    export function enable() { return instance?.enable(); }
    /** Same as the React/Vue `readonly(state)`; `setReadonly` is kept as an alias. */
    export function readonly(state) { return instance?.readonly(state); }
    export function setReadonly(state) { return instance?.readonly(state); }

    const handlers = [];

    function listen(eventName, handler) {
        inputEl.addEventListener(eventName, handler);
        handlers.push([eventName, handler]);
    }

    function create(initialValue) {
        if (initialValue !== '' && initialValue != null) {
            inputEl.value = typeof initialValue === 'object' ? JSON.stringify(initialValue) : String(initialValue);
        }

        // Listen before constructing: the core may dispatch init/change
        // events synchronously from its constructor.
        for (const [eventName, emitName] of EVENTS) {
            listen(eventName, (e) => dispatch(emitName, e.detail));
        }
        listen('change:flexdatalist', (e) => { value = e.detail.value; });

        // Construct synchronously so destroying the component before the
        // initial value finished loading still destroys the instance.
        appliedOptions = options;
        instance = new FlexdatalistCore(inputEl, options);
    }

    function destroyInstance() {
        for (const [eventName, handler] of handlers) {
            inputEl?.removeEventListener(eventName, handler);
        }
        handlers.length = 0;
        instance?.destroy();
        instance = null;
    }

    onMount(() => create(value));

    onDestroy(destroyInstance);

    // Structural options need a new instance; the others are applied in
    // place with setOption().
    function applyOptions(fd, next) {
        if (!fd || next === appliedOptions) return;
        if (STRUCTURAL_KEYS.some((key) => !isSameOption(appliedOptions[key], next[key]))) {
            const currentValue = inputEl.value;
            destroyInstance();
            create(value !== '' && value != null ? value : currentValue);
            return;
        }
        for (const key of Object.keys(FlexdatalistCore.defaults)) {
            if (isSameOption(appliedOptions[key], next[key])) continue;
            fd.setOption(key, next[key] !== undefined ? next[key] : FlexdatalistCore.defaults[key]);
        }
        appliedOptions = next;
    }

    $: applyOptions(instance, options);

    // The core copies the placeholder to the alias only once.
    $: if (instance?._alias) instance._alias.placeholder = placeholder ?? '';

    // Skip values the input already holds (typically the one we just copied
    // from a change event). setValue() clears first, so calling it with the
    // current value would emit a spurious clear/change and re-trigger this
    // block. The core's own serialiser keeps CSV / JSON modes comparable.
    function syncValue(fd, nextValue) {
        if (!fd) return;
        if (fd._toStr(nextValue) === String(inputEl?.value ?? '').trim()) return;
        fd.setValue(nextValue);
    }

    $: syncValue(instance, value);
</script>

<!-- Other attributes (id, required, aria-*, data-*…) go to the input. -->
<input
    bind:this={inputEl}
    type="text"
    class={inputClass}
    {name}
    {placeholder}
    {...$$restProps}
/>
