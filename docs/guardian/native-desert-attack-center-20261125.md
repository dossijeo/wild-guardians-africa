# AttackCenter en el escenario aislado de Desierto

La calificación de desarrollo restaura una incursión de Desierto 712 en la que Game ya eligió su único centro. La partida carece de trabajadores, escudos de contacto y cultivos vivos. La preparación de la marcha y del ataque conserva el tipo y el ID del objetivo, reutiliza el cuerpo del facóquero y conserva las mismas familias de recursos y el mismo roster que AttackCrops.

El primer ataque deja el centro intacto. El siguiente programa acredita el final del golpe anterior y conserva el punto de ataque y la fase en una preparación estacionaria. Game asigna el identificador y consume la tirada del clip al adquirir la acción. Gasta un golpe al resolver el daño mediante su evento ordinario. Tras gastar los dos golpes, el cuerpo usa el programa de Retreat existente hasta la salida.

OpenRA revalida el objetivo, mueve el actor hasta el alcance y llama al dueño del arma al cumplir la distancia y orientación. Detour conserva el corredor y exige verificar sus polígonos frente al filtro vigente. Aquí se conserva el punto real de aproximación elegido por Game, se verifica su barrido nativo y se comprueba de nuevo el objetivo en la frontera del golpe. [OpenRA release 20250330, Attack.TickAttack](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Activities/Attack.cs#L148-L233) · [Detour 1.6.0, dtPathCorridor::isValid](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourPathCorridor.cpp#L547-L560).

## Controles

El fixture se construye desde la partida registrada de Desierto 712 y programa una incursión de prueba con el scheduler de Game. El método de selección ordinario elige structure-2. Al reproducir el guardado con el WASM anterior, el daño se ejecuta por el camino previo y las dos pruebas de admisión nativa quedan rojas.

Con los nuevos binarios, ambos READY retenidos conservan pose, fase, HP y golpes disponibles. Los dos impactos acreditados rebajan 600→580→560 HP, seguidos por una sola retirada. Las cuatro mallas, sus geometrías y atributos se conservan en la prueba con el rig original. El picking consume la edad del primer envío del Host. Una ruina confirmada mientras se prepara la acción invalida ese ticket y conserva RNG, presupuesto e identificador. La ABI conserva las firmas anteriores y añade el export de la preparación estacionaria. El módulo pthread se verifica con memoria compartida y una publicación real de terreno.

## Recorrido en NVIDIA Turing

Los cinco GO de marcha, golpes y salida usan el cuerpo 1 y cada uno dibuja su edad inicial cero. Entre la aproximación y la primera acción, el mismo actor conserva cuatro geometrías y 26 referencias GPU de atributos comparables. La retirada presenta la ausencia del animal en el paquete 679. El consumidor confirma un drenaje y la sesión termina sin errores.

La primera captura reveló que Surface seguía esperando una publicación de cultivo tras adquirir la marcha a un centro. La corrección exige el tipo de objetivo y el identificador de ataque al confirmar el GO. Las siguientes capturas descartadas aislaron dos condiciones del arnés. La espera de preparación empezaba durante el viaje de unos 40 segundos y el comparador confundía los alias de malla de animación con cambios en las geometrías y buffers físicos. El contraste final conserva la verificación física y ambas preparaciones retenidas.

La regresión de 91 pruebas, los seis controles de adopción y el build pasan. El máximo medido a 30 Hz es 666,60 ms entre envíos en el relevo del primer golpe, en la secuencia 432 del ticket 4. El draw del Preparer ocupó 554,71 ms de pared y 545,01 ms de CPU antes del envío. El Host registró cero espera de recursos y 3,4 ms de dibujo. La atribución dentro del Preparer sigue abierta. C4 conserva el objetivo de 16,667 ms. [Recibos, referencias comparadas y hashes](performance/native-desert-attack-center-20261125.json).

El caso mixto de Desierto 983 sigue pendiente. Los corredores ordinarios de trabajador y animal se acercan a 0,838 m frente al radio de encuentro de 2,2 m. La cobertura aislada deja pendientes el encuentro, la admisión ordinaria desde RaidSpawned y las variantes con colapso, escudos o varios animales.
