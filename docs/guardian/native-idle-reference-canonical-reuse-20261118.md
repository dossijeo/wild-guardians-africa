# Reutilización de referencias Idle ya decodificadas — 2026-11-18

Continuación de `d2acac863` dentro de A6-04.f-R3/e-R3. La traza anterior aisló mensajes de control de 23–36 ms CPU mientras los grafos ya no creaban ni destruían recursos. Se perfila primero esa ruta; no se atribuyen a ella todos los huecos ni se modifica la transacción de autoridad.

## Investigación aplicada y medida inicial

El código real de [V8 TracingCpuProfilerImpl](https://github.com/v8/v8/blob/main/src/profiler/tracing-cpu-profiler.cc) activa perfiles de los isolates con `disabled-by-default-v8.cpu_profiler`; [profile-generator.cc](https://github.com/v8/v8/blob/main/src/profiler/profile-generator.cc) emite Profile/ProfileChunk y documenta acumular `timeDeltas` desde el timestamp de Profile. Se adapta el análisis al formato observado, agrupando por proceso/id de perfil, porque el thread que emite chunks no es el propietario del isolate. No se confunden pesos estadísticos con CPU exacta ni eventos inclusivos se suman como costes independientes.

En el escenario previo a la corrección pasan los 15 ciclos y la retirada. El Host acumula 835,126 ms ponderados dentro de `intentControl.port.onmessage`: 769,328 inclusivos pasan por `admitClockBindings`. En la parte caliente son 694,821 y 646,086 ms respectivamente. Copiar/comparar la referencia repite la decodificación del cuerpo, WALK original, estados y calibración para numerosos bindings que ya contienen datos normalizados. El mensaje de control mayor dura 45,445 ms de pared/43,414 ms CPU con el profiler activo. Esto localiza el trabajo; no demuestra la causa de picos de otras ejecuciones.

Se leyó [Immer v10.1.1 finalize.ts](https://github.com/immerjs/immer/blob/v10.1.1/src/core/finalize.ts#L51-L67), que evita recorrer otra vez estructuras congeladas y conserva el original inalterado; y [common.ts freeze](https://github.com/immerjs/immer/blob/v10.1.1/src/utils/common.ts#L179-L198). Se adapta esa reutilización al decodificador existente con una condición más estricta: solo sus propios resultados pueden tomar el camino rápido. Three r180 [DataMap](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/DataMap.js) usa claves débiles por identidad para datos derivados; se utiliza esa vida ligada al objeto, sin añadir Immer, Three adicional ni otro propietario de actor.

## Cambio y límites

- `copyNativeIdleCycleReference` reconoce por identidad exclusivamente sus propias salidas profundamente congeladas. Solo ellas pueden devolverse directamente. Un WeakMap privado del decodificador conserva su pertenencia y, cuando se compara, la serialización normalizada inmutable. Las claves débiles no retienen por sí mismas programas ni crean una cola, registro de actores o autoridad.
- No se memorizan entradas externas mutables. Cada copia llegada por transporte, objeto congelado ajeno o clon estructurado recorre las validaciones originales. Cambiar un clon después de una primera decodificación vuelve a validarse y puede rechazarse. Se conserva el formato serializado.
- Igualdad reutiliza únicamente la representación del resultado validado; un mismo objeto inválido continúa siendo desigual a sí mismo. No se acepta una marca pública ni basta `Object.isFrozen`.
- El cambio cubre validez estructural de datos. La asociación actual, evento, época, reloj, permiso de plantilla, instalación, retirada y horizonte físico se comprueban en sus propietarios originales. Una referencia canónica sigue siendo legible después de retirar el cuerpo, pero ya no prepara ni ejecuta ese cuerpo.

## Validación

- Baseline con el módulo anterior: cuatro perfiles fallan en identidad de copia (cuatro casos filtrados). Pasan **8 casos nuevos**, **378 dirigidos en 20 archivos** y **3.192 de 3.193 seleccionados en 272 archivos**: una comparación opcional omitida y siete exclusiones históricas; no es todo el repositorio. Build **47,33 s**. Se verifican las 453 entradas finales y se conservan 64 recursos nativos/16 archivos ajenos y el worker pthread exactos; sin rebuild WASM.
- Las pruebas cubren DTO genuino v1 desde initial20, v2 desde WALK fallido en cuatro perfiles, árbol congelado/detachment, revalidación de clones mutados y objetos congelados ajenos, propiedades desordenadas y campos inválidos. Las referencias decodificadas no preparan ni ejecutan un cuerpo después de retirarlo.
- Muestreo del mismo escenario: control caliente **694.821→274.259 ms ponderados**; mensaje de control máximo **43.414→18.756 ms CPU**. Son sesiones separadas con profiler; los pesos no son duraciones CPU exactas, las pilas inclusivas se solapan y no se presentan como aceptación global.
- Timing y visual NVIDIA pasan **15 adquisiciones cada uno**, 100+68 recursos de calentamiento y **13 sucesores sin creaciones/destrucciones**, fase REST/WATCH/picking/drain. IDs inmutables iniciales retenidos: 648/648. Error máximo de continuidad: 1.19209375e-07 s. Negativo caliente sin plantilla rechaza el tercer 21 y conserva el segundo instalado; el error deliberado reaparece en cleanup, sin afirmar drain positivo. Regresión válida 22→21 pasa: 100/98 recursos preparados, cero tardíos y 648/649 IDs iniciales; ventana máxima 97,510 ms (dos huecos >50), global 172,160 ms (seis).

| Captura sin profiler | Frames ventana | Máximo ms | Ventana >50ms | Global >50ms |
|---|---:|---:|---:|---:|
| Timing | 794 | 67.050 | 2 | 6 |
| Visual | 810 | 63.360 | 4 | 7 |

Con profiler, la ventana pasa de 118,280 ms/25 huecos >50 a 54,650 ms/7; los máximos globales son 176,690 y 190,900 ms respectivamente y los huecos globales 30 y 9. El pico global final de 190,900 ms se conserva. Se conservan todas las muestras y los picos, incluidos los de capturas con profiler, en la [evidencia](performance/native-idle-reference-canonical-reuse-validation-20261118.json). No se atribuyen los máximos globales restantes a esta ruta. Se revisaron las capturas [REST](performance/native-idle-reference-canonical-reuse-failed-cycle-0-rest-20261118.png) y [WATCH](performance/native-idle-reference-canonical-reuse-failed-cycle-14-watch-20261118.png). La autoridad del fixture está en página; Host/Surface/puertos/GPU son reales. No demuestra productor/cohort ordinario ni recuperación integral.


## Siguiente punto

Se reduce el trabajo estructural de la ruta aislada. El nuevo muestreo todavía concentra 195,371 ms inclusivos en igualdad de referencias y 149,115 ms propios en el decodificador durante control caliente; el siguiente punto es contrastar las comparaciones contra relojes de otras familias/referencias ausentes, antes de elegir otra corrección, y correlacionar callbacks/guardas con los huecos restantes. Estas cifras ponderadas no son CPU exacta. No se cierran cadencia ni plataforma.

A6/A/B/C siguen abiertos; D no se inicia. Recuperación integral de 3.123 recursos, productor/cohort, aproximación 22 remaining, REST/WATCH exterior guardado y plataforma conservan sus pendientes. Esta corrección de trabajo repetido en el relevo no declara aceptación global de cadencia.
