# Mouse Remap para Chrome

Extensión Manifest V3 sin dependencias que asigna los botones izquierdo, central,
derecho, atrás y adelante a una tecla o combinación de teclado en páginas web.
La configuración se guarda localmente. No envía datos a servidores.

Versión 1.0.2: incluye movimiento de foco para Tab y Shift + Tab, aplicación al sitio
activo, códigos `keyCode`/`which` para juegos, asignación rápida Atrás → Tab y una
página de diagnóstico del ratón. Captura pointerdown/mousedown sin duplicar teclas.

## Cytos

Abre `https://cytos.io/?grass`, abre la extensión y pulsa **Configurar Cytos:
Atrás → Tab**. Guarda la asignación, activa el modo juego y aplica los scripts al
documento principal. Cierra el popup y vuelve al juego. El modo automático también
selecciona modo juego en `cytos.io`: envía `key = Tab`, `code = Tab`, `keyCode = 9`
y `which = 9`, sin mover el foco entre formularios. No modifica el cliente del juego.

La lógica de compatibilidad está probada en Chromium con lectores de códigos
numéricos, pero el funcionamiento en Cytos en vivo no se ha podido validar: la red
del entorno bloquea ese dominio. Una página que exija `isTrusted` seguirá rechazando
estas teclas; no se falsea ese atributo.

## Instalar

1. Descarga esta carpeta en tu ordenador.
2. Abre `chrome://extensions` en Google Chrome.
3. Activa **Modo de desarrollador**.
4. Pulsa **Cargar descomprimida** y selecciona la carpeta que contiene `manifest.json`.
5. Recarga las páginas abiertas antes de instalar la extensión.
6. Abre Mouse Remap desde el menú de extensiones, elige un botón y pulsa una tecla.

Para actualizar: reemplaza los archivos en la misma carpeta, pulsa el botón de
recarga de Mouse Remap en `chrome://extensions` y recarga la página donde lo uses.
Para tu botón lateral, asigna **Atrás → Tab** (sin mantener Shift).

## Si no funciona

Abre el popup y pulsa **Asignar Atrás → Tab**. En una página web normal, pulsa
**Aplicar y comprobar este sitio**: la extensión mostrará si está conectada y
los ajustes que el sitio está usando. Chrome puede pedir que concedas acceso al
sitio. Estos botones utilizan `activeTab` y `scripting`; no envían datos fuera
del navegador. La aplicación manual actúa sobre el documento principal; los
iframes reciben la extensión declarada al cargarse la página.

Pulsa **Abrir prueba del ratón** y después **Asignar Atrás → Tab y empezar**.
Pulsa el lateral: verás el número/nombre del botón recibido y la tecla emitida.
El foco debe pasar del primer campo al segundo. Si el botón es «Adelante», asigna
ese botón. Si no se recibe ningún clic, comprueba el controlador de tu ratón.
Si esta prueba funciona y el sitio no, indica la dirección y la acción esperada:
puede exigir eventos físicos o tratar Tab de forma diferente.

Tras actualizar desde una versión antigua, recarga también la página web para
retirar los manejadores de la versión anterior. Una aplicación repetida de la
versión nueva mantiene un único conjunto de manejadores.

Puedes asignar combinaciones como Ctrl + K, eliminar cada asignación con ×,
desactivar el remapeo y conservar o bloquear la acción original del clic.
La tecla se pulsa al presionar el botón y se libera al soltarlo. Perder el foco
o cambiar la configuración libera las teclas pendientes. No hay repetición automática.
Los cambios de configuración se aplican a los documentos donde ya está cargada.

## Alcance real

Chrome permite emitir eventos `keydown` y `keyup` sintéticos hacia el elemento
enfocado o, si no hay uno, hacia el elemento pulsado. Las páginas que escuchan esos
eventos pueden responder; las que exigen `isTrusted` los rechazan. En modo página,
Tab y Shift + Tab
mueven el foco entre controles visibles y habilitados dentro del documento (al llegar
al extremo vuelven al otro extremo). Respetan la cancelación del evento por la página.
No trasladan el foco a la barra de direcciones ni entre documentos de iframes.
Los demás eventos no
escriben texto automáticamente en campos ni ejecutan acciones predeterminadas como
desplazamiento o atajos del navegador. Los códigos heredados `keyCode` y
`which` se incluyen para las teclas estándar reconocidas. Algunos botones reservados por el navegador o el sistema
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
node --check actions.js
```

Para una comprobación manual en Chrome, abre cualquier página web normal, ejecuta
en su consola `document.addEventListener('keydown', e => console.log(e.key, e.code))`,
asigna un botón a una tecla y púlsalo. Comprueba también `keyup`, desactivación y
bloqueo del clic. Las pruebas automatizadas usan un DOM simulado; no sustituyen
la prueba en Chrome con tu ratón y las páginas que quieras controlar.

También hay una prueba de navegador en `tests/browser.test.cjs`. Requiere
Playwright disponible en Node y Chromium instalado (`CHROMIUM_PATH` permite elegir
el ejecutable). Ejecuta `node --test tests/browser.test.cjs`. Comprueba el DOM real
y clics de confianza izquierdo/lateral, Tab, Shift + Tab, cancelación y desactivación.
Simula únicamente el almacenamiento: la política administrativa del navegador del
entorno en la nube impide cargar extensiones descomprimidas en esa prueba.
