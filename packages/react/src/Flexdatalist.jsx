import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import FlexdatalistCore from 'flexdatalist';

const EVENTS = [
    ['init:flexdatalist', 'onInit'],
    ['select:flexdatalist', 'onSelect'],
    ['change:flexdatalist', 'onChange'],
    ['clear:flexdatalist', 'onClear'],
    ['addnew:flexdatalist', 'onAddNew'],
    ['error:flexdatalist', 'onError'],
    ['before:flexdatalist.value', 'onBeforeValue'],
    ['after:flexdatalist.value', 'onAfterValue'],
    ['before:flexdatalist.select', 'onBeforeSelect'],
    ['after:flexdatalist.select', 'onAfterSelect'],
    ['before:flexdatalist.remove', 'onBeforeRemove'],
    ['after:flexdatalist.remove', 'onAfterRemove'],
    ['before:flexdatalist.remove.all', 'onBeforeRemoveAll'],
    ['after:flexdatalist.remove.all', 'onAfterRemoveAll'],
    ['before:flexdatalist.toggle', 'onBeforeToggle'],
    ['after:flexdatalist.toggle', 'onAfterToggle'],
    ['before:flexdatalist.search', 'onBeforeSearch'],
    ['after:flexdatalist.search', 'onAfterSearch'],
    ['before:flexdatalist.data', 'onBeforeData'],
    ['after:flexdatalist.data', 'onAfterData'],
    ['show:flexdatalist.results', 'onShowResults'],
    ['shown:flexdatalist.results', 'onShownResults'],
    ['item:flexdatalist.results', 'onItemResult'],
    ['empty:flexdatalist.results', 'onEmptyResults'],
    ['remove:flexdatalist.results', 'onRemoveResults'],
    ['removed:flexdatalist.results', 'onRemovedResults'],
];

const EVENT_PROPS = new Set(EVENTS.map(([, propName]) => propName));

/** Every core option is a prop, so new core options need no wrapper change. */
const OPTION_KEYS = Object.keys(FlexdatalistCore.defaults);
const OPTION_KEY_SET = new Set(OPTION_KEYS);

/** Options that need a new core instance when they change. */
const STRUCTURAL_KEYS = FlexdatalistCore.structuralOptions ?? ['multiple', 'classPrefix', 'resultsContainer'];

/**
 * Whether `value` serialises to what the hidden input already holds.
 * Uses the core's own serialiser so CSV / JSON modes compare correctly.
 */
function isCurrentValue(instance, input, value) {
    return instance._toStr(value) === String(input?.value ?? '').trim();
}

/**
 * Shallow equality for option values, so inline literals such as
 * `searchIn={['name']}` do not count as a change on every render.
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

/** Pick the option props that are set (undefined means "core default"). */
function pickOptions(props) {
    const opts = {};
    for (const key of OPTION_KEYS) {
        if (props[key] !== undefined) opts[key] = props[key];
    }
    return opts;
}

const Flexdatalist = forwardRef(function Flexdatalist(props, ref) {
    const { value } = props;
    const inputRef = useRef(null);
    const instanceRef = useRef(null);
    const callbacksRef = useRef({});
    const appliedOptionsRef = useRef({});
    /** Value kept across a re-creation caused by a structural option change. */
    const preservedValueRef = useRef(undefined);

    for (const [, propName] of EVENTS) {
        callbacksRef.current[propName] = props[propName];
    }

    // Everything that is neither an option, an event callback nor `value`
    // goes to the <input> (id, name, className, placeholder, required,
    // aria-*, data-*, style…). The core copies className and placeholder to
    // the visible alias and re-points <label htmlFor> at it.
    const inputProps = {};
    for (const [key, propValue] of Object.entries(props)) {
        if (key === 'value' || key === 'children' || OPTION_KEY_SET.has(key) || EVENT_PROPS.has(key)) continue;
        inputProps[key] = propValue;
    }

    const options = pickOptions(props);

    useImperativeHandle(ref, () => ({
        getInstance: () => instanceRef.current,
        getValue: () => instanceRef.current?.getValue(),
        setValue: (val) => instanceRef.current?.setValue(val),
        addValue: (val) => instanceRef.current?.addValue(val),
        removeValue: (val) => instanceRef.current?.removeValue(val),
        toggleValue: (val) => instanceRef.current?.toggleValue(val),
        clear: () => instanceRef.current?.clear(),
        getText: (format) => instanceRef.current?.getText(format),
        search: (keyword) => instanceRef.current?.search(keyword),
        closeResults: () => instanceRef.current?.closeResults(),
        disable: () => instanceRef.current?.disable(),
        enable: () => instanceRef.current?.enable(),
        readonly: (state) => instanceRef.current?.readonly(state),
    }), []);

    // Create the instance on mount, and again when a structural option
    // changes (those shape the DOM the core builds).
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;

        const initialValue = value !== undefined ? value : preservedValueRef.current;
        if (initialValue !== undefined && initialValue !== null && initialValue !== '') {
            el.value = typeof initialValue === 'object' ? JSON.stringify(initialValue) : String(initialValue);
        }

        // Listen before constructing: the core may dispatch init/change
        // events synchronously from its constructor.
        const handlers = [];
        for (const [eventName, propName] of EVENTS) {
            const handler = (e) => {
                callbacksRef.current[propName]?.(e.detail, e);
            };
            el.addEventListener(eventName, handler);
            handlers.push([eventName, handler]);
        }

        // Construct synchronously so the cleanup below always has the
        // instance to destroy, even when unmounting before the initial
        // value finished loading (or in StrictMode's mount/unmount/mount).
        const fd = new FlexdatalistCore(el, options);
        instanceRef.current = fd;
        appliedOptionsRef.current = options;

        return () => {
            for (const [eventName, handler] of handlers) {
                el.removeEventListener(eventName, handler);
            }
            preservedValueRef.current = el.value;
            fd.destroy();
            if (instanceRef.current === fd) instanceRef.current = null;
        };
    }, STRUCTURAL_KEYS.map((key) => props[key]));

    // Apply other option changes in place.
    useEffect(() => {
        const fd = instanceRef.current;
        if (!fd) return;
        const previous = appliedOptionsRef.current;
        for (const key of OPTION_KEYS) {
            if (STRUCTURAL_KEYS.includes(key) || isSameOption(previous[key], options[key])) continue;
            fd.setOption(key, options[key] !== undefined ? options[key] : FlexdatalistCore.defaults[key]);
        }
        appliedOptionsRef.current = options;
    });

    // The core copies the placeholder to the alias only once.
    useEffect(() => {
        const alias = instanceRef.current?._alias;
        if (alias) alias.placeholder = props.placeholder ?? '';
    }, [props.placeholder]);

    useEffect(() => {
        const fd = instanceRef.current;
        if (!fd || value === undefined) return;
        // Skip values the input already holds (typically the one we just
        // reported through onChange). setValue() clears first, so calling
        // it with the current value would emit a spurious clear/change and,
        // with async data, could loop through the parent's state.
        if (isCurrentValue(fd, inputRef.current, value)) return;
        fd.setValue(value);
    }, [value]);

    return <input ref={inputRef} type="text" {...inputProps} />;
});

export default Flexdatalist;
export { Flexdatalist };
