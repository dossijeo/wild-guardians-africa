# Regreso civil después de la incursión de Sabana

Este control continúa la historia del día 2 de Sabana 712 en el perfil DEV de dos cuerpos. El facóquero sale tras los dos golpes, Game publica `RaidEnded` y el trabajador contratado regresa al centro desde el refugio (60, 0).

Home19 da de baja el cuerpo de huida. La nueva declaración Farm23 acredita la sesión, el actor y la secuencia de esa baja. La autoridad conserva posición, orientación y fases al admitir otro cuerpo. El orden entre el último paquete de Retreat y la captura civil puede variar. El Host acepta la preparación civil sobre el último Retreat únicamente al comprobar su revocación y la solicitud civil vigente. Las reglas ordinarias de Game determinan el turno y el cobro.

## Reproducción

Con los WASM de esta revisión, desde la raíz del repositorio:

```sh
node --test --test-name-pattern="paid civilian" tests/native-farm-raid-flight-savanna.test.js
```

El control usa el fixture pagado `sabana712-day2-farm-before-raid.json.gz`, WASM y ambos puertos de producción con el dispositivo gráfico de prueba. Dos órdenes de publicación deben llegar a Idle con el mismo trabajador, el libro de cuentas intacto y movimiento sin urgencia. El tercer ensayo envía una retirada ajena y exige un rechazo explícito antes de adquirir el segundo Farm23. La base 533583f0 falla los tres ensayos al avanzar la cohorte después de la incursión.

En el arnés físico de Sol, comparar `sourceRequest.version === 2` y `sourceRequest.refugeSequence` con el `retiredSequence` de Home19. Comprobar el último dibujo de Retreat y el primer dibujo sin su binding, el origen del nuevo Farm23, las primeras fases y su presentación hasta Idle. Registrar por separado las mediciones de cadencia.

El alcance queda limitado a la cohorte DEV con un civil de turno y retorno desde Home19. Quedan fuera la activación ordinaria, AttackCenter, Recovery y el guardado durante esta transición.

## Referencias de implementación

Detour retira el agente del conjunto activo y reconstruye su corredor y velocidad al admitirlo de nuevo. Aquí esa separación permite conservar a la persona y verificar la nueva identidad física. [DetourCrowd v1.6.0, addAgent y removeAgent](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L482-L545)

OpenRA vuelve a consultar el estado al seleccionar la actividad tras finalizar un hijo. Aquí Game decide quién vuelve tras la incursión antes de emitir la declaración nativa. [OpenRA, FindAndDeliverResources](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Activities/FindAndDeliverResources.cs)
