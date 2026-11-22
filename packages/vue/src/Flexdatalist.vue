<script>
const EVENTS = [
    'init:flexdatalist',
    'select:flexdatalist',
    'change:flexdatalist',
    'clear:flexdatalist',
    'addnew:flexdatalist',
    'error:flexdatalist',
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

/**
 * Shallow equality for option values, so inline literals such as
 * `:search-in="['name']"` do not count as a change on every parent render.
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
</script>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, toRaw } from 'vue';
import FlexdatalistCore from 'flexdatalist';

// Option props default to `undefined` (not the core defaults), so an unset
// prop is not sent and the core's `Flexdatalist.defaults` apply — including
// any global overrides. An explicit `default: undefined` also stops Vue
// casting absent Boolean props to `false`.
const props = defineProps({
    modelValue: { type: [String, Number, Array, Object], default: '' },
    url: { type: String, default: undefined },
    data: { type: [Array, String], default: undefined },
    params: { type: [Object, Function], default: undefined },
    // Selector, element list (Array / NodeList) or a single element.
    relatives: { type: [String, Array, Object], default: undefined },
    chainedRelatives: { type: Boolean, default: undefined },
    cache: { type: Boolean, default: undefined },
    cacheLifetime: { type: Number, default: undefined },
    minLength: { type: Number, default: undefined },
    groupBy: { type: [String, Boolean], default: undefined },
    groupView: { type: String, default: undefined },
    groupTabAnimation: { type: Boolean, default: undefined },
    textProperty: { type: String, default: undefined },
    valueProperty: { type: [String, Array, Object], default: undefined },
    visibleProperties: { type: [Array, String], default: undefined },
    iconProperty: { type: String, default: undefined },
    searchIn: { type: [Array, String], default: undefined },
    searchContain: { type: Boolean, default: undefined },
    searchEqual: { type: Boolean, default: undefined },
    searchByWord: { type: Boolean, default: undefined },
    searchDisabled: { type: Boolean, default: undefined },
    searchDelay: { type: Number, default: undefined },
    normalizeString: { type: Function, default: undefined },
    multiple: { type: Boolean, default: undefined },
    disabled: { type: Boolean, default: undefined },
    selectionRequired: { type: Boolean, default: undefined },
    focusFirstResult: { type: Boolean, default: undefined },
    resultsProperty: { type: String, default: undefined },
    maxShownResults: { type: Number, default: undefined },
    collapseAfterN: { type: [Number, Boolean], default: undefined },
    collapsedValuesText: { type: String, default: undefined },
    noResultsText: { type: String, default: undefined },
    resultsLoader: { type: String, default: undefined },
    toggleSelected: { type: Boolean, default: undefined },
    allowDuplicateValues: { type: Boolean, default: undefined },
    removeOnBackspace: { type: Boolean, default: undefined },
    requestType: { type: String, default: undefined },
    requestContentType: { type: String, default: undefined },
    requestHeaders: { type: Object, default: undefined },
    keywordParamName: { type: String, default: undefined },
    searchContainParamName: { type: String, default: undefined },
    limitOfValues: { type: Number, default: undefined },
    valuesSeparator: { type: String, default: undefined },
    showAddNewItem: { type: Boolean, default: undefined },
    addNewItemText: { type: String, default: undefined },
    // Element or selector.
    resultsContainer: { type: [String, Object], default: undefined },
    classPrefix: { type: String, default: undefined },
    debug: { type: Boolean, default: undefined },
    inputClass: { type: String, default: '' },
    name: { type: String, default: null },
    placeholder: { type: String, default: null },
});

const emit = defineEmits([
    'update:modelValue',
    ...EMIT_NAMES,
]);

const OPTION_KEYS = Object.keys(FlexdatalistCore.defaults).filter((key) => key in props);
const STRUCTURAL_KEYS = FlexdatalistCore.structuralOptions ?? ['multiple', 'classPrefix', 'resultsContainer'];

const inputRef = ref(null);
let instance = null;
let appliedOptions = {};

function buildOptions() {
    const opts = {};
    for (const key of OPTION_KEYS) {
        const val = props[key];
        if (val !== null && val !== undefined) {
            opts[key] = toRaw(val);
        }
    }
    return opts;
}

const handlers = [];

function listen(el, eventName, handler) {
    el.addEventListener(eventName, handler);
    handlers.push([eventName, handler]);
}

function unlisten(el) {
    for (const [eventName, handler] of handlers) {
        el?.removeEventListener(eventName, handler);
    }
    handlers.length = 0;
}

function create(initialValue) {
    const el = inputRef.value;
    if (initialValue !== '' && initialValue != null) {
        el.value = typeof initialValue === 'object'
            ? JSON.stringify(initialValue)
            : String(initialValue);
    }

    // Listen before constructing: the core may dispatch init/change
    // events synchronously from its constructor.
    for (let i = 0; i < EVENTS.length; i++) {
        const emitName = EMIT_NAMES[i];
        listen(el, EVENTS[i], (e) => emit(emitName, e.detail));
    }
    listen(el, 'change:flexdatalist', (e) => emit('update:modelValue', e.detail.value));

    // Construct synchronously so unmounting before the initial value
    // finished loading still destroys the instance.
    appliedOptions = buildOptions();
    instance = new FlexdatalistCore(el, appliedOptions);
}

function destroy() {
    unlisten(inputRef.value);
    instance?.destroy();
    instance = null;
}

onMounted(() => create(props.modelValue));

onBeforeUnmount(destroy);

// React to option changes: structural options need a new instance, the
// others are applied in place with setOption().
watch(() => OPTION_KEYS.map((key) => props[key]), () => {
    if (!instance) return;
    const next = buildOptions();
    if (STRUCTURAL_KEYS.some((key) => !isSameOption(appliedOptions[key], next[key]))) {
        const currentValue = inputRef.value.value;
        destroy();
        create(props.modelValue !== '' && props.modelValue != null ? props.modelValue : currentValue);
        return;
    }
    for (const key of OPTION_KEYS) {
        if (isSameOption(appliedOptions[key], next[key])) continue;
        instance.setOption(key, next[key] !== undefined ? next[key] : FlexdatalistCore.defaults[key]);
    }
    appliedOptions = next;
});

// The core copies the placeholder to the alias only once.
watch(() => props.placeholder, (placeholder) => {
    if (instance?._alias) instance._alias.placeholder = placeholder ?? '';
});

watch(() => props.modelValue, (val) => {
    if (!instance) return;
    // Skip values the input already holds (typically the one we just
    // emitted). setValue() clears first, so calling it with the current
    // value would emit a spurious clear/change and could loop via v-model.
    // The core's own serialiser keeps CSV / JSON modes comparable.
    if (instance._toStr(val) === String(inputRef.value?.value ?? '').trim()) return;
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
