# Gran Río: sombreado de raíz en el límite de cobertura

**No promover: contribución visual insuficiente.** Atenuar el oscurecimiento de las bases durante la transición lejana conserva la geometría, pero no elimina la separación visible entre suelo y cubierta en las vistas normales examinadas. Se mantiene la receta anterior.

[Diurna media](gran-rio-media-day-pair.webp) · [Nocturna media](gran-rio-media-night-pair.webp) · [Diurna baja](gran-rio-baja-day-pair.webp) · [Nocturna baja](gran-rio-baja-night-pair.webp)

Izquierda: multiplicador de base a punta fijo, `.63 + .37 * uv.x`. Derecha: `mix(1., .63 + .37 * uv.x, farFade)`. La candidata conserva el desvanecimiento geométrico original de 12 m, paleta candidata y desgaste. No es una comparación contra main. No se modifica alcance, densidad ni altura respecto al control.

## Capturas y alcance de validación

Gran Río, semilla 712, 1280×720, baja/media, día 150/noche 350, tres poses. 24 capturas y 12 parejas verificadas con cámara, objetivo, tiempo, llamadas, triángulos, instancias y bytes de buffers coincidentes. Sin errores registrados, overflow cero. Se inspeccionaron las vistas normales baja diurna y media diurna/nocturna. No se valida movimiento ni se realizó benchmark temporal: la mejora artística no basta para conservar la candidata. Igualdad de contadores no demuestra igualdad de tiempo GPU.

[Registros](captures.json) · [Diferencias y contadores](comparison.json). Las diferencias de píxeles acreditan que el shader cambió, no una mejora estética.

## Diagnóstico para el siguiente pase

El código muestra una diferencia estructural: el suelo mapeado usa `brdf4`, normales de textura, AO de material/contacto y reflexión; la cubierta usa un término difuso `.35 + .65 * max(dot(N,L),0.)`, sombreado de raíz y constantes propias. La paleta común no implica respuesta luminosa equivalente. Esta observación no demuestra qué término causa el borde: el siguiente experimento debe comparar la respuesta difusa con luz y orientación controladas, conservando volumen y sombras, en lugar de seguir acumulando correcciones pequeñas de brillo o altura.

El suelo se calcula en `src/rendering/african-toon.js`; la cubierta en `tools/experiments/qa-continuous-grass-river.js`. Este piloto solo intercepta QA; no cambia producción ni otros biomas.

## Reproducción

```powershell
node tools/experiments/capture-river-cover-root.mjs
python tools/experiments/package-river-cover-root.py
```

Vite en 5190. PNG fuente locales, cuatro pares y registros publicados. El objetivo global sigue pendiente.
