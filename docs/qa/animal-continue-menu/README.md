# Continuar desde el menú real con reservas pendientes

Validación de `3c66847` mediante `tests/browser/mobile-first-day.html?resume-reserves=1&biome=gran-canon`. El fixture ejecuta la aplicación real y separa IndexedDB con el sufijo `-qa-mobile-first-day`; no modifica las partidas normales. Seed 712, Mapungubwe, calidad muy baja, escritorio 1280 × 720.

El guardado paga un centro y cuatro brotes. Su plan nocturno controlado contiene veinte animales, cuatro por especie, y está pausado a una décima de segundo de la llegada. Es una prueba de carga, no una composición introductoria natural ni una prueba de incursión en movimiento.

Se pulsó Continuar en el menú nativo y se seleccionó `qa-resume-reserves`. Después se pulsó Volver en el HUD, se guardó mediante «Guardar y volver al menú» y se volvió a cargar la misma ranura desde Continuar.

## Resultados

- Ambas cargas terminan con veinte rigs reservados y preparación GPU completa.
- Los dos tránsitos mantienen cubierta la carga y ocultan el HUD hasta estar listos.
- El foco inicial, el obtenido con Volver y el de la segunda carga coinciden exactamente en posición y objetivo; véanse los tres informes `camera-*`.
- Las trece imágenes del HUD tienen dimensiones válidas y están cargadas. Esto no verifica los retratos del panel de contratación.
- El mundo anterior pierde su contexto gráfico, desconecta su canvas, termina su worker y no vuelve a renderizar. Los 439 recursos de geometría observados emiten disposición y no quedan listeners vivos en su canvas.
- Los informes de aplicación y la consola no registran errores.

`summary.json` reúne las comprobaciones sobre los informes originales. `loading.png` muestra la segunda carga; `ready-before-home.png` y `ready-reloaded.png` muestran los dos mundos listos.

La instrumentación retiene referencias a mundos anteriores. Los eventos de disposición no miden bytes de RAM/VRAM y los contadores de materiales pueden incluir disposiciones repetidas. No se acredita rendimiento de móvil físico ni ausencia absoluta de tirones. La aparición del grupo restaurado mediante el reloj se prueba por separado en [animal-saved-reserves](../animal-saved-reserves/README.md); queda pendiente restaurar una incursión ya activa.
