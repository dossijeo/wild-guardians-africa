# Laboratorio evolutivo: primer corte (fases 1–2)

La búsqueda más reciente de genes de gestión con balance fijo, reserva de otro
bioma y comparación emparejada de catorce noches se documenta en
[`management-search/README.md`](management-search/README.md). Aún no demuestra
una estrategia generalizable ni una victoria de cien noches.

Estado: **experimental; ningún ajuste de balance aprobado**. Esta rama sólo cambia
políticas del jugador virtual y herramientas de QA. Wild Engine sigue resolviendo
terreno, rutas, ataques, daños, producción y ledger reales. No hay victoria de 100
noches validada aquí. El documento adjunto *Balance V1* se conserva como candidato
de trabajo; sus precios, HP y multiplicadores militares **no se aplican**.

| Material | Producción: precio / HP / puerta | V1 propuesto: precio / HP / puerta | Recomendación final |
|---|---:|---:|---|
| Zarzas | 10 / 100 / 60 | 10 / 100 / 75 | Pendiente |
| Madera | 20 / 200 / 120 | 18 / 220 / 165 | Pendiente |
| Adobe | 35 / 300 / 180 | 28 / 360 / 270 | Pendiente |
| Reforzado | 55 / 400 / 240 | 38 / 520 / 390 | Pendiente |
| Piedra | 80 / 500 / 300 | 50 / 750 / 560 | Pendiente |

V1 también propone multiplicadores militares dependientes de la atracción.
Quedan expresamente **sin evaluar ni aplicar** hasta congelar estrategias
competentes y mejorar la predicción de pérdidas estructurales y agrícolas.

## Auditoría del control

- Precios y HP actuales: `src/simulation/balance.js`, sección `walls`; la resolución
  de resistencia está en `src/simulation/rules.js` y `src/simulation/game.js`.
- Atracción: suma de valores base de cultivos vivos en `src/simulation/rules.js`.
  Presión y composición: `src/simulation/raid-pressure-plan.js`; impacto físico:
  `src/simulation/raids.js`.
- Construcción y reparación legal: `Game.previewWallChain`, `Game.buildWallChain`,
  `Game.requestRepair`, con gastos verificados desde el ledger.
- Bot de control: `tools/native-campaign-runner.mjs` y
  `tools/native-expanding-defense-policy.mjs`. El runner histórico fijaba
  `plantsPerWorker=6` aunque aceptara otro argumento, y comenzaba magias agrícolas
  en día 3/5 pese a que el juego las permite desde día 1. La política evolutiva
  conecta explícitamente estos parámetros a sus decisiones; los controles
  históricos siguen intactos. `good-current-magic` aísla la corrección del
  calendario de magias conservando el resto de decisiones de `good`.
- Ningún recuento de muros construidos, impactos recibidos o HP perdido certifica
  un recinto cerrado. El modelo no inventa un porcentaje protegido. Para modelar
  eficacia defensiva hacen falta observaciones de conectividad de Wild Engine por
  perfil de animal, cultivos dentro/fuera, brecha y tiempo de exposición.

## Modelo matemático de cribado

`node tools/evolutionary-balance/calibrate-model.mjs` recalcula
[`model-sabana-712/model.json`](model-sabana-712/model.json) y la proyección
condicional. Fuente: `spatial-sabana-seed712-enclosure-final-30nights.json.gz`,
SHA-256 `d1acbf7925192b38b0c00b08a2268d6d77bc4378026a7aaa6fdcf004bdb28276`.
La campaña declara derrota tras **17 noches completas**; se excluyó la jornada
terminal parcial 18. Calibración días 1–10, validación días 11–17. No se mezcla con
`enclosure-latest`, `selector` ni los cocientes V1 de otra versión. El artefacto
histórico no contiene el hash exacto del ejecutable que lo produjo.

El modelo usa ingreso y salarios por planta viva anterior, semillas por planta
comprada, salidas no militares de stock, atracción por censo vivo al spawn,
destrucción por daño agrícola potencial y reparación por HP estructural perdido.
Son **ratios descriptivos**, no relaciones causales. El campo histórico
`exposedLivingAtSpawn` registra el censo vivo, no la fracción fuera de una muralla.
En la validación temporal, el error absoluto ponderado es:

| Resultado | Error |
|---|---:|
| Ingreso | 12,7 % |
| Salarios | 6,4 % |
| Semillas | 0,1 % |
| Cultivos destruidos | **86,4 %** |
| Reparaciones | **58,3 %** |

