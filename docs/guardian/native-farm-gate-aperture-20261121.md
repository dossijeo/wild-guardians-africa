# Farm cruza el vano de una puerta restaurada

La puerta de zarzas guardada en `x=-14,z=8.2` rechazaba el corredor centrado antes de comprobar los motores. Una primera revisión dejó que el barrido examinara solo el proxy transitable de la puerta registrada. El barrido rechazó la ruta central porque una saliente de la hoja abierta quedaba a 0,2656 m del eje y el trabajador tenía radio de 0,28 m. Un camino válido necesita pasar ligeramente hacia el centro del espacio libre. [Pruebas antes de la corrección](performance/native-farm-gate-aperture-baseline-20261121.json).

El planificador existente comprueba el marco y la hoja abierta al evaluar sus tramos. Si el directo invade la puerta, prueba los extremos del conector que ya registra el mundo. Esa comprobación conserva el radio del trabajador y el modelo de colisión existente. La ruta aún debe adquirir su reserva y pasar el barrido temporal, que comprueba cuándo se abre la hoja y dónde están los demás cuerpos. La revisión estática del overlay invalida el camino guardado al instalar o retirar el mecanismo. La apertura o el cierre en cada fotograma utiliza la misma entrada del planificador mientras la topología se mantenga. Se conservan las comprobaciones de solidez ordinarias.

