# Filtrado de familias de reloj antes de comparar Idle — 2026-11-18

Continuación de `92be45d0e`, A6-04.f-R3/e-R3. El muestreo previo aún concentraba trabajo en el comparador de referencias. Se mide el motivo antes de cambiar el código.

## Investigación y diagnóstico

Una variante de auditoría sirve únicamente dos módulos instrumentados: cuenta comparaciones/resultados/excepciones en el decodificador y añade el contador a la inspección del Host. No cambia el repositorio para medir ni sustituye autoridad, fuente, RNG o permisos. Cada reemplazo se comprueba exactamente una vez por respuesta; se sirven tres instancias del módulo de DTO (página/preparador/Host) y una del Host. Se usa solo el contador del isolate Host.

En el último snapshot de los 15 relevos hay **51.717 comparaciones, 30.976 referencias ausentes y 30.976 excepciones**; ninguna referencia presente de kind ajeno. En cada snapshot el número de ausencias coincide con las excepciones. El filtro de reloj físico recorre relojes relativos de otros actores/familias y pasaba su `nativeIdleCycle` ausente al comparador, que construía/capturaba TypeError como resultado negativo normal. La ejecución funcional, los 13 relevos calientes sin crear/destruir recursos y la retirada pasan con esos contadores. La instrumentación no es aceptación de cadencia.

Se consultó el código instalado de **Three r180**, [Bindings._update](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Bindings.js#L214-L243): selecciona por familia (`isNodeUniformsGroup`, `isStorageBuffer`, `isUniformBuffer`) antes de invocar las actualizaciones específicas. Se adapta esa discriminación al predicado existente, sin dependencia, registro, protocolo ni propietario nuevos.

## Cambio

Los tres predicados que encuentran el reloj físico para Idle21, Stroll22 y Farm23 comprueban primero la presencia de `nativeIdleCycle`, `nativeStroll` o `nativeFarmArrival`, respectivamente. Un reloj relativo de otra familia no llega al comparador específico. Para los que sí lo tienen se conservan la comparación tipada exacta y los requisitos de `resourceEnd` (ausente en Idle21, fin del decoder terminal en Stroll22/Farm23); la fase sigue exigiendo su reloj físico nativo, fuente actual y control/instalación reales. No se modifica el decodificador, el helper de igualdad ni ningún permiso nativo.

## Validación

- El módulo anterior produce once fallos esperados y cuatro pases de compatibilidad, sin casos filtrados. Fallan los positivos Idle/Farm y los tres rechazos de reloj ausente; los positivos Stroll ya encontraban el reloj válido antes del genérico. Pasan **15 nuevas**, **393 dirigidas en 21 archivos** y **3.207 de 3.208 seleccionadas en 273 archivos**: una comparación opcional omitida y siete exclusiones históricas; no representa todo el repositorio. Build **45,57 s**. Se verifican 454 entradas finales, 64 recursos nativos/16 archivos ajenos y worker pthread exactos; no se recompila WASM.
- Las pruebas usan kernel y puertos/Host reales con GPU simulada: cubren el reloj genérico antes del nativo en los positivos Idle/Farm, el orden contrario en Stroll y la ausencia del decoder correcto en las tres familias; verifican reloj/picking y cuerpo/RNG en los casos pertinentes, y observan que no se construyan errores de esquema al descartarlo. Un reloj genérico no sustituye al reloj físico nativo ausente: se rechaza antes de adquirir y no cambia Game ni su solicitud.
- La captura instrumentada final mantiene **cero comparaciones ausentes y cero excepciones** en todos los snapshots; último snapshot **20.741 comparaciones**. Se conservan las 11.721 coincidencias y las 9.020 comparaciones negativas reales: el total baja exactamente de 51.717 a 20.741 al retirar las 30.976 ausentes. La captura anterior conserva sus 30.976 excepciones; no se borra ni se usa la instrumentación como aceptación de cadencia.
- Muestreo: control caliente **274.259→224.287 ms ponderados**, mensaje máximo **18.756→17.825 ms CPU**. Sesiones separadas con profiler; pesos no son CPU exacta ni las pilas inclusivas sumables. Sus ventanas máximas son 54.650/66.650 ms y globales 190.900/215.660 ms; todos los picos se conservan.
- Timing/visual NVIDIA pasan 15 adquisiciones cada uno: 100+68 objetos de calentamiento, 13 sucesores sin creación/destrucción, cero tardíos/duplicados, 648/648 IDs inmutables iniciales, fase REST/WATCH/picking/drain. Error máximo de continuidad 1.4782011e-07 s. Negativo caliente sin plantilla rechaza el tercer 21 y conserva el segundo; cleanup también reporta el rechazo deliberado, sin afirmar drain positivo. Regresión válida 22→21 pasa con 100/98 recursos preparados y cero tardíos; máximo de ventana 48.125 ms/global 145.875 ms.

La regresión adicional **Farm23→aproximación 22→REST21** también pasa con Surface/Host/GPU reales: 102/70/98 recursos preparados, cero tardíos, fase/picking/retirada conservados. Ventana de 1.302 frames, máximo 144,160 ms y cuatro huecos >50; global de 1.584 frames, mismo máximo y seis huecos >50. No se atribuyen sus picos al filtro ni se declara aceptación.

| Captura sin instrumentación/profiler | Frames ventana | Máximo ventana ms | Ventana >50ms | Máximo global ms | Global >50ms |
|---|---:|---:|---:|---:|---:|
| Timing | 789 | 48.395 | 0 | 64.725 | 3 |
| Visual | 809 | 50.440 | 1 | 73.160 | 4 |

[Evidencia y muestras completas](performance/native-idle-clock-family-filter-validation-20261118.json). Revisadas las imágenes [REST](performance/native-idle-clock-family-filter-failed-cycle-0-rest-20261118.png) y [WATCH](performance/native-idle-clock-family-filter-failed-cycle-14-watch-20261118.png). Son Surface/puertos/Host/GPU reales con autoridad QA en página; no demuestran productor/cohort ordinarios, recuperación integral o aceptación de plataforma/cadencia.


## Siguiente punto y alcance

La comprobación del reloj físico conserva su contrato y ya no usa excepciones para descartar relojes ajenos. Continúa el contrato pendiente de aproximación 22 seleccionada con remaining: stageIdleStroll aún devuelve -8 y el ABI semántico 22 actual reconstruye remaining en la llegada. La decisión nativa ya guarda el valor/RNG reales. Se revisó código de DetourCrowd 1.6.0 para conservar la solicitud seleccionada separada del camino derivado; no se adaptan corredores parciales ni se sustituye autoridad/nav/reservas. La próxima implementación debe ampliar el propietario 22 existente y su ABI/DTO/admisión, conservando el 21 exacto como predecesor, sin inventar 20/23 ni una solicitud fría. Esta revisión es de solo lectura y no concede 22. La clasificación de picos restantes y aceptación integrada permanecen abiertas.

A6/A/B/C y la aceptación de cadencia/plataforma siguen abiertos; D no iniciado. Continúan aproximación 22 con remaining, REST/WATCH exterior guardado desde cuerpo inicial genuino, productor/cohort y recuperación incremental integral de 3.123 recursos. Una mejora de este predicado no acredita el cierre de esos contratos.
