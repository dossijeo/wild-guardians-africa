# Origen REST fallido: contrato tipado y proyección de Game — 2026-11-18

Continuación de `2709593cf`, dentro de A6-04.f-R3/e-R3. Se conectan a Game la fuente y el horizonte nativos ya implementados. El control/roster/Surface todavía no admiten gráficamente esta fuente; una solicitud de aproximación seleccionada tampoco recibe 22. A6/A/B/C permanecen abiertos y D no se inicia.

## Investigación aplicada

Se revisó el código de [Godot 4.4, `SceneReplicationInterface::on_sync_receive`](https://github.com/godotengine/godot/blob/4.4-stable/modules/multiplayer/scene_replication_interface.cpp#L804-L844). Antes de aplicar propiedades, comprueba identidad del sincronizador, autoridad del emisor, orden temporal y decodificación del contenido. Se adapta ese orden de validación a los DTO, asociación nativa y Game existentes. No se incorporan red, escenas ni dependencias de Godot.

La solicitud WALK original es necesaria para comprobar destino, tipo local/aproximación, pose y RNG también DESPUÉS de que commit 21 la consuma. Se conserva mediante un `shared_ptr<const NativeIdleStrollResourceRequest>` en el binding 21 existente y se comparte entre sus sucesores. Es una sola solicitud acotada, sin ruta ejecutable ni historia de ciclos; no se crea un registro o propietario paralelo.

## Implementación

- Nueva capacidad `nav_idle_cycle_failed_request_version() === 1` y consulta `nav_idle_cycle_failed_request_snapshot(actor,ticket)`. Reutiliza la fila de 29 valores y el scratch de la solicitud WALK existente; ticket 0 lee el binding actual, y un ticket positivo exige su propuesta 21 vigente. Cancelar o retirar el cuerpo revoca la lectura y limpia el scratch. Normal y pthread se reconstruyen desde la lista canónica de exports.
- `native-idle-stroll-failed-source` es un DTO estricto y congelado con la solicitud original. Se comprueban identidad/época/sesión, nacimiento/secuencia, flags, perfil, pose, ancla y relación original de un sorteo de `cancelWalk`. La fuente nunca se presenta como initial 20 ni como llegada 22/23.
- La referencia de ciclo versión 2 conserva las 24 posiciones del encabezado nativo y expresa su horizonte finito. Solo el nuevo origen emite esta versión ahora. La referencia 1 conserva sus restricciones y el radio local no se amplía. El `sourceRequest` permanece en la fuente acotada; no se copia a Game o al guardado.
- Los sucesores versión 2 distinguen REST/WATCH retenidos, cambio de fase y WALK de aproximación. El plazo de reintento es estricto; una aproximación conserva remaining y RNG actuales, retry 1 y el destino exacto del ancla. No concede movimiento ni recursos. Unknown no genera un sucesor tipado.
- `terminalFacts` solo valida hechos en el horizonte fijo de un DTO recibido. No recibe tiempo de Game, no avanza actores, no consulta caminos, no elige un sucesor y no produce estado para Game. La elección y ejecución siguen en Wild Engine; Game proyecta la fila de ejecución nativa.
- El puente prepara 21 a partir de una solicitud fallida real, comprueba de nuevo la misma fuente durante espera/revalidación y decodifica origen/binding/sucesores desde WASM. La ausencia de la nueva capacidad se rechaza antes de admitir ese origen.
- La primera proyección contrasta el WALK retenido de Game con la solicitud ORIGINAL del binding, y solo entonces cambia el marcador a native-idle, retira destinationId y aplica la fase nativa. Una pose, destino, tipo de WALK, retry o RNG sustituidos no se escriben. Un sucesor pendiente no sustituye la fase actual antes de adquirir su 21.
- El nudo WATCH del decoder existente queda estrictamente más allá del clamp físico f32 cuando un reintento termina REST antes o justo en ese nudo. Así se conserva Idle hasta el relevo nativo, incluso en duración cero; no se extiende el reloj físico ni se cambia el grafo TSL.

## Validación

- **31 pruebas nuevas**: cuatro perfiles en normal/pthread, REST/WATCH retenidos y adquiridos, streams 0/1/ffffffff, reloj Game real sin mover JS, rechazo de mutaciones de origen, cancelación/revalidación tardía, original de la solicitud consultable/revocado, aproximación seleccionada, unknown, época grande, Home diario/de perfil y cosecha ordinaria con/sin conector. El control gráfico actual sigue rechazando una preparación de esta fuente.
- **272 dirigidas en 12 archivos**, cero fallos/omisiones; selección amplia de **3102 pasan de 3103 en 267 archivos**, una comparación opcional omitida y cero fallos/cancelaciones. Se mantienen las siete exclusiones históricas; no se presenta como toda la suite del repositorio. Build correcto en 48,55 s.
- Controles en solo lectura del WASM y del puente/DTO anteriores: cada uno produce **4 fallos esperados y 27 casos filtrados**. Se verifica tanto la necesidad de la capacidad nativa de procedencia como la conexión tipada/Game nueva. La primera batería de 29 conservó un fallo de expectativa de cosecha: la tarea exterior queda sin asignar porque falta conector. Se corrigió esa expectativa, sin mover su cuerpo, y se añadió el relevo local realmente válido.
- **442 inputs probados /64 nativos compilados exactos**, ocho cambios nativos canónicos; 16 archivos ajenos y worker pthread no seguido intactos. La guarda y DTO antiguo conservan sus casos cerrados.
- Los cuatro perfiles comprueban que el nudo f32 mantiene Idle en la coincidencia REST/reintento, mientras Game conserva REST y WATCH solo es intención hasta adquirirlo. Es una prueba del decoder TSL con soporte de altura de fixture, sin renderer ni GPU de la fuente nueva.
- Regresión NVIDIA real de la ruta **VÁLIDA previa 22→21**: conserva 650/651 IDs inmutables, prepara 100/98 recursos en una llamada por transición, cero tardíos y shaders duplicados. WATCH, clip terminal, selección, adopción y drain pasan.
- Cadencia de esa regresión: ventana de 737 frames, máximo de 145,320 ms y cuatro intervalos >50 ms; global de 1.054 frames, máximo de 145,320 ms y siete intervalos >50 ms. Se conservan los picos sin causa atribuida ni aceptación de cadencia.

[Referencias, selección de pruebas, hashes y evidencia GPU](performance/native-idle-failed-cycle-game-validation-20261118.json).

## Límites y siguiente punto

Las pruebas de Game usan el guardado real del WALK y su posición fraccionaria original. Los commits nativos directos de esas pruebas son privilegio del fixture y no un recibo GPU. Los ensayos del decoder TSL verifican la selección de clip con soporte de altura de prueba; no son capturas GPU del nuevo origen. La reparación/unknown del DTO usa el fixture físico mínimo documentado, no se presenta como la geometría Farm de la partida recién cargada.

En el cuerpo exterior sin conector, la cosecha madura se encola sin asignar una ruta ficticia; REST y el cuerpo se conservan. En el caso LOCAL con camino válido se comprueba la asignación ordinaria, TaskStart real sobre el mismo cuerpo y movimiento nativo posterior. La expiración diaria/de perfil produce Home real, sin apropiarse del RNG de Idle.

Siguiente: permitir esta fuente explícita y sus continuaciones REST/WATCH en el control, mantener el mismo actor residente en roster/Surface y verificar el relevo con puertos/Host/GPU. También queda la admisión 22 de la aproximación seleccionada con remaining conservado. La serialización probada aquí contiene solo semántica: NO prueba todavía reanudación del reintento desde un guardado REST/WATCH exterior. Ese caso requiere completar el ciclo desde su cuerpo inicial genuino restaurado antes de habilitarlo en producto; no se resolverá fingiendo un WALK o una llegada anterior.

Productor ordinario, cohort, recuperación incremental de los 3.123 recursos y aceptación de cadencia/plataforma siguen pendientes. La regresión GPU de la ruta válida previa no demuestra admisión gráfica de este nuevo origen ni cierra esos gates.
