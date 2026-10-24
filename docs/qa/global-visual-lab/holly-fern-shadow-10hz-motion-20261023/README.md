# Sombras a 10 Hz: secuencia fija

comparison.mp4: izquierda sombra continua, derecha sombra actualizada a 10 Hz. 90 frames a 30 fps, tres segundos diurnos, camara fija, semilla712,1280x720 por lado, fondo completo. La hoja mantiene su animacion continua; se cuantiza exclusivamente el tiempo del shader de profundidad. No hay reduccion de densidad, geometria ni resolucion de sombra.

Revision de fotogramas 1,2,31,32 en temporal-crops.jpg: sin cambios aparentes de masa/color; diferencias localizadas en sombra. Media absoluta sobre todos los canales y frames: 0.02052 sobre255; maximo111. El promedio pequeno no demuestra ausencia de artefactos temporales. Video generado, no se afirma validacion perceptual completa de su reproduccion. Frames originales permanecen localmente y son reproducibles con el capturador.

Benchmark separado en ../holly-fern-shadow-10hz-cost-20261023: ahorro GPU en ambas parejas con camara fija, magnitud variable. Pendiente camara movil, noche en video y sombras conservadoras fuera de vista. Mantener como candidata; no integrada.

Reproduccion: ejecutar capture-holly-fern-shadow-10hz-motion-20261023.mjs con WG_SHADOW_10HZ=0 y luego=1. Vite5190. Unir continuous/%04d.png y quantized/%04d.png con ffmpeg hstack,30fps.
