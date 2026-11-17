# Parada preparada nativa de una llegada Farm en movimiento

Continúa la [adquisición Farm23 en Surface/Workers](e-r3-native-farm-arrival-route-surface-20261117.md), según el [plan principal](integrated-gpu-migration-plan-20261104.md). La fuente nativa admite ahora una parada explícita **Farm24** sobre el mismo cuerpo y slot. Es el fundamento del relevo durante movimiento: todavía faltan su contrato de datos, proyección, control, puertos y consumidor gráfico antes de conectarlo a la prioridad Task/Home de Game. A6/A/B/C siguen abiertos; D no se inicia.

## Investigación incorporada

Se inspeccionan las implementaciones reales de [DetourCrowd v1.6.0, `requestMoveTarget` y `resetMoveTarget`](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L607) y [Godot 4.4, `_transition_to_navigation_finished`](https://github.com/godotengine/godot/blob/4.4/scene/3d/navigation_agent_3d.cpp#L920). Detour cambia el estado de la solicitud y la velocidad deseada sobre el agente existente; Godot finaliza la navegación y actualiza las velocidades sobre el agente existente. No necesitan reconstruir el agente para terminar o sustituir su objetivo. Las copias oficiales consultadas coinciden con las inspeccionadas previamente; sus SHA-256 constan en la evidencia.

Se adapta ese patrón al mecanismo que Wild Guardians ya posee: parada preparada del propietario nativo, revocación de su generación ejecutable y conservación del cuerpo. No se añade motor, dependencia, cuerpo, controlador, caché de rutas o registro paralelo. La distinción de fuente permanece explícita: Farm24 sólo puede parar Farm23; no toma prestada la identidad de un paseo Idle12.

## Núcleo compartido y frontera preparada

La instrucción de mundo24 lleva la misma identidad acotada de propietario que la parada12: sesión, actor, slot, generación y secuencia de asignación. Valida la asociación Farm actual, el cuerpo ejecutado y la posibilidad de suspender una ruta todavía en movimiento. Las familias de movimiento13–23 siguen excluidas del formato de instrucciones de mundo. Una Task14 no puede servir de fuente para24 y Farm no pasa por12.

Se comparte el núcleo existente de preflight, cierre de discos retenidos/puertas, suspensión, revalidación y recibo. La estructura privada antes dedicada al paseo se denomina `WorkerRouteStopDraft`; sigue habiendo un único candidato y un único origen preparado acotado. Los exports y la validación de Idle12 conservan su contrato anterior. El export de traducción Farm sólo devuelve información para24; el de Idle sólo para12.

Preparar o cancelar no cambia la trayectoria, el cuerpo, el RNG de Game ni la semántica del trabajador. Mientras se preparan recursos, el cohort nativo puede seguir avanzando. La revalidación vuelve a probar la fuente y calcula la pose física final. Sólo permite consumir el ticket preparado anterior si se conservan exactamente sus propietarios de rutas y motores. Un cambio de intención, frontera física posterior, llegada completada o ticket ajeno impide adquirir la parada antigua.

Al comprometer se mantiene el slot original, se incrementa su generación y se revoca el handle ejecutable anterior. El mismo cuerpo queda suspendido en la pose ejecutada, con fases y presupuesto reales; el peer Task genuino sigue avanzando. La publicación24 tiene cero cambios de geometría y conserva las revisiones canónicas del terreno. Su recibo enlaza el ticket/frontera preparados y los realmente comprometidos. La llegada cero o ya completada no se transforma en una parada de movimiento.

## Evidencia y alcance

La [evidencia](performance/native-farm-arrival-stop-source-validation-20261117.json) registra los dos módulos recompilados, los 64 inputs/artefactos nativos congelados, las 17 pruebas nuevas, las 40 pruebas dirigidas de Farm/Idle-stop, regresión compartida y build. Se prueban los cuatro perfiles en standalone y pthread, preparación/cancelación, conservación de cuerpo/slot, avance independiente de Task, revalidación tardía, recibo ligado al ticket preparado, identidades/familias incorrectas, frontera obsoleta, llegada durante preparación, llegada cero y cambio de intención.

El helper usa la ABI nativa confiada y cuerpos/rutas reales. No fabrica un recibo GPU ni un relevo de Game; la semántica JS se conserva deliberadamente en este test de fuente. Después de parar Farm, `nav_intent_game_execution_state()` sigue devolviendo `-1`, pues aún falta su proyección de cuerpo retenido y los relevos. No se anuncia una capacidad gráfica de parada Farm ni se abre el productor ordinario.

Como control de no vacuidad, un loader ESM de sólo lectura carga el WASM standalone anterior para la prueba de revalidación24, sin tocar el WASM del árbol. Farm23 se adquiere con normalidad, pero la instrucción24 todavía no existe y el test falla al recibir `-1` en lugar de `1`. El código actual pasa la misma prueba. Ese fallo intencionado queda fuera de la regresión final.

La validación de hardware Farm23 del incremento anterior sigue siendo histórica: este incremento aún no tiene un consumidor gráfico24 que pueda medirse. No se repite una ruta23 para presentarla como evidencia de parada24. Permanecen abiertos los huecos de 172,74 ms de aquella medición, la planificación de preparación bajo carga y la recuperación incremental integral de los 3.123 recursos. Se preservan los 16 archivos locales ajenos y el worker pthread generado que ya estaba sin seguimiento.

Se continúa con la asociación tipada y la proyección del cuerpo Farm retenido, después control/admisión/publicación/puertos/consumidor del relevo. La asignación Task de `arriving`, incluida la maduración de cultivos durante el tick, debe conservar su prioridad original. También quedan el endpoint hacia Idle/Task/Home, alternativas/cohort, contratos/puertas/raid, productor integral, guardado UI y aceptación integrada A/A6/B/C.
