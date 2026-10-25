# Manglares: cubierta de hojas bajas en el juego

Módulo original generado con Blender 5.2.2, semilla 712, sin assets externos. Ocho hojas anchas arqueadas, 32 triángulos y 40 vértices; LOD de cuatro hojas, 8 triángulos. No son planos cruzados. Conservados generador, GLB, JSON y archivo Blender.

## Diseño y cobertura

Se redistribuyen y ensanchan las ocho hojas manteniendo el presupuesto. Proyección periódica a separación 0.5: 40.25% anterior → 92.00% nueva, 128 triángulos por unidad cuadrada. Es una medida geométrica con orientación idéntica, suelo plano y sin máscaras; NO mide cobertura real con giro aleatorio, pendientes, LOD y exclusiones. A 0.4 alcanza 94.65%, por lo que no se aumenta densidad para esta prueba.

## Comparación real

Tres series de seis parejas, 36 capturas en total: poblado (`game`), región vegetal (`region`) y misma región con material corregido (`toned`). Cada serie usa cámara, semilla 712, hora y resolución equivalentes, calidad media, día/noche. Los dos lados conservan el musgo de dos escalas y la vegetación existente. Se preservan las máscaras existentes de cobertura, desgaste, pendiente, agua y ocupación; no se cambian edificios, navegación ni simulación.

La región se elige determinísticamente como el tile residente con más posiciones elegibles, también en el control. Es una prueba favorable a cobertura, no una muestra estadística del bioma. El poblado documenta el caso contrario: abundan exclusiones y el cambio apenas se aprecia.

[Región inicial, día](region/comparison-day.jpg): demasiado verde y uniforme. [Material corregido, día](toned/comparison-day.jpg) y [noche](toned/comparison-night.jpg): menor intensidad verde y variación de pigmento por módulo/grupo de hojas, con centro algo más oscuro. Las hojas individuales y su solapamiento se leen mejor; conservar esta candidata. Sigue existiendo una frontera cromática brusca con el musgo y no se considera terminado ni equivalente al mockup.

## Coste observado

Región: 1826/3164/2275 módulos cercanos y 4207/1376/5242 lejanos para cámaras normal/elevada/cercana. Añade 92088/112256/114736 triángulos y dos draw calls. Cero desbordamientos, errores WebGL o errores de página. Los deltas de triángulos respecto al control coinciden con la auditoría del overlay. Buffers de atributos e índices: 1203376 bytes CPU nominales, no VRAM física medida. Sin sombras individuales ni transparencia alpha.

No se midieron GPU, frametime, overdraw ni FPS; los tiempos acumulados de preparación en captures.json son diagnósticos, no benchmark A/B. No aprobar presupuesto ni descartar calidad por rendimiento sin esa medición.

## Limitaciones pendientes

Overlay QA estático sobre chunks residentes: preserva `groundDetails`, no se integra en su ciclo de streaming. Los eventos marcan invalidación pero este overlay aún no conecta su flush con el flujo del juego; no está preparado para cambios del mundo. El adaptador reutiliza el selector de cobertura y su iluminación; LOD de cuatro hojas y morph cercano todavía no tienen equivalencia geométrica exacta ni validación temporal. Movimiento, viento, baja calidad, integración cromática de bordes, streaming y coste GPU son pendientes. La noche muestra volumen pero necesita conservar legibilidad del suelo. No promover al renderer predeterminado.

## Reproducción

Vite 5190 y dependencias del repositorio:

```powershell
python tools/experiments/audit-mangrove-leaf-fill-20261021.py
node tools/experiments/capture-mangrove-leaf-fill-20261021.mjs
node tools/experiments/capture-mangrove-leaf-region-20261021.mjs
node tools/experiments/capture-mangrove-leaf-toned-20261021.mjs
python tools/experiments/package-mangrove-leaf-fill-20261021.py
```

Generador Blender rechaza sobrescribir assets existentes. PNG completos locales regenerables, láminas y metadata publicadas. Mantener las variantes iniciales para comparación; siguiente trabajo: transición espacial al musgo y LOD coherente antes del benchmark de movimiento.
