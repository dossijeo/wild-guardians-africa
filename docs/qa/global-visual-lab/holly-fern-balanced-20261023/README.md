# Helechos: verde intermedio

Ajuste solicitado por el usuario después de considerar demasiado oscura la variante anterior. Solo cambia el multiplicador de color lineal de (0.30,0.43,0.25) a (0.37,0.50,0.31). Conserva contraste 1.22, gradiente de base a punta, tamaño +35% XZ/+25% Y y margen de máscara de 1 m. No vuelve al verde inicial (0.48,0.61,0.40).

Cuatro frondas radiales bajas por mata, 16 triángulos, textura color/alpha y normales de una fronda individual del GLB CC0 suministrado, horneada en Blender. Base de hojas redondas sustituida únicamente en QA. Normal hacia arriba con 18% de detalle lateral. Alpha cutout, sin blending ni sombras individuales; conserva sombras recibidas. Buffers y selección nativos reutilizados directamente, sin copia ni agrupador adicional.

Seis capturas reales 1280×720, semilla 712, cámara cercana/juego/opuesta, día y noche, calidad media, fondo e impostores presentes. Las comparativas muestran versión oscura a la izquierda y verde intermedio a la derecha. Se verificaron igualdad de cámaras, reloj, draw calls y triángulos entre ambas en las seis vistas; no son imágenes generadas ni retocadas. La diferencia solo afecta al color del helecho.

Coste estructural idéntico a la variante oscura. No se afirma mejora de FPS: las series de rendimiento anteriores se interrumpieron al cambiar la dirección artística y no constituyen evidencia completa para esta opción. Pendientes benchmarks finales, movimiento, calidad baja y validación prolongada. No se activa por defecto ni se integra en main.

Reproducir con Vite 5190: `node tools/experiments/capture-holly-fern-balanced-20261023.mjs`. Módulo: qa-holly-fern-balanced-20261023.js. Geometría: holly-fern-full-frond-geometry-20261023.js. Mapas, fuente, licencia y hash: public/assets/visual-lab/holly-fern-frond-20261023. El GLB original permanece fuera del repositorio y sin cambios.
