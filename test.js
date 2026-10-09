(() => {
  const names = ['Izquierdo', 'Central', 'Derecho', 'Atrás', 'Adelante'];
  const setup = document.getElementById('setup');
  document.getElementById('configure').addEventListener('click', async () => {
    try {
      const { settings } = await chrome.storage.local.get('settings');
      const next = MouseRemap.normalize(settings);
      next.enabled = true; next.block = true; next.mode = 'auto';
      next.mappings['3'] = { key: 'Tab', code: 'Tab' };
      await chrome.storage.local.set({ settings: next });
      setup.textContent = 'Guardado: Atrás → Tab. Pulsa ahora tu botón lateral.';
      document.getElementById('first').focus();
    } catch { setup.textContent = 'Error al guardar. Recarga la extensión y esta página.'; }
  });
  window.addEventListener('MouseRemapDiagnostic', event => {
    const { button, key, enabled, loaded } = event.detail;
    document.getElementById('mouse').textContent = `Botón recibido: ${names[button] || button}. Asignación: ${key || 'ninguna'}. ${!loaded ? 'Cargando ajustes.' : enabled ? 'Remapeo activo.' : 'Remapeo desactivado.'}`;
  });
  document.addEventListener('keydown', event => {
    document.getElementById('keyboard').textContent = `Tecla emitida: ${event.key} (${event.code}).`;
  });
})();
