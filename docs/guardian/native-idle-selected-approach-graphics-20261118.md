# Aproximación con remaining: control, actor y Surface — 2026-11-18

Continuación de `96ad9064f`, A6-04.f-R3/e-R3. Se contrasta el control existente y se conecta el descriptor con WALK remaining real a roster/actor/Surface. La carga fría explícita se valida como componente; la admisión de la aproximación seleccionada por 21 se comprueba también en GPU real. La validación GPU de carga fría explícita, productor/cohort ordinario y aceptación siguen pendientes. A6/A/B/C abiertos; D no iniciado.

## Código consolidado consultado

Se leyó [Three r180 AnimationMixer, _bindAction/_activateAction/_deactivateAction](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationMixer.js#L53-L185): bindings reutilizados por identidad de raíz/pista, estado original guardado/restaurado al activar/desactivar y contadores separados de uso/referencia. Se conserva ese patrón dentro del actor y sus variantes existentes. No se introduce otro mixer, gestor, caché ni dependencia. El snapshot consultado coincide byte a byte con upstream y su hash se conserva en la evidencia.

## Qué estaba completado y qué cambia

- **Control existente compatible**: las 20 pruebas nuevas pasan antes de modificar producción. Selección nativa, evento ordenado, watermark y asociación preparada siguen siendo necesarios; metadata sola, remaining cambiado o un padre no admitido no conceden WALK. No se modifica `native-route-control.js`.
- **Roster incompleto**: exigía WATCH agotado para iniciar cualquier paseo desde 21, incluso si el nativo ya había seleccionado una aproximación desde REST/WATCH con otro remaining. Ahora verifica esa fase estacionaria, ancla/RNG/remaining/retry exactos y el 21 vigente. El paseo local conserva su condición anterior.
- **Carga fría incompleta**: el matching de actor pendiente no comparaba remaining. Se añade la igualdad con la solicitud explícita versión 2 o con el valor implícito de la versión 1. No basta una forma WALK parecida.
- **Llegada/adopción incompletas**: el relevo 22→21 aún suponía remaining de nacimiento o cero y un ID de destino local. Roster y Surface contrastan ahora el valor y la clase de destino del descriptor. Dos selectores puros de metadatos ya decodificados se comparten con Game; no generan permisos ni eligen política, objetivo o RNG.
- Se mantienen cuerpo/actor/raíz/geometrías/índices/bancos, variantes y protocolo de preparación/cancelación/retarget/retirada ya existentes. Las fuentes nativas y ambos módulos permanecen intactos.

## Fuente GPU y decisiones reales

La nueva prueba parte del mismo checkpoint exterior ejecutado original y de su bloqueo de destino explícito. Su retry guardado ya es cero: el primer 21 dura cero y selecciona otro REST antes de reparar el destino. Se respeta esa decisión, se admite ese segundo 21 por el mismo protocolo y solo al terminar se obtiene la aproximación nativa. No se fuerza un retry conveniente, no se cambia pose/ancla ni se reelige en JS.

El auditor reutiliza el recorrido de Surface existente con offsets explícitos de publicación y bloques. Dos adquisiciones reales de 21 preceden al 22 seleccionado y al REST de llegada. La prueba se mantiene en la autoridad de página y el cohort B de Home independiente; no equivale al productor ordinario ni a recuperación de mundo completo.

## Validación

- **60 pruebas nuevas**: 20 de control pasan antes de modificar producción; 40 gráficas cubren ambas fuentes, cuatro perfiles normal/pthread, sustituciones, cero, cancelación, retarget, retirada, shaders originales color/sombra y picking con reloj enviado. Baseline final con lectores antiguos: **8 fallos esperados, 32 filtrados, 0 pases**.
- Pasan **780 dirigidas en 42 archivos**, **3.325 de 3.326 seleccionadas en 278 archivos**, una comparación opcional omitida y siete exclusiones históricas. Build **47.31 s**; **466 inputs /64 nativos intactos /16 ajenos exactos**. No se recompila ni cambia ningún archivo nativo.
- **16 registros de componente** conservan actor/raíz/geometrías/índices/bancos y RNG global, una adquisición de GLB, tanto 21 seleccionado como solicitud fría explícita. Sus dobles de renderer/admisión no son recibos GPU.
- GPU NVIDIA timing/visual: dos 21 reales (**100/68 preparados**), 22 seleccionado (**98**) y REST21 de llegada (**68**), **cero recursos después de READY**, geometrías/bancos/actor retenidos, sin shaders duplicados, picking y drain. WALK remaining **10.399999856948853**, distinto al nacimiento **7.599999904632568**; no se sustituye la decisión REST original para fabricar la fuente.
- Ventana completa desde el primer21: máximos **134.295/177.480 ms**, huecos >50 **4/17**. Global: **134.295/177.480 ms**, huecos >50 **7/20**. Se conservan además ventana WALK, todas las muestras y las 6 capturas visuales; no se declara cadencia aceptada.
- Regresión GPU de carga fría **heredada versión1**, 22→21: **100/98** preparados, cero tardíos/drain, máximo ventana **51.000 ms**, 1 huecos >50. No demuestra carga fría explícita versión2.
- Negativo dirigido: omitir solo plantilla WALK coincide una vez, conserva cuerpo/21 y rechaza adquirir22. Host fallido/quiescencia rechazada/timeout de retirada: **no es drain normal**. Se conserva el fallo inicial y el recibo formal.

[Evidencia, referencias, hashes, pruebas, registros de componente y todas las muestras GPU](performance/native-idle-selected-approach-graphics-validation-20261118.json).


## Límites y siguiente punto

La omisión deliberada de la plantilla WALK rechaza el 22 y conserva el cuerpo en su 21: no es autorización por metadata. El Host entra en fallo por el mensaje inválido; la quiescencia se rechaza y el cierre del contexto registra timeout de retirada. Se conserva esa evidencia y **no se considera un drain normal ni recuperación aceptada**. El cierre/recuperación de contexto fallido debe resolverse dentro de los pendientes de recuperación, sin debilitar el rechazo de plantillas inválidas.

Sigue validar en Surface/GPU la carga fría con remaining explícito desde un WALK seleccionado real y continuar productor/cohort/paradas/relevos ordinarios, REST/WATCH exterior guardado desde 20 genuino, recuperación incremental de 3.123 recursos y cadencia/plataforma. Los máximos y todas las muestras se conservan sin atribuir causa ni declarar aceptación. No se cierra A6/A/B/C ni se inicia D.
