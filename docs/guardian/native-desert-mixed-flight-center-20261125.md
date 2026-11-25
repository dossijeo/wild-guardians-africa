# Huida y ataque al centro en Desierto

La calificación de desarrollo de Desierto 983 conserva el trabajador de Farm y el facóquero de RaidSpawned. El encuadre sur permite que Game elija el centro y que el dueño nativo pruebe la separación antes de solicitar los recursos gráficos de ambas marchas. Los muros de la partida permanecen activos. La selección ordinaria encuentra el acceso a `structure-2`.

Home18 se prepara primero. Verifica el corredor de refugio contra el corredor completo del animal, todavía pendiente. Al adquirir la marcha 26, el Host exige el mismo recibo del trabajador en Home18 o la ausencia exacta de Home19. La primera acción contra el centro espera esa ausencia. Se conservan las distancias de encuentro de Game y el barrido de terreno de cada ruta. Pausa o entrega tardía de READY no pueden convertir trayectorias geométricamente separadas en un encuentro.

Box2D une las envolventes del principio y del final antes de consultar posibles contactos. La prueba local usa las envolventes ya existentes de ambos corredores completos. Una separación superior al alcance acredita también los extremos retenidos. El caso que se solapa requiere el dueño de encuentros del plan. [Box2D 3.1, búsqueda continua](https://github.com/erincatto/box2d/blob/v3.1.0/src/solver.c#L427-L446).

## Controles

Desde la pose que acreditó Stop24, el encuadre norte dio una distancia mínima de 15,856 m en 143 pasos de Game hasta el refugio. En ese contraste se retiró solo el marcador de admisión para reproducir el movimiento previo. Cerca del centro, los dos recorridos pasan a unos 0,838 m en momentos diferentes. El mismo escenario nativo bloquea Home18 y la marcha del animal antes de preparar sus recursos. El encuadre sur conserva al menos 3 m entre las envolventes y supera el radio de encuentro de 2,2 m.

En el control positivo, retener READY de Home conserva ambos orígenes. Se confirma Home19 sin daño, cuatro golpes que llevan el centro de 600 a 520 HP y un Retreat con el mismo cuerpo del facóquero. Tras RaidEnded, la ausencia Home19 acredita desde el mismo refugio un cuerpo nuevo para el trabajador original. Farm23 conserva la vuelta sin urgencia y llega a Idle. La selección integrada pasa 57 pruebas e incluye AttackCrops, el ataque aislado y las rutas previas de Farm y Flee.

## NVIDIA Turing

El trabajador conserva el cuerpo 1 desde Farm23 hasta Home19. El facóquero usa el cuerpo 2 en las nueve adquisiciones de marcha, golpe y retirada. Se registran 34 dibujos con ambos relojes en avance y las 1.363 referencias comparables mantienen su identidad y versión. Los cuatro impactos distintos dejan el centro en 520 HP. La ausencia del facóquero se dibuja en el paquete 460 y el primer dibujo de vuelta es el 461. El mismo trabajador vuelve con el cuerpo 3 y llega a Idle a 72 s. La salida devuelve un recibo de drenaje y la sesión termina sin errores. El build web y la comprobación de memoria compartida en pthread pasan. [Recibos y pruebas](performance/native-desert-mixed-flight-center-20261125.json).

A 30 Hz, el primer golpe registra 1.365,50 ms entre envíos. El avance de la línea de tiempo ocupa 572,10 ms, la captura 256,30 ms y la espera de recursos en el Host 401,10 ms. El cuarto golpe registra 366,70 ms, con 231,80 ms de captura, cero espera de recursos y diez oportunidades rechazadas por obsolescencia. Otros tres relevos quedan entre 132,70 y 133,20 ms. C4 conserva el objetivo de 16,667 ms. Quedan la atribución dentro de cada tramo, la resolución del encuentro físico, Recovery y la activación ordinaria.
