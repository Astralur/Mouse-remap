(() => {
  let settings = MouseRemap.normalize(null);
  const held = new Map();
  function emit(type, target, binding, repeat = false) {
    return target.dispatchEvent(new KeyboardEvent(type, { ...binding, repeat,
      bubbles: true, cancelable: true, composed: true }));
  }
  function releaseAll() {
    for (const { target, binding } of held.values()) emit('keyup', target, binding);
    held.clear();
  }
  function update(value) { releaseAll(); settings = MouseRemap.normalize(value); }
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
  window.addEventListener('mousedown', event => {
    if (!event.isTrusted) return;
    const binding = bindingFor(event);
    if (!binding) return;
    block(event);
    if (held.has(event.button)) return;
    const target = document.activeElement && document.activeElement !== document.body
      ? document.activeElement : event.composedPath()[0];
    held.set(event.button, { target, binding });
    if (emit('keydown', target, binding)) MouseRemap.performDefault?.(target, binding);
  }, true);
  window.addEventListener('mouseup', event => {
    if (!event.isTrusted) return;
    const pressed = held.get(event.button);
    if (!pressed) return;
    block(event);
    held.delete(event.button);
    emit('keyup', pressed.target, pressed.binding);
  }, true);
  for (const type of ['click', 'dblclick', 'auxclick', 'contextmenu']) {
    window.addEventListener(type, event => {
      if (event.isTrusted && bindingFor(event)) block(event);
    }, true);
  }
  window.addEventListener('blur', releaseAll);
  window.addEventListener('pagehide', releaseAll);
})();
