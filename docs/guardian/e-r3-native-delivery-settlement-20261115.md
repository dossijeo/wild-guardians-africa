# Relevo de llegada de Carry y liquidación nativa

Continuación de los [datos de entrega](e-r3-native-delivery-consequence-data-20261115.md) y del [consumidor Harvest → Carry](e-r3-native-consequence-presentation-20261115.md), bajo el [plan principal](integrated-gpu-migration-plan-20261104.md). El alcance es el propietario autoritativo y la proyección de fuente. La preparación gráfica de la presentación posterior sigue pendiente; no se activa la entrega en producto ni cambia ningún cierre A6.

## Observación coherente de una liquidación

Se leyó [Flecs v4.0.4, `flecs_stage_merge`](https://github.com/SanderMertens/flecs/blob/v4.0.4/src/stage.c#L69): aplica las operaciones diferidas y después evalúa monitores. Se adapta la distinción entre modificar el estado y notificar sobre el resultado. No se incorpora Flecs ni otra cola de eventos.

`transact` mantiene el cálculo racional, redondeo a monedas enteras, identidad idempotente y notificación ordinaria inmediata. El propietario de una consecuencia puede proporcionar un callback para capturar esa única notificación y usar `notifySettlement` cuando su resultado completo sea observable. Es un dato local de la llamada síncrona, no una cola o transacción económica alternativa. La configuración se comprueba antes de escribir; sin fondos no se confirma ni se notifica.

Las tres pruebas de `settlement-notification.test.js` comprueban el comportamiento ordinario, la captura del valor ya redondeado y su observación posterior, la idempotencia y el rechazo sin escrituras. La proyección nativa de entrega usa este callback para que los observadores vean conjuntamente ledger, potencia, caja, trabajador y tutorial.
