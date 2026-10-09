(function (root) {
  const defaults = { enabled: true, block: true, mode: 'auto', mappings: {} };
  function normalize(value) {
    const result = { ...defaults, mappings: {} };
    if (!value || typeof value !== 'object') return result;
    result.enabled = value.enabled !== false;
    result.block = value.block !== false;
    result.mode = ['auto', 'game', 'page'].includes(value.mode) ? value.mode : 'auto';
    for (const [button, entry] of Object.entries(value.mappings || {})) {
      if (!/^[0-4]$/.test(button) || !entry || typeof entry.key !== 'string' ||
          !entry.key || entry.key.length > 64 || typeof entry.code !== 'string' ||
          !entry.code || entry.code.length > 64) continue;
      result.mappings[button] = { key: entry.key, code: entry.code,
        ctrlKey: entry.ctrlKey === true, altKey: entry.altKey === true,
        shiftKey: entry.shiftKey === true, metaKey: entry.metaKey === true };
    }
    return result;
  }
  function label(entry) {
    if (!entry) return 'Sin asignar';
    return [entry.ctrlKey && 'Ctrl', entry.altKey && 'Alt', entry.shiftKey && 'Shift',
      entry.metaKey && 'Meta', entry.key === ' ' ? 'Espacio' : entry.key].filter(Boolean).join(' + ');
  }
  function keyCode(entry) {
    const code = entry.code;
    if (/^Key[A-Z]$/.test(code)) return code.charCodeAt(3);
    if (/^Digit[0-9]$/.test(code)) return code.charCodeAt(5);
    if (/^Numpad[0-9]$/.test(code)) return 96 + Number(code.slice(6));
    if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) return 111 + Number(code.slice(1));
    return ({ Backspace: 8, Tab: 9, Enter: 13, NumpadEnter: 13, ShiftLeft: 16,
      ShiftRight: 16, ControlLeft: 17, ControlRight: 17, AltLeft: 18, AltRight: 18,
      Pause: 19, CapsLock: 20, Escape: 27, Space: 32, PageUp: 33, PageDown: 34,
      End: 35, Home: 36, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40,
      PrintScreen: 44, Insert: 45, Delete: 46, MetaLeft: 91, MetaRight: 92,
      ContextMenu: 93, NumpadMultiply: 106, NumpadAdd: 107, NumpadSubtract: 109,
      NumpadDecimal: 110, NumpadDivide: 111, NumLock: 144, ScrollLock: 145,
      Semicolon: 186, Equal: 187, Comma: 188, Minus: 189, Period: 190, Slash: 191,
      Backquote: 192, BracketLeft: 219, Backslash: 220, BracketRight: 221, Quote: 222
    })[code] || 0;
  }
  function eventOptions(entry) {
    const legacy = keyCode(entry);
    return { ...entry, keyCode: legacy, which: legacy,
      location: entry.code.startsWith('Numpad') ? 3 : entry.code.endsWith('Right') &&
        ['ShiftRight', 'ControlRight', 'AltRight', 'MetaRight'].includes(entry.code) ? 2 :
        ['ShiftLeft', 'ControlLeft', 'AltLeft', 'MetaLeft'].includes(entry.code) ? 1 : 0 };
  }
  function gameMode(settings, hostname = '') {
    return settings.mode === 'game' || (settings.mode === 'auto' &&
      (hostname === 'cytos.io' || hostname.endsWith('.cytos.io')));
  }
  root.MouseRemap = { defaults, normalize, label, keyCode, eventOptions, gameMode };
  if (typeof module !== 'undefined') module.exports = root.MouseRemap;
})(globalThis);
