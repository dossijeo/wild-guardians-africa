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

El guardado del motor mientras sigue su trayectoria queda pendiente. El control anterior a confirmar Stop24 conserva una apertura de 0,24915777866600486 a t=10,52, un objetivo de 1 y el final previsto a t=10,970505332800386. La solicitud de guardado se rechaza con `physics-active`. El recibo `desert-inflight-gate-before-stop-cut.log` conserva el motivo y la propuesta Stop24 retenida.
