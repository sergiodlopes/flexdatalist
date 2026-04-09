/**
 * Flexdatalist — standalone ES6 class.
 *
 * Autocomplete / tag input with remote & static data, grouping, keyboard
 * navigation, localStorage caching, and a clean chainable API.
 *
 * Compatible CSS: use flexdatalist.css (class names are identical to v2).
 *
 * @author Sergio Dinis Lopes <flexdatalist@sergiodinislopes.pt>
 * @copyright 2016-2026 Sergio Dinis Lopes
 * @version 3.1.1
 * @license MIT
 *
 * Basic usage
 * -----------
 * ```js
 * // Initialize one or many inputs
 * const [fd] = await Flexdatalist.init('#city', { url: '/api/cities', minLength: 2 });
 *
 * // Chainable API
 * fd.setValue('Paris').disable().on('select:flexdatalist', e => console.log(e.detail));
 *
 * // Get the stored value at any time
 * console.log(fd.getValue());
 * ```
 *
 * Events are dispatched on the original <input> element as CustomEvents.
 * `e.detail` contains the payload described next to each event name in the
 * _dispatch() helper below.
 */
class Flexdatalist {

    // =========================================================================
    // Static – defaults & registry
    // =========================================================================

    /**
     * Default option values merged with every instance.
     * All keys can be overridden via the constructor options object or
     * via `data-*` attributes on the element (camelCase → kebab-case).
     *
     * @type {Object}
     */
    static defaults = {
        /** @type {string|null} Remote URL to fetch results from. */
        url: null,
        /** @type {Array|string} Static data array or URL string to pre-load. */
        data: [],
        /**
         * Extra query-string / body params sent with every remote request.
         * May also be a function `(keyword) => Object`.
         * @type {Object|Function}
         */
        params: {},
        /**
         * CSS selector or NodeList of inputs whose values are sent as
         * `relatives[name]` with every request.
         * @type {string|NodeList|null}
         */
        relatives: null,
        /** @type {boolean} Disable this input when all relatives are empty. */
        chainedRelatives: false,
        /** @type {boolean} Cache remote results in localStorage. */
        cache: true,
        /** @type {number} Cache lifetime in seconds. */
        cacheLifetime: 60,
        /** @type {number} Minimum characters before triggering search (0 = show all on focus). */
        minLength: 3,
        /** @type {string|false} Item property name to group results by. */
        groupBy: false,
        /**
         * Property (or `{placeholder}` pattern) used as the display text in
         * the alias input. Defaults to the first entry of `searchIn`.
         * @type {string|null}
         */
        textProperty: null,
        /**
         * Property name(s) stored as the actual value.
         * Use `'*'` to store the entire matched object as JSON.
         * @type {string|string[]|null}
         */
        valueProperty: null,
        /**
         * Properties rendered inside each result `<li>`.
         * Supports `{placeholder}` patterns. Defaults to `searchIn`.
         * @type {string[]}
         */
        visibleProperties: [],
        /** @type {string} Property containing an image URL rendered as <img>. */
        iconProperty: 'thumb',
        /** @type {string[]} Properties searched when filtering results. */
        searchIn: ['label'],
        /** @type {boolean} Match keyword anywhere in the string (not just at start). */
        searchContain: false,
        /** @type {boolean} Require exact full-string match. */
        searchEqual: false,
        /** @type {boolean} Split keyword on spaces and match all words independently. */
        searchByWord: false,
        /** @type {boolean} Skip local filtering entirely (rely on server-side search). */
        searchDisabled: false,
        /** @type {number} Debounce delay in ms before running a search. */
        searchDelay: 300,
        /**
         * Custom string normalizer called before comparison.
         * Signature: `(string) => string`
         * @type {Function|null}
         */
        normalizeString: null,
        /** @type {boolean|null} Allow multiple values. Inferred from [multiple] attribute when null. */
        multiple: null,
        /** @type {boolean|null} Start disabled. Inferred from [disabled] attribute when null. */
        disabled: null,
        /** @type {boolean} Require the user to select a result (disables free-text). */
        selectionRequired: false,
        /** @type {boolean} Automatically activate the first result item. */
        focusFirstResult: false,
        /** @type {string} Key in the remote JSON response that holds the results array. */
        resultsProperty: 'results',
        /** @type {number} Maximum number of results rendered (0 = unlimited). */
        maxShownResults: 100,
        /**
         * Collapse multiple-value tags after this many items.
         * Set `false` to disable collapsing.
         * @type {number|false}
         */
        collapseAfterN: 50,
        /** @type {string} Label for the collapse toggle. `{count}` is replaced. */
        collapsedValuesText: '{count} More',
        /** @type {string} Message shown when no results match. `{keyword}` is replaced. */
        noResultsText: 'No results found for "{keyword}"',
        /**
         * URL of a loading spinner image shown while fetching results.
         * Set null to disable.
         * @type {string|null}
         */
        resultsLoader: null,
        /** @type {boolean} Clicking a selected tag toggles its disabled state. */
        toggleSelected: false,
        /** @type {boolean} Allow the same value to be added more than once. */
        allowDuplicateValues: false,
        /** @type {boolean} Pressing Backspace on an empty alias marks then removes the last tag. */
        removeOnBackspace: true,
        /** @type {string} HTTP method for remote requests ('get' or 'post'). */
        requestType: 'get',
        /** @type {string} Content-type for POST bodies ('x-www-form-urlencoded' or 'json'). */
        requestContentType: 'x-www-form-urlencoded',
        /** @type {Object|null} Extra HTTP headers merged into every request. */
        requestHeaders: null,
        /** @type {string} Query-string parameter name that carries the typed keyword. */
        keywordParamName: 'keyword',
        /** @type {string} Query-string parameter name that carries the searchContain flag. */
        searchContainParamName: 'contain',
        /** @type {number} Maximum number of tags in multiple mode (0 = unlimited). */
        limitOfValues: 0,
        /** @type {string} Separator used when serialising multiple values into a string. */
        valuesSeparator: ',',
        /** @type {boolean} Show an "Add new item" option when no results exist. */
        showAddNewItem: false,
        /** @type {string} Text of the "Add new item" option. `{keyword}` is replaced. */
        addNewItemText: 'No results found for "{keyword}". Click to add it.',
        /**
         * External element to render results into instead of the auto-created
         * dropdown. When set, Flexdatalist will never create, position, or
         * destroy the container — only fill and clear its children.
         * Ideal for rendering results inside a dialog or custom panel.
         * @type {HTMLElement|string|null}
         */
        resultsContainer: null,
        /** @type {boolean} Log warnings to the console. */
        debug: true,
    };

    /** @type {WeakMap<HTMLElement, Flexdatalist>} */
    static #instances = new WeakMap();

    /** @type {boolean} Whether global document listeners have been attached. */
    static #globalBound = false;

    // =========================================================================
    // Static API
    // =========================================================================

    /**
     * Initialise Flexdatalist on one or more elements.
     * Returns a Promise that resolves after every instance has finished loading its initial value. Each instance also exposes `instance.ready` as a standalone Promise.
     *
     * @param {string|HTMLElement|NodeList} selector CSS selector, single element, or NodeList.
     * @param {Object} [options={}] Option overrides (see `Flexdatalist.defaults`).
     * @returns {Promise<Flexdatalist[]>} Resolves when all instances are ready.
     *
     * @example
     * const [fd] = await Flexdatalist.init('#city', { url: '/api/cities' });
     */
    static async init(selector, options = {}) {
        let els;
        if (typeof selector === 'string') {
            els = [...document.querySelectorAll(selector)];
        } else if (selector instanceof NodeList || Array.isArray(selector)) {
            els = [...selector];
        } else {
            els = [selector];
        }
        const instances = els.map(el => new Flexdatalist(el, options));
        await Promise.all(instances.map(fd => fd.ready));
        return instances;
    }

    /**
     * Return the Flexdatalist instance attached to a given element, or null.
     *
     * @param {HTMLElement|string} el
     * @returns {Flexdatalist|null}
     */
    static getInstance(el) {
        if (typeof el === 'string') {
            el = document.querySelector(el);
        }
        return this.#instances.get(el) ?? null;
    }

    // =========================================================================
    // Constructor
    // =========================================================================

