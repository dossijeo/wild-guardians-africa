# Diagnóstico del borde claro de arena

La franja dentada observada junto al poblado procede del término especular estilizado de la arena en las vistas probadas, no de una discontinuidad geométrica nueva. Eliminar solo ese término quita la franja conservando el relieve difuso. La máscara de desgaste modula su amplitud, pero no es necesario cambiarla para corregirlo.

Seis variantes sobre el material normal-only, media/baja, día/noche y tres cámaras: **72 capturas reales** (12 referencias y 60 contrastes). Cámara, hora, llamadas y triángulos coinciden en todos los contrastes; cero errores registrados. [Metadatos](captures.json), [auditoría](comparison.json).

| Variante | Qué aísla | Resultado de la revisión |
| --- | --- | --- |
| normal | Candidata anterior | Franja clara dentada visible en cámara normal |
| ignore-wear | Fuerza de normales sin desgaste | Ondas excesivas dentro del poblado; descartar como solución |
| strict-wear | Suprime relieve con desgaste 0,02–0,4 | Borra el detalle de casi todo el poblado; descartar como solución |
| macro-light | Iluminación con normal geométrica | Control que elimina la contribución de las normales al sombreado; no candidata artística |
| wear-mask | Visualiza el desgaste | Región amplia y continua alrededor del poblado; no solo una línea estrecha de camino |
| no-spec | Suprime únicamente specBand | Desaparece la franja, permanecen ondas y volumen; identifica el término responsable |

Capturas de cámara normal media: [referencia día](normal-day-game.webp), [sin desgaste](ignore-wear-day-game.webp), [desgaste estricto](strict-wear-day-game.webp), [normal geométrica](macro-light-day-game.webp), [máscara](wear-mask-day-game.webp), [sin especular día](no-spec-day-game.webp) y [noche](no-spec-night-game.webp).

El shader original usa `smoothstep(.62,.88,spec)*(1.-rough*.40)`. Con `rough=.98`, su factor aún es .608. El contraste se calcula con normales finas, por lo que la banda puede adquirir un borde ondulado. La rugosidad alta por sí sola no lo anulaba. No se cambian máscaras, posiciones, sombras solares ni la dirección del sol en esta ablación.

La [candidata posterior](../dry-specular/README.md) conserva las normales y sustituye únicamente el factor por `(1.-rough)^2` dentro del material del terreno desértico. No aplica esta decisión a otros biomas ni objetos.

Reproducir: `node tools/experiments/capture-desert-sand-edge-ablation.mjs`, después `node tools/experiments/package-desert-sand-edge-ablation.mjs`, con Vite en 5190. `WG_SAND_VARIANTS` selecciona etiquetas separadas por coma; `WG_SAND_APPEND=1` conserva las otras combinaciones. Por defecto ejecuta las seis variantes en ambas calidades. Se conservan las doce vistas normales media como WebP lossless; los restantes PNG diagnósticos se regeneran. No son benchmarks ni se cuantifica una mejora por MAE.
