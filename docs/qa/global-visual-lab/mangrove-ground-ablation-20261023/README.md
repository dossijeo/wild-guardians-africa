# Diagnostico de suelo: original frente a salida plana

Primera fase solicitada por el usuario. QA exclusivamente; salida plana deliberadamente inaceptable como arte, no candidata de optimizacion.

Sobre44767e507, Intel UHD/ANGLE1280x720/media,fixture712 pausada, camara normal movil8m, dia/noche A/B/A/B. Se reemplaza solo el bloque final de material/iluminacion de25 materiales residentes, despues de sus hooks originales. Conserva vertex shader, geometria, ajustes de rasterizacion, profundidad, overlays de barro, horizonte y resto de escena. El material plano deja de recibir visualmente sombras, pero las pasadas de shadow maps siguen ejecutandose. No presentar esta ablacion como optimizacion equivalente.

Tres ventanas independientes: GPU completa, grupos GPU por pasada y cadencia;60 calentamiento+60 muestras cada una.480 consultas de frame validas. Auditoria verifica estado pausado, secuencias de camara, calls, triangulos y cobertura identicos por muestra entre variantes; cero errores/disjoint/perdidas. GPU por categoria incluye intervalos entre draws y overhead de instrumentacion; no es consulta de hardware de invocaciones de fragmento.

|Variante|Fase|Suelo color ms|GPU completa ms|Intervalo ms|p95 ms|
|---|---|---:|---:|---:|---:|
|base|day|7.894|26.407|31.858|46.8|
|base|night|7.907|22.502|31.095|44.9|
|flat|day|0.931|14.508|20.217|24.7|
|flat|night|0.951|15.812|22.072|25.9|
|base|day|8.233|21.54|27.705|37.4|
|base|night|8.037|22.256|29.343|37.9|
|flat|day|0.947|14.619|20.402|24.5|
|flat|night|1.034|15.263|20.548|23.7|

Suelo:7.894–8.233ms original frente0.931–1.034ms plano. Misma categoria dibuja12.55calls/54322.4triangulos medios; frame completo867475.5triangulos medios. La caida sostenida ~7ms apunta al trabajo del shader de color (composicion+iluminacion+muestreo de sombras), no a un exceso de triangulos como explicacion principal. La primera GPU completa original diurna muestra deriva respecto a la repeticion; no usar su delta mayor como estimacion unica.

Falta separar composicion de iluminacion, dependencia de resolucion y overdraw. Este ensayo no autoriza aun precoccion por chunk: quitar toda respuesta material/dinamica no permite atribuir el ahorro solo a datos estaticos. No se ha cambiado streaming ni memoria de texturas del juego.

Inspeccionada flat-day primera repeticion: suelo uniforme como previsto, overlays y resto de escena conservados; sombras receptoras del suelo ausentes por diseno diagnostico. Ocho capturas incluidas. La primera ejecucion se detuvo antes de completar para mover la instalacion despues de cargar los chunks de la camara; solo se publica la secuencia completa posterior,25 materiales por registro.

Reproducir: node tools/experiments/measure-mangrove-ground-ablation-20261023.mjs y python tools/experiments/audit-mangrove-ground-ablation-20261023.py docs/qa/global-visual-lab/mangrove-ground-ablation-20261023. Vite5190. PR permanece borrador, sin cambio nativo.
