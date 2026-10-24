# Escala fina de Moss002: insuficiente como solución

Prueba de una única variable: escala UV de Manglares .115 → .32, con los mismos mapas, normales, iluminación y mezcla de barro. Repetición aproximada 8.70 → 3.125 unidades de mundo. No se combina con el nuevo borde adaptado: se conserva la transición anterior para aislar la escala.

[Comparativa elevada diurna](manglares-media-day-1-pair.webp) · [Cámara normal nocturna](manglares-media-night-0-pair.webp). Izquierda original, derecha escala fina.

La inspección de la candidata completa elevada diurna y normal nocturna, y de la pareja elevada, muestra menor tamaño de los abultamientos que daban aspecto acolchado. Sin embargo, el suelo sigue siendo una cobertura homogénea y el relieve se lee menos desde la cámara normal nocturna. **No promover esta escala uniforme como solución artística del musgo.** El ensayo identifica la escala como parte del problema, pero no produce agrupaciones naturales, variedad entre zonas húmedas y secas ni volumen colectivo comparable a la referencia.

## Evidencia

24 capturas reales / 12 parejas: media y baja, día150 y noche350, tres cámaras (normal/elevada/inversa), semilla712, 1280×720. Verificados cámara, objetivo, hora, draw calls y triángulos coincidentes por pareja y ausencia de errores registrados. Conversiones individuales lossless comprobadas contra PNG; pares publicados reducidos a1920×540. [Registros](captures.json) · [Comparación](comparison.json).

No añade mapas, geometría, draw calls ni operaciones de shader. Esto no demuestra coste GPU idéntico: cambia selección de mip, huella de muestreo y acceso a caché. No se ejecutó un benchmark nuevo porque la candidata no supera la evaluación artística. No se ha probado movimiento continuo, aliasing temporal ni primer plano en esta serie. No hay assets nuevos ni cambios de licencia.

## Consecuencia para el siguiente pase

No seguir ajustando una escala universal ni aumentar normalBoost. La limitación pendiente es la distribución de la superficie: el mismo musgo cubre casi todo, mientras la referencia necesita agrupaciones y transiciones entre materiales. Una propuesta posterior deberá estudiar la distribución visual usando datos disponibles del terreno y mantener el detalle pequeño dentro de zonas de musgo, sin modificar simulación, navegación o siluetas. Eso es una hipótesis futura, no una mejora implementada en este ensayo.

## Reproducción

Vite5190:

```powershell
node tools/experiments/capture-mangrove-moss-fine-scale.mjs
python tools/experiments/package-mangrove-moss-fine-scale.py
```

La ruta intercepta únicamente el JSON en QA y verifica la escala original antes de sustituirla. El renderer predeterminado y main permanecen intactos.
