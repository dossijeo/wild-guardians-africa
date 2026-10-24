# Manglares activo: desglose de la pasada principal

Sobre 8f5848e69, misma receta LOD aprobada y condiciones del estudio de pasadas anterior. Dos repeticiones dia/noche con simulacion, relojes, viento, streaming y camara activos; Intel UHD, media, 1280x720. No se cambia densidad, visibilidad, material ni orden de dibujo.

## Instrumentacion y alcance

Se divide la pasada principal en segmentos de draws consecutivos por categoria, con consultas GPU no anidadas. Las sombras mantienen su consulta independiente. Capacidad 512 consultas pendientes; la auditoria exige cero descartes, overflow, disjoint y consultas sin resultado. Se conserva un censo de nombres, atributos y metadatos de cada objeto/material clasificado dentro de benchmarks.json. Hay 60 muestras por ventana, 60 de calentamiento y cuatro ventanas separadas: GPU completa, GPU segmentada, CPU inclusiva, cadencia.

El tiempo asignado a un segmento incluye el trabajo GPU entre sus fronteras, no solo aritmetica del shader. La instrumentacion puede afectar ejecucion; no es una medicion exacta de coste marginal al retirar un objeto. Las ventanas/repeticiones tienen estados activos distintos. No sumar esta tabla a tiempos de otras ventanas.

## GPU: color principal (ms por fotograma)

|Fase/repeticion|Suelo|Barro superpuesto|Helechos cerca|Helechos lejos|Sombra precalculada|Otras instancias|Otros objetos|
|---|---:|---:|---:|---:|---:|---:|---:|
|day 1|7.811|1.311|0.422|0.341|0.231|2.75|3.526|
|night 1|8.02|1.386|0.422|0.303|0.123|2.693|3.611|
|day 2|7.949|1.302|0.421|0.364|0.224|2.824|3.489|
|night 2|8.219|1.402|0.419|0.289|0.14|2.804|3.633|

El suelo base consume 7.81–8.22 ms y la capa superpuesta 1.30–1.40 ms. Los helechos cercanos, lejanos y su sombra precalculada suman aproximadamente 0.85–1.01 ms en color. Esto NO incluye su contribucion a la pasada general de sombras o profundidad. Los costes de otras instancias (~2.7–2.8 ms) y otros objetos (~3.5–3.6 ms) permanecen separados y no deben etiquetarse todos como vegetacion. Otros objetos incluye el backdrop y unidades/edificios; otras instancias es una categoria residual.

La clasificacion de suelo se comprobo en el censo: ground/biomeGround; el overlay corresponde a mangrove-mud-patches con globalMudBlend. Helechos identificados por coverageAnchor y nombre de la malla; su sombra por qa-prebaked-fern-shadow. El sistema lejano de arboles usa aTreeBase. Ninguna categoria es una medida de overdraw.

## Decision tecnica

El mayor coste identificado de la pasada principal es el suelo, no los helechos con LOD. Prioridad siguiente: inspeccionar las operaciones y muestras realmente ejecutadas por el material Mangrove y su capa de barro, buscando calculos repetidos o ramas que no contribuyen al resultado antes de recortar calidad. Comparar cualquier simplificacion con capturas y benchmarks A/B/A/B; conservar relieve, musgo, ribera, color y sombras aprobadas.

Las sombras completas (~3.5 ms en este estudio) y la profundidad de mundo siguen siendo candidatos posteriores; reducir hojas no aborda esos costes acumulados por si solo. Mantener el LOD aprobado y completar su integracion nativa. No incorporar estos temporizadores al renderer de produccion.

## Reproduccion

```powershell
node tools/experiments/measure-fern-lod-active-subsystems-20261023.mjs
python tools/experiments/audit-fern-lod-active-passes-20261023.py docs/qa/global-visual-lab/fern-lod-active-subsystems-20261023
```

El estudio anterior y estas cifras son compatibles en orden de magnitud, pero no constituyen ABAB entre instrumentos ni prueban sobrecoste instrumental cero. No se publican FPS estables ni conclusiones de memoria a largo plazo.
