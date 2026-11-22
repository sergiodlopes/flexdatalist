import { SvelteComponent } from 'svelte';
import type {
    Flexdatalist as FlexdatalistCore,
    FlexdatalistEventDetailMap as Details,
    FlexdatalistOptions,
} from 'flexdatalist';

export interface FlexdatalistProps extends FlexdatalistOptions {
    /** bind:value: the serialised value submitted with the form. */
    value?: string | number | any[] | Record<string, any>;
    /** Class(es) for the input (the core copies them to the visible field). */
    inputClass?: string;
    name?: string | null;
    placeholder?: string | null;
    /** Other attributes (id, required, aria-*…) are passed to the input. */
    [attribute: string]: any;
}

export interface FlexdatalistEvents {
    init: CustomEvent<Details['init:flexdatalist']>;
    select: CustomEvent<Details['select:flexdatalist']>;
    change: CustomEvent<Details['change:flexdatalist']>;
    clear: CustomEvent<Details['clear:flexdatalist']>;
    addnew: CustomEvent<Details['addnew:flexdatalist']>;
    error: CustomEvent<Details['error:flexdatalist']>;
    beforevalue: CustomEvent<Details['before:flexdatalist.value']>;
    aftervalue: CustomEvent<Details['after:flexdatalist.value']>;
    beforeselect: CustomEvent<Details['before:flexdatalist.select']>;
    afterselect: CustomEvent<Details['after:flexdatalist.select']>;
    beforeremove: CustomEvent<Details['before:flexdatalist.remove']>;
    afterremove: CustomEvent<Details['after:flexdatalist.remove']>;
    beforeremoveall: CustomEvent<Details['before:flexdatalist.remove.all']>;
    afterremoveall: CustomEvent<Details['after:flexdatalist.remove.all']>;
    beforetoggle: CustomEvent<Details['before:flexdatalist.toggle']>;
    aftertoggle: CustomEvent<Details['after:flexdatalist.toggle']>;
    beforesearch: CustomEvent<Details['before:flexdatalist.search']>;
    aftersearch: CustomEvent<Details['after:flexdatalist.search']>;
    beforedata: CustomEvent<Details['before:flexdatalist.data']>;
    afterdata: CustomEvent<Details['after:flexdatalist.data']>;
    showresults: CustomEvent<Details['show:flexdatalist.results']>;
    shownresults: CustomEvent<Details['shown:flexdatalist.results']>;
    itemresult: CustomEvent<Details['item:flexdatalist.results']>;
    emptyresults: CustomEvent<Details['empty:flexdatalist.results']>;
    removeresults: CustomEvent<Details['remove:flexdatalist.results']>;
    removedresults: CustomEvent<Details['removed:flexdatalist.results']>;
}

export default class Flexdatalist extends SvelteComponent<FlexdatalistProps, FlexdatalistEvents, {}> {
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
    /** Alias of `readonly(state)`. */
    setReadonly(state?: boolean): FlexdatalistCore | boolean | undefined;
}

export { Flexdatalist };