El modelo **no sirve todavía para descartar configuraciones militares**: las
brechas y el estado del recinto producen pérdidas no estacionarias. La proyección
contable para 100 días es sólo un detector exploratorio de inviabilidad; se detiene
si su contabilidad teórica se vuelve negativa. Nunca cuenta como simulación nativa
ni como evidencia de supervivencia. No confunde daño estructural decimal con
muertes agrícolas: los cultivos tienen 1 HP y ambas respuestas se ajustan por
separado. Tampoco resta semillas de reposición dos veces.
Con estos coeficientes la proyección teórica se declara inviable en el día 27;
esa coincidencia aproximada con una derrota histórica **no valida** su mecanismo.
[`sensitivity.json`](model-sabana-712/sensitivity.json) varía daño y siembra
±25 %, exclusivamente para mostrar sensibilidad interna de este surrogate. Sus
fechas de inviabilidad (20–38) no son predicciones de Wild Engine ni justifican
valores militares finales.

## Búsqueda de política con balance fijo

`tools/evolutionary-balance/run-ga.mjs` ejecuta un GA simple y determinista. Las
entradas configurables son semilla del GA, generaciones, población, noches,
escenarios de entrenamiento, escenarios de reserva, controles y directorio de
salida. Las cohortes entrenamiento/reserva no pueden compartir bioma + semilla.
Cada candidato se evalúa en campañas reales continuas con Wild Engine; se guardan
genes, hash Git y SHA-256 de los módulos experimentales, resultados diarios,
ingresos, salarios, semillas, reparaciones, cultivos y daños. Una excepción o
campaña truncada tiene puntuación inválida. La supervivencia domina la función de
aptitud; se penaliza la ausencia de actividad agrícola, sin imponer un techo a
plantas, trabajadores o acciones. El GA no lee ataques futuros ni altera el RNG
del juego.
La salida denomina al mejor puntaje corto `pilotLeader`, no estrategia final.
Con tan pocas noches, más caja puede ocultar menor inversión defensiva;
se conservan por separado caja, producción, daños y gasto real de murallas.

Genes activos: plantas por trabajador, días de salarios reservados, reserva de
semillas, fracción de caja disponible para defensas, inicio de defensas, umbral
de reparación, material, prioridad/cadencia de magias y cadencia de siembra. Las
acciones siguen siendo `Game.hire`, `Game.plant`, `Game.cast`, `Game.buildWallChain`
y `Game.requestRepair`. Las magias usan selección exacta de una planta y potencia
diaria del juego. La cadencia de una política sólo representa decisiones humanas
del bot; no cambia cooldowns ni presupuestos mágicos.

Para un piloto acotado:

```powershell
node tools/evolutionary-balance/run-ga.mjs .\ruta\config.json
```

Un archivo de configuración puede contener, por ejemplo:

```json
{"rngSeed":712,"generations":2,"population":4,"days":7,
 "train":[{"biome":"sabana","seed":712},{"biome":"gran-rio","seed":2026}],
 "holdout":[{"biome":"sabana","seed":123}],
 "baselines":["good","good-current-magic","expansive","bad","no-walls"],
 "output":"docs/qa/evolutionary-balance/my-run"}
```

El piloto de 1 día verifica cableado. El de 2 días en Sabana/123 obtuvo para el
candidato inicial 90 cultivos, 551 monedas, 124 cajas, frente a `good` legado
64/451/116 y `no-walls` 89/396/117. Estas diferencias **no miden defensa**:
la fase introductoria apenas presiona a la finca, y el candidato usa las magias
agrícolas desde el día 1 mientras `good` legado espera. Ningún genoma se recomienda
todavía como estrategia competitiva.

Piloto nativo de siete noches, **sólo Sabana**, entrenamiento semilla 712 y
reserva semilla 123. Los cuatro brazos de la reserva usan el mismo balance y
semilla; 7/7 noches transcurrieron sin victoria ni derrota terminal. En reserva:

| Política | Caja día 7 | Plantas vivas | Cajas entregadas acumuladas | Cultivos destruidos | Murallas pagadas | Reparaciones |
|---|---:|---:|---:|---:|---:|---:|
| Genoma inicial `376ca7…` | 1.182 | 116 | 660 | 2 | 430 | 94 |
| `good-current-magic` | 809 | 142 | 670 | 1 | 590 | 60 |
| `good` legado | 683 | 106 | 543 | 0 | 430 | 46 |
| `no-walls` legado | 774 | 113 | 639 | 51 | 0 | 0 |

Todos los días conciliaron exactamente con el ledger. En este piloto hay una
ventaja física observable de los brazos con murallas respecto a `no-walls`, pero
el genoma y `good-current-magic` muestran una elección distinta entre ahorro y
producción/protección. **No hay estrategia superior demostrada** para 100 noches.
La comparación proviene de una ejecución anterior a la mejora del puntaje que
invalida las fincas vacías y al nuevo registro de aplicaciones mágicas; los
resultados físicos nativos se conservan sin retocarlos. Las gráficas están en
[`pilot-7day/trajectories.svg`](pilot-7day/trajectories.svg).

