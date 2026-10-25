# Arena del Cañón desde cámara normal

24 capturas / 12 parejas, media/baja, día150/noche350, semilla712, 1280×720. Receta idéntica a canyon-sand-maps, sin modificar material para este pase. La cámara y las ocultaciones cercanas se fijan por pose; se verifican cámara, objetivo, hora, llamadas y triángulos.

[Normal diurna](media-day-0-pair.webp) · [Normal nocturna](media-night-0-pair.webp) · [Elevada obstruida](media-day-1-pair.webp)

Se inspeccionaron las dos variantes normales diurnas, la pareja normal nocturna y la elevada diurna de calidad media. La arena ondulada se reconoce desde cámara normal y rompe la uniformidad de grava junto a edificios. La luminosidad nocturna del suelo cambia considerablemente; no aprobar por equivalencia al original. La vista elevada está dominada por la meseta del primer plano: es una limitación del encuadre y no valida la composición global. No se afirma revisión artística individual de las otras vistas.

La mejora de material en cámara normal justifica un primer ABBA en calidad baja, documentado en ../performance. No implica aprobación de coste, streaming ni integración. Permanecen pendientes un encuadre elevado útil y el control de las crestas en sombra visto en primer plano.

```powershell
node tools/experiments/capture-canyon-sand-overview.mjs
python tools/experiments/package-canyon-sand-overview.py
```

Vite5190. PNG fuente locales; pares seleccionados y registros publicados. Main intactos; receta solo QA.
