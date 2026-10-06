# SFX 099 — una magia termina la recarga

Se asigna `spirit_power_charge` a la transición observada de cooldown positivo a cero de una magia desbloqueada. El plan permite preparación/disponibilidad; no añade una fase de carga ni altera duración, recarga, gasto o simulación. Varios poderes listos en el mismo frame producen una única voz de UI, sin posición espacial ficticia.

El observador se conecta al seguimiento existente de magias. Cargar/reemplazar un snapshot, rebobinar, mantener el mismo tiempo simulado, observar poderes bloqueados o disponibilidad inicial no reproduce el sonido. Pausas, derrota, stop, suspend, recast y solicitudes que tarden más de 0,5 s invalidan voces obsoletas. Las solicitudes tardías no dejan voces tras el cierre.

## Evidencia

- 113 pruebas de audio correctas: incluido Crecimiento con cooldown nativo de 90 s, sin aviso al acabar su efecto de 30 s, agrupación, ausencia de mutación, historia/recarga, cierres y descargas tardías.
- [Prueba de navegador](../../../tests/browser/power-ready-audio.html) con Web Audio real a 44,1/48 kHz. En cada frecuencia hay una sola voz agrupada, por bus UI, Opus de 3 s/estéreo, sin loop y playbackRate 1. Carga/repetición/stop no añaden voces. Contextos cerrados y cero voces activas; consola vacía. [Captura](native.png) y [resultados](native.json).
- Build correcto (9,62 s) y paquete web verificado: 587 archivos, 859 enlaces relativos y 20 GLB runtime. Persiste el aviso de bundle superior a 500 kB.
- Catálogo auditado: 89 asignados y 37 pendientes/reservados. Regenerados los metadatos de rutas Opus; los 126 audios conservan hashes y exportaciones correctas. No se recomprime ni modifica ningún audio en esta asignación.

La prueba nativa se silencia deliberadamente: no acredita escucha, móvil físico ni percepción junto a música/VFX/HUD durante toda una partida. Una conexión que no entregue el audio a tiempo omite el aviso obsoleto; sigue pendiente medir ese inicio en red fría. El barrido completo del catálogo permanece abierto.
