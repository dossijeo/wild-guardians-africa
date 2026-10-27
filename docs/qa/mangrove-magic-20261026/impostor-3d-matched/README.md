> VALIDACIÓN RETIRADA: el helper QA usado para forzar 3D contenía una inversión de la mezcla de impostores. Las cifras se conservan como datos brutos, pero no justifican una comparación de 3D puro frente a impostores hasta verificar y repetir las representaciones. Véase ../../tree-atlas-refresh-20261026/COMPARISON-CORRECTION.md.

# Impostores frente a 3D: prueba rápida controlada

Intel UHD (ANGLE D3D11), 1280x720, calidad media, Manglares semilla712, cámara normal del juego. A/B/A/B,60frames de calentamiento y240muestras GPU válidas por ejecución. Simulación pausada. Árboles cercanos, terreno, agua, iluminación y población lógica iguales. B reemplaza el horizonte por modelos nuevos con LOD, mantiene densidad/rank/fade de A. No hay expulsiones por presupuesto ni árboles pendientes en B. Hash de las5349transformaciones lógicas idéntico en las4ejecuciones.

| Ejecución | Representación lejana | GPU media ms | CPU envío ms | Intervalo entre renders ms | P95 intervalo ms |
|---|---|---:|---:|---:|---:|
| A1 | Impostores |23.589|3.669|26.700|37.460|
| B1 |3D LOD|24.176|2.627|26.598|38.940|
| A2 | Impostores |20.380|2.936|22.673|28.740|
| B2 |3D LOD|23.402|2.520|25.810|35.260|

A:255866triángulos,85drawcalls. B:623690triángulos,60drawcalls. Geometría y draws estables entre repeticiones de cada condición. TiempoGPU medido mediante EXT_disjoint_timer_query_webgl2, sin disjoint. CPU mide envío del renderer, no todo el hilo principal. Intervalo entre renders no es una medición directa de presentación física de pantalla.

## Decisión de esta prueba

Conservar provisionalmente los impostores: existe ahorro GPU en ambas parejas (+0.587/+3.022ms al sustituirlos por3D), mientras el 3D reduce CPU(-1.041/-.417ms). No demuestra superioridad uniforme de FPS: primera pareja prácticamente igual en intervalo, segunda favorece impostores. La variabilidad entre ejecuciones impide atribuir un ahorro preciso universal. No retirar el sistema únicamente por la reducción de geometría de los nuevos árboles.

Limitaciones: una escena estática/cámara normal; fondo parcialmente oculto por árboles cercanos. Atlas actuales representan modelos antiguos, B usa modelos nuevos aprobados. No prueba streaming/cámara móvil, otras perspectivas, todos los biomas ni memoria real GPU; B conserva atlas cargados por usar el backend de comparación, así que conteo de texturas no estima ahorro potencial de retirarlos. La primera secuencia impostor-3d-abab es inválida para equivalencia y queda separada; usar exclusivamente impostor-3d-matched.

[Comparativa real](comparison-normal.png) · [Datos y auditoría](summary.json).

Reproducción: WG_QA_URL=http://127.0.0.1:5220, WG_WATER_SEED=712, WG_WATER_FIXED_TIME=1, WG_FAR_WATER_SURFACE=1, WG_FAR_MASK_STEP=2, WG_ANGULAR_LOD=1, WG_WATER_GPU=1, WG_WATER_CAMERA=normal, WG_FAR_REPRESENTATION_AUDIT=1, WG_MATCH_FAR_DENSITY=1. Ejecutar check-mangrove-water-authority.mjs cuatro veces secuencialmente con WG_FORCE_FAR_3D=0/1/0/1 y WG_WATER_OUT=<root>/0-0,1-1,2-0,3-1. Resumir con node tools/experiments/summarize-impostor-3d.mjs <root>.
