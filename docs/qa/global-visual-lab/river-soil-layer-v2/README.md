# Gran RÃ­o: capa de tierra en las zonas desgastadas

Conservar como candidata QA para movimiento y streaming; no activar por defecto. La segunda iteraciÃ³n separa visualmente tierra y hierba manteniendo detalle en el poblado y los corredores. La forma amplia del desgaste sigue siendo evidente y el borde no queda completamente resuelto. No representa calidad global alcanzada.

[Diurna media](gran-rio-media-day-pair.webp) Â· [Nocturna media](gran-rio-media-night-pair.webp) Â· [Diurna baja](gran-rio-baja-day-pair.webp) Â· [Nocturna baja](gran-rio-baja-night-pair.webp)

Izquierda: control con paleta candidata y desgaste geomÃ©trico retenido. Derecha: capa de tierra. No es comparaciÃ³n contra main. La [primera iteraciÃ³n](../river-soil-layer/README.md) quedÃ³ demasiado clara; se conservan sus registros.

## Material y representaciÃ³n

Reutiliza los tres mapas existentes de [Ground079S, ambientCG](https://ambientcg.com/view?id=Ground079S), licencia CC0 confirmada en la fuente. [Rutas, hashes y tamaÃ±os](asset-provenance.json). No se descarga ni genera otro recurso. Color multiplicado por (.68,.60,.48), periodo 5 m, normales .65 con atenuaciÃ³n de distancia existente y rugosidad mÃ­nima .86. La mezcla usa smoothstep(.12,.70,wear), exclusivamente Gran RÃ­o.

Se conserva Grass Medium 01 fuera del desgaste. La nueva capa mezcla color, normal, rugosidad y AO, sin multiplicar la oclusiÃ³n de ambos materiales; mantiene las sombras del renderizador. El parallax de hierba se atenÃºa con el desgaste; la tierra no aÃ±ade POM. Coordenadas ancladas al mundo con el mismo mecanismo de origen flotante, pero todavÃ­a sin prueba de streaming para esta candidata.

No modifica distribuciÃ³n, densidad, alturas, viento, modelos, caminos autoritativos ni simulaciÃ³n. La mÃ¡scara de suelo no reproduce la huella de exclusiÃ³n de ocho vecinos de las hojas; no afirmar correspondencia exacta. La transiciÃ³n responde al desgaste y no al lÃ­mite de distancia de cobertura.

## Capturas

24 capturas y 12 parejas, Gran RÃ­o semilla 712, 1280Ã—720, baja/media, dÃ­a 150/noche 350, tres poses. AuditorÃ­a de cÃ¡mara, objetivo, hora, llamadas, triÃ¡ngulos, instancias y buffers coincidentes; sin errores registrados ni overflow. InspecciÃ³n normal baja diurna y normal media diurna/nocturna. [Trazas](captures.json), [auditorÃ­a](comparison.json).

## Coste de recursos

Tres texturas adicionales de 1024Ã—1024, hasta tres lecturas de textura por fragmento en zonas de tierra; ninguna geometrÃ­a, pasada o llamada nueva. La rama de suelo evita las lecturas cuando el peso es menor de .001, pero el coste real depende de ejecuciÃ³n en grupos y cachÃ©s. EstimaciÃ³n RGBA8 con mipmaps: aproximadamente 16 MiB, no VRAM medida ni coste total de cachÃ©/driver. Se reutiliza la propiedad y liberaciÃ³n de layerTextures de BiomeGround, cuya recarga y liberaciÃ³n queda pendiente de validaciÃ³n especÃ­fica.

## ReproducciÃ³n

Ejecutar captura y benchmark por separado, con Vite 5190:

```powershell
node tools/experiments/capture-river-soil-layer-v2.mjs
python tools/experiments/package-river-soil-layer-v2.py
node tools/experiments/measure-river-soil-layer-v2.mjs
python tools/experiments/audit-river-soil-layer-v2.py
```

PNG fuente locales. Solo interceptaciÃ³n QA; producciÃ³n y main intactos.

## Benchmark estacionario y decisión provisional

Intel UHD 0x9A60, ANGLE D3D11, perfil bajo, ocho bloques totales (A/B/B/A por día y noche), páginas nuevas. 30 frames de calentamiento antes de 120 muestras GPU, y por separado 30 antes de 180 frames de cadencia. Total 960 muestras GPU y 1.440 frames. Auditoría aprobada de estado, geometría y cámara por frame; temporizadores sin pendientes, disjoint, descartes ni errores. [Datos](performance/benchmarks.json), [resumen](performance/summary.json).

Rango de dos medias por variante, en ms:

| Medida | Control | Capa de tierra |
| --- | ---: | ---: |
| GPU día | 13,30–16,28 | 14,17–14,83 |
| GPU noche | 14,17–16,90 | 15,42–16,80 |
| CPU render día | 3,33–3,43 | 3,39–3,45 |
| CPU render noche | 3,16–3,40 | 3,36–3,41 |
| Intervalo día | 22,91–27,45 | 25,06–26,16 |
| Intervalo noche | 22,96–26,19 | 23,31–27,76 |
| p95 intervalo día | 45,50–46,20 | 44,20–44,20 |
| p95 intervalo noche | 40,40–44,30 | 39,50–51,70 |

Serie con variabilidad alta; los rangos GPU se solapan. No demuestra aceleración ni coste aceptable. CPU es tiempo de render, no simulación; intervalos entre entradas al render, no presentación. Dos bloques no son intervalos de confianza y no se controlan frecuencia térmica ni carga ajena. No comparar estos valores con estudios anteriores como si fueran un A/B.

Recomendación: conservar la segunda receta solo para QA. Antes de promoción: movimiento, origen flotante, recarga/liberación y repetición de rendimiento con menor variabilidad. La primera versión queda descartada. La calidad global y el presupuesto de esta capa siguen sin acreditarse.
