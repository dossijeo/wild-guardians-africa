# REST nativo de WALK bloqueado y horizonte de reintento — 2026-11-18

Continuación de `c67dfdfaf`, dentro de A6-04.f-R3/e-R3. Este incremento completa la fuente y el programa finito nativos del fallo. El puente tipado, Game, control, roster y Surface todavía no adquieren este nuevo origen en producto. A6/A/B/C siguen abiertos; D no se inicia.

## Investigación aplicada

Antes de implementar se examinó [DetourCrowd 1.6, código de `DetourCrowd.cpp`](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L638-L849): `requestMoveTarget` guarda la intención, `updateMoveRequest` procesa resultados y solo instala un corredor validado; un fallo conserva un estado explícito de solicitud. `checkPathValidity` (887–983) usa un plazo de replanificación separado. Se adapta esa separación a los propietarios existentes de Wild Guardians. No se incorpora Detour ni se sustituye navegación, reservas, reloj o admisión.

El plazo de un segundo y el orden reintento/fase proceden de `src/simulation/idle.js`, no de ajustar las mecánicas al motor consultado. No se adapta la reposición de posición ni el corredor parcial de Detour: aquí la pose conservada y el permiso físico exigen una transición explícita.

## Cambio implementado

- `nav_idle_cycle_failed_rest_version() === 1` y entrada explícita `nav_idle_cycle_failed_rest_proposal_stage` seleccionan únicamente una solicitud WALK pendiente, ligada al cuerpo y con camino clasificado como bloqueado. Available/unknown no sirven como prueba de fallo. La entrada antigua no admite este origen.
- La fuente acotada tiene kind **1**: solicitud bloqueada, no una llegada 22/23 ni un cuerpo inicial 20. Conserva actor/cuerpo/sesión/secuencia/nacimiento, pose y semántica de `cancelWalk`. Preparar no consume la solicitud ni cambia Game o su RNG. Commit 21 consume la solicitud y conserva el mismo cuerpo estacionario; no crea ruta, reserva o registro nuevos.
- El encabezado tiene **versión 2**, con las mismas 24 posiciones. `header[23]` es el horizonte físico finito. El resto del programa original se conserva en el estado inicial, el nudo WATCH y su RNG previsto. Dentro del radio se mantiene el programa completo. Fuera, la duración es el mínimo entre el final REST/WATCH y el próximo reintento.
- Al alcanzar un reintento bloqueado se emite la continuación REST/WATCH con el tiempo semántico conservado y retry 1, sin otro `cancelWalk` ni otro sorteo. Los cambios REST/WATCH y el final WATCH conservan sus extracciones originales. El reintento tiene prioridad si coincide con un cambio de fase. El contador debe alcanzar cero exactamente: no toma la tolerancia de 1 ns propia del final de fase.
- Si el camino se repara, se selecciona una solicitud de aproximación al ancla exacta, con el remaining actual y el mismo RNG. `nav_idle_cycle_next_approach` distingue esa intención. Todavía no concede 22: la entrada local antigua devuelve -8 ante esta clase explícita hasta implementar su contrato.
- Si la conectividad es desconocida en el reintento, status -6 no emite nueva secuencia ni consume RNG. El programa/cuerpo se mantienen en su horizonte; la resolución posterior usa la entrada nativa explícita existente.
- El muestreo selecciona fase usando la edad limitada, no el tiempo de una observación posterior al horizonte. Así un REST retenido no cruza el futuro nudo WATCH. El clip terminal continuo de `c67dfdfaf` se conserva; no se extiende el reloj físico.
- La prueba de fallo se vuelve a comprobar al preparar, leer, revalidar y adquirir. Una reparación pendiente retira el candidato; cancelar, preparar tarde o presentar un ticket incorrecto no instala un sorteo ajeno.

La clasificación de camino/endpoint/radio se comparte desde `spatial-idle-stroll-source.h` en el namespace nativo existente, sin duplicar el algoritmo. Se actualiza la lista canónica de exports y se reconstruyen normal y pthread con el script canónico; no se edita WASM manualmente.

## Validación

