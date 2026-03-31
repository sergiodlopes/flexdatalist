import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import FlexdatalistCore from 'flexdatalist';

const EVENTS = [
    ['init:flexdatalist', 'onInit'],
    ['select:flexdatalist', 'onSelect'],
    ['change:flexdatalist', 'onChange'],
    ['clear:flexdatalist', 'onClear'],
    ['addnew:flexdatalist', 'onAddNew'],
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

const OPTION_KEYS = [
    'url', 'data', 'params', 'relatives', 'chainedRelatives', 'cache',
    'cacheLifetime', 'minLength', 'groupBy', 'textProperty', 'valueProperty',
    'visibleProperties', 'iconProperty', 'searchIn', 'searchContain',
    'searchEqual', 'searchByWord', 'searchDisabled', 'searchDelay',
    'normalizeString', 'multiple', 'disabled', 'selectionRequired',
    'focusFirstResult', 'resultsProperty', 'maxShownResults', 'collapseAfterN',
    'collapsedValuesText', 'noResultsText', 'resultsLoader', 'toggleSelected',
    'allowDuplicateValues', 'removeOnBackspace', 'requestType',
    'requestContentType', 'requestHeaders', 'keywordParamName',
    'searchContainParamName', 'limitOfValues', 'valuesSeparator',
    'showAddNewItem', 'addNewItemText', 'debug',
];

const Flexdatalist = forwardRef(function Flexdatalist(props, ref) {
    const { value, className, name, placeholder, ...rest } = props;
    const inputRef = useRef(null);
    const instanceRef = useRef(null);
    const internalUpdate = useRef(false);
    const callbacksRef = useRef({});

    for (const [, propName] of EVENTS) {
        callbacksRef.current[propName] = rest[propName];
    }

    const buildOptions = useCallback(() => {
        const opts = {};
        for (const key of OPTION_KEYS) {
            if (rest[key] !== undefined) {
                opts[key] = rest[key];
            }
        }
        return opts;
    }, OPTION_KEYS.map(k => rest[k]));

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

    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;

        if (value !== undefined && value !== null && value !== '') {
            el.value = typeof value === 'object' ? JSON.stringify(value) : String(value);
        }

        const handlers = [];

        FlexdatalistCore.init(el, buildOptions()).then(([fd]) => {
            instanceRef.current = fd;

            for (const [eventName, propName] of EVENTS) {
                const handler = (e) => {
                    callbacksRef.current[propName]?.(e.detail, e);
                };
                el.addEventListener(eventName, handler);
                handlers.push([eventName, handler]);
            }

            const changeHandler = (e) => {
                internalUpdate.current = true;
                callbacksRef.current.onChange?.(e.detail, e);
                internalUpdate.current = false;
            };
            el.removeEventListener('change:flexdatalist', handlers.find(h => h[0] === 'change:flexdatalist')?.[1]);
            el.addEventListener('change:flexdatalist', changeHandler);
            handlers.push(['change:flexdatalist', changeHandler]);
        });

        return () => {
            for (const [eventName, handler] of handlers) {
                el.removeEventListener(eventName, handler);
            }
            instanceRef.current?.destroy();
            instanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (internalUpdate.current || !instanceRef.current) return;
        if (value !== undefined) {
            instanceRef.current.setValue(value);
        }
    }, [value]);

    return (
        <input
            ref={inputRef}
            type="text"
            className={className}
            name={name}
            placeholder={placeholder}
        />
    );
});

export default Flexdatalist;
export { Flexdatalist };