    /**
     * Create a Flexdatalist instance on a single `<input>` element.
     * If the element already has an instance it is destroyed first.
     *
     * @param {HTMLInputElement|string} el  The target `<input>` element.
     * @param {Object} [options={}] Option overrides.
     * @throws {TypeError} If `el` is not an HTMLElement.
     */
    constructor(el, options = {}) {
        if (typeof el === 'string') {
            el = document.querySelector(el);
        }
        if (!(el instanceof HTMLElement)) {
            throw new TypeError('Flexdatalist: first argument must be an HTMLElement.');
        }

        if (el.classList.contains('flexdatalist-set')) {
            console.warn('Flexdatalist: element already has an instance. This might cause issues.', el);
            return;
        }

        // Destroy any existing instance on this element.
        Flexdatalist.getInstance(el)?.destroy();

        /** @type {HTMLInputElement} Original input, hidden off-screen — holds the submitted form value. */
        this._hiddenInput = el;

        /** @type {HTMLInputElement} Visible alias input (display only, never submitted). */
        this._alias = null;

        /** @type {HTMLUListElement|null} Wrapper `<ul>` used in multiple mode. */
        this._multipleEl = null;

        /** @type {string} Internal serialised value string. */
        this._value = el.value || '';

        /** @type {string[]} Display-text list used for duplicate detection. */
        this._texts = [];

        /** @type {boolean} Whether a result item was just selected (suppresses blur). */
        this._itemSelected = false;

        /** @type {boolean} Prevent fetching while the user is navigating away. */
        this._fetchDisabled = false;

        /** @type {{ url: string, data?: Object, success: Function }|null} Request that arrived while one was already in-flight; replayed after the current fetch settles. */
        this._pendingRequest = null;

        /** @type {number|null} setTimeout handle for debounced search. */
        this._searchTimeout = null;

        /** @type {number|null} setInterval handle for leave detection. */
        this._leaveInterval = null;

        /** @type {Object} Resolved options for this instance. */
        this._options = this._buildOptions(options);

        /** @type {HTMLElement|null} User-provided results container (never created/destroyed by us). */
        this._customContainer = null;
        const rc = this._options.resultsContainer;
        if (rc) {
            this._customContainer = typeof rc === 'string' ? document.querySelector(rc) : rc;
            if (!(this._customContainer instanceof HTMLElement)) {
                throw new TypeError('Flexdatalist: resultsContainer must be an HTMLElement or valid CSS selector.');
            }
            this._customContainer._fdCustom = true;
        }

        // @ts-ignore — TS false positive: static private access is valid inside the class body
        Flexdatalist.#instances.set(el, this);
        // @ts-ignore
        Flexdatalist.#bindGlobal();

        this._setUp();
        this._bindAlias();

        window.addEventListener('resize', () => this._position());
        this._cacheGC();

        // Save the initial value before selectionRequired's _clearValue wipes it.
        const initValue = this._value;

        if (this._options.selectionRequired) {
            this._clearValue(true, true);
        }

        /**
         * Resolves with this instance once the initial value has been loaded and
         * resolved against the data source. Resolves immediately when there is no
         * initial value. Use `await instance.ready` or `await Flexdatalist.init()`
         * to guarantee `getValue()` returns the correct value.
         *
         * @type {Promise<Flexdatalist>}
         */
        this.ready = new Promise(resolve => {
            if (initValue.length > 0) {
                this._hiddenInput.addEventListener('init:flexdatalist', () => resolve(this), { once: true });
            } else {
                resolve(this);
            }
        });

        if (initValue.length > 0) {
            this._value = initValue;
            this._hiddenInput.value = initValue;
            this._loadingStart();
            this._loadValue(initValue, () => {
                this._applyDisabled(this._options.disabled);
                this._loadingStop();
                this._dispatch('init:flexdatalist', this._options);
            }, true);
        } else {
            this._applyDisabled(this._options.disabled);
        }
    }

    // =========================================================================
    // Options
    // =========================================================================

    /**
     * Merge defaults, JS options, and element data-attributes into a resolved
     * options object.  Data-attributes take the form `data-my-option` (kebab-case).
     *
     * @param {Object} jsOpts Options passed to the constructor.
     * @returns {Object} Resolved and normalised options.
     */
    _buildOptions(jsOpts) {
        const el = this._hiddenInput;
        const sep = jsOpts.valuesSeparator ?? Flexdatalist.defaults.valuesSeparator;
        const dataOpts = {};

        for (const key of Object.keys(Flexdatalist.defaults)) {
            const attr = 'data-' + key.replace(/([A-Z])/g, c => '-' + c.toLowerCase());
            if (el.hasAttribute(attr)) {
                let v = el.getAttribute(attr);
                try { v = JSON.parse(v); } catch (_) {}
                dataOpts[key] = v;
            }
        }

        const o = { ...Flexdatalist.defaults, ...jsOpts, ...dataOpts };

        // Infer from HTML attributes when option is null.
        o.multiple = o.multiple === null ? el.hasAttribute('multiple') : o.multiple;
        o.disabled = o.disabled === null ? el.hasAttribute('disabled') : o.disabled;
        o.originalValue = this._value;

        // Normalise string → array options.
        if (typeof o.searchIn === 'string') {
            o.searchIn = o.searchIn.split(sep).map(s => s.trim());
        }
        if (!o.textProperty) {
            o.textProperty = o.searchIn[0];
        }
        if (typeof o.visibleProperties === 'string') {
            o.visibleProperties = o.visibleProperties.length > 0
                ? o.visibleProperties.split(sep).map(s => s.trim())
                : [...o.searchIn];
        }
        if (!o.visibleProperties?.length) {
            o.visibleProperties = [...o.searchIn];
        }

        // Relatives: CSS selector → NodeList → Array.
        if (typeof o.relatives === 'string') {
            o.relatives = [...document.querySelectorAll(o.relatives)];
        } else if (o.relatives instanceof NodeList) {
            o.relatives = [...o.relatives];
        }

        return o;
    }

    // =========================================================================
    // Public API — options
    // =========================================================================

    /**
     * Get a single option value.
     *
     * @param {string} name Option key (see `Flexdatalist.defaults`).
     * @returns {*} Current option value.
     */
    getOption(name) {
        return this._options[name];
    }

    /**
     * Set a single option value at runtime.
     *
     * @param {string} name  Option key.
     * @param {*}      value New value.
     * @returns {this} Chainable.
     */
    setOption(name, value) {
        this._options[name] = value;
        return this;
    }

    // =========================================================================
    // Public API — value
    // =========================================================================

    /**
     * Return the current value.
     * - Single mode → raw string or primitive.
     * - Multiple mode → array of values.
     * - JSON valueProperty → object or array of objects.
     *
     * @returns {string|Array|Object}
     */
    getValue() {
        if (this._options.multiple || this._isJSON()) {
            return this._toObj(this._value);
        }
        return this._value;
    }

    /**
     * Replace the current value.
     * Triggers data loading if `valueProperty` is set, so a server round-trip
     * may occur before the alias is updated.
     *
     * @param {string|Array|Object} val  New value.
     * @returns {this} Chainable.
     */
    setValue(val) {
        if (!this._isDisabled()) {
            this._clearValue(true);
            this._loadValue(val);
        }
        return this;
    }

    /**
     * Append one or more values (multiple mode only).
     *
     * @param {string|Array} val Value(s) to add.
     * @returns {this} Chainable.
     */
    addValue(val) {
        if (this._options.multiple && !this._isDisabled()) {
            const arr = Array.isArray(val) ? val : [val];
            for (const v of arr) this._loadValue(v);
        }
        return this;
    }

    /**
     * Remove a specific value (multiple mode only).
     *
     * @param {string} val The serialised value to remove.
     * @returns {this} Chainable.
     */
    removeValue(val) {
        if (!this._isDisabled()) {
            this._dispatch('before:flexdatalist.remove', val);
            const arr = Array.isArray(val) ? val : [val];
            for (const v of arr) this._multipleRemove(String(v));
        }
        return this;
    }

    /**
     * Toggle the disabled/enabled visual state of a tag (multiple + toggleSelected only).
     *
     * @param {string} val Tag value to toggle.
     * @returns {this} Chainable.
     */
    toggleValue(val) {
        if (!this._isDisabled()) this._multipleToggle(val);
        return this;
    }

    /**
     * Clear all selected values and reset the alias input.
     *
     * @returns {this} Chainable.
     */
    clear() {
        this._clearValue(true);
        return this;
    }

    /**
     * Return the user-facing display text(s) shown in the alias input.
     *
     * In single mode, always returns a plain `string` (mirroring `getValue()`).
     *
     * In multiple mode, `format` controls the return type:
     * @param {'array'|'string'|string} [format='array']
     *   - `'array'`  — returns a `string[]` (default).
     *   - `'string'` — joins with the configured `valuesSeparator` (e.g. `','`).
     *   - any other string — used directly as the join separator.
     * @returns {string|string[]}
     *
     * @example
     * // Single mode
     * fd.getText();              // 'Paris'
     *
     * // Multiple mode
     * fd.getText();              // ['Paris', 'London']
     * fd.getText('string');      // 'Paris,London'
     * fd.getText(' | ');         // 'Paris | London'
     */
    getText(format = 'array') {
        if (!this._options.multiple) {
            return this._alias?.value ?? '';
        }

        const texts = [...this._texts];
        if (format === 'array') {
            return texts;
        }

        const sep = format === 'string' ? this._options.valuesSeparator : format;
        return texts.join(sep);
    }

    // =========================================================================
    // Public API — state
    // =========================================================================

    /**
     * Disable the widget (prevents interaction and value changes).
     *
     * @returns {this} Chainable.
     */
    disable() {
        this._applyDisabled(true);
        return this;
    }

    /**
     * Enable the widget after it was disabled.
     *
     * @returns {this} Chainable.
     */
    enable() {
        this._applyDisabled(false);
        return this;
    }

    /**
     * Set or query the readonly state.
     * When `state` is omitted, returns the current readonly flag.
     *
     * @param {boolean} [state] Pass `true` to make readonly, `false` to remove.
     * @returns {this|boolean} `this` when setting, current state when getting.
     */
    readonly(state) {
        if (state === undefined) {
            return !!this._options.readonly;
        }
        this._applyReadonly(state);
        return this;
    }

    /**
     * Whether the widget is currently disabled.
     *
     * @returns {boolean}
     */
    isDisabled() {
        return this._isDisabled();
    }

    /**
     * Whether the widget is currently readonly.
     *
     * @returns {boolean}
     */
    isReadonly() {
        return !!this._options.readonly;
    }

    // =========================================================================
    // Public API — search
    // =========================================================================

    /**
     * Programmatically trigger a search with the given keyword.
     * Results are displayed as if the user had typed the keyword.
     *
     * @param {string} keyword Search string.
     * @returns {this} Chainable.
     */
    search(keyword) {
        this._alias.value = keyword;
        this._dataLoad(data => {
            this._searchGet(keyword, data, matches => this._resultsShow(matches));
        });
        return this;
    }

    /**
     * Close the results dropdown.
     *
     * @returns {this} Chainable.
     */
    closeResults() {
        this._resultsRemove();
        return this;
    }

    // =========================================================================
    // Public API — events
    // =========================================================================

