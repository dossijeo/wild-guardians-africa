# Ondas de charca: dos mecanismos separados, ambos descartados

Se revisó la referencia Sabana: su agua muestra pequeñas ondulaciones legibles, frente al plano casi uniforme del juego. La receta actual ya contiene pintura de bandas, normal animada, reflexión, Fresnel y luz nocturna. No faltan esas funciones; se investigó su escala sin añadir mapas ni geometría.

## A: escala de pintura

`qa-pond-wave-scale.js` modifica exclusivamente el uniforme de los siete materiales de charca residentes de Sabana: `uWaterScale` pasa de 0,55 a 2,2. La separación de filas de la receta pasa de `1/(0,45×0,55)` = 4,04 m a 1,01 m. Se conservan grosor, paleta, reflexión y normal originales. La hipótesis era hacer visibles varios trazos sobre una charca de unos ocho metros.

Las capturas confirman visibilidad, pero **el resultado parece vetas paralelas**, no las pequeñas ondulaciones de la referencia. En cámara alta el patrón se hace demasiado obvio; en cámara baja tampoco aporta volumen. De noche persiste la dirección repetitiva. Se descarta para adopción.

## B: escala de normal, pintura original

El segundo ensayo está en [`../pond-wave-normal`](../pond-wave-normal/). Recupera la escala de pintura 0,55 y cambia solo los dos componentes sinusoidales que alimentan la normal: frecuencias espaciales mayores y amplitudes de pendiente 0,14/0,11 frente a 0,04. Conserva dos evaluaciones trigonométricas y todas las funciones de iluminación. No mueve vértices ni simula oleaje físico.

En cámara alta produce un cambio pequeño; en la baja, **franjas claras de reflexión excesivamente regulares**. El campo de dos ondas dirigidas no aporta la variedad de frentes que muestra el mockup. Esto explica el defecto visual observado, sin afirmar que exista una regresión de rendimiento. También se descarta.

## Límite y decisión

La frecuencia de pintura y la normal controlan mecanismos distintos. Cambiar sus escalas no resuelve la estructura repetitiva del patrón. No se combinan ambas variantes ni se continúa con barridos de intensidad: el sistema original permanece intacto. Una futura autoría de agua necesitaría diseñar otra organización de frentes y validarla en movimiento; no basta con escoger otro número entre los probados. El siguiente trabajo cambia de componente.

## Evidencia y recursos

Cada ensayo conserva 16 capturas WebGL: Sabana/Gran Río, base/candidata, cámara de juego/baja, día/noche. Gran Río no recibe el cambio. `comparison.json` verifica cámara y contadores iguales por pareja; `captures.json` conserva horas y errores (ninguno). Sabana en cámara de juego mantiene 86 draws y 1.267.265 triángulos; Gran Río, 84 draws y 746.779. Tampoco cambian cantidades de texturas o geometrías.

No se descargan mapas, buffers o modelos nuevos; solo se carga el pequeño módulo QA. No se midió memoria interna de shader ni VRAM total. **No se ejecutó ABBA CPU/GPU** porque ambas variantes fallan el criterio artístico. Igualdad de contadores y operaciones no demuestra igualdad exacta de tiempo GPU.

No hay cambio runtime, simulación, geometría, silueta ni archivos originales. Los scripts solo modifican materiales ya cargados en la fixture y no constituyen una integración para streaming. Las comprobaciones sintácticas y la compilación real WebGL terminaron sin errores. No se añadieron pruebas que solo repliquen los cambios de constantes.

## Reproducción

Con Vite en 5189: `node tools/experiments/capture-pond-wave-scale.mjs` y `node tools/experiments/capture-pond-wave-normal.mjs`. El parámetro de URL por sí solo no modifica el juego: los scripts instalan la variante QA después de cargar WorldScene. No generalizar a otros biomas.
