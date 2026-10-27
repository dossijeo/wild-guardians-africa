# Recorrido de cámara: Rock035 ampliada

288capturas generadas: dos escalas,72posiciones y día/noche. Cámara normal→cercana→inversa. Las144parejas coinciden en cámara, objetivo, hora, draws y triángulos; sin errores de página/GL. El render automático se suspende durante las capturas y se estabilizan chunks por posición. No es medida de FPS ni una prueba de streaming continuo.

[Vídeo diurno A/B](day-pair.mp4), [nocturno A/B](night-pair.mp4): izquierda original0,12/0,22; derecha candidata0,06/0,44. Codificados a12fps, seis segundos por fase. Se conservan vídeos, metadatos de todos los frames y cinco parejas de muestra por fase; el harness regenera todos los PNG.

La pareja cercana central inspeccionada conserva los edificios y sus contactos, y muestra fracturas más amplias en primer plano. No se aprecia una discontinuidad gruesa en ese fotograma; esto no demuestra ausencia de shimmer o deslizamiento en toda la secuencia. Los vídeos quedan disponibles para revisión temporal. No certificar siluetas volumétricas: sigue siendo el mismo terreno con POM limitado a8muestras y atenuación por distancia.

Conservar candidata como dirección material y evidencia de cámara comparable. La amplitud de ceniza lisa sigue pendiente; la prueba no cierra estabilidad temporal en todos los ángulos ni calidad global. [Metadatos](captures.json), [auditoría](summary.json), [vista cercana](day-36-pair.webp).

Reproducir capture-volcanic-rock-scale-motion.mjs y package-volcanic-rock-scale-motion.py, Vite5190. El paquete usa ffmpeg/libx264 CRF18 yuv420p. No inferir coste de render del tiempo de captura/codificación.
