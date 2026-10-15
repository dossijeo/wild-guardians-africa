# Paridad del cribado matemático con la presión militar vigente

El cribado `calibrate-model.mjs` usaba `round(4 + 30P)` para proyectar la
cantidad de animales, aunque los informes nativos aquí analizados fueron
generados con la candidata militar **v3**: `round(4 + 30√P)`, rampa inicial
de 8/10/12/14 animales y media móvil persistente de atracción. Ahora lee la
versión registrada por cada incursión, rechaza informes que mezclan
versiones, y utiliza las funciones de presión y memoria del motor. También
acepta tanto el ledger anidado histórico como las filas económicas planas
del runner actual. Estos cambios sólo afectan a la herramienta matemática;
no modifican el juego ni los parámetros militares.

El artefacto histórico de Sabana/712 en `../model-sabana-712/` corresponde
también a v3. Se conservaron sus tres salidas previas con sufijo
`-pre-parity.json`, así como la versión posterior a esa corrección con sufijo
`-pre-stock-correction.json`. La proyección antigua declaraba inviabilidad
contable en el día **27**; con presión v3, en el **15**; y al excluir el
censo inicial no observado de los coeficientes, en el **23**. En el día 14,
la antigua proyección indicaba 9 animales y la nueva 16. Ninguna de esas
cifras representa una
campaña nativa; el informe de referencia terminó realmente tras 17 noches.

Los dos informes nuevos proceden del piloto de entradas de incursión
[`PR #46`](https://github.com/dossijeo/wild-guardians-africa/pull/46),
checkout nativo `d9110380`. Las fuentes comprimidas, configuraciones,
hashes y salidas del modelo están preservados en `sources/` y `results/`.
La jornada terminal parcial se excluye de la calibración.
Su incursión, si terminó, sí se incluye en una validación separada del
daño agrícola; sus ingresos y gastos parciales siguen excluidos.

| Bioma/semilla | Entrenamiento | Validación | Error ingresos | Error salarios | Error semillas | Error cultivos destruidos | Error reparaciones | Resultado nativo | Cribado contable |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Sabana/712 | días 1–9 | días 10–15 | 9,7 % | 3,8 % | 2,7 % | **72,7 %** | 34,7 % | derrota día 16 | sin inviabilidad contable hasta día 100 |
| Gran Cañón/123 | días 1–7 | días 8–13 | 29,1 % | 15,5 % | 0,3 % | **67,6 %** | 72,9 % | derrota día 14 | inviabilidad día 17 |

El informe no registra cuántas plantas había **antes** de la primera
jornada: su primera fila ya es un censo al terminarla. La versión anterior
reutilizaba ese censo final como inventario inicial al ajustar ingresos,
salarios y salidas de plantas. Los coeficientes basados en inventario usan
ahora sólo los días 2–9 o 2–7; semillas y gasto de murallas conservan la
primera jornada. Las salidas anteriores de los tres casos quedan con el
sufijo `-pre-stock-correction.json`. Este único cambio mueve el cribado de
Sabana/712 desde inviabilidad teórica en el día **81** a no detectarla en
100 días, aunque la partida nativa perdió en la noche **16**. La pantalla
matemática usa además una apertura hipotética de 700 monedas y 68 plantas;
no debe leerse como una predicción de la apertura real.

Al incorporar únicamente el daño medido en la incursión terminal, el error
agrícola de validación es **82,4 %** en Sabana (días 10–16) y **78,7 %** en
Gran Cañón (días 8–14). El modelo predice 3,4 cultivos destruidos en la
noche 16 de Sabana frente a 57 reales, y 20,9 en la noche 14 de Gran Cañón
frente a seis reales. El campo `raidHoldoutError` del JSON contiene esta
medida separada de la conciliación económica de días completos.
El informe histórico de Sabana/712 también arroja **88,5 %** al incluir
únicamente el daño de su incursión terminal, por lo que el desajuste no
depende de una sola campaña nueva.

El error es la suma de diferencias absolutas en la ventana de validación,
dividida por el total real de cada variable. El cribado contable usa
coeficientes medios y no sabe cuándo un perímetro queda abierto, qué
cultivos quedan expuestos ni si la política puede financiar una reparación.
El error no es un pequeño desajuste uniforme: en Sabana predice **3,5**
cultivos destruidos en el día 15 frente a **42** reales; en Gran Cañón
predice **15,8** y **19,5** en los días 12 y 13 frente a **cero** reales.
La misma eficiencia media falla tanto al abrirse una defensa como cuando
una incursión no llega a los cultivos. Cambiar un único multiplicador de
daño no puede corregir ambos extremos.
Por eso su horizonte teórico de 100 días en Sabana **no predice supervivencia**: la
campaña nativa perdió 42 y 57 plantas en las dos últimas incursiones. En
Gran Cañón, la protección incompleta y el desplome agrícola tampoco son
representables mediante una eficacia defensiva promedio.

Este modelo puede seguir detectando incoherencias aritméticas gruesas, pero
**no debe descartar ni aprobar candidatos militares por su proyección de
100 días**. La búsqueda evolutiva deberá usar campañas nativas cortas y
mediciones de recintos/brechas para esa decisión. La fórmula de cantidad
vigente deja, sólo por la componente temporal de presión, 11 animales en
la noche 14 aun con valor agrícola cero; esa respuesta de recuperación
requiere evaluación de balance aparte.

Reproducción desde la raíz del repositorio, sobre este commit:

```sh
node tools/evolutionary-balance/calibrate-model.mjs docs/qa/evolutionary-balance/model-current-pressure/sources/sabana712/report.json.gz docs/qa/evolutionary-balance/model-current-pressure/results/sabana712
node tools/evolutionary-balance/calibrate-model.mjs docs/qa/evolutionary-balance/model-current-pressure/sources/canyon123/report.json.gz docs/qa/evolutionary-balance/model-current-pressure/results/canyon123
```
