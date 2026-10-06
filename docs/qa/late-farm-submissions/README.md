# Envíos reales de una finca avanzada

Diagnóstico previo a ocultar herramientas, sobre renderer de 5bfdabe e instrumentación QA. Cinco renders estáticos a pasos 151/201/251/301/350 de una continuación pagada de Manglares/Saheliana. Se observan diferencias reales de los contadores de Three al ejecutar renderBufferDirect, respetando drawRange/grupos/instancias y los pases internos. Cada captura reconcilia exactamente llamadas y triángulos totales; el estado lógico antes/después del render se conserva.

En la primera captura, los trabajadores suman 450 llamadas y 812.070 triángulos por cada pase de pantalla, sombras y profundidad: 1.350 llamadas en total. Props de bioma: 35/15/35 llamadas (pantalla/sombras/profundidad); cultivos reconocidos por iGrowth: 13 por pase. Se conserva una categoría sin clasificar; no se atribuyen por conjetura sus 113/63/67 llamadas, ni se considera completa la clasificación de cultivos sin iGrowth.

Los rigs envían también las herramientas que sus clips ocultan reduciendo escala a 1e-5. Este hallazgo condujo a [la corrección y comparación posterior](../worker-hidden-tools/README.md). Las capturas iniciales se conservan sin sustituirlas por resultados nuevos. El visor QA ha evolucionado desde esta captura; no se reconstruye un hash del HTML ejecutado entonces.

[Datos nativos completos](native.json.gz), [captura](farm.png), [hashes](proof.json). Renders adicionales y serialización perturban el tiempo: no usar este diagnóstico como benchmark. Una finca/cámara no acredita móvil, RAM, todos los biomas ni FPS generales.
