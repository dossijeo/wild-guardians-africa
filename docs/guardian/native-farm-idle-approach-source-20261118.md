# Fuente nativa de aproximación Idle desde Farm

Continúa el [relevo Farm → Idle estacionario](native-farm-arrived-idle-cycle-surface-20261118.md) y el [plan integrado](integrated-gpu-migration-plan-20261104.md). Si la llegada real23 queda fuera del ancla Idle original, el puente puede preparar y adquirir una aproximación22 hacia esa ancla sobre el mismo cuerpo. No fabrica20/21/24 ni una tarea. Este incremento completa fuente, propuesta/asociación nativa y proyección Game de esa caminata; faltan su admisión gráfica/controlador, roster y Surface/GPU. A6/A/B/C siguen abiertos; D no iniciado.

## Código consultado y decisión

Se revisa el código real de [`dtCrowd::requestMoveTarget` de Detour1.6](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L607) y el procesamiento de peticiones: conservar el destino, distinguir petición de corredor ejecutable y reutilizar el corredor anterior cuando procede. Se adapta el programa22, slots, reservas, fases, revalidación y asociación existentes; no se añade otro propietario, registro, timer, dependencia o algoritmo de navegación.

La referencia principal de comportamiento sigue siendo `updateIdle`: la aproximación puede comenzar fuera del radio, apunta al ancla y nunca corre. El paseo aleatorio conserva su restricción local. La excepción se liga a `sourceFarm`, descriptor acotado de la llegada23 realmente instalada, con cuerpo/pose/perfiles/flags/centro/secuencia/final REAL y estado de nacimiento original. No se permite convertir una declaración fría de WALK en el historial de una Farm viva ni retener una cadena recursiva de permisos.

## Propuesta, ejecución y retorno a REST

`nav_idle_stroll_farm_proposal_stage` lee el extremo nativo23 terminado y el nacimiento original `createIdleState`; prepara el camino hacia el ancla con el planificador existente. La propuesta no mueve el cuerpo, consume RNG ni cambia `arriving`. Cancelar conserva Farm. Revalidar contrasta la misma asociación y semántica y traslada únicamente el tiempo del programa compatible. Una ruta no disponible o un destino ocupado no adquieren movimiento.

La adquisición real22 emite un único `RouteReplaced`, estado1, que revoca el handle Farm anterior y transporta la asociación de paseo nueva. Game cambia entonces a `native-idle-stroll`, con destino igual al ID del ancla, RNG original, descanso restante conservado y `approachRetry=1` decreciente durante la caminata. Sólo avanza la fase Walk; Run y su presupuesto se conservan. El cuerpo puede entrar en el radio sin terminar todavía la aproximación.

La llegada produce el blueprint REST original de `cancelWalk`, con una sola extracción del RNG privado. El programa estacionario21 siguiente consume la fuente22 realmente llegada, mantiene el cuerpo y adquiere ese descanso; no reconstruye un Idle inicial. La parada explícita conserva procedencia y destino y permite Home sobre el mismo cuerpo. Cambiar pose/perfil/centro/contrato o persona durante la preparación impide revalidar el candidato anterior.

La validación de estado vivo distingue la aproximación del paseo aleatorio. El cargador frío existente de paseo sigue cerrado para aproximaciones, incluso cuando el cuerpo ya está dentro del radio: su declaración actual no transporta el descanso conservado ni el ID de destino del ancla. Restauración de aproximaciones y política nativa de reintento/avance de REST cuando no existe camino siguen pendientes; no se sustituyen por un paseo aleatorio ni se declara completa la política Idle.

## Validación y alcance

Pasan las29 pruebas nuevas y93 dirigidas en4 archivos. La regresión de254 archivos termina con2841/2842 aprobadas, cero fallos/cancelaciones y una comparación opcional omitida. Build correcto en1m 30s; sintaxis de6 módulos correcta. Los419 inputs probados y64 inputs/artefactos nativos permanecen idénticos al congelado final; seis inputs/artefactos nativos cambian respecto a d09477e67 tras reconstruir standalone/pthread con las opciones canónicas. Cuatro controles negativos fallan exactamente una vez, con28 casos filtrados y cero cancelaciones.

Las pruebas usan cuerpo/planificador/reservas y ejecución WASM reales, en standalone y pthread para los cuatro perfiles, con ABI de adquisición de confianza. No equivalen a recibos GPU de la nueva aproximación. Comparan destino, RNG, descanso/reintento y blueprint de llegada con `idle.js`; cubren adquisición tardía Farm/22, cancelación, bloqueo físico, falta de ruta, eliminación del cuerpo, datos falsificados, tick Game, parada y Home. Los controles negativos de sólo lectura ejercitan código/WASM anteriores, igualdad del cuerpo y la separación de restauración.

Se conserva la evidencia de desarrollo: un fallo real al consultar la procedencia después de una parada llevó a leer la misma asociación retenida; otro mostró que el validador ampliado podía aceptar una aproximación como WALK restaurado. Ambos tienen pruebas que fallan antes de la corrección. La primera regresión amplia se detuvo explícitamente al detectar el segundo caso; su log no cuenta como aceptación. También se conservan los errores corregidos de las sondas (orden de propuestas, origen separado de waypoints y oracle con paso cero).

Regresión GPU del relevo estacionario ANTERIOR23→21 sobre los módulos actuales: conserva650 IDs inmutables, prepara98 recursos y cero después de READY; bloques de54/54/150 dibujos, selección/adopción5/drain correctos. Ventana completa: máximo33.8999ms y0 intervalos>50ms; global: máximo142.0251ms y8>50ms. No acredita la nueva aproximación22 ni acepta cadencia global; Home264/147ms sigue abierto.

Se preservan16 archivos ajenos, el worker pthread sin seguimiento y los bytes anteriores de los cuatro documentos principales. Los [resultados y hashes](performance/native-farm-idle-approach-source-validation-20261118.json) delimitan la evidencia. Siguen control/admisión/actor/Surface de la aproximación, restauración y reintentos nativos, productor/cohort, recuperación incremental integral de3.123 recursos y aceptación global de cadencia/plataforma.
