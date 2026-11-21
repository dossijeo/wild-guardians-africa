# Entrega con contrato terminado y retorno Home pendiente

Continúa el [consumidor de entrega](e-r3-native-delivery-live-consumer-20261115.md) y el [plan principal](integrated-gpu-migration-plan-20261104.md). La entrega preparada admite ahora el resultado ordinario `returning`: liquida una única vez, retira la caja y conserva el cuerpo nativo mientras espera la ruta Home. No se convierte al trabajador en disponible, no se crea una tarea y todavía no se ejecuta el regreso. e-R3/e-R4/f-R4 y A6/A/B/C siguen abiertos.

## Referencia aplicada al incremento

Antes del diseño se leyó código real de [DetourCrowd v1.6.0, `requestMoveTarget` y `updateMoveRequest`](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L573). La solicitud registra destino sobre el agente conservado; la actualización resuelve un corredor y trata explícitamente los resultados incompletos o fallidos. Se adapta la separación solicitud/admisión al propietario de intención existente. No se copia su cola de búsqueda: Wild Guardians ya dispone de una propuesta pendiente y un protocolo de preparación/drenaje/adopción. No se añade dependencia.

La ruta Home heredada liberaba primero la intención anterior. Por ello no sirve para reemplazar un cuerpo nativo protegido sin preparación gráfica. Este incremento conserva el destino de retorno en la asociación estacionaria común; el siguiente incremento deberá admitir su corredor completo mediante el mismo protocolo de movimiento.

## Cambio implementado

- El cálculo semántico compartido de entrega incluye aldea y entrada cuando las reglas ordinarias determinan `returning`. La revalidación comprueba también ese destino; cambiarlo durante la preparación rechaza el resultado sin cobro.
- La propuesta común 17 incorpora opcionalmente `home: {villageId, x, z}`. En el encabezado nativo de 24 valores se usan los campos antes reservados 21–23; las asociaciones de disponibilidad existentes conservan ceros y su representación anterior. Dos exports versionados permiten preparar este resultado en ambos artefactos canónicos. Se conserva el formato de asociación de 52 valores.
- El estado nativo 7 se denomina ahora `StationaryActive`: identifica el cuerpo retenido, sin ruta ejecutable. Con destino Home conserva `home=true`, la entrada y la inelegibilidad para tareas. Con contrato activo conserva el comportamiento anterior. No se añade registro de cuerpos, cola ni otro planificador.
- El commit sigue retirando Carry y su caja sólo después del drenaje y admisión exactos. Game proyecta `returning`, caja entregada y economía coherente antes de avisar a observadores. El tick conserva ese cuerpo mediante su propietario nativo y evita entrar en el movimiento Home heredado. La proyección exige la misma aldea y entrada; cambiar de aldea no conserva una autorización anterior.
- Las llamadas Home heredadas de planificación, restauración y cancelación no pueden sustituir una intención que requiere recursos. Tampoco puede finalizarse mediante la API de tarea ni reclamarse una tarea siguiente para este resultado.
- El consumidor directo y el roster conservan la referencia tipada completa, incluido Home. Ese resultado no puede usarse como fuente de una tarea. Surface espera la publicación coherente `returning` de la misma aldea, usando sus predicados y slot existentes. El dibujo estacionario reutiliza el mismo Idle y reloj lógico ya preparados; ese clip no concede movimiento de retorno.

## Validación y alcance

La [evidencia estructurada](performance/native-delivery-home-pending-validation-20261115.json) separa comprobaciones nativas, transactor, protocolo y hardware.

- Regresión final: **549/549 pruebas en 48 archivos**, sin omisiones, 89,819 s. Incluye el transactor económico común, destino modificado durante preparación, proyección en otra aldea rechazada, inelegibilidad posterior, retención/cancelación y Home heredado, además de las clases anteriores.
- Selección dirigida inicial: **31/31**, sin omisiones, 12,812 s, incluidos standalone y pthread. No se suma a la regresión, que la contiene.
- Ambos artefactos nativos canónicos se reconstruyen con el ABI común. Compilación de producto correcta en **44,23 s**, con los avisos existentes.
- Control de componente anterior: un loader de sólo lectura carga el bridge de `08a5d5fae` en su URL original, usando los artefactos nativos actuales. Reproduce **dos fallos** (`unsupported` frente a `committed`, standalone y pthread), con once casos fuera de la selección. No se sustituye ningún archivo de producto y no se presenta como reproducción integral de todo el commit padre.
- Los 16 archivos originales protegidos fuera del stream previamente modificado conservan sus hashes exactos.

El [ensayo NVIDIA/Turing en Edge headless](performance/native-delivery-home-pending-gpu-20261115.json) utiliza el consumidor y puertos reales, con fuente en página. Modifica el contrato del trabajador real antes de la entrega; no fabrica una intención Home para él. El actor B independiente sigue siendo la fixture Home explícita del ensayo anterior. El resultado retiene físicamente al trabajador A, usa la aldea real 1 y su entrada (60, 0), cobra una vez y reconoce la publicación antigua.

Se preparan **96 recursos del relevo**, con **cero creaciones y cero forks después de READY**, conservando raíz, huesos y geometrías del actor, el actor independiente y los lotes del mundo. Mantiene **50 dibujos durante el bloqueo de 1,8 s** del preparador; no hay errores GPU/página/red y el drenaje final se confirma. La selección identifica al trabajador 900011. La identidad de índices está cubierta por las pruebas del roster, no por IDs de índices en esta instrumentación GPU.

Se inspeccionó la [captura del cuerpo retenido junto al centro](performance/native-delivery-home-pending-20261115.png): caja retirada, personaje original y sombras. No demuestra todavía el recorrido a la aldea ni la aceptación visual C2 del juego completo.

## Siguiente punto y límites que permanecen

Preparar y admitir la **ruta Home genuina** desde la asociación estacionaria con destino de aldea, con el mismo cuerpo, fases, reserva temporal, puertas y consumidor; después admitir su llegada/retirada. No llamar a `restore_home` para anticipar movimiento ni inventar Task/Resume. El cambio de contrato de un Idle ya existente también necesita su frontera preparada.

Siguen pendientes Idle inicial y otros finales/cancelaciones, entrega con puertas, carga estacionaria en contexto nuevo, productor ordinario de todas las clases y recuperación integral. El guard del bootstrap estacionario y la exclusión gráfica de liquidación con puertas permanecen. Este ensayo incremental no cierra la reconstrucción histórica de 3123 recursos ni A6/A/B/C; no se activa el prototipo como backend principal.
