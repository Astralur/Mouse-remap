const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const mapping = require('../mapping.js');
test('compatibilidad numérica para Tab, P, números, funciones y teclado numérico', () => {
  for (const [code, expected] of [['Tab', 9], ['KeyP', 80], ['Digit1', 49], ['F12', 123], ['Numpad1', 97]]) {
    const options = mapping.eventOptions({ key: code === 'Tab' ? 'Tab' : 'p', code });
    assert.equal(options.keyCode, expected);
    assert.equal(options.which, expected);
  }
  assert.equal(mapping.eventOptions({ key: '1', code: 'Numpad1' }).location, 3);
});
test('Cytos activa automáticamente el modo juego y permite anularlo', () => {
  assert.equal(mapping.gameMode(mapping.normalize(null), 'cytos.io'), true);
  assert.equal(mapping.gameMode(mapping.normalize(null), 'example.org'), false);
  assert.equal(mapping.gameMode(mapping.normalize(null), 'fakecytos.io'), false);
  assert.equal(mapping.gameMode(mapping.normalize({ mode: 'page' }), 'cytos.io'), false);
  assert.equal(mapping.gameMode(mapping.normalize({ mode: 'game' }), 'example.org'), true);
});
test('normaliza ajustes y rechaza asignaciones inválidas', () => {
  const config = mapping.normalize({ mappings: { 0: { key: 'a', code: 'KeyA', ctrlKey: true },
    1: null, 9: { key: 'b', code: 'KeyB' } } });
  assert.deepEqual(Object.keys(config.mappings), ['0']);
  assert.equal(mapping.label(config.mappings[0]), 'Ctrl + a');
  assert.equal(mapping.normalize(null).enabled, true);
});
async function harness(settings) {
  const handlers = {}; const output = []; let change;
  const target = { dispatchEvent: event => { output.push(event); return true; } };
  const context = { MouseRemap: mapping, CustomEvent: class {
    constructor(type, options) { this.type = type; Object.assign(this, options); }
  }, KeyboardEvent: class {
    constructor(type, options) { this.type = type; Object.assign(this, options); }
  }, document: { activeElement: target, body: {} },
  window: { addEventListener: (name, fn) => (handlers[name] ||= []).push(fn), dispatchEvent: () => true },
  chrome: { storage: { local: { get: async () => ({ settings }) },
    onChanged: { addListener: fn => { change = fn; } } } } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../content.js'), 'utf8'), context);
  await Promise.resolve();
  return { output, change, fire(type, button = 0, trusted = true) {
    const event = { button, isTrusted: trusted, prevented: false, stopped: false,
      preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; },
      composedPath: () => [target] };
    for (const fn of handlers[type] || []) fn(event);
    return event;
  } };
}
const config = { mappings: { 0: { key: 'a', code: 'KeyA' }, 2: { key: 'Enter', code: 'Enter' } } };
test('envía keydown y keyup al mismo destino y bloquea el clic', async () => {
  const h = await harness(config);
  assert.equal(h.fire('mousedown').prevented, true);
  h.fire('mousedown');
  assert.equal(h.fire('mouseup').prevented, true);
  assert.equal(h.fire('click').stopped, true);
  assert.deepEqual(h.output.map(e => e.type), ['keydown', 'keyup']);
  assert.equal(h.output[0].code, 'KeyA');
  assert.equal(h.output[0].bubbles, true);
});
test('no intercepta botones sin asignar ni eventos sintéticos', async () => {
  const h = await harness(config);
  assert.equal(h.fire('mousedown', 1).prevented, false);
  h.fire('mousedown', 0, false);
  assert.equal(h.output.length, 0);
});
test('libera teclas al perder foco y al desactivar', async () => {
  const h = await harness(config);
  h.fire('mousedown'); h.fire('blur'); h.fire('mouseup');
  h.fire('mousedown', 2);
  h.change({ settings: { newValue: { ...config, enabled: false } } }, 'local');
  assert.equal(h.fire('mousedown').prevented, false);
  assert.deepEqual(h.output.map(e => e.type), ['keydown', 'keyup', 'keydown', 'keyup']);
});
test('permite conservar el clic original', async () => {
  const h = await harness({ ...config, block: false });
  assert.equal(h.fire('mousedown').prevented, false);
  h.fire('mouseup');
  assert.equal(h.output.length, 2);
});
test('manifest usa MV3 y permisos para aplicar y comprobar el remapeo', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../manifest.json')));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ['storage', 'activeTab', 'scripting']);
  for (const script of manifest.content_scripts[0].js) {
    assert.equal(fs.existsSync(path.join(__dirname, '..', script)), true);
  }
});
