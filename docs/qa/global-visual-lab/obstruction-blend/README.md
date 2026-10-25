# Fundido convencional de instancias cercanas

**Descartado en esta forma:** elimina el tramado8×8, pero deja ver múltiples caras interiores y copas superpuestas, con aspecto de cristal. [Vista oblicua](day-0017-pair.webp). No se recomienda aunque el número de draws adicionales sea pequeño.

Solo las instancias con nativeVisibility entre0,002 y0,999 salen del lote opaco y se dibujan como objetos transparentes individuales, ordenables por Three. Las completamente ocultas no se envían. El resto conserva instancing, materiales y modelos. Cada objeto parcial mantiene el shader del original con alpha continua, depthWrite=false y sin descarte Bayer. No se crea geometría artística nueva.

Sabana baja,semilla712,1280×720, cuatro poses día/noche.16 capturas, ocho parejas con cámara/hora/cobertura idénticas y sin errores registrados. Normal:69 draws en ambas y RGB exacto. Las otras poses añaden1–2 draws; una reduce5.814 triángulos por omitir instancias completamente invisibles. No presentar esa reducción como mejora visual o de API.

No se hizo benchmark de esta variante porque el defecto visual impide recomendarla. El [siguiente control](../obstruction-surface-blend/README.md) dibuja solo la superficie más cercana para evitar acumulación de caras.

Far vegetation desactivada: no prueba impostores. Lifecycle, efectos transparentes y profundidad secundaria no certificados. Solo QA; original intacto.

Reproducir con Vite5190: `node tools/experiments/capture-obstruction-blend.mjs`, `python tools/experiments/package-obstruction-blend.py`. [Datos](captures.json), [comparación](comparison.json).
