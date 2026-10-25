# Postura de cabeza

Base de comparación: merge `3c1db05fd`, procedente de `codex/beast-models` en `6c68b5833`. Corrección integrada en `2f83edbcd`; no fusionada con main.

| Especie | Cabeza | Cuello | Decisión |
| --- | ---: | ---: | --- |
| León | +15° | +10° | Elevar postura de marcha y carrera |
| Búfalo | +15° | +10° | Elevar postura de marcha y carrera |
| Hiena | +8° | +5,33° | Ajuste moderado |
| Facóquero | +5° | +3,33° | Ajuste leve, conservando anatomía |
| Rinoceronte | +22° | +5° | Conservar reparación anterior |

Los ángulos representan elevación respecto al movimiento original, sobre el eje lateral del torso animado. Head se expresa con respecto al cuello corregido, por lo que no se suman ambos ángulos. No se fija la mirada al eje del mundo ni se eliminan inclinaciones corporales intencionadas de los ataques.

La primera variante solo modificaba Head y ofrecía poco cambio visible: parte de cráneo/melena está ponderada a Neck. La variante retenida coordina ambas rotaciones. No cambia geometría, texturas, bind pose, pesos, número de huesos, ropa, cola, pies, duración o velocidad de los clips. No requiere Blender ni nuevos cálculos por frame: se modifican offline los canales existentes del GLB.

## Evidencia y límites

Cada carpeta `head-N` contiene A/B de frente y perfil para seis clips, con fases 0,2 / 0,55 / 0,85. Ambas variantes utilizan idéntica codificación de las texturas originales para aislar la postura. Los vídeos completos finales utilizan los GLB comprimidos reales, no el reemplazo de red empleado para A/B.

`audit.json` valida 129 fases por clip con el controlador de producción: mallas, imágenes, materiales y BIN original idénticos; canales ajenos a cuello/cabeza sin cambios; matrices de cuerpo, pies y ropa sin diferencia. El ángulo de mirada registrado utiliza un eje relativo al bind: sirve para comparar la corrección, no para medir la línea anatómica de los ojos. Las capturas y vídeos siguen siendo necesarios. Esta auditoría no demuestra ausencia universal de autointersección en cualquier interpolación.

Se preserva el radio lógico previo como mínimo en `calibrate_animal_actions.mjs`. La proyección horizontal reducida al levantar la cabeza no debe modificar navegación ni separación del escudo. La medición geométrica sigue ejecutándose y puede ampliar el radio si fuese necesario.

## Reproducción

Los originales están en Git, en `3c1db05fd:public<source>`; `source` figura en cada `head-N/audit.json`. Extraerlos como bytes (por ejemplo con `execFileSync('git', ['show', ref], {maxBuffer: 150*1024*1024})` y `writeFileSync`), sin redirigir binarios con PowerShell.

1. Ejecutar `node tools/experiments/lift-beast-head.mjs <species> <degrees> <original.glb>`. La herramienta rechaza aplicar la corrección dos veces. Escribe `.codex-tmp/beast-head/<species>-<degrees>.glb`.
2. Ejecutar `node tools/experiments/audit-beast-head.mjs <species> <degrees>`.
3. Con Vite en 5218, ejecutar `node tools/experiments/capture-beast-head.mjs <species> <degrees>`. Comprueba que las dos sustituciones de modelo se realizan realmente. No modifica los assets publicados.
4. Para instalar una corrección nueva: `tools/install_beast.mjs`, `tools/compress_web_assets.mjs <hash.glb>`, `tools/calibrate_animal_actions.mjs`, `tools/calibrate_footsteps.mjs`. Conservar el mínimo de radio previo. Ejecutar build y `test:web-package`.

Una referencia histórica `/assets/<hash-antiguo>.glb` dentro del catálogo público fue detectada por el verificador del paquete: era procedencia, no dependencia necesaria. Se expresa como `sourceSha256` para no exigir incluir el modelo descartado en las builds.

La revisión posterior de patas conserva estas curvas de cabeza/cuello. Consultar
README.md para los vídeos finales y FOOT-SUPPORT.md para medidas y límites.
