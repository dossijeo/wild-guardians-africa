> CORRECTION (2026-10-23): the fern QA call `resizeShadowMap(light, 4096)` actually selected 1024 because the API expects a quality name. Claims of a 4096 map in this report are incorrect. See `../holly-fern-shadow-actual2048-20261023/README.md`. Original measurements are retained.

# Seguimiento por version de buffers de sombra: QA

A/B usan la misma region de sombras independiente, mismas instancias visibles, geometria, viento10Hz,mapa4096 y recorrido movil8m. A recorre atributos activos en cada snapshot; B solo para los tres atributos del productor QA registra version, identidad, almacenamiento, cantidad y divisor. El productor incrementa versiones en cada reconstruccion. No se modifica shadow-cache.js de produccion.

Intel UHD,1280x720,media,escena poblada pausada,fondo completo. Dos parejas ABAB;60warmup+90muestras GPU/cadencia separadas.

|Fase|CPU A/B ms (parejas)|GPU B-A ms (parejas)|Cadencia A/B ms (parejas)|
|---|---|---|---|
|day|15.61/8.69; 12.45/7.96|+0.27; -1.36|31.56/33.71; 30.76/29.71|
|night|14.80/9.11; 14.60/8.33|+2.12; +1.32|30.94/33.69; 34.28/32.88|

## Decision

Conservar la ruta QA: reduce de forma consistente el trabajo CPU de snapshot. No demuestra mejora global de FPS: cadencia mixta, GPU nocturna mayor en ambas parejas. No promover el conjunto de sombras residentes por esta mejora local.

## Verificacion y limites

Prueba ejecutable test-shadow-versioned-20261023.mjs: reutilizacion sin cambios; invalidacion por datos publicados, cantidad activa, reemplazo de almacenamiento y divisor; camino sin opt-in sigue detectando cambios de valores sin version. Es un contrato del productor: mutar datos sin needsUpdate rompe el supuesto y no esta permitido en esta ruta.

720queries validas,sin errores GL/cambios de simulacion. Repeticiones GPU conservan triangulos; hay diferencias de draws y3frames de cadencia nocturna con hasta1059triangulos (0.00293% total). No afirmar contadores totalmente identicos.

Cuatro pares de capturas: medias absolutas0.00069-0.00355 sobre255, maximos4-19; no son pixel-identicos. Causa no aislada. Falta comparacion cache forzada/reutilizada dentro de la misma carga antes de aceptar equivalencia exacta. No confundir delta promedio pequeno con ausencia de defectos.

Reproduccion: Vite5190; node tools/experiments/test-shadow-versioned-20261023.mjs; WG_COVER_QUALITY=media node tools/experiments/measure-holly-fern-shadow-versioned-20261023.mjs. Sin cambios en main o simulacion.
