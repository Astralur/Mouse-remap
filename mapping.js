(function (root) {
  const defaults = { enabled: true, block: true, mappings: {} };
  function normalize(value) {
    const result = { ...defaults, mappings: {} };
    if (!value || typeof value !== 'object') return result;
    result.enabled = value.enabled !== false;
    result.block = value.block !== false;
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
  root.MouseRemap = { defaults, normalize, label };
  if (typeof module !== 'undefined') module.exports = root.MouseRemap;
})(globalThis);
