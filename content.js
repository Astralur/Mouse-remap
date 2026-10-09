(() => {
  if (globalThis.MouseRemapController) return;
  let settings = MouseRemap.normalize(null);
  let loaded = false;
  let lastButton = null;
  let lastKey = null;
  const held = new Map();
  function emit(type, target, binding, repeat = false) {
    return target.dispatchEvent(new KeyboardEvent(type, { ...MouseRemap.eventOptions(binding), repeat,
      bubbles: true, cancelable: true, composed: true }));
  }
  function releaseAll() {
    for (const { target, binding } of held.values()) emit('keyup', target, binding);
    held.clear();
  }
  function update(value) { releaseAll(); settings = MouseRemap.normalize(value); loaded = true; }
  globalThis.MouseRemapController = { status: () => ({ version: '1.0.2', loaded,
    enabled: settings.enabled, lastButton, lastKey, gameMode: MouseRemap.gameMode(settings, globalThis.location?.hostname),
    mappings: Object.fromEntries(Object.entries(settings.mappings).map(([button, entry]) => [button, MouseRemap.label(entry)])) }) };
  // Fail open until storage is loaded or if the extension context becomes unavailable.
  settings.enabled = false;
  chrome.storage.local.get('settings').then(data => update(data.settings)).catch(() => {});
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) update(changes.settings.newValue);
  });
  function bindingFor(event) {
    return settings.enabled ? settings.mappings[event.button] : undefined;
  }
  function block(event) {
    if (settings.block) { event.preventDefault(); event.stopImmediatePropagation(); }
  }
  function press(event) {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    if (!event.isTrusted) return;
    lastButton = event.button;
    const binding = bindingFor(event);
    lastKey = binding ? MouseRemap.label(binding) : null;
    window.dispatchEvent(new CustomEvent('MouseRemapDiagnostic', { detail: {
      button: lastButton, key: lastKey, enabled: settings.enabled, loaded
    } }));
    if (!binding) return;
    block(event);
    if (held.has(event.button)) return;
    const target = document.activeElement && document.activeElement !== document.body
      ? document.activeElement : event.composedPath()[0];
    held.set(event.button, { target, binding });
    if (emit('keydown', target, binding) && !MouseRemap.gameMode(settings, globalThis.location?.hostname)) {
      MouseRemap.performDefault?.(target, binding);
    }
  }
  function release(event) {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    if (!event.isTrusted) return;
    const pressed = held.get(event.button);
    if (!pressed) { if (bindingFor(event)) block(event); return; }
    block(event);
    held.delete(event.button);
    emit('keyup', pressed.target, pressed.binding);
  }
  for (const type of ['pointerdown', 'mousedown']) window.addEventListener(type, press, true);
  for (const type of ['pointerup', 'mouseup']) window.addEventListener(type, release, true);
  window.addEventListener('pointercancel', releaseAll, true);
  for (const type of ['click', 'dblclick', 'auxclick', 'contextmenu']) {
    window.addEventListener(type, event => {
      if (event.isTrusted && bindingFor(event)) block(event);
    }, true);
  }
  window.addEventListener('blur', releaseAll);
  window.addEventListener('pagehide', releaseAll);
})();
