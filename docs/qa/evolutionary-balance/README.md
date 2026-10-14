# Laboratorio evolutivo: primer corte (fases 1–2)

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

## Siguiente puerta de calidad

1. Usar el piloto de siete noches y repetirlo con más semillas/biomas si no hay
   fallo técnico; conservar los controles con calendario de magias actual.
2. Instrumentar estado real de recintos para calibrar pérdidas y reparaciones.
3. Ajustar el modelo y demostrar menor error fuera de muestra antes de usarlo
   para filtrar miles de configuraciones de balance.
4. Sólo entonces congelar una o varias políticas competentes, comparar V1 y
   variantes militares mediante campañas nativas de 10–20, 30–60 y 100 noches.
   La optimización de balance sigue separada y no toca producción sin revisión.