- **26 pruebas nuevas**, cuatro perfiles normal/pthread, fuentes local/exterior, streams 0/1/ffffffff, sucesiones REST/WATCH, reintentos bloqueados, reparación, coincidencias REST/reintento y WATCH/reintento, época grande, plazo de reintento estricto (cero, sin tomar el umbral de 1 ns de las fases), conectividad desconocida inicial/posterior, cancelación, retiming, ticket, ancla, solicitud y cuerpo eliminados. Se ejecuta `updateIdle` y su navegador original como oráculo en los nudos semánticos; no se atribuye al programa nativo el overshoot de un tick grande concreto.
- **241 dirigidas** en 11 archivos, 0 fallos/omisiones. La selección amplia conserva las siete exclusiones históricas: **3071 pasan de 3072 en 266 archivos**, una comparación opcional omitida, 0 fallos/cancelaciones. No se presenta como toda la suite del repositorio. Build correcto en 45,26 s.
- WASM anterior, usado en solo lectura: **4 fallos esperados,22 casos filtrados**, ningún pase; ausencia de la capacidad nueva. Las primeras sondas conservaron 3 y 18 fallos de adaptadores de prueba (navegador crudo sin clasificación, id de actor de Game, ticket ya retirado y ruta auxiliar no representable en época grande); se corrigieron las sondas usando navegación original y una época representable. No se alteró el guardado real ni se movió su cuerpo para aprobar.
- La revisión posterior añadió dos regresiones de plazo estricto: ambas fallaron con la primera implementación y pasan tras separar `approachRetry===0` del umbral de fase de 1 ns. El recorrido anterior de 24 pruebas / 239 dirigidas / 3069 de 3070 y su captura GPU se conservan en la evidencia; no se presenta aquel binario como el definitivo.
- **440 inputs probados /64 nativos compilados exactos**, nueve archivos nativos cambiados de forma canónica;16 archivos ajenos y el worker pthread no seguido intactos.
- Regresión GPU del recorrido **VÁLIDO** restaurado22→21 anterior, con Surface/puertos/Host y GPU NVIDIA reales: conserva 648 IDs inmutables al adquirir 22 y 649 al adquirir 21;100/98 recursos preparados en una llamada por transición, 0 tardíos y 0 shaders duplicados. Continúan funcionando WATCH, clip terminal, selección, adopción y drain. No ejercita el nuevo origen fallido ni concede autonomía gráfica a sus fixtures ABI.
- Cadencia de esa regresión: ventana de 745 frames, máximo de 66,945 ms y un intervalo >50 ms; global de 1.027 frames, máximo de 83,180 ms y tres intervalos >50 ms. Todos los picos se conservan, sin causa atribuida ni aceptación de cadencia. La captura previa a la corrección del plazo también permanece completa: ventana de 736 frames, máximo de 139,255 ms y cuatro intervalos >50 ms; global de 1.020 frames y siete intervalos >50 ms. No se deduce una mejora comparando estas capturas.

[Evidencia, referencias, selección de pruebas, hashes y salida GPU](performance/native-idle-failed-cycle-validation-20261118.json).

## Límites y siguiente punto

La sonda del guardado real con inicio fraccionario sin conector conserva su pose original y prepara el 21 desde la solicitud fallida. Las pruebas ABI adquieren y ejecutan 21 con un compañero nativo real para el reloj; no representan la admisión gráfica de esa partida.

Los lectores antiguos siguen rechazando encabezado 2/fuente 1 y la aproximación seleccionada; el producto no se habilita solo por existir estos exports. El siguiente incremento debe incorporar la fuente, el horizonte y sus continuaciones al DTO/puente/Game; después, control/roster/Surface/GPU, incluido pasar de la solicitud WALK pendiente al mismo actor residente y la readmisión 22 de la aproximación con remaining conservado. El nudo WATCH del decoder gráfico deberá respetar también la prioridad del reintento cuando coincida con el final REST; los lectores actuales no interpretan encabezado 2. No se simularán 20/22/23 previos.

Productor ordinario, cohort, recuperación incremental de los 3.123 recursos y aceptación de cadencia/plataforma permanecen pendientes. La regresión GPU de una ruta válida ya existente no acreditará la admisión gráfica de este nuevo fallo ni el cierre de esos gates.
