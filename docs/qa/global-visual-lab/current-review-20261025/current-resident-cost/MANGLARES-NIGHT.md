# Manglares: referencia nocturna actual

Dos ejecuciones válidas r1/r3, Intel UHD 0x9A60 / ANGLE D3D11, Chrome,
1280×720/media. Misma receta y escena guardada que la referencia diurna;
cámara y objetivo se copian de manglares-media-default-r1.json. Hora visual
350, comprobada al terminar; elapsed y trabajadores idénticos a la referencia
diurna. La simulación no avanza para llevar la escena a la noche.

| Métrica ms | r1 | r3 |
|---|---:|---:|
| GPU media | 22.330 | 23.032 |
| GPU P95 | 25.871 | 26.032 |
| CPU render media | 5.878 | 6.235 |
| Presentación media | 24.585 | 25.211 |
| Presentación P95 | 33.425 | 33.395 |
| Máximo presentación | 49.975 | 50.010 |

Cada ejecución: 60 frames de calentamiento, 360 medidos más 12 de confirmación,
125 muestras GPU sin disjoint; cero chunks nuevos, fondos asentados, residencia
nativa estable. Solo advertencias X4000 conocidas. GPU elapsed incluye burbujas
de pipeline; render CPU incluye draw. No son tiempos de GPU ocupada exclusivamente.

Se inspeccionaron ambos PNG a resolución nativa: suelo de musgo, claros de barro,
helechos densos, agua azul oscura y poblado conservan lectura nocturna. Diferencia
RGB media entre repeticiones 0.000178 sobre 255; no identidad exacta. No se cambió
material, iluminación, densidad ni simulación de producción.

## Fallo conservado

r2 falló antes de crear chunks: ERR_NETWORK_CHANGED y Failed to fetch. El harness
agotó su plazo de carga, sin obtener muestras GPU. Se conserva failure.json;
no se presenta como resultado lento ni se sobrescribe. r3 reemplaza esa muestra
inexistente, sin seleccionar por su rendimiento. Los programas QA permiten ahora
--runs r1 r3 y conservan informes existentes sin volver a ejecutarlos.

## Alcance y reproducción

La referencia diurna anterior era 21.62–22.23 ms GPU. Estas series separadas no
son A/B intercalado y no permiten atribuir una diferencia pequeña a un cambio
concreto. Recomiendo conservar el aspecto aprobado. No se demuestra 60 FPS ni
eliminación de los picos de presentación, tampoco streaming activo o todos los
estados nocturnos. El cierre global sigue abierto.

Con Vite 5190: run-current-resident-cost.py --biome manglares --night --runs r1 r3;
summarize-current-resident-cost.py con los mismos argumentos. Los scripts están
en tools/experiments. night-pose.json preserva la cámara exacta. Las huellas de
fuentes registran el pequeño cambio del harness que añade visualTime al resultado.
La preparación de pose termina antes del calentamiento; los tiempos readyMs
registrados pertenecen a la carga inicial diurna, no al coste de preparar la noche.
