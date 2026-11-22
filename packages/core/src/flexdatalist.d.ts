/**
 * Type declarations for Flexdatalist (hand-written; keep in sync with
 * `Flexdatalist.defaults` and the public methods in flexdatalist.js).
 */

/** A data item: any object; the searched/displayed properties are configurable. */
export type FlexdatalistItem = Record<string, any>;

export interface FlexdatalistOptions {
    /** Remote URL to fetch results from. */
    url?: string | null;
    /** Static data array, or a URL string to pre-load it from. */
    data?: FlexdatalistItem[] | string;
    /** Extra params sent with every remote request, or a function of the keyword. */
    params?: Record<string, any> | ((this: HTMLInputElement, keyword: string) => Record<string, any>);
    /** Inputs whose values are sent as `relatives[name]`. */
    relatives?: string | NodeList | HTMLElement[] | null;
    /** Make this input readonly while all relatives are empty. */
    chainedRelatives?: boolean;
    /** Cache remote results in localStorage. */
    cache?: boolean;
    /** Cache lifetime in seconds. */
    cacheLifetime?: number;
    /** Minimum characters before searching (0 = show all on focus/click). */
    minLength?: number;
    /** Item property to group results by. */
    groupBy?: string | false;
    /** Grouped results rendering: group headers, or a tab strip. */
    groupView?: 'headers' | 'tabs';
    /** Animate the tab pills when results open (tabs mode). */
    groupTabAnimation?: boolean;
    /** Property (or `{placeholder}` pattern) shown in the input. Defaults to `searchIn[0]`. */
    textProperty?: string | null;
    /** Property/properties stored as the value; `'*'` stores the whole item as JSON. */
    valueProperty?: string | string[] | null;
    /** Properties (or `{placeholder}` patterns) rendered in each result. Defaults to `searchIn`. */
    visibleProperties?: string[] | string;
    /** Property holding an image URL rendered as `<img>`. */
    iconProperty?: string;
    /** Properties searched when filtering. */
    searchIn?: string[] | string;
    /** Match the keyword anywhere (not only at the start). */
    searchContain?: boolean;
    /** Require an exact match. */
    searchEqual?: boolean;
    /** Match every word of the keyword independently. */
    searchByWord?: boolean;
    /** Skip local filtering (rely on the server). */
    searchDisabled?: boolean;
    /** Debounce delay in ms before searching. */
    searchDelay?: number;
    /** Normaliser applied before comparing strings. */
    normalizeString?: ((value: string) => string) | null;
    /** Allow multiple values (tags). Inferred from `[multiple]` when null. */
    multiple?: boolean | null;
    /** Start disabled. Inferred from `[disabled]` when null. */
    disabled?: boolean | null;
    /** Require a value picked from the results (no free text). */
    selectionRequired?: boolean;
    /** Highlight the first result automatically. */
    focusFirstResult?: boolean;
    /** Key of the results array in the remote JSON response. */
    resultsProperty?: string;
    /** Maximum results rendered (0 = unlimited). */
    maxShownResults?: number;
    /** Collapse tags after this many (false = never). */
    collapseAfterN?: number | false;
    /** Label of the collapse control; `{count}` is replaced. */
    collapsedValuesText?: string;
    /** Message when nothing matches; `{keyword}` is replaced. */
    noResultsText?: string;
    /** URL of a loading image shown while fetching. */
    resultsLoader?: string | null;
    /** Clicking a tag toggles it on/off (off tags are not submitted). */
    toggleSelected?: boolean;
    /** Allow the same value more than once. */
    allowDuplicateValues?: boolean;
    /** Backspace on an empty input marks, then removes, the last tag. */
    removeOnBackspace?: boolean;
    /** HTTP method for remote requests. */
    requestType?: 'get' | 'post' | string;
    /** POST body encoding. */
    requestContentType?: 'x-www-form-urlencoded' | 'json' | string;
    /** Extra HTTP headers. */
    requestHeaders?: Record<string, string> | null;
    /** Request parameter carrying the keyword. */
    keywordParamName?: string;
    /** Request parameter carrying the searchContain flag. */
    searchContainParamName?: string;
    /** Maximum number of tags (0 = unlimited). */
    limitOfValues?: number;
    /** Separator of multiple values in the submitted string. */
    valuesSeparator?: string;
    /** Offer an "add new item" entry when nothing matches. */
    showAddNewItem?: boolean;
    /** Text of the "add new item" entry; `{keyword}` is replaced. */
    addNewItemText?: string;
    /** Element (or selector) to render results into instead of a dropdown. */
    resultsContainer?: HTMLElement | string | null;
    /** Prefix for the widget's CSS classes (to coexist with v2). */
    classPrefix?: string;
    /** Log warnings and errors to the console. */
    debug?: boolean;
}

