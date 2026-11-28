# Idle continuo al terminar Stroll22

Continúa el [transporte vivo de aproximación](native-farm-idle-approach-live-state-20261118.md) y el [plan integrado](integrated-gpu-migration-plan-20261104.md). El extremo físico22 permanece fijo mientras Idle sigue animándose, tanto para paseo local como para aproximación desde Farm. A6/A/B/C abiertos; D no iniciado.

## Evidencia y solución contrastada

La sonda Surface real alcanzó la aproximación y conservó650 recursos inmutables, pero al llegar al ancla sólo enviaba el reloj relativo finito de22. Su edad permanecía6.937853813171387 durante1.8s mientras el reloj causal avanzaba; el origen módulo era constante. Idle utilizaba ambos valores y quedaba congelado al esperar21. El fallo y su recibo se conservan en `.cache/native-farm-idle-approach-surface-live-fixed.json`.

Se consulta el código real de [`AnimationAction._updateTime` de Three r180](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationAction.js#L711), instalado como0.180.0: LoopOnce limita su tiempo al final, mientras LoopRepeat/PingPong acumula delta y envuelve su tiempo por duración. Se adapta esa separación usando el offset de fase ya implantado para Farm; no se añade un AnimationMixer, temporizador, evaluador de trayectoria ni dependencia.

## Mecanismo conservado

El programa22 marca Idle con `idle-offset`. El consumidor anuncia `nativeIdleStrollIdlePhaseVersion:1`; el cliente exige esa capacidad. Host sólo admite el offset junto con el decoder relativo de la misma referencia22 y su cota F32 certificada. Se reutiliza sin cambios la aritmética `nativeFarmIdlePhaseOffset`: compensa el tiempo físico detenido con el tiempo causal para mantener el clip repetitivo.

La referencia preparada y el origen de adquisición real siguen distinguiéndose. La fila terminal mantiene posición, yaw, velocidades, fases y presupuesto nativos. La cobertura adicional pertenece a la animación del cuerpo actual; no extiende la ejecución física ni sus límites de revocación. `lastDrawTime` conserva la cota física aunque el uniform alcance el margen del decoder. La quiescencia admite únicamente un extremo instalado y actual cuya cota aún cubra el final.

El frame enviado incluye el offset y la edad física exactos. Picking comprueba familia única Farm/Stroll, mundo, origen, período, fórmula y presencia del reloj físico correspondiente. Surface y roster usan ese valor enviado al seleccionar el actor, evitando reconstruir su animación desde el tiempo de Game. No se altera la geometría, la textura de movimiento o los bancos por frame; se actualizan los uniforms existentes.

## Validación y límites

Pasan18 pruebas nuevas y108 dirigidas en9 archivos: los cuatro perfiles en paseo local/aproximación, edad terminal con Idle continuo, adquisiciones exactas/tardías, selección desde reloj enviado, offset manipulado o huérfano, capacidades/decoder ausentes y quiescencia. El código anterior cargado de sólo lectura falla en los16 positivos y conserva los dos rechazos; el control inicial de ocho muestreos también falla como se esperaba. Las pruebas Host usan WASM y puertos reales con GPU simulada. La regresión de258 archivos aprueba2919/2920, cero fallos/cancelaciones y una comparación opcional omitida; build correcto. Se congelan427 inputs y64 nativos sin cambios; no se reconstruye WASM.

La sonda de trabajo Surface, aún en un incremento separado, pasa en GPU NVIDIA timing y visual: Farm23 → aproximación22 → REST21 → WATCH, selección, adopción8 y drain. Conserva650 IDs inmutables;70 recursos se preparan para22 y98 para21, cero después de READY y cero shaders duplicados. Sólo se sustituye la textura de movimiento y después se retira al adquirir21; Alert puede preparar su propio banco antes de READY. Los bloques de1.8s mantienen54 dibujos y la vigilancia bloqueada5s mantiene150. El error de continuidad de Idle es3.67e-7/8.63e-7s.

La ventana completa de timing tiene1238 frames, máximo46.620ms y cero>50ms; el global tiene1519, máximo153.720ms y cuatro>50ms. La ejecución visual tiene1248 en la ventana, máximo214.085ms y tres>50ms; el global registra seis>50ms. Se separan ambas capturas, sin atribuir causalidad a esos picos. Cadencia global NO aceptada; Home264/147ms sigue abierto.

Los [resultados, identidad física y hashes](performance/native-idle-stroll-idle-phase-validation-20261118.json) delimitan la evidencia. Se preservan16 archivos ajenos, el worker pthread sin seguimiento y los bytes anteriores de los cuatro documentos principales. Siguen el incremento Surface, restauración de aproximaciones, reintentos sin camino, productor/cohort, recuperación incremental integral de3.123 recursos y aceptación global de cadencia/plataforma.
