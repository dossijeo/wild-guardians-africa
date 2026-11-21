# Farm restaurado con una puerta existente

Una partida con Farm nativo y una puerta previa quedaba en `unsupported-cohort`. La sesión creaba dos barreras de marco y una envolvente de navegación. Al enlazar el motor nativo, el barrido tomaba por obstáculo la barrera 116, que pertenecía al mismo espejo de puerta 1000000 junto con 117 y 118. [Colocación y restauración anteriores](native-build-gate-20261121.md), [recibo de la incidencia](performance/native-farm-restored-gate-20261121.json).

`nav_gate_mechanism_install_owned` reconoce los tres proxies canónicos del propietario. Verifica identificadores únicos, dimensiones, máscaras y la fase de arranque antes del reloj causal. El barrido conserva la comprobación del marco, la hoja y los obstáculos vecinos. La retirada individual y por lote rechaza un proxy que aún pertenece a un mecanismo vivo. El lote comprueba todos los IDs antes de la primera mutación y permite la retirada después de liberar el mecanismo.

La autoridad instala las puertas intactas de los materiales móviles al cargar la partida. La ocupación nativa resuelve la apertura inicial cuando el guardado carece de ese dato. Game proyecta la apertura a partir del mismo tiempo de simulación. El ejecutor admite el avance de la cohorte cuando cada mecanismo conserva sus proxies y sus certificados vigentes. [Registro y proyección](../../src/simulation/simulation-authority.js), [requisitos del ejecutor](../../src/world/wild-engine/spatial-task-execution.inc).

Jolt encadena un filtro por identidad del cuerpo propio con los filtros de colisión existentes. OpenRA actualiza la ocupación de la huella según la apertura de la puerta. Wild Guardians reutiliza la propiedad por ID y la separación entre ocupación y apertura en el mecanismo que ya usa el motor. [Jolt CharacterVirtual](https://github.com/jrouwe/JoltPhysics/blob/v5.3.0/Jolt/Physics/Character/CharacterVirtual.cpp#L370-L376), [OpenRA Gate](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Traits/Buildings/Gate.cs#L60-L112).

## Validación física

Edge con NVIDIA Turing restauró un `youngMale` y una puerta de zarzas fuera del corredor de Farm. El ticket 2 se dibujó con el cuerpo 1. El trabajador avanzó 0,162 m con su raíz y los 32 propietarios de geometría originales. La puerta siguió visible con su raíz y geometría originales. Hubo cero errores WebGPU y el consumidor confirmó el drenaje. El mayor intervalo del Host en los 15 dibujos medidos de ese ticket fue de 33,5 ms a 30 Hz. Quedan la aceptación a 60 Hz, el cruce completo, la colocación de puertas nuevas y las pruebas con puertas dañadas, varios mecanismos u otros biomas. [Captura y alcance](performance/native-farm-restored-gate-20261121.json).

## Control de cruce

El control conservó la puerta legal en `x=-11.8, z=8.2` y desplazó el punto de partida del trabajador y la entrada del poblado a `x=-14.5, z=11.8`. WASM preparó 18,75 m de ruta con el motor 1000000. En el navegador, la adquisición se detuvo con `Native gate motor wall not resident` tras publicar las doce regiones visuales. El trabajador quedó en `pending-farm-arrival-resources`, sin primer dibujo de esa ruta. El siguiente paso del cruce es adquirir el motor sobre el grupo residente. [Recibo del control de cruce](performance/native-farm-restored-gate-crossing-baseline-20261121.json).

## Pruebas y binarios

```powershell
.cache/tooling/node20.exe --test tests/native-farm-restored-gate.test.js tests/native-gate-owned-proxies.test.js
$env:QA_GATE_PTHREAD='public/wild-engine/spatial-threaded.mjs'
.cache/tooling/node20.exe --test tests/native-gate-owned-proxies.test.js
Remove-Item Env:QA_GATE_PTHREAD
```

Los controles cubren una apertura ausente y otra guardada en 0,4, tres materiales con dos orientaciones, colisión con un obstáculo vecino, IDs sustituidos y retirada atómica. Se reconstruyeron standalone y pthread con Emscripten 3.1.64. La interfaz pública añade `nav_gate_mechanism_install_owned`. Se comprobaron los imports existentes y el sidecar pthread byte por byte. [Hashes y ABI](performance/native-farm-restored-gate-20261121.json).

Pasaron 76 pruebas del checkout que cubren las fronteras de puerta, barreras y asignación durante Idle22. Las 13 comprobaciones de propiedad también pasaron con pthread. La compilación Vite de producción completó el empaquetado.
