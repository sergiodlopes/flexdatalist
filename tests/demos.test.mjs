// Drives every demo on docs/examples.html in headless Chromium, the way a
// user would (typing, clicking, keyboard, paste), and checks the stored
// values, the displayed text, the requests the simulated server received
// and the console.
//
// Usage (from the repository root):
//   pnpm exec playwright install chromium   # once
//   pnpm test:demos                         # all demos
//   pnpm test:demos -- remote               # only tests whose name contains "remote"
//   pnpm test:demos -- --site docs-dist     # the built site from pnpm docs:build
//
// By default the demos run against packages/core/src, so no build is needed.
// With --site the given folder is served as the site root, the way the
// website serves the pages, so the paths written by docs:build are tested.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const commandArguments = process.argv.slice(2);
const siteFlagIndex = commandArguments.indexOf('--site');
const siteFolder = siteFlagIndex === -1 ? null : commandArguments.splice(siteFlagIndex, 2)[1];
const repositoryRoot = process.env.FLEXDATALIST_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), '..');
const servedRoot = siteFolder ? resolve(repositoryRoot, siteFolder) : repositoryRoot;
const pagesPath = siteFolder ? '' : '/docs';
const testFilter = commandArguments[0] ?? '';
const contentTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const server = http.createServer(async (request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname));
    try {
        const body = await readFile(join(servedRoot, path));
        response.writeHead(200, { 'Content-Type': contentTypes[extname(path)] ?? 'application/octet-stream' });
        response.end(body);
    } catch {
        response.writeHead(404).end('not found');
    }
});
await new Promise(resolve => server.listen(0, resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

const countries = JSON.parse(await readFile(join(servedRoot, pagesPath, 'countries.json'), 'utf8'));
const countryByName = name => countries.find(country => country.name === name);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
page.on('console', message => { if (message.type() === 'error') pageErrors.push('console: ' + message.text()); });

await page.goto(`${baseUrl}${pagesPath}/examples.html`);
await page.waitForFunction(() => typeof Flexdatalist === 'function' && document.querySelectorAll('.flexdatalist-alias').length > 40);
await page.waitForTimeout(800); // initial values resolve against the simulated server
await page.evaluate(() => {
    window.__serverRequests = [];
    DemoApi.onRequest(request => window.__serverRequests.push(request));
    window.__addNewEvents = [];
    document.addEventListener('addnew:flexdatalist', event => window.__addNewEvents.push(event.detail));
});

// --- helpers ---
async function alias(name) {
    await page.evaluate(name => {
        const instance = Flexdatalist.getInstance(document.querySelector(`[name="${name}"]`));
        if (!instance) throw new Error(`no instance for ${name}`);
        instance._alias.setAttribute('data-test-alias', name);
    }, name);
    return page.locator(`[data-test-alias="${name}"]`);
}
const valueOf = name => page.evaluate(name => document.querySelector(`[name="${name}"]`).value, name);
const textOf = name => page.evaluate(name => Flexdatalist.getInstance(document.querySelector(`[name="${name}"]`)).getText(), name);
const aliasText = async name => (await alias(name)).inputValue();
const resultItems = () => page.locator('ul.flexdatalist-results li.item:not(.no-results):visible');
const resultTexts = () => resultItems().allInnerTexts();
async function waitForResults(minimum = 1) {
    await page.waitForFunction(minimum => document.querySelectorAll('ul.flexdatalist-results li.item:not(.no-results)').length >= minimum, minimum, { timeout: 4000 });
}
async function type(name, text) {
    const input = await alias(name);
    await input.scrollIntoViewIfNeeded();
    await input.click();
    await input.pressSequentially(text, { delay: 25 });
}
async function pick(name, keyword, itemText) {
    await type(name, keyword);
    await waitForResults();
    await resultItems().filter({ hasText: itemText }).first().click();
    await page.waitForTimeout(150);
}
async function reset() {
    await page.keyboard.press('Escape');
    await page.locator('h1').first().click({ force: true });
    await page.waitForTimeout(120);
}
const requestsSince = async start => (await page.evaluate(() => window.__serverRequests)).slice(start);
const requestCount = () => page.evaluate(() => window.__serverRequests.length);
const tagTexts = name => page.evaluate(name => {
    const instance = Flexdatalist.getInstance(document.querySelector(`[name="${name}"]`));
    return [...(instance._multipleEl?.querySelectorAll('li.value .text') ?? [])].map(element => element.textContent);
}, name);

function expect(condition, message) {
    if (!condition) throw new Error(message);
}
function expectEqual(actual, expected, label) {
    const actualText = JSON.stringify(actual);
    const expectedText = JSON.stringify(expected);
    if (actualText !== expectedText) throw new Error(`${label}: expected ${expectedText}, got ${actualText}`);
}

const results = [];
async function test(section, label, body) {
    const fullLabel = `${section} > ${label}`;
    if (testFilter && !fullLabel.toLowerCase().includes(testFilter.toLowerCase())) return;
    try {
        await body();
        results.push({ fullLabel, passed: true });
    } catch (error) {
        results.push({ fullLabel, passed: false, message: error.message.split('\n')[0] });
    }
    await reset();
}

// --- 1. datalist ---
await test('1 datalist', 'basic suggestion', async () => {
    await pick('lang_basic', 'Py', 'Python');
    expectEqual(await valueOf('lang_basic'), 'Python', 'value');
});
await test('1 datalist', 'selection required keeps initial value and picks', async () => {
    expectEqual(await aliasText('lang_required'), 'PHP', 'initial text');
    expectEqual(await valueOf('lang_required'), 'PHP', 'initial value');
    await (await alias('lang_required')).fill('');
    await pick('lang_required', 'Jav', 'JavaScript');
    expectEqual(await valueOf('lang_required'), 'JavaScript', 'value');
});
await test('1 datalist', 'multiple values', async () => {
    await pick('lang_multiple', 'Ru', 'Ruby');
    await pick('lang_multiple', 'Go', 'Go');
    expectEqual(await valueOf('lang_multiple'), 'Ruby,Go', 'value');
});
await test('1 datalist', 'multiple + selection required rejects free text', async () => {
    await type('lang_multi_req', 'Klingon');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    expectEqual(await valueOf('lang_multi_req'), '', 'value after free text');
    await reset();
    await (await alias('lang_multi_req')).fill('');
    await pick('lang_multi_req', 'Rus', 'Rust');
    expectEqual(await valueOf('lang_multi_req'), 'Rust', 'value');
});

// --- 2. static data ---
await test('2 static', 'basic search in label', async () => {
    await type('fruit_basic', 'ap');
    await waitForResults();
    expectEqual(await resultTexts(), ['Apple'], 'results');
    await resultItems().first().click();
    expectEqual(await valueOf('fruit_basic'), 'Apple', 'value');
});
await test('2 static', 'search in label + color', async () => {
    await type('fruit_multifield', 'red');
    await waitForResults();
    expectEqual((await resultItems().count()), 4, 'red fruits');
});
await test('2 static', 'JSON file via data-data', async () => {
    await pick('country_file', 'portu', 'Portugal');
    expectEqual(await valueOf('country_file'), 'Portugal', 'value');
});
await test('2 static', 'searchContain', async () => {
    await type('fruit_contain', 'an');
    await waitForResults();
    const texts = (await resultTexts()).join('|');
    expect(texts.includes('Banana') && texts.includes('Mango') && texts.includes('Orange'), `results: ${texts}`);
});
await test('2 static', 'searchByWord', async () => {
    await type('country_byword', 'papua guinea');
    await waitForResults();
    const texts = await resultTexts();
    expect(texts.some(text => text.includes('Papua New Guinea')), `results: ${texts}`);
    expect(!texts.some(text => text === 'Guinea'), `Guinea alone should not match both words: ${texts}`);
});
await test('2 static', 'searchEqual', async () => {
    await type('fruit_equal', 'appl');
    await page.waitForTimeout(500);
    expectEqual(await resultItems().count(), 0, 'partial word');
    await page.keyboard.type('e');
    await waitForResults();
    expectEqual(await resultTexts(), ['Apple'], 'full word');
});
await test('2 static', 'minLength 0 shows all on focus', async () => {
    await (await alias('fruit_showall')).click();
    await waitForResults(15);
    expectEqual(await resultItems().count(), 15, 'items');
});
await test('2 static', 'searchDisabled shows unfiltered data', async () => {
    await type('country_searchdisabled', 'zz');
    await waitForResults();
    expect((await resultItems().count()) > 50, 'expected many unfiltered results');
});

// --- 3. remote ---
await test('3 remote', 'server-side search', async () => {
    const start = await requestCount();
    await pick('remote_basic', 'por', 'Portugal');
    expectEqual(await valueOf('remote_basic'), 'PT', 'value');
    const requests = await requestsSince(start);
    expect(requests.some(request => request.parameters.keyword === 'por'), `requests: ${JSON.stringify(requests.map(r => r.parameters))}`);
});
await test('3 remote', 'searchContain sent as contain=true', async () => {
    const start = await requestCount();
    await type('remote_contain', 'land');
    await waitForResults();
    const texts = (await resultTexts()).join('|');
    expect(texts.includes('Finland') && texts.includes('Iceland'), `results: ${texts}`);
    const requests = await requestsSince(start);
    expect(requests.every(request => request.parameters.contain === 'true'), 'contain param');
});
await test('3 remote', 'cache avoids a second request', async () => {
    const start = await requestCount();
    await type('remote_cached', 'po');
    await waitForResults();
    await reset();
    await (await alias('remote_cached')).fill('');
    await type('remote_cached', 'po');
    await waitForResults();
    const requests = (await requestsSince(start)).filter(request => request.parameters.keyword === 'po');
    expectEqual(requests.length, 1, 'requests for "po"');
});
await test('3 remote', 'searchDelay sends one request', async () => {
    const start = await requestCount();
    await type('remote_delay', 'spa');
    await page.waitForTimeout(1200);
    const requests = await requestsSince(start);
    expectEqual(requests.map(request => request.parameters.keyword), ['spa'], 'keywords requested');
});
await test('3 remote', 'maxShownResults 5', async () => {
    await (await alias('remote_maxresults')).click();
    await waitForResults();
    await page.waitForTimeout(300);
    expectEqual(await resultItems().count(), 5, 'items');
});
await test('3 remote', 'params function + keywordParamName', async () => {
    await page.selectOption('#remote-params-continent', 'Asia');
    const start = await requestCount();
    await type('remote_params', 'in');
    await waitForResults();
    const requests = await requestsSince(start);
    const last = requests.at(-1);
    expect(last.parameters.q === 'in' && last.parameters.continent === 'Asia' && !('keyword' in last.parameters), `params: ${JSON.stringify(last.parameters)}`);
    const texts = (await resultTexts()).join('|');
    expect(texts.includes('India') && !texts.includes('Ireland'), `results: ${texts}`);
});
await test('3 remote', 'POST + JSON + header', async () => {
    const start = await requestCount();
    await pick('remote_post', 'ger', 'Germany');
    const last = (await requestsSince(start)).at(-1);
    expect(last.method === 'POST' && last.contentType.includes('application/json') && last.status === 200, `request: ${last.method} ${last.contentType} ${last.status}`);
    expectEqual(await valueOf('remote_post'), 'Germany', 'value');
});
await test('3 remote', 'resultsProperty items', async () => {
    await pick('remote_items', 'bra', 'Brazil');
    expectEqual(await valueOf('remote_items'), 'Brazil', 'value');
});
await test('3 remote', 'resultsLoader on a slow server', async () => {
    await type('remote_slow', 'ca');
    await page.waitForSelector('.flexdatalist-fetching-results-loader img', { timeout: 1200 });
    await waitForResults();
});
await test('3 remote', 'error event on HTTP 500', async () => {
    await type('remote_error', 'a');
    await page.waitForFunction(() => document.getElementById('remote-error-message').textContent.includes('500'), null, { timeout: 3000 });
});
await test('3 remote', 'options sent by the server', async () => {
    await type('remote_options', 's');
    await waitForResults();
    await page.waitForTimeout(300);
    expectEqual(await resultItems().count(), 3, 'items');
});
await test('3 remote', 'server log shows requests', async () => {
    expect((await page.locator('#server-log .log-line').count()) > 5, 'log lines');
});

// --- 4. multiple ---
await test('4 multiple', 'free text + pick', async () => {
    await type('multi_free', 'Foo');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    await pick('multi_free', 'Kiw', 'Kiwi');
    expectEqual(await valueOf('multi_free'), 'Foo,Kiwi', 'value');
});
await test('4 multiple', 'backspace marks then removes last tag', async () => {
    await (await alias('multi_free')).click();
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(150);
    expectEqual(await valueOf('multi_free'), 'Foo,Kiwi', 'value after the first Backspace (tag only marked)');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(150);
    expectEqual(await valueOf('multi_free'), 'Foo', 'value after the second Backspace');
});
await test('4 multiple', 'selection required rejects free text', async () => {
    await type('multi_req', 'Foo');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    expectEqual(await valueOf('multi_req'), '', 'value');
});
await test('4 multiple', 'pre-selected ids', async () => {
    expectEqual(await valueOf('multi_presel'), '1,2,3', 'value');
    expectEqual(await tagTexts('multi_presel'), ['Afghanistan', 'Albania', 'Algeria'], 'tags');
});
await test('4 multiple', 'limitOfValues 3', async () => {
    for (const fruit of ['Apple', 'Banana', 'Cherry']) {
        await pick('multi_limit', fruit.slice(0, 3), fruit);
    }
    await page.evaluate(() => Flexdatalist.getInstance(document.querySelector('[name="multi_limit"]')).addValue('Grape'));
    await page.waitForTimeout(150);
    expectEqual(await valueOf('multi_limit'), 'Apple,Banana,Cherry', 'value');
});
await test('4 multiple', 'allowDuplicateValues', async () => {
    await pick('multi_dup', 'App', 'Apple');
    await pick('multi_dup', 'App', 'Apple');
    expectEqual(await valueOf('multi_dup'), 'Apple,Apple', 'value');
});
await test('4 multiple', 'removeOnBackspace false', async () => {
    await pick('multi_nobksp', 'App', 'Apple');
    await (await alias('multi_nobksp')).click();
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(150);
    expectEqual(await valueOf('multi_nobksp'), 'Apple', 'value');
});
await test('4 multiple', 'toggleSelected', async () => {
    expectEqual(await valueOf('multi_toggle'), '166,149', 'initial value');
    await page.evaluate(() => {
        const instance = Flexdatalist.getInstance(document.querySelector('[name="multi_toggle"]'));
        instance._multipleEl.querySelector('li.value').scrollIntoView();
    });
    const firstTag = page.locator('[name="multi_toggle"]').locator('xpath=..').locator('li.value').first();
    await firstTag.locator('.text').click();
    await page.waitForTimeout(150);
    expect(await firstTag.evaluate(element => element.classList.contains('disabled')), 'tag disabled');
    expectEqual(await valueOf('multi_toggle'), '149', 'value without the toggled tag');
});
await test('4 multiple', 'collapseAfterN 3', async () => {
    for (const fruit of ['Apple', 'Banana', 'Cherry', 'Grape', 'Kiwi']) {
        await pick('multi_collapse', fruit.slice(0, 3), fruit);
    }
    const control = page.locator('.flexdatalist-collapsed-control:visible');
    expect((await control.count()) === 1, 'collapse control');
    expect((await control.innerText()).includes('+2 more'), `label: ${await control.innerText()}`);
    const visibleTags = await page.locator('#multi-collapse ~ ul li.value:visible').allInnerTexts();
    expectEqual(visibleTags.map(text => text.replace('×', '').trim()).join(','), 'Apple,Banana,Cherry', 'only the first 3 tags visible');
    await control.click();
    expectEqual(await page.locator('#multi-collapse ~ ul li.value:visible').count(), 5, 'all 5 tags visible after expanding');
});
await test('4 multiple', 'paste a list', async () => {
    const input = await alias('multi_paste');
    await input.click();
    await input.evaluate(element => {
        const clipboard = new DataTransfer();
        clipboard.setData('text/plain', 'Apple, Kiwi, Mango');
        element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: clipboard, bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(200);
    expectEqual(await valueOf('multi_paste'), 'Apple,Kiwi,Mango', 'value');
});

// --- 5. valueProperty ---
for (const [sourceName, keyword, itemText] of [['multi_free', 'Man', 'Mango'], ['lang_multi_req', 'Swi', 'Swift']])
await test('4 multiple', `picking a tag in ${sourceName} does not steal focus from the next field`, async () => {
    await pick(sourceName, keyword, itemText);
    const nextField = await alias('fruit_contain');
    await nextField.fill('');
    await nextField.click();
    await nextField.pressSequentially('berry', { delay: 120 }); // ~600 ms of typing
    expectEqual(await nextField.inputValue(), 'berry', 'text in the next field');
    expect(await nextField.evaluate(element => element === document.activeElement), 'next field kept focus');
});

await test('5 valueProperty', 'store id', async () => {
    await pick('vp_id', 'Portu', 'Portugal');
    expectEqual(await valueOf('vp_id'), countryByName('Portugal').id, 'value');
});
await test('5 valueProperty', 'store iso2', async () => {
    await pick('vp_iso2', 'Portu', 'Portugal');
    expectEqual(await valueOf('vp_iso2'), 'PT', 'value');
});
await test('5 valueProperty', 'store whole object', async () => {
    await pick('vp_star', 'Portu', 'Portugal');
    expectEqual(JSON.parse(await valueOf('vp_star')).name, 'Portugal', 'value name');
});
await test('5 valueProperty', 'whole object, multiple', async () => {
    await pick('vp_star_multi', 'Portu', 'Portugal');
    await pick('vp_star_multi', 'Spai', 'Spain');
    expectEqual(JSON.parse(await valueOf('vp_star_multi')).map(country => country.name), ['Portugal', 'Spain'], 'value');
});
await test('5 valueProperty', 'free text with *', async () => {
    await type('vp_freetype', 'Atlantis');
    await reset();
    expect((await valueOf('vp_freetype')).includes('Atlantis'), `value: ${await valueOf('vp_freetype')}`);
});
await test('5 valueProperty', 'static array id', async () => {
    await pick('vp_fruit_id', 'ban', 'Banana');
    expectEqual(await valueOf('vp_fruit_id'), '2', 'value');
});
await test('5 valueProperty', 'pre-selected value resolved by the server', async () => {
    expectEqual(await valueOf('vp_preselected'), 'PT', 'value');
    expectEqual(await aliasText('vp_preselected'), 'Portugal', 'text');
});
await test('5 valueProperty', 'nested properties (dotted paths)', async () => {
    expectEqual(await valueOf('vp_nested'), 'E-104', 'initial value');
    expectEqual(await aliasText('vp_nested'), 'David Almeida', 'initial text');
    await (await alias('vp_nested')).fill('');
    await type('vp_nested', 'lyo');
    await waitForResults();
    const groupNames = (await page.locator('.flexdatalist-results li.group .group-name').allTextContents()).join('|');
    expectEqual(groupNames, 'France', 'group from office.country.name');
    const firstItem = resultItems().first();
    expect((await firstItem.innerText()).includes('Inês Carvalho'), 'found through office.city.name');
    expectEqual(await firstItem.locator('.highlight').first().innerText(), 'Lyo', 'highlight in the nested city');
    const imageSource = await firstItem.locator('img').getAttribute('src');
    expect(imageSource?.startsWith('data:image/svg'), `img src: ${imageSource}`);
    await firstItem.click();
    expectEqual(await valueOf('vp_nested'), 'E-109', 'value');
});

// --- 6. textProperty ---
await test('6 textProperty', 'name', async () => {
    await pick('tp_name', 'Portu', 'Portugal');
    expectEqual(await aliasText('tp_name'), 'Portugal', 'text');
});
await test('6 textProperty', 'pattern', async () => {
    await pick('tp_pattern', 'Portu', 'Portugal');
    expectEqual(await aliasText('tp_pattern'), 'Lisbon, Portugal (Europe)', 'text');
});
await test('6 textProperty', 'pattern + multiple + pre-selected', async () => {
    const tags = await tagTexts('tp_multi');
    expectEqual(tags.length, 2, 'tag count');
    expect(tags.every(tag => tag.split(', ').length === 3), `tags: ${tags}`);
});
await test('6 textProperty', 'static pattern', async () => {
    await pick('tp_fruit', 'kiw', 'Kiwi');
    expectEqual(await aliasText('tp_fruit'), 'Kiwi (Green)', 'text');
    expectEqual(await valueOf('tp_fruit'), '5', 'value');
});

// --- 7. groupBy ---
await test('7 groupBy', 'continent headers', async () => {
    await type('grp_continent', 'gu');
    await waitForResults();
    expect((await page.locator('ul.flexdatalist-results li.group:visible').count()) >= 2, 'group headers');
});
await test('7 groupBy', 'category headers', async () => {
    await (await alias('grp_fruit')).click();
    await waitForResults();
    expectEqual(await page.locator('ul.flexdatalist-results li.group:visible').count(), 6, 'groups');
});
await test('7 groupBy', 'tabs', async () => {
    await (await alias('grp_fruit_tabs')).click();
    await page.waitForSelector('.fdl-group-tab', { timeout: 3000 });
    const tabCount = await page.locator('.fdl-group-tab:visible').count();
    expect(tabCount >= 6, `tabs: ${tabCount}`);
    const activePanelItems = () => page.locator('.fdl-group-panel.is-active li.item').allInnerTexts();
    const before = await activePanelItems();
    await page.locator('.fdl-group-tab:visible').nth(2).click();
    await page.waitForTimeout(400);
    const after = await activePanelItems();
    expect(before.length > 0 && JSON.stringify(before) !== JSON.stringify(after), `active panel before ${before}, after ${after}`);
});

// --- 8. search options ---
await test('8 search', 'focusFirstResult + Enter', async () => {
    await type('sr_focusfirst', 'portu');
    await waitForResults();
    await page.waitForTimeout(100);
    expect(await resultItems().first().evaluate(element => element.classList.contains('active')), 'first item active');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    expectEqual(await valueOf('sr_focusfirst'), 'Portugal', 'value');
});
await test('8 search', 'normalizeString', async () => {
    await type('sr_normalize', 'franca');
    await waitForResults();
    expectEqual(await resultTexts(), ['França'], 'results');
});
await test('8 search', 'selectionRequired clears free text on blur', async () => {
    await type('sr_required', 'xyz');
    await reset();
    expectEqual(await aliasText('sr_required'), '', 'text');
    expectEqual(await valueOf('sr_required'), '', 'value');
});

// --- 8b. display ---
await test('8b display', 'icons + visibleProperties', async () => {
    await type('display_people', 'ana');
    await waitForResults();
    const imageSource = await resultItems().first().locator('img').getAttribute('src');
    expect(imageSource?.startsWith('data:image/svg'), `img src: ${imageSource}`);
    expect((await resultItems().first().innerText()).includes('ana.ribeiro@example.com'), 'email visible');
    await resultItems().first().click();
    expectEqual(await valueOf('display_people'), '101', 'value');
});
await test('8b display', 'mixed records as tabs', async () => {
    await (await alias('display_workspace')).click();
    await page.waitForSelector('.fdl-group-tab', { timeout: 3000 });
    const tabs = (await page.locator('.fdl-group-tab:visible').allInnerTexts()).join('|');
    expect(['People', 'Tasks', 'Pages'].every(name => tabs.includes(name)), `tabs: ${tabs}`);
});
await test('8b display', 'resultsContainer', async () => {
    await type('display_container', 'ap');
    await page.waitForFunction(() => document.querySelectorAll('#display-container-panel li.item').length > 0, null, { timeout: 3000 });
    const insidePanel = await page.locator('#display-container-panel li.item').allInnerTexts();
    expect(insidePanel.join('|').includes('Apple'), `panel: ${insidePanel}`);
    const elsewhere = await page.evaluate(() => [...document.querySelectorAll('ul.flexdatalist-results')].filter(list => !list.closest('#display-container-panel')).length);
    expectEqual(elsewhere, 0, 'dropdowns outside the panel');
});
await test('8b display', 'classPrefix', async () => {
    await type('display_prefix', 'ap');
    await page.waitForSelector('ul.fd3-flexdatalist-results li.item', { timeout: 3000 });
    const className = await page.locator('#display-prefix-class').innerText();
    expect(className.includes('fd3-flexdatalist-results'), `results list class: "${className}"`);
    expectEqual(await page.locator('ul.flexdatalist-results').count(), 0, 'unprefixed results lists');
    const aliasClasses = await (await alias('display_prefix')).getAttribute('class');
    expect(aliasClasses.includes('fd3-flexdatalist-alias'), `alias classes: ${aliasClasses}`);
    // The prefixed copy of the stylesheet applies (only that rule sets z-index 10000).
    const zIndex = await page.locator('ul.fd3-flexdatalist-results').evaluate(element => getComputedStyle(element).zIndex);
    expectEqual(zIndex, '10000', 'results list z-index from the prefixed stylesheet');
    await page.locator('ul.fd3-flexdatalist-results li.item', { hasText: 'Apple' }).click();
    expectEqual(await valueOf('display_prefix'), 'Apple', 'value');
});

await test('8b display', 'theming with CSS variables', async () => {
    expectEqual(await tagTexts('display_themed'), ['Kiwi', 'Lime'], 'tags');
    const background = await page.evaluate(() => getComputedStyle(document.querySelector('#display-theme li.value')).backgroundColor);
    expectEqual(background, 'rgb(209, 250, 229)', 'tag background');
});
await test('8b display', 'inside a dialog', async () => {
    await page.click('#display-dialog-open');
    await type('display_dialog', 'fra');
    await waitForResults();
    const onTop = await page.evaluate(() => {
        const item = [...document.querySelectorAll('ul.flexdatalist-results li.item')].find(element => element.offsetParent !== null);
        const box = item.getBoundingClientRect();
        const topElement = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return item.contains(topElement);
    });
    expect(onTop, 'results are covered by the dialog');
    await resultItems().filter({ hasText: 'France' }).first().click();
    expectEqual(await valueOf('display_dialog'), 'FR', 'value');
    await page.evaluate(() => document.getElementById('display-dialog').close());
});
await test('8b display', 'HTML in data is escaped', async () => {
    await (await alias('display_unsafe')).click();
    await waitForResults(3);
    await page.waitForTimeout(300);
    const texts = (await resultTexts()).join('|');
    expect(texts.includes('<img') && texts.includes('<b>Bold</b>'), `texts: ${texts}`);
    expectEqual(await page.evaluate(() => window.__xssTriggered ?? false), false, 'script executed');
});

// --- 9. add new item ---
await test('9 add new', 'single', async () => {
    await type('addnew_single', 'Dragonfruit');
    await page.waitForSelector('ul.flexdatalist-results li.add-new-item', { timeout: 3000 });
    const label = await page.locator('ul.flexdatalist-results li.add-new-item').innerText();
    expect(label.includes('Add "Dragonfruit" as new fruit'), `label: ${label}`);
    await page.locator('ul.flexdatalist-results li.add-new-item').click();
    expect((await page.evaluate(() => window.__addNewEvents)).includes('Dragonfruit'), 'addnew event');
});
await test('9 add new', 'multiple', async () => {
    await type('addnew_multi', 'Durian');
    await page.waitForSelector('ul.flexdatalist-results li.add-new-item', { timeout: 3000 });
    await page.locator('ul.flexdatalist-results li.add-new-item').click();
    expect((await page.evaluate(() => window.__addNewEvents)).includes('Durian'), 'addnew event');
});

// --- 10. relatives ---
await test('10 relatives', 'chained field disabled until relative is set', async () => {
    expect(await (await alias('rel_country')).evaluate(element => element.readOnly), 'country input should start read-only');
});
await test('10 relatives', 'relatives sent and used by the server', async () => {
    await pick('continent', '', 'Europe');
    expectEqual(await valueOf('continent'), 'Europe', 'continent value');
    await page.waitForTimeout(200);
    expect(!(await (await alias('rel_country')).evaluate(element => element.readOnly)), 'country input editable');
    const start = await requestCount();
    await (await alias('rel_country')).click();
    await waitForResults();
    const last = (await requestsSince(start)).at(-1);
    expectEqual(last?.parameters['relatives[continent]'], 'Europe', 'relatives param');
    const texts = (await resultTexts()).join('|');
    expect(texts.includes('Portugal') && !texts.includes('Japan'), 'only European countries');
});

// --- 10b. keyboard ---
await test('10b keyboard', 'arrows + Enter select', async () => {
    await type('keyboard_input', 'p');
    await waitForResults();
    const texts = await resultTexts();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    expectEqual(await valueOf('keyboard_input'), texts[1], 'value is the second result');
});
await test('10b keyboard', 'Escape closes results', async () => {
    await type('keyboard_input', 'p');
    await waitForResults();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    expectEqual(await resultItems().count(), 0, 'visible results');
});
await test('10b keyboard', 'comma adds a tag', async () => {
    const before = await valueOf('keyboard_input');
    await (await alias('keyboard_input')).fill('');
    await type('keyboard_input', 'Foo,');
    await page.waitForTimeout(150);
    expectEqual(await valueOf('keyboard_input'), before ? `${before},Foo` : 'Foo', 'value');
});

// --- 11. programmatic API ---
await test('11 API', 'value methods', async () => {
    const output = () => page.locator('#api-output').innerText();
    await page.click('text=setValue(\'1,3\')');
    await page.waitForTimeout(150);
    expectEqual(await valueOf('api_input'), '1,3', 'after setValue');
    await page.click('button:text-is("getText()")');
    expect((await output()).includes('["Apple","Cherry"]'), `getText: ${await output()}`);
    await page.click('text=getText(\' | \')');
    expect((await output()).includes('Apple | Cherry'), `getText(sep): ${await output()}`);
    await page.click('text=addValue(\'5\')');
    await page.waitForTimeout(150);
    expectEqual(await valueOf('api_input'), '1,3,5', 'after addValue');
    await page.click('text=removeValue(\'1\')');
    expectEqual(await valueOf('api_input'), '3,5', 'after removeValue');
    await page.click('text=getInstance(el)');
    expect((await output()).includes('true'), `getInstance: ${await output()}`);
});
await test('11 API', 'state methods', async () => {
    const output = () => page.locator('#api-output').innerText();
    await page.click('button:text-is("disable()")');
    await page.click('text=isDisabled() / isReadonly()');
    expect((await output()).includes('isDisabled() = true'), await output());
    await page.click('button:text-is("enable()")');
    await page.click('text=readonly(true)');
    await page.click('text=isDisabled() / isReadonly()');
    expect((await output()).includes('isDisabled() = false, isReadonly() = true'), await output());
    await page.click('text=readonly(false)');
});
await test('11 API', 'search, clear, destroy, reinit', async () => {
    await page.click('text=search(\'Apple\')');
    await waitForResults();
    await page.click('text=closeResults()');
    await page.waitForTimeout(150);
    expectEqual(await resultItems().count(), 0, 'closed');
    await page.click('button:text-is("clear()") >> nth=0');
    expectEqual(await valueOf('api_input'), '', 'after clear');
    await page.click('text=destroy()');
    expectEqual(await page.evaluate(() => Flexdatalist.getInstance(document.getElementById('api-input'))), null, 'instance after destroy');
    await page.click('text=reinit()');
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => Flexdatalist.getInstance(document.getElementById('api-input')) !== null), 'instance after reinit');
});
await test('11 API', 'getOption / setOption', async () => {
    await page.click('text=getOption(\'minLength\')');
    expect((await page.locator('#opts-output').innerText()).includes('= 3'), 'getOption');
    await page.click('text=setOption(\'minLength\', 0)');
    await (await alias('api_opts')).click();
    await waitForResults(15);
});

// --- 12. events ---
await test('12 events', 'select, toggle, remove, clear are logged', async () => {
    await page.locator('#event-log').evaluate(element => { element.innerHTML = ''; });
    await pick('events_input', 'App', 'Apple');
    await pick('events_input', 'Kiw', 'Kiwi');
    await pick('events_input', 'Gra', 'Grape');
    const tags = page.locator('[name="events_input"]').locator('xpath=..').locator('li.value');
    await tags.first().locator('.text').click();      // toggle Apple
    await page.waitForTimeout(100);
    await tags.last().locator('.fdl-remove').click(); // remove Grape, Kiwi stays
    await page.waitForTimeout(100);
    await page.click('button:text-is("clear()") >> nth=1');
    await page.waitForTimeout(200);
    const log = await page.locator('#event-log').innerText();
    const expectedEvents = ['select:flexdatalist', 'change:flexdatalist', 'before:flexdatalist.toggle', 'after:flexdatalist.toggle',
        'after:flexdatalist.remove', 'before:flexdatalist.remove.all', 'after:flexdatalist.remove.all', 'clear:flexdatalist',
        'shown:flexdatalist.results', 'removed:flexdatalist.results'];
    const missing = expectedEvents.filter(name => !log.includes(name));
    expectEqual(missing, [], 'missing events');
});

// --- 13. disabled / readonly ---
await test('13 disabled', 'disabled attribute, option, readonly', async () => {
    expect(await (await alias('dis_attr')).isDisabled(), 'disabled attribute');
    expect(await (await alias('dis_opt')).isDisabled(), 'data-disabled');
    const readonlyAlias = await alias('readonly_ex');
    expectEqual(await readonlyAlias.getAttribute('readonly') !== null, true, 'readonly attribute');
    expectEqual(await readonlyAlias.inputValue(), 'Apple', 'readonly text');
});

// --- 14. advanced ---
await test('14 advanced', 'pipe separator', async () => {
    await pick('adv_pipe', 'App', 'Apple');
    await pick('adv_pipe', 'Kiw', 'Kiwi');
    expectEqual(await valueOf('adv_pipe'), 'Apple|Kiwi', 'value');
});
await test('14 advanced', 'noResultsText', async () => {
    await type('adv_noresults', 'zzz');
    await page.waitForSelector('ul.flexdatalist-results li.no-results', { timeout: 3000 });
    expectEqual(await page.locator('ul.flexdatalist-results li.no-results').innerText(), '🚫 No fruit found for "zzz"', 'text');
});

// --- index.html ---
const docsPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const docsErrors = [];
docsPage.on('pageerror', error => docsErrors.push(error.message));
// The star count comes from api.github.com; keep the tests offline and deterministic.
await docsPage.route('https://api.github.com/**', route => route.abort());
await docsPage.goto(`${baseUrl}${pagesPath}/index.html`);
await docsPage.waitForFunction(() => typeof Flexdatalist === 'function' && document.querySelector('.flexdatalist-alias'));
const heroAlias = () => docsPage.locator('#hero-demo .flexdatalist-alias');
const heroItems = () => docsPage.locator('ul.flexdatalist-results[id^="hd-"] li.item:not(.no-results)');
async function heroType(text) {
    const input = heroAlias();
    await input.click();
    await input.fill('');
    await input.pressSequentially(text, { delay: 25 });
}

await test('index', 'hero opens with "Por" typed and highlighted matches', async () => {
    await docsPage.waitForSelector('ul.flexdatalist-results[id^="hd-single"] li.item span.highlight', { timeout: 4000 });
    expectEqual(await heroAlias().inputValue(), 'Por', 'alias text');
    // searchIn name + capital: "Por" finds Portugal, Puerto Rico… and Benin (capital Porto-Novo).
    const flags = await docsPage.locator('ul.flexdatalist-results[id^="hd-"] .prop-iso2').allInnerTexts();
    expect(flags.includes('PT') && flags.includes('BJ'), `result flags: ${flags.join(', ')}`);
});
await test('index', 'hero single: pick a country', async () => {
    await heroType('portu');
    await docsPage.waitForFunction(() => document.querySelectorAll('ul.flexdatalist-results[id^="hd-"] li.item:not(.no-results)').length === 1);
    await heroItems().first().click();
    await docsPage.waitForTimeout(100);
    expectEqual(await docsPage.locator('#hero-value').innerText(), 'PT', 'getValue readout');
    expectEqual(await docsPage.locator('#hero-text').innerText(), 'Portugal', 'getText readout');
});
await test('index', 'hero tabs: keyboard to Tags with PT,ES,FR', async () => {
    await docsPage.locator('#hero-tab-single').focus();
    await docsPage.keyboard.press('ArrowRight');
    await docsPage.waitForFunction(() => document.querySelectorAll('#hero-demo li.value').length === 3);
    expectEqual(await docsPage.locator('#hero-tab-tags').getAttribute('aria-selected'), 'true', 'tags tab selected');
    expect(await docsPage.evaluate(() => document.activeElement.id) === 'hero-tab-tags', 'focus moved to the tab');
    expectEqual(await docsPage.locator('#hero-value').innerText(), '["PT","ES","FR"]', 'getValue readout');
    expectEqual(await docsPage.locator('ul.flexdatalist-results').count(), 0, 'old dropdown removed');
});
await test('index', 'hero tabs: Grouped shows continent headers', async () => {
    await docsPage.keyboard.press('ArrowRight');
    await heroType('ma');
    await docsPage.waitForSelector('ul.flexdatalist-results[id^="hd-grouped"] li.group', { timeout: 4000 });
    expect(await docsPage.locator('ul.flexdatalist-results[id^="hd-grouped"] li.item.active').count() === 1, 'first result highlighted');
});
await test('index', 'hero remote: fetched, then served from the cache', async () => {
    await docsPage.locator('#hero-tab-remote').click();
    await heroType('por');
    await docsPage.waitForSelector('ul.flexdatalist-results[id^="hd-remote"] li.item', { timeout: 4000 });
    await docsPage.waitForTimeout(100);
    expect((await docsPage.locator('[data-request-text]').innerText()).includes('keyword=por'), 'request line shows the keyword');
    expect((await docsPage.locator('[data-request-badge]').innerText()).startsWith('fetched'), 'first search is fetched');
    await docsPage.keyboard.press('Escape');
    await heroType('por');
    await docsPage.waitForSelector('ul.flexdatalist-results[id^="hd-remote"] li.item', { timeout: 4000 });
    await docsPage.waitForTimeout(100);
    expectEqual(await docsPage.locator('[data-request-badge]').innerText(), 'localStorage cache', 'second search badge');
});
await test('index', 'sidebar counts come from the page', async () => {
    const counts = await docsPage.locator('.sidebar [data-count]').allInnerTexts();
    expectEqual(counts, ['47', '22', '19'], 'options / api / events');
});
await test('index', 'options filter, empty state and "/" shortcut', async () => {
    await docsPage.locator('h1').click();
    await docsPage.keyboard.press('/');
    expect(await docsPage.evaluate(() => document.activeElement.id) === 'opt-filter', '"/" focuses the filter');
    await docsPage.keyboard.type('cache');
    const visible = await docsPage.locator('.opt:visible .opt-link').allInnerTexts();
    // Matches name, type, default and description: "data" says "(loaded once, cached)".
    expectEqual(visible, ['data', 'cache', 'cacheLifetime'], 'options matching "cache"');
    expectEqual(await docsPage.locator('[data-opt-count]').innerText(), '3 / 47', 'live count');
    await docsPage.locator('#opt-filter').fill('zzzz');
    expect(await docsPage.locator('[data-opt-empty]').isVisible(), 'empty state shown');
    await docsPage.locator('#opt-filter').fill('');
    expectEqual(await docsPage.locator('.opt:visible').count(), 47, 'all options back');
});
await test('index', 'event log prints real events', async () => {
    const before = await docsPage.locator('[data-event-lines] li').count();
    expect(before > 0, 'init events logged');
    await docsPage.locator('[data-events-clear]').click();
    await docsPage.waitForFunction(() => [...document.querySelectorAll('[data-event-lines] li')].some(line => line.dataset.event === 'clear:flexdatalist'));
});
await test('index', 'theme toggle switches and keeps .fdl-dark in sync', async () => {
    const startTheme = await docsPage.evaluate(() => document.documentElement.dataset.theme);
    await docsPage.locator('[data-theme-toggle]').click();
    const state = await docsPage.evaluate(() => ({
        theme: document.documentElement.dataset.theme,
        fdlDark: document.documentElement.classList.contains('fdl-dark'),
        stored: localStorage.getItem('fd-docs-theme'),
    }));
    expect(state.theme !== startTheme, 'theme changed');
    expectEqual(state.fdlDark, state.theme === 'dark', '.fdl-dark follows the theme');
    expectEqual(state.stored, state.theme, 'choice saved');
});
await test('index', 'no page errors', async () => {
    expectEqual(docsErrors, [], 'page errors');
});
await docsPage.close();

// --- report ---
const failed = results.filter(result => !result.passed);
for (const result of results) {
    console.log(`${result.passed ? 'PASS' : 'FAIL'}  ${result.fullLabel}${result.passed ? '' : '\n      ' + result.message}`);
}
const relevantErrors = pageErrors.filter(message => !message.includes('500') && !message.includes('401'));
if (relevantErrors.length) {
    console.log('\nPage errors:\n  ' + [...new Set(relevantErrors)].join('\n  '));
}
console.log(`\n${results.length - failed.length}/${results.length} passed`);
await browser.close();
server.close();
process.exit(failed.length || relevantErrors.length ? 1 : 0);
