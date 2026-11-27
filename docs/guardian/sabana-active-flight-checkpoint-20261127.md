# Guardado de una huida activa en Sabana

El guardado público admite el tramo con Home18 y la aproximación del facóquero ya adquiridos. El corte exige una muestra del mismo instante de los dos programas nativos. Persiste el evento `RaidSpawned`, las dos poses y fases, el refugio, el blanco reservado y los puntos restantes de ambos corredores. La partida conserva el contrato, la persona y el saldo. Las generaciones, los tickets y los identificadores de cuerpos se asignan al crear la autoridad nueva.

WASM vuelve a comprobar el corredor de Home desde el origen guardado hasta la entrada del poblado. La preparación de Home18 y del animal usa la comprobación de separación existente, que protege también el origen de un actor cuando todavía está esperando READY. Draw acepta el par en su primer `IntentBaseline` si la solicitud Home v2 y la solicitud del animal pertenecen a la misma autoridad y sesión, identifican el mismo nacimiento de la incursión y usan cuerpos distintos. Cada ruta adquiere su propia preparación de recursos. Tras llegar a casa, Home19 retira ese cuerpo y el regreso civil consume ese recibo de la nueva época.

## Verificación

El control anterior captura t=604,40, con edades presentadas de 0,05 y 0,15 s, y devuelve `physics-active`. El control nuevo verifica la recarga con blanco de centro y de cultivo. Retiene el primer READY y comprueba que ambos actores conservan pose y fases durante la espera. Confirma que el par se presenta en la nueva época, que los dos golpes se aplican una vez y que la misma persona vuelve a Idle. Un tercer recorrido guarda en pausa y adquiere Home antes de la aproximación. Una fase alterada en disco y un `RaidSpawned` sustituido en el canal de Draw se rechazan.

Pasaron 64 de 64 pruebas dirigidas. El recibo `savanna-active-flight-impact.tap` tiene SHA-256 `87eb72dd922946a399c79d0bb29cd640a0d1f28d463e2577e74d39a3f24135a2`. El build web de producción terminó en 58,26 s.

```powershell
node --test --test-name-pattern='rebuilds both moving flight corridors' tests/native-farm-raid-flight-savanna.test.js
```

## NVIDIA

La autoridad Hosted guardó la persecución hacia `plant-5` en t=611,55 con el trabajador en plena huida. En la recarga desde esos bytes, el primer envío que contiene ambos relojes fue el 68, con edades 0 y 0. Después se presentaron edades de 0,35 s en ambos. Home19 retiró el cuerpo a t=614,40. `plant-5` y `plant-7` recibieron un golpe cada uno. Farm consumió la retirada 7 de Home19 a t=674,60 y `person-9` volvió a Idle a t=707,35. El saldo quedó en 190, sin heridas ni errores de Draw, y el consumidor drenó.

La primera ejecución del arnés dejaba el reloj en suspenso mientras esperaba la segunda adquisición. Surface aún esperaba la publicación del primer GO. El control positivo envió un snapshot ordinario entre las dos adquisiciones con el reloj suspendido. La aplicación activa su reloj después de adjuntar los recursos, antes de esperar adquisiciones posteriores. Se reutilizó el mismo archivo físico al repetir la carga.

Los recibos están en `E:/wild-guardians-qa/native-menu-20261126`. La recarga física de cultivos `savanna-active-flight-crop-reload-nvidia.json` tiene SHA-256 `04277f887e53a6bd268c8e2f7383e82eddf06cf05142dfa0cc13b8e33cafc894`. Su guardado `savanna-active-flight-crop-nvidia.save.json` tiene SHA-256 `9bd17c2854514e643b46775bf01b8b4be952600a1bbd36b9521d3d99e47dd489`. La receta local está en `.cache/make-savanna-active-flight-audit.mjs`.

La recarga con blanco `structure-2` leyó el guardado del control integrado de CPU en t=604,45. NVIDIA presentó los dos escalares a cero en el envío 69 y después escribió 0,30 s para ambos. Home19 retiró el cuerpo a t=606,60, los golpes dejaron 560 y 540 HP, y Farm consumió el recibo de retirada 7 a t=645,30. La persona original llegó a Idle a t=678,20. Draw drenó sin errores. El recibo `savanna-active-flight-center-reload-nvidia.json` tiene SHA-256 `3a630891c86b5b36b4ff338a9fff7e33fbf5143d0280e06d88cc1366eaa4b3db` y su insumo `active-savanna-save-center.json` tiene SHA-256 `ee2759de225a4ce2b4488e0baa9b5452a626e4213b9eef1846f8c224e8a6434d`.

Standalone y pthread conservan las importaciones y añaden `nav_intent_restore_raid_flight_home`. La prueba pthread invoca la función y comprueba que un corredor ausente se rechaza.

Este recorrido cubre Sabana con un trabajador sano, un facóquero, un centro en pie y ningún portón ni Escudo activo. El control determinista inicial de Desierto a t=13,76 rechazaba el mismo corte con `physics-active`. El incremento siguiente aceptó la recarga de ese caso con el portón totalmente abierto. [Guardado de la huida activa con portón](desert-active-gate-checkpoint-20261127.md).

El corte durante Stop24, las cohortes con contacto y la pérdida de dispositivo durante una preparación fría siguen sujetos a sus propias pruebas. Se mantienen abiertos los criterios de A6, B y C.
