# Reutilización de vegetación lejana al colocar estructuras

La colocación de un centro en la vista WebGPU conservó 173 propietarios de regiones y sus 582 pares de lotes, desde la publicación 264 hasta la 697. La publicación 554 cambió las estructuras con `terrainChanged:false`, `suppressedChanged:false` y revisión nativa 3. Después de la admisión inicial, el auditor observó cero invalidaciones globales, cero ofertas de región y cero altas de atributos de vegetación. [Captura en NVIDIA Turing](performance/native-build-active-farm-20261120/far-structure-retention.json).

En el control anterior, ese mismo cambio en la publicación 538 invalidó los 173 swaps. Se observaron 90 regiones readmitidas con la misma revisión 3 y las mismas listas completas de instancias. Se crearon 312 pares de lotes para esas regiones. El resultado amplía el diagnóstico del [recuento de recursos de Build](native-build-active-farm-20261120.md).

Surface confirma primero la revisión nativa con el propietario de cobertura. Con una revisión conocida, el cambio de estructuras deja la decisión de invalidación a esa revisión. Un aviso de terreno modificado o un cambio de revisión sigue invalidando la cobertura. La vía sin revisión utiliza la comprobación de estructuras anterior. Las supresiones modifican las instancias de los propietarios actuales y las notificaciones por región siguen pasando por la invalidación selectiva.

En Godot 4.4, `GridMap::set_cell_item` marca el octante de la celda modificada y difiere su actualización. Bevy 0.16.1 selecciona las altas y modificaciones por identidad antes de preparar recursos de GPU. Wild Guardians reutiliza la revisión comprobada y las notificaciones regionales que ya tiene el propietario de cobertura. [Código de Godot](https://github.com/godotengine/godot/blob/4.4-stable/modules/gridmap/grid_map.cpp#L310-L383) · [Código de Bevy](https://github.com/bevyengine/bevy/blob/v0.16.1/crates/bevy_render/src/render_asset.rs#L221-L271).

En la ventana posterior a observar el centro, el total bajó de 13.328 altas en 12,27 s a 174 en 12,26 s. En esa segunda ejecución hubo 16 atributos nuevos de objetos ajenos a la cobertura lejana. La sesión de UI independiente confirmó un centro y una pieza de muro y retiró los provisionales de sus dos duplicados. Ese control usa el recorrido Continue y una demora controlada de 500 ms en la respuesta de colocación.

```powershell
.cache/tooling/node20.exe --test tests/webgpu-far-coverage.test.js tests/webgpu-far-region.test.js
```

Las 29 pruebas dirigidas cubren la conservación de swaps y leases en el caso positivo, el terreno modificado, los cambios de revisión, la revisión desconocida, la supresión y la invalidación regional. La selección ampliada pasó 156 pruebas en 17 archivos, con dos omisiones. Vite generó y empaquetó el build. El verificador adicional del paquete se detuvo al resolver `decoded` en `buffalo.json`. Ese campo ya apunta en la rama de partida a `content/source/character-lod/buffalo-decoded.glb`, ausente tanto en el árbol de fuentes como en el paquete. El cruce Build con Farm activo y la validación de cadencia a 60 FPS siguen abiertos.
