# Arena normal-only: streaming y cambios de origen

Conservar candidata QA: los circuitos ensayados mantienen distribución al regresar y liberan la textura de capa. No es validación de partidas largas ni aprobación global de coste.

[Regresos candidata día](candidate-day-returns.webp) · [Noche](candidate-night-returns.webp) · [Control día](original-day-returns.webp) · [Control noche](original-night-returns.webp).

## Prueba real

Gran Cañón seed712, calidad media,1280×720, día150/noche350. Grava .08 control frente a arena seca normal-only, buriedRelief=false, global-lighting y warm-floor en ambas. Dos circuitos cuadrados de192 unidades desde el mismo punto, nueve poses por fase, 36 capturas/18 parejas. Cambios de origen0→16 por variante. Cámara elevada offset[6,34,6]; chunks y horizonte asentados,16 renders por pose, materiales congelados y simulación pausada. Movimiento por saltos: no valida popping durante desplazamiento continuo.

Auditoría exige cámaras/objetivos/orígenes/chunks/draws/triángulos iguales entre variantes y regreso a coordenadas globales iguales en índices0/4/8. Cero errores registrados. La tira diurna candidata fue inspeccionada: mantiene depósitos y ondulaciones. MAE de regreso día0.001901/255 candidata y0.003224 control; noche candidata0 y0.000000362, control0. No igualdad exacta diurna, ni atribución causal de residuos sin análisis adicional. Las tiras comprimidas son ilustrativas; métricas calculadas desde PNG.

Programas acaban en36 en ambos. En noche el control vuelve a89 geometrías/46 texturas y candidata89/47 tras cada circuito; no crecimiento acumulado observado ahí. Variación inicial de recursos impide usar el primer recuento como presupuesto estable. Son contadores renderer.info, no VRAM ni prueba exhaustiva de fugas. Cierre real world.dispose: la única textura adicional emite dispose una vez, lista de capas vacía y objeto dispuesto. No cubre todos los caches ni múltiples sesiones.

settleMs incluye carga y16 renders manuales: no es latencia pura de streaming ni benchmark de fotograma. El coste cercano permanece en el informe anterior (+0.23/+0.54ms GPU día); esta prueba no lo modifica.

## Piloto excluido

La primera serie local ../streaming sumaba/restaba renderOrigin a controles que ya estaban en coordenadas globales. La aserción de regreso falló. render-origin.js aplica coordenadas relativas solo durante el dibujo y restaura después. Se corrigió el capturador, sin modificar el motor, y se generó esta serie separada. No presentar el piloto como validación de continuidad.

## Reproducción

```powershell
node tools/experiments/capture-canyon-sand-streaming.mjs
python tools/experiments/package-canyon-sand-streaming.py
```

Vite5190, Chrome/Playwright, Python/Pillow/NumPy. [Registros](captures.json), [resumen](summary.json), [cierre candidata](media-candidate-disposal.json). PNG locales; tiras y registros publicados. Sin cambios de main, simulación o modelos. Pendiente revisión temporal continua y decisión de integración experimental considerando coste y conjunto de biomas.