Detour busca la referencia exacta de una conexión especial dentro de su corredor y obtiene de la malla los dos extremos. Wild Guardians usa los dos extremos del portal ya registrado para guiar la ruta nativa. [Código de Detour](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourPathCorridor.cpp#L356-L395).

En la autoridad, las dos posiciones centradas de zarzas adquirieron una ruta de tres puntos y 6,60 m con la puerta 1000000. El plan cruzó en x=-13,9496 en ambas. El control descentrado también pasó por su propio vano. En NVIDIA, el trabajador salió de z=11,8, cruzó z=8,2 con la hoja totalmente abierta y llegó a z=7,70 con Farm aún en marcha. El ticket 2 retuvo el cuerpo 1, la raíz 619 y sus 32 geometrías. La puerta conservó la raíz 474 y la geometría 202. El Host dibujó 142 veces con ese ticket sin errores y confirmó el drenaje. El máximo entre dibujos fue de 36,0 ms a 30 Hz. [Recibo](performance/native-farm-gate-aperture-20261121.json).

Los controles incluyen la ruta en ambos sentidos, invalidación de la ruta guardada tras instalar la puerta, reutilización estable de la caché en rutas alejadas, rechazo de una ruta central explícita, sólidos vecinos, cuerpos en el barrido y proxies sin propietario o de otra forma. Quedan la compra que obliga a relevar el corredor activo, la retirada preparada, los cruces integrados con tráfico o con Carry y C4.

Pasaron 62 pruebas de integración y regresión con standalone y 17 comprobaciones en pthread. El rechazo del corredor central explícito ocurre al intentar restaurarlo, antes de adquirir una ruta o activar su motor. Las pruebas dirigidas de los tres materiales y del barrido contra otro cuerpo pasaron con el binario candidato. La interfaz WASM conserva sus 772 exports standalone y 778 funciones públicas pthread. El factory y el Worker auxiliar conservaron sus bytes. [Hashes y resultados](performance/native-farm-gate-aperture-20261121.json).

La compilación Vite de producción con WebGPU Worker y dibujo remoto completó el empaquetado.

## Pausa con la hoja en movimiento

La pausa ordinaria durante Farm congeló el cuerpo y el motor en el segundo 10,5 con apertura 0,216. NVIDIA envió 13 dibujos en la parte estable de los 550 ms del control y registró un máximo de 33,5 ms a 30 Hz. Al reanudar, Farm cruzó con apertura 1 sin cambiar el ticket 2, el cuerpo 1, las 32 geometrías ni la malla de la puerta. El consumidor confirmó el drenaje con cero errores. [Recibo de la pausa](performance/native-farm-gate-aperture-20261121.json).

## Guardado tras el cruce

El coordinador de guardado rechazó escribir durante Farm en marcha, incluso con la partida pausada y la hoja fija en apertura 0,216. Tras cruzar y adquirir Idle, escribió un checkpoint de 12 regiones. Una nueva autoridad verificó la reconstrucción de la topología y adquirió Idle20 con la misma posición y fases del trabajador y el mismo portón abierto a 60/60 HP. El control usa WASM, el Host determinista y un repositorio en memoria. [Recibo del guardado](performance/native-farm-gate-aperture-20261121.json).

## Carry por el vano

El mijo maduró en el lado de entrada de la puerta y Game asignó Harvest. Carry16 adquirió el mismo cuerpo 1, la caja y el motor 1000000. Con la hoja abierta el trabajador pasó de z=8,28 a z=8,17 por x=-13,9496. En el control con WASM y Host determinista llegó al centro y generó un solo abono de 14 monedas.

En WebGPU físico, Carry dibujó el ticket 10 y llegó a x=-14, z=4,639. Settlement17 llamó al preparador de la Surface, que devolvió Native settlement gate graphics are not prepared porque el recorrido conserva el motor. La última publicación confirmada todavía contiene Carry. Queda preparar la entrega para el dueño exacto de la hoja y comprobar el cierre de Home con puerta. [Recibo de Carry](performance/native-ordinary-carry-gate-20261121.json).

## Home por el vano

El fin de turno de `youngMale` desde Idle20 solicitó Home18. Salió de z=5,7 y cruzó el vano por x=-13,9496 con la hoja abierta. NVIDIA dibujó el ticket 6 con el cuerpo 1, la raíz 695 y las 36 geometrías del trabajador. La puerta conservó su raíz 397 y la malla residente. El mayor intervalo observado durante el cruce fue de 37,2 ms a 30 Hz.

Al llegar a z=11,8, Home19 intentó retirar al trabajador. La Surface rechazó el paquete con `Native Home absence gate graphics are not prepared`. El Host determinista también llegó al destino y rechazó la preparación de retirada con el motor 1000000. Queda transferir el motor a su dueño de destino en la misma frontera que retira el trabajador, conservando las reservas activas. [Recibos de Home](performance/native-ordinary-home-gate-20261121.json).

## Empalizada y portón reforzado

En ambos materiales, un portón comprado mediante la orden ordinaria y restaurado con yaw 0 dejó cruzar por el centro con apertura 1. Farm conservó el cuerpo 1, la raíz y las 32 geometrías del trabajador. El portón conservó su raíz y geometría. NVIDIA dibujó las 137 oportunidades registradas con el ticket 2 en cada caso y drenó con cero errores WebGPU. Los máximos fueron 36,3 ms en empalizada y 36,0 ms en reforzado con pantalla a 30 Hz.

Con yaw 0,37 rad, el plan de empalizada incluyó el motor, pero cruzó el plano unos 2,11 m a un lado del eje. Se reprodujo en WASM con Host determinista en dos posiciones y se verificó el rodeo en NVIDIA con la puerta a 120/120 HP. El control equivalente de reforzado produjo `farm-arrival unsupported` en el Host determinista. Ambos casos oblicuos quedan pendientes. [Recibos alineados y oblicuos](performance/native-farm-other-gate-apertures-20261121.json).

## Dos trabajadores hacia el mismo centro

En la prueba con WASM y Host determinista, el segundo Farm espera mientras el primero ocupa la llegada común. Cuando el primero sale de allí en Idle22, el segundo adquiere su propio cuerpo y cruza el mismo vano. El control sin portón también espera por el destino ocupado. En NVIDIA Turing se dibujó primero la escena confirmada con ambas figuras y el portón y se conectó después la preparación nativa. Los tickets 2 y 6 llevaron los cuerpos 1 y 2 por x=-13,9496 con apertura 1. Se conservaron las dos raíces, sus 32 geometrías por trabajador y la malla del portón. El cierre drenó con cero errores. Las muestras conservadas de tránsito registraron máximos de 35,1 y 35,6 ms a 30 Hz.

Durante el arranque del ensayo se registraron dos intervalos aún sin atribución de 42,4 y 47,7 ms, antes de adquirir Farm. El control en frío agotó el plazo mientras preparaba los tickets gráficos. En otro control, la maduración durante el primer Farm pidió una parada en z=7,535, después de cruzar. La validación de Stop24 rechazó la ausencia de la pose proyectada del motor y quedan pendientes esa parada, los cruces en sentidos opuestos y C4. [Recibo de tráfico](performance/native-ordinary-farm-gate-traffic-20261121.json).

Al continuar ambos cruces con Host determinista, el primer trabajador alcanzó Action15 de Harvest y el segundo terminó su desplazamiento Farm. Desde ese punto se alternaron intentos bloqueados de Carry y de Idle22 hasta el segundo 67. Carry también quedó bloqueado en la prueba sin puerta. Con un solo trabajador, el mismo cultivo produjo una caja y una entrega en el segundo 26,7. La posición final del segundo cuerpo quedó a 0,40 m del punto de liquidación del control individual. La suma de radios es 0,56 m. Queda resolver la ocupación compartida conservando la comprobación de colisiones. [Recibo extendido](performance/native-ordinary-farm-gate-traffic-20261121.json).
