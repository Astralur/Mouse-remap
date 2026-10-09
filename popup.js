(() => {
  let settings;
  let capture = null;
  let busy = false;
  const names = ['Izquierdo', 'Central', 'Derecho', 'Atrás', 'Adelante'];
  const status = document.getElementById('status');
  const enabled = document.getElementById('enabled');
  const block = document.getElementById('block');
  function render() {
    enabled.checked = settings.enabled;
    block.checked = settings.block;
    const rows = document.getElementById('mappings');
    rows.replaceChildren();
    names.forEach((name, button) => {
      const row = document.createElement('div'); row.className = 'row';
      const text = document.createElement('span'); text.textContent = name;
      const assign = document.createElement('button'); assign.className = 'capture';
      assign.textContent = capture === button ? 'Pulsa una tecla…' : MouseRemap.label(settings.mappings[button]);
      assign.addEventListener('click', () => {
        capture = button; render(); status.textContent = 'Pulsa una tecla. Los modificadores pueden combinarse.';
      });
      const clear = document.createElement('button'); clear.textContent = '×';
      clear.setAttribute('aria-label', `Eliminar asignación de ${name}`);
      clear.addEventListener('click', () => {
        const next = MouseRemap.normalize(settings); delete next.mappings[button]; capture = null; save(next);
      });
      row.append(text, assign, clear); rows.append(row);
    });
    document.querySelectorAll('button, input').forEach(el => { el.disabled = busy; });
  }
  async function save(next) {
    busy = true; render();
    try {
      await chrome.storage.local.set({ settings: next }); settings = next;
      status.textContent = 'Guardado. Se aplica a las páginas abiertas.';
    } catch { status.textContent = 'No se pudo guardar. Inténtalo de nuevo.'; }
    finally { busy = false; render(); }
  }
  enabled.addEventListener('change', () => save({ ...settings, enabled: enabled.checked }));
  block.addEventListener('change', () => save({ ...settings, block: block.checked }));
  document.getElementById('reset').addEventListener('click', () => {
    capture = null; save({ ...settings, mappings: {} });
  });
  window.addEventListener('keydown', event => {
    if (capture === null || busy) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (['Control', 'Shift', 'Alt', 'Meta', 'Dead', 'Unidentified'].includes(event.key) || !event.code) return;
    const next = MouseRemap.normalize(settings);
    next.mappings[capture] = { key: event.key, code: event.code, ctrlKey: event.ctrlKey,
      altKey: event.altKey, shiftKey: event.shiftKey, metaKey: event.metaKey };
    capture = null; save(next);
  }, true);
  document.querySelectorAll('button, input').forEach(el => { el.disabled = true; });
  chrome.storage.local.get('settings').then(data => {
    settings = MouseRemap.normalize(data.settings); render();
  }).catch(() => { status.textContent = 'No se pudo cargar la configuración. Cierra y abre la extensión.'; });
})();
