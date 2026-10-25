# Matas arqueadas: recorrido real de terreno

Prueba del candidato `grass-biomes` sobre la iluminacion global conservada, sin integrar nuevos shaders. Matas Blender cerradas de 240 triangulos, una malla instanciada con capacidad 192, sin planos cruzados. Sabana, Gran Rio y Gran Canon; seed 712, calidad media, vegetacion lejana desactivada, dia 1, horas 150/350.

## Recorrido y verificaciones

Cada fase recorre 288 m de ida y 288 m de vuelta en seis tramos de 96 m, a 16 m/s; la camara sigue la altura del terreno. Son desplazamientos rapidos de camara, no velocidad de unidades. La simulacion esta pausada y el reloj de materiales fijo. Se esperan las cargas en cada parada. Inicio, extremo y regreso tienen capturas con matas ocultas/visibles en la misma pagina y pose: 36 PNG. No se cambian entidades ni reglas.

`traversal.json` conserva muestras GPU/CPU, transiciones, origen de render y bloques residentes. `summary.json` verifica las seis vueltas: candidatas y camara identicas al inicio/regreso, bloques de matas iguales a los de terreno, capacidad <=192, escala de aparicion entre 0 y 1, poblacion y hora constantes, sin errores. La firma SHA256 procede de las coordenadas y semillas de todas las candidatas, ordenadas; no solo de su cantidad. La seleccion visible tiene histeresis y puede variar con la direccion de llegada aunque las candidatas sean identicas.

Se atraviesan cambios de origen del render. La primera vuelta carga recursos adicionales y reemplaza otros; la segunda mantiene al regreso los mismos contadores de texturas/geometrias que al inicio. Esto no demuestra ausencia de fugas en sesiones prolongadas. Esta ronda no vuelve a crear edificios ni audita todas las huellas durante el trayecto; la ocupacion inicial y eventos sinteticos tienen evidencia anterior, pero la interaccion real de construccion sigue pendiente antes de integrar.

## Evidencia

- [Sabana inicio con matas](sabana-day-0-grass.png) / [sin matas](sabana-day-0-base.png).
- [Rio a 288 m con matas](gran-rio-day-3-grass.png) / [sin matas](gran-rio-day-3-base.png).
- [Canon a 288 m con matas](gran-canon-day-3-grass.png) / [sin matas](gran-canon-day-3-base.png).
- [Regreso nocturno en Canon](gran-canon-night-6-grass.png).

Los seis videos de `motion/` se graban aparte: 96 m en unos seis segundos, con carga real y cambios de origen. La codificacion no participa en las mediciones GPU del recorrido. `motion/motion.json` documenta las transiciones y errores de esa grabacion. No se debe deducir fluidez en otros equipos de un video codificado a 30 fps.

## Coste

La tabla inferior mide **todo el renderer durante movimiento y streaming**, con las matas visibles. No es coste incremental de hierba ni una comparacion A/B. Se incluyen frames de carga, sin eliminar los picos. GPU mediante queries, CPU mediante envoltura del render; no equivalen al tiempo completo entre frames. No hay eventos de disjoint en esta ronda.

## Reproduccion

Servidor local 5190. Ejecutar `node tools/experiments/check-campaign-grass-traversal.mjs` y luego `python tools/experiments/summarize-grass-traversal.py docs/qa/global-visual-lab/grass-traversal`. Grabar por separado con `node tools/experiments/record-campaign-grass-traversal.mjs`. Los scripts admiten WG_GRASS_STUDY, WG_GRASS_BIOMES y WG_GRASS_OUTPUT.

La evidencia favorece conservar el candidato para validacion adicional: hay aporte de cobertura fuera del poblado y la distribucion sobrevive al streaming. No aprobar aun la integracion ni la calidad global. Faltan construccion real durante recorrido, controles de calidad baja/alta y presupuesto acumulado; Manglares conserva su descarte previo, y Volcanes/Desierto requieren su propio recorrido.

| Bioma | Fase | GPU total media / p95 (ms) |
|---|---|---:|
| gran-canon | day | 17.93 / 23.39 |
| gran-canon | night | 18.83 / 24.57 |
| gran-rio | day | 15.36 / 19.14 |
| gran-rio | night | 16.04 / 20.23 |
| sabana | day | 21.77 / 28.34 |
| sabana | night | 21.98 / 28.13 |

## ABBA adicional en paisaje

24 bloques, 30 frames de calentamiento y 180 muestras por bloque. Misma camara +50/+30 m, dia/noche, comparacion de visibilidad en la misma pagina; assets y seleccion siguen residentes en ambos estados. No incluye el coste de eliminar el sistema ni su carga inicial. Archivos en `landscape-abba/`.

| Bioma | Fase | Matas | GPU incremental (ms) |
|---|---|---:|---:|
| sabana | day | 192 | +0.474 |
| sabana | night | 192 | +0.045 |
| gran-rio | day | 192 | +0.557 |
| gran-rio | night | 192 | -0.480 |
| gran-canon | day | 182 | +0.733 |
| gran-canon | night | 182 | +0.383 |

No interpretar diferencias negativas como aceleracion. El Canon pasa de 21 matas en el viejo benchmark de aldea a 182 en esta vista y llega a 192 durante recorrido. La evidencia previa de coste no cubria esa densidad.

Los videos estan verificados con ffprobe (dimensiones, codec, duracion y tamano en `motion/probe.json`). Se inspeccionaron hojas de contacto de Sabana diurna y Canon nocturno: no aparecen franjas de terreno sin cargar; esta inspeccion espaciada no demuestra ausencia de pequenos saltos entre frames. La noche del Canon mantiene matas verdes que merecen revisar frente a su paleta seca antes de promover el perfil.

**Decision tras ABBA:** conservar el candidato como fuente de forma/distribucion, pero no promover su presupuesto de 192 instancias. Probar un limite visible menor, especialmente en Canon, y comprobar que no destruya cobertura o produzca reemplazos mas evidentes. La medicion de paisaje invalida usar el antiguo caso de 21 matas como justificacion general de coste.
