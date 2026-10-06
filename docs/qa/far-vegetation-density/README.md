# Densidad decreciente del horizonte experimental

Solo en el prototipo aislado de una acacia de Sabana; no se activa en gameplay. Hash fijo de ID y semilla por instancia, calculado una vez. En shader, una curva smoothstep reduce densidad entre 100 y 240 unidades; mínima experimental 0,15 y banda de fade 0,04. Uniformes configurables, sin reconstruir posiciones ni matrices al cambiar densidad. Hasta 100 se conservan todos los árboles, fuera del crossfade 3D 40–60. Al aproximarse, los omitidos convergen a presencia completa antes de entrar en la zona fiel. Se reutiliza el dithering actual, sin pasada nueva ni textura nueva.

Seis pruebas pasan: 10.000 IDs deterministas, cambio de semilla, presencia completa en zona fiel, monotonicidad y continuidad del fade, densidad escasa lejana, parámetros inválidos y regresiones de orientación/anclaje/LOD/selección.

## Evidencia nativa

[Constante](constant.png) y [reducida](sparse.png) tienen los mismos 1.008 árboles, cámara, luz y atlas. La segunda abre espacios en el fondo. [Transición](transition.png) y [cercanía](near.png) conservan el modelo central en su posición. Consola vacía y error GL cero. No se acredita transición imperceptible en movimiento, iluminación idéntica, relieve real, todas las fases del día ni móvil.

Ocho lotes alternados con 45 frames de calentamiento y 180 consultas GPU cada uno, 1280×720/DPR1, mediodía, cámara fija. Todos sin disjoint ni consultas pendientes. Medianas GPU de densidad constante: 1,700 / 1,943 / 1,767 / 1,945 ms; densidad reducida: 1,227 / 1,626 / 1,395 / 1,557 ms. Dos draw calls y 2.018 triángulos en ambas rutas: el descarte reduce cobertura, no instancias enviadas. La selección conserva dos escaneos y cero subidas de matrices durante todos los lotes. CPU de update frecuentemente por debajo de resolución temporal; no equivale a cero coste. Campañas 20608/43068 vivas, sin builds ni tests propios durante el ensayo. Muestras completas en benchmark-native.json.gz, hashes y resumen en summary.json.

Estas muestras favorecen la reducción en este visor; no demuestran ausencia de penalización en otros dispositivos ni comparan contra el shader anterior sin cálculo de densidad. No se mide RAM ni FPS del juego completo.

Pendientes: IDs y distribución del generador real, importancia/categorías, supresiones, relieve, bruma residual coherente, integración de chunks tardíos, backdrop, validación de movimiento/móvil y coste del conjunto. Los mil árboles de esta prueba mantienen la distribución diagnóstica sembrada anterior, no se presentan como vegetación exacta del procedural del juego. La zona simplificada sigue siendo un prototipo, no aceptación final del sistema.
