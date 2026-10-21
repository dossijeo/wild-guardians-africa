# Transición por altura entre musgo y barro

Comparación directa contra la mezcla lineal anterior, no contra el renderer predeterminado. Ambas variantes cargan los mismos seis mapas, usan la misma máscara contextual y conservan geometría, iluminación y distribución general. Se cambia únicamente cómo se convierte la cobertura en peso de mezcla.

## Sesgo de los mapas

[Datos de los canales B](height-ranges.json): altura del musgo mediana186/255, P10=141 y P90=210; barro mediana39/255, P10=3 y P90=126. Comparar valores crudos favorece sistemáticamente al musgo. La primera serie conserva esa comparación como control técnico: [pareja diurna](manglares-media-day-1-pair.webp), [datos](captures.json).

La segunda centra cada altura en su mediana, divide por P90−P10 y limita a[-.5,.5]. Es normalización artística de mapas, no altura física calibrada en metros. Diferencia de alturas + (2×cobertura−1)×1.4 determina el peso, con smoothstep de anchura máxima entre .10 y1.5×fwidth para suavizar la transición según huella de píxel. Color, normal, rugosidad y AO usan el mismo peso.

## Resultado visual

[Calibrada elevada diurna](calibrated/manglares-media-day-1-pair.webp) · [Calibrada normal nocturna](calibrated/manglares-media-night-0-pair.webp). Izquierda mezcla lineal, derecha mezcla por altura. Se inspeccionaron las candidatas completas de estas dos vistas.

La versión calibrada separa materiales de forma más reconocible que la superposición lineal. Sin embargo, los bordes producen mucho detalle pequeño y el barro nocturno se ve demasiado azulado respecto a los parches existentes. **Conservar solo como candidata de transición para primer plano y movimiento; no integrar.** No afirma relieve geométrico nuevo, equivalencia con el mockup ni calidad global alcanzada.

La repetición del musgo persiste. La coherencia de color/iluminación del barro con los parches independientes sigue sin resolver. No seguir aumentando contraste para ocultar esa diferencia.

## Verificación y coste pendiente

Dos series de24 capturas/12 parejas cada una: media/baja, día150/noche350, tres vistas, seed712,1280×720. Cámara, objetivo, hora, draw calls y triángulos iguales por pareja, sin errores registrados. Conversiones individuales lossless verificadas contra PNG; pares publicados reducidos. [Comparación cruda](comparison.json) · [Capturas calibradas](calibrated/captures.json) · [Comparación calibrada](calibrated/comparison.json).

La selección por altura reutiliza los canales B ya leídos, sin nuevas texturas ni muestras frente a la mezcla lineal. Añade aritmética y derivadas; no se ha medido coste. Frente al musgo puro sigue incluyendo tres mapas de barro, una lectura de máscara y ruido adicionales. Sin benchmark, validación temporal, lifecycle o horizonte en este pase. fwidth no acredita por sí solo ausencia de aliasing en movimiento.

## Reproducción

Con Vite5190:

```powershell
node tools/experiments/capture-mangrove-height-blend.mjs
python tools/experiments/package-mangrove-height-blend.py
node tools/experiments/capture-mangrove-height-calibrated.mjs
python tools/experiments/package-mangrove-height-calibrated.py
```

Todo mediante rutas QA. Sin assets nuevos ni cambios en simulación, navegación, modelos o main.

## Revisión cercana posterior

[Transición en primer plano](transition-close/README.md): la selección separa materiales, pero sigue sin dar espesor y conserva discrepancias de color. No demuestra mejora suficiente de volumen para integrar. El piloto de suelo libre sin transición se excluye; cámaras corregidas verificadas.
