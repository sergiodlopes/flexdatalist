import type { DefineComponent } from 'vue';
import type { Flexdatalist as FlexdatalistCore, FlexdatalistOptions } from 'flexdatalist';

export interface FlexdatalistProps extends FlexdatalistOptions {
    /** v-model: the serialised value submitted with the form. */
    modelValue?: string | number | any[] | Record<string, any>;
    /** Class(es) for the input (the core copies them to the visible field). */
    inputClass?: string;
    name?: string | null;
    placeholder?: string | null;
}

/** Methods exposed through a template ref. */
export interface FlexdatalistExposed {
    getInstance(): FlexdatalistCore | null;
    getValue(): any;
    setValue(value: string | number | any[] | Record<string, any>): FlexdatalistCore | undefined;
    addValue(value: string | number | Array<string | number>): FlexdatalistCore | undefined;
    removeValue(value: string | number | Array<string | number>): FlexdatalistCore | undefined;
    toggleValue(value: string | number): FlexdatalistCore | undefined;
    clear(): FlexdatalistCore | undefined;
    getText(format?: 'array' | 'string' | string): string | string[] | undefined;
    search(keyword: string): FlexdatalistCore | undefined;
    closeResults(): FlexdatalistCore | undefined;
    disable(): FlexdatalistCore | undefined;
    enable(): FlexdatalistCore | undefined;
    readonly(state?: boolean): FlexdatalistCore | boolean | undefined;
}

/**
 * Emits `update:modelValue` plus one event per core event, named without the
 * `:flexdatalist` suffix and with dots as dashes (`select`, `change`,
 * `before-value`, `item-results`…); each receives the event detail.
 */
declare const Flexdatalist: DefineComponent<FlexdatalistProps> & { new (): FlexdatalistExposed };

export default Flexdatalist;
export { Flexdatalist };
