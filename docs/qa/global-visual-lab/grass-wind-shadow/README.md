# Sombras dinámicas de matas con viento: descartadas

2026-10-20. Variante QA sobre el prototipo grass-wind; mismo asset Blender, colocación y 192 instancias. No cambia el renderer por defecto.

## Decisión

No adoptar proyección solar por mata con la arquitectura actual. Mejora ligeramente el apoyo al suelo y el sombreado entre hojas en vista cercana, pero el coste GPU aumenta entre 22% y 44% en esta prueba. A distancia normal la diferencia visual es muy pequeña. Conservar el viento sin proyección como candidato separado, todavía pendiente de integración.

- [Cerca sin proyección](media-close-day-wind.webp) / [con proyección](media-close-day-shadow.webp).
- [Juego sin proyección](media-game-day-wind.webp) / [con proyección](media-game-day-shadow.webp).
- [Noche sin proyección](media-close-night-wind.webp) / [con proyección](media-close-night-shadow.webp).
- [Movimiento sin proyección](motion-day-wind.webm) / [con proyección](motion-day-shadow.webm).

## Implementación y causa del coste

MeshDepthMaterial aplica la misma ecuación de deformación que el shader visible, compartiendo los uniforms de tiempo e intensidad. No se reutiliza el depth shader estático. La caché native-shadow exige un contrato `nativeShadowInputs`; se proporciona tiempo/intensidad para que una imagen de sombra antigua no se reutilice durante el viento. Con tiempo fijo la caché puede funcionar; con viento animado la profundidad cambia y requiere actualizar el mapa solar completo.

La primera exploración sin contrato forzaba redibujado por shader desconocido; se corrigió antes del benchmark definitivo. No se modificó la caché del juego. Es un coste de invalidación global, además del dibujo de la hierba; no equivale simplemente a un draw adicional.

En la captura cercana tras avanzar el tiempo: 81 → 113 draws y 1 142 303 → 2 014 075 triángulos procesados por frame. En cámara normal: 71 → 102 draws, 965 516 → 1 797 078 triángulos. La malla almacenada sigue siendo la misma. El avance final a 2.1 segundos en el capturador evita medir únicamente un frame con sombra cacheada. Los contadores finales del benchmark pueden representar ese caso cacheado; para carga de geometría animada se usan las capturas, y para GPU se usan las muestras con tiempo cambiante.

## Benchmark

Intel UHD / ANGLE, calidad media, 1280×720, campaña real, semilla 712. Ambas variantes tienen viento. Orden viento/sombra/sombra/viento; 30 frames de calentamiento y 120 muestras por bloque. Cuatro condiciones, 1 920 muestras GPU. CPU de envío, no simulación completa. Sin errores registrados ni eventos disjoint en los bloques validados.

| Vista | Hora | GPU sin / con sombras | Incremento | CPU sin / con sombras |
|---|---|---:|---:|---:|
| close | day | 14.824 / 21.300 ms | +43.7% | 3.641 / 4.000 ms |
| close | night | 15.105 / 19.240 ms | +27.4% | 3.371 / 3.632 ms |
| game | day | 15.287 / 18.969 ms | +24.1% | 3.301 / 3.268 ms |
| game | night | 16.726 / 20.437 ms | +22.2% | 3.308 / 3.485 ms |

No atribuir precisión universal a estas medias; hubo variación temporal en pruebas anteriores. Aquí el incremento aparece en las cuatro condiciones y es grande frente al beneficio visual. En baja el renderer desactiva sombras solares; no se fuerza un perfil distinto para obtenerlas y no se presenta un benchmark de baja inexistente.

Los vídeos diurnos contienen 72 frames de cámara determinista a 20 fps de reproducción, no FPS medidos. Noche se compara mediante capturas fijas. El shader permite deformación coincidente, pero no se certifica ausencia de todos los artefactos temporales ni se completó streaming largo de una variante ya descartada por coste.

La diferencia de píxeles solo confirma que actúa: cerca/día media absoluta 0.498 niveles por canal de 255; normal/día 0.023. No se usa como prueba de calidad. La noche también cambia ligeramente, por lo que no se afirma identidad nocturna. Véase pixel-audit.json.

## Próxima dirección

No perseguir sombras completas por fibra en este mapa global. Evaluar antes el apoyo visual con las soluciones de contacto existentes, evitando doble oclusión; cualquier alternativa debe preservar el coste del viento y el carácter cálido del suelo. Una división entre sombras estáticas/dinámicas requeriría arquitectura y memoria adicionales y no se justifica solo por este resultado. El objetivo de calidad global sigue pendiente.

Reproducción: servidor del worktree en 5190; capture-grass-wind-shadow.mjs, measure-grass-wind-shadow.mjs y record-grass-wind-shadow.mjs en tools/experiments. Las capturas publicadas son WebP sin pérdida de los PNG del capturador. No se añadieron recursos externos.
