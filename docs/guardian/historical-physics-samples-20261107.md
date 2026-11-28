# Muestras históricas de física autoritativa

## Extensión de infraestructura del 8 de noviembre

El certificado v1 sigue siendo válido para un cuerpo. El v2 transporta actorIds para varios cuerpos; exige que las envolventes de intervalo de todos ellos sean mutuamente disjuntas, que no las atraviesen otros actores y que las puertas conserven su barrido libre. No basta con que estén separados al principio o al final. La captura, receptor, soporte de terreno, grupo de movimiento y roster consumen el mismo conjunto de IDs.

Cada rig recibe únicamente sus propias muestras. Si falla la instalación de un participante, se retiran las poses históricas de todos antes de avanzar el reloj. La prueba de dos cuerpos cubre instalación parcial fallida, reintento, reproducción y finalización. Las pruebas de aislamiento rechazan contactos entre envolventes, cruce por el segundo cuerpo y cambios de participantes.

Las recuperaciones, impactos provisionales, física baked y cuerpos interactuantes mantienen la vía confirmada ordinaria. Una prueba del receptor recorre dos cuerpos físicos, salida de recuperación y eliminación de poses, conservando orden de eventos y un ACK por publicación, sin retener la cola. Estos casos no requieren que el agente de contenido implemente nueva física. No se afirma interpolación GPU de sus poses ni paridad visual completa.

## Evidencia original de un cuerpo


El harness admite `QA_INPUT_MODE=id` para introducir un objetivo por ID a través
del `onPick` habitual, obtener el contexto del guardián del Worker gráfico y
someter la acción a la validación de la autoridad. No modifica el snapshot, la
política Rapier ni las condiciones de admisión histórica. Este modo aísla la
validación física de la selección por píxel: **no acredita que el clic funcione**.
El modo predeterminado sigue siendo `pointer`. Los informes identifican el modo
y, al terminar, incluyen el último diagnóstico de soporte de terreno disponible.

La autoridad puede adjuntar a `worldMotionTrace.physicsPoseSamples` poses de ragdoll Rapier tomadas después de pasos completos de simulación. Cada muestra indica tiempo y contador de paso; una transición, un subpaso omitido, más de 128 muestras o una pose que no pueda extraerse con seguridad produce un resultado incompleto. La lectura restaura el binding y el rig. La física baked, las recuperaciones y las transiciones de salida siguen explícitamente fuera de este contrato.

Se registran envolventes horizontales conservadoras de los colliders: una esfera independiente de la rotación por cada casco convexo o cápsula, ampliada por el contact skin. `physicalIsolationEvidence` solo se emite para un ragdoll cuando la unión de estas envolventes en las muestras queda separada de todos los trayectos de los demás actores, ampliados por sus radios de navegación. La prueba es para mantener cada pose discreta hasta el siguiente paso; no acredita interpolación articular ni que los radios de navegación cubran toda la malla visual.

El receptor valida tiempos, continuidad del contador, nombres y estructura del rig, envolventes y correspondencia de la última pose con la publicación confirmada. Las diferencias numéricas hasta `1e-10` se toleran por el redondeo de matrices al restaurar el rig. Dos simulaciones con la misma incursión y el mismo impacto conservan snapshots lógicos idénticos durante 20 ticks con y sin observación; los datos capturados se han comparado con la pose publicada. Esta prueba usa Wild Engine y Rapier reales, pero no es una campaña completa ni una validación de imagen en WebGPU.

El grupo y el roster pueden reproducir de forma discreta un único ragdoll aislado, si el estado y la pose inicial coinciden con la publicación anterior, los demás actores y recursos conservan sus certificados y todos los chunks abarcados por sus colliders están presentes. El rig físico se actualiza solo al pasar a otra muestra y entrega la última pose en el límite confirmado; el resto de personajes mantiene su ruta de presentación habitual. Las puertas deben permanecer fijas y la envolvente física debe quedar fuera de toda su zona de barrido. Las entradas provisionales y reconciliaciones visuales bloquean también la admisión. En este perfil se omite el barrido contra obstáculos estáticos de un actor cuya posición permanece idéntica en todos los ticks; sigue incluido en las pruebas de separación con los demás. Esto no demuestra la separación de su malla animada.

Una prueba conecta una incursión Wild Engine modificada para aislar una bestia, Rapier real, el certificado y el roster; el rig de presentación está simulado. Otra comprobación con la captura nativa sin alterar `sabana712-d1-native-active-raid.json.gz` y Attack sobre el jabalí `animal-396` obtuvo las pruebas de aislamiento, espacio y separación; todavía no prueba la reproducción visual. Para ejecutar la prueba de navegador cuando la GPU esté libre: `node tools/experiments/audit_webgpu_historical_rapier.mjs` con el servidor y Playwright disponibles; `QA_BASE_URL`, `QA_ACTOR_ID`, `QA_FIXTURE` y `QA_OUTPUT` son opcionales. El informe exige un adaptador hardware, una pose histórica auditada y contadores de inicio, muestras y final, de manera que el fallback ordinario no pueda hacer pasar la prueba. La prueba hardware posterior valida un ragdoll aislado en el juego real: 78 huesos coinciden con la muestra confirmada (error 0), con dos inicios, cinco cambios de muestra y una finalización. El [informe](b-close-20261107/historical-physical.json) y su archivo completo conservan también el fallo independiente de eventos interiores de aquella ejecución. La entrada fue por ID mediante la acción normal, no por selección de píxel. **No está cerrada la física histórica en general:** esta evidencia no certifica paridad artística ni separación de mallas visuales completas. Cuerpos baked, recuperación, varias bestias físicas e intervalos con eventos internos conservan la presentación confirmada normal.
