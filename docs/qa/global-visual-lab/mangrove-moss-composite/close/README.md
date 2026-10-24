# Revisión cercana del musgo compuesto

**No promover al renderer por defecto.** La composición rompe parcialmente la uniformidad, pero la capa fina se lee como grano y no aporta una estructura de volumen más reconocible. Conservar solo como estudio de distribución. No invertir en más repeticiones del mismo benchmark antes de resolver esa limitación artística.

[Oblicua día](manglares-media-day-2-pair.webp) · [Oblicua noche](manglares-media-night-2-pair.webp).

24 capturas/12 parejas, Manglares seed712, media/baja1280×720, día150/noche350. Selección determinista de suelo seco y pendiente baja, alejado de obstáculos según datos existentes de la escena; no nuevas consultas de navegación en producción. Tres cámaras entre offsets[9,5,9] y[5,2,8]. Barro/musgo QA igual en ambas. Cámaras,objetivos,hora,draws y triángulos iguales; sin errores registrados. No benchmark nuevo.

Se inspeccionó candidata oblicua diurna completa y parejas oblicuas día/noche en media. El original presenta formas gruesas uniformes; el compuesto conserva zonas gruesas y añade grano fino, con más variación pero lectura todavía plana a ángulo bajo. El disco regular de barro permanece, pues su distribución no se modifica. No hay desplazamiento de siluetas; esta ruta no usa POM. De noche el relieve fino pierde lectura. No se afirma inspección de todas las poses.

## Bordes y límites

No se aprecia una junta evidente en las poses revisadas, pero no están marcadas las fronteras UV y no hay recorrido continuo: no certifica ausencia de juntas o shimmer.

Se compara diferencia absoluta entre primera/última fila o columna con la diferencia media de vecinos interiores, en los datos RGB1024². Ratio borde/interior original→compuesto: colorX1.065→1.090,Y1.021→1.017; normalX1.040→1.167,Y0.998→0.999; ARHX1.247→1.217,Y1.225→1.167. El borde horizontal de la normal empeora relativamente. Estas cifras no miden continuidad bajo iluminación o mipmapping, no son prueba de aceptación y no se tratan como igualdad exacta de borde.

[Auditoría de bordes](wrap-edges.json), [comparaciones](comparison.json), [capturas](captures.json). Mantener las conclusiones de coste anteriores (+0.283/+0.460ms GPU agrupados con parejas mixtas); esta revisión no resuelve su variación.

Siguiente dirección: mejorar estructura de musgo y transición hacia terreno húmedo sin limitarse a escalar la misma textura. No alterar siluetas originales, reglas de ocupación o simulación. Main intacto; objetivo global incompleto.

## Reproducción

```powershell
node tools/experiments/capture-mangrove-moss-composite-close.mjs
python tools/experiments/package-mangrove-moss-composite-close.py
```

Vite5190. PNG/WebP individuales locales; pares de extremos y registros publicados. Usa los mapas precalculados del ensayo padre.
