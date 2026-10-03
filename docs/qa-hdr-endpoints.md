# HDR en los extremos de día y noche

Publicado `eda20d3`: `environment4` puede devolver directamente la muestra diurna
cuando `uNight == 0`, o la nocturna más el relleno original cuando `uNight == 1`.
La rama uniforme permite evitar la lectura del entorno no utilizado en el código
fuente; no es un recuento de instrucciones o lecturas GPU compiladas.
Para cualquier otro valor conserva la fórmula original sin clamp adicional.

El switch compartido funciona en objetos, suelo Standard/Basic, agua, lava,
edificios DEST y escombros. El shader recibido y los exports extraídos siguen
intactos: la adaptación ocurre al componer los materiales del mundo. UV, giro,
rugosidad ×7, radiancia ×4, relleno nocturno, paleta y transiciones se conservan.
El diorama del menú sigue independiente. El control `HDR extremos sí / no (QA)`
restaura las dos lecturas sin recompilar, clonar texturas o invalidar sombras.

## Evidencia

[Suite completa](qa/hdr-endpoints/tests.txt): 640/640, ninguna omitida.
[Dirigidas](qa/hdr-endpoints/targeted.txt): 29/29. Verifican receta recuperable
exactamente al retirar el guard, fallo ante cambios desconocidos, uniformes vivos
y rutas Standard, Basic, fluido, DEST y debris. La suite completa también verifica
que los materiales de las cinco casas comparten el mismo switch.
[Build y paquete](qa/hdr-endpoints/build.txt): 554 archivos, 379,668,666 bytes,
794 enlaces relativos y 20 GLB runtime sin duplicados originales.

Navegador: Gran Río/Mapungubwe/712, charca del asset, media, 1600 × 900 internos,
viewport 1280 × 720, Intel UHD/ANGLE. Orden A–B–B–A, misma cámara y estado parado,
30 frames de calentamiento más 180 consultas GPU válidas por muestra.

| Muestra | Atajo | GPU media (ms) | CPU media (ms) |
| --- | --- | --- | --- |
| [A1](qa/hdr-endpoints/on1.json) | Sí | 22.97 | 13.03 |
| [B1](qa/hdr-endpoints/off1.json) | No | 23.43 | 12.49 |
| [B2](qa/hdr-endpoints/off2.json) | No | 23.63 | 13.15 |
| [A2](qa/hdr-endpoints/on2.json) | Sí | 22.11 | 11.71 |

Todas mantienen 72 calls, 677,321 triángulos/frame, estado lógico sin cambios,
visibilidad de pestaña y cero errores. La caché mantiene 210 hits por ensayo salvo
el calentamiento de A1 (una regeneración, 209 hits). Las medias combinadas GPU
son 22.54 frente a 23.53 ms en esta escena; la diferencia es pequeña y la suite
Node corrió simultáneamente. No se promete una mejora de FPS ni extrapolación a
otros dispositivos o escenas.

Comparación RGB excluyendo controles/informe: 825,600 píxeles por vista.
[Día activado](qa/hdr-endpoints/day-on.png) y [original](qa/hdr-endpoints/day-off.png):
cero diferencias. [Noche activada](qa/hdr-endpoints/night-on.png) y
[original](qa/hdr-endpoints/night-off.png): cero diferencias.
[Transición al 50 % activada](qa/hdr-endpoints/dusk-on.png) y
[original](qa/hdr-endpoints/dusk-off.png): 60 píxeles distintos, máximo 7/255.
Se conserva ese resultado sin atribuir su causa ni afirmar identidad global.

Comprobación adicional de compilación real con cultivos/defensas, edificio con
daño y escombros, cuatro trabajadores, cinco bestias y suelo Basic en muy baja;
estado final y consola se guardan junto a las capturas. No acredita la matriz
visual completa de 30 combinaciones, móvil ni la aceptación completa del plan.
