# Fuente exterior desde 20 y frontera real de presentación — 2026-11-18

Continúa `2df3b28af`, A6-04.f-R3/e-R3. Un guardado público con REST/WATCH fuera del ancla ya conserva sus datos y puede obtener un cuerpo 20 nuevo. El siguiente21 lo rechazaba porque solo permitía horizonte de reintento para un WALK fallido. Se añade el opt-in nativo de ese origen 20 genuino, reutilizando el 21 y su kernel existentes. **Puente tipado, proyección Game, control/actor/Surface/GPU del nuevo origen siguen pendientes**; no se habilita el productor ni se declara cerrado este recorrido completo.

## Código consolidado y decisión

Se releyó el código real de [DetourCrowd v1.6.0 addAgent/requestMoveTarget](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L511-L627): conserva agente/corredor y separa el alta de una solicitud de objetivo, cuyo estado pendiente todavía no es movimiento ejecutable. El snapshot de la investigación anterior se conserva byte a byte y con hash. Se mantiene esa separación: el cuerpo 20 real aporta residencia/pose, el 21 calcula un programa finito y solo un 22 adquirido puede moverlo. No se copia el ajuste de posición a navmesh de Detour.

No se introduce un planificador, cola de eventos, estado alternativo, caché, mixer ni dependencia. Se amplía el selector de fuente de `stageIdleCycle`; el muestreo, la prioridad reintento-antes-de-fase, RNG, decisión de camino, reservas y movimiento son los mecanismos existentes.

## Contrato nativo

- `nav_idle_cycle_initial_retry_version() === 1` y `nav_idle_cycle_initial_retry_proposal_stage(...)` son la entrada explícita nueva. Exigen un 20 admitido con REST/WATCH y pose realmente exterior al ancla. Las pruebas parten de guardados reales. También admiten el sucesor estacionario de un 21 cuyo origen sigue siendo ese20.
- Se conserva `kind20`, la secuencia de adquisición y los datos privados originales. No aparece una solicitud WALK fallida ni se inventa un origen22/23. El nuevo 21 usa el header 2 existente y el horizonte mínimo entre programa completo y reintento. Coincidencias y horizonte cero conservan la prioridad original.
- La entrada anterior sigue devolviendo `-2` para este origen exterior; el 21 dentro del ancla mantiene header 1. Los WALK fallidos conservan su entrada y comportamiento. Los lectores tipados actuales todavía rechazan header 2 con origen 20 y no seleccionan la entrada nueva: falta ampliar ese contrato antes de activarlo.
- Retiming y commit mantienen fuente/programa y ticket preparado; una propuesta no instala la fase ni mueve el cuerpo. El22 seleccionado y el REST 21 de llegada reutilizan las entradas ya existentes, sin otro propietario.
- Se compilan normalmente ambos módulos con el script canónico y se instalan solo sus tres salidas propias. El worker ajeno se preserva sin cambios.

## Frontera real después de retiming

La regresión GPU existente expuso un fallo anterior del Host: al liberar una mutación retimada, el mínimo de presentación conservaba solo el instante del hold. Una captura instrumentada rechazó `elapsed=29.077867290428156` con `executionEpoch=29.08533750527186`, aunque la edad relativa era cero y el resto de los parámetros eran válidos. La preparación era de 26.905337505271905; la adquisición real ocurrió 2,18 s después. No era un error de redondeo float32 ni motivo para tolerar un reloj inválido.

