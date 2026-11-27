# Guardado con la hoja del portón detenida a media apertura

En Desierto 983, Stop24 puede dejar la hoja de zarzas inmóvil con una apertura intermedia. El guardado público acepta esa apertura con Home18 pendiente, con ambas rutas adquiridas si dejan el portón fuera de sus reservas, y con el trabajador ya refugiado tras Home19. La autoridad exige una muestra WASM del mismo instante, con apertura y objetivo iguales al valor de Game y con el motor ya detenido. El archivo conserva la identidad de la hoja y su apertura exacta.

La recarga instala la geometría en esa posición. El tramo corto de Home se aleja del portón y conserva su hoja como geometría estática. Si ese tramo ya estaba adquirido, el archivo declara que Home no poseía esa reserva y la autoridad exige la misma condición al preparar el corredor restante. Al terminar la incursión, Farm23 vuelve a adquirir el motor del mismo portón para atravesarlo y llegar a Idle.

## Recarga en NVIDIA

Las tres recargas conservaron la apertura de `structure-1000000` en 0,3158244453326701. En la malla visible se midió 0,3158244164267268 a partir del desplazamiento del vértice 4365. El animal empezó a edad relativa cero en las tres y Home también lo hizo cuando estaba presente. Las tres readquirieron el mismo portón al volver a Farm, confirmaron cuatro golpes al centro, conservaron el saldo y drenaron Draw.

| Corte del guardado | Tiempo | Primer envío | Llegada a Idle | SHA-256 del recibo |
| --- | ---: | ---: | ---: | --- |
| Home pendiente | 10,60 | 20 | 70,05 | `3d74433e267bcba0a8d3d001d8d4c5f8c49f63c6eb608151292973aea551d678` |
| Home y aproximación adquiridos | 10,80 | 17 | 70,30 | `b1ca0679e8105b3a86819c9d842d8c882aee6e9cc4abbe19d4fe0b4c9cb28937` |
| Trabajador refugiado tras Home19 | 10,96 | 23 | 70,61 | `71150403af2ebc171ec56ce24f908b260642f5088e5f36b1843ce0892f033005` |

Los guardados proceden del coordinador público en CPU. El Hosted Worker los leyó con sus opciones persistidas. La sonda `.cache/make-desert-frozen-gate-audit.mjs` lee el vértice de la hoja estática residente y comprueba la referencia del motor que se adquiere al volver. Los recibos están en `E:/wild-guardians-qa/native-menu-20261126/desert-frozen-gate-{pending,active,refuge}-nvidia.json`.

## Regresión

```powershell
node --test tests/native-desert-gated-flight-checkpoint.test.js
```

Los controles de CPU generan sus guardados mediante el coordinador público. Rechazan la apertura adulterada y, en el corte activo, también el identificador alterado y la falta de la declaración de que Home dejó la hoja fuera de sus reservas. Retienen READY después de cargar y al esperar conservan la pose, las fases y la apertura exacta. Los tres confirman cuatro golpes, 520 HP restantes en el centro, un único regreso y el saldo original. Pasaron 72 pruebas de regresión y las seis pruebas del archivo de Desierto en la versión final. El build de producción terminó en 48,47 s y empaquetó los dos WASM de `94c7df129` byte por byte.

## Portón en marcha antes de Stop24

El guardado durante el movimiento del motor sigue pendiente. A t=10,52, el trabajador espera en el vano con la asignación Farm23 y su reserva de la hoja. La apertura es 0,24915777866600486. WASM conserva el inicio de apertura en 10,370505332800386 y el final en 10,970505332800386. Stop24 tiene READY retenido y el coordinador devuelve `physics-active`.

Dos controles conservaron esa asignación mientras avanzaba el reloj. Al soltar READY en t=10,60 el trabajador seguía quieto. Al soltarlo en t=11,08 ya había reanudado la marcha y avanzado 0,118 m. Ambos readmitieron Stop24 con el ticket preparado 3 y el adquirido 4. El Host con cola determinista presentó el paquete 2 en cada caso. El recibo de Stop24 identifica el mismo motor y acredita su apertura en el GO, 0,3824911119993354 en el primer recorrido y 1 en el segundo. Desde ahí vuelve a estar disponible el guardado público de Home pendiente.

El cargador civil, sobre una copia de la que se retiró la incursión para aislar Farm23, reconstruyó la apertura inicial y la hora final de apertura. Al recomponer desde el corte, 30 valores de pose de las 36 muestras nativas cambiaron en los últimos bits, incluidos la fase de marcha y los ejes X y Z. La apertura calculada a partir del motor rebasado difirió también en el último bit a t=10,54. En otro control, el guardado público original a t=10,00 reprodujo el mismo nacimiento de la incursión y llegó a t=10,52 con los seis nudos, el motor y las 36 muestras futuras exactos. La recarga en el corte deberá reconstruir ese programa de Farm y del motor, readmitir su reserva y publicar los recursos del mundo antes de volver a preparar Stop24 para el mismo `RaidSpawned`.

Los controles usan Game, el WASM de `58fbcb47d`, ambos puertos y el Host con cola GPU determinista. Los recibos `desert-moving-gate-stop-hold.json` y `desert-moving-gate-stop-through-aperture.json` están en `E:/wild-guardians-qa/native-menu-20261126`, con SHA-256 `434c38fd763156de1083e0d4b6dd3c4c31912813fda39359fb2fdbdc774aa842` y `069cc3511b12d161adf1f6893fc5c1392dce713085f481cd645bb6f88d9265a9`. Los controles locales `.cache/desert-moving-gate-stop-{observe,control}.mjs` usan la partida `gated-flight-physical-input.json` con el nacimiento a +0,50 s. El argumento `--through-aperture` prolonga la retención hasta t=11,08. Este contraste todavía deja pendiente la recarga en t=10,52 y su validación física.
