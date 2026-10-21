# Musgo compuesto offline: candidata sin lecturas adicionales

Conservar para medir y revisar movimiento, sin integrar. La vista diurna inspeccionada conserva áreas de relieve grueso y añade zonas finas; la repetición es menos uniforme, pero no alcanza todavía la distribución natural del mockup. La pareja nocturna mantiene edificios legibles y pierde parte del relieve fino. No es una mejora global aprobada.

[Día](manglares-media-day-pair.webp) · [Noche](manglares-media-night-pair.webp).

## Material reutilizable

Tres mapas1024² generados determinísticamente desde los mapas Moss002 ya presentes. Mezcla de escala original y escala4, con el mismo peso periódico en color, normal y ARH. Campo de peso hecho de armónicos enteros, transición smoothstep entre.40 y.60; comparte período del material. Normales mezcladas y renormalizadas. Color/ARH tratados como datos del pipeline existente, sin conversión gamma adicional. No horneado por parcela ni modificación de geometría.

La capa fina se reduce a256² con filtro BOX y se repite4×4 antes de mezclar. Pierde ancho de banda respecto a muestrear el original en GPU a escala4: intercambio explícito para mantener1024². No equivale píxel a píxel a la mezcla procedural anterior, que usaba3.7 y otro campo de peso. La composición todavía se repite cada~8.7m a escala.115; periodicidad matemática no prueba ausencia de juntas visibles bajo mipmapping.

Mismos tres mapas residentes y lecturas por fragmento de la rama pureMoss, shader sin modificaciones. Estimación RGBA8+mips:16MiB por conjunto, igual a fuente, no VRAM medida ni garantía de igualdad de coste. PNG puede tener distinto tamaño/tiempo de decodificación. [Tamaños y hashes](resources.json). Fuente: mapas Moss002 proporcionados en el repositorio, mismos recursos usados por el juego; no se descargaron assets externos ni se afirma una licencia nueva distinta de su procedencia existente.

## Evidencia y límites

24 capturas/12 parejas, media/baja, seed712,1280×720, día150/noche350, cámaras normal/elevada/reversa. Cámaras,objetivos,hora,draws y triángulos iguales; sin errores registrados. Barro toon-interior QA igual en ambas rutas. Inspección principal: candidata normal diurna completa y pareja nocturna normal. No revisión exhaustiva de todas las poses.

La primera captura se detuvo tras completar solo el control para corregir el submuestreo sin filtro; la serie final se regeneró íntegra con filtro BOX. No se usa esa ejecución parcial como evidencia de candidata.

Pendientes: benchmark directo, juntas, estabilidad temporal, streaming y escala cercana. No trasladar los tiempos de la mezcla doble anterior a esta receta: su coste aún no está medido. Sin cambios de runtime por defecto, main, simulación, ocupación o modelos.

## Reproducción

```powershell
python tools/experiments/bake-mangrove-moss-composite.py
node tools/experiments/capture-mangrove-moss-composite.mjs
python tools/experiments/package-mangrove-moss-composite.py
```

Vite5190. [Capturas](captures.json), [comparación](comparison.json). Mapas horneados y código publicados; PNG capturados locales, pares normales publicados. Interceptor QA modifica únicamente los tres paths del material Manglares.

## Medición posterior

[ABAB directo](performance/README.md):1920muestras GPU, resultado mixto (+0.283/+0.460ms agrupados día/noche, parejas de signo distinto). Presupuesto no aprobado. Mantener QA y revisar detalle cercano/juntas; esta actualización sustituye la condición de benchmark aún no ejecutado.

## Revisión cercana posterior

[24 capturas oblicuas y bordes](close/README.md):variación parcial pero detalle fino granular, sin salto claro de volumen. No promover; conservar como estudio de distribución. No repetir benchmark sin resolver estructura artística. Juntas y estabilidad temporal no certificadas.
