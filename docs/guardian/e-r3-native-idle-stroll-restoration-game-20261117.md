# Guardado y carga de WALK en Game

Continúa la [referencia tipada del paseo restaurado](e-r3-native-idle-stroll-restoration-data-20261117.md). Game guarda valores semánticos de WALK, los carga en una autoridad nueva y conserva la espera antes de adquirir un22 nuevo. No restaura permisos anteriores ni ejecuta movimiento JavaScript. La publicación/control y el consumidor gráfico de este origen siguen pendientes; A6/e-R3/e-R4/f-R4/A/B/C permanecen abiertos.

## Referencias y adaptación

Se consulta código real de [`addAgent`, `requestMoveTarget` y `updateMoveRequest`, DetourCrowd v1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp): el alta reinicia corredor/estado y una petición posterior calcula desde la posición actual del agente. Se mantiene la separación entre declaración semántica, cuerpo vinculado y ruta nueva. Wild Guardians conserva exactamente la pose guardada y el destino elegido; no adopta el ajuste de posición al navmesh ni vuelve a elegir un destino aleatorio.

También se consulta [`RigidBody::copy_from`, Rapier v0.22.0](https://github.com/dimforge/rapier/blob/v0.22.0/src/dynamics/rigid_body.rs), que copia valores excluyendo identificadores internos y colliders. Se adapta esa distinción al intent y la pose genérica existentes: una declaración sin cuerpo no concede identidad física. La primera vinculación exacta completa identidad/radio/flags; no aparece otro registro de cuerpos ni una dependencia nueva.

## Comportamiento implementado

`serialize`/`deserialize` aceptan WALK activo o pendiente mediante el validador semántico existente. El snapshot conserva posición, orientación, fases, presupuesto, centro/perfil, ancla, destino, RNG privado y retry. No contiene handles, tickets, asociaciones ni permisos ejecutables de la sesión anterior. La disponibilidad de guardado de la interfaz continúa cerrada para estos marcadores hasta validar el consumidor gráfico restaurado.

La normalización de carga valida previamente todas las familias restauradas y exige un mundo físico vacío. Resuelve el ancla por el ID guardado usando la política original de cultivo/centro y su radio/punto de servicio. Un cultivo nuevo más cercano no sustituye el ancla elegida. Un fallo de valores, geometría, ancla o mundo no reinicia la autoridad anterior ni cierra sus consumidores.

La declaración nativa nueva se instala antes del cuerpo. Un getter separado devuelve una referencia sin campos físicos; no puede pasar como referencia vinculada. Game mantiene pose, fases, presupuesto, destino y stream privado mientras espera, incluso antes del primer reloj/vínculo. La vinculación exacta produce el nacimiento físico nuevo; el preparador22 y su commit ligado existentes adquieren el paseo, y Game proyecta únicamente la ejecución nativa real. La coherencia compara también el ancla actual de Game antes de preparar o avanzar.

Una tarea que llega durante la espera transfiere la pose inmutable al request14 existente sin adquirir primero WALK. Funciona antes o después del vínculo físico, conserva el target real y rechaza revinculaciones y fases sustituidas. La primera vinculación completa una sola copia de la pose retenida. No se fabrica un ciclo20/21 ni una cancelación intermedia.

El vencimiento del contrato durante esa espera transfiere la declaración a Home mediante el intent existente. Al cargar un contrato ya terminado, se valida primero la semántica Home y se declara directamente ese retorno. No se renueva WALK ni se mueve el cuerpo durante el relevo. La procedencia interna de esta transferencia permanece distinta de una fuente20 o de un22 ejecutado/suspendido.

La cohorte Game admite el request pendiente válido, el paseo22 realmente adquirido y su ciclo21 posterior, incluida la llegada guardada de longitud cero. Un compañero Home independiente continúa mientras WALK espera. Las puertas y los cuerpos suspendidos conservan sus restricciones. El retorno desde WALK activo todavía necesita la parada preparada ordinaria: Game rechaza esa frontera antes de avanzar reloj o cuerpo. El productor ordinario y la cohorte integrada completa siguen pendientes.

## Validación y siguiente punto

Se añaden 19 casos con fuentes reales: cuatro perfiles en standalone/pthread, guardado/carga pública, espera y adquisición nuevas, primer vínculo, Task y Home antes/después del cuerpo, contrato ya terminado, llegada cero y REST real, ancla conservada, preflight atómico, snapshot inválido, cambios de ancla en vivo y compañero Home independiente. Las pruebas de movimiento JavaScript/rutas antiguas lanzan un error si se invocan. Pasan 86 pruebas específicas y 60 de la selección relacionada; ambas selecciones se solapan. Las expectativas antiguas de rechazo global del paseo se sustituyen por comprobaciones del cuerpo nativo y de las fronteras que siguen sin soporte.

Pasan **1.812 pruebas del núcleo en 163 archivos**, sin fallos, cancelaciones ni omisiones en esa selección. La primera ejecución detectó 11 expectativas antiguas de rechazo de toda cohorte WALK/REST en dos archivos de fuente; se actualizaron al comportamiento admitido, conservando sus comprobaciones de ejecución/fases/RNG/propiedad, y se repitió completa la selección sobre las entradas finales. Ambos módulos nativos se recompilan con los exports canónicos.

La [evidencia de validación](performance/native-idle-stroll-restoration-game-validation-20261117.json) registra resultados, hashes de entradas/binarios, build y preservación de los 16 cambios locales previos y del helper pthread. La regresión GPU del relevo Task anterior valida los binarios nuevos; no acredita restauración gráfica. Los siete fallos antiguos reproducidos sobre el padre siguen pendientes para C y no forman parte de la selección del núcleo.

En esa regresión NVIDIA/Turing se conservan 685 IDs de geometría/bancos y se retira únicamente el dato22 sustituido. No se crean shaders ni pipelines y no hay asignaciones después de READY; cada bloqueo de 1800 ms mantiene 54 fotogramas. La preparación crea 70 recursos de protocolo y el Host realiza 122 copias de uniformes y 122 de bindings, con 14.688 bytes de uniformes. No equivale a cero asignaciones durante preparación ni demuestra todavía la recuperación incremental integral de 3.123 recursos.

El siguiente punto es admitir esta fuente explícita en publicación/control y en los puertos/roster/Surface originales, y demostrar su adquisición en GPU conservando recursos sin cambios. Siguen pendientes otros finales/clases/puertas, productor/cohorte ordinarios y recuperación incremental integral de 3.123 recursos. No se inicia D ni se declara cerrada la restauración móvil.
