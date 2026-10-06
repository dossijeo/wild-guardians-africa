# Impostores: primer visor aislado de transición

Continuación del [atlas precalculado de acacia](../far-vegetation-atlas/README.md). Solo herramienta experimental: `tests/browser/far-vegetation-transition.html`, módulos en `tools/experiments/far-impostor-prototype.js` y `far-impostor-math.js`. No se importa desde el juego ni modifica WorldScene.

## Implementado en el prototipo

Ocho árboles con IDs estables, distintas rotaciones y escalas uniformes. Ambas representaciones comparten exactamente la base; el modelo se traslada compensando el anclaje local del atlas rotado/escalado. El billboard se orienta hacia la cámara solo en XZ, permanece vertical y elige vistas a partir de cámara menos rotación del árbol. La selección y orientación ocurren en shader; puede compararse mezcla de vistas con selección discreta.

La banda experimental configurable es de 40 a 60 unidades. Se usa smoothstep para el crossfade, con el mismo patrón de cobertura de `obstruction-source.js`. Modelo e impostor descartan conjuntos complementarios de píxeles, sin alpha blending de la transición. El atlas se filtra con alpha premultiplicado para no utilizar RGB invisible bajo alpha cero.

El lote de impostores tiene dos triángulos por árbol. Los modelos usan instancing, pero solo se envían los necesarios dentro de la banda; las matrices se reescriben cuando cambia esa selección. No se generan texturas durante esta prueba. No hay chunks, colliders, lógica de juego ni sombras dinámicas. La cámara conserva los controles OrbitControls originales.

Un control de retención representa un modelo no preparado: sigue viéndose el impostor, incluso cerca. Al liberarlo, la disponibilidad aumenta durante aproximadamente un segundo y la representación pasa progresivamente al modelo. El asset ya está cargado en memoria: esto prueba la señal de disponibilidad y transición, no latencia de red ni streaming real.

## Evidencia

Cuatro pruebas matemáticas correctas: billboard independiente de altura de cámara; orientación procedural, mezcla entre vecinos y wrap 315–0; coincidencia de anclaje en ocho ángulos y tres escalas; transición bidireccional y retención/carga progresiva.

Estados y capturas nativas en `native.json` e imágenes:

- Lejos, distancia 100: cero modelos, ocho impostores, dos llamadas y 18 triángulos incluyendo el suelo.
- Mitad de transición, distancia 50: mezcla 50 %, un modelo, tres llamadas y 9699 triángulos.
- Cerca, distancia 25: primer árbol completamente 3D, cuatro modelos seleccionados, tres llamadas y 38742 triángulos.
- Giro 22,5 grados: comparación angular interpolada y discreta desde la misma cámara.
- Retención cerca: disponibilidad cero, impostor al 100 %, cero modelos. Tras liberar se capturó disponibilidad 0,1829 y cobertura del impostor 0,8171, seguida de disponibilidad completa.
- Día y noche reciben un multiplicador de luz uniforme compartido y fog del mismo color de horizonte. Son colores diagnósticos; todavía no se integra el cel shader, las luces ni el ciclo real del juego.

Cero errores WebGL/compilación en las muestras. Las capturas prueban esos estados estáticos, no suavidad de movimiento continuo ni ausencia general de popping. Los contadores no acreditan frametime, GPU, RAM, móvil o rendimiento con miles de árboles.

## Pendiente antes de integrar

Validar más ángulos/alturas y movimiento lateral/continuo, las cuatro fases de luz del juego con sus materiales reales, y si la mezcla angular merece su coste o produce doble silueta. Comparar imagen y medir CPU/GPU/RAM con cientos/miles de impostores; mejorar la selección cercana sin asignaciones por frame antes de ampliar la población. Faltan correspondencia procedural con árboles/chunks reales, altura del terreno sin geometría, densidad determinista, carga real tardía, supresiones, sombras cercanas y desaparición lejana configurable. El experimento aún no satisface los criterios de éxito de la especificación.
