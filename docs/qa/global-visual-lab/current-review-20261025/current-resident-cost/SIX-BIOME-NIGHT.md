# Referencia nocturna actual: seis biomas

Dos ejecuciones válidas por bioma, Intel UHD 0x9A60 / ANGLE D3D11, Chrome,
1280×720/media. Receta experimental actual y opciones normales de streaming.
Los cinco biomas de este pase se midieron sobre 8945f22ed; Manglares se incorpora
del pase previo documentado en MANGLARES-NIGHT.md. Fuentes ejecutadas con hashes.

La pose se copia de la referencia diurna de cada bioma. Hora visual 350 comprobada
al finalizar, con elapsed y trabajadores idénticos al día; no se avanza la
simulación para cambiar la iluminación. Se mantiene el mismo encuadre y semilla.
La preparación de pose se completa antes de los 60 frames de calentamiento.

| Bioma | GPU media r1/r2* ms | CPU render media ms | Presentación P95 ms | Máximo presentación ms |
|---|---:|---:|---:|---:|
| sabana | 17.90/17.33 | 5.65/5.64 | 33.36/33.28 | 33.72/34.27 |
| gran-rio | 19.02/18.59 | 5.60/5.12 | 33.37/33.35 | 33.93/34.16 |
| manglares | 22.33/23.03 | 5.88/6.23 | 33.42/33.40 | 49.97/50.01 |
| desierto | 16.61/16.51 | 3.73/3.88 | 33.28/33.23 | 33.50/33.56 |
| volcanes | 17.46/17.67 | 5.17/5.35 | 33.31/33.33 | 33.56/33.75 |
| gran-canon | 15.35/15.20 | 4.68/4.30 | 16.98/16.89 | 33.53/33.38 |

* Manglares usa r1/r3: r2 falló por ERR_NETWORK_CHANGED antes de crear chunks.
Se conserva el fallo. Las otras diez ejecuciones finalizaron y pasaron el
verificador sin reemplazar muestras. Cada ejecución válida tiene 125 consultas
GPU sin disjoint, 372 intervalos de presentación y cero nuevos chunks durante
la medición. Fondos asentados, residencia nativa estable y ningún error distinto
de X4000. La comparación de cada pareja comprueba opciones, cámara, objetivo,
hardware, trabajadores y elapsed. Estos checks no prueban sesiones completas.

## Inspección visual real

Las doce capturas finales se inspeccionaron a resolución nativa (Manglares en su
pase anterior). Sabana conserva fibras y lectura cálida del poblado; Gran Río
mantiene caminos distinguibles y cobertura verde; Manglares conserva musgo y
helechos; Desierto mantiene ondulaciones; Volcanes conserva roca oscura con lava
brillante; Cañón conserva paredes estratificadas, ribera y agua azul profunda.
No se modifica arte ni densidad para estas mediciones.

Limitaciones visibles: el agua pequeña del fondo de Sabana tiene contorno angular
en esta perspectiva; no se diagnostica su causa aquí. Los reflejos del Cañón no
pueden validarse temporalmente con una captura. La oscuridad volcánica conserva
contraste pero esta prueba no certifica legibilidad en todos los monitores.
No se afirma que una imagen final pruebe cada frame del streaming.

## Interpretación

Conservar las seis direcciones. Se completa la referencia de escena residente
diurna/nocturna en media, no un A/B de rendimiento frente a main. Las series día
y noche no están intercaladas: diferencias pequeñas pueden incluir deriva del
hardware. GPU elapsed incluye burbujas; CPU render incluye draw. Los tiempos de
carga archivados pertenecen a la carga inicial diurna, no a preparar la noche.

Los máximos de presentación siguen presentes, especialmente en Manglares. No
se declara 60 FPS ni eliminación de tirones. Quedan calidad baja con condiciones
comparables y la síntesis de movimiento/simulación con la receta seleccionada.
Las pruebas activas previas siguen siendo evidencia complementaria, no sustitutos
de estos benchmarks. El objetivo global permanece abierto y PR159 continúa en
borrador; comprobado mediante GitHub durante este pase. No se modifica main.

Reproducir con run-current-resident-cost.py --biome <nombre> --night y
summarize-current-resident-cost.py con iguales argumentos, Vite 5190. Para
Manglares añadir --runs r1 r3. Los informes existentes no se sobrescriben.
