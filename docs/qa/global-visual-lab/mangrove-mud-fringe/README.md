# Transición de musgo a barro: anchura frente a avance interior

Dos intervenciones exclusivamente visuales sobre los parches existentes. Musgo original Moss002, sin compuesto offline. No cambia contornos geométricos, posición, triángulos, navegación u ocupación.

## Anchura variable: descartar como solución

24 capturas/12 parejas, media/baja, seed712,1280×720, día150/noche350, tres vistas cercanas. Sustituye smoothstep(.05,.85,edge) por smoothstep(.04,.35+.80*noise,edge), ruido world-locked frecuencia.9. Cambia la anchura del difuminado, pero la candidata oblicua diurna inspeccionada sigue mostrando el disco regular. No aporta suficiente cambio artístico; no benchmark.

[Diurna](manglares-media-day-2-pair.webp) · [Nocturna](manglares-media-night-2-pair.webp). [Registros](captures.json), [comparación](comparison.json).

## Avance hacia el interior: candidata QA

12 capturas/6 parejas, calidad media, mismas condiciones. Peso de barro smoothstep(.05,.65,edge-2.2*smoothstep(.25,.75,noise)). El musgo avanza de forma desigual hasta2.2unidades hacia el interior; sigue siendo mezcla opaca de material en la superficie original. La distancia al contorno ya existe en el atributo qaMudEdge; el ruido se calcula en shader. No nuevos mapas ni draw calls, pero añade cálculo procedural.

[Diurna](inset/manglares-media-day-2-pair.webp) · [Nocturna](inset/manglares-media-night-2-pair.webp). Inspección: candidata oblicua diurna completa y pareja nocturna. Rompe el disco visible y deja una región irregular reconocible de barro. Reduce significativamente superficie expuesta, sin cuantificarla como área física. Puede ocultar parches pequeños: no aprobar hasta examinar variedad de tamaños, cámara normal, orilla, movimiento, streaming y coste. No se afirma mejora global de musgo ni relieve nuevo.

En ambas series: cámaras,objetivos,hora,draws y triángulos iguales por pareja; sin errores registrados. Simulación/materiales congelados y barro toon-interior QA en ambos lados. No benchmark nuevo: mismos draws no implican igual GPU. No extrapolar la inspección de un parche a todos los parches o calidades.

Se conserva inset solo para continuar; la anchura variable queda documentada como insuficiente. Main y renderer predeterminado intactos. Sin assets nuevos.

## Reproducción

```powershell
node tools/experiments/capture-mangrove-mud-fringe.mjs
python tools/experiments/package-mangrove-mud-fringe.py
node tools/experiments/capture-mangrove-mud-inset.mjs
python tools/experiments/package-mangrove-mud-inset.py
```

Vite5190. [Registros inset](inset/captures.json), [comparación inset](inset/comparison.json). PNG y WebP completos locales; pares de extremos y registros publicados.
