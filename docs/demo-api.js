/**
 * Simulated server for the Flexdatalist examples page.
 *
 * Intercepts fetch() calls to `demo-api/...` and answers them in the browser,
 * so the remote examples behave like a real backend (server-side filtering,
 * POST/JSON bodies, headers, slow responses, errors) on any static host.
 * Every request is reported to listeners, so the page can show what the
 * widget actually sent.
 *
 * Endpoints (all accept GET, urlencoded POST and JSON POST):
 *   demo-api/countries     ?keyword=&contain=   → { results: [...] }
 *       relatives[continent]=Asia   only countries of that continent
 *       continent=Asia              same, as a plain param (for `params`)
 *       q=                          alternative keyword name (keywordParamName demo)
 *       format=items                → { items: [...] } (resultsProperty demo)
 *       with_options=1              → adds { options: { maxShownResults: 3 } }
 *       delay=ms                    slow response (resultsLoader demo)
 *       fail=1                      HTTP 500 (error event demo)
 *   demo-api/secure-countries      same as countries, but needs header X-Demo-Token: demo (else 401)
 *   demo-api/continents            → { results: [{ name, countries }] }
 */
(function () {
    const API_PREFIX = 'demo-api/';
    const originalFetch = window.fetch.bind(window);
    const requestListeners = [];
    let countriesPromise = null;

    function loadCountries() {
        countriesPromise ??= originalFetch('countries.json').then(response => response.json());
        return countriesPromise;
    }

    function normalizeText(text) {
        return String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    }

    function isTrue(value) {
        return value === true || value === 'true' || value === '1';
    }

    function wait(milliseconds) {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    }

    /**
     * Flatten a JSON body into the same key shape a form body uses,
     * e.g. { relatives: { continent: 'Asia' } } → { 'relatives[continent]': 'Asia' }.
     */
    function flattenObject(source, prefix = '', target = {}) {
        for (const [key, value] of Object.entries(source ?? {})) {
            const flatKey = prefix ? `${prefix}[${key}]` : key;
            if (value !== null && typeof value === 'object') {
                flattenObject(value, flatKey, target);
            } else {
                target[flatKey] = value;
            }
        }
        return target;
    }

    async function readRequest(input, init = {}) {
        const request = new Request(input, init);
        const url = new URL(request.url);
        const parameters = {};
        url.searchParams.forEach((value, key) => { parameters[key] = value; });

        const contentType = request.headers.get('Content-Type') ?? '';
        let bodyText = '';
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            bodyText = await request.text();
            if (contentType.includes('application/json')) {
                Object.assign(parameters, flattenObject(JSON.parse(bodyText || '{}')));
            } else {
                new URLSearchParams(bodyText).forEach((value, key) => { parameters[key] = value; });
            }
        }

        const headers = {};
        request.headers.forEach((value, key) => { headers[key] = value; });

        const path = url.pathname.slice(url.pathname.indexOf(API_PREFIX) + API_PREFIX.length);
        return { method: request.method, path, parameters, headers, contentType, bodyText };
    }

    function jsonResponse(body, status = 200) {
        return new Response(JSON.stringify(body), {
            status,
            statusText: status === 200 ? 'OK' : status === 401 ? 'Unauthorized' : 'Internal Server Error',
            headers: { 'Content-Type': 'application/json' },
        });
    }

    async function answerCountries(request) {
        const parameters = request.parameters;
        const keyword = normalizeText(parameters.keyword ?? parameters.q ?? '');
        const matchAnywhere = isTrue(parameters.contain);
        const continent = parameters['relatives[continent]'] ?? parameters.continent ?? '';

        let countries = await loadCountries();
        if (continent) {
            countries = countries.filter(country => country.continent === continent);
        }
        if (keyword) {
            countries = countries.filter(country => {
                const name = normalizeText(country.name);
                return matchAnywhere ? name.includes(keyword) : name.startsWith(keyword);
            });
        }

        const results = countries.map(country => ({
            id: country.id,
            name: country.name,
            iso2: country.iso2,
            capital: country.capital,
            continent: country.continent,
        }));

        const body = parameters.format === 'items' ? { items: results } : { results };
        if (isTrue(parameters.with_options)) {
            body.options = { maxShownResults: 3 };
        }
        return jsonResponse(body);
    }

    async function answerContinents() {
        const counts = {};
        for (const country of await loadCountries()) {
            counts[country.continent] = (counts[country.continent] ?? 0) + 1;
        }
        const results = Object.keys(counts).sort().map(name => ({ name, countries: counts[name] }));
        return jsonResponse({ results });
    }

    async function answer(request) {
        const delay = Number(request.parameters.delay ?? 0);
        if (delay > 0) {
            await wait(delay);
        }
        if (isTrue(request.parameters.fail)) {
            return jsonResponse({ error: 'Simulated server error' }, 500);
        }
        switch (request.path) {
            case 'countries':
                return answerCountries(request);
            case 'secure-countries':
                if (request.headers['x-demo-token'] !== 'demo') {
                    return jsonResponse({ error: 'Missing or wrong X-Demo-Token header' }, 401);
                }
                return answerCountries(request);
            case 'continents':
                return answerContinents();
            default:
                return jsonResponse({ error: `Unknown endpoint ${request.path}` }, 404);
        }
    }

    window.fetch = async function (input, init) {
        const url = typeof input === 'string' ? input : input?.url ?? String(input);
        if (!url.includes(API_PREFIX)) {
            return originalFetch(input, init);
        }
        const request = await readRequest(new URL(url, document.baseURI).href, init);
        const response = await answer(request);
        const entry = { ...request, status: response.status, time: new Date() };
        for (const listener of requestListeners) {
            try { listener(entry); } catch (error) { console.error(error); }
        }
        return response;
    };

    window.DemoApi = {
        /** Subscribe to every request the simulated server receives. */
        onRequest(listener) {
            requestListeners.push(listener);
        },
    };
})();
