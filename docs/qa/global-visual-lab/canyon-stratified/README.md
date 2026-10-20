# Roca estratificada proyectada — piloto CC0

20/10/2026. Candidato QA, no integrado. Fuente y licencia en [SOURCE.md](SOURCE.md).

Cliff Side aporta grietas y bloques visibles donde Rock035 solo daba grano. La paleta permanece calida, pero las bandas procedurales continuan dominando. La vista baja muestra una transicion brusca al horizonte sin parche. No alcanza la referencia artistica y no se conserva esta implementacion para runtime.

## Evidencia visual

Doce capturas: base global-lighting y candidato, tres camaras, dia/noche. Fixture real WorldScene, caso 21, semilla 712, calidad media, 1280 x 720, horas 150/350. comparison.json verifica las seis parejas con identicas camaras, objetivos y horas.

- [Antes lateral de dia](canyon-global-lighting-side-day.png) / [despues](canyon-canyon-stratified-side-day.png).
- [Antes lateral nocturno](canyon-global-lighting-side-night.png) / [despues](canyon-canyon-stratified-side-night.png).
- [Vista baja y discontinuidad](canyon-canyon-stratified-low-day.png).

Cero draw calls y triangulos adicionales. Dos texturas adicionales, 1024 x 1024. Contador de geometrias: +5 solo en primera captura diurna, cero en las restantes; el parche no crea geometria. No confundir cache entre cargas con geometria nueva. Un error de recurso 404 se registra en la pagina base y benchmark, sin URL identificada; ninguna excepcion de shader registrada. No se afirma una consola completamente limpia.

## Coste

ABBA en una misma pagina lateral, dia y noche, 180 muestras y 30 de calentamiento por tramo. Datos completos en paired.json y agregados en performance-summary.json. El benchmark ahora espera la carga asincrona del material antes de guardar las funciones candidatas: necesario para comparar este piloto con texturas externas. Los estudios asincronos anteriores de roca no tenian benchmark temporal publicado.

GPU dia: 15,356 -> 17,396 ms (+2,040). Noche: 15,985 -> 17,417 ms (+1,432). Hay deriva entre tramos (candidato diurno 16,298/18,495 ms), pero este ensayo no acredita el presupuesto +0,5 ms. Dos proyecciones por mapa, cuatro lecturas por fragmento en paredes. Solo materiales residentes, no horizonte ni binding de chunks nuevos. No se valida streaming ni se publica como cambio jugable.

## Decision

Conservar recurso y capturas como candidato artistico, rechazar esta implementacion por coste y continuidad. Siguiente ensayo: proyeccion dominante con menos lecturas, textura compartida con horizonte y suavizar las bandas excesivamente regulares sin cambiar siluetas. Verificar de nuevo dia/noche y coste antes de integrar. El objetivo global de seis biomas sigue pendiente.

Reproduccion PowerShell:
```powershell
$env:WG_MATERIAL_STUDY='canyon-stratified'
node tools/experiments/capture-material-study.mjs
python tools/experiments/summarize-ground-frequency.py canyon-stratified
$env:WG_PAIR_CASES='21'
$env:WG_PAIR_VIEW='side'
node tools/experiments/benchmark-material-study.mjs
```
