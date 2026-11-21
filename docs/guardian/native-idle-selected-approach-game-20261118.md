# Game y restauración de aproximaciones con remaining real — 2026-11-18

Continuación de `504b73baa`, A6-04.f-R3/e-R3. Se conecta la variante con tiempo WALK real a la proyección, guardado público y restauración de Game sobre el propietario nativo existente. La admisión gráfica y el productor/cohort ordinario siguen pendientes. A6/A/B/C abiertos; D no iniciado.

## Investigación aplicada

Se leyó código real de [DetourCrowd v1.6.0, addAgent/requestMoveTarget](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L511-L637). `addAgent` reinicia corredor/frontera/velocidades y deja el estado del objetivo en NONE; `requestMoveTarget` registra el destino y reinicia su referencia de consulta pendiente. La solicitud pasa después por la cola/revalidación. Se adapta esa separación dentro de la solicitud fría ya existente: conservar valores semánticos no restaura un corredor, handle ni permiso. No se incorpora Detour, su ajuste de posición a navmesh ni un propietario/cola alternativos. Snapshot original y hash en la evidencia.

Se mantiene la discriminación explícita de formatos ya contrastada con GLTFLoader r180. La lectura ampliada es una proyección de datos del mismo registro nativo, no un protocolo paralelo de admisión. El comportamiento original de `src/simulation/idle.js` exige conservar remaining durante WALK y consumir el sorteo REST de `cancelWalk` al terminar/fallar.

## Implementación

- La primera proyección desde el 21 terminado admite su fase estacionaria con remaining/RNG exactos y retry agotado, conservando ancla y pose. La proyección móvil/retenida conserva destino de aproximación, tiempo WALK y fases ejecutadas. La proyección posterior y la preparación del REST rechazan un remaining diferente del propietario nativo.
- El guardado transporta el valor semántico finito/representable no negativo, incluido cero. No añade handles ni referencias nativas al snapshot. La autoridad nueva valida antes de normalizar, declara el mismo WALK pendiente y exige enlazar cuerpo/admitir recursos de nuevo. El cuerpo queda quieto durante la espera; la llegada observa el sorteo REST original.
- El mismo `NativeIdleStrollResourceRequest` recibe un escalar opcional. La capacidad `nav_idle_stroll_restore_state_version() === 1` y la entrada `nav_intent_restore_idle_approach_state(...,walkRemaining)` preservan el valor explícito. La declaración repetida idéntica es idempotente; valores no representables, negativos, reemplazos o un alta vieja que perdería el escalar se rechazan.
- Request/declaration versión 2 exige aproximación y `walkRemaining`; la versión 1 rechaza ese campo y conserva su forma. Los getters individuales distinguen 29/30 campos. El lote ampliado `nav_idle_stroll_restore_state_requests_snapshot` comparte vector/puntero, emite filas de 30 y conserva filas antiguas mediante discriminador/padding cero. El getter antiguo mantiene sus 29 campos y rechaza un lote que contenga una fila nueva, evitando truncarla silenciosamente.
- El 22 restaurado conserva marcador semántico 2 y WALK remaining en [20], con origen frío verdadero versión 2 y ciclo cero. El 22 seleccionado mantiene su 21 verdadero. No se inventa un 20/21/23 ni una cadena de permisos. La referencia versión 2 admite ahora ambos orígenes explícitos y rechaza mezclar request viejo/tiempo nuevo. Se revalida desde la solicitud fría cuando corresponde, conservando ticket preparado y valor.
- Un WALK guardado con tiempo de nacimiento equivalente sigue usando la entrada/formato anteriores, sin alterar su significado. El paseo local mantiene remaining cero y sus restricciones de radio. La restauración y el fallo de una solicitud explícita usan el mismo `cancelWalk` original.
- Se actualizan dos expectativas históricas del transporte: cero es un dato semántico válido, mientras que un tiempo negativo o un binding inyectado son inválidos. Una comprobación nueva demuestra que transportar cero no puede sustituir el remaining del propietario Farm activo: la proyección lo rechaza y conserva cuerpo/binding.
- Home conserva el requisito de parada preparada antes de interrumpir una ruta activa. Estas pruebas preparan/confirman esa parada existente antes del relevo. Programar la parada gráfica ordinaria sigue perteneciendo al trabajo de control/productor pendiente; no se elimina el gate de retorno de Game.

## Validación

- **22 pruebas nuevas**: 21 de Game y una comprobación adicional de dato semántico frente a propietario Farm activo; dos expectativas históricas actualizadas. Cuatro perfiles normal/pthread recorren 21 seleccionado→22→guardado público→autoridad nueva/request explícito→22→REST21. Se cubren cero, WATCH, carga antes de enlazar cuerpo/dentro del ancla/en llegada, mezcla de filas, idempotencia, sustitución de tiempo/RNG/retry, fallo de camino, retiming y Home después de parada preparada.
- Baseline con WASM anterior en solo lectura: **4 fallos esperados por capacidad ausente, 17 filtrados, 0 pases**. Pasan **720 dirigidas en 40 archivos**, **3.265 de 3.266 seleccionadas en 276 archivos**, una comparación opcional omitida y siete exclusiones históricas; no es toda la suite del repositorio. Build **49.24 s**. Se conserva el primer resultado amplio con dos expectativas antiguas fallidas y la prueba corregida del propietario, sin cambiar código de producción para adaptarlo a esas expectativas.
- Ocho registros originales de Game/save/admisión nueva conservan WALK remaining **11.149999856948853** frente a nacimiento **7.599999904632568**; la llegada genera REST **11.399999856948853** con el sorteo privado original. Otros dos registros normal/pthread conservan **cero** al cargar. El RNG global no cambia y hay un cuerpo por autoridad; las épocas son distintas y no se reutilizan permisos antiguos.
- Compilación canónica normal/pthread: **461 inputs finales /64 nativos compilados /16 ajenos exactos**. Cambian siete archivos nativos (cuatro fuentes/script y tres salidas); los 61 inputs de compilación permanecen exactos. Se instala solo el trío propio; dummy worker ajeno intacto. El recibo final incluye los 40 entrypoints dirigidos.
- GPU NVIDIA, solo regresiones heredadas: 22→21 mantiene **100/98** preparados y cero tardíos, IDs inmutables/picking/adopción/drain; ventana máxima **178.155 ms**, 3 huecos >50; global **178.155 ms**, 5 huecos >50.
- Farm23→aproximación22→REST21 mantiene **102/70/98** preparados, cero tardíos/duplicados y retirada; ventana máxima **140.470 ms**, 3 huecos >50; global **140.470 ms**, 6 huecos >50. Todas las muestras se conservan, sin atribuir causa ni declarar cadencia aceptada.

[Evidencia, fuentes, compilación, pruebas, registros de Game y muestras GPU](performance/native-idle-selected-approach-game-validation-20261118.json).


## Alcance y próximo punto

El montaje usa Game.tick real, la pose/fracciones/ancla de un WALK ejecutado original y commits ABI de confianza sobre terreno mínimo de fixture. No sustituye la admisión GPU por un recibo ficticio y no es una prueba del productor ordinario. Las regresiones GPU heredadas de este paso tampoco acreditan permiso/dibujo del nuevo marcador 2.

Continúa el control/roster/actor residente y Surface/GPU para las dos procedencias del descriptor con remaining: 21 seleccionado y carga fría explícita. Siguen REST/WATCH exterior guardado desde un 20 genuino, productor/cohort ordinario y sus paradas/relevos, recuperación incremental de 3.123 recursos y cadencia/plataforma. No se cierra ningún gate A6/A/B/C ni se inicia D.
