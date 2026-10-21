# Gran RÃ­o: respuesta direccional por ambas caras

**Conservar solo como alternativa QA; no promover.** Las caras opuestas a la luz quedan algo mÃ¡s claras y la noche conserva legibilidad, pero no se resuelve la separaciÃ³n entre suelo y cubierta. El incremento GPU observado tampoco justifica cambiar el valor predeterminado con esta mejora moderada.

[Diurna media](gran-rio-media-day-pair.webp) Â· [Nocturna media](gran-rio-media-night-pair.webp) Â· [Diurna baja](gran-rio-baja-day-pair.webp) Â· [Nocturna baja](gran-rio-baja-night-pair.webp)

Izquierda: control, receta previa con paleta candidata y desgaste. Derecha: contribuciÃ³n adicional `.65 * .5 * max(-dot(N,L),0.)` al tÃ©rmino direccional existente. Mantiene ambiente, gradiente de raÃ­z, paleta, sombras, altura, densidad y viento. No es dispersiÃ³n subsuperficial fÃ­sica ni correcciÃ³n de normales por cara visible: es una aproximaciÃ³n de respuesta de lÃ¡mina iluminada por el reverso. Usa la misma visibilidad de sombras que la luz frontal y el color direccional del ciclo dÃ­a/noche. No es una comparaciÃ³n contra main.

## Evidencia visual

24 capturas reales, 12 parejas: Gran RÃ­o semilla 712, 1280Ã—720, baja/media, dÃ­a 150/noche 350, tres poses. CÃ¡mara, objetivo, hora, llamadas, triÃ¡ngulos, instancias y buffers coinciden. Sin errores registrados ni overflow. InspecciÃ³n de las parejas normales media diurna/nocturna y de ambas vistas oblicuas media diurnas. Las siluetas permanecen iguales; no se ha validado movimiento ni streaming para este cambio.

[Capturas y contadores](captures.json) Â· [AuditorÃ­a visual](comparison.json).

## Rendimiento estacionario Intel UHD

Intel UHD 0x9A60, ANGLE D3D11. Ocho bloques en total: cuatro A/B/B/A por fase, pÃ¡ginas nuevas, perfil bajo. 30 frames de calentamiento antes de 120 muestras GPU y, por separado, 30 antes de 180 frames de cadencia por bloque. Total 960 muestras GPU y 1.440 frames de cadencia. Sin capturas durante mediciÃ³n. AuditorÃ­a de geometrÃ­a y cÃ¡mara por frame, estado de simulaciÃ³n estable, temporizadores sin descartes, disjoint, pendientes ni errores.

Rangos de las dos medias por variante, milisegundos:

| Medida | Control | Dos caras |
| --- | ---: | ---: |
| GPU dÃ­a | 9,43â€“9,47 | 9,69â€“10,51 |
| GPU noche | 10,94â€“11,09 | 11,21â€“12,74 |
| CPU render dÃ­a | 3,48â€“4,17 | 3,56â€“4,01 |
| CPU render noche | 3,59â€“3,67 | 3,50â€“3,66 |
| Intervalo dÃ­a | 16,63â€“16,99 | 16,63â€“16,63 |
| Intervalo noche | 16,64â€“16,72 | 16,63â€“16,63 |

Los tiempos GPU son mayores en esta serie, aunque no se controla frecuencia tÃ©rmica ni carga del sistema. Dos bloques no son intervalos de confianza; no atribuir causalmente todo el incremento a unas operaciones ALU. CPU render excluye simulaciÃ³n y el intervalo es entre entradas al render, no presentaciÃ³n en pantalla. No se aÃ±aden texturas, buffers, geometrÃ­a, llamadas ni pasadas; no hay mediciÃ³n fiable de VRAM total.

[Benchmarks completos](performance/benchmarks.json) Â· [Resumen auditado](performance/summary.json).

## DecisiÃ³n y siguiente paso

No acumular esta correcciÃ³n sobre el laboratorio por defecto. Esta prueba acota una hipÃ³tesis: las caras opuestas contribuyen a la oscuridad, pero aclararlas no basta para la continuidad buscada. La siguiente investigaciÃ³n debe medir por separado la seÃ±al del material subyacente y la cobertura efectiva de la geometrÃ­a a distancia, antes de otra correcciÃ³n luminosa. El objetivo de seis biomas continÃºa pendiente.

## ReproducciÃ³n

Con Vite 5190, ejecutar captura y benchmark por separado:

```powershell
node tools/experiments/capture-river-cover-two-sided.mjs
python tools/experiments/package-river-cover-two-sided.py
node tools/experiments/measure-river-cover-two-sided.mjs
python tools/experiments/audit-river-cover-two-sided.py
```

PNG originales locales; comparaciones, registros y herramientas publicados. Sin cambios de producciÃ³n, simulaciÃ³n o main.
