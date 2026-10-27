# Desierto: recorrido continuo durante streaming

Original frente a opción integrada sandWear=residual,media,semilla712,1280x720,día/noche.240 renders consecutivos por fase tras60 de calentamiento: cámara y objetivo recorren z=192*sin(pi*t) y vuelven. El renderizador llama syncChunks normalmente; no se espera carga entre frames. No se codifican imágenes dentro de las mediciones.

960 frames,sin errores,cámaras equivalentes.42 cambios de conjuntos de chunks por recorrido. La carga asíncrona difiere en18 frames diurnos y6 nocturnos entre variantes: no existe equivalencia de carga por fotograma. Una ejecución por variante/fase, no ABBA; no concluir mejora/regresión causal.

| Fase | CPU media original/candidata ms | Intervalo medio ms | Intervalo p95 ms | Máximo intervalo ms |
|---|---|---|---|---|
| Día |4.23/4.35|18.01/17.94|26.90/28.40|45.60/46.40|
| Noche |4.06/4.05|17.74/17.88|26.60/27.60|46.30/55.30|

CPU incluye asignación de cámara y render; excluye registro de metadatos y simulación pausada. Intervalos incluyen planificación y auditoría, no son presentación. No mide GPU. Memoria final84 geometrías en todos;56 texturas control y54 candidata, no ahorro atribuible a este ajuste ni medición VRAM física. Hay picos en ambos; no afirmar fluidez perfecta.

No se grabó vídeo ni se capturaron imágenes durante esta prueba: demuestra ejecución continua y carga concurrente sin errores, no ausencia de shimmering ni equivalencia visual durante carga. El recorrido mantiene altura fija; tampoco certifica navegación cinematográfica libre de intersecciones con cualquier relieve. [Capturas comparables asentadas](../desert-wear-streaming-20261021/README.md) cubren otros aspectos.

Conservar opción visual, sin prometer FPS. Pendiente observación visual temporal y benchmark con cargas comparables si se pretende atribuir diferencias al material.

```text
node tools/experiments/trace-desert-continuous-20261021.mjs
python tools/experiments/audit-desert-continuous-20261021.py
```
