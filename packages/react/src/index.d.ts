import type { ForwardRefExoticComponent, InputHTMLAttributes, RefAttributes } from 'react';
import type {
    Flexdatalist as FlexdatalistCore,
    FlexdatalistEventDetailMap as Details,
    FlexdatalistOptions,
} from 'flexdatalist';

/** Event callbacks receive `(detail, event)`. */
type Callback<K extends keyof Details> = (detail: Details[K], event: CustomEvent<Details[K]>) => void;

export interface FlexdatalistEventProps {
    onInit?: Callback<'init:flexdatalist'>;
    onSelect?: Callback<'select:flexdatalist'>;
    onChange?: Callback<'change:flexdatalist'>;
    onClear?: Callback<'clear:flexdatalist'>;
    onAddNew?: Callback<'addnew:flexdatalist'>;
    onError?: Callback<'error:flexdatalist'>;
    onBeforeValue?: Callback<'before:flexdatalist.value'>;
    onAfterValue?: Callback<'after:flexdatalist.value'>;
    onBeforeSelect?: Callback<'before:flexdatalist.select'>;
    onAfterSelect?: Callback<'after:flexdatalist.select'>;
    onBeforeRemove?: Callback<'before:flexdatalist.remove'>;
    onAfterRemove?: Callback<'after:flexdatalist.remove'>;
    onBeforeRemoveAll?: Callback<'before:flexdatalist.remove.all'>;
    onAfterRemoveAll?: Callback<'after:flexdatalist.remove.all'>;
    onBeforeToggle?: Callback<'before:flexdatalist.toggle'>;
    onAfterToggle?: Callback<'after:flexdatalist.toggle'>;
    onBeforeSearch?: Callback<'before:flexdatalist.search'>;
    onAfterSearch?: Callback<'after:flexdatalist.search'>;
    onBeforeData?: Callback<'before:flexdatalist.data'>;
    onAfterData?: Callback<'after:flexdatalist.data'>;
    onShowResults?: Callback<'show:flexdatalist.results'>;
    onShownResults?: Callback<'shown:flexdatalist.results'>;
    onItemResult?: Callback<'item:flexdatalist.results'>;
    onEmptyResults?: Callback<'empty:flexdatalist.results'>;
    onRemoveResults?: Callback<'remove:flexdatalist.results'>;
    onRemovedResults?: Callback<'removed:flexdatalist.results'>;
}

/** Methods available through `ref`. */
export interface FlexdatalistHandle {
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

/** Input attributes passed to the <input> (id, name, className, required, aria-*…). */
type InputProps = Omit<
    InputHTMLAttributes<HTMLInputElement>,
    keyof FlexdatalistOptions | keyof FlexdatalistEventProps | 'value' | 'defaultValue'
>;

export type FlexdatalistProps = FlexdatalistOptions & FlexdatalistEventProps & InputProps & {
    /** Controlled value (the serialised value reported by `onChange`, or an array/object). */
    value?: string | number | any[] | Record<string, any>;
};

declare const Flexdatalist: ForwardRefExoticComponent<FlexdatalistProps & RefAttributes<FlexdatalistHandle>>;

export default Flexdatalist;
export { Flexdatalist };