/** Resolved options as returned by `getOption()` (defaults merged, strings normalised). */
export interface FlexdatalistResolvedOptions extends Required<Omit<FlexdatalistOptions, 'searchIn' | 'visibleProperties' | 'relatives'>> {
    searchIn: string[];
    visibleProperties: string[];
    relatives: HTMLElement[] | null;
    readonly?: boolean;
    originalValue: string;
}

export interface FlexdatalistChangeDetail {
    /** Serialised value, as submitted with the form. */
    value: string;
    /** Display text (joined with `valuesSeparator` in multiple mode). */
    text: string;
}

/** `e.detail` of each event dispatched on the original input. */
export interface FlexdatalistEventDetailMap {
    'init:flexdatalist': FlexdatalistResolvedOptions;
    'select:flexdatalist': FlexdatalistItem;
    'change:flexdatalist': FlexdatalistChangeDetail;
    'clear:flexdatalist': null;
    'addnew:flexdatalist': string;
    'error:flexdatalist': { error: unknown; url: string };
    'before:flexdatalist.value': any;
    'after:flexdatalist.value': Array<{ value: any; text: string }>;
    'before:flexdatalist.select': FlexdatalistItem;
    'after:flexdatalist.select': FlexdatalistItem;
    'before:flexdatalist.remove': any;
    'after:flexdatalist.remove': FlexdatalistChangeDetail;
    'before:flexdatalist.remove.all': any;
    'after:flexdatalist.remove.all': [];
    'before:flexdatalist.toggle': { value: string; text: string; action: 'enable' | 'disable' };
    'after:flexdatalist.toggle': { value: string; text: string; action: 'enable' | 'disable' };
    'before:flexdatalist.search': { keywords: string; data: FlexdatalistItem[] };
    'after:flexdatalist.search': { keywords: string; data: FlexdatalistItem[]; results: FlexdatalistItem[] };
    'before:flexdatalist.data': null;
    'after:flexdatalist.data': FlexdatalistItem[];
    'show:flexdatalist.results': FlexdatalistItem[];
    'shown:flexdatalist.results': FlexdatalistItem[];
    'item:flexdatalist.results': FlexdatalistItem;
    'empty:flexdatalist.results': [string];
    'remove:flexdatalist.results': null;
    'removed:flexdatalist.results': null;
}

export type FlexdatalistEventName = keyof FlexdatalistEventDetailMap;

export declare class Flexdatalist {
    /** Defaults merged into every instance (may be changed globally). */
    static defaults: Required<FlexdatalistOptions>;
    /** Options that need a new instance to change (`setOption` ignores them). */
    static structuralOptions: string[];

    /** Initialise one or more inputs; resolves once their initial values are loaded. */
    static init(selector: string | HTMLElement | NodeList | HTMLElement[], options?: FlexdatalistOptions): Promise<Flexdatalist[]>;
    /** The instance attached to an element, or null. */
    static getInstance(element: HTMLElement | string): Flexdatalist | null;

    constructor(element: HTMLInputElement | string, options?: FlexdatalistOptions);

    /** Resolves with the instance once the initial value has been loaded. */
    readonly ready: Promise<Flexdatalist>;

    getOption<K extends keyof FlexdatalistResolvedOptions>(name: K): FlexdatalistResolvedOptions[K];
    setOption<K extends keyof FlexdatalistOptions>(name: K, value: FlexdatalistOptions[K]): this;

    /** String in single mode; array in multiple mode; object(s) with a JSON valueProperty. */
    getValue(): any;
    setValue(value: string | number | any[] | Record<string, any>): this;
    addValue(value: string | number | Array<string | number>): this;
    removeValue(value: string | number | Array<string | number>): this;
    toggleValue(value: string | number): this;
    clear(): this;
    getText(): string | string[];
    getText(format: 'array'): string | string[];
    getText(format: 'string' | string): string;

    disable(): this;
    enable(): this;
    readonly(): boolean;
    readonly(state: boolean): this;
    isDisabled(): boolean;
    isReadonly(): boolean;

    search(keyword: string): this;
    closeResults(): this;

    on<K extends FlexdatalistEventName>(event: K, handler: (event: CustomEvent<FlexdatalistEventDetailMap[K]>) => void): this;
    on(event: string, handler: (event: CustomEvent<any>) => void): this;
    off<K extends FlexdatalistEventName>(event: K, handler: (event: CustomEvent<FlexdatalistEventDetailMap[K]>) => void): this;
    off(event: string, handler: (event: CustomEvent<any>) => void): this;

    /** Remove the widget and restore the original input (optionally clearing it). */
    destroy(clear?: boolean): void;
}

export default Flexdatalist;
