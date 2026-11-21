# Farm cruza el vano de una puerta restaurada

La puerta de zarzas guardada en `x=-14,z=8.2` rechazaba el corredor centrado antes de comprobar los motores. Una primera revisión dejó que el barrido examinara solo el proxy transitable de la puerta registrada. El barrido rechazó la ruta central porque una saliente de la hoja abierta quedaba a 0,2656 m del eje y el trabajador tenía radio de 0,28 m. Un camino válido necesita pasar ligeramente hacia el centro del espacio libre. [Pruebas antes de la corrección](performance/native-farm-gate-aperture-baseline-20261121.json).

El planificador existente comprueba el marco y la hoja abierta al evaluar sus tramos. Si el directo invade la puerta, prueba los extremos del conector que ya registra el mundo. Esa comprobación conserva el radio del trabajador y el modelo de colisión existente. La ruta aún debe adquirir su reserva y pasar el barrido temporal, que comprueba cuándo se abre la hoja y dónde están los demás cuerpos. La revisión estática del overlay invalida el camino guardado al instalar o retirar el mecanismo. La apertura o el cierre en cada fotograma utiliza la misma entrada del planificador mientras la topología se mantenga. Se conservan las comprobaciones de solidez ordinarias.

Detour busca la referencia exacta de una conexión especial dentro de su corredor y obtiene de la malla los dos extremos. Wild Guardians usa los dos extremos del portal ya registrado para guiar la ruta nativa. [Código de Detour](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourPathCorridor.cpp#L356-L395).

En la autoridad, las dos posiciones centradas de zarzas adquirieron una ruta de tres puntos y 6,60 m con la puerta 1000000. El plan cruzó en x=-13,9496 en ambas. El control descentrado también pasó por su propio vano. En NVIDIA, el trabajador salió de z=11,8, cruzó z=8,2 con la hoja totalmente abierta y llegó a z=7,70 con Farm aún en marcha. El ticket 2 retuvo el cuerpo 1, la raíz 619 y sus 32 geometrías. La puerta conservó la raíz 474 y la geometría 202. El Host dibujó 142 veces con ese ticket sin errores y confirmó el drenaje. El máximo entre dibujos fue de 36,0 ms a 30 Hz. [Recibo](performance/native-farm-gate-aperture-20261121.json).

Los controles incluyen la ruta en ambos sentidos, invalidación de la ruta guardada tras instalar la puerta, reutilización estable de la caché en rutas alejadas, rechazo de una ruta central explícita, sólidos vecinos, cuerpos en el barrido y proxies sin propietario o de otra forma. Quedan la compra que obliga a relevar el corredor activo, la retirada preparada, los cruces integrados con tráfico o con Carry y C4.

Pasaron 62 pruebas de integración y regresión con standalone y 17 comprobaciones en pthread. El rechazo del corredor central explícito ocurre al intentar restaurarlo, antes de adquirir una ruta o activar su motor. Las pruebas dirigidas de los tres materiales y del barrido contra otro cuerpo pasaron con el binario candidato. La interfaz WASM conserva sus 772 exports standalone y 778 funciones públicas pthread. El factory y el Worker auxiliar conservaron sus bytes. [Hashes y resultados](performance/native-farm-gate-aperture-20261121.json).

La compilación Vite de producción con WebGPU Worker y dibujo remoto completó el empaquetado.

## Carry por el vano

El mijo maduró en el lado de entrada de la puerta y Game asignó Harvest. Carry16 adquirió el mismo cuerpo 1, la caja y el motor 1000000. Con la hoja abierta el trabajador pasó de z=8,28 a z=8,17 por x=-13,9496. En el control con WASM y Host determinista llegó al centro y generó un solo abono de 14 monedas.

En WebGPU físico, Carry dibujó el ticket 10 y llegó a x=-14, z=4,639. Settlement17 llamó al preparador de la Surface, que devolvió Native settlement gate graphics are not prepared porque el recorrido conserva el motor. La última publicación confirmada todavía contiene Carry. Queda preparar la entrega para el dueño exacto de la hoja y comprobar el cierre de Home con puerta. [Recibo de Carry](performance/native-ordinary-carry-gate-20261121.json).
