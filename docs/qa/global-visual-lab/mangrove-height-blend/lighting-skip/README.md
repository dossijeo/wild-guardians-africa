# Iluminación condicionada por peso de material

Candidata QA para reducir trabajo redundante sin cambiar la receta visual. Ambas variantes usan musgo/barro con selección por altura y la iluminación del barro basada en los parches. La candidata omite biomeSun/biomeAmbient/biomeDirect/biomeSpec y su composición cuando qaSoilWeight=1; omite africanToon4 del barro cuando qaSoilWeight=0. Entre0 y1 calcula ambas. No usa umbrales aproximados.

No elimina todas las operaciones redundantes: groundReflection y la llamada inicial a nativeGroundLight4 permanecen fuera de la condición, y todas las muestras de los materiales siguen ejecutándose. Una rama puede costar más según divergencia; no dar por hecho un ahorro.

## Imágenes

24 capturas,12 parejas, media/baja, día/noche, tres vistas de transición, seed712,1280×720. Cámara, objetivo, hora, draw calls y triángulos coinciden; sin errores registrados.11 parejas RGB exactas; la oblicua nocturna baja difiere en18 píxeles, máximo4 niveles, caja x450–454/y212–217. El verificador estricto falló y después se sustituyó por un registro explícito de exactitud, sin ocultar la discrepancia ni declararla aprobada mediante tolerancia.

La repetición independiente de calidad baja produce seis parejas exactas. Los controles son idénticos entre ejecuciones; solo la candidata original difiere de la repetida en esos18 píxeles. No se ha aislado su causa. No atribuirla automáticamente a precisión de shader o carga asíncrona. La repetición favorece conservar la variante para medir, pero no certifica igualdad universal ni estabilidad temporal.

[Comparación inicial](comparison.json) · [Registros](captures.json) · [Repetición](repeat/captures.json) · [Auditoría entre ejecuciones](repeat/parity.json) · [Pareja diurna](manglares-media-day-2-pair.webp) · [Pareja nocturna baja](manglares-baja-night-2-pair.webp).

Esta es una optimización candidata de la receta anterior, no una mejora artística nueva. Siguen pendientes volumen del musgo, horizonte, recursos, vista general y coste total frente al renderer original.

## Reproducción

Vite5190:

```powershell
node tools/experiments/capture-mangrove-lighting-skip.mjs
python tools/experiments/package-mangrove-lighting-skip.py
node tools/experiments/capture-mangrove-lighting-skip-repeat.mjs
python tools/experiments/audit-mangrove-lighting-repeat.py
node tools/experiments/measure-mangrove-lighting-skip.mjs
python tools/experiments/audit-mangrove-lighting-skip.py
```

Sin cambios predeterminados, geometría, simulación, navegación o main.

## Coste: señal favorable nocturna, día inconcluso

Intel UHD0x9A60/ANGLE D3D11, baja,1280×720, cámara móvil del asentamiento. ABAB por fase,180 frames de calentamiento y240 muestras por bloque.1.920 GPU válidas y1.920 frames de cadencia; sin consultas disjoint, descartadas, pendientes o errores. Geometría/cámara coinciden por índice. [Datos](performance/benchmarks.json) · [Resumen](performance/summary.json).

| Fase | GPU sin condiciones(ms) | GPU con condiciones(ms) | Diferencias B−A(ms) |
|---|---|---|---|
| Día |13.124 /13.009|13.873 /12.615|+0.749 /−0.394|
| Noche |16.673 /14.415|13.740 /13.768|−2.934 /−0.647|

La noche mejora en ambas repeticiones, pero hay deriva del control. El día cambia de signo. No afirmar una reducción universal ni presupuesto cumplido. Cadencia candidata media18.78–19.16ms, p95 48.4–50.4ms; no es prueba de60fps estables. CPU diurna4.358/4.089ms frente4.723/4.293, nocturna4.114/4.196 frente4.238/3.943. CPU excluye simulación; intervalos son entradas al render, no presentación.5.4 subidas de buffers por frame en todos los bloques.

Conservar solo como candidata QA de optimización. skipUnusedLighting continúa falso por defecto, incluso en el helper. Pendiente coste del conjunto frente a musgo puro y validación temporal/otras cámaras, además del residuo de imagen inicial. No combinar medias de esta serie con la anterior como si fueran un único experimento causal.
