# Margen de viento con cobertura refinada

Comparación real en perfil media,1280x720, semilla712, tres cámaras y día/noche. Dos sesiones nuevas; centro y cultivo colocados mediante órdenes reales en las mismas coordenadas. A:0,6; B:0,85. Fuerza8 y tiempo visual2 idénticos. Doce PNG y seis parejas.

| Vista | Módulos cercanos A/B | Lejanos A/B | Triángulos A/B |
|---|---:|---:|---:|
|Normal|4050/4029|7297/7121|892068/889400|
|Oblicua|3798/3762|5151/4934|949631/945735|
|Inversa|3563/3532|6396/6194|947705/944229|

Contadores iguales día/noche dentro de cada variante. Sin errores de página/GL ni overflow. Ambos eventos retiran correctamente los anclajes cercanos al cultivo. La candidata conserva más del99% de los módulos cercanos; la inspección oblicua diurna mantiene volumen y continuidad, con claro algo mayor. La vista normal nocturna mantiene legibilidad de los accesos y edificios; no se modifica la iluminación.

Conservar0,85 como candidata de protección del viento. Esta comparación no mide CPU/GPU del perfil medio ni certifica ausencia de intersecciones entre las ocho muestras de desgaste. Siguen pendientes streaming y movimiento con el margen ampliado. No extrapolar el benchmark baja a media.

[Oblicua día](day-1-pair.webp), [normal noche](night-0-pair.webp), [contadores](comparison.json). Reproducir capture-river-yard-crop.mjs con WG_YARD_QUALITY=media, WG_WIND_PADDING=0/1 y WG_YARD_OUT distinto para cada sesión. Base y expanded contienen capturas, estado de cámara y evento real.
