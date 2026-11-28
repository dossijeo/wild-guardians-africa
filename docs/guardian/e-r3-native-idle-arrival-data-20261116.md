# Idle: fuente actual tipada y relevo del paseo al descanso

Continuación de [la fuente nativa posterior al paseo](e-r3-native-idle-arrival-source-20261116.md), dentro del trabajo abierto de A6. Se integran sus datos en el adaptador, control, transactor y puertos existentes, con proyección de la fase real en Game. El consumidor original roster/Surface/GPU de este origen todavía falta; A6/A/B/C siguen abiertos.

## Implementaciones consultadas y decisión

Antes del diseño se leyó código real de Rapier v0.22.0: [identidad por índice/generación y posición actual/siguiente](https://github.com/dimforge/rapier/blob/v0.22.0/src/dynamics/rigid_body_components.rs), y [`RigidBody::copy_from`](https://github.com/dimforge/rapier/blob/v0.22.0/src/dynamics/rigid_body.rs), que conserva los identificadores internos y los propietarios de colliders al copiar estado. Se adapta la separación entre identidad residente, valores ejecutados y valores solicitados: se usan cuerpo, sesión y secuencia nativos existentes y la pose efectivamente ejecutada. Se mantiene también la separación de agente/objetivo/corredor contrastada en Detour en el incremento anterior. No se incorpora otra biblioteca ni propietario de cuerpos.

## Datos y captura nativa

La unión de fuentes conserva íntegra la atestación inicial20. Su alternativa `native-idle-stroll-arrival-source` contiene valores acotados de sesión/época, actor/cuerpo, secuencia22, tiempo del extremo, perfiles/centro, pose/fases y REST inicial deseado. No contiene referencias a permisos anteriores, ruta, historial ni árbol de ciclos. La validación de forma no concede movimiento ni dibujo.

La captura de21 lee los 26 valores de la fuente C++ real y comprueba su coincidencia con el header de 24. Las asociaciones actuales y revalidadas conservan el origen preparado exacto. La enumeración usa ahora los actores de ciclo nativos, incluyendo cuerpos movidos; ya no depende de que exista un cuerpo inicial20. Las siguientes decisiones WALK y su referencia22 usan esa pose actual sin recuperar la pose inicial de la partida.

El preparador sólo admite el extremo22 cuando Game refleja el WALK real, su pose, destino, ancla, RNG privado y watermark. Consultar o revalidar conserva esa fase. Otro contrato, pose, intención privada o tiempo no puede adquirir el descanso.

## Control y adquisición existentes

El primer ciclo después del paseo llega como `RouteCompleted`, revocando su handle real. El control exige el paseo anterior **admitido**, la misma sesión/época/cuerpo/asignación, extremo y estado REST derivados de esa fuente, orden y reloj correctos. No convierte esa transición en `IntentChanged` ni fabrica una fuente20. Las renovaciones21 mantienen su transición estacionaria anterior.

La preparación de recursos sigue separada de la adquisición y la instalación gráfica. Una referencia estructuralmente válida puede preparar datos, pero sólo su asociación nativa exacta y su watermark pueden convertirse en permiso de dibujo. La instalación por lotes sigue siendo atómica; referencias cambiadas, fuentes sin admisión, eventos mezclados, handles equivocados y bootstrap histórico se rechazan antes de conceder el permiso.

Los mismos transactor y dos puertos transportan el nuevo origen. Game conserva WALK durante preparación, drenaje y callback de commit; después del commit nativo proyecta REST y su RNG, limpia el destino del paseo y conserva cuerpo/pose/fases. El programa revalidado se prepara una vez; desplazar su origen temporal no exige reconstruirlo. Las pruebas de canal mantienen la conexión desde antes de adquirir WALK: el rechazo del bootstrap22 activo permanece.

Un descanso posterior al paseo puede guardarse como semántica estacionaria. Al cargar en otro mundo físico se declaran recursos iniciales nuevos en esa posición y con la misma fase/RNG; no se carga la asociación22/21 anterior. Esto no implementa la restauración de un paseo todavía móvil ni habilita su cohort ordinario de Game.

## Validación

**551/551 pruebas enfocadas en 50 archivos**, 295595.0599 ms, sobre 67 entradas contrastadas:19 casos nuevos cubren los cuatro perfiles, copia/captura/revalidación, fuente acotada, secuencias/handles/tipos alterados, adquisición y revocación, watermark tardío, metadata de baseline sin permiso, Game antes/después del commit, ambos canales con espera/aborto/fallo de semántica/recibo, tres paseos y descansos consecutivos y guardado/carga estacionaria nueva en standalone/pthread. Incluye los conjuntos anteriores de Surface/control/puertos/Game y las 13 pruebas de fuente posterior al paseo.

**Build de producto correcto en 49.02 s**. Los18 inputs/artefactos nativos se conservan exactamente, sin recompilación; también los 16 archivos locales protegidos y el helper pthread original. Comandos, conjunto y hashes en [la validación](performance/native-idle-arrival-data-validation-20261116.json).

Corrección posterior de formato: se elimina sólo una línea vacía final en la fixture del canal. Pasan de nuevo los19 casos nuevos; la validación distingue los hashes usados por la regresión de los finales. No cambia ningún statement ni la entrada del build de producto.

No se mide GPU en este incremento: recursos retenidos y drenaje son dobles deterministas. Faltan adaptar los lectores del origen en terreno/kernel/roster/Surface y medir el relevo sobre el actor original. La evidencia GPU histórica del paseo22 no prueba este consumidor22 →21 ni la recuperación integral de 3123 recursos.

## Continuación del plan

Completar ese consumidor original y su validación GPU conservando actor, geometrías y bancos; retirar sólo los datos de programa que cambian tras su fence. Después completar tarea/Home desde la pose actual, restauración móvil y cohort/producer ordinarios, aproximación/anclas/bloqueos, otras clases/finales/puertas, nacimiento/sustitución en vivo y recuperación integral incremental de 3123 recursos. A6/e-R3/e-R4/f-R4 y A/B/C permanecen abiertos. No se inicia D.
