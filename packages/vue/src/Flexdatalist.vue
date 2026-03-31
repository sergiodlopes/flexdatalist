<script>
const EVENTS = [
    'init:flexdatalist',
    'select:flexdatalist',
    'change:flexdatalist',
    'clear:flexdatalist',
    'addnew:flexdatalist',
    'before:flexdatalist.value',
    'after:flexdatalist.value',
    'before:flexdatalist.select',
    'after:flexdatalist.select',
    'before:flexdatalist.remove',
    'after:flexdatalist.remove',
    'before:flexdatalist.remove.all',
    'after:flexdatalist.remove.all',
    'before:flexdatalist.toggle',
    'after:flexdatalist.toggle',
    'before:flexdatalist.search',
    'after:flexdatalist.search',
    'before:flexdatalist.data',
    'after:flexdatalist.data',
    'show:flexdatalist.results',
    'shown:flexdatalist.results',
    'item:flexdatalist.results',
    'empty:flexdatalist.results',
    'remove:flexdatalist.results',
    'removed:flexdatalist.results',
];

function eventToEmitName(name) {
    return name
        .replace(':flexdatalist', '')
        .replace(/\./g, '-');
}

const EMIT_NAMES = EVENTS.map(eventToEmitName);
</script>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, toRaw } from 'vue';
import FlexdatalistCore from 'flexdatalist';

const props = defineProps({
    modelValue: { type: [String, Array, Object], default: '' },
    url: { type: String, default: null },
    data: { type: [Array, String], default: () => [] },
    params: { type: [Object, Function], default: () => ({}) },
    relatives: { type: [String, Object], default: null },
    chainedRelatives: { type: Boolean, default: false },
    cache: { type: Boolean, default: true },
    cacheLifetime: { type: Number, default: 60 },
    minLength: { type: Number, default: 3 },
    groupBy: { type: [String, Boolean], default: false },
    textProperty: { type: String, default: null },
    valueProperty: { type: [String, Array], default: null },
    visibleProperties: { type: [Array, String], default: () => [] },
    iconProperty: { type: String, default: 'thumb' },
    searchIn: { type: [Array, String], default: () => ['label'] },
    searchContain: { type: Boolean, default: false },
    searchEqual: { type: Boolean, default: false },
    searchByWord: { type: Boolean, default: false },
    searchDisabled: { type: Boolean, default: false },
    searchDelay: { type: Number, default: 300 },
    normalizeString: { type: Function, default: null },
    multiple: { type: Boolean, default: null },
    disabled: { type: Boolean, default: null },
    selectionRequired: { type: Boolean, default: false },
    focusFirstResult: { type: Boolean, default: false },
    resultsProperty: { type: String, default: 'results' },
    maxShownResults: { type: Number, default: 100 },
    collapseAfterN: { type: [Number, Boolean], default: 50 },
    collapsedValuesText: { type: String, default: '{count} More' },
    noResultsText: { type: String, default: 'No results found for "{keyword}"' },
    resultsLoader: { type: String, default: null },
    toggleSelected: { type: Boolean, default: false },
    allowDuplicateValues: { type: Boolean, default: false },
    removeOnBackspace: { type: Boolean, default: true },
    requestType: { type: String, default: 'get' },
    requestContentType: { type: String, default: 'x-www-form-urlencoded' },
    requestHeaders: { type: Object, default: null },
    keywordParamName: { type: String, default: 'keyword' },
    searchContainParamName: { type: String, default: 'contain' },
    limitOfValues: { type: Number, default: 0 },
    valuesSeparator: { type: String, default: ',' },
    showAddNewItem: { type: Boolean, default: false },
    addNewItemText: { type: String, default: 'No results found for "{keyword}". Click to add it.' },
    debug: { type: Boolean, default: true },
    inputClass: { type: String, default: '' },
    name: { type: String, default: null },
    placeholder: { type: String, default: null },
});

const emit = defineEmits([
    'update:modelValue',
    ...EMIT_NAMES,
]);

const inputRef = ref(null);
let instance = null;
let internalUpdate = false;

function buildOptions() {
    const opts = {};
    const skip = new Set(['modelValue', 'inputClass', 'name', 'placeholder']);
    for (const [key, val] of Object.entries(props)) {
        if (!skip.has(key) && val !== null && val !== undefined) {
            opts[key] = toRaw(val);
        }
    }
    return opts;
}

onMounted(async () => {
    const el = inputRef.value;
    if (props.modelValue !== '' && props.modelValue != null) {
        el.value = typeof props.modelValue === 'object'
            ? JSON.stringify(props.modelValue)
            : String(props.modelValue);
    }

    const [fd] = await FlexdatalistCore.init(el, buildOptions());
    instance = fd;

    for (let i = 0; i < EVENTS.length; i++) {
        const eventName = EVENTS[i];
        const emitName = EMIT_NAMES[i];
        el.addEventListener(eventName, (e) => {
            emit(emitName, e.detail);
        });
    }

    el.addEventListener('change:flexdatalist', (e) => {
        internalUpdate = true;
        emit('update:modelValue', e.detail.value);
        internalUpdate = false;
    });
});

onBeforeUnmount(() => {
    instance?.destroy();
    instance = null;
});

watch(() => props.modelValue, (val) => {
    if (internalUpdate || !instance) return;
    instance.setValue(val);
});

defineExpose({
    getInstance: () => instance,
    getValue: () => instance?.getValue(),
    setValue: (val) => instance?.setValue(val),
    addValue: (val) => instance?.addValue(val),
    removeValue: (val) => instance?.removeValue(val),
    toggleValue: (val) => instance?.toggleValue(val),
    clear: () => instance?.clear(),
    getText: (format) => instance?.getText(format),
    search: (keyword) => instance?.search(keyword),
    closeResults: () => instance?.closeResults(),
    disable: () => instance?.disable(),
    enable: () => instance?.enable(),
    readonly: (state) => instance?.readonly(state),
});
</script>

<template>
    <input
        ref="inputRef"
        type="text"
        :class="inputClass"
        :name="name"
        :placeholder="placeholder"
    />
</template>
