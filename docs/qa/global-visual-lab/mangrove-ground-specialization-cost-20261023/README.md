# Especializacion del bioma del suelo: descartada

Hipotesis: sustituir uBiome uniforme por constante 2 en los shaders de suelo identificados como Mangrove permitiria al compilador eliminar ramas de otros biomas y calculos de iluminacion posteriormente sobrescritos. Mantiene texturas, normales, alturas, musgo, ribera y sombras. Solo variante QA; no cambio nativo.

## Metodo y controles

Intel UHD/ANGLE, 1280x720, media, semilla 712, fixture poblada pausada y camara movil 8 m. LOD aprobado de helechos en ambas variantes, mismo viento .25. ABAB dia/noche; 60 frames de calentamiento, 90 GPU y 90 de cadencia separada: 720 consultas GPU validas. Auditoria verifica estados, camaras e instancias por muestra; sin errores WebGL/pagina. Todas las variantes: 286 geometrías, 136 texturas, 123.278 draws y 867749 triangulos medios de fotograma completo. No prueba de simulacion activa.

|Variante|Fase|GPU ms|CPU render ms|Intervalo ms|p95 ms|
|---|---|---:|---:|---:|---:|
|base|day|21.022|8.046|26.903|37.3|
|base|night|22.161|8.039|27.999|34.5|
|special|day|21.051|7.749|26.182|33.7|
|special|night|23.182|7.709|31.162|38.1|
|base|day|22.019|8.239|27.381|34.2|
|base|night|21.681|8.158|27.337|33.7|
|special|day|22.229|7.912|26.592|32.6|
|special|night|23.549|8.27|29.996|37.6|

## Resultado

Sin ahorro GPU: dia +0.029/+0.210 ms; noche +1.021/+1.868 ms frente al control precedente. La cadencia diurna mejora aproximadamente 0.7–0.8 ms, pero la nocturna empeora 2.7–3.2 ms. No se demuestra beneficio global ni se atribuyen diferencias pequenas exclusivamente al shader. No promover.

Comparacion RGB: primera pareja cambia 14 pixeles diurnos y 13 nocturnos; segunda 3029/3127. MAE menor de 0.0021 niveles de canal sobre 255, pero NO son imagenes identicas. Inspeccionada pareja diurna de segunda repeticion: no se aprecia cambio global de arte; la causa de los residuales no queda atribuida. Al no superar el criterio de rendimiento, no dedicar mas pruebas a certificar equivalencia de este candidato.

La precarga compila materiales antes de que el uniforme global tenga el valor definitivo del bioma. Un primer guard QA incorrecto rechazo esa situacion y produjo timeout de carga; se corrigio usando metadata groundBiome para especializar y comprobando uBiome=2 con la escena preparada. Los datos publicados son exclusivamente de la ejecucion completa posterior. No se altero el orden de carga nativo.

## Siguiente paso

La especializacion no resuelve el coste medido de 7.8–8.2 ms del suelo. Inspeccion del codigo identifica otra hipotesis mas concreta: la capa mangrove-mud-patches calcula el material completo de suelo y una segunda respuesta de barro, incluso donde mudWeight=1 sustituye totalmente el resultado base. Probar una ruta que evite trabajo descartado en el interior conservando exactamente la mezcla del borde, las derivadas de texturas, sombras y salida de color. Su ahorro maximo esta acotado por el coste del overlay (~1.3–1.4 ms); no presentarlo como solucion a los 8 ms del suelo base. El LOD aprobado sigue pendiente de integracion nativa.

## Reproduccion

```powershell
node tools/experiments/measure-mangrove-ground-specialization-20261023.mjs
python tools/experiments/audit-mangrove-ground-specialization-20261023.py docs/qa/global-visual-lab/mangrove-ground-specialization-cost-20261023
```
