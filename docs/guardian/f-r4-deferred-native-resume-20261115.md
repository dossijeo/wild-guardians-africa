# f-R4 parcial: admitir la reanudación preparada con el inicio nativo actual

Fecha: 2026-11-15. Base: `0976a339f`. Rama: `codex/guardian-3d-animation`.
Continúa la [comparación de descripciones](f-r4-native-resume-time-translation-20261114.md)
y el [plan integrado](integrated-gpu-migration-plan-20261104.md).
Todos los padres A6 y e-R3/e-R4/f-R4 permanecen abiertos.

## Cambio y límites de autoridad

Una frontera temporal exacta puede caducar mientras se preparan recursos y se
drena la GPU. Renovarla repetidamente ya agotó 16 intentos con avance cada 20 ms.
La reanudación diferida separa ahora la identidad del recurso preparado del
instante de ejecución que confirma Wild Engine. Se solicita explícitamente con
`deferredStart:true`; los paquetes ordinarios conservan su coincidencia exacta.

El preparador retiene una plantilla identificada por la referencia original de
reanudación. El cuerpo A sigue suspendido durante la preparación. Tras el drenaje,
el propietario C++ reconstruye el candidato en la frontera nativa actual,
comprueba cuerpo, mundo, reservas y puertas, y compara la proyección gráfica
de ambos borradores. Confirma inmediatamente esa nueva tupla exacta. No adivina
la secuencia de asignación ni acepta como vigente el permiso físico anterior.

La revalidación ABI 2 conserva los resultados de igualdad nativa `double` y
añade `sameFloat32Motion`/`sameFloat32Gates`. Compara la representación declarada:
tiempos relativos con redondeo dirigido, duración con redondeo inferior y valores
gráficos Float32; geometría, identidad, perfil, radio y puntos siguen exactos.
No usa epsilon. La prueba de compatibilidad describe recursos; no concede
autonomía ni paso. Una representación diferente exige preparación nueva.

El canal directo de autoridad acredita la relación entre referencia preparada,
referencia actual, asignación realmente emitida e IDs de las puertas. El receptor
valida además la fuente suspendida y la asignación real. El preparador no puede
inyectar estos datos como metadatos de un paquete. El paquete preparado permanece
inmutable; el propietario de dibujo guarda por separado la asociación acreditada.
Cambiar mundo, intención, cuerpo, sesión, fuente o recursos invalida la operación.
Una cancelación después del drenaje libera el hold sin inventar una asignación.

## Tiempo, recursos y entrada

Los uniformes existentes evalúan el tiempo local desde el inicio confirmado.
Idle recibe también ese origen reducido por el período del clip; mantener el
origen de preparación desfasaría su animación aunque la locomoción coincidiera.
Las puertas acreditadas usan el mismo origen. La entrada evalúa los mismos
recursos y el tiempo realmente enviado a GPU, conservando por separado su
correspondencia con el tiempo nativo de ejecución.

La cobertura de reloj de cada recurso nativo se conserva en su dominio temporal;
la unión de coberturas mantiene una ruta B más larga después del final de A.
Un reloj sin prueba nativa conserva su horizonte absoluto anterior. Las pruebas
incluyen 100 segundos de avance durante preparación y otros 100 durante drenaje,
sin depender de que otro actor extienda el horizonte del paquete.

El decodificador ya resta cuatro ulps para evitar adelantar eventos. La fila
terminal utiliza ahora la misma duración Float32 inferior que su clamp, y la
cobertura de recurso incluye el margen necesario para alcanzarla en un paso
nativo posterior. Los nudos interiores conservan el redondeo superior. No se
extiende un permiso revocado ni se extrapola movimiento tras su curva finita.

La textura y los materiales del candidato preparado se conservan al admitirlo;
se mantienen el rig y las geometrías originales. La nueva secuencia prepara
una sola vez el delta antes de confirmar el efecto físico;
la adopción no reconstruye los recursos preparados. Esto no acredita aún la
recuperación ordinaria sin reconstrucción de los 3123 recursos del ensayo antiguo.

## Código fuente consultado y decisión

Se leyó [Three r180, AnimationAction.js](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationAction.js),
`startAt` y `_update` (243 y 553–590 en la copia instalada): la ejecución global y el tiempo local de los
interpolantes son responsabilidades separadas. Se adapta esa separación al
propietario nativo existente, manteniendo su validación física actual.

Se leyó también [Three r180, KeyframeTrack.js](https://github.com/mrdoob/three.js/blob/r180/src/animation/KeyframeTrack.js),
constructor (45–52), `TimeBufferType` y `ValueBufferType` (578–586): los recursos
de interpolación tienen una representación Float32 explícita. Se compara esa
representación y se mantiene aparte la prueba física en `double`. No se añade
un motor, dependencia, planificador ni caché autoritativo JS.

## Validación y siguiente entrega

La [evidencia de validación](performance/native-deferred-resume-validation-20261115.json)
registra pruebas, compilación, hashes y las ejecuciones en GPU real. La
[revisión independiente](performance/native-resume-independent-review-20261115.json)
conserva su propia instantánea de fuentes; su ejecución es anterior a los
ajustes finales de cobertura y no sustituye la validación final.

La prueba gráfica usa dos trabajadores originales, el productor/preparador y
el propietario WebGPU existentes. B ejecuta su ruta nativa durante dos bloqueos
de preparación de 1,8 s; A permanece suspendido antes de readiness y se reanuda
desde la frontera confirmada mientras el segundo bloqueo sigue activo. Se
comprueban recursos después de readiness, entrada normal de ambos actores,
puerta, ausencia de poses JS periódicas, errores GPU y drenaje.

Resultado final: 278 pruebas dirigidas y 14 de locomoción pasan; en la selección
amplia de 154 archivos pasan 1732 de 1734 casos, con los dos fallos heredados de
Carry/Harvest registrados. Compilan standalone/pthread y producto; pasan los
controles de sintaxis de 366 HTML/308 scripts y del JS modificado. NVIDIA Turing
registra 54 dibujos durante preparación y 53 después del commit con el preparador
todavía bloqueado, B avanza 2,14 m durante la preparación, y la entrada normal
selecciona ambos trabajadores. El delta prepara 70 recursos una sola vez y crea
cero después de readiness. La regresión gráfica de la reanudación exacta anterior
también pasa con 54 dibujos; ambas ejecuciones terminan sin errores GPU y drenadas.

No se declara cerrada f-R4 ni activada la partida ordinaria. La siguiente entrega
del camino crítico es el productor/ejecutor ordinario e-R3, con admisión previa
a la primera asignación y a los cambios de plan. Siguen pendientes todas las
intenciones, transiciones de acciones/clips, consecuencias, persistencia y la
aceptación integrada A/B/C. Las medidas de este componente no certifican ausencia
global de tirones ni autorizan comenzar la optimización D.