### Piloto emparejado de 14 noches

Se ejecutaron cuatro campañas nativas continuas en Sabana/Mapungubwe,
semillas 712 y 123. El candidato fue el genoma inicial `376ca7…`; el control
`good-current-magic` usa el mismo calendario vigente de magia, de modo que la
comparación no atribuye al genoma la corrección del calendario legado. La
configuración, SHA-256 de los módulos y progreso diario están en
[`paired-14/config.json`](paired-14/config.json), y cada brazo conserva su
informe nativo en `.json.gz`, con hashes del original y del archivo en
[`paired-14/archive-index.json`](paired-14/archive-index.json). No hubo
recargas artificiales. No se cambiaron precios, daño ni
presión militar. Las cuatro campañas llegaron a 14/14 noches sin victoria o
derrota terminal; **14 noches no acreditan supervivencia hasta la 100**.

| Semilla | Política | Caja día 14 | Plantas vivas | Destruidas | Ingresos | Semillas | Salarios | Murallas | Reparaciones | `Game.tick` acumulado |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 712 | Candidato | 924 | 157 | 49 | 18.696 | 8.839 | 8.048 | 860 | 725 | 133,2 s |
| 712 | Control | 549 | 86 | 99 | 16.294 | 7.650 | 7.384 | 860 | 551 | 107,1 s |
| 123 | Candidato | 932 | 133 | 78 | 18.358 | 8.740 | 7.840 | 790 | 756 | 42,3 s |
| 123 | Control | 536 | 79 | 108 | 16.616 | 7.820 | 7.321 | 900 | 739 | 45,1 s |

El candidato termina ambos pilotos con más caja y cultivos, pero también
siembra más y paga más salarios/semillas. Los picos de pérdida no desaparecen:
el candidato perdió 57 plantas en la noche 11 de la semilla 123. Las
aplicaciones registradas fueron 783 de Multiplicar y cero de Crecimiento en
cada brazo; este piloto **no mide** una estrategia mixta de ambas magias.
Las cifras de murallas pagadas y `wallHits` no certifican el porcentaje de
cultivos protegidos ni el cierre físico del recinto.
Las hordas tampoco fueron idénticas: con la misma regla militar y semilla, la
atracción varía al cambiar el valor agrícola. En la semilla 712 aparecieron
138 animales ante el candidato y 134 ante el control; en la 123, 137 y 134.
Las murallas perdieron respectivamente 7.116/5.624 HP (712) y 7.925/6.548 HP
(123), con 86/86 y 79/90 piezas pagadas. Más desgaste estructural y menos
cultivos perdidos es una observación interesante, pero sin datos de brechas y
recintos no prueba por sí sola mayor eficacia defensiva. Los informes reducidos
de esta batería no registraron composición por especie ni estado topológico;
esas observaciones quedan pendientes.

El rendimiento exige diagnóstico antes de ampliar la campaña: en semilla 712,
el candidato gastó 52,6 y 48,8 s de `Game.tick` en los días 13 y 14; el control
gastó 24,4 y 24,8 s en los días 10 y 11. El coste no puede atribuirse sólo al
genoma. Los días siguientes y su navegación deben perfilarse con un checkpoint
reproducible. La estrategia es **candidata provisional**; faltan otras semillas,
biomas, horizontes mayores, estado real de recintos y perfiles de rendimiento.
Las trayectorias comparativas están en
[`paired-14/trajectories.svg`](paired-14/trajectories.svg).

Un replay congelado del candidato en Sabana/712 conservó estados de inicio y
de incursión del día 13 en [`profile-sabana-712`](profile-sabana-712). El
snapshot de incursión, perfilado durante 50 ticks, gastó 3,414 s en `Game.tick`:
4.151 llamadas `approachPath` (23 rutas, 4.128 negativas), 4.818 `workerPath`
y 58.854 `walkable`. La selección ocupó 1,566 s y `approachPath` 1,305 s.
Una muestra de una de cada 20 llamadas sitúa 206/208 en
`reachableApproach → targetForImpl` al recorrer estructuras/murallas, frente a
una en selección de cultivo y otra en revalidación; hubo sólo 25 intentos
individuales de cultivo. El cuello residual es la aproximación repetida a
estructuras, no la contratación del bot. Esta rama de balance **no cambia** el
navegador; el perfil es evidencia para una corrección separada de Wild Engine.
El replay puede variar en milisegundos frente a la batería por reconstrucción
de residencia y carga del host; el diagnóstico se basa en recuentos y stacks,
no en igualdad exacta de tiempos.