    /**
     * Subscribe to a Flexdatalist event dispatched on the original input.
     *
     * Common events:
     * - `init:flexdatalist`           — widget initialised
     * - `select:flexdatalist`         — a result was selected
     * - `change:flexdatalist`         — value changed
     * - `clear:flexdatalist`          — values were cleared
     * - `addnew:flexdatalist`         — "add new item" was clicked
     * - `before:flexdatalist.value`   — before value extraction
     * - `after:flexdatalist.value`    — after value extraction
     * - `before:flexdatalist.select`  — before selection applied
     * - `after:flexdatalist.select`   — after selection applied
     * - `before:flexdatalist.remove`  — before a tag is removed
     * - `after:flexdatalist.remove`   — after a tag is removed
     * - `before:flexdatalist.search`  — before local filtering
     * - `after:flexdatalist.search`   — after local filtering
     * - `show:flexdatalist.results`   — results about to be rendered
     * - `shown:flexdatalist.results`  — results were rendered
     * - `item:flexdatalist.results`   — a result `<li>` was created
     * - `empty:flexdatalist.results`  — no results found
     * - `remove:flexdatalist.results` — dropdown is being removed
     * - `before:flexdatalist.data`    — before data loading
     * - `after:flexdatalist.data`     — data loaded
     *
     * @param {string}   event    Event name (e.g. `'select:flexdatalist'`).
     * @param {Function} handler  Callback receiving the native CustomEvent.
     * @returns {this} Chainable.
     */
    on(event, handler) {
        this._hiddenInput.addEventListener(event, handler);
        return this;
    }

    /**
     * Unsubscribe an event handler previously registered with `on()`.
     *
     * @param {string}   event   Event name.
     * @param {Function} handler The same function reference passed to `on()`.
     * @returns {this} Chainable.
     */
    off(event, handler) {
        this._hiddenInput.removeEventListener(event, handler);
        return this;
    }

    // =========================================================================
    // Public API — lifecycle
    // =========================================================================

    /**
     * Destroy this instance, restore the original `<input>`, and remove all
     * injected DOM nodes.
     *
     * @param {boolean} [clear=false] Also clear the original input's value.
     */
    destroy(clear = false) {
        const el = this._hiddenInput;
        const container = this._multipleEl ?? this._alias;

        el.classList.remove('flexdatalist', 'flexdatalist-set');
        el.style.position = '';
        el.style.top = '';
        el.style.left = '';
        el.removeAttribute('tabindex');
        el.value = !clear && this._options?.originalValue ? this._options.originalValue : '';

        container?.remove();

        if (this._customContainer) {
            this._customContainer.replaceChildren();
            this._customContainer.classList.remove('flexdatalist-results', 'flexdatalist-fetching-results');
            this._customContainer.removeAttribute('role');
            delete this._customContainer._fdTarget;
            delete this._customContainer._fdInput;
            delete this._customContainer._fdCustom;
            this._customContainer = null;
        }

        // @ts-ignore
        Flexdatalist.#instances.delete(el);
    }

    // =========================================================================
    // Internal – DOM setup
    // =========================================================================

    /**
     * Build and insert all DOM nodes for the widget.
     *
     * @private
     */
    _setUp() {
        const el = this._hiddenInput;
        const o = this._options;

        this._alias = this._makeAlias();

        if (o.multiple) {
            this._multipleEl = this._makeMultiple(this._alias);
        } else {
            el.insertAdjacentElement('afterend', this._alias);
        }

        this._setA11y(this._alias);

        if (el.hasAttribute('autofocus')) this._alias.focus();

        // Hide the original input; it still participates in form submission.
        el.style.cssText += ';position:absolute;top:-14000px;left:-14000px';
        el.setAttribute('tabindex', '-1');
        el.classList.add('flexdatalist', 'flexdatalist-set');

        // Re-point any <label> at the alias so click-to-focus works.
        if (el.id) {
            document.querySelector(`label[for="${el.id}"]`)?.setAttribute('for', this._alias.id);
        }

        this._setupChained(true);
    }

    /**
     * Create the visible alias `<input>`.
     * The alias intentionally has no `name` attribute, so it is never
     * included in form submissions (only the original hidden input is).
     *
     * @private
     * @returns {HTMLInputElement}
     */
    _makeAlias() {
        const el = this._hiddenInput;
        const id = el.id ? el.id + '-flexdatalist' : 'fdl-' + Math.random().toString(36).slice(2, 9);

        const alias = document.createElement('input');
        alias.type = 'text';

        // Copy classes from original, excluding flexdatalist itself.
        alias.className = [...el.classList].filter(c => c !== 'flexdatalist').join(' ');
        alias.classList.add('flexdatalist-alias', id);

        // No name → never submitted.
        alias.id = id;
        alias.placeholder = el.placeholder || '';
        alias.autocomplete = 'off';
        return alias;
    }

    /**
     * Create the `<ul>` wrapper used in multiple-value mode.
     * The alias `<input>` is appended as the last `<li>`.
     *
     * @private
     * @param {HTMLInputElement} alias
     * @returns {HTMLUListElement}
     */
    _makeMultiple(alias) {
        const el = this._hiddenInput;
        const cs = getComputedStyle(el);
        const ul = document.createElement('ul');
        ul.setAttribute('tabindex', '1');
        ul.className = 'flexdatalist-multiple';
        ul.style.borderColor = cs.borderLeftColor;
        ul.style.borderWidth = cs.borderLeftWidth;
        ul.style.borderStyle = cs.borderLeftStyle;
        ul.style.borderRadius = cs.borderTopLeftRadius;
        ul.style.backgroundColor = cs.backgroundColor;
        ul.addEventListener('click', () => alias.focus());

        const li = document.createElement('li');
        li.className = 'input-container flexdatalist-multiple-value';
        li.appendChild(alias);
        ul.appendChild(li);

        el.insertAdjacentElement('afterend', ul);
        return ul;
    }

    /**
     * Apply ARIA attributes to the alias input for screen-reader support.
     *
     * @private
     * @param {HTMLInputElement} alias
     */
    _setA11y(alias) {
        alias.setAttribute('aria-autocomplete', 'list');
        alias.setAttribute('aria-expanded', 'false');
        alias.setAttribute('aria-owns', alias.id + '-results');
    }

    /**
     * Wire up chained-relatives behaviour: disable this input when all
     * relative inputs are empty.
     *
     * @private
     * @param {boolean} init Whether this is the first call during setup.
     */
    _setupChained(init) {
        const o = this._options;
        if (!o.relatives?.length || !o.chainedRelatives) return;
        const toggle = () => {
            const allEmpty = o.relatives.every(r => this._isEmpty(r.value));
            this._applyReadonly(allEmpty);
        };
        for (const rel of o.relatives) rel.addEventListener('change', toggle);
        toggle();
    }

    // =========================================================================
    // Internal – alias event binding
    // =========================================================================

    /**
     * Attach all event listeners to the alias `<input>`.
     *
     * @private
     */
    _bindAlias() {
        const alias = this._alias;

        alias.addEventListener('focusin', () => {
            this._multipleEl?.classList.add('focus');
            this._actAddValueOnLeave();
        });

        alias.addEventListener('focusout', () => {
            this._multipleEl?.classList.remove('focus');
            this._actClearText();
            this._actClearValue();
        });

        // Show all options on click only when minLength is 0 (explicit opt-in).
        alias.addEventListener('click', e => this._actShowAll(e));

        alias.addEventListener('keydown', e => this._onKeydown(e));
        alias.addEventListener('input',   e => this._onKeydown(e));
        alias.addEventListener('keyup',   e => this._onKeyup(e));
        // 'input' fires on every change; treat it like keyup for search.
        alias.addEventListener('input',   e => this._onKeyup(e));

        alias.addEventListener('paste', e => this._onPaste(e));
    }

    /**
     * Attach once-per-page global listeners (outside click, keyboard navigation,
     * bfcache restore).  Subsequent calls are no-ops.
     *
     * @private
     * @static
     */
    static #bindGlobal() {
        if (this.#globalBound) {
            return;
        }
        this.#globalBound = true;

        // Close results when clicking outside (skipped for custom containers).
        document.addEventListener('mouseup', e => {
            const ul = document.querySelector('.flexdatalist-results');
            if (!ul || ul._fdCustom) {
                return;
            }
            const target = ul._fdTarget;
            if (target && target === document.activeElement) return;
            if (!ul.contains(e.target) && ul !== e.target) ul.remove();
        });

        // Arrow key navigation + Enter/Escape.
        document.addEventListener('keydown', e => {
            const ul = document.querySelector('.flexdatalist-results');
            if (!ul) {
                return;
            }

            const items = [...ul.querySelectorAll('li.item')];
            if (!items.length) {
                return;
            }

            const key = e.key;
            const custom = ul._fdCustom;

            if (key === 'Escape') { if (!custom) ul.remove(); return; }

            if (key === 'Enter') {
                const active = ul.querySelector('li.item.active');
                if (active) { e.preventDefault(); active.click(); }
                else if (!custom) { e.preventDefault(); ul.remove(); }
                return;
            }

            if (key === 'ArrowDown' || key === 'ArrowUp') {
                e.preventDefault();
                const active = ul.querySelector('li.item.active');
                const idx = active ? items.indexOf(active) : -1;
                active?.classList.remove('active');

                const next = key === 'ArrowDown'
                    ? (items[idx + 1] ?? items[0])
                    : (items[idx - 1] ?? items[items.length - 1]);

                next?.classList.add('active');
                if (next) ul.scrollTop = next.offsetTop;
            }
        });

        // Restore display text after bfcache navigation (browser back/forward).
        window.addEventListener('pageshow', e => {
            if (!e.persisted) return;
            document.querySelectorAll('input.flexdatalist-set').forEach(el => {
                const fd = Flexdatalist.getInstance(el);
                const aliasId = el.id ? el.id + '-flexdatalist' : '';
                const alias = aliasId ? document.getElementById(aliasId) : null;
                if (fd && el.value && (!alias || !alias.value)) fd.setValue(el.value);
            });
        });

