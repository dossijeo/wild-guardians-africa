# Subidas de atributos limitadas a instancias activas

La candidata usa clearUpdateRanges/addUpdateRange para subir únicamente el prefijo dibujado de coverageAnchor, coverageData y coverageSlope. No marca actualizaciones cuando el número de instancias es cero. Conserva capacidad, distribución, geometría, máscaras y materiales. Se puede desactivar con q.uploadRanges=false para medir el mismo helper con subidas completas.

## Equivalencia

Seis parejas de capturas reales día/noche, baja, semilla 712, target fijo (52,28), 1280×720: exactamente iguales píxel a píxel. Instancias, triángulos y llamadas iguales. Recorrido de streaming 0→192→0 y desmontaje pasan sin errores, preservando capa original. Imágenes y streaming.json documentan alcance; no es prueba prolongada de fugas.

En la cámara normal se dibujan 2351 instancias: los tres atributos suman nominalmente 94.040 bytes activos frente a 1.200.000 bytes de capacidad de ambos buffers. Es el tamaño solicitado mediante la API de atributos, no tráfico PCIe medido ni una reducción de VRAM reservada. La copia JavaScript de cada instancia sigue existiendo.

## Medición con cámara móvil

Intel UHD ANGLE/D3D11, misma página, cachés calientes, ABBA por día/noche. 720 muestras GPU y 720 frames de cadencia válidos, con calentamiento. Cámara, llamadas y triángulos coinciden en toda la secuencia entre modos. Sin errores, consultas perdidas o disjoint. Pre/postflight sin motores GPU por encima del 2%; no monitorización continua.

| Fase | GPU completa A1/A2 | GPU rangos B1/B2 | CPU completa A1/A2 | CPU rangos B1/B2 |
|---|---|---|---|---|
| Día |17.586 / 16.456|17.513 / 16.509|3.628 / 3.356|3.477 / 3.359|
| Noche |17.505 / 17.177|17.655 / 17.285|3.373 / 3.389|3.214 / 3.367|

Milisegundos. Intervalo medio: día A20.989/19.603, B21.002/19.953; noche A20.562/20.171, B20.140/20.513. El efecto no es consistente frente a la variación entre bloques. No afirmar mejora FPS ni adoptar como solución del coste móvil. CPU de render incluye el selector; no sumar su tiempo otra vez. Sin construcción de tiles durante las muestras.

Recomendación: conservar la candidata por eliminar transferencias innecesarias con una modificación pequeña y equivalencia visual comprobada, pero mantener pendiente su beneficio medible. No reducir calidad artística para justificarla. No integrada en producción ni cambios en main.

## Reproducción

Con Vite en 5190, ejecutar los scripts capture-mangrove-leaf-upload-ranges-20261021.mjs, package-mangrove-leaf-upload-ranges-20261021.py, measure-mangrove-leaf-upload-ranges-20261021.mjs y audit-mangrove-leaf-upload-ranges-20261021.py en tools/experiments. PNG completos regenerables; láminas, metadatos y resultados publicados.
