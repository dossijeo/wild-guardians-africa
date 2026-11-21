# Continuidad de fase entre programas Idle — 2026-11-18

Continuación de `84e906a5a`, dentro de A6-04.f-R3/e-R3. Se corrige el retroceso cosmético reproducido al sustituir un 21 retenido por otro del mismo clip después de esperar recursos. El cuerpo, elapsed/remaining/RNG nativos y los horizontes de ejecución permanecen finitos. A6/A/B/C siguen abiertos; D no se inicia.

## Investigación aplicada

Se leyó el código instalado de [Three r180, `AnimationAction._updateTime`](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationAction.js#L711-L854): suma el delta al tiempo actual, hace wrap con `floor(time/duration)` y conserva el tiempo resultante. Se adapta ese principio de continuidad del clip al reloj cosmético ya existente, manteniendo separada la edad física finita. No se añade mixer, temporizador, registro, propietario ni dependencia; el grafo TSL no cambia.

## Implementación

- El control conserva `phaseDelay`, un único valor numérico, en la asociación/registro de ciclo existentes. Se calcula al recibir la adquisición nativa, antes de retirar el registro anterior. Solo hereda desde el predecesor exacto realmente instalado, y solo si su clip terminal coincide con la fase inicial nueva. Los metadatos o un baseline sin instalación no aportan este valor.
- La espera se mide entre el fin físico del programa anterior y la frontera REAL de adquisición del nuevo; se incluye preparación y quiescencia tardías. Los bindings no se encadenan ni se guarda historia de ciclos. Cambiar de REST a WATCH o iniciar un REST nuevo descarta el retraso del otro clip.
- El Host suma el desfase módulo el período al `idle-offset` existente. El valor heredado se aplica al clip inicial; se reinicia al cruzar realmente el nudo WATCH. Ese nudo se calcula al admitir el reloj y se conserva en el binding, sin búsqueda por frame. El reloj físico sigue limitado a la duración nativa y al corte Home/Task.
- Un corte temprano limita también el tiempo usado para calcular la fase. El recibo de dibujo lleva `phaseDelay` y `phaseTime` junto al offset que se subió de verdad; picking los valida y consume el mismo float enviado. Los recibos antiguos de desfase cero siguen siendo legibles. Estos hechos de reloj son datos del Host, no permisos ni valores elegidos por el preparador.
- Sin cambios en DTO nativos, WASM, bancos, materiales ni shader; no se serializa estado gráfico en Game o en el guardado.

## Validación

- **17 pruebas nuevas**: cuatro perfiles REST/WATCH, dos esperas por clip (0,7 s y más de dos períodos), cuerpo y RNG intactos, una adquisición del actor, geometrías conservadas y reloj físico nuevo en cero. Los offsets realmente enviados al Host conducen los proxies del GLB original. Error máximo de fase **7.15255737e-07 s** y salto máximo de vértice **1.36571398e-07 m**, con 93/124 vértices muestreados según el perfil.
- Horizonte cero/positivo en normal/pthread, un solo escalar sin historia, preparación y quiescencia tardías, época 2^34 en pthread, cambio de fase real, corte Home, cancelación de candidatura y rechazo de delay/phaseTime/offset alterados. Las pruebas de control anteriores mantienen los rechazos de metadatos/baseline no instalados.
- **346 dirigidas en 17 archivos**, cero fallos/omisiones. Selección amplia: **3172 pasan de 3173 en 270 archivos**, una comparación opcional omitida, cero fallos/cancelaciones; siete exclusiones históricas conservadas. No es toda la suite del repositorio. Build correcto en **46.30 s**.
- Control/Host/cálculo/picking anteriores en solo lectura: **dos fallos esperados y 15 casos filtrados**, con los saltos 0,95→0,25 y 1,70→1,00 s. Se retienen sondas preliminares y correcciones de fixture/validación en la evidencia; no se altera la política nativa para satisfacerlas.
- **448 inputs probados / 64 nativos exactos**, sin rebuild WASM; 16 archivos ajenos y worker pthread no seguido intactos.
- Regresión NVIDIA de la ruta VÁLIDA previa 22→21: conserva **647/648 IDs inmutables**, prepara 100/98 recursos en una llamada por transición, cero tardíos y shaders duplicados. WATCH, clip terminal, picking, adopción y drain pasan.
- Cadencia de esa regresión: ventana de 743 frames, máximo 63.565 ms y un intervalo >50 ms; global de 1049 frames, máximo 184.815 ms y 6 intervalos >50 ms. Se conservan todos los picos; no se atribuye causa ni se acepta la cadencia.

[Referencias, selección, hashes, métricas del actor y captura GPU](performance/native-idle-cycle-phase-continuity-validation-20261118.json).

## Alcance y siguiente punto

La vertical nueva usa el GLB, bancos, terreno y kernel nativo originales, los protocolos de recursos/control y el Host reales. El renderer y el dispositivo GPU son simulados; sus uniformes enviados conducen los proxies de picking del actor original. No es una captura de Surface ni de hardware del fallo. La regresión hardware adicional cubre solo la ruta válida 22→21 anterior, incluida la nueva representación de reloj; no demuestra el origen fallido en GPU.

Siguiente: validar el primer REST fallido y sus reintentos con Surface/puertos/Host/GPU reales, reteniendo el actor y midiendo identidad/delta de recursos y cadencia. Siguen pendientes la aproximación 22 seleccionada con remaining conservado, REST/WATCH exterior guardado desde cuerpo inicial genuino, productor/cohort, recuperación incremental de los 3.123 recursos y aceptación de cadencia/plataforma. No se da por terminada la migración.
