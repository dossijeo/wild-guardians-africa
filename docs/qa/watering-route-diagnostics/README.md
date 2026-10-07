# Observabilidad de tareas de riego, sin modificar su ejecución

Fuentes de producción de main `772586c6`, 7 de octubre de 2026. Este cambio
añade herramientas y pruebas QA; no cambia el runtime, la navegación, el alcance
de la regadera, los tiempos, las posiciones ni los resultados de tareas.

`tools/watering-route-diagnostics.mjs` añade contadores externos a los puntos
existentes de `canWaterFrom` y `wateringRoute`. Utiliza el algoritmo escrito en
`src/world/work-points.js`, con anclas únicas que fallan si cambia el código.
No duplica la fórmula de aproximación ni añade muestras de terreno. Separa
rechazos de alcance horizontal/altura, destino no transitable, ruta fallida y
aproximación encontrada. Los contadores de alcance también incluyen llamadas
directas al completar una acción; no son exclusivamente reservas FIFO.

El ejecutor genera módulos temporales bajo el directorio del informe, sustituye
solo la importación de work-points del Game observado y compara **todo el estado
serializado después de cada tick** con Game original. Envuelve Navigation solo
en el brazo observado para contar consultas, búsquedas, fallos y reutilización
de fallos exactos. No mide rendimiento: esos contadores tienen coste adicional.

## Evidencia

- 24/24 pruebas dirigidas: ocho controles del observador, riego físico de los
  cuatro perfiles, meseta nativa inaccesible y reservas de tareas. Los controles
  verifican llamadas/argumentos/resultados idénticos, fallbacks, altura frente a
  distancia, ausencia de muestras extra y reparación sin instrumentar.
- Gran Cañón / Mapungubwe, checkpoint histórico de día 11: 13 mujeres mayores
  contratadas con dinero real, 100 ticks de 0,1 s. Estado completo idéntico en
  cada paso. Dos rutas de riego encontradas; 26 consultas y 13 búsquedas totales,
  sin fallos. Termina con 148 plantas vivas y ninguna tarea bloqueada.
- Gran Río / Mapungubwe, continuación histórica tras victoria: 47 mujeres
  mayores pagadas, 300 ticks de 0,1 s. Estado completo idéntico en cada paso;
  82 rutas de riego encontradas, 239 consultas y 192 búsquedas totales, sin
  fallos. Termina con 516 plantas vivas y ninguna tarea bloqueada.

El recorrido de Gran Río usa la primera versión del observador, antes de añadir
los subcontadores de distancia y altura y los hashes del ejecutor. Sus módulos
observados exactos se conservan comprimidos, con hashes que coinciden con el
informe; no se atribuyen los subcontadores nuevos a esa ejecución. Gran Cañón
usa la versión final de la herramienta. Ambos informes incluyen hashes de las
fuentes de producción y de los módulos efectivamente utilizados.

```powershell
node --test tests/watering-route-diagnostics.test.js tests/watering-approach.test.js tests/task-reservations.test.js
node tools/check_watering_route_diagnostics.mjs docs/qa/intensive-canyon-10/state.json .cache/watering-diagnostics/replay/report.json 100
```

Usar directorios de salida diferentes para ejecuciones simultáneas: los módulos
temporales contienen contadores mutables propios de cada proceso. El ejecutor
acepta snapshots JSON o gzip y hasta 3000 ticks; solo contrata automáticamente
si la partida está en contratación y puede pagar ese personal. Para una victoria
guardada llama al comando ordinario de continuar postgame. No fuerza planes,
guardas, saldos, contratación gratuita ni crecimiento.

## Límites y siguiente comprobación

Estos checkpoints **no reproducen** la cola bloqueada de la campaña viva de
Gran Cañón en el día 76. Tampoco prueban cien noches actuales, rendimiento GPU,
FPS ni comportamiento móvil. Las campañas CPU y la suite del subagente de
impostores estuvieron concurrentes; no se publican tiempos de benchmark.

Una tarea marcada como bloqueada no demuestra que el terreno sea inaccesible;
una ruta A* nula también puede reflejar límites de búsqueda. Mantener esta
distinción al analizar los futuros checkpoints. Las campañas originales no se
reiniciaron ni se instrumentaron mientras estaban en ejecución. Falta observar
un estado representativo del atasco antes de decidir una corrección del runtime.
