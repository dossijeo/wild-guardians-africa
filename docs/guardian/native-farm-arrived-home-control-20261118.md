# Control Farm23 terminada → Home19/18

Continúa la [fuente nativa](native-farm-arrived-home-source-20261118.md) del [plan integrado](integrated-gpu-migration-plan-20261104.md). El controlador aplica la revocación terminal de Farm23 con Home19, conserva el permiso finito de sus datos residentes y admite18 sobre el mismo cuerpo. Se reutiliza la retención ya existente para Task; no hay parada24 ni historia Idle ficticia. Actor/roster/Surface/GPU del nuevo relevo siguen pendientes. A6/A/B/C abiertos; D no iniciado.

## Código real consultado y adaptación

Se reconsulta [`RawId::zip/unzip` e `Id<T>` de wgpu26.0.1](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/id.rs#L42) y [`LifetimeTracker::triage_submissions`](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/life.rs#L296). La identidad incluye índice/época y su contexto; la residencia de los datos se conserva hasta la retirada correcta, separada del fin de una ejecución. Se adapta el registro revocado y la prueba instalada actuales. No se añade dependencia, propietario, registro, timer, fence o evaluador de trayectorias/poses.

## Transición y permiso

La entrada nueva exige `RouteInvalidated`6, el handle23 exacto, Home19 sin Task ni otra familia y tiempo posterior al final REAL de Farm. Actor, cuerpo, perfil, flags, radio y posición coinciden con la referencia Farm emitida y su destino nativo. Sesión, época, secuencia y tiempo del request coinciden con el evento. Los valores de yaw/fases no se recalculan a partir de la distancia: la fuente nativa los conserva y la asociación18 deberá coincidir con el request completo.

La rama común Task/Home conserva el registro revocado, pone `safeUntil` en el final real y mantiene únicamente la prueba Farm ya instalada. La lease exige request actual, ascendencia exacta y watermark del reloj. Conserva época y `executionEnd` finitos, también cuando la referencia GPU original fue preparada antes de una adquisición tardía. La ruta genérica revocada no vuelve a ser ejecutable.

Una declaración nativa sin instalación gráfica puede preparar Home nueva para su cuerpo, pero no obtiene permiso para dibujar los datos Farm antiguos ni para instalarlos retrospectivamente. La adquisición18 cierra la lease23. Sólo la asociación Home instalada habilita el recurso nuevo; retiro, removal y dispose también cierran el permiso anterior.

El registro de la asignación18 conserva la ascendencia Farm. Instalar Home exige su cuerpo y el request19 completo, incluso en `bootstrap`. Esa excepción de inicialización no puede cambiar el cuerpo ni reemplazar los valores de un request conocido. Si se altera yaw/fase del evento de declaración, los datos Farm conservados siguen siendo los nativos anteriores y la propuesta/asociación18 real no puede adoptarse con ese request alterado. No se concede una trayectoria a partir de ese metadato.

## Evidencia

Pasan23 casos nuevos: cuatro perfiles standalone/pthread y llegada con viaje o ya dentro del radio; cuerpo/registro/época/final finitos, reloj pendiente, espera1.8s, revalidación/cancelación, adquisición e instalación18, fuente sin residencia, metadatos incompatibles, cierre por retiro/removal/dispose y adquisición tardía del Farm original. Pasan56 dirigidos con las regresiones Task y Farm24→Home.

Los dos controles negativos de sólo lectura fallan una vez, con22 casos filtrados y cero cancelaciones. Cargar el controlador de `e580b0991` deja la secuencia en4 frente al request nativo5; quitar sólo la comprobación de ascendencia al instalar Home permite indebidamente `bootstrap` con otro cuerpo. Ninguno modifica el módulo de producto.

La regresión amplia pasa2680 de2681 casos en249 archivos, con cero fallos/cancelaciones y una omisión opcional; dura404.182s. Build de producción pasa en1m39s. Los408 inputs congelados coinciden y los64 inputs/artefactos nativos siguen idénticos a `e580b0991`; este cambio no reconstruye WASM.

Los tests usan WASM standalone/pthread y el log/reloj nativos reales, con instalación de pruebas de confianza. No acreditan un paquete retenido, recibo de admisión, drain gráfico ni hardware del nuevo Home. No se atribuye a este controlador la evidencia GPU de `e580b0991`, que corresponde al controlador anterior y al relevo Task.

La sonda del siguiente tramo conserva una adquisición del modelo original, obtiene la propuesta Home nativa y reproduce `Native motion has no matching source worker` al preparar su variante en el roster. Ese consumidor debe reconocer el extremo completo sin fabricar24. Quedan también Surface/puertos/hardware del relevo, final Idle, productor/cohort y recuperación incremental integral de3.123 recursos. La aceptación global de cadencia/plataforma y los siete fallos históricos fuera de selección conservan su alcance; no se declara ausencia de tirones ni se cierra ningún padre A6/A/B/C.

Los [resultados y hashes](performance/native-farm-arrived-home-control-validation-20261118.json) separan fuente real de instalaciones simuladas. Se mantienen los16 archivos locales ajenos, el worker pthread sin seguimiento y los bytes anteriores de los cuatro documentos principales.
