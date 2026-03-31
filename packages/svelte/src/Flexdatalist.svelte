<script>
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import FlexdatalistCore from 'flexdatalist';

    export let value = '';
    export let url = null;
    export let data = [];
    export let params = {};
    export let relatives = null;
    export let chainedRelatives = false;
    export let cache = true;
    export let cacheLifetime = 60;
    export let minLength = 3;
    export let groupBy = false;
    export let textProperty = null;
    export let valueProperty = null;
    export let visibleProperties = [];
    export let iconProperty = 'thumb';
    export let searchIn = ['label'];
    export let searchContain = false;
    export let searchEqual = false;
    export let searchByWord = false;
    export let searchDisabled = false;
    export let searchDelay = 300;
    export let normalizeString = null;
    export let multiple = null;
    export let disabled = null;
    export let selectionRequired = false;
    export let focusFirstResult = false;
    export let resultsProperty = 'results';
    export let maxShownResults = 100;
    export let collapseAfterN = 50;
    export let collapsedValuesText = '{count} More';
    export let noResultsText = 'No results found for "{keyword}"';
    export let resultsLoader = null;
    export let toggleSelected = false;
    export let allowDuplicateValues = false;
    export let removeOnBackspace = true;
    export let requestType = 'get';
    export let requestContentType = 'x-www-form-urlencoded';
    export let requestHeaders = null;
    export let keywordParamName = 'keyword';
    export let searchContainParamName = 'contain';
    export let limitOfValues = 0;
    export let valuesSeparator = ',';
    export let showAddNewItem = false;
    export let addNewItemText = 'No results found for "{keyword}". Click to add it.';
    export let debug = true;
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

    let inputEl;
    let instance = null;
    let internalUpdate = false;

    function buildOptions() {
        const opts = {};
        const mapping = {
            url, data, params, relatives, chainedRelatives, cache, cacheLifetime,
            minLength, groupBy, textProperty, valueProperty, visibleProperties,
            iconProperty, searchIn, searchContain, searchEqual, searchByWord,
            searchDisabled, searchDelay, normalizeString, multiple, disabled,
            selectionRequired, focusFirstResult, resultsProperty, maxShownResults,
            collapseAfterN, collapsedValuesText, noResultsText, resultsLoader,
            toggleSelected, allowDuplicateValues, removeOnBackspace, requestType,
            requestContentType, requestHeaders, keywordParamName,
            searchContainParamName, limitOfValues, valuesSeparator, showAddNewItem,
            addNewItemText, debug,
        };
        for (const [key, val] of Object.entries(mapping)) {
            if (val !== null && val !== undefined) {
                opts[key] = val;
            }
        }
        return opts;
    }

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
    export function setReadonly(state) { return instance?.readonly(state); }

    onMount(async () => {
        if (value !== '' && value != null) {
            inputEl.value = typeof value === 'object' ? JSON.stringify(value) : String(value);
        }

        const [fd] = await FlexdatalistCore.init(inputEl, buildOptions());
        instance = fd;

        for (const [eventName, emitName] of EVENTS) {
            inputEl.addEventListener(eventName, (e) => {
                dispatch(emitName, e.detail);
            });
        }

        inputEl.addEventListener('change:flexdatalist', (e) => {
            internalUpdate = true;
            value = e.detail.value;
            internalUpdate = false;
        });
    });

    onDestroy(() => {
        instance?.destroy();
        instance = null;
    });

    $: if (instance && !internalUpdate) {
        instance.setValue(value);
    }
</script>

<input
    bind:this={inputEl}
    type="text"
    class={inputClass}
    {name}
    {placeholder}
/>
