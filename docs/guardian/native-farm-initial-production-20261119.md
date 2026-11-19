# Inicio Farm conectado al productor ordinario

Farm13 ya podía adquirir su ruta23 por la operación preparada, pero el productor ordinario no la seleccionaba. Se conecta esa petición física real al mismo despachador que Idle, Home y Task. El roster Farm de SimulationAuthority sigue cerrado hasta validar también el sucesor terminal y el ciclo completo.

## Referencias y decisión

Antes del cambio se leyó [DetourCrowd 1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp), updateMoveRequest (638–791) y resetMoveTarget (609–622): estado de petición en el agente, resultado asíncrono comprobado contra el corredor original. Se adapta ese criterio al despachador ya existente; no se incorpora su cola, navegación, polling ni reintentos. También se leyó [NavigationAgent3D 4.4.1](https://github.com/godotengine/godot/blob/4.4.1-stable/scene/3d/navigation_agent_3d.cpp#L843-L857) para contrastar la distinción llegada/finalización antes del siguiente punto terminal, aún pendiente.

El único cambio de producto son dos entradas en el módulo existente: seleccionar Farm pendiente con su petición vinculada real y registrar petición+urgencia en la identidad del intento. Utiliza urgentWork sin cambiar su regla, startNativeFarmArrivalAfterGpuQuiescence y la preparación de recursos Farm ya implementados. Una variación de fuente, urgencia, Home o disposición cancela el intento en la frontera existente. Cuerpo frío, publicación incoherente, recursos ocupados y terreno no publicado siguen esperando. No hay dependencia, cola, reloj, dueño, reconstrucción de mallas ni ABI nuevo.

## Validación ejecutada

Los mismos 16 casos finales contra el módulo anterior dan 5 pases y 11 fallos; con la conexión pasan 16/16. Cuatro perfiles y marcha/urgencia adquieren la23 real por ambos MessageChannels, con controlador, fuente C++ y operación de commit reales. Conservan petición original, cuerpo, fases y RNG; una ruta adquirida no se vuelve a despachar. Urgencia, Home y cierre invalidan la preparación real sin adquirir23. Cinco casos esperan petición/cuerpo, publicación, recursos o terreno. ACK de GPU y recursos son dobles explícitos: esto prueba la conexión del productor, no hardware, cadencia ni el roster ordinario.

El harness adapta únicamente la vista de coherencia del publicador de bajo nivel a partir de sus ACK reales y conserva su identidad. El intento inicial de clonarlo fue rechazado por la guarda de consumidores, que no se cambia; también se corrigió la lectura de motionFlags frente al campo runDistance de una propuesta distinta. El primer baseline se detuvo por una espera de fixture sin límite; se sustituyó por espera acotada y no se cuenta ese parcial como ejecución completa. Se archivan los diagnósticos.

La selección relevante completa pasa **1241/1241** en **64 archivos**, sin fallos ni omisiones, en 173.797s. Incluye todas las pruebas Farm, productor de autoridad, suspensión/lifecycle, pausa, piso de publicación y checkpoint. Las tres exclusiones históricas de host/timeline permanecen abiertas; esta selección no las revalida ni sustituye la selección mayor de ef8c27b97. Dos sintaxis pasan. Build WebGPU/Worker con dibujo remoto: exit0, 57.361s; advertencia conocida de chunks. **640 entradas** fijadas, 64 entradas nativas sin cambios, 16 archivos ajenos y 38 rutas A5 externas intactos. No se reconstruye WASM porque sus fuentes y outputs permanecen iguales.

No se ejecuta GPU nueva para estas dos entradas de despacho. La evidencia hardware de [Home desde Farm pendiente](native-farm-pending-home-20261119.md) y de las adquisiciones Farm previas conserva su alcance original; no acredita automáticamente esta integración. Tampoco se declara resuelto el problema de las 3.123 reconstrucciones, minimalidad de todos los recursos ni cero tirones por estos tests.

## Siguiente punto pendiente

Conectar Farm23 terminada a Idle21 o aproximación22 utilizando el lector de fuente/anchor y las operaciones existentes, respetando prioridad de tarea y Home. Probar el ciclo completo antes de habilitar Farm en el roster ordinario. Después siguen nacimientos/cohortes, independencia de lotes, fallo de consumidor/dispositivo, coste de pausa/VFX y aceptación integrada/cadencia/plataformas. A6/A/B/C siguen abiertos, D no iniciado; f-R3 conserva su cierre de seguridad acotado.

[Recibo y hashes](performance/native-farm-initial-production-validation-20261119.json).
