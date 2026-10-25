# Volcanes: diagnóstico de lectura nocturna

Prueba QA: aumentar 45% únicamente el término direccional nocturno del suelo mapeado de Volcanes. Conserva albedo, normales, POM, luz ambiental, AO, sombras y materiales de objetos. No modifica la intensidad global de la noche.

Semilla712, media,1280x720, tres cámaras, día150 y noche350. Seis parejas con cámara, objetivo, hora, draw calls y triángulos coincidentes, sin errores. Las tres parejas diurnas son exactas píxel a píxel. Noche: diferencias medias de1.515/1.632/0.870 niveles RGB8; no son una medida de mejora artística.

[Normal nocturna](night-0-pair.webp) · [Elevada nocturna](night-1-pair.webp) · [Inversa nocturna](night-2-pair.webp). Control izquierda, candidata derecha.

En las dos primeras comparaciones revisadas las crestas se leen algo más, pero el suelo permanece muy oscuro y la separación de grandes zonas sigue siendo insuficiente. La prueba demuestra que la respuesta direccional existe; no demuestra que baste con aumentar su intensidad. Conservar como referencia, no promover como solución ni descartarla por rendimiento. Próximo diagnóstico: contribución ambiental y acumulación de oclusión, sin neutralizar cavidades ni iluminar artificialmente todos los materiales.

No se añaden lecturas de textura, geometría, targets ni pasadas. Contadores del último render (no coste total de sombras), vistas0/1/2: [(69, 502116), (40, 384666), (66, 437465)]. No se ha ejecutado benchmark temporal porque aún no se considera una solución artística suficiente; no se afirma coste cero ni mejora FPS. Pendientes movimiento, ciclo completo y comparación del horizonte.

```text
node tools/experiments/capture-volcanic-night-relief-20261021.mjs
python tools/experiments/package-volcanic-night-relief-20261021.py
```

Vite5190. PNG originales locales; seis parejas y metadatos publicados. Solo ruta QA; original y main intactos.
