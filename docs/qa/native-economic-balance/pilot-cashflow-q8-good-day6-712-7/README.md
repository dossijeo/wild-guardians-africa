# Diversificación temprana: parada cooperativa y resultado parcial

Fuente congelada `de5fa365`, semilla 712, Sabana/Mapungubwe, Q8, defensa trazada
con mantenimiento desde el día 6. Único cambio de estrategia frente a
`f8542c59`: selección explícita `--crop-policy cashflow`. No hay modificaciones
de precios, jornales, crecimiento, ingresos, daños ni cantidades de animales.
El auditor compara 317 hashes de fuentes nativas y balance sin diferencias.

| Día completo | Saldo control | Saldo mezcla | Cultivos control | Cultivos mezcla | Ingreso control | Ingreso mezcla |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 219 | 203 | 95 | 93 | 319 | 297 |
| 2 | 183 | 230 | 113 | 102 | 429 | 462 |
| 3 | 292 | 296 | 120 | 120 | 594 | 581 |
| 4 | 243 | 214 | 143 | 157 | 539 | 561 |
| 5 | 403 | 258 | 169 | 157 | 880 | 429 |
| 6 | 285 | 243 | 154 | 131 | 825 | 880 |

Inactividad agregada del mismo prefijo de seis días: control **73,67 %**,
mezcla **76,33 %**. Se decide parar cooperativamente por ausencia de una mejora
temprana convincente de actividad y capital. Se conserva la ejecución original
y no se inicia una campaña larga con esta mezcla.

La parada se observa en el día 7, tiempo simulado **250**, no justo al cierre
del día 6. Ese tramo parcial registra ingreso de 1.144, semillas 705, salarios
290, reparaciones 60 y saldo 332. No se compara ese saldo parcial con el cierre
de un día completo. La inactividad incluyendo el tramo parcial es 72,49 %.
Hay una recuperación tardía de ingreso; **no se afirma deterioro universal ni
que el cultivo yuca sea inviable**. En todo el registro observado se entregan
dos cajas de yuca, por 64 monedas, la primera el día 3. El resto corresponde a
339 cajas de mijo, por 4.290. No se atribuye el ingreso tardío a yucas futuras.

La contabilidad completa y parcial concilia exactamente. La partida no tiene
derrota ni victoria nativa: `receipt.json` identifica `stopped-early-calibration`
y el guardado es `partial-state.json.gz`. No son siete noches completadas ni
aceptación del equilibrio. Los presupuestos de una incursión parcial no deben
interpretarse como presupuestos abandonados definitivamente.

Reproducir la auditoría en un archivo nuevo:
`node tools/review-crop-cashflow.mjs
docs/qa/native-economic-balance/pilot-maintained-routed-q8-good-day6-712-7
docs/qa/native-economic-balance/pilot-cashflow-q8-good-day6-712-7 OUTPUT.json`.
Se rechaza sobrescribir un resultado existente. `comparison.json` conserva la
comparación y los hashes de los informes originales.

Comando del piloto: el ensayo anterior añadiendo `--crop-policy cashflow`,
esta carpeta como `--out` y `--stop-file .cache/cashflow-q8-712-stop.flag`.
La señal se creó durante la ejecución; no se debe reutilizar una señal de
parada existente para una nueva campaña. La parada usa el checkpoint nativo,
sin matar el proceso ni fabricar una derrota por timeout.

Diez pruebas de selección, CLI y contabilidad pasan. La política histórica
sigue predeterminada y producción/main permanecen sin cambios. Próxima
investigación: capacidad y contratación efectivamente pagadas, antes de
compensar las colas con precios o ingresos diferentes.
