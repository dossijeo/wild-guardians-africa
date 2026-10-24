# Gran Río: variación cromática amplia del suelo

Control: tierraV2. Candidata: misma tierra con multiplicador cromático mundial de dos escalas (.16 y.49), pesos.8/.2. Mezcla entre(.72,.76,.80) y(1.12,1.08,1.02), aplicada exclusivamente mediante el peso existente de tierra. No cambia normales, POM, rugosidad, AO, cobertura geométrica, máscaras ni sombras reales.

24capturas/12parejas, baja/media1280×720, semilla712, día150/noche350, tres vistas. Cámara, hora y geometría verificadas; sin errores. [Día](gran-rio-media-day-pair.webp), [noche](gran-rio-media-night-pair.webp), [registros](captures.json), [auditoría](comparison.json). IzquierdaV2, derecha moteado. Conversiones individuales sin pérdida verificadas.

Inspeccionadas parejas normales media: la variación es visible y rompe la uniformidad del poblado. Sin embargo, las manchas suaves pueden leerse como sombras sin objeto y oscurecen áreas amplias de noche. No representa relieve nuevo ni humedad simulada. El borde circular tampoco desaparece. Conservar como alternativa artística para revisión, sin sustituirV2 ni declarar terminada la apariencia.

No descartar por rendimiento: todavía no hay benchmark. Añade dos evaluaciones de ruido por fragmento y operaciones de color, sin nuevas texturas, geometría, llamadas o pasadas. No afirmar coste cero. Pendientes lectura cercana, movimiento/origen y valoración de contraste nocturno antes de promoción. Posible siguiente dirección: relacionar variación amplia con estructura del material y reducir aspecto de sombra pintada, sin aumentar contraste indiscriminadamente.

```powershell
node tools/experiments/capture-river-soil-mottling.mjs
python tools/experiments/package-river-soil-mottling.py
```

Vite5190. Opción soilMottling falsa por defecto, QA exclusivamente. Simulación, navegación, balance, modelos y main intactos. PNG locales, pares seleccionados y registros publicados. Objetivo global pendiente.
