# Replay congelado de Desierto/983, 21 noches

**Preparado, sin ejecutar.** Esta configuración selecciona solo `default-walls` + Desierto/983 de la cohorte `post-intro-holdout-21`. Conserva horizonte, genoma, semilla, suelo de productividad y límites cooperativos. El caso anterior terminó censurado por coste computacional durante el día 15; no fue una derrota.

Ejecutar únicamente después de integrar PR #40 en `main` o fijar un SHA final estable del motor, y sincronizar esta rama. Desde la raíz del repositorio:

```sh
node tools/evolutionary-balance/run-post-intro-pilot.mjs docs/qa/evolutionary-balance/post-intro-desierto-gate-replay-21/config.json
```

El runner registra el SHA de fuente y los hashes de módulos en `results/config.json`, avances diarios y el informe nativo completo. Este directorio de salida es nuevo; el informe censurado original permanece en `post-intro-holdout-21`. Analizar por separado noches 1–5 de presentación y presión militar desde la noche 6. Comparar estado físico/económico, tiempo de `Game.tick`, puertas y rutas con la cohorte anterior, etiquetando ambos SHA. Un nuevo coste-stop o fallo técnico no cuenta como derrota.

El control `default-no-walls` de la cohorte anterior no debe presentarse como superior: sus incursiones de las noches 6–10 tuvieron cero contactos pese a 8–16 animales. Si el cambio de motor altera accesos o resultados físicos, repetir ese control con el mismo SHA nuevo antes de hacer una comparación emparejada. Para ello, crear una configuración distinta con `caseSelection` apuntando a `default-no-walls`; no sobrescribir los informes anteriores.
