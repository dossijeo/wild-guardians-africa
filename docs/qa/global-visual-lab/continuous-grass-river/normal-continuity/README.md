# Normales continuas entre módulos

Candidata QA independiente sobre wind-continuity, fuente 9cc24e6ba. Conserva viento8 y LOD por distancia real. No sustituye todavía la variante retenida de Gran Río ni modifica Sabana.

## Cambio

Las normales originales de los vértices compartidos difieren hasta 40,63 grados entre las mallas. La forma se interpola, pero la normal original no lo hacía. El helper añade `flatNormal`: para las ocho hojas compartidas reutiliza la normal de su triángulo ligero y mezcla hacia la normal refinada con el mismo factor LOD que la posición. Las cuatro hojas adicionales conservan su normal mientras desaparecen. La corrección del viento usa ya la altura interpolada.

Se añaden 1.296 bytes de atributos totales (24+84 vértices, tres float32), sin cambiar triángulos, instancias, texturas ni draw calls. Hay interpolación/normalización adicional por vértice: falta medir GPU, no se considera gratuita. Los buffers declarados no representan toda la memoria del driver.

## Comprobación

12 capturas reales en media, cercana/normal/elevada, día/noche, semilla712, 1280×720. Pares con cámara y triángulos idénticos; sin errores GL ni overflow. WebP sin pérdida verificado contra PNG. [Comparativa normal](normal-comparison.webp): izquierda altura de viento corregida, derecha además normales interpoladas. Los nombres de archivo `original`/`distance` proceden del harness; no comparan con terreno sin hierba.

La vista normal conserva continuidad, densidad y color general. El beneficio buscado es evitar un cambio de respuesta al cruzar LOD; estas imágenes no prueban por sí solas la eliminación temporal del salto. [Datos](captures-media.json), [ángulos originales](normal-audit.json).

## Decisión

Conservar candidata para validación combinada. Pendientes: GPU/CPU de la combinación, secuencia con normales corregidas, perfil bajo y streaming. La selección cuantizada de cámara y las diferencias de triangulación/interpolación todavía pueden producir discontinuidades; no se declara una transición matemáticamente idéntica entre todos los fragmentos. No es una nueva mejora artística de densidad y no justifica por sí sola ampliar cobertura a otros biomas.

Reproducir: `node tools/experiments/capture-continuous-grass-river-normal-continuity.mjs`. No hay cambios de simulación ni navegación; main permanece intacto.
