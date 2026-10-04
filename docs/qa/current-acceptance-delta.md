# Alcance de aceptación tras las revisiones del 4 de octubre

Runtime inspeccionado: `e87dc25`. El registro original de 159 casos conserva su revisión base `44f5c7b`, las notas históricas y los límites de cada ensayo. Sus 156 estados verified y tres partial no equivalen a aceptación completa de todas las revisiones posteriores. Todos los archivos de evidencia enlazados existen; comprobar su existencia no acredita su contenido ni su vigencia.

## Reglas actuales y alcance comprobado

- Inicio con 1500 monedas, reserva salarial de 100 y cosecha automática mediante tareas FIFO, con recogida y entrega físicas obligatorias. El recorrido renderizado anterior está delimitado en `tutorial-action-first-day.json` y `player-revisions-2026-10-04.md`.
- La información del tutorial no pausa; las manos accionables 2D/3D sí pausan el reloj, con interfaz disponible. Completar, cerrar explícitamente o saltar libera la pausa correspondiente. `tutorial-action-pause.test.js` cubre selección intermedia, otros motivos de pausa y recarga. Los overrides de QA-003, QA-005 y QA-125 ahora distinguen reloj e interfaz.
- Completar una acción avanza inmediatamente su lectura. `tutorial-action-completion.md` delimita una cadena pagada con navegación plana de prueba y regresiones de recarga. No acredita una nueva ejecución visual móvil.
- La explicación de defensas refleja si el ataque ya ocurrió y desaparece en la finca liberada. `tutorial-defense-timing.test.js` incluye recarga y traducción completa EN/ES; no acredita su presentación en pantalla.
- Las optimizaciones de asignación, estanques, altura y entradas de A* preservaron el hash de todos los estados del diagnóstico integrado. Sus informes delimitan timings de CPU y escenarios con crédito/daño QA explícitos. No prueban FPS de teléfono físico.

## Requisitos pendientes de aceptación completa

| Requisito | Evidencia disponible y límite | Pendiente |
| --- | --- | --- |
| QA-014: ocultar pestaña y recuperar sin salto | Razones de pausa probadas; el navegador integrado anterior no cambió document.hidden | Transición real de visibilidad y recuperación |
| QA-155: agricultores, animales y varios colapsos con audio/VFX | Dominio pagado, una estructura preparada y mezclas parciales; pestaña 223 sin resultado legible | Escena integrada completa, varios colapsos, mezcla y escucha |
| QA-156: Gameplay A/B | Transportes originales y cruces técnicos silenciados; diez stems por pack | Continuidad perceptual y alternancia en campaña renderizada |
| Móvil tras todas las revisiones | Primer día guiado anterior y pruebas de dominio/UI | Recorrido visual actualizado de manos, contratación, incursión, amanecer, murallas y magia; teléfono físico |
| Rendimiento y memoria web/móvil | CPU local, GPU histórico y recursos originales | Frametime actual, picos de incursión y memoria de música activa en dispositivo |
| Aceptación integral del plan y cambios posteriores | Casos originales y pruebas incrementales con alcances distintos | Contrastar los requisitos con evidencia vigente y suficiente; no sustituirlo por el conteo de tests |

Las lecturas de las pestañas de audio y móvil agotan el plazo antes de ejecutar la consulta. Sus metadatos siguen presentes; no se ha declarado finalizada ni reiniciado ninguna prueba por esos timeouts. El bloqueo de observación no demuestra un fallo del juego. El objetivo completo permanece abierto.
