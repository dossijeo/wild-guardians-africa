# Protección QA de avance y recálculo — V4

Candidato aislado sobre main 9c62d7f3; no cambia producción. Parte de V3
(refinado de pendientes a1cm) y añade protección de llegada en los tramos
clasificados como riesgo. Mantiene originales, velocidad, radio, destino,
restricciones de terreno y movimiento físico. **No se promueve por coste CPU.**

## Diseño experimental

Un WeakMap por actor reutiliza la clasificación de un prefijo de hasta4m,
conservando identidad de navegador, versión, ruta, waypoint, coordenadas,
radio e ignore. El chequeo grueso nativo clasifica riesgo si falla o si su
pendiente observada es>=0,46. Solo entonces se consulta terrainValid para la
llegada de cada avance. DynamicClear mantiene prioridad.

Si esa llegada no es transitable, se bloquea el avance antes de mover, se
registra el punto lógico en el actor (máximo8), se descarta la ruta y se
recalcula al siguiente tick. Una vista de planificación con cachés separadas
rechaza conectores que pasen a menos de0,00001m del punto confirmado inválido.
No cambia obstáculos del mundo, no amplía el radio corporal ni relaja terreno.
La vista se reconstruye por consulta en esta versión: falta evitar búsquedas
fallidas repetidas conservando cachés propias por actor/estado/geométría.

Para retornos inicialmente inválidos se conserva el caso de recuperación
marginal ya implementado: solo fleeing/returning/incapacitated, pendiente
<=0,51 que no empeore y barrido nativo de props/edificios/puertas/fluidos.
No se permite esa excepción a un trabajador walking ni a tareas ordinarias.
La excepción de agua del Gran Cañón sigue en Navigation. No es aceptación
general de todos los márgenes de fluidos o discontinuidades: el clasificador
coarse puede omitir otra franja estrecha si no observa riesgo.

## Evidencia funcional acotada

- Mismo conector nativo fallido de V3: bloquea una llegada, recalcula y alcanza
  el destino en70 pasos dt=0,01. Todas las posiciones observadas son válidas,
  cada paso respeta la velocidad calibrada; no teletransporta ni solo espera.
- Finca histórica Sabana/Musgum,112 contrataciones pagadas,100 ticks: dos
  entradas de válido a inválido en referencia de producción, cero en V4.
-900 ticks ordinarios:27 trabajadores inicialmente inválidos salen en tick1
  y llegan a casa como máximo en tick684. El estado final coincide con V3.
- Guardado de la finca después de10 ticks:40 pares de estados completos
  serializados iguales tras cargar con Navigation nueva/fría.
- Guardado específicamente tras rechazar el conector (tick7): el punto de
  desvío persiste,63 pasos posteriores alcanzan el destino. Estados completos
  iguales entre continuidad y carga en cada paso. En esta prueba un trabajador
  construido se añade al snapshot completo; el resto de actores y reloj están
  congelados. No se presenta como partida completa.

El primer runner de calidad tenía un conflicto de nombres de importación.
Se corrigió y ejecutó de nuevo, exit0. No fue fallo de gameplay ni una prueba
superada hasta su nueva ejecución; el recibo distingue esa primera tentativa.

## Coste medido con trabajo idéntico

ABBA de100 ticks por brazo,25warmup/75medidos. Referencia es V3 con Game
original; candidato V4 con su Game guardado. **Los400 estados serializados
coinciden entre todos los brazos**, por lo que esta muestra sí aísla coste
adicional de clasificación/guard sin cambiar las trayectorias. Serialización
fuera del timing; cuatro campañas CPU vivas, ventana coordinada sin Blender.
No GPU, renderer, móvil ni una medición sobre escenas de igual carga universal.

| Brazo | Mediana CPU ms |
|---|---:|
| V3 A |4,2813|
| V4 B |5,7419|
| V4 B |5,2926|
| V3 A |3,5814|

Medianas combinadas:3,9123→5,6344ms, aproximadamente+44%. Cada brazo V4
clasifica1043 prefijos y protege660 llegadas, sin rechazos en esta finca.
Planning mantiene11427 consultas,551hits,295 tramos refinados,36707 muestras
y103 rechazos, igual en todos los brazos. No atribuir individualmente todo
el incremento a la clasificación sin una prueba que la aísle.

Hashes de Game/navegador/guard medidos coinciden con los artefactos archivados.
sourceHashes.navigation del runner es la fuente de producción, no la clase
referencia usada; sourceHashes.v3 identifica exactamente esa referencia.

## Decisión y siguiente paso

La mejora funcional no justifica este coste. Mantener fuera de producción y
reutilizar clasificación de riesgo ya calculada por planning para evitar
barridos redundantes de terreno/props. Revisar cachés por actor/versión,
límites, fallos de recálculo, cambios de destino, guardados y fluidos.
Las seis pruebas de biomas archivadas para V3 **no acreditan V4**; todavía
faltan dinámicas entre actores, cultivos/tareas y terreno del resto de biomas.

Verificar integridad/resultados: `node docs/qa/worker-risk-guard/verify.mjs`.
Gzip conserva fuentes y runners exactos; para reproducir, restituir las rutas
.cache del recibo y el candidato V3 del archivo anterior. Usan el guardado y
perfil originales del repositorio. No se publica a itch.io.
