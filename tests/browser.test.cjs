// Real Chromium DOM and trusted mouse input; storage is mocked because the cloud
// browser's administrator policy disallows loading unpacked extensions.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

test('Tab con botón izquierdo y lateral, Shift+Tab, cancelación y desactivación', async () => {
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><button id="one">Uno</button><input id="two"><button disabled>Deshabilitado</button><input hidden><button id="three">Tres</button>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const binding = { key: 'Tab', code: 'Tab' };
    await page.addInitScript(({ settings }) => {
      globalThis.testSettings = settings;
      globalThis.chrome = { storage: { local: { get: async () => ({ settings }) },
        onChanged: { addListener(fn) { globalThis.changeSettings = value => fn({ settings: { newValue: value } }, 'local'); } } } };
    }, { settings: { enabled: true, block: true, mappings: { 0: binding, 3: binding } } });
    await page.addInitScript(['mapping.js', 'actions.js', 'content.js']
      .map(file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')).join('\n'));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const cdp = await page.context().newCDPSession(page);
    async function click(button, buttons) {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 300, y: 100, button, buttons, clickCount: 1 });
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 300, y: 100, button, buttons: 0, clickCount: 1 });
    }
    const active = () => page.evaluate(() => document.activeElement.id);
    await page.focus('#one');
    await click('left', 1); assert.equal(await active(), 'two');
    const diagnostic = await page.evaluate(() => MouseRemapController.status());
    assert.equal(diagnostic.loaded, true);
    assert.equal(diagnostic.lastButton, 0);
    assert.equal(diagnostic.lastKey, 'Tab');
    await click('back', 8); assert.equal(await active(), 'three');
    // Applying scripts a second time must not create duplicate listeners.
    await page.evaluate(fs.readFileSync(path.join(__dirname, '../content.js'), 'utf8'));
    // Test a game-style consumer of legacy codes without pretending this is Cytos.
    await page.evaluate(() => {
      globalThis.legacyEvents = [];
      window.addEventListener('keydown', event => legacyEvents.push({ type: event.type, keyCode: event.keyCode, which: event.which }));
      window.addEventListener('keyup', event => legacyEvents.push({ type: event.type, keyCode: event.keyCode, which: event.which }));
      testSettings.mode = 'game'; changeSettings(testSettings);
    });
    await click('back', 8); assert.equal(await active(), 'three');
    assert.deepEqual(await page.evaluate(() => legacyEvents), [
      { type: 'keydown', keyCode: 9, which: 9 }, { type: 'keyup', keyCode: 9, which: 9 }
    ]);
    await page.evaluate(() => { testSettings.mode = 'auto'; changeSettings(testSettings); });
    await click('back', 8); assert.equal(await active(), 'one');
    await page.evaluate(() => {
      testSettings.mappings[3].shiftKey = true; changeSettings(testSettings);
    });
    await click('back', 8); assert.equal(await active(), 'three');
    await page.evaluate(() => document.addEventListener('keydown', e => e.preventDefault(), { once: true }));
    await click('back', 8); assert.equal(await active(), 'three');
    await page.evaluate(() => { testSettings.enabled = false; changeSettings(testSettings); });
    await page.mouse.click(15, 15); assert.equal(await active(), 'one');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test('configuración real del popup y página de diagnóstico con almacenamiento simulado', async () => {
  const root = path.join(__dirname, '..');
  const allowed = new Set(['popup.html', 'popup.css', 'popup.js', 'mapping.js', 'actions.js', 'content.js', 'test.html', 'test.js', 'test.css']);
  const server = http.createServer((req, res) => {
    const name = req.url.slice(1);
    if (!allowed.has(name)) { res.writeHead(404); res.end(); return; }
    const type = name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html';
    res.setHeader('Content-Type', type); res.end(fs.readFileSync(path.join(root, name)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      let settings; const listeners = [];
      globalThis.readTestSettings = () => settings;
      globalThis.chrome = { storage: { local: {
        get: async () => ({ settings }),
        set: async data => { settings = data.settings; listeners.forEach(fn => fn({ settings: { newValue: settings } }, 'local')); }
      }, onChanged: { addListener: fn => listeners.push(fn) } },
      tabs: { query: async () => [{ id: 1 }], create: async () => {} },
      scripting: { executeScript: async () => [{ result: null }] },
      runtime: { getURL: file => file } };
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    await page.goto(`${base}/popup.html`);
    await page.getByRole('button', { name: 'Asignar Atrás → Tab', exact: true }).click();
    await page.waitForFunction(() => readTestSettings()?.mappings['3']?.key === 'Tab');
    assert.equal(await page.locator('.row').nth(3).locator('.capture').textContent(), 'Tab');
    await page.locator('.row').nth(0).locator('.capture').click();
    await page.keyboard.press('p');
    await page.waitForFunction(() => readTestSettings()?.mappings['0']?.key === 'p');
    await page.locator('.row').nth(0).locator('.capture').click();
    await page.keyboard.press('Tab');
    await page.waitForFunction(() => readTestSettings()?.mappings['0']?.key === 'Tab');
    assert.equal(await page.locator('#enabled').isChecked(), true);
    await page.goto(`${base}/test.html`);
    await page.getByRole('button', { name: 'Asignar Atrás → Tab y empezar' }).click();
    await page.waitForFunction(() => document.activeElement.id === 'first');
    const cdp = await page.context().newCDPSession(page);
    for (const type of ['mousePressed', 'mouseReleased']) {
      await cdp.send('Input.dispatchMouseEvent', { type, x: 500, y: 300, button: 'back', buttons: type === 'mousePressed' ? 8 : 0, clickCount: 1 });
    }
    assert.equal(await page.locator('#mouse').textContent(), 'Botón recibido: Atrás. Asignación: Tab. Remapeo activo.');
    assert.equal(await page.locator('#keyboard').textContent(), 'Tecla emitida: Tab (Tab).');
    assert.equal(await page.evaluate(() => document.activeElement.tagName), 'INPUT');
    assert.notEqual(await page.evaluate(() => document.activeElement.id), 'first');
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close(); await new Promise(resolve => server.close(resolve));
  }
});
