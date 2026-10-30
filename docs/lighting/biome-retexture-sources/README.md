# Modelos actuales para renovar texturas

Exportados del LOD0 que utiliza el juego en esta rama, sin modificar posiciones, escala, normales, UV ni índices. Cada GLB incluye los mapas originales de color, normales y PBR como PNG sin pérdida adicional. Los SHA256 y comprobaciones de píxeles están en verification.json de cada carpeta.

Son los cinco primeros elementos de cada pack: tree_01, tree_02, tree_03, tree_04 y shrub_01. El nombre de slot no siempre describe su geometría (por ejemplo, shrub_01 es el arco en Cañones).

Importación: metros, eje Y vertical, pivote original. Conservar geometría, escala y UV al texturizar; devolver también los mapas normales y PBR. El material estándar sirve para previsualizar, no reproduce el shader, viento o AO procedural de Wild Engine. No se ha cambiado ningún recurso del juego.

## canyons

- [tree_01 — Acacia de cañón](canyons/tree_01.glb)
- [tree_02 — Acacia irregular de ribera](canyons/tree_02.glb)
- [tree_03 — Mesa de arenisca](canyons/tree_03.glb)
- [tree_04 — Aguja estratificada](canyons/tree_04.glb)
- [shrub_01 — Arco natural de arenisca](canyons/shrub_01.glb)

## desert

- [tree_01 — Acacia del desierto](desert/tree_01.glb)
- [tree_02 — Acacia irregular](desert/tree_02.glb)
- [tree_03 — Árbol seco](desert/tree_03.glb)
- [tree_04 — Árbol suculento](desert/tree_04.glb)
- [shrub_01 — Cactus columnar](desert/shrub_01.glb)

## grand_river

- [tree_01 — Árbol de ribera con lianas](grand_river/tree_01.glb)
- [tree_02 — Árbol de ribera compacto](grand_river/tree_02.glb)
- [tree_03 — Baobab de ribera](grand_river/tree_03.glb)
- [tree_04 — Palmera fluvial](grand_river/tree_04.glb)
- [shrub_01 — Bananeras y plantas de ribera](grand_river/shrub_01.glb)

## mangrove

- [tree_01 — Mangle de copa ancha](mangrove/tree_01.glb)
- [tree_02 — Mangle de grandes raíces](mangrove/tree_02.glb)
- [tree_03 — Cocotero costero](mangrove/tree_03.glb)
- [tree_04 — Árbol costero de hojas largas](mangrove/tree_04.glb)
- [shrub_01 — Mangles jóvenes](mangrove/shrub_01.glb)

## volcanoes

- [tree_01 — Acacia de ladera volcánica](volcanoes/tree_01.glb)
- [tree_02 — Acacia irregular volcánica](volcanoes/tree_02.glb)
- [tree_03 — Baobab volcánico](volcanoes/tree_03.glb)
- [tree_04 — Árbol carbonizado](volcanoes/tree_04.glb)
- [shrub_01 — Arbusto de hojas rígidas](volcanoes/shrub_01.glb)

## savanna

- [tree_01 — Acacia paraguas](savanna/tree_01.glb)
- [tree_02 — Acacia irregular](savanna/tree_02.glb)
- [tree_03 — Baobab](savanna/tree_03.glb)
- [tree_04 — Árbol seco](savanna/tree_04.glb)
- [shrub_01 — Arbusto espinoso](savanna/shrub_01.glb)

Los 30 archivos quedan inventariados en [inventory.json](inventory.json). Revalidar contra la versión instalada con `python tools/trees/audit_retexture_sources.py` antes de iniciar el trabajo de texturas. Este inventario prepara la tarea en cola; no contiene texturas generadas ni sustituye recursos del juego.

Preparación en Blender: los 30 GLB se han importado en Blender 4.5.3 LTS y se han decodificado sus 90 imágenes, comprobando UV y materiales. [Informe](blender-import-audit.json). Reproducible con Blender headless, `--python-exit-code 1 --python tools/trees/inspect_blender_sources.py`. Es validación de importación; todavía no hay renders de referencia ni texturas generadas.