### Diversidad de magias y reserva de biomas

El gen adicional `growthShare` reparte los turnos de uso entre Crecimiento y
Multiplicar en un ciclo de cuatro aplicaciones (0, 25, 50, 75 o 100 % de
preferencia por Crecimiento). `magicPriority` decide el orden dentro del ciclo.
Si no hay objetivo válido para la magia preferida, se intenta la otra. Cada
toque sigue usando `Game.cast`, con los presupuestos diarios originales; la
política no impone un número máximo de acciones. `growthShare=0` reproduce la
decisión del genoma piloto anterior. Se registran aplicaciones efectivas,
segundos realmente adelantados al terminar cada efecto y monedas extra de
Multiplicar sólo cuando la caja se entrega.

Se compararon cuatro repartos **con todos los demás genes idénticos** durante
tres jornadas en entrenamiento Sabana/712 y Gran Río/2026. Se reservaron
Manglares/123 y Desierto/909, sin repetir bioma ni semilla. Son jornadas
introductorias; no prueban eficacia militar.

| Bioma de entrenamiento | Política de magia | Caja día 3 | Plantas | Cajas | Crecimiento real | Ingreso extra de Multiplicar |
|---|---|---:|---:|---:|---:|---:|
| Sabana | 0 % Crecimiento | 607 | 74 | 215 | 0 s | 323 |
| Sabana | 50 %, primero Crecimiento | 600 | 68 | 224 | 119 s | 276 |
| Sabana | 50 %, primero Multiplicar | 586 | 71 | 227 | 106 s | 278 |
| Sabana | 100 % Crecimiento preferido | 461 | 54 | 216 | 147 s | 48 |
| Gran Río | 0 % Crecimiento | 593 | 65 | 215 | 0 s | 323 |
| Gran Río | 50 %, primero Crecimiento | 502 | 73 | 224 | 120 s | 276 |
| Gran Río | 50 %, primero Multiplicar | 562 | 73 | 232 | 109 s | 278 |
| Gran Río | 100 % Crecimiento preferido | 474 | 44 | 213 | 155 s | 48 |

El filtro corto eligió 50 % con prioridad Multiplicar por un margen pequeño.
En la reserva, comparado con `good-current-magic` (mismo calendario de usos,
sin cambio de reglas), el candidato obtuvo:

| Bioma de reserva | Política | Caja día 3 | Plantas | Cajas | Crecimiento real | Ingreso extra de Multiplicar |
|---|---|---:|---:|---:|---:|---:|
| Manglares | Candidato | 503 | 76 | 221 | 106 s | 276 |
| Manglares | Control | 597 | 86 | 212 | 0 s | 321 |
| Desierto | Candidato | 402 | 77 | 181 | 134 s | 274 |
| Desierto | Control | 465 | 80 | 173 | 0 s | 322 |

Los cuatro brazos de reserva llegaron a 3/3 jornadas y conciliaron el ledger.
El candidato entregó más cajas, pero cerró con menos caja y plantas que el
control en ambos biomas: **la pequeña ventaja de entrenamiento no se sostuvo
fuera de muestra**. No hay genoma competitivo demostrado, ni evidencia para
modificar la potencia de las magias. Los reportes y la gráfica están en
[`multi-biome-magic-3day-v2`](multi-biome-magic-3day-v2).

El primer intento, conservado en
[`multi-biome-magic-3day`](multi-biome-magic-3day), se detuvo en Desierto/909
por `SpatialChunkUnavailable` al validar una parcela. El informe de error
retiene el estado y los recibos parciales; no se contabilizó como derrota.
El explorador del **simulador** ahora omite una parcela cuya ruta no está
certificada y continúa buscando una legal, sin tocar la navegación ni las
reglas del juego. Una prueba nativa reproduce Desierto/909 y verifica una
jornada completa, siembra pagada y ledger conciliado. La segunda cohorte se
recalculó íntegra tras el arreglo; no mezcla informes anteriores.

## Siguiente puerta de calidad

1. Extender la comparación multi-bioma de magia a 7–14 noches cuando se
   estabilice el coste de `Game.tick`; conservar controles con calendario
   vigente y comprobar la ventaja fuera de muestra, que aquí no apareció.
2. Instrumentar estado real de recintos para calibrar pérdidas y reparaciones.
3. Ajustar el modelo y demostrar menor error fuera de muestra antes de usarlo
   para filtrar miles de configuraciones de balance.
4. Sólo entonces congelar una o varias políticas competentes, comparar V1 y
   variantes militares mediante campañas nativas de 10–20, 30–60 y 100 noches.
   La optimización de balance sigue separada y no toca producción sin revisión.
