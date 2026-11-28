# Home desde una Farm pendiente de adquisición

El contrato puede vencer mientras Farm13 espera su primera adquisición gráfica. Esa llegada ya tiene intención y, en su caso, cuerpo; todavía no posee una ruta Farm23. Game rechazaba tanto la expiración por día como el cruce de la hora de salida. Se retargetea ahora esa fuente real a Home19 sobre el mismo propietario y se espera la adquisición preparada18 para moverlo. Este requisito del ciclo completo se resuelve antes de abrir el roster Farm ordinario; no sustituye la conexión inicial/terminal de su productor, aún pendiente.

## Referencias y mecanismo

Antes del diseño se leyó código real de [NavigationAgent3D de Godot4.4.1](https://github.com/godotengine/godot/blob/4.4.1-stable/scene/3d/navigation_agent_3d.cpp): set_target_position, _request_repath y _update_navigation. Conserva agente y padre al cambiar el objetivo, invalida el trayecto y distingue llegada de finalización. Se adapta esa separación y el patrón local ya existente de petición Stroll restaurada→Home. No se incorpora su algoritmo de navegación ni otra máquina de estados, dependencia, cola, reloj o propietario.

El nuevo export nav_intent_pending_farm_home_request exige la Farm pendiente actual, actor/sesión/secuencia, objetivo válido y ausencia de tarea asignada. Mantiene pose, radio, flags, fases, presupuesto y cuerpo, o la declaración sin cuerpo. Añade una secuencia privada de procedencia Farm a la petición Home existente para su idempotencia. Solo cancela el candidato23 que proviene de esa misma petición y comprueba la fuente antes de cancelarlo; las demás propuestas conservan su guard. No crea una Farm23 terminada, una parada24, un Idle ni un settlement ficticios.

El lector retenido de Game puede proyectar la petición Farm existente al vencer el contrato; declarar o adquirir una Farm nueva continúa exigiendo contrato válido. Game reconoce su frontera de retorno, declara Home antes de otro avance y también lo hace si la hora de salida llega antes del primer cuerpo. Ese primer bind pertenece después a Home; no se reinicia el mundo ni se recrea un cuerpo. El controlador acepta19 desde13 únicamente con evento, fuente, secuencia, cuerpo y pose exactos. Home18 conserva su preparación, reloj, ACK e instalación tipados originales.

## Validación

El control inicial registró 41 fallos antes de la implementación. Incluye el rechazo real de la expiración y diagnósticos de fixtures después corregidos: la preparación Farm inicial apuntaba fuera del dominio residente y la prueba por hora vencía simultáneamente el contrato de un peer Task cuya salida sigue sin migrar. Se usa el corredor residente existente y se aísla la salida por hora del actor; la independencia del peer permanece en las pruebas por día. El reloj del fixture gráfico se confirma antes de preparar Home, como en sus fixtures anteriores. Un evento duplicado del controlador sigue rechazándose: no se hizo idempotente el cursor estricto.

Los 68 casos nuevos pasan en cuatro archivos: cuatro perfiles, standalone/pthread, vencimiento por día/hora con y sin23 preparando, cuerpo y peer retenidos, Home18 real, fuente fría antes del primer cuerpo, rechazos malformados, controlador, actor/rig/índices, rollback y MessagePorts reales. Los ACK/recursos GPU de los tests CPU son dobles explícitos. Los 19 contratos del archivo anterior pasan: se conserva el rechazo por cuerpo perdido y por retorno Task no migrado, y se sustituye el antiguo rechazo de la salida Farm por el rechazo de una declaración retirada.

La primera selección completa se detuvo al identificar esas dos expectativas supersedidas; se archiva como parcial, no como resultado completo. La selección final termina 4696/4697, 357 archivos, cero fallos y una comparación WASM opcional omitida. Las tres exclusiones históricas de host/timeline siguen abiertas. Pasan 13 sintaxis y el build WebGPU/Worker con dibujo remoto, 63.428 s. Se reconstruyen standalone/pthread con la receta canónica y outputs aislados; el JS pthread incluye el nuevo export y el worker conserva sus bytes. Se fijan 639 inputs probados, 64 nativos y 16 archivos ajenos intactos; las 38 rutas A5 publicadas se preservan como evidencia externa.

## Captura GPU y propiedad de recursos

Farm13→Home19→Home18 completa adquisición, picking, adopción y drenaje en nvidia/turing, con actor/rig/geometría/instancias originales y 54/54 dibujos en los bloqueos de 1800 ms. No hay Farm23 previa. Registra 100 recursos preparados y 0 después de READY; no es aceptación de coste mínimo ni cadencia.

El primer ensayo solo demostraba identidades de objetos; el siguiente conservó 571 IDs GPU, sin destrucciones, buffers de geometría nuevos ni shaders idénticos recompilados, pero rechazó una segunda textura sin atribución. La fuente real de los catálogos y sus metadatos mostró una primera demanda de Idle al detenerse Home. No se permitió una textura adicional por sus dimensiones: las anotaciones de prueba se aplican al objeto de textura realmente devuelto después de validar el checksum del catálogo. Su hash coincide con el binario Idle youngMale congelado, 488fdb20220cdcc12c6a51151e4b56de8392fff8ffa51b839adb61573e417338.

La captura final mantiene los 571 IDs y cualifica exactamente una textura nueva de trayectoria y una primera textura Idle requerida por los knots de velocidad cero; no existe otro Idle residente del mismo perfil. Rechaza texturas sin atribuir, bancos duplicados, geometría nueva, destrucciones de datos retenidos y shaders idénticos recompilados. Las anotaciones usan el WeakMap de diagnóstico existente y el nombre de la textura sobre respuestas servidas solo en QA; no cambian catálogos de producción, bytes de datos, cachés ni vidas. El recibo guarda hashes de ambas respuestas originales y anotadas. Timing sin PNG, fuente en página y peer Home explícito: no prueba el productor ordinario ni la cadencia global, ni la cancelación de un paquete Farm23 ya preparado en hardware; esta última tiene pruebas CPU/puertos.

## Siguiente punto

Conectar la adquisición inicial13→23 y el Idle terminal21/22 al productor y validar su ciclo completo antes de habilitar el roster Farm. Nacimientos/cohortes restantes, independencia de admisiones del lote, consumidor/cohort fallido, pérdida de dispositivo, coste de publicación pausada, autonomía VFX, coste inicial y cadencia/plataformas siguen pendientes. A6/A/B/C permanecen abiertos; D no iniciado; f-R3 conserva su seguridad.

[Recibo y evidencias](performance/native-farm-pending-home-validation-20261119.json).
