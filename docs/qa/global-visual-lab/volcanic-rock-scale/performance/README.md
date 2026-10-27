# Coste de escala ampliada en Volcanes

ABBA, media1280x720, semilla712, Intel UHD/D3D11 ANGLE. A:Rock035 scale0,12/relief0,22; B:0,06/0,44. Ceniza mask en ambos. Cámara normal fija, misma escena pausada; 180frames de calentamiento por ventana, GPU120 y cadencia180 medidos separadamente. No capturas durante medición.

Ocho bloques,960consultasGPU y1440frames de cadencia. Cámara, calls70 y triángulos502117 coinciden por frame A/B y repeticiones. Sin erroresGL, disjoint, descartes ni cambios de estado; máximoGPU55,788ms. Estos controles no eliminan variación térmica o carga externa.

| Media por bloque,ms | A1/A2 | B1/B2 |
|---|---:|---:|
|GPU día|21,952/18,601|13,817/13,677|
|GPU noche|15,334/13,466|14,297/14,153|
|CPU render día|4,379/4,407|4,142/4,198|
|CPU render noche|4,018/4,361|4,129/4,148|
|Intervalo día|26,932/16,627|16,627/16,627|
|Intervalo noche|17,096/16,628|16,719/18,677|
|p95 intervalo noche|19,9/17,1|17,6/23,0|

Dos medias por variante/fase, no intervalos de confianza. GPU diurna menor en ambas parejas, pero elevada variación de los controles y ventanas separadas impiden atribuir toda la diferencia a escala/POM. Noche GPU y cadencia mixtas: no afirmar aceleración general ni coste cero. La peor cadencia B nocturna se conserva, no se excluye para favorecer la propuesta.

Conservar candidata artística y comprobar POM en movimiento. No hay motivo en esta serie para descartarla únicamente por coste, pero tampoco para promoverla como optimización. No se ha medido cámara cercana, streaming o coste acumulado de seis biomas. El shader conserva máximo8muestrasPOM, no un número fijo de lecturas efectivas por fragmento; escala puede cambiar la intersección y acceso a mipmaps. No se instrumenta aquí ese número real de lecturas.

[Brutos](benchmarks.json), [resumen y percentiles](summary.json). Reproducir measure-volcanic-rock-scale.mjs y audit-volcanic-rock-scale.py, Vite5190. Reservar una carpeta nueva antes de repetir.
