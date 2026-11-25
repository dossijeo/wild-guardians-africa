# Calificación de AttackCrops en Sabana

La partida original `sabana712-d1-native-active-raid.json.gz` contiene el facóquero `animal-396` y su reserva sobre `plant-373`. La calificación cubre su aproximación, la pose terminal y el primer golpe. La autoridad admite este caso con un solo animal y los ocho trabajadores en casa sin cuerpo activo.

## Admisión y reloj

La marcha usa el corredor reservado y el registro de cuerpos existentes. El ticket 26 retiene los recursos preparados hasta confirmar la misma reserva. Conserva la fase guardada `4.497729763870326` y las velocidades de 3,8 y 1,5 m/s. El cambio ocurre en el cruce geométrico del círculo estricto de 25 m. La regla anterior lo aplicaba en el primer paso dentro del círculo, de modo que el programa puede cambiar de velocidad hasta un paso antes.

Tras llegar, el ticket 27 conserva el cuerpo y la posición terminal. La confirmación asigna el `attackId` y consume una sola tirada. El dueño de la acción existente aplica el daño al concluir la animación. El Host escribe la edad relativa del ticket adquirido sobre el recurso preparado. La selección toma esa edad del mismo testigo de dibujo. Hasta la confirmación, las propuestas pueden cancelarse con los mismos dueños de ruta, reserva y recursos.

OpenRA combina movimiento hasta rango y orientación con un dueño de ataque que ejecuta la acción diferida. DetourCrowd calcula la velocidad a partir de los parámetros del agente y del corredor. Wild Guardians adapta esa separación al programa temporal y al dueño de daño existentes. [Movimiento y orientación en OpenRA](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Activities/Attack.cs#L190-L234), [Acción diferida en OpenRA](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Traits/Armament.cs#L193-L229), [Velocidad en DetourCrowd](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L1115-L1144).

## Alcance de la activación

`qualifyAnimalCrop:true` se admite en el Worker de desarrollo para las pruebas. El perfil ordinario conserva su recorrido actual hasta que el cuerpo pueda adquirir el siguiente objetivo. En la calificación, un avance de dos subpasos que cruza el primer golpe alcanza la guarda de cohorte en el segundo. El control ordinario cruzó ese golpe y terminó otro avance de dos subpasos con cero propuestas 26 o 27.

El control con Game, WASM, ambos puertos, el Host con cola determinista y el roster original validó ambos tickets con READY retenido. Verificó la continuidad de geometrías y atributos, la selección con la edad enviada y el rechazo de un cuerpo o época ajenos. Emitió un `AnimalLogicalHit` con `attack-661` y dejó un golpe disponible.

## Prueba con WorldSurface

El primer ensayo en NVIDIA llegó a la solicitud de la ruta de 31 nudos. La sonda posterior conservó el error de origen del cliente. La solicitud pedía la secuencia 110 cuando Surface tenía la 9. La precondición se cumplió a la secuencia 117 tras 1,823 s. El rig estaba visible y sus clips de marcha y carrera estaban instalados. Aún se estaba preparando su motor histórico local cuando el roster recibió la ruta nativa. La preparación se rechazó antes de READY.

El roster reserva ahora el mismo actor para la solicitud nativa y cancela la preparación histórica especulativa por su controlador existente. Conserva el retiro diferido de sus recursos. Las pruebas cubren la compilación histórica que responde tarde y el caso en que la preparación de Walking iba a iniciar Running mientras la ruta esperaba. Pasaron los 59 controles de autoridad, Host y roster de esa selección.

El siguiente ensayo dibujó el ticket de marcha con edad inicial cero. La publicación 124 ya estaba recibida y tenía el terreno listo. El pump la había reservado para un intervalo histórico que Surface debía sellar, mientras Surface esperaba aplicar esa publicación para terminar la adopción. Con la cobertura del dueño nativo, el grupo histórico deja ese tramo al pump ordinario y vuelve a certificar cuando el dueño se retira. El control mantiene el orden y la comprobación del terreno. Surface usa la misma cobertura para la selección.

En NVIDIA Turing, la partida sin modificar dibujó dos tickets adquiridos tras retener sus READY durante 550 y 250 ms. Ambos enviaron edad inicial cero. La marcha produjo testigos de dibujo a ambos lados del cambio de velocidad. El ataque tomó el cuerpo 1 y la pose terminal de la marcha. `attack-661` emitió un único `AnimalLogicalHit`, destruyó `plant-373` y dejó un golpe disponible. La raíz 338, sus cuatro geometrías y las 78 referencias y versiones de atributos comparables se conservaron en las cinco etapas observadas. El consumidor confirmó el drenaje.

El arnés ejecutó un subpaso por avance y detuvo el despacho tras recibir el primer golpe. La captura a 30 Hz conservó 1.000 intervalos de inicio de dibujo. El máximo durante la marcha fue 40,60 ms. Cerca del cierre del ataque hubo 633,70 ms entre envíos. En ese intervalo se recibieron 18 callbacks y los 18 rechazaron el paquete anterior por `stale-binding`. El paquete siguiente esperó 515,0 ms entre el cierre del frame en el preparador y el inicio de su envío. En ese hilo, `pump` de `webgpu-pipeline-admission.js` ocupó 514,34 ms de pared y 508,17 ms de CPU justo antes del envío. Queda identificar qué solicitud genera ese coste, completar la continuación del mismo cuerpo y verificar las adversidades A–F. C4 sigue abierto. [Recibos, picos y hashes](performance/native-attack-crops-qualification-20261125.json).

## Regresión

Pasaron 512 de 522 pruebas seleccionadas. Cinco quedaron omitidas y cinco casos QA-100 de último golpe a trabajador reprodujeron los mismos fallos de la línea base. El build de producto con WebGPU Worker y Draw remoto pasó en 1 min 5 s. Standalone y pthread conservaron las firmas existentes y añadieron 25 funciones de los contratos de ruta, golpe y estado del animal.
