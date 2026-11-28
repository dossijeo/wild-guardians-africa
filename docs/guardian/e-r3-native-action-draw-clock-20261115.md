# Reloj gráfico de la acción emitida

Continúa la [identidad de acción del propietario nativo](e-r3-native-action-identity-20261115.md)
en el consumidor gráfico existente. Se añade una referencia de reloj de acción,
sin usar un handle de ruta revocado como permiso para animarla. e-R3/e-R4/f-R4,
los once puntos principales de A6 y la aceptación A/B/C siguen abiertos.

## Tiempo admitido y selección

`remote-clock-bindings` registra una referencia de acción copiada e inmutable
en el uniform físico conocido. El receptor exige el mundo aplicado, el reloj
causal y la asociación real que instaló su canal de control. El preparador no
puede escoger el origen de ejecución, añadir cobertura, mezclar una ruta o usar
un reloj absoluto para esta fase. Un candidato pendiente todavía no se admite:
su protocolo de paquete retenido y liberación debe conectarse antes.

El dibujante obtiene el inicio y fin de la asociación nativa vigente. Escribe
una edad relativa, limitada por el reloj causal, la retirada del actor y la
duración declarada. Si el paquete se preparó antes de revalidar el inicio, usa
el inicio realmente emitido para calcular la edad. Se conserva la duración
declarada; no se deduce restando dos tiempos absolutos. Una retirada impide
repetir el paquete anterior. El control mantiene el tiempo máximo presentado
para detectar una revocación que llegara demasiado tarde.

La captura de selección conserva el `float32` relativo que se envió a la GPU,
además del origen real. `getActionElapsed` devuelve ese valor sin volver a
sumarlo y restarlo de un tiempo absoluto grande. Así el futuro selector de
clips y la selección geométrica pueden usar la misma fase. No se ejecutan
consecuencias de tarea desde el dibujo.

Cambiar la referencia de un candidato no reconstruye su grafo: se actualizan
las inscripciones de sus uniforms físicos existentes. La prueba de esta
operación conserva la identidad/cache del nodo y verifica que no se invoca
otra subida del backend. Esto no acredita que estén resueltos todos los costes
de reconciliación ordinaria ni la reconstrucción masiva de 3.123 recursos.

## Referencia de implementación

Se leyó el código de Babylon.js 8.0.0, no solo su documentación:

- [`BakedVertexAnimationManager.bind`, 125–138](https://github.com/BabylonJS/Babylon.js/blob/8.0.0/packages/dev/core/src/BakedVertexAnimation/bakedVertexAnimationManager.ts): vincula la textura residente y parámetros de tiempo/rango.
- [`bakedVertexAnimation.fx`, 8–25](https://github.com/BabylonJS/Babylon.js/blob/8.0.0/packages/dev/core/src/Shaders/ShadersInclude/bakedVertexAnimation.fx): selecciona el fotograma a partir de tiempo, velocidad y rango antes de leer matrices.

Se adapta la separación entre recurso residente y parámetros temporales al
reloj directo de Wild Guardians. La duración acotada y la revocación provienen
de nuestro propietario nativo. No se adopta el reloj global de Babylon ni se
añaden bibliotecas, otro registro del mundo o un temporizador por actor.

Una prueba reprodujo además la pérdida de la fase terminal a tiempo absoluto
`1e15`: el intervalo representable de una acción de 2,4 segundos mide 2,375.
Al alcanzar el fin nativo, la lectura de ejecución y el uniform usan la duración
declarada completa. Así el redondeo del fin absoluto no deja el clip incompleto.

## Evidencia y límite de este incremento

La [evidencia de validación](performance/native-action-draw-clock-validation-20261115.json)
registra hashes, selección y resultados finales. Once casos nuevos del receptor
usan llegada real de `Game.tick`, llamada expresa al ABI condicionado y el
emisor de control real. Comprueban inicio exacto/diferido, ruta B simultánea,
fase de selección, fin, cancelación y rechazos. El dispositivo de esos casos es
simulado: acreditan los contratos y bytes enviados, no un shader nuevo ejecutado
en el controlador. Tres casos adicionales comprueban inscripción física sin
reconstrucción, restricciones y precisión a tiempos absolutos grandes.

En esos casos se aplica después otra mutación nativa real para establecer una
frontera de mundo del coordinador: el ABI de componente no escribe por sí solo
su cookie JS. No se presenta esa secuencia como admisión ordinaria de la acción.
Las dos regresiones GPU conservan sus escenarios anteriores de primera tarea y
reanudación; no se atribuye a ellas la validación gráfica de una acción nueva.

Quedan conectar la fase al selector de clips y cuerpo original, el preparador
y el paquete retenido, su drenaje/liberación y el coordinador que entra en la
acción. Después deben conectarse proyección, consecuencias y restauración en la
partida, y completarse productor ordinario, otras intenciones y aceptación.
La capacidad anunciada es solo `nativeTaskActionClockVersion=1`; no anuncia
un protocolo terminado de preparación/admisión de acciones.
