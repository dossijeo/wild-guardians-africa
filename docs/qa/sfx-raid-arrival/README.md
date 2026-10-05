# SFX 120 — entrada física de la incursión

El aviso `game_enemy_detected` se reproduce una vez por incursión cuando el primer animal activo entra físicamente en la envolvente de la finca. Es independiente de la posición de cámara y distinto del aviso global de aparición. Comparte la función de límites de finca con el centrado de cámara, sin alterar simulación, eventos ni RNG.

La envolvente se calcula una vez por incursión. Cargar una instantánea con animales ya dentro, reanudar dentro después de una pausa o retroceder la simulación no vuelve a anunciar la entrada. Las fuentes tardías se descartan tras pausa, cambio de incursión, resultado, desaparición o más de 0,5 segundos. El sonido usa el bus UI con prioridad de peligro y los límites existentes de voces; se precarga con los sonidos de las especies y comparte la caché de buffers.

## Verificación

- [120 pruebas dirigidas](tests.txt), todas correctas: observador, precarga compartida, voces, pausas, restauración, cancelaciones tardías, cinco incursiones del dominio nativo, audio de animales, enrutado y regresiones de centrado de cámara/terreno/viaje.
- [Cinco incursiones en navegador](browser-report.json): león, hiena, búfalo, rinoceronte y facóquero; exactamente una entrada por incursión, 21 buffers Opus nativos a 48 kHz, sonidos de ataque y retirada conservados, cero voces finales, cero errores y contexto cerrado. El observador no altera el estado serializado del juego.
- [Captura](browser.png) y [hashes de fuentes y evidencia](source-hashes.json).
- Compilación correcta con 196 módulos; conserva la advertencia existente de bundle grande. Verificación del runtime de audio correcta. Paquete web: 586 archivos, 393.994.575 bytes y 859 referencias relativas verificadas.

El navegador usa navegación dirigida de prueba, salida silenciada y ninguna escena 3D. Esta evidencia acredita disparadores y fuentes Web Audio; no acredita escucha perceptual, navegación real completa ni rendimiento móvil. El inventario queda en 82 asignados y 44 pendientes; el barrido completo sigue abierto.
