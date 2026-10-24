# Proyeccion dominante y continuidad de roca

20/10/2026. Prototipo QA, sin integracion en runtime. Reutiliza Cliff Side CC0 sin nuevos assets: [fuente, licencia y hashes](../canyon-stratified/SOURCE.md).

## Resultado

Una proyeccion por mapa (eje horizontal dominante de la normal geometrica) reduce cuatro lecturas a dos. Material compartido para terreno residente y horizonte. Un hook QA antes del dibujo conecta materiales nuevos; dos mapas se liberan al disponer WorldScene. No modifica vertices, colores de vertices ni reglas del juego.

La primera version solo parcheaba materiales presentes: mejoraba el horizonte diurno, pero dejaba un tramo liso al renovarse chunks por la noche. Doce capturas y ABBA de esa version descartada se conservan en resident-only/. No usar esas metricas para aprobar la version final.

La version con conexion continua elimina ese tramo liso en las vistas observadas. Las grietas siguen visibles y la calidez permanece, pero las bandas claras son demasiado regulares y dominantes frente al mockup. El cambio de eje puede producir costuras en paredes oblicuas; no se ha aprobado para todos los angulos ni semillas.

## Capturas y comprobaciones

Doce capturas finales, caso 21, semilla 712, calidad media, 1280 x 720, horas 150/350. Se espera a los chunks pendientes y se renderiza antes de medir. Seis parejas con camara, objetivo y hora identicos; comparison.json: cero draw calls, triangulos y geometrias adicionales; dos texturas.

- [Antes lateral dia](canyon-global-lighting-side-day.png) / [despues](canyon-canyon-dominant-side-day.png).
- [Antes vista baja noche](canyon-global-lighting-low-night.png) / [despues](canyon-canyon-dominant-low-night.png).
- [Vista de juego](canyon-canyon-dominant-game-day.png).

captures.json registra allBound=true en las seis vistas candidatas finales. streaming.json registra materiales y claves de chunks en desplazamientos 0/+96/-96 m; se espera al horizonte antes de adoptar su nueva region. Es una comprobacion QA, no una prueba completa de liberacion de recursos o sesiones largas. La consola base registra un recurso 404 sin URL identificada; candidato sin errores registrados. No se afirma consola totalmente limpia.

## Rendimiento y decision

ABBA lateral en misma pagina, 180 muestras y 30 de calentamiento por tramo, dia/noche. El selector QA aplica base/candidato tambien a materiales futuros. paired.json y performance-summary.json conservan resultados completos.

GPU dia 15,687 -> 16,411 ms (+0,724); noche 15,785 -> 16,481 (+0,696). CPU +/−0,07 ms. Menor sobrecoste observado que el ensayo de cuatro lecturas, sin equivaler a una comparacion directa entre ambos en la misma sesion. Sigue por encima de +0,5 ms. No integrado ni aprobado globalmente.

Siguiente paso: aislar la contribucion de normales frente a color para evitar pagar recursos sin mejora visible, y reducir la dominancia de las bandas existentes. Mantener geometria original. No repetir simplemente intensidad mayor de grano. La calidad objetivo de seis biomas continua pendiente.

Reproduccion:
```powershell
$env:WG_MATERIAL_STUDY='canyon-dominant'
node tools/experiments/capture-material-study.mjs
python tools/experiments/summarize-ground-frequency.py canyon-dominant
node tools/experiments/check-canyon-dominant-streaming.mjs
$env:WG_PAIR_CASES='21'
$env:WG_PAIR_VIEW='side'
node tools/experiments/benchmark-material-study.mjs
```
