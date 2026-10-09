# Mouse Remap para Chrome

Extensión Manifest V3 sin dependencias que asigna los botones izquierdo, central,
derecho, atrás y adelante a una tecla o combinación de teclado en páginas web.
La configuración se guarda localmente. No envía datos a servidores.

## Instalar

1. Descarga esta carpeta en tu ordenador.
2. Abre `chrome://extensions` en Google Chrome.
3. Activa **Modo de desarrollador**.
4. Pulsa **Cargar descomprimida** y selecciona la carpeta que contiene `manifest.json`.
5. Recarga las páginas abiertas antes de instalar la extensión.
6. Abre Mouse Remap desde el menú de extensiones, elige un botón y pulsa una tecla.

Puedes asignar combinaciones como Ctrl + K, eliminar cada asignación con ×,
desactivar el remapeo y conservar o bloquear la acción original del clic.
La tecla se pulsa al presionar el botón y se libera al soltarlo. Perder el foco
o cambiar la configuración libera las teclas pendientes. No hay repetición automática.
Los cambios de configuración se aplican a los documentos donde ya está cargada.

## Alcance real

Chrome permite emitir eventos `keydown` y `keyup` sintéticos hacia el elemento
enfocado o, si no hay uno, hacia el elemento pulsado. Las páginas que escuchan esos
eventos pueden responder; las que exigen `isTrusted` los rechazan. Los eventos no
escriben texto automáticamente en campos ni ejecutan acciones predeterminadas como
Tab, desplazamiento o atajos del navegador. Los códigos heredados `keyCode` y
`which` no se emulan. Algunos botones reservados por el navegador o el sistema
pueden no llegar al documento.

No funciona fuera de Chrome, en su interfaz, páginas `chrome://`, Chrome Web Store
ni otros documentos protegidos. No captura la rueda. El remapeo global y las
pulsaciones de teclado reales requieren una aplicación nativa y permisos del sistema.

## Validar

Desde esta carpeta, con Node.js 18 o posterior:

```sh
node --test tests/remap.test.cjs
node --check content.js
node --check popup.js
node --check mapping.js
```

Para una comprobación manual en Chrome, abre cualquier página web normal, ejecuta
en su consola `document.addEventListener('keydown', e => console.log(e.key, e.code))`,
asigna un botón a una tecla y púlsalo. Comprueba también `keyup`, desactivación y
bloqueo del clic. Las pruebas automatizadas usan un DOM simulado; no sustituyen
la prueba en Chrome con tu ratón y las páginas que quieras controlar.