Se consultó también el código real de [Three r180 AnimationAction._update](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationAction.js#L553-L586): la acción programada no avanza antes de su inicio. Se aplica esa disciplina al guard existente de tiempo, con la frontera nativa certificada, sin crear un reloj ni usar el mixer. `nativeMutationFloor` incorpora ahora `boundary.effectiveTime` **solo después del commit validado**. El guard conserva el techo de la lease: no inventa cobertura ni relaja `nativeIdleCyclePhaseOffset`.

Dos pruebas de puertos/Host con GPU doble reproducen el defecto usando el WASM anterior (20 y21 retimados). Un hook del fixture controla únicamente `absoluteNow`; la publicación, el reloj y las attestaciones son reales. La proyección se coloca 7 ms por detrás de la adquisición: antes, 20 conservaba el mínimo 10 frente a 10.2 y 21 fallaba con el mismo error de fase; con la corrección, ambos submit usan la frontera real y permanecen dentro de `committedThrough`, con edad cero/cuerpo intacto. Pasan tanto con el WASM anterior como con el actual.

## Validación

- **29 pruebas nuevas: 27 de fuente y 2 del mínimo temporal**. Dieciséis cadenas (REST/WATCH × cuatro perfiles × normal/pthread) guardan una fase exterior real, cargan otra autoridad, adquieren20, preparan21, seleccionan22 y llegan al REST 21 original. Mantienen secuencia/fuente20 durante la espera, cuerpo quieto y trabajador independiente en movimiento; solo22 mueve el cuerpo. La semántica JS queda sin proyectar tras los commits ABI y se declara ese límite.
- Reintento cero y coincidencia con REST conservan remaining cero/RNG; destino bloqueado mantiene fase y retry=1 y luego reanuda desde el mismo20. Fin de fase anterior al reintento conserva los sorteos originales y no crea paseo local exterior. Se rechazan fuente no adquirida, actor/sesión/secuencia/ancla ajenos y opt-in interior; retiming conserva el ticket preparado.
- Baseline anterior: **16 fallos esperados por capacidad ausente, 7 filtrados, 0 pases**, además de la sonda REST/WATCH con 20 real y21 `unsupported`. Tras compilación pasan 23; al ampliar llegada y fronteras pasan 27. **817 dirigidas en 45 archivos**, **3.362 de 3.363 seleccionadas en 281 archivos**, una comparación opcional omitida y siete exclusiones históricas. Build **53.86 s**.
- **471 inputs /64 nativos compilados /16 ajenos exactos**. Cambian dos fuentes/script y tres salidas compiladas; los 61 inputs nativos coinciden con ambas compilaciones canónicas. Worker ajeno intacto; sin parche manual de WASM.
- Dieciséis recibos estructurados conservan fuente20, header 2, decisión WALK remaining/RNG y fuente22 de llegada real. No contienen recibos de permisos gráficos del nuevo origen.
- GPU NVIDIA, **solo regresiones existentes**: selección desde WALK fallido **100/68/98/68** preparados y carga fría explícita **100/98**, cero tardíos, actor/geometrías/bancos/picking/adopción/drain conservados. Máximos ventana completa **148.845/160.480 ms**, huecos >50 **3/3**; global **148.845/160.480 ms**, huecos >50 **5/5**. Todas las muestras se conservan. No acreditan el nuevo origen 20 en GPU ni cadencia aceptada.

[Evidencia, investigación, compilación, hashes, pruebas, cadenas nativas y muestras GPU](performance/native-initial-idle-outside-source-validation-20261118.json).

- Fallo GPU y cinco sondas instrumentadas conservados (cuatro pases, una reproducción): proyección **7.470215 ms** anterior a la época real. Dos pruebas deterministas fallan con el WASM anterior antes del fix y pasan con ambos después; edad 0, cuerpo intacto y tiempo dentro de committedThrough. La primera versión del fixture usaba tiempo absoluto no monótono y un helper de avance incorrecto; se corrigió antes de establecer el baseline antiguo.
- **3186 muestras con reloj/frontera**: ninguna se dibuja antes de su frontera real adquirida; se conserva la frontera en cada muestra.
- Captura visual del recorrido seleccionado: máximo ventana **153.505 ms**, 9 huecos >50. Se revisan/persisten sus seis PNG y todas las muestras. No se declara cadencia aceptada.
- Negativo sin plantilla WALK: una coincidencia, 22 rechazado y cuerpo retenido; Host fallido/retirada timeout conservados. No es recuperación aceptada.


## Límites y siguiente punto

Las cadenas del nuevo origen son de ABI nativa con commits de confianza. No son prueba de permisos gráficos, proyección Game posterior al21 nuevo, productor ordinario o aceptación integrada. La fuente guardada procede de un REST/WATCH real de la autoridad anterior; la autoridad nueva adquiere su 20 y no hereda ese permiso anterior. La corrección del mínimo sí se valida en las regresiones GPU existentes, con el fallo original y las sondas conservados.

Siguiente: DTO/puente y Game para el origen 20 exterior, después control/roster/actor/Surface/GPU, conservando padres y remaining reales. Siguen productor/cohort/paradas/relevos ordinarios, cierre/recuperación del Host fallido, recuperación incremental de 3.123 recursos y cadencia/plataforma. No se aceptan tirones ni se atribuye su causa a partir de los intervalos de estas regresiones. A6/A/B/C abiertos; D no iniciado.
