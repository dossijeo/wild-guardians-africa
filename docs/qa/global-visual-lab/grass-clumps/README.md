# Matas agrupadas 3D — candidato QA, 20/10/2026

Se conserva el modelo para continuar el experimento, sin integrarlo en el renderer. Las matas aportan detalle vertical reconocible en Sabana y Gran Río y mantienen legibles personajes, caminos y cultivos. Todavía parecen grupos de agujas en vistas bajas; su distribución y transición al mover la cámara necesitan trabajo. No se ha alcanzado la calidad global de los mockups.

## Modelo y alcance

Creado con Blender mediante `tools/experiments/blender-grass-clumps.py`; fuente `grass-clumps.blend`, exportación `public/assets/visual-lab/grass-clumps.glb`. Sin recursos externos. 36 hojas curvas cerradas, 360 triángulos, cero bordes abiertos/no manifold, un material con colores de vértice y cero texturas. GLB de 34.572 bytes. No son planos cruzados; modelos originales intactos.

Piloto limitado a Sabana y Gran Río: grupos de hasta siete matas por ancla, selección determinista, 192 instancias visibles como máximo. Usa el tratamiento artístico de vegetación mediante `artBounds`; Gran Río recibe tinte verde. Recibe sombras, no añade sombras proyectadas.

## Evidencia válida

24 PNG en esta carpeta: dos biomas, tres cámaras, día/noche y antes/después. Juego real WorldScene en fixture, semilla 712, calidad media, 1280×720 DPR 1, horas 150/350. `captures.json` guarda cámaras, objetivos, hora y contadores; `comparison.json` verifica las 12 parejas. Todas añaden exactamente una llamada, 69.120 triángulos, una geometría y cero texturas. Las posiciones candidatas están referenciadas en archivos separados; no equivalen al subconjunto visible.

- [Sabana antes](savanna-global-lighting-game-day.png) / [después](savanna-grass-clumps-game-day.png).
- [Gran Río antes](grand-river-global-lighting-game-day.png) / [después](grand-river-grass-clumps-game-day.png).
- [Gran Río noche antes](grand-river-global-lighting-side-night.png) / [después](grand-river-grass-clumps-side-night.png).

`paired.json`: 16 bloques ABBA, 180 muestras por bloque tras calentamiento, misma página/cámara, comparación de visibilidad con assets residentes en ambos estados. Las 16 comprobaciones mantienen 192 instancias. Coste incremental de render, no carga ni memoria total.

| Bioma | Fase | GPU base ms | GPU candidato ms | Diferencia ms |
|---|---|---:|---:|---:|
| Sabana | Día | 17,491 | 17,952 | +0,461 |
| Sabana | Noche | 18,526 | 19,229 | +0,703 |
| Gran Río | Día | 13,656 | 14,208 | +0,552 |
| Gran Río | Noche | 14,497 | 14,684 | +0,186 |

Medias de las dos medias por variante; hay deriva notable en Sabana nocturna. No supone aprobación del presupuesto global ni mejora de velocidad. Se registra un error HTTP 404 sin URL en la primera página base de capturas de Sabana; no se atribuye a un recurso concreto. Sintaxis de los tres scripts JS comprobada.

## Intentos descartados y corrección de diagnóstico

`generic-lighting/` conserva 24 capturas iniciales con el tratamiento genérico. La hipótesis inicial de material no registrado era incorrecta: una inspección confirmó registro, shader toon y uniforme nocturno compartido. Faltaba seleccionar el tratamiento artístico de vegetación, no conectar la noche.

`unbounded-population/` conserva otras 24 capturas y una medición NO válida para aprobar el presupuesto de 192 instancias. Los callbacks nativos de chunks reconstruían el mesh y sobrepasaban el límite; una vista de Gran Río añadió 2.090.880 triángulos. No deben compararse sus tiempos como si tuviesen 192 matas. El pase final aísla esos callbacks y añade aserciones de capacidad a capturas y benchmark. Los archivos históricos anteriores a este estudio no se reinterpretan sin investigarlos.

## Límites y siguiente decisión

Es una instantánea de chunks residentes, sin streaming, actualización de ocupación, histéresis ni liberación propia completa de recursos clonados. Hay corte duro a 85 m y selección limitada por cámara. No se ha comprobado campaña, otros cuatro biomas, continuidad durante desplazamientos ni coste acumulado del conjunto global. Recomiendo conservar el modelo y desarrollar primero una distribución acotada con streaming y transiciones estables; después validar campaña antes de promoverlo. No integrar este módulo QA tal cual.
