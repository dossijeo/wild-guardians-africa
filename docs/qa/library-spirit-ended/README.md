# Biblioteca integrada y voz hasta ended — 2026-10-09

Implementación en `codex/library-spirit-ended`, aislada del checkout raíz. QA nativa sobre base f8bc34b5; sincronizada después con main 3832e40d, que sólo añade documentación/evidencia de otras tareas. No cambió el runtime probado.

Los cuatro labs sustituyen el catálogo por una pantalla dedicada, con cabecera del juego, vuelta a Biblioteca, menú principal y selector ES/EN. El contenido original conserva sus scripts, controles y renderers. Al salir se descarga el iframe. La cabecera y el espacio de contenido respetan orientación y safe areas.

El controller conserva la identidad y texto de la lectura mientras la voz vigente carga o reproduce. Una acción real puede completarse sin retirar esa lectura ni inventar la siguiente acción. El callback ended actúa sobre el mensaje capturado; timers no sustituyen ended mientras hay voz. Manual skip/cierre detiene la voz. Errores, autoplay bloqueado y volumen cero conservan fallback textual, avance/manual y sus timers normales; el motivo de fallo queda registrado. closeAfter usa ended real o su fallback temporal.

## Evidencia nativa

[Revisión exacta de raíz](root-native-review.md) describe tabs 868–871, capturas y reportes exportados con CUA Browser 2. Un contexto a la vez; tabs cerradas y viewport restablecido. Cuatro cargas y vueltas; Cultivos Muestra 8, Destrucción daño 50%, Sonidos filtro 1/126 y reproducción/parada de Pájaros. Portrait EN 390×844 y landscape asentado 844×390. No se verificaron todos los controles de los labs ni los 126 audios.

Spanish centro: un clip, acción real conservada, ended 55315 y siguiente clip 55330; sin plantas creadas automáticamente. English: misma retención sin reinicio hasta 15.14/16.24 s, seguido de cierre manual; esa captura no prueba ended natural EN completo. El primer ensayo 869 sí tuvo ended natural EN pero incluye el reinicio artificial de la fixture que se corrigió antes de 870. El historial de la fixture también llama `ended` al avance manual: no confundirlo con `voice.status=ended` real.

`library-crops-landscape-868.png` es evidencia negativa de captura prematura tras resize; aceptación landscape es 871. `spirit-fixture-negative-869.json` registra el reset artificial de clave en el botón QA (el runtime nunca lo tenía). La fixture corregida y receipt se congelaron antes de repetir. Fallo intencionado missing.ogg dio media-error sin bloquear salida manual. Inicial autoplay EN sin gesto dio fallback, no reproducción exitosa.

## Verificación separada

- 96/96 pruebas dirigidas de controller, voice, closeAfter, lifecycle, acciones/pausas/manos, raid/reminders, copy, i18n y rutas web.
- Syntax de módulos nuevos/principales y git diff --check PASS.
- `npm run build` PASS (7.42 s), aviso habitual chunk >500 kB.
- `npm run test:web-package` PASS: 702 archivos, 403023747 bytes, 859 enlaces relativos; 54 voces coinciden byte/hash con manifest, recursos runtime presentes.
- `python tools/package_itch.py` PASS: ZIP local 353065641 bytes y CRC verificado. Sin publicación.

Los logs de pruebas/build/package están junto a esta nota. No se midió rendimiento ni memoria física, no hubo prueba de dispositivo móvil físico/Tauri ni recorrido completo de campaña. No acredita estabilidad global.
