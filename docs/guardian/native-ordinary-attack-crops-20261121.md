# Primer golpe de AttackCrops en una partida real

La partida de Sabana del primer día ya contiene al facóquero `animal-396` entrando hacia `plant-373`. Con WASM y la autoridad de producción, el animal pasó de entrada a marcha, inició `attack-661` y aplicó un daño al cultivo en el instante 395,89 s. La autoridad emitió un único `AnimalLogicalHit` para ese ataque y redujo el presupuesto de golpes de dos a uno. [Recibo de autoridad y dibujo](performance/native-ordinary-attack-crops-20261121.json).

El canal de control existente recibió la ruta nativa y sus transiciones. En el tramo observado hubo 169 publicaciones con movimiento del actor, ninguna adquisición de paquete de mundo nativo y ningún programa de marcha en el permiso inicial. La selección y la intención usan WASM. La locomoción ordinaria todavía ejecuta `walkTo` y la acción confirma el daño en Game. Queda conectar la ruta reservada y el cuerpo en el dibujante antes de acreditar A.

OpenRA hace que la actividad de ataque solicite al mismo ejecutor movimiento hasta el rango útil. Al llegar comprueba rango y orientación antes de disparar, y Armament consume la acción demorada en el reloj de simulación. Wild Guardians puede mantener su selección, reserva y programa de ruta existentes y transferir la pose terminal al dueño de `attackId` que ya aplica el daño. [OpenRA Attack](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Activities/Attack.cs#L190-L234), [OpenRA Armament](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Traits/Armament.cs#L193-L229).

## Dibujo del recorrido heredado

Edge en NVIDIA Turing dibujó el facóquero de la partida a 640×480 y calidad `muy_baja`. Las capturas durante el recorrido conservaron la raíz y los cuatro IDs de geometría originales. El Host hizo 138 dibujos en el intervalo de la primera acción. La publicación posterior contiene dos golpes con identificadores y cultivos distintos. El primero coincide con el daño y la mutación del control de autoridad. El consumidor drenó sin errores.

El mayor intervalo observado tras reanudar fue 48,7 ms a 30 Hz. La causa queda por localizar. Esta prueba deja pendientes la locomoción causal en GPU, C4 y las adversidades A–F. [Recibo de dibujo](performance/native-ordinary-attack-crops-20261121.json).

Pasaron 47 pruebas de control de rutas, programación de marcha y daño agrícola. El control de recarga ahora registra el plan diario consumido por la incursión antes de guardar. Así comprueba que el ataque guardado aplica su daño una sola vez al reanudar.
