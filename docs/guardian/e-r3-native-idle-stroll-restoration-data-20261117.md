# Referencia tipada del paseo restaurado

Continúa la [fuente nativa de restauración WALK](e-r3-native-idle-stroll-restoration-source-20261117.md). El bridge copia ahora su petición real y distingue esa procedencia al capturar, preparar, revalidar y leer la asociación22. Mantiene explícitamente la ausencia de un ciclo21 anterior y admite el programa de longitud cero de una llegada guardada. A6/e-R3/e-R4/f-R4/A/B/C siguen abiertos; guardado/carga Game y admisión gráfica de esta fuente continúan pendientes.

## Referencia y adaptación

Se vuelve a consultar la implementación real de [`requestMoveTarget` y `updateMoveRequest`, DetourCrowd v1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp). La petición conserva identidad y destino mientras el agente mantiene su posición actual; no equivale a un corredor ejecutable. Se adapta esa separación a los valores copiados del nuevo request nativo y al preparador22 existente. No se añade otro propietario, registro, controlador o dependencia.

`native-idle-stroll-request-reference.js` copia y congela identidad de autoridad/sesión, actor/cuerpo, nacimiento de petición, perfil, pose/fases/presupuesto, ancla, destino y stream privado. Exige claves acotadas y rechaza handles, tickets, permisos o historia de ciclos introducidos como campos adicionales. El bridge valida las28 columnas nativas, copia sus resultados y expone getter pendiente, listado y getter de procedencia adquirida/suspendida.

La referencia22 sólo acepta `sourceCycleSequence=0` cuando contiene la petición restaurada explícita. Todos sus campos deben coincidir con la petición: época/sesión, actor, cuerpo, secuencia y fecha, centro/perfil, flags, pose, fases, ancla, destino, RNG y retry. Los orígenes habituales21 conservan su contrato y forma serializada anteriores, sin campo opcional vacío ni relajación de su separación mínima de destino. Una restauración puede estar cerca del extremo o ya en él; sólo esa procedencia admite longitud cero.

El preparador22 reconoce la fuente nativa real y contrasta los valores retenidos de Game, incluido el contrato, antes de abrir la propuesta. La revalidación rechaza una pose semántica alterada sin mover el cuerpo, emitir una ruta o perder el request; el propietario puede cancelar su ticket. La asociación preparada/adquirida transporta la misma procedencia copiada al relevar el origen. No se fabrica una decisión21, un permiso antiguo ni una ruta guardada.

`nativeIdleStrollSavedState` valida valores semánticos de los marcadores actual/pendiente para este enlace. El predicado compartido no crea una lista de marcadores en cada proyección. No habilita todavía el formato de guardado o la normalización de carga. Los puertos y control siguen exigiendo su prueba existente; el roster todavía espera un ciclo21 para iniciar un paseo. Este incremento no presenta un doble de preparación como prueba de permiso gráfico.

## Validación y continuación

Pasan30 pruebas específicas: ocho casos nuevos y las regresiones de fuente y datos anteriores. Usan los cuatro perfiles y fuentes nativas reales. Cubren copia inmutable, cambio de época, sustitución de cuerpo/pose/destino/RNG, claves de permiso inyectadas, programa cero, cancelación, revalidación y asociación adquirida a través del bridge público. Los módulos standalone/pthread permanecen idénticos a los ya compilados y validados en el incremento anterior.

Pasan **1.793 pruebas del núcleo en 162 archivos**, sin fallos ni omisiones en esa selección. La [evidencia de este incremento](performance/native-idle-stroll-restoration-data-validation-20261117.json) registra selección del núcleo, build, hashes y preservación. No se repite GPU por esta extensión de datos: la evidencia de hardware anterior sigue siendo regresión del relevo Task, y no acredita restauración gráfica. Los siete fallos antiguos reproducidos sobre el padre continúan pendientes paraC.

El siguiente punto es conectar la declaración al guardado/carga y mantener la espera de Game sin un mover JavaScript; después publicar y admitir la petición nueva en control/puertos y consumidor original. También siguen abiertos otros finales/clases/puertas, productor/cohorte ordinarios y recuperación incremental integral de3.123 recursos. No se iniciaD ni se declara terminada la restauración móvil.
