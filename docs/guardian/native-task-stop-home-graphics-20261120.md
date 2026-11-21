# Adopción gráfica de Home desde Task25

El roster conserva la pose de Task25 sobre el actor detenido hasta que Home18 adquiere el cuerpo. Verifica que Home use la misma autoridad, sesión, cuerpo, perfil, radio y pose. Sólo admite los cambios de estado y asignación que produce el relevo de Game. Si el estado de Game llega primero, la pose queda pendiente hasta recibir la atestación de la parada.

La transición utiliza la preparación de variantes y el reemplazo de asignación existentes. Las pruebas conservan la geometría, el índice y el atributo de posición durante la parada. Home conserva el actor original y retira la asignación de movimiento anterior al finalizar la nueva. Se verifica una sola adquisición del personaje.

DetourCrowd 1.6.0 sustituye la meta sobre el agente existente. Three.js r180 actualiza valores sobre las asignaciones de recursos que siguen vigentes y vuelve a enlazar cuando cambia la identidad subyacente. Wild Guardians reutiliza el actor y sus buffers de geometría, y cambia la trayectoria sólo al adquirir Home18. [Código de DetourCrowd](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L607-L662) · [Código de Three.js](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Bindings.js#L193-L255).

Las dos pruebas usan WASM, la geometría y las animaciones del proyecto, y una señal de dibujo simulada. Ejercitan el estado de retorno de Game antes y después del recibo, conservan el cuerpo y comprueban la adquisición de Home18 sin reposicionar el actor.

Quedan conectar el disparo al fin de turno ordinario, cubrir el relevo con motores de puerta y validar el recorrido y su cadencia en GPU física. A6, la integración y C4 siguen abiertos.

En el original, Home rechazaba el trabajador detenido por falta de una fuente gráfica de Task25. La selección final pasó 483 pruebas en 36 archivos y la compilación de producto terminó correctamente. [Evidencia de validación](performance/native-task-stop-home-graphics-20261120/manifest.json).

El 21 de noviembre se reprodujo el disparo pendiente desde una orden ordinaria de Harvest. La autoridad WASM, con los puertos reales y un Host simulado, adquirió Task14 a la hora de juego 249,60 sobre el cuerpo 1. El trabajador avanzó siete pasos hasta 249,95. El siguiente avance, al vencer el turno a 250, rechazó `unsupported return boundary`. El registro solo contiene Idle20 y Task14 adquiridos. Esta captura fija el caso de partida para conectar Task25 y después Home18 y se remitió a Astra. [Reproducción de autoridad](performance/native-task-stop-home-graphics-20261120/ordinary-shift-expiry.json).
