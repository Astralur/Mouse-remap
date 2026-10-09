(() => {
  let settings;
  let capture = null;
  let busy = false;
  const names = ['Izquierdo', 'Central', 'Derecho', 'Atrás', 'Adelante'];
  const status = document.getElementById('status');
  const enabled = document.getElementById('enabled');
  const block = document.getElementById('block');
  const mode = document.getElementById('mode');
  const diagnostic = document.getElementById('diagnostic');
  async function inspectTab(inject = false) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No hay un sitio activo.');
      if (inject) await chrome.scripting.executeScript({ target: { tabId: tab.id },
        files: ['mapping.js', 'actions.js', 'content.js'] });
      const results = await chrome.scripting.executeScript({ target: { tabId: tab.id },
        func: () => globalThis.MouseRemapController?.status() || null });
      const state = results[0]?.result;
      if (!state) {
        diagnostic.textContent = 'La extensión no está cargada en este sitio. Pulsa Aplicar o recarga la página.';
        return;
      }
      const last = state.lastButton === null ? 'Todavía no se ha recibido un clic.'
        : `Último botón: ${names[state.lastButton] || state.lastButton}. Tecla: ${state.lastKey || 'sin asignar'}.`;
      diagnostic.textContent = `Conectada · v${state.version} · ${!state.loaded ? 'cargando' : state.enabled ? 'activa' : 'desactivada'} · modo ${state.gameMode ? 'juego' : 'página'}. Atrás: ${state.mappings['3'] || 'sin asignar'}. ${last}`;
    } catch {
      diagnostic.textContent = 'Chrome no permite acceder a este sitio o falta permiso. Comprueba el acceso de la extensión al sitio. Abre una página http/https normal o la prueba del ratón.';
    }
  }
  function render() {
    enabled.checked = settings.enabled;
    block.checked = settings.block;
    mode.value = settings.mode;
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
    document.querySelectorAll('button, input, select').forEach(el => { el.disabled = busy; });
  }
  async function save(next) {
    busy = true; render();
    try {
      await chrome.storage.local.set({ settings: next }); settings = next;
      status.textContent = 'Guardado. Se aplica a las páginas abiertas.';
      return true;
    } catch { status.textContent = 'No se pudo guardar. Inténtalo de nuevo.'; return false; }
    finally { busy = false; render(); }
  }
  enabled.addEventListener('change', () => save({ ...settings, enabled: enabled.checked }));
  block.addEventListener('change', () => save({ ...settings, block: block.checked }));
  mode.addEventListener('change', () => save({ ...settings, mode: mode.value }));
  document.getElementById('reset').addEventListener('click', () => {
    capture = null; save({ ...settings, mappings: {} });
  });
  document.getElementById('quick-tab').addEventListener('click', () => {
    capture = null;
    const next = MouseRemap.normalize(settings);
    next.enabled = true; next.block = true;
    next.mappings['3'] = { key: 'Tab', code: 'Tab' };
    save(next);
  });
  document.getElementById('apply').addEventListener('click', () => inspectTab(true));
  document.getElementById('cytos-tab').addEventListener('click', async () => {
    capture = null;
    const next = MouseRemap.normalize(settings);
    next.enabled = true; next.block = true; next.mode = 'game';
    next.mappings['3'] = { key: 'Tab', code: 'Tab' };
    if (await save(next)) await inspectTab(true);
  });
  document.getElementById('test-page').addEventListener('click', () =>
    chrome.tabs.create({ url: chrome.runtime.getURL('test.html') }));
  window.addEventListener('keydown', event => {
    if (capture === null || busy) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (['Control', 'Shift', 'Alt', 'Meta', 'Dead', 'Unidentified'].includes(event.key) || !event.code) return;
    const next = MouseRemap.normalize(settings);
    next.mappings[capture] = { key: event.key, code: event.code, ctrlKey: event.ctrlKey,
      altKey: event.altKey, shiftKey: event.shiftKey, metaKey: event.metaKey };
    capture = null; save(next);
  }, true);
  document.querySelectorAll('button, input, select').forEach(el => { el.disabled = true; });
  chrome.storage.local.get('settings').then(data => {
    settings = MouseRemap.normalize(data.settings); render(); inspectTab();
  }).catch(() => { status.textContent = 'No se pudo cargar la configuración. Cierra y abre la extensión.'; });
})();
