# f-R4 parcial: comparar la descripción nativa y su origen temporal

Fecha: 2026-11-14. Base: `e21bc0e4a`. Rama: `codex/guardian-3d-animation`.
Continúa la [renovación de recursos retenidos](f-r4-reusable-native-resume-20261114.md)
y el [plan integrado](integrated-gpu-migration-plan-20261104.md).
Todos los padres A6 y e-R3/e-R4/f-R4 siguen abiertos.

## Problema y cambio

La prueba anterior descartó renovar repetidamente una frontera exacta: bajo
avance cada 20 ms agotó 16 intentos. Reutilizar textura y materiales evita
reconstrucciones, pero no hace vigente una autorización temporal caducada.

La revalidación existente pasa ahora por el propietario C++ de la propuesta.
Conserva localmente el borrador nativo anterior, reconstruye el candidato con
el cuerpo, mundo, puertas y reservas actuales y compara las dos descripciones
respecto de sus orígenes temporales. Cancela el ticket anterior y conserva solo
la propuesta actual; no añade un cache JS de planes ni otro ejecutor.

El resultado añade `timeTranslation`, con ambos tickets, tiempos de inicio y
fin, identidad suspendida y dos resultados independientes:

- `sameNativeMotion`: identidad, perfil, radio, flags, puntos, parámetros,
  duración y todas las muestras de locomoción coinciden al descontar el inicio.
- `sameNativeGates`: coinciden reservas, malla nativa, mecanismo, transformación
  y curvas de apertura respecto de ese mismo origen.

La comparación usa los datos nativos de ambos borradores y igualdad numérica
de sus valores `double`, sin tolerancia ni hash. Puede rechazar diferencias de
redondeo conservadoramente. Alterar las copias de filas, puntos o curvas en JS
no altera el resultado. Si falla la prueba física actual no se publica ninguna
comparación ni asignación, y el cuerpo sigue suspendido.

La evidencia pertenece solo al par de tickets nombrado. Cancelar el candidato
la retira; tickets o sesiones ajenos no pueden consumirla. Ambos resultados
mantienen `authorizedAutonomy:false`, `authorizedPassage:false` y la exigencia
de preparación gráfica. **No son un permiso GPU ni acreditan equivalencia del
terreno, soporte, rig o fase Idle absoluta.**

## Fuente y decisión

Antes de implementar se leyó [Three r180, AnimationAction.js](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationAction.js),
`startAt` y `_update`, especialmente 534–557: el instante global de inicio se
separa del tiempo local usado para evaluar los interpolantes del clip existente.
Se adapta esa separación entre descripción y ejecución. La física y las reservas
siguen siendo responsabilidad del constructor nativo existente; la biblioteca
de animación no sustituye esa prueba. No se añade dependencia ni temporizador.

La comparación se hace en C++ para poder leer el borrador anterior, incluso
tras caducar su frontera, sin confiar en geometría copiada por un llamador ni
mantener un duplicado JS. Se amplía la ABI con versión propia de revalidación;
se recompilan las variantes standalone y pthread. La captura y el commit de
propuestas mantienen su contrato de frontera exacta.

## Validación y continuación

El [recibo](performance/native-resume-time-translation-validation-20261114.json)
registra compilaciones, pruebas, hashes y alcance. Las pruebas cubren un segundo
trabajador avanzando, una puerta sustituida, nuevas reservas en conflicto,
copias manipuladas, sesiones/tickets ajenos, cancelación, fallos físicos y pthread.
Pasan 29 pruebas dirigidas, los dos builds WASM, el build de producto y sintaxis.
La regresión de 153 archivos registra 1718 casos: 1715 aprobados, los dos fallos
heredados Carry/Harvest y un fallo temporal adicional de reintentos de caída.
Este último espera cuatro reintentos de temporizador dentro de 100 ms y observó
tres bajo concurrencia; sus nueve casos pasan aislados, sin cambiar el test ni
el roster. El recibo conserva ambos resultados, sin ocultar el fallo de la corrida.

La [regresión WebGPU](performance/native-worker-world-owner-time-translation-20261114.json)
incluye la comparación devuelta por la autoridad y conserva la renovación de
recursos y el commit condicionado existentes. Sigue siendo la escena explícita
de un trabajador original, con una preparación por cada ticket confirmado;
no prueba admisión con reloj continuo durante todo el drenaje.
En NVIDIA Turing registra 54 dibujos durante el bloqueo del preparador, cero
factories al renovar, cero recursos posteriores a preparado y drenaje correcto.

El siguiente paso es conectar el origen definitivo al canal directo tras el
drenaje, manteniendo la descripción preparada cuando la prueba completa lo
permita. También deben resolverse el soporte gráfico, el reloj local de las
puertas, la fase Idle absoluta, los límites de cada recurso y el picking.
Actualmente el paquete aún nombra la frontera de preparación y no puede
admitirse con otra por esta comparación. No se ha relajado esa protección.
Siguen pendientes la alimentación ordinaria de todas las intenciones, acciones,
consecuencias, persistencia y aceptación integrada A/B/C.
