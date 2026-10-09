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
    await click('back', 8); assert.equal(await active(), 'three');
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
