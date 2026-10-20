# Arena seca: relieve sin franja especular

Candidata QA `qa-desert-sand-dry-specular.js`, derivada de la arena normal-only. Mantiene su textura, escala, normales, máscara de desgaste, iluminación difusa y contorno geométrico. Cambia exclusivamente el factor de la banda especular de `(1.-rough*.40)` a `(1.-rough)^2`. Solo se enlaza a suelo/horizonte desértico; edificios, objetos y otros biomas conservan su shader.

La [ablación](../edge-ablation/README.md) identificó que la franja clara dentada venía de esa banda: ni anular el desgaste ni borrar las normales dentro del poblado era una solución artística adecuada.

## Evidencia real

24 capturas de campaña semilla 712, Mapungubwe, 1280×720, media/baja, día 150/noche 350 y tres cámaras. Las doce parejas contra el suelo original tienen cámara, hora, llamadas y triángulos iguales; cero errores HTTP/JS/consola y GL registrados. [Capturas](captures.json), [auditoría](comparison.json).

Comparación directa contra la candidata normal-only anterior: las doce parejas también coinciden en cámara/hora/geometría. **Ocho imágenes son idénticas** (oblicua y reversa, ambas fases/calidades). En normal cambian 13.274 píxeles diurnos y 13.420 nocturnos por calidad, concentrados en la franja especular. No cambia globalmente la exposición ni se borra el microrelieve. [Datos de revisión](revision.json).

Izquierda normal-only anterior; derecha nueva candidata:

- [Media, día](media-day-revision.webp)
- [Media, noche](media-night-revision.webp)
- [Baja, día](baja-day-revision.webp)
- [Baja, noche](baja-night-revision.webp)

También se conservan comparativas frente al suelo original, por ejemplo [media diurna](media-day-game-comparison.webp). La inspección directa confirma la eliminación de la franja manteniendo ondas y calidez. Los resultados corresponden a estas poses y no prueban comportamiento universal de todos los ángulos, caminos o estados del mundo.

## Coste y decisión

No añade geometría, texturas, draw calls ni pasadas. El cambio es una expresión aritmética dentro del fragment shader, pero **no se declara coste temporal medido ni ahorro**. Había QA gráfica ajena activa; no se detuvo ni se usó una serie contaminada como aprobación. Los benchmarks anteriores del material completo siguen mostrando incertidumbre en media/noche.

Conservar esta corrección como candidata QA preferible a normal-only sin corregir. No integrarla aún en global-lighting ni main. Falta validar la franja durante movimiento y cerrar el presupuesto acumulado cuando el hardware permita una serie interpretable. Persisten ondas marcadas y zonas menos detalladas según orientación; esta corrección no declara alcanzada la dirección artística de los seis biomas.

## Reproducción

Vite del worktree en 5190:

```powershell
$env:WG_SAND_STUDY='desert-sand-dry-specular'
$env:WG_SAND_OUTPUT='docs/qa/global-visual-lab/desert-aerial-sand/dry-specular'
node tools/experiments/capture-desert-sand-settlement.mjs
node tools/experiments/package-desert-sand-settlement.mjs
node tools/experiments/compare-desert-sand-revisions.mjs
```

La última comparación utiliza los WebP lossless de settlement, ya versionados, y los nuevos. Los PNG de trabajo no se añaden a Git. No se alteran simulación, navegación, balance, siluetas ni viento 8×.


## Validación posterior

[Movimiento](motion/README.md): cuatro vídeos, 484 parejas A/B coincidentes y 296 retornos con geometría comparable (290 exactos; seis con hasta tres píxeles/un nivel). [Rendimiento](performance/README.md): 8.832 muestras válidas entre series largas e intercaladas, sin errores ni cambios geométricos; continúa la variación y no se certifica +0,5 ms en media/noche. No repetir esta microprueba para buscar aprobación: siguiente puerta, cadencia del juego real sin consultas GPU por frame y coste acumulado. Mantener QA.
