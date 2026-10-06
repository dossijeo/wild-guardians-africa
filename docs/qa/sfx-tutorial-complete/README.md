# SFX 109: tutorial básico completado por entrega

`TutorialCompleted` se emite inmediatamente después de `CrateDelivered` cuando el trabajador completa el ciclo físico y el tutorial pasa de observe/harvest a done. El tutorial omitido no emite este evento. No se añaden misiones, monedas ni acciones de recolección manual.

AudioSystem vincula ese evento al original 109 `ui_objective_complete`, mediante su alias Opus existente. Bus UI, familia tutorial-complete y emisor ui:tutorial; deduplicación de eventos, agrupación y caducidad de 0,5 s. Cambiar de escena, menú/ocultación/error de contexto y descarga tardía impiden reproducir un aviso obsoleto. `remember` conserva el silencio del historial cargado.

## Evidencia

- 39 pruebas dirigidas correctas y 383 ampliadas de audio/tutorial correctas. Cinco culturas con centro/semilla/trabajador pagados: riego manual por trabajador, recogida y entrega antes del único evento. Sin aviso antes de la entrega, al omitir el tutorial o tras completarlo. También bus/familia, historial, ausencia de modificación del dominio, caducidad, ocultación, menú y descarte de escena.
- Revisión final de rutas: catálogo conforme al formato esperado y 126 originales con bytes exactos; cobertura 84 asignados/42 pendientes. El inventario no acredita escucha ni integración de los restantes.
- Siete casos en navegador integrado, AudioContext y descodificación nativos: cinco culturas guiadas y dos casos omitido/completado. Un cue por entrega guiada, cero en los otros; sin replay tras remember, sin errores globales, fuentes liberadas y todos los contextos cerrados. Opus mediante alias runtime, estéreo/48 kHz/2,48 s. Informe native.json y captura native.jpg.
- Build y paquete web correctos; resultado y hashes en logs comprimidos. No se incorpora audio duplicado ni recurso nuevo.

## Reproducción y alcance

`node --test tests/tutorial-complete-audio.test.js`; abrir tests/browser/tutorial-complete-audio.html y pulsar Probar finalización; `node tools/audit_sfx_catalog.mjs --check`; `npm run build`; `npm run test:web-package`.

La navegación de estas pruebas de dominio/audio es plana y sin obstáculos; hay tareas y recorrido completos, pero no demuestra terreno nativo ni animaciones/render 3D. La salida del navegador está silenciada: acredita conexión/descodificación/reproducción técnica, no escucha ni móvil físico. La aceptación de cien noches, todo el catálogo SFX y el plan completo sigue pendiente.

CI posterior: Validate game 37409146771 detectó el derivado Opus desactualizado tras conectar 109. [Regeneración y verificación local documentadas](../sfx-wall-creak/README.md); los resultados dirigidos/nativos anteriores no acreditaban este gate de metadatos.