        // Auto-init on page load (same behaviour as the jQuery plugin).
        document.addEventListener('DOMContentLoaded', () => {
            Flexdatalist.init('input.flexdatalist:not(.flexdatalist-set):not(.autodiscover-disabled)');
        });
    }

    // =========================================================================
    // Internal – key handlers
    // =========================================================================

    /**
     * Handle `keydown` and `input` events on the alias.
     *
     * @private
     * @param {KeyboardEvent|InputEvent} e
     */
    _onKeydown(e) {
        const key = e.key;
        const o = this._options;

        if (key === 'Tab') this._resultsRemove();

        this._actKeypressValue(e, ','); // Comma → add tag
        this._actBackspace(e);

        // Prevent form submission when Enter is pressed with no results.
        if (o.multiple && this._alias.value.length > 0 && key === 'Enter') {
            if (!document.querySelectorAll('.flexdatalist-results li:not(.no-results)').length) {
                e.preventDefault();
            }
        }
    }

    /**
     * Handle `keyup` and secondary `input` events on the alias.
     *
     * @private
     * @param {KeyboardEvent|InputEvent} e
     */
    _onKeyup(e) {
        const key = e.key;
        const o = this._options;
        let ignoreEnter = false;

        if (o.multiple && this._alias.value.length > 0 && key === 'Enter') {
            if (!document.querySelector('.flexdatalist-results li.item.active')) {
                if (!o.selectionRequired) this._actKeypressValue(e, 'Enter');
                ignoreEnter = true;
            }
        }

        this._actSearch(e);
        this._actCopyValue(e);
        this._actBackspace(e);
        this._actShowAll(e);
        this._actClearValue();
        this._actRemoveResults();

        if (!this._alias.value.length) this._actClearValue();
        if (ignoreEnter) { e.preventDefault(); return false; }
    }

    /**
     * Handle the `paste` event on the alias.
     * Splits pasted text on commas and newlines, then adds each as a value.
     *
     * @private
     * @param {ClipboardEvent} e
     */
    _onPaste(e) {
        let text = e.clipboardData?.getData('text/plain') ?? '';
        if (!text) return;
        e.preventDefault();
        e.stopPropagation();

        for (const nl of ['\r\n', '\n\r', '\n', '\r']) {
            if (text.includes(nl)) { text = text.split(nl).join(','); break; }
        }
        this.addValue(text.split(',').filter(v => v.length > 0));
        setTimeout(() => this._alias.focus(), 200);
    }

    // =========================================================================
    // Internal – actions (triggered by key events)
    // =========================================================================

    /**
     * Add the current alias text as a tag when Enter (13) or comma (188) is pressed.
     *
     * @private
     * @param {KeyboardEvent} e
     * @param {number}        keyCode  Key code that triggers the add.
     */
    _actKeypressValue(e, keyName) {
        const key = e.key;
        const o = this._options;
        if (this._alias.value.length > 0 && key === keyName && !o.selectionRequired && o.multiple) {
            e.preventDefault();
            e.stopPropagation();
            this._extractValue(this._alias.value);
            this._resultsRemove();
        }
    }

    /**
     * Start a recurring interval that commits a pending free-text value when
     * focus leaves the widget (multiple + !selectionRequired only).
     *
     * @private
     */
    _actAddValueOnLeave() {
        const o = this._options;
        if (this._leaveInterval || o.selectionRequired || !o.multiple) return;
        const parentId = this._hiddenInput.id;

        this._leaveInterval = setInterval(() => {
            const activeId = (document.activeElement?.id ?? '').replace('-flexdatalist', '');
            if (parentId === activeId || this._itemSelected) return;

            this._fetchDisabled = true;
            if (this._alias.value.length > 0) {
                this._extractValue(this._alias.value);
                this._resultsRemove();
            }

            clearInterval(this._leaveInterval);
            this._leaveInterval = null;
        }, 800);
    }

    /**
     * Debounce and trigger a search based on the current alias value.
     *
     * @private
     * @param {KeyboardEvent|InputEvent} e
     */
    _actSearch(e) {
        const key = e.key;
        const o = this._options;
        const kw = this._alias.value;

        this._fetchDisabled = false;
        clearTimeout(this._searchTimeout);

        // Ignore navigation keys (arrows, enter).
        const navKeys = ['Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
        if (!key || !navKeys.includes(key)) {
            this._searchTimeout = setTimeout(() => {
                const len = kw.length;
                if ((o.minLength === 0 && len > 0) || len >= o.minLength) {
                    this._resultsRemove();
                    this._resultsLoadingStart();
                    this._dataLoad(data => {
                        this._resultsLoadingStop();
                        this._searchGet(kw, data, matches => this._resultsShow(matches));
                    });
                }
            }, o.searchDelay);
        }
    }

    /**
     * Copy alias text to the hidden input in single + !selectionRequired mode.
     *
     * @private
     * @param {KeyboardEvent} e
     */
    _actCopyValue(e) {
        if (e.key === 'Enter') return;
        const o = this._options;
        if (!o.multiple && !o.selectionRequired && this._alias.value.length !== this._value.length) {
            this._extractValue(this._alias.value);
        }
    }

    /**
     * Handle Backspace: first press marks the last tag, second press removes it.
     *
     * @private
     * @param {KeyboardEvent} e
     */
    _actBackspace(e) {
        const o = this._options;
        if (!o.removeOnBackspace || !o.multiple || e.key !== 'Backspace') return;

        if (!this._alias.value.length) {
            const toRemove = this._alias._fdRemove;
            if (toRemove) {
                this._multipleRemove(toRemove.dataset.value);
                this._alias._fdRemove = null;
            } else {
                const ic = this._multipleEl?.querySelector('li.input-container');
                this._alias._fdRemove = ic?.previousElementSibling ?? null;
            }
        } else {
            this._alias._fdRemove = null;
        }
    }

    /**
     * Show all results when `minLength` is 0 and alias is empty.
     *
     * @private
     * @param {Event} e
     */
    _actShowAll(e) {
        if (!this._alias.value.trim() && this._options.minLength === 0) {
            this._dataLoad(data => this._resultsShow(data));
        }
    }

    /**
     * Clear alias text if selectionRequired and nothing is selected.
     *
     * @private
     */
    _actClearText() {
        const o = this._options;
        if (!o.multiple && o.selectionRequired && !this._value.length) {
            this._alias.value = '';
        }
    }

    /**
     * Clear stored value when alias falls below minLength.
     *
     * @private
     */
    _actClearValue() {
        const o = this._options;
        if (!o.multiple && o.selectionRequired && this._alias.value.length <= o.minLength) {
            this._clearValue();
        }
    }

    /**
     * Remove the results dropdown when alias falls below minLength.
     *
     * @private
     */
    _actRemoveResults() {
        const o = this._options;
        if (o.minLength > 0 && this._alias.value.length < o.minLength) this._resultsRemove();
    }

    // =========================================================================
    // Internal – value management
    // =========================================================================

    /**
     * Load a value (or array of values) — resolving against remote/static data
     * when `valueProperty` is configured.
     *
     * @private
     * @param {string|Array|Object} values   The raw value(s) to load.
     * @param {Function}            [cb]     Called with resolved values.
     * @param {boolean}             [init]   True during constructor init (suppresses events).
     */
    _loadValue(values, cb, init) {
        const o = this._options;
        let vProps = o.valueProperty;
        cb = cb ?? (() => {});

        const vStr = this._toStr(values);
        if (!vStr.length && !this._value.length) {
            cb(values);
            return;
        }

        values = this._toObj(values);

        if (!this._isEmpty(values) && !this._isEmpty(vProps) && vProps !== '*') {
            if (typeof vProps === 'string') {
                vProps = vProps.split(',');
            }
            if (!this._isObj(values)) {
                values = values.split(',');
            } else if (!Array.isArray(values)) {
                values = [values];
            }

            this._dataLoad(data => {
                for (let vi = 0; vi < values.length; vi++) {
                    const v = values[vi];
                    for (const item of data) {
                        for (const prop of vProps) {
                            const cmp = this._prop(v, prop) ?? v;
                            if (this._prop(item, prop) === undefined) {
                                continue;
                            }
                            if (String(cmp) !== String(item[prop])) {
                                continue;
                            }
                            values[vi] = item;
                        }
                    }
                }
                if (values.length) {
                    this._extractValue(values, init);
                }
                cb(values);
            }, values);
            return;
        }

        cb(values);
        this._extractValue(values, init);
    }

    /**
     * Extract the display text and stored value from `values`, then update the
     * alias input and hidden input accordingly.
     *
     * @private
     * @param {string|Array|Object} values
     * @param {boolean} [init]  Suppress events when true.
     */
    _extractValue(values, init) {
        if (!init) {
            this._dispatch('before:flexdatalist.value', values);
        }

        const result = [];
        if (Array.isArray(values)) {
            for (const v of values) {
                result.push(this._extractOne(v));
            }
        } else {
            result.push(this._extractOne(values));
        }

        if (init === false) {
            return;
        }

        this._dispatch('after:flexdatalist.value', result);
        this._dispatch('change:flexdatalist', this._changePayload());
        this._dispatch('change');
    }

    /**
     * Extract and apply a single item: update alias display and hidden value.
     *
     * @private
     * @param {string|Object} val
     * @returns {{ value: string, text: string }}
     */
    _extractOne(val) {
        const text = this._getText(val);
        const value = this._getVal(val);
        const o = this._options;

        if (o.multiple) {
            if (!this._isEmpty(text) && !this._isDup(text)) {
                this._texts.push(text);
                this._multipleAdd(value, text);
            }
        } else {
            if (text && text !== this._alias.value) {
                this._alias.value = text;
            }
            this._value = value;
            this._hiddenInput.value = this._value;
        }

        return { value, text };
    }

    /**
     * Derive the display text for `item`.
     * Honours `textProperty` and `{placeholder}` patterns.
     *
     * @private
     * @param {string|Object} item
     * @returns {string}
     */
    _getText(item) {
        if (!this._isObj(item)) {
            return item;
        }
        const o = this._options;
        let text = this._prop(item, o.searchIn[0]);
        if (this._prop(item, o.textProperty) !== undefined) {
            text = this._prop(item, o.textProperty);
        } else {
            text = this._replacePlaceholders(item, o.textProperty, text);
        }
        return text;
    }

    /**
     * Derive the stored value for `item`.
     * Handles scalar, specific property, `valueProperty:'*'` (whole object as JSON),
     * and array-of-properties modes.
     *
     * @private
     * @param {string|Object} item
     * @returns {string}
     */
    _getVal(item) {
        if (!this._isObj(item)) {
            return item;
        }
        const o  = this._options;
        const vp = o.valueProperty;

        if (this._isJSON() || this._isMixed()) {
            const clone = { ...item };
            delete clone.name_highlight;
            if (Array.isArray(vp)) {
                const out = {};
                for (const p of vp) { const v = this._prop(item, p); if (v !== undefined) out[p] = v; }
                return this._toStr(out);
            }
            return this._toStr(clone);
        }
        if (this._prop(item, vp) !== undefined) {
            return this._prop(item, vp);
        }
        if (this._prop(item, o.searchIn[0]) !== undefined) {
            return this._prop(item, o.searchIn[0]);
        }
        return null;
    }

    /**
     * Reset stored value and visible tags.
     *
     * @private
     * @param {boolean} [clearAlias] Also clear the alias input text.
     * @param {boolean} [init]       Suppress events.
     */
    _clearValue(clearAlias, init) {
        const prev = this._value;
        const o = this._options;

        if (o.multiple) {
            this._multipleRemoveAll();
        }
        this._value = '';
        this._hiddenInput.value = '';
        this._texts = [];
        if (clearAlias) {
            this._alias.value = '';
        }
        if (prev !== '' && !init) {
            this._dispatch('change:flexdatalist', { value: '', text: '' });
            this._dispatch('clear:flexdatalist');
            this._dispatch('change');
        }
    }

    /**
     * Deserialise a value string into its native type (array, object, string).
     *
     * @private
     * @param {string|Array|Object} val
     * @returns {string|Array|Object}
     */
    _toObj(val) {
        if (typeof val === 'object') {
            return val;
        }
        const o = this._options;
        if (this._isEmpty(val)) {
            return o.multiple ? [] : (this._isJSON() ? {} : '');
        }
        if (this._isCSV()) {
            return val.toString().split(o.valuesSeparator).map(v => v.trim());
        }
        if ((this._isMixed() || this._isJSON()) && /^[\[{]/.test(val)) {
            return JSON.parse(val);
        }
        if (typeof val === 'number') {
            return val.toString();
        }
        return val;
    }

    /**
     * Serialise a value (array / object / primitive) into a string for storage.
     *
     * @private
     * @param {*} val
     * @returns {string}
     */
    _toStr(val) {
        if (typeof val === 'string') {
            return val.trim();
        }
        const o = this._options;
        if (this._isEmpty(val)) {
            return '';
        }
        if (typeof val === 'number') {
            return val.toString();
        }
        if (this._isCSV()) {
            return val.join(o.valuesSeparator);
        }
        if (this._isJSON() || this._isMixed()) {
            return JSON.stringify(val);
        }
        return '';
    }

    /**
     * Determine whether the valueProperty configuration expects JSON storage.
     * When called with a string argument, checks if that string is a JSON object.
     *
     * @private
     * @param {string} [str] Optional: test a specific string.
     * @returns {boolean}
     */
    _isJSON(str) {
        if (str !== undefined) {
            if (this._isObj(str)) {
                str = JSON.stringify(str);
            }
            if (typeof str !== 'string') {
                return false;
            }
            return str[0] === '{' || str.startsWith('[{');
        }
        const vp = this._options.valueProperty;
        return this._isObj(vp) || vp === '*';
    }

    /**
     * Whether the input accepts mixed (JSON + free-text) values.
     *
     * @private
     * @returns {boolean}
     */
    _isMixed() {
        const o = this._options;
        return !o.selectionRequired && (o.valueProperty === '*' || this._isObj(o.valueProperty));
    }

    /**
     * Whether the serialised value should be a comma-separated string.
     *
     * @private
     * @returns {boolean}
     */
    _isCSV() {
        return !this._isJSON() && this._options.multiple;
    }

    /**
     * Return true if `txt` already exists in the current tag list and duplicate
     * values are not allowed.
     *
     * @private
     * @param {string} txt Display text to check.
     * @returns {boolean}
     */
    _isDup(txt) {
        return !this._options.allowDuplicateValues && this._texts.includes(txt);
    }

    // =========================================================================
    // Internal – multiple value DOM
    // =========================================================================

    /**
     * Add a new tag to the multiple-value `<ul>`.
     *
     * @private
     * @param {string} val   Serialised value stored on the tag element.
     * @param {string} txt   Display text shown inside the tag.
     */
    _multipleAdd(val, txt) {
        const li = this._multipleMakeLi(val, txt);

        li.addEventListener('click', () => this._multipleToggle(li));
        li.querySelector('.fdl-remove')?.addEventListener('click', e => {
            e.stopPropagation();
            this._multipleRemove(li.dataset.value);
        });

        // Push value into serialised storage.
        const current = this.getValue();
        if (!current.includes(val)) {
            current.push(this._toObj(val));
            this._value = this._toStr(current);
            this._hiddenInput.value = this._value;
        }

        this._alias.value = '';
        this._multipleHandleLimit();
        this._multipleCollapse();
    }

    /**
     * Toggle the visual disabled state of a tag (only when `toggleSelected` is on).
     *
     * @private
     * @param {HTMLLIElement|string} liOrVal Tag element or value string.
     */
    _multipleToggle(liOrVal) {
        const o = this._options;
        if (!o.toggleSelected) {
            return;
        }
        const li = liOrVal instanceof HTMLElement ? liOrVal : this._multipleFindLi(String(liOrVal));
        if (!li) {
            return;
        }

        const action = li.classList.contains('disabled') ? 'enable' : 'disable';
        const togglePayload = { value: li.dataset.value, text: li.dataset.text, action };
        this._dispatch('before:flexdatalist.toggle', togglePayload);

        li.classList.toggle('disabled', action === 'disable');

        this._value = this._toStr(
            [...this._multipleEl.querySelectorAll('li.toggle:not(.disabled)')].map(l => l.dataset.value)
        );
        this._hiddenInput.value = this._value;

        this._dispatch('after:flexdatalist.toggle', togglePayload);
        this._dispatch('change:flexdatalist', this._changePayload());
        this._dispatch('change');
    }

    /**
     * Remove a tag by its serialised value.
     *
     * @private
     * @param {string} val Serialised value (matches `li.dataset.value`).
     * @returns {{ value: string, text: string }|undefined} Removed item data.
     */
    _multipleRemove(val) {
        const li = this._multipleFindLi(val);
        if (!li) {
            return;
        }

        const all = [...this._multipleEl.querySelectorAll('li:not(.input-container)')];
        const idx = all.indexOf(li);
        const arg = { value: li.dataset.value, text: li.dataset.text };

        const current = this.getValue();
        current.splice(idx, 1);
        this._value = this._toStr(current);
        this._hiddenInput.value = this._value;
        this._texts.splice(idx, 1);
        li.remove();
        this._multipleHandleLimit();

        this._dispatch('after:flexdatalist.remove', this._changePayload());
        this._dispatch('change:flexdatalist', this._changePayload());
        this._dispatch('change');
        return arg;
    }

    /**
     * Remove all tags from the multiple-value `<ul>`.
     *
     * @private
     */
    _multipleRemoveAll() {
        if (!this._multipleEl) {
            return;
        }
        this._dispatch('before:flexdatalist.remove.all', this.getValue());
        this._multipleEl.querySelectorAll('li:not(.input-container)').forEach(l => l.remove());
        this._value = '';
        this._hiddenInput.value = '';
        this._texts = [];
        this._multipleHandleLimit();
        this._dispatch('after:flexdatalist.remove.all', []);
    }

    /**
     * Create and insert a tag `<li>` before the input container.
     *
     * @private
     * @param {string} val  Serialised value.
     * @param {string} txt  Display text.
     * @returns {HTMLLIElement}
     */
    _multipleMakeLi(val, txt) {
        const o = this._options;
        const li = document.createElement('li');
        li.className = 'value' + (o.toggleSelected ? ' toggle' : '');
        li.dataset.text  = txt;
        li.dataset.value = this._toStr(val);

        const span = document.createElement('span');
        span.className = 'text';
        span.textContent = txt;

        const rm = document.createElement('span');
        rm.className = 'fdl-remove';
        rm.innerHTML = '&times;';

        li.appendChild(span);
        li.appendChild(rm);

        const ic = this._multipleEl.querySelector('li.input-container');
        this._multipleEl.insertBefore(li, ic);
        return li;
    }

    /**
     * Show or hide the alias input container based on `limitOfValues`.
     *
     * @private
     */
    _multipleHandleLimit() {
        if (!this._multipleEl) return;
        const limit = this._options.limitOfValues;
        const ic = this._multipleEl.querySelector('li.input-container');
        if (ic) ic.style.display = (limit > 0 && this._texts.length >= limit) ? 'none' : '';
    }

    /**
     * Find a tag `<li>` element by its serialised value.
     *
     * @private
     * @param {string} val
     * @returns {HTMLLIElement|null}
     */
    _multipleFindLi(val) {
        if (!this._multipleEl) return null;
        return [...this._multipleEl.querySelectorAll('li:not(.input-container)')]
            .find(li => li.dataset.value === String(val)) ?? null;
    }

    /**
     * Collapse tags beyond `collapseAfterN` into a single "N More" control.
     *
     * @private
     */
    _multipleCollapse() {
        const o = this._options;
        if (o.collapseAfterN === false) return;
        const items = [...this._multipleEl.querySelectorAll('li.value')];
        if (items.length <= o.collapseAfterN) return;

        this._multipleExpand(); // reset first

        items.forEach((item, i) => {
            if (i + 1 > o.collapseAfterN) item.classList.add('flexdatalist-collapsed-item');
        });

        const count = this._multipleEl.querySelectorAll('li.flexdatalist-collapsed-item').length;
        const ctrl = document.createElement('li');
        ctrl.className = 'flexdatalist-collapsed-control';
        ctrl.textContent = o.collapsedValuesText.replace('{count}', count);
        ctrl.addEventListener('click', () => this._multipleExpand());

        const ic = this._multipleEl.querySelector('li.input-container');
        this._multipleEl.insertBefore(ctrl, ic);
    }

    /**
     * Expand previously collapsed tags.
     *
     * @private
     */
    _multipleExpand() {
        if (!this._multipleEl) return;
        this._multipleEl.querySelectorAll('li.flexdatalist-collapsed-item')
            .forEach(l => l.classList.remove('flexdatalist-collapsed-item'));
        this._multipleEl.querySelector('li.flexdatalist-collapsed-control')?.remove();
    }

    // =========================================================================
    // Internal – data loading
    // =========================================================================

    /**
     * Load data from all three sources (remote, static, `<datalist>`), merge
     * them, then call `callback` with the combined array.
     *
     * @private
     * @param {Function} callback  `(data: Object[]) => void`
     * @param {*}        [load]    Optional value passed to the remote fetch
     *                             (used during initialisation to pre-populate).
     */
    _dataLoad(callback, load) {
        if (this._fetchDisabled) return;
        this._dispatch('before:flexdatalist.data');

        let data = [];
        this._dataFetch(remote => {
            if (remote) data = data.concat(remote);
            this._dataStatic(_static => {
                if (_static) data = data.concat(_static);
                this._dataFromDatalist(list => {
                    if (list?.length) data = data.concat(list);
                    this._dispatch('after:flexdatalist.data', data);
                    callback(data);
                });
            });
        }, load);
    }

    /**
     * Load data from the `options.data` array or URL string.
     *
     * @private
     * @param {Function} callback `(data: Object[]|null) => void`
     */
    _dataStatic(callback) {
        const o = this._options;
        if (this._isEmpty(o.data)) { callback(null); return; }

        if (typeof o.data === 'string') {
            const cached = this._cacheRead(o.data, true);
            if (cached) { callback(cached); return; }
            this._request({ url: o.data, success: data => {
                o.data = data;
                callback(data);
                this._cacheWrite(o.data, data, o.cacheLifetime, true);
            }});
        } else {
            if (!Array.isArray(o.data)) o.data = [];
            callback(o.data);
        }
    }

    /**
     * Extract `<option>` elements from a linked `<datalist>` element.
     *
     * @private
     * @param {Function} callback `(data: Object[]) => void`
     */
    _dataFromDatalist(callback) {
        const listId = this._hiddenInput.getAttribute('list');
        const out = [];
        if (listId) {
            document.getElementById(listId)?.querySelectorAll('option').forEach(opt => {
                const val   = opt.value;
                const label = opt.textContent.trim();
                out.push({ label: label || val, value: val });
            });
        }
        callback(out);
    }

    /**
     * Fetch results from the remote `options.url`.
     * Checks the cache before making a network request.
     *
     * @private
     * @param {Function} callback `(data: Object[]|null) => void`
     * @param {*}        [load]   Passed as `load` in the request body.
     */
    _dataFetch(callback, load) {
        const o = this._options;
        if (this._isEmpty(o.url)) {
            callback(null);
            return;
        }

        const keyword = this._alias.value;
        const relatives = this._relativesData();
        const cacheKey = this._cacheKeyGen(
            { relative: relatives, load, keyword, contain: o.searchContain }, o.url
        );
        const cached = this._cacheRead(cacheKey, true);
        if (cached) {
            callback(cached);
            return;
        }

        const params = typeof o.params === 'function'
            ? o.params.call(this._hiddenInput, keyword)
            : { ...o.params };

        const data = { ...relatives, ...params, selected: this._value, original: o.originalValue };
        if (load !== undefined){
            data.load = load;
        }
        data[o.keywordParamName] = keyword;
        data[o.searchContainParamName] = o.searchContain;

        this._request({
            url: o.url, data,
            success: _data => {
                callback(_data);
                this._cacheWrite(cacheKey, _data, o.cacheLifetime, true);
            },
        });
    }

    /**
     * Execute a fetch request, applying method, headers, and content-type.
     *
     * @private
     * @param {{ url: string, data?: Object, success: Function }} settings
     */
    _request(settings) {
        const o = this._options;
        const el = this._hiddenInput;
        if (el.classList.contains('flexdatalist-loading')) {
            // A fetch is already in-flight. Save this request as pending so its
            // callback is not silently dropped (e.g. init value-load vs. a fast
            // server that triggers a second _dataLoad before the first resolves).
            this._pendingRequest = settings;
            return;
        }
        this._pendingRequest = null;
        el.classList.add('flexdatalist-loading');

        let url = settings.url;
        const fetchOpts = { method: o.requestType.toUpperCase() };
        if (o.requestHeaders) {
            fetchOpts.headers = { ...o.requestHeaders };
        }

        if (o.requestType.toLowerCase() === 'post') {
            if (o.requestContentType === 'json') {
                fetchOpts.headers = { ...(fetchOpts.headers ?? {}), 'Content-Type': 'application/json; charset=UTF-8' };
                fetchOpts.body = JSON.stringify(settings.data ?? {});
            } else {
                fetchOpts.headers = { ...(fetchOpts.headers ?? {}), 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' };
                fetchOpts.body = new URLSearchParams(settings.data ?? {}).toString();
            }
        } else if (settings.data) {
            url += (url.includes('?') ? '&' : '?') + new URLSearchParams(settings.data).toString();
        }

        fetch(url, fetchOpts)
            .then(r => r.json())
            .then(data => settings.success(this._extractRemoteData(data)))
            .catch(err => {
                if (o.debug) {
                    console.error('Flexdatalist fetch error:', err);
                }
            })
            .finally(() => {
                el.classList.remove('flexdatalist-loading');
                // If a request arrived while this one was in-flight, run it now.
                if (this._pendingRequest) {
                    const pending = this._pendingRequest;
                    this._pendingRequest = null;
                    this._request(pending);
                }
            });
    }

    /**
     * Unwrap the `resultsProperty` key from a remote response object.
     * Also applies any inline option overrides the server may return.
     *
     * @private
     * @param {Object|Array} data Raw server response.
     * @returns {Array}
     */
    _extractRemoteData(data) {
        const o = this._options;
        let d = this._prop(data, o.resultsProperty) ?? data;
        if (typeof d === 'string' && d.startsWith('[{')) {
            d = JSON.parse(d);
        }
        if (d?.options) {
            Object.assign(this._options, d.options);
        }
        return this._isObj(d) ? d : [];
    }

    /**
     * Build the `relatives` sub-object from linked input elements.
     *
     * @private
     * @returns {{ relatives?: Object }}
     */
    _relativesData() {
        const rels = this._options.relatives;
        if (!rels?.length) {
            return {};
        }
        const out = { relatives: {} };
        for (const rel of rels) {
            const name = (rel.name ?? '')
                .replace(/\]\[/g, '-').replace(/[\[\]]/g, '-')
                .replace(/^[-|]+|[-|]+$/g, '');
            out.relatives[name] = rel.value;
        }
        return out;
    }

    /**
     * Show the animated loading bar above the alias / multiple wrapper.
     *
     * @private
     */
    _loadingStart() {
        const target = this._multipleEl ?? this._alias;
        target.classList.add('flexdatalist-fetching');
        const anim = document.createElement('div');
        anim.className = 'flexdatalist-fetch-animation';
        anim._fdTarget = target;
        document.body.appendChild(anim);
        this._position(anim, target);
    }

    /**
     * Remove the loading bar.
     *
     * @private
     */
    _loadingStop() {
        document.querySelectorAll('.flexdatalist-fetch-animation').forEach(el => el.remove());
    }

    // =========================================================================
    // Internal – search / filtering
    // =========================================================================

    /**
     * Filter `data` against `keywords`, caching results in localStorage.
     *
     * @private
     * @param {string}   keywords  The typed keyword string.
     * @param {Object[]} data      Full data set to filter.
     * @param {Function} callback  `(matches: Object[]) => void`
     */
    _searchGet(keywords, data, callback) {
        const o = this._options;
        if (o.searchDisabled) {
            callback(data);
            return;
        }

        const cached = this._cacheRead(keywords);
        if (cached) {
            callback(cached);
            return;
        }

        this._dispatch('before:flexdatalist.search', { keywords, data });
        let matches = data;

        if (!this._isEmpty(keywords)) {
            matches = [];
            const words = this._searchSplit(keywords);
            for (const item of data) {
                if (this._isDup(this._getText(item))) {
                    continue;
                }
                const m = this._searchMatch(item, words);
                if (m) {
                    matches.push(m);
                }
            }
        }

        this._cacheWrite(keywords, matches, 2);
        this._dispatch('after:flexdatalist.search', { keywords, data, results: matches });
        callback(matches);
    }

    /**
     * Test `item` against all search `keywords`.
     * Returns an augmented copy of the item with `_highlight` properties added,
     * or `false` if the item does not match.
     *
     * @private
     * @param {Object}   item     Data item to test.
     * @param {string[]} keywords Words to look for.
     * @returns {Object|false}
     */
    _searchMatch(item, keywords) {
        const o = this._options;
        const out = { ...item };
        const found = [];

        for (const prop of o.searchIn) {
            const raw = this._prop(item, prop);
            if (!raw) {
                continue;
            }
            const text = String(raw);
            let hl = text;
            const parts = this._searchSplit(text);

            for (const kw of keywords) {
                if (this._searchFind(kw, parts)) {
                    found.push(kw);
                    hl = this._hlMark(kw, hl);
                }
            }
            if (hl !== text) {
                out[prop + '_highlight'] = this._hlWrap(hl);
            }
        }

        if (!found.length || (o.searchByWord && found.length < keywords.length - 1)) {
            return false;
        }
        return out;
    }

    /**
     * Mark keyword occurrences in `text` with sentinel tokens for later wrapping.
     *
     * @private
     * @param {string} kw   Keyword to mark.
     * @param {string} text Source text.
     * @returns {string} Text with `|:|…|::|` sentinel markers.
     */
    _hlMark(kw, text) {
        if (!text) {
            return text;
        }
        const safe = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.replace(new RegExp(safe, this._options.searchContain ? 'igu' : 'iu'), '|:|$&|::|');
    }

    /**
     * Replace sentinel tokens with `<span class="highlight">…</span>`.
     *
     * @private
     * @param {string} str  Text containing sentinel tokens.
     * @returns {string} HTML string with highlight spans.
     */
    _hlWrap(str) {
        return str.split('|:|').join('<span class="highlight">').split('|::|').join('</span>');
    }

    /**
     * Test whether `kw` appears in any of the `parts` strings,
     * according to `searchContain` / `searchEqual` rules.
     *
     * @private
     * @param {string}   kw    Keyword.
     * @param {string[]} parts String parts to search.
     * @returns {boolean}
     */
    _searchFind(kw, parts) {
        const o = this._options;
        const nkw = this._normalize(kw);
        for (const p of parts) {
            const np = this._normalize(p);
            if (o.searchEqual) {
                return np === nkw;
            }
            if (o.searchContain ? np.includes(nkw) : np.startsWith(nkw)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Split a keyword string into an array, optionally expanding word-by-word.
     *
     * @private
     * @param {string|string[]} kws  Input keyword(s).
     * @returns {string[]}
     */
    _searchSplit(kws) {
        if (typeof kws === 'string') {
            kws = [kws.trim()];
        }
        if (this._options.searchByWord) {
            const extra = [];
            for (const kw of kws) {
                if (kw.includes(' ')) {
                    extra.push(...kw.split(' '));
                }
            }
            kws = [...kws, ...extra];
        }
        return kws;
    }

    /**
     * Normalise a string for comparison: strip diacritics, uppercase.
     * Applies `options.normalizeString` first when provided.
     *
     * @private
     * @param {string} str
     * @returns {string}
     */
    _normalize(str) {
        if (typeof str !== 'string') {
            return str;
        }
        const fn = this._options.normalizeString;
        if (typeof fn === 'function') {
            str = fn(str);
        }
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    }

    // =========================================================================
    // Internal – results rendering
    // =========================================================================

    /**
     * Render a result list from `results`, replacing any previous dropdown.
     *
     * @private
     * @param {Object[]|null} results  Matched items (empty array → "no results").
     */
    _resultsShow(results) {
        this._resultsRemove(true);
        if (!results) {
            return;
        }
        if (!results.length) {
            this._resultsEmpty(this._options.noResultsText);
            return;
        }

        const ul = this._resultsContainer();
        const o = this._options;

        if (!o.groupBy) {
            this._renderItems(results, ul);
        } else {
            const grouped = this._groupResults(results);
            for (const [groupName, items] of Object.entries(grouped)) {
                const groupText = this._hlProp(items[0], o.groupBy, groupName);
                const li = document.createElement('li');
                li.className = 'group';
                li.innerHTML = `<span class="group-name">${groupText}</span><span class="group-item-count"> ${items.length}</span>`;
                ul.appendChild(li);
                this._renderItems(items, ul);
            }
        }

        const liItems = [...ul.querySelectorAll('li:not(.group)')];
        for (const li of liItems) {
            li.addEventListener('click', () => {
                const item = li._fdItem;
                if (!item) return;
                this._dispatch('before:flexdatalist.select', item);
                if (!item.ignoreSelection) this._extractValue(item);
                this._resultsRemove();
                this._dispatch('after:flexdatalist.select', item);
                this._dispatch('select:flexdatalist', item);
                this._itemSelected = true;
                setTimeout(() => { this._itemSelected = false; }, 1000);
                if (o.multiple) setTimeout(() => this._alias.focus(), 500);
            });
            li.addEventListener('mouseenter', () => {
                liItems.forEach(l => l.classList.remove('active'));
                li.classList.add('active');
                li.dispatchEvent(new CustomEvent('active:flexdatalist.results', { detail: li._fdItem }));
            });
            li.addEventListener('mouseleave', () => li.classList.remove('active'));
        }

        if (o.focusFirstResult) ul.querySelector('li.item')?.classList.add('active');
    }

    /**
     * Show the "no results" message or "add new item" option.
     *
     * @private
     * @param {string} text  Message template (may contain `{keyword}`).
     */
    _resultsEmpty(text) {
        if (this._isEmpty(text)) {
            return;
        }
        const container = this._resultsContainer();
        const o  = this._options;
        const kw = this._alias.value;

        if (o.showAddNewItem && kw.length > 0) {
            const li = document.createElement('li');
            li.className = 'item no-results add-new-item';
            li.innerHTML = o.addNewItemText.replace('{keyword}', this._escape(kw));
            li._fdItem = { isAddNew: true, keyword: kw };
            container.appendChild(li);
            li.addEventListener('click', () => { this._resultsRemove(); this._dispatch('addnew:flexdatalist', kw); });
            li.addEventListener('mouseenter', () => li.classList.add('active'));
            li.addEventListener('mouseleave', () => li.classList.remove('active'));
        } else {
            const li = document.createElement('li');
            li.className = 'item no-results';
            li.textContent = text.replace('{keyword}', kw);
            container.appendChild(li);
        }

        this._dispatch('empty:flexdatalist.results', [text]);
    }

    /**
     * Iterate `items` and append result `<li>` elements to `ul`.
     *
     * @private
     * @param {Object[]}       items
     * @param {HTMLUListElement} ul
     */
    _renderItems(items, ul) {
        const max = this._options.maxShownResults;
        this._dispatch('show:flexdatalist.results', items);
        for (let i = 0; i < items.length; i++) {
            if (max > 0 && i >= max) break;
            ul.appendChild(this._makeItem(items[i], i, items.length));
        }
        this._dispatch('shown:flexdatalist.results', items);
    }

    /**
     * Create a single result `<li>` for `item`.
     * Renders each property listed in `visibleProperties`, supporting
     * `{placeholder}` patterns and the icon property.
     *
     * @private
     * @param {Object} item
     * @param {number} idx   Zero-based index within the results list.
     * @param {number} total Total result count (for ARIA attributes).
     * @returns {HTMLLIElement}
     */
    _makeItem(item, idx, total) {
        const o  = this._options;
        const li = document.createElement('li');
        li.className = 'item';
        li.setAttribute('role', 'option');
        li.setAttribute('tabindex', '-1');
        li.setAttribute('aria-posinset', idx + 1);
        li.setAttribute('aria-setsize', total);
        li._fdItem = item;

        for (const vp of o.visibleProperties) {
            let el;
            if (vp.includes('{')) {
                const str = this._replacePlaceholders(item, vp, '');
                const parsed = this._parsePlaceholders(vp);
                el = document.createElement('span');
                el.className = 'prop-' + (Object.values(parsed ?? {}).join('-') || vp);
                el.innerHTML = str + ' ';
            } else {
                if (o.groupBy === vp || this._prop(item, vp) === undefined) continue;
                if (vp === o.iconProperty) {
                    el = document.createElement('img');
                    el.className = 'prop-' + vp;
                    el.src = item[vp];
                } else {
                    el = document.createElement('span');
                    el.className = 'prop-' + vp;
                    el.innerHTML = this._hlProp(item, vp) + ' ';
                }
            }
            li.appendChild(el);
        }

        this._dispatch('item:flexdatalist.results', item);
        return li;
    }

    /**
     * Return (creating if necessary) the results container element.
     * When `options.resultsContainer` is set, returns the user-provided
     * element without creating or positioning anything.
     *
     * @private
     * @returns {HTMLElement}
     */
    _resultsContainer() {
        if (this._customContainer) {
            const el = this._customContainer;
            if (!el.classList.contains('flexdatalist-results')) {
                el.classList.add('flexdatalist-results');
            }
            el.setAttribute('role', 'listbox');
            el._fdTarget = this._multipleEl ?? this._alias;
            el._fdInput = this._hiddenInput;
            return el;
        }

        let ul = document.querySelector('ul.flexdatalist-results');
        if (ul) {
            return ul;
        }

        const target = this._multipleEl ?? this._alias;
        const cs = getComputedStyle(target);
        const parent = target.closest('dialog') ?? document.body;

        ul = document.createElement('ul');
        ul.className = 'flexdatalist-results';
        ul.id = this._alias.id + '-results';
        ul.setAttribute('role', 'listbox');
        ul.style.borderTopLeftRadius = cs.borderTopLeftRadius;
        ul.style.borderTopRightRadius = cs.borderTopRightRadius;
        ul.style.borderBottomLeftRadius = cs.borderBottomLeftRadius;
        ul.style.borderBottomRightRadius = cs.borderBottomRightRadius;
        ul._fdTarget = target;
        ul._fdInput = this._hiddenInput;

        parent.appendChild(ul);
        this._position(ul, target);
        return ul;
    }

    /**
     * Group a flat results array by `options.groupBy` property value.
     *
     * @private
     * @param {Object[]} results
     * @returns {Object.<string, Object[]>} Map of groupName → items.
     */
    _groupResults(results) {
        const gp = this._options.groupBy;
        const out = {};
        for (const item of results) {
            const key = this._prop(item, gp);
            if (key === undefined) {
                if (this._options.debug) console.warn(`Flexdatalist: groupBy property "${gp}" not found.`);
                break;
            }
            if (!out[key]) out[key] = [];
            out[key].push(item);
        }
        return out;
    }

    /**
     * Return the highlighted value of `property` for `item`, falling back to
     * the raw property value or `fallback`.
     *
     * @private
     * @param {Object} item
     * @param {string} property
     * @param {string} [fallback='']
     * @returns {string}
     */
    _hlProp(item, property, fallback = '') {
        const hl = this._prop(item, property + '_highlight');
        if (hl !== undefined) {
            return hl;
        }
        return String(this._prop(item, property) ?? fallback);
    }

    /**
     * Replace the results dropdown with a loading spinner `<ul>`.
     *
     * @private
     */
    _resultsLoadingStart() {
        const o = this._options;
        if (!o.resultsLoader || document.querySelector('.flexdatalist-fetching-results')) {
            return;
        }
        this._resultsRemove();
        const ul = this._resultsContainer();
        ul.classList.replace('flexdatalist-results', 'flexdatalist-fetching-results');
        const li  = document.createElement('li');
        li.className = 'flexdatalist-fetching-results-loader';
        const img = document.createElement('img');
        img.src = o.resultsLoader;
        img.alt = '';
        li.appendChild(img);
        ul.appendChild(li);
    }

    /**
     * Remove the loading spinner.
     * For a custom container the element is preserved — only children are cleared
     * and the class is restored.
     *
     * @private
     */
    _resultsLoadingStop() {
        if (this._customContainer) {
            this._customContainer.replaceChildren();
            this._customContainer.classList.remove('flexdatalist-fetching-results');
            this._customContainer.classList.add('flexdatalist-results');
        } else {
            document.querySelectorAll('ul.flexdatalist-fetching-results').forEach(el => el.remove());
        }
    }

    /**
     * Remove the results dropdown (or only its `<li>` children when `itemsOnly`).
     * When a custom `resultsContainer` is set, only children are ever removed —
     * the container itself is never destroyed.
     *
     * @private
     * @param {boolean} [itemsOnly=false]
     */
    _resultsRemove(itemsOnly = false) {
        this._dispatch('remove:flexdatalist.results');
        if (this._customContainer) {
            this._customContainer.replaceChildren();
        } else {
            document.querySelectorAll(itemsOnly ? 'ul.flexdatalist-results li' : 'ul.flexdatalist-results')
                .forEach(el => el.remove());
        }
        this._dispatch('removed:flexdatalist.results');
    }

    // =========================================================================
    // Internal – positioning
    // =========================================================================

    /**
     * Position `container` directly below `target` using fixed coordinates.
     * Handles the case where both elements are inside a `<dialog>`.
     *
     * @private
     * @param {HTMLElement} [container]  Defaults to `ul.flexdatalist-results`.
     * @param {HTMLElement} [target]     Defaults to `container._fdTarget`.
     */
    _position(container, target) {
        container = container ?? document.querySelector('ul.flexdatalist-results');
        if (!container || container._fdCustom) {
            return;
        }
        target = target ?? container._fdTarget;
        if (!target) {
            return;
        }

        const rect = target.getBoundingClientRect();
        const scrollY = window.scrollY ?? document.documentElement.scrollTop;
        const scrollX = window.scrollX ?? document.documentElement.scrollLeft;
        const width = Math.max(rect.width, 200);

        const dialog = target.closest('dialog');
        const inDialog = container.closest?.('dialog');
        let top, left;

        if (dialog && inDialog) {
            const dr = dialog.getBoundingClientRect();
            top = (rect.top - dr.top + rect.height) + 'px';
            left = (rect.left - dr.left) + 'px';
        } else {
            top = (rect.top + scrollY + rect.height) + 'px';
            left = (rect.left + scrollX) + 'px';
        }

        container.style.width = width + 'px';
        container.style.top = top;
        container.style.left = left;
    }

    // =========================================================================
    // Internal – disabled / readonly
    // =========================================================================

    /**
     * Apply or remove the disabled state on the original input, alias, and
     * multiple-value wrapper.
     *
     * @private
     * @param {boolean|null} disabled
     * @returns {boolean} Current disabled state.
     */
    _applyDisabled(disabled) {
        if (disabled == null) {
            return this._options.disabled;
        }
        this._hiddenInput.disabled = disabled;
        this._alias.disabled = disabled;

        if (this._multipleEl) {
            const btns = this._multipleEl.querySelectorAll('li .fdl-remove');
            const ic = this._multipleEl.querySelector('li.input-container');
            this._multipleEl.classList.toggle('disabled', disabled);
            btns.forEach(b => { b.style.display = disabled ? 'none' : ''; });
            if (ic) {
                ic.style.display = disabled ? 'none' : '';
            }
        }

        this._options.disabled = disabled;
        return disabled;
    }

    /**
     * @private
     * @returns {boolean}
     */
    _isDisabled() { return !!this._options.disabled; }

    /**
     * Apply or remove the readonly state.
     *
     * @private
     * @param {boolean} ro
     */
    _applyReadonly(ro) {
        this._hiddenInput.readOnly = ro;
        this._alias.readOnly = ro;

        if (this._multipleEl) {
            const btns = this._multipleEl.querySelectorAll('li .fdl-remove');
            const ic = this._multipleEl.querySelector('li.input-container');
            this._multipleEl.classList.toggle('disabled', ro);
            btns.forEach(b => {
                b.style.display = ro ? 'none' : '';
            });
            if (ic) {
                ic.style.display = ro ? 'none' : '';
            }
        }

        this._options.readonly = ro;
    }

    // =========================================================================
    // Internal – localStorage cache
    // =========================================================================

    /**
     * @private
     * @returns {boolean} Whether localStorage is available and cache is enabled.
     */
    _cacheSupported() {
        if (!this._options.cache) {
            return false;
        }
        try {
            return 'localStorage' in window && window.localStorage !== null;
        } catch { return false; }
    }

    /**
     * Write a value to the cache.
     *
     * @private
     * @param {string|Object} key
     * @param {*}             value
     * @param {number}        [lifetime]  Seconds until expiry.
     * @param {boolean}       [global]    Use the shared global key prefix.
     */
    _cacheWrite(key, value, lifetime, global) {
        if (!this._cacheSupported()) {
            return;
        }
        localStorage.setItem(this._cacheKeyGen(key, undefined, global), JSON.stringify({
            value, timestamp: Math.round(Date.now() / 1000), lifetime: lifetime || false,
        }));
    }

    /**
     * Read a value from the cache.  Returns `null` if missing or expired.
     *
     * @private
     * @param {string|Object} key
     * @param {boolean}       [global]
     * @returns {*|null}
     */
    _cacheRead(key, global) {
        if (!this._cacheSupported()) {
            return null;
        }
        const k = this._cacheKeyGen(key, undefined, global);
        const raw = localStorage.getItem(k);
        if (!raw) {
            return null;
        }
        const obj = JSON.parse(raw);
        if (obj.lifetime && (Math.round(Date.now() / 1000) - obj.timestamp) >= obj.lifetime) {
            localStorage.removeItem(k);
            return null;
        }
        return obj.value;
    }

    /**
     * Remove expired cache entries whose keys begin with the `fdl-` prefix.
     *
     * @private
     */
    _cacheGC() {
        if (!this._cacheSupported()) {
            return;
        }
        for (const key of Object.keys(localStorage)) {
            if (!key.startsWith('fdl-')) {
                continue;
            }
            const obj = JSON.parse(localStorage.getItem(key));
            if (obj?.lifetime && (Math.round(Date.now() / 1000) - obj.timestamp) >= obj.lifetime) {
                localStorage.removeItem(key);
            }
        }
    }

    /**
     * Generate a short FNV-1a hash key from a string or object.
     *
     * @private
     * @param {string|Object} str     Input to hash.
     * @param {number}        [seed]  Hash seed.
     * @param {boolean}       [global] Use `fdl-g-` prefix instead of `fdl-`.
     * @returns {string}
     */
    _cacheKeyGen(str, seed, global) {
        if (typeof str === 'object') {
            str = JSON.stringify(str);
        }
        let h = seed ?? 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
        }
        return (global ? 'fdl-g-' : 'fdl-') + ('0000000' + (h >>> 0).toString(16)).slice(-8);
    }

    // =========================================================================
    // Internal – utilities
    // =========================================================================

    /**
     * Safely read a nested property using dot-notation.
     *
     * @private
     * @param {Object} obj
     * @param {string} path  Dot-separated path, e.g. `'address.city'`.
     * @returns {*} Property value, or `undefined` if not found.
     */
    _prop(obj, path) {
        if (!obj || typeof path !== 'string') {
            return undefined;
        }
        return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
    }

    /**
     * @private
     * @param {*} v
     * @returns {boolean}
     */
    _isObj(v) { return v !== null && typeof v === 'object'; }

    /**
     * Broad "empty" check covering undefined, null, '', [], {}.
     *
     * @private
     * @param {*} v
     * @returns {boolean}
     */
    _isEmpty(v) {
        if (v === undefined || v === null) {
            return true;
        }
        if (v === true) {
            return false;
        }
        if (typeof v === 'string') {
            return v.trim() === '';
        }
        if (Array.isArray(v)) {
            return v.length === 0;
        }
        if (this._isObj(v)) {
            return Object.keys(v).length === 0;
        }
        return false;
    }

    /**
     * Escape a string for safe insertion into HTML.
     *
     * @private
     * @param {string} str
     * @returns {string}
     */
    _escape(str) {
        return String(str)
            .replace(/&/g,  '&amp;')
            .replace(/"/g,  '&quot;')
            .replace(/'/g,  '&#039;')
            .replace(/</g,  '&lt;')
            .replace(/>/g,  '&gt;');
    }

    /**
     * Replace `{key}` placeholders in `pattern` with values from `item`.
     *
     * @private
     * @param {Object} item      Data source object.
     * @param {string} pattern   Pattern string, e.g. `'{name} ({city})'`.
     * @param {*}      fallback  Returned when pattern is empty or no match.
     * @returns {string|*}
     */
    _replacePlaceholders(item, pattern, fallback) {
        if (!this._isObj(item) || typeof pattern !== 'string') {
            return fallback;
        }
        const props = this._parsePlaceholders(pattern);
        if (!props) {
            return fallback;
        }
        for (const [token, key] of Object.entries(props)) {
            const v = this._prop(item, key);
            if (v !== undefined) {
                pattern = pattern.replace(token, v);
            }
        }
        return pattern;
    }

    /**
     * Extract `{key}` tokens from a pattern string into a `{ '{key}': 'key' }` map.
     *
     * @private
     * @param {string} pattern
     * @returns {Object.<string,string>|false}
     */
    _parsePlaceholders(pattern) {
        if (!pattern) {
            return false;
        }
        const matches = pattern.match(/\{.+?\}/g);
        if (!matches) {
            return false;
        }
        return Object.fromEntries(matches.map(s => [s, s.slice(1, -1)]));
    }

    /**
     * Build a consistent `{value, text}` payload for `change:flexdatalist`.
     *
     * @private
     * @returns {{ value: string, text: string }}
     */
    _changePayload() {
        const sep = this._options.valuesSeparator;
        return {
            value: this._hiddenInput.value,
            text: this._options.multiple
                ? this._texts.join(sep)
                : (this._alias?.value ?? ''),
        };
    }

    /**
     * Dispatch a CustomEvent on the hidden input element.
     * The value is available directly as `e.detail` (no array wrapping).
     *
     * @private
     * @param {string} name      Event name.
     * @param {*}      [detail]  Value placed in `event.detail`. Omit for null.
     */
    _dispatch(name, detail = null) {
        this._hiddenInput.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
    }

}
