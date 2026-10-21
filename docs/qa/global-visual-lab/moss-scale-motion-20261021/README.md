# Manglares: dos escalas durante cambio de cámara

48 parejas:24 poses desde cámara normal hasta elevada,de día ynoche. Control:dos orientaciones aigual escala con muestreo condicionado. Candidata:segunda escala.57. Izquierda control,derecha candidata. Semilla712,media,1280×720,mundo pausado.

Auditoría:cámara,objetivo,hora,draw calls ytriángulos iguales en todas las parejas;sin errores ni frames vacíos. Vídeos de24 frames,12fps,2 segundos,1920×540 verificados con ffprobe. No representan FPS del juego:se espera a que terminen los chunks entre poses.

- [Vídeo diurno](media-day.mp4)
- [Vídeo nocturno](media-night.mp4)
- [Contacto diurno](media-day-contact.webp)
- [Contacto nocturno](media-night-contact.webp)

El contacto nocturno revisado mantiene continuidad de las zonas de musgo yseparación del barro durante el recorrido,pero a mayor altura el relieve sigue perdiendo lectura. No certifica ausencia de shimmering ni una mejora temporal concluyente:la inspección de contactos no sustituye observar el vídeo en tiempo real. Conservar candidata QA,sin reemplazar anterior;repetición yvolumen orgánico siguen pendientes.

Sin benchmark de rendimiento por contención GPU recientemente detectada. No atribuir coste o mejora FPS al tiempo de captura. Tampoco prueba streaming continuo,perfil bajo ociclo día/noche animado.

```text
node tools/experiments/capture-moss-scale-motion-20261021.mjs
python tools/experiments/package-moss-scale-motion-20261021.py
```

Vite5190 yffmpeg en C:/ffmpeg/bin. Archivar salidas antes de repetir. Main ypredeterminado intactos.
