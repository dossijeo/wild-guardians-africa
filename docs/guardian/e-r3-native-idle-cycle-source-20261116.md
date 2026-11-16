# Fuente nativa de un ciclo original de Idle

Continúa la [inicialización estacionaria](e-r3-native-initial-idle-initialization-20261116.md), sobre `70d21a569`. La familia 21 prepara el descanso/vigilancia conocidos de un ciclo y obtiene su siguiente petición semántica al terminar vigilancia. Usa el mismo ActiveIntent, cuerpo, barrera de mutación y reloj causal. Es fuente nativa, con commits ABI de confianza en las pruebas; faltan todavía su control y consumidor gráficos preparados. No cambia ningún cierre A6/e-R3/e-R4/f-R4/A/B/C.

## Referencias y decisiones

Antes de implementar se consultaron los cuerpos reales de [Random de Unity.Mathematics, revisión f53664de](https://github.com/Unity-Technologies/Unity.Mathematics/blob/f53664de3dad88869a91ef8ebdbecf356e1312d5/src/Unity.Mathematics/random.cs) y [requestMoveTarget, resetMoveTarget y updateMoveRequest de DetourCrowd v1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp). Se conservan estado privado por componente, identidad del agente y separación entre petición pendiente y movimiento válido. Unity devuelve el estado anterior y su constructor avanza la secuencia: se mantienen las convenciones diferentes de Wild Guardians, su semilla FNV y salida del estado nuevo, incluidos estados guardados cero.

La lectura previa de [Pipelines de Three r180](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Pipelines.js) establece la condición para la presentación siguiente: conservar bancos y programas conocidos y cambiar datos. El ciclo contiene ya el programa completo de descanso/vigilancia; el consumidor futuro podrá seleccionar ambos clips sin reconstruir materiales en cada cambio. Esto es una decisión de contrato, todavía no una medición ni implementación gráfica de la familia 21. No se añade dependencia, registro de cuerpos ni temporizador.

## Fuente y frontera

La propuesta captura la asociación física inicial real, estado privado, ancla y calibraciones originales. Un descanso prepara sobre una copia del RNG su vigilancia posterior; una vigilancia inicial conserva su RNG. Preparar, cancelar o revalidar no modifica el estado privado ni mueve el cuerpo. La revalidación desplaza el origen completo sin reiniciar la fase mientras otro trabajador nativo avanza.

El estado ejecutado se obtiene del tiempo nativo y del programa inmutable. Respeta el umbral original `remaining > 1e-9`, sus fases y RNG; normaliza una sola vez el extremo retenido para evitar cambios residuales durante la espera. Una vigilancia cuyo restante guardado ya era cero resuelve al adquirir el ciclo, sin inventar una duración de clip nula ni avanzar el reloj.

Al terminar vigilancia se resuelve una vez la regla original de un tercio y hasta doce candidatos locales, con el navegador nativo real, descarte de desvíos fuera del radio y destinos menores de 0,75 m. El resultado es otro descanso con su duración/RNG o un **paseo pendiente**, con destino y puntos, que no reserva ni concede movimiento. Si cambia el ancla o falta terreno, la decisión queda sin resolver: no consume su siguiente secuencia privada ni se reintenta por tick. El propietario de eventos/mundo puede resolverla explícitamente después.

Todas las comprobaciones y propuestas de movimiento de la cohorte preceden a las escrituras físicas y a publicar esa petición. El mismo cuerpo permanece fijo; otro trabajador puede seguir avanzando mientras el ciclo acabado espera. Un descanso siguiente puede preparar otro ciclo sobre la misma ascendencia física. La propuesta, el programa y su asociación distinguen sesión, secuencia de origen, adquisición real y frontera preparada.

La asociación física20 se conserva como ascendencia, pero su antiguo permiso gráfico se revoca al emitir21. Su proyector de fase retenida devuelve `null` para ese propietario temporal: no puede presentar el estado inicial como si ejecutara el ciclo. No se anuncia capacidad21 ni se activa un fallback ordinario de Game.

## Evidencia y límites

**20/20 casos dirigidos**, con WASM real y ambos módulos standalone/pthread. Comparan los cuatro perfiles en descanso y vigilancia con `updateIdle` original; verifican el RNG/destino/puntos, pausa, cero persistido, doce candidatos rechazados, repetición idempotente, retiming, retirada del cuerpo, ancla retirada/repuesta, esquemas tipados y revocación del permiso20. En la comparación diferencial, el oráculo original consulta el mismo backend de navegación real. No se cuentan colas GPU simuladas como hardware.

Las pruebas descubrieron la representación real de cultivos/coordenadas y diferencias de frontera y retención; se corrigió la fuente, manteniendo las comparaciones con la lógica original. Los resultados finales de regresión, compilación de ambos módulos, build y preservación figuran en [la validación](performance/native-idle-cycle-source-validation-20261116.json).

Siguen pendientes el transactor/control/roster/Surface preparados de la familia 21, su fase en color/sombra/selección y medición GPU; proyección y guardado/carga de Game; aproximación y sustitución/reinicio del ancla por eventos; admisión y ejecución real del paseo y retorno; interrupciones integradas, puertas y productor ordinario. Este incremento admite el ancla vigente en su región estacionaria y detecta su retirada al decidir; todavía no implementa toda su sustitución dinámica original. La evidencia GPU 98/0 anterior pertenece a body20, no demuestra la familia 21 ni recuperación de los 3123 recursos sanos. Tampoco cierra nacimiento en vivo, sustitución de mundo ni A/B/C.
