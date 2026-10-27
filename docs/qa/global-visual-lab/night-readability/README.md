# Legibilidad nocturna: intensidad compartida

20/10/2026. Piloto QA, no integrado. Uniforme existente uNightLight de 1,12 a 1,55 (+38,4 %). Se conserva interpolacion dia/noche del shader, direcciones, sombras y geometria. No altera hora ni reglas del juego. No aumenta exposicion del cielo ni emisivos de lava.

## Resultado visual

72 capturas reales WorldScene, seis biomas, tres camaras, dia/noche; 36 parejas con camara, objetivo y hora iguales. Semilla 712, calidad media, 1280 x 720, horas 150/350. Los contadores de draws, triangulos, texturas y geometrias no cambian en ninguna pareja (comparison.json).

El aumento ayuda modestamente a leer rocas, edificios y zonas del suelo en Sabana, Rio y Manglares. Conserva el cielo oscuro y sombras. Canon gana lectura de grietas. Volcanes mejora algunos objetos pero el suelo negro sigue dificil de leer: no resuelto. Desierto se vuelve mas marron y claro sin una mejora convincente del relieve; no conservar ese cambio en Desierto.

- [Sabana antes](savanna-global-lighting-side-night.png) / [despues](savanna-night-readability-side-night.png).
- [Rio despues](grand-river-night-readability-side-night.png).
- [Manglares despues](mangrove-night-readability-side-night.png).
- [Volcanes antes](volcano-global-lighting-low-night.png) / [despues](volcano-night-readability-low-night.png).
- [Canon despues](canyon-night-readability-side-night.png).
- [Desierto descartado](desert-night-readability-side-night.png).

image-statistics.json mide las capturas sin editarlas. Trece de dieciocho parejas diurnas son identicas; las cinco restantes tienen media absoluta por canal <=0,00105 sobre 255. No se afirma identidad exacta de todas ni se usa esta metrica como prueba perceptual. La diferencia nocturna lateral media RGB va de 3,84 a 16,31 niveles segun bioma. Las referencias son diurnas: este pase evalua legibilidad nocturna, no equivalencia a un mockup nocturno inexistente.

## Rendimiento

ABBA nocturno lateral, misma pagina, 180 muestras/30 calentamiento. Se conmuta el uniforme, no programas, recursos ni geometria. Datos en paired.json/performance-summary.json. GPU delta: Sabana -0,081 ms, Rio +0,342, Manglares -0,045, Volcanes +0,396, Canon -0,087, Desierto +0,218. Todos dentro de +0,5 en esta ronda; negativos no demuestran aceleracion. Fuente shader identica, sin operacion adicional por fragmento. No se repite benchmark diurno porque el parametro solo interviene en el extremo nocturno; las capturas verifican su apariencia.

Un recurso 404 sin URL identificada aparece en la primera pagina base de capturas y benchmark; otras paginas sin errores registrados. Sintaxis de scripts comprobada. No es validacion de todas las horas de transicion, calidades, semillas ni campanas.

## Decision

Conservar como candidato para validacion en campana en cinco biomas, dejando Desierto en 1,12. Mantener pendiente el tratamiento especifico del suelo volcanico y la separacion de plantas oscuras sobre suelo oscuro. No integrar aun ni aprobar el presupuesto global. Proximo paso: comprobar el candidato por bioma en campana y transicion de hora, despues volver a vegetacion 3D.

Reproduccion PowerShell:
```powershell
$env:WG_MATERIAL_STUDY='night-readability'
node tools/experiments/capture-material-study.mjs
python tools/experiments/summarize-ground-frequency.py night-readability
$env:WG_PAIR_CASES='1,6,11,16,21,26'
$env:WG_PAIR_PHASES='night'
$env:WG_PAIR_VIEW='side'
node tools/experiments/benchmark-material-study.mjs
```
