# Coste incremental de ceniza por altura

ABBA en Intel UHD/D3D11 ANGLE, media1280x720, semilla712, cámara normal fija. Ambos usan scale0,06/relief0,44; solo B condiciona ceniza por altura.960consultasGPU y1440frames de cadencia, ventanas separadas y calentamiento180frames. Misma cámara/geometría por frame; sin erroresGL, disjoint, descartes ni cambios de estado.

| Medias de bloque,ms | A1/A2 | B1/B2 |
|---|---:|---:|
|GPU día|13,411/15,617|14,299/13,814|
|GPU noche|14,309/15,425|17,306/15,033|
|CPU día|4,286/4,628|4,173/4,412|
|CPU noche|4,415/4,224|3,983/4,086|
|Intervalo día|16,627/16,629|16,627/16,938|
|Intervalo noche|16,646/16,627|17,903/16,593|
|p95 intervalo noche|17,3/18,0|25,0/18,0|

Resultados mixtos; primer bloqueB nocturno añade2,997msGPU y p95 sube a25ms. La repetición no reproduce la penalización, pero el dato se conserva. No afirmar aceleración ni coste cero. Una lecturaARH adicional es coste de fuente, no una medición aislada de su tiempo; además cambia cuánto POM se aplica. Mantener candidata por aporte artístico, no promover por defecto sin resolver estabilidad visual y coste nocturno.

[Brutos](benchmarks.json), [resumen](summary.json). Reproducir measure-volcanic-ash-cavities.mjs y audit-volcanic-ash-cavities.py. No sumar este resultado a otra serie para inferir coste total. Los dos bloques no son intervalos de confianza.
