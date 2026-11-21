# Farm restaurada en la autoridad ordinaria

SimulationAuthority admite ahora un cohort restaurado con Farm pendiente13, en movimiento23 o detenida24. La normalización existente convierte los tres guardados en una petición fría13 que conserva pose, orientación y fases semánticas. El registro de cuerpos se crea una vez antes del reset del planner y enlaza cada cuerpo una vez; el productor existente adquiere 23 y sus sucesores por los canales ordinarios. No se reinicia el registro para admitir otro actor ni se guardan/reutilizan handles WASM anteriores. Las guardas de cohort mixto, incursión y puerta activa permanecen.

## Referencias y reutilización

Antes de activar este mecanismo se leyó código real de [DetourCrowd 1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L482-L591), addAgent/removeAgent/requestMoveTarget. Se aprovecha la separación entre admisión en un registro existente y petición de movimiento posterior. No se copia su ajuste a nearest-point ni su navegación, y no se incorpora dependencia. La admisión fría de Idle/Stroll/Home del propio juego ya tenía el registro, la secuencia de bind y el productor necesarios.

Los ensayos ordinarios identificaron tres fallos de conexión adicionales. Se corrigen adaptando contratos existentes:

- El preparador Gate utilizado para 24 rechaza la opción resumed/deferredStart. El productor deja de reenviar esa opción a prepareNativeGateResources; la admisión nativa sigue diferida y tipada, con los mismos tickets/recibos y validación de proyección. La observación anterior de Farm24 se actualiza para comprobar el contrato real, manteniendo su cancelación.
- Una Farm cuyo contrato vence conserva su corredor autorizado hasta adquirir 24. La publicación en vivo utiliza nativeFarmArrivalBoundState; un guardado en frío mantiene el validador estricto. Es la separación ya existente para Stroll, sin permitir declaraciones frías vencidas ni cambiar confirmedStateSaveAvailable.
- advanceNativeGameExecution podía confirmar un watermark en el instante actual por una intención/política nueva, omitir su envío y publicar después el siguiente. La captura real registra 15→17. Se publica inmediatamente ese commit actual, solo cuando nav_intent_clock_commit devuelve 1, antes de avanzar físicamente. Se reutiliza el patrón de commitNativeCausalClock; no hay contador, reloj, cola o log nuevos. La comprobación estricta de secuencia del consumidor se conserva. No se ejecuta un observador entre el avance físico y la adopción de su tiempo por Game.

## Validación ordinaria

Pasan **41 casos nuevos**, 97.384s, con createSimulationAuthority, Game, C++, productor, ambos canales, cliente/Host remotos y paquetes retenidos reales. La cola GPU y los triángulos del fixture son dobles deterministas: no son hardware ni paridad visual.

Veinticuatro casos cubren cuatro perfiles, tres tipos de guardado y los recorridos 23→Idle21 o 23→aproximación22→REST21. Antes de adquirir 23 se mantienen todos los valores guardados; su petición conserva el yaw original. Al adquirir una ruta nueva, la orientación procede de la fila de movimiento C++ real, no de una orientación inventada ni del yaw anterior impuesto artificialmente. Cada adquisición usa el mismo bodyId y una época nueva; solo se prepara una Farm.

Cuatro casos vencen el contrato antes de conectar recursos y producen Home sin adquirir 23. Ocho recorren 23→24→Task14 o 23→24→Home18 y comprueban todos los mensajes de reloj consecutivos; Home demuestra además que el estado vivo vencido se publica y que serialize de guardado sigue rechazándolo. Los cinco restantes cubren mezcla con actor antiguo, ancla bloqueada sin movimiento/admisión, cierre con preparación pendiente, fallo de preparación terminal y espera del publicador de terreno sin duplicar cuerpos.

El fixture anterior elegía un ancla que queda bloqueada al reconstruir la geometría completa del guardado. El diagnóstico nativo devuelve -7 y destino sin región; se conserva ese punto como negativo y se usa un punto transitable al otro lado para el positivo. No se relaja colisión, región, reserva ni se introduce fallback JS. La hipótesis inicial de caché sin inicializar se descartó al medir la revisión 197; no se cambió C++.

El primer control de 29 casos registra 1 pase/28 fallos por cohort no soportado. Ese wrapper no capturó el exit code de Node antes de mostrar el log; no se presenta como medición de dicho código ni como baseline de los 41 finales. El primer candidato registra 9/29, incluyendo expectativas de orientación equivocadas y el ancla bloqueada; corregidos los fixtures, 30/30 pasan. Los ocho recorridos móviles añadidos fallaron inicialmente por el transporte/parámetros y la publicación viva, luego cuatro Home por el watermark omitido; tras las correcciones pasan 8/8. Estos ensayos parciales y diagnósticos no sustituyen la ejecución final completa.

La primera selección se detuvo tras localizar tres expectativas antiguas de cohort no soportado. Se mantienen sus rechazos de reset sobre mundo vivo y se comprueba ahora espera de recursos en la autoridad nueva, sin adquisición anticipada. Los tres archivos corregidos pasan 56/56; todos los inputs de producto y los 41 nuevos permanecen idénticos a la ejecución ya aprobada. El parcial se archiva y no se cuenta como selección completa.

La selección ampliada final termina **4783/4784** en **360 archivos**, cero fallos y una comparación WASM opcional omitida, 642.201s. Incluye las pruebas de publicación viva/guardado y de reloj, además de las verticales nativas anteriores. Las tres exclusiones históricas de host/timeline permanecen abiertas. Once sintaxis y build WebGPU/Worker con dibujo remoto pasan; build 60.114s, advertencia conocida de chunks. **644 entradas** fijadas, 64 entradas nativas y outputs sin cambios, 16 archivos ajenos y 38 rutas A5 externas exactos. No se reconstruye WASM.

## Alcance gráfico y pendientes

No se ejecuta hardware nuevo para esta conexión. La evidencia NVIDIA de [Farm terminal](native-farm-terminal-production-20261119.md), que conserva 652/653 IDs de geometría/bancos y reemplaza una textura de movimiento por relevo, es **heredada** y conserva su alcance de componentes con autoridad en página. No acredita automáticamente el cohort Farm de la autoridad ordinaria, mínimo de todas las copias, cierre global de las 3.123 reconstrucciones ni cadencia. Las pruebas nuevas validan las transacciones ordinarias y la preparación de un paquete24 con todos sus valores detenidos en el Host real sobre una cola GPU doble.

La admisión está limitada al cohort RESTAURADO dentro del dominio ya soportado. El registro y la decisión de cohort aún se inicializan una vez: nacimientos/admisión incremental e independencia de nuevos lotes siguen pendientes. También quedan integración Worker/Surface ordinaria, consumidor/cohort fallido y device loss, coste de pausa y VFX, guardado/recuperación generalizados, coste frío/cadencia/plataformas y los gates A–F completos. A6/A/B/C siguen abiertos, D no iniciado; f-R3 conserva solo su cierre de seguridad acotado.

[Recibo, comandos y hashes](performance/native-farm-restored-authority-validation-20261119.json).
