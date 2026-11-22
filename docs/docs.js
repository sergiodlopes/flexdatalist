// Flexdatalist documentation page behaviour. Everything here is an
// enhancement: the page is complete and readable without it.
(function () {
    'use strict';

    const root = document.documentElement;
    const storage = {
        get(key) {
            try { return localStorage.getItem(key); } catch (error) { return null; }
        },
        set(key, value) {
            try { localStorage.setItem(key, value); } catch (error) { /* storage blocked */ }
        },
    };

    // ── Theme ────────────────────────────────────────────────────────────
    const themeToggle = document.querySelector('[data-theme-toggle]');

    function applyTheme(theme) {
        root.setAttribute('data-theme', theme);
        // The plugin's own dark class, kept in sync with the page theme.
        root.classList.toggle('fdl-dark', theme === 'dark');
        themeToggle?.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }

    applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    themeToggle?.addEventListener('click', () => {
        const nextTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        storage.set('fd-docs-theme', nextTheme);
    });

    // ── GitHub star count (cached for an hour, hidden when unavailable) ──
    const STAR_CACHE_KEY = 'fd-docs-stars';
    const STAR_CACHE_LIFETIME = 60 * 60 * 1000;

    function showStarCount(count) {
        for (const badge of document.querySelectorAll('[data-star-count]')) {
            badge.querySelector('[data-star-number]').textContent = count.toLocaleString('en');
            badge.hidden = false;
        }
    }

    async function loadStarCount() {
        try {
            const cached = JSON.parse(storage.get(STAR_CACHE_KEY) ?? 'null');
            if (cached && typeof cached.count === 'number' && Date.now() - cached.time < STAR_CACHE_LIFETIME) {
                showStarCount(cached.count);
                return;
            }
        } catch (error) { /* ignore a broken cache entry */ }
        try {
            const response = await fetch('https://api.github.com/repos/sergiodlopes/flexdatalist', {
                headers: { Accept: 'application/vnd.github+json' },
            });
            if (!response.ok) return;
            const repository = await response.json();
            if (typeof repository.stargazers_count !== 'number') return;
            storage.set(STAR_CACHE_KEY, JSON.stringify({ count: repository.stargazers_count, time: Date.now() }));
            showStarCount(repository.stargazers_count);
        } catch (error) { /* offline or rate limited: keep the count hidden */ }
    }
    loadStarCount();

    // ── Syntax highlighting ──────────────────────────────────────────────
    const KEYWORDS = new Set(['const', 'let', 'var', 'function', 'return', 'await', 'async', 'new', 'import', 'from',
        'export', 'default', 'if', 'else', 'true', 'false', 'null', 'undefined', 'this', 'typeof', 'class', 'extends']);
    const TOKEN_PATTERN = /(\/\/[^\n]*|<!--[\s\S]*?-->)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|(<\/?[A-Za-z][\w.-]*)|(\/?>)|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*(?:[:-][A-Za-z_$][\w$]*)*)/g;

    function escapeHtml(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function wrapToken(className, text) {
        return `<span class="${className}">${escapeHtml(text)}</span>`;
    }

    function highlight(source) {
        let html = '';
        let position = 0;
        let insideTag = false;
        for (const match of source.matchAll(TOKEN_PATTERN)) {
            const [token, comment, string, tagOpen, tagClose, number, word] = match;
            html += escapeHtml(source.slice(position, match.index));
            position = match.index + token.length;
            if (comment) html += wrapToken('tok-c', token);
            else if (string) html += wrapToken('tok-s', token);
            else if (tagOpen) { html += wrapToken('tok-t', token); insideTag = true; }
            else if (tagClose) {
                html += insideTag ? wrapToken('tok-t', token) : escapeHtml(token);
                insideTag = false;
            }
            else if (number) html += wrapToken('tok-n', token);
            else if (word && insideTag) html += wrapToken(KEYWORDS.has(word) ? 'tok-k' : 'tok-a', token);
            else if (word && KEYWORDS.has(word)) html += wrapToken('tok-k', token);
            else if (word && source[position] === '(') html += wrapToken('tok-f', token);
            else html += escapeHtml(token);
        }
        return html + escapeHtml(source.slice(position));
    }

    for (const code of document.querySelectorAll('pre code[data-lang]')) {
        const lines = code.querySelectorAll('.ln');
        if (lines.length) {
            for (const line of lines) line.innerHTML = highlight(line.textContent);
        } else {
            code.innerHTML = highlight(code.textContent);
        }
    }

    // ── Copy buttons ─────────────────────────────────────────────────────
    async function writeClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            const scratch = document.createElement('textarea');
            scratch.value = text;
            scratch.setAttribute('readonly', '');
            scratch.style.position = 'fixed';
            scratch.style.opacity = '0';
            document.body.appendChild(scratch);
            scratch.select();
            let copied = false;
            try { copied = document.execCommand('copy'); } catch (fallbackError) { copied = false; }
            scratch.remove();
            return copied;
        }
    }

    function copyTextFor(button) {
        const codeBlock = button.closest('.code-block');
        if (codeBlock) {
            const panel = codeBlock.querySelector('.code-panel.is-active') ?? codeBlock;
            return panel.querySelector('pre code')?.textContent ?? '';
        }
        return button.parentElement.querySelector('[data-copy-source]')?.textContent.trim() ?? '';
    }

    for (const button of document.querySelectorAll('[data-copy]')) {
        let resetTimer = null;
        button.addEventListener('click', async () => {
            const copied = await writeClipboard(copyTextFor(button));
            const label = button.querySelector('[data-copy-label]');
            label.textContent = copied ? 'Copied' : 'Press Ctrl+C';
            button.classList.toggle('is-copied', copied);
            clearTimeout(resetTimer);
            resetTimer = setTimeout(() => {
                label.textContent = 'Copy';
                button.classList.remove('is-copied');
            }, 1400);
        });
    }

    // ── Tabs (code tabs and the hero demo share the keyboard handling) ───
    function handleTabKeys(tabs, onActivate) {
        tabs.forEach((tab, index) => {
            tab.addEventListener('keydown', event => {
                let nextIndex = null;
                if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
                else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
                else if (event.key === 'Home') nextIndex = 0;
                else if (event.key === 'End') nextIndex = tabs.length - 1;
                if (nextIndex === null) return;
                event.preventDefault();
                tabs[nextIndex].focus();
                onActivate(tabs[nextIndex]);
            });
        });
    }

    let codeTabsCounter = 0;
    for (const container of document.querySelectorAll('[data-tabs]')) {
        const tabs = [...container.querySelectorAll('[data-tab]')];
        const panels = [...container.querySelectorAll('[data-panel]')];
        const rememberKey = container.dataset.remember;
        const languageLabel = container.querySelector('[data-lang-label]');
        const fileLabel = container.querySelector('[data-file-label]');
        codeTabsCounter++;

        tabs.forEach(tab => {
            const panel = panels.find(candidate => candidate.dataset.panel === tab.dataset.tab);
            tab.id = `code-tab-${codeTabsCounter}-${tab.dataset.tab}`;
            panel.id = `code-panel-${codeTabsCounter}-${tab.dataset.tab}`;
            tab.setAttribute('aria-controls', panel.id);
            panel.setAttribute('aria-labelledby', tab.id);
        });

        function activate(tab, remember) {
            for (const candidate of tabs) {
                const selected = candidate === tab;
                candidate.setAttribute('aria-selected', String(selected));
                candidate.tabIndex = selected ? 0 : -1;
            }
            for (const panel of panels) {
                const active = panel.dataset.panel === tab.dataset.tab;
                panel.classList.toggle('is-active', active);
                if (active) {
                    if (languageLabel && panel.dataset.langName) languageLabel.textContent = panel.dataset.langName;
                    if (fileLabel && panel.dataset.file) fileLabel.textContent = panel.dataset.file;
                }
            }
            if (remember && rememberKey) storage.set(rememberKey, tab.dataset.tab);
        }

        const remembered = rememberKey ? storage.get(rememberKey) : null;
        activate(tabs.find(tab => tab.dataset.tab === remembered) ?? tabs[0], false);
        tabs.forEach(tab => tab.addEventListener('click', () => activate(tab, true)));
        handleTabKeys(tabs, tab => activate(tab, true));
    }

    // ── Sidebar counts, computed from the page so they cannot drift ──────
    const optionRows = [...document.querySelectorAll('.opt')];
    const counts = {
        options: optionRows.length,
        api: document.querySelectorAll('.api-row').length,
        events: document.querySelectorAll('.ev-row').length,
    };
    for (const counter of document.querySelectorAll('[data-count]')) {
        counter.textContent = counts[counter.dataset.count];
    }

    // ── Scroll-spy, right rail and the mobile "On this page" menu ───────
    const sections = [...document.querySelectorAll('.doc-section')];
    const sidebarLinks = [...document.querySelectorAll('[data-spy]')];
    const mobileLinks = [...document.querySelectorAll('.toc-mobile-list a')];
    const railList = document.querySelector('[data-rail-list]');
    const tocMobile = document.querySelector('[data-toc-mobile]');
    const tocCurrent = document.querySelector('[data-toc-current]');
    // A section is "current" while it crosses a line 30% down the viewport.
    const SPY_LINE = 0.3;
    let activeSection = null;

    function sectionTitle(section) {
        const link = sidebarLinks.find(candidate => candidate.dataset.spy === section.id);
        return link ? link.childNodes[0].textContent.trim() : section.querySelector('h2').textContent;
    }

    function renderRail(section) {
        if (!railList) return;
        railList.replaceChildren();
        for (const target of section.querySelectorAll('[data-rail][id]')) {
            const item = document.createElement('li');
            const link = document.createElement('a');
            link.href = '#' + target.id;
            link.textContent = target.dataset.rail;
            link.dataset.railTarget = target.id;
            item.appendChild(link);
            railList.appendChild(item);
        }
    }

    function setActiveSection(section) {
        if (section === activeSection) return;
        activeSection = section;
        for (const link of sidebarLinks) link.classList.toggle('is-active', link.dataset.spy === section.id);
        for (const link of mobileLinks) link.classList.toggle('is-active', link.getAttribute('href') === '#' + section.id);
        if (tocCurrent) tocCurrent.textContent = sectionTitle(section);
        renderRail(section);
    }

    // The rail marks the last subsection of the current section that has
    // scrolled past the spy line.
    function updateActiveSubsection() {
        if (!railList || !activeSection) return;
        const line = window.innerHeight * SPY_LINE;
        let current = null;
        for (const target of activeSection.querySelectorAll('[data-rail][id]')) {
            if (target.getBoundingClientRect().top <= line) current = target;
        }
        for (const link of railList.querySelectorAll('a')) {
            link.classList.toggle('is-active', !!current && link.dataset.railTarget === current.id);
        }
    }

    if (sections.length) setActiveSection(sections[0]);
    if ('IntersectionObserver' in window && sections.length) {
        // A band half a percent tall: a zero-height root never reports intersections.
        const bottomMargin = `-${(1 - SPY_LINE - 0.005) * 100}%`;
        const spyObserver = new IntersectionObserver(entries => {
            for (const entry of entries) {
                if (entry.isIntersecting) setActiveSection(entry.target);
            }
            updateActiveSubsection();
        }, { rootMargin: `-${SPY_LINE * 100}% 0px ${bottomMargin} 0px` });
        sections.forEach(section => spyObserver.observe(section));
        let subsectionFrame = 0;
        window.addEventListener('scroll', () => {
            cancelAnimationFrame(subsectionFrame);
            subsectionFrame = requestAnimationFrame(updateActiveSubsection);
        }, { passive: true });
    }

    tocMobile?.addEventListener('click', event => {
        if (event.target.closest('a')) tocMobile.open = false;
    });
    document.addEventListener('click', event => {
        if (tocMobile?.open && !tocMobile.contains(event.target)) tocMobile.open = false;
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && tocMobile?.open) {
            tocMobile.open = false;
            tocMobile.querySelector('summary').focus();
        }
    });

    // ── Options filter ───────────────────────────────────────────────────
    const optionsSection = document.getElementById('options');
    const filterInput = document.querySelector('[data-opt-filter]');
    const filterCount = document.querySelector('[data-opt-count]');
    const emptyState = document.querySelector('[data-opt-empty]');
    const emptyTerm = document.querySelector('[data-opt-empty-term]');
    const optionGroups = [...document.querySelectorAll('.opt-group')];
    const toolbar = document.querySelector('[data-opt-toolbar]');
    const totalOptions = optionRows.length;

    for (const row of optionRows) row.dataset.search = row.textContent.replace(/\s+/g, ' ').toLowerCase();
    if (filterInput) {
        filterInput.placeholder = `Filter ${totalOptions} options — try "cache", "group" or "boolean"`;
    }

    function filterOptions() {
        const term = filterInput.value.trim().toLowerCase();
        const words = term.split(/\s+/).filter(Boolean);
        let shown = 0;
        for (const group of optionGroups) {
            let shownInGroup = 0;
            for (const row of group.querySelectorAll('.opt')) {
                const matches = words.every(word => row.dataset.search.includes(word));
                row.hidden = !matches;
                if (matches) shownInGroup++;
            }
            group.hidden = shownInGroup === 0;
            const chip = document.querySelector(`[data-chip="${group.dataset.group}"]`);
            if (chip) {
                chip.querySelector('span').textContent = shownInGroup;
                chip.classList.toggle('is-empty', shownInGroup === 0);
            }
            shown += shownInGroup;
        }
        filterCount.textContent = `${shown} / ${totalOptions}`;
        emptyState.hidden = shown > 0;
        emptyTerm.textContent = filterInput.value.trim();
    }

    if (filterInput) {
        filterInput.addEventListener('input', filterOptions);
        filterInput.addEventListener('keydown', event => {
            if (event.key === 'Escape' && filterInput.value) {
                filterInput.value = '';
                filterOptions();
            }
        });
        filterOptions();
    }

    document.addEventListener('keydown', event => {
        if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || !filterInput) return;
        const active = document.activeElement;
        if (active && (active.matches('input, textarea, select') || active.isContentEditable)) return;
        event.preventDefault();
        filterInput.focus({ preventScroll: true });
        filterInput.scrollIntoView({ block: 'nearest' });
    });

    if (toolbar && optionsSection && 'ResizeObserver' in window) {
        new ResizeObserver(() => {
            optionsSection.style.setProperty('--opt-toolbar-h', toolbar.offsetHeight + 'px');
        }).observe(toolbar);
    }

    // ── Shared demo helpers ──────────────────────────────────────────────
    const hasPlugin = typeof Flexdatalist === 'function';

    function formatValue(value) {
        if (value === undefined || value === null || value === '') return '—';
        return typeof value === 'string' ? value : JSON.stringify(value);
    }

    function formatOptionValue(value) {
        if (Array.isArray(value)) return '[' + value.map(formatOptionValue).join(', ') + ']';
        if (typeof value === 'string') return `'${value}'`;
        return String(value);
    }

    function formatOptions(options) {
        return '{ ' + Object.entries(options).map(([name, value]) => `${name}: ${formatOptionValue(value)}`).join(', ') + ' }';
    }

    // ── Hero demo ────────────────────────────────────────────────────────
    const heroSlot = document.querySelector('[data-hero-slot]');
    const heroLabel = document.getElementById('hero-label');
    const heroHint = document.querySelector('[data-hero-hint]');
    const heroPanel = document.getElementById('hero-demo-panel');
    const heroTabs = [...document.querySelectorAll('[data-hero-tab]')];
    const readoutValue = document.getElementById('hero-value');
    const readoutText = document.getElementById('hero-text');
    const readoutOptions = document.getElementById('hero-options');
    const requestLine = document.querySelector('[data-request-line]');
    const requestText = document.querySelector('[data-request-text]');
    const requestBadge = document.querySelector('[data-request-badge]');
    const RESULT_LAYOUT = ['iso2', 'name', '{capital} · {continent}'];

    const HERO_MODES = {
        single: {
            label: 'Search a country',
            placeholder: 'Type a country or capital…',
            hint: 'Matches the name and the capital. Pick one to see its stored value.',
            options: { data: 'countries.json', minLength: 1, valueProperty: 'iso2', searchIn: ['name', 'capital'] },
            display: { textProperty: '{name}', visibleProperties: RESULT_LAYOUT },
            typeOnLoad: 'Por',
        },
        tags: {
            label: 'Countries',
            placeholder: 'Add a country…',
            hint: 'Multiple values, picked from the list only. Backspace marks, then removes, the last tag.',
            options: { data: 'countries.json', minLength: 1, valueProperty: 'iso2', multiple: true, selectionRequired: true },
            display: { searchIn: ['name'], textProperty: '{name}', visibleProperties: RESULT_LAYOUT },
            value: 'PT,ES,FR',
        },
        grouped: {
            label: 'Search a country',
            placeholder: 'Type a country, e.g. "ma"…',
            hint: 'Results grouped by continent; the first one is highlighted, so Enter picks it.',
            options: { data: 'countries.json', minLength: 1, valueProperty: 'iso2', groupBy: 'continent', focusFirstResult: true },
            display: { searchIn: ['name'], textProperty: '{name}', visibleProperties: ['iso2', 'name', 'capital'] },
        },
        remote: {
            label: 'Search a country (remote)',
            placeholder: 'Type a country…',
            hint: 'Each keyword goes to the simulated server once, then comes from the localStorage cache.',
            options: { url: 'demo-api/countries', minLength: 1, valueProperty: '*', cache: true },
            display: { searchIn: ['name'], textProperty: '{name}', visibleProperties: RESULT_LAYOUT },
        },
    };

    let heroInstance = null;
    let heroInput = null;
    let heroMode = 'single';
    let heroCounter = 0;
    let lastKeystrokeAt = 0;
    let lastRemoteRequest = null;

    function updateHeroReadout() {
        if (!heroInstance) return;
        readoutValue.textContent = formatValue(heroInstance.getValue());
        readoutText.textContent = formatValue(heroInstance.getText());
    }

    function describeRemoteRequest(parameters) {
        const query = Object.entries(parameters)
            .filter(([, value]) => value !== '' && value !== undefined)
            .sort(([first], [second]) => (first === 'keyword' ? -1 : second === 'keyword' ? 1 : 0))
            .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
            .join('&');
        return `GET /demo-api/countries?${query}`;
    }

    function updateRequestLine() {
        if (heroMode !== 'remote' || !heroInput) return;
        const alias = heroSlot.querySelector('.flexdatalist-alias');
        const keyword = alias ? alias.value : '';
        const fetched = lastRemoteRequest && lastRemoteRequest.time >= lastKeystrokeAt
            && lastRemoteRequest.parameters.keyword === keyword;
        requestLine.hidden = false;
        if (fetched) {
            requestText.textContent = describeRemoteRequest(lastRemoteRequest.parameters);
            requestBadge.textContent = `fetched · ${lastRemoteRequest.status}`;
            requestBadge.className = 'badge badge-accent';
        } else {
            requestText.textContent = `GET /demo-api/countries?keyword=${encodeURIComponent(keyword)} — not sent`;
            requestBadge.textContent = 'localStorage cache';
            requestBadge.className = 'badge badge-ok';
        }
    }

    function buildHero(mode) {
        const config = HERO_MODES[mode];
        heroMode = mode;
        if (heroInstance) heroInstance.destroy();
        heroInstance = null;
        heroSlot.replaceChildren();

        heroCounter++;
        heroInput = document.createElement('input');
        heroInput.type = 'text';
        heroInput.id = `hd-${mode}-${heroCounter}`;
        heroInput.className = 'demo-input';
        heroInput.placeholder = config.placeholder;
        if (config.value) heroInput.value = config.value;
        heroSlot.appendChild(heroInput);

        heroLabel.textContent = config.label;
        heroHint.textContent = config.hint;
        heroPanel.setAttribute('aria-labelledby', `hero-tab-${mode}`);
        readoutOptions.textContent = formatOptions(config.options);
        readoutValue.textContent = '—';
        readoutText.textContent = '—';
        requestLine.hidden = mode !== 'remote';
        if (mode === 'remote') {
            requestText.textContent = 'GET /demo-api/countries?keyword=…';
            requestBadge.textContent = 'waiting';
            requestBadge.className = 'badge';
        }

        heroInput.addEventListener('change:flexdatalist', updateHeroReadout);
        heroInput.addEventListener('shown:flexdatalist.results', updateRequestLine);
        heroInput.addEventListener('empty:flexdatalist.results', updateRequestLine);
        heroInstance = new Flexdatalist(heroInput, { ...config.options, ...config.display });

        // The visible input is the alias the plugin creates; point the label at it.
        const alias = heroSlot.querySelector('.flexdatalist-alias');
        if (alias) {
            heroLabel.htmlFor = alias.id;
            alias.addEventListener('input', () => { lastKeystrokeAt = Date.now(); });
        }
        const instance = heroInstance;
        instance.ready.then(() => {
            if (instance !== heroInstance) return;
            updateHeroReadout();
            if (config.typeOnLoad && alias) {
                alias.value = config.typeOnLoad;
                instance.search(config.typeOnLoad);
            }
        });
    }

    function selectHeroTab(tab) {
        for (const candidate of heroTabs) {
            const selected = candidate === tab;
            candidate.setAttribute('aria-selected', String(selected));
            candidate.tabIndex = selected ? 0 : -1;
        }
        if (tab.dataset.heroTab !== heroMode || !heroInstance) buildHero(tab.dataset.heroTab);
    }

    if (hasPlugin && heroSlot) {
        window.DemoApi?.onRequest(entry => {
            if (entry.path !== 'countries' || heroMode !== 'remote') return;
            lastRemoteRequest = { parameters: entry.parameters, status: entry.status, time: Date.now() };
        });
        heroTabs.forEach(tab => tab.addEventListener('click', () => selectHeroTab(tab)));
        handleTabKeys(heroTabs, selectHeroTab);
        buildHero('single');
    }

    // ── Live event log ───────────────────────────────────────────────────
    const eventsInput = document.getElementById('events-input');
    const eventLines = document.querySelector('[data-event-lines]');
    const eventsEmpty = document.querySelector('[data-events-empty]');
    const eventNames = [...document.querySelectorAll('.ev-row[data-event]')].map(row => row.dataset.event);
    const MAX_EVENT_LINES = 9;
    let eventCounter = 0;

    function summarize(detail) {
        if (detail === undefined) return 'undefined';
        if (detail === null) return 'null';
        if (typeof detail === 'string') return JSON.stringify(detail);
        if (Array.isArray(detail)) {
            const preview = detail.slice(0, 3).map(item => (item && typeof item === 'object' ? item.name ?? '{…}' : item));
            return `Array(${detail.length}) ${JSON.stringify(preview)}${detail.length > 3 ? '…' : ''}`;
        }
        try {
            return JSON.stringify(detail, (key, value) => (value instanceof Node ? `<${value.nodeName.toLowerCase()}>` : value));
        } catch (error) {
            return '{…}';
        }
    }

    function logEvent(event) {
        eventsEmpty.hidden = true;
        const lastLine = eventLines.lastElementChild;
        if (lastLine && lastLine.dataset.event === event.type) {
            // Collapse repeats (item:flexdatalist.results fires once per result).
            const repeats = Number(lastLine.dataset.repeats) + 1;
            lastLine.dataset.repeats = repeats;
            lastLine.querySelector('.event-repeat').textContent = `×${repeats}`;
            lastLine.querySelector('.event-detail').textContent = summarize(event.detail);
            return;
        }
        eventCounter++;
        const [phase, name] = event.type.split(/:(.*)/s);
        const line = document.createElement('li');
        line.dataset.event = event.type;
        line.dataset.repeats = '1';
        line.className = 'is-new';
        const head = document.createElement('span');
        head.className = 'event-line-head';
        head.innerHTML = '<span class="event-index"></span><span><span class="event-phase"></span><span class="event-name"></span></span><span class="event-repeat event-index"></span>';
        head.querySelector('.event-index').textContent = String(eventCounter).padStart(2, '0');
        head.querySelector('.event-phase').textContent = phase + ':';
        head.querySelector('.event-name').textContent = name;
        const detail = document.createElement('span');
        detail.className = 'event-detail';
        detail.textContent = summarize(event.detail);
        line.append(head, detail);
        eventLines.appendChild(line);
        setTimeout(() => line.classList.remove('is-new'), 1300);
        while (eventLines.children.length > MAX_EVENT_LINES) eventLines.firstElementChild.remove();
    }

    if (hasPlugin && eventsInput) {
        for (const eventName of eventNames) eventsInput.addEventListener(eventName, logEvent);
        const eventsInstance = new Flexdatalist(eventsInput, {
            multiple: true,
            data: 'countries.json',
            searchIn: 'name',
            valueProperty: 'iso2',
            minLength: 1,
        });
        const eventsAlias = eventsInput.parentElement.querySelector('.flexdatalist-alias');
        const eventsLabel = document.querySelector('label[for="events-input"]');
        if (eventsAlias && eventsLabel) eventsLabel.htmlFor = eventsAlias.id;
        document.querySelector('[data-events-clear]')?.addEventListener('click', () => eventsInstance.clear());
    }
})();
