# Caras traseras y acumulación de transparencia

Comparación real en Sabana, semilla 712, calidad baja, 1280×720: tres variantes × cuatro cámaras × día/noche = 24 capturas. Solo se cambia el tratamiento de las superficies en transición. Escena pausada, cámara y tiempo visual equivalentes; sin errores de página o WebGL. No modifica modelos ni producción.

- `double`: ambas caras, una pasada transparente (`forceSinglePass` conservado).
- `base`: `FrontSide`, comportamiento actual de `asset-groups.js` en `visualLab=global-lighting`.
- `combined`: `FrontSide` y profundidad aislada por objeto; únicamente contribuye su superficie más cercana. Helper QA existente con pool y exclusión de la pasada auxiliar del humo.

## Resultado visual

[Comparativa diurna](comparison-day.jpg) y [nocturna](comparison-night.jpg), columnas en ese orden. En la cámara 17, la copa ocupa el primer plano: descartar caras traseras reduce la acumulación, pero todavía se ven múltiples superficies delanteras superpuestas. La profundidad aislada elimina buena parte de esa estructura interior y deja ver mejor el suelo. Conserva una silueta teñida transparente: no elimina toda apariencia de cristal ni asegura una sola capa entre árboles distintos.

Recomendación: mantener FrontSide y conservar la variante de superficie más cercana como candidata visual. No volver al dithering para resolver esta acumulación. La propuesta del usuario de descartar caras traseras es útil, pero ya estaba aplicada; la prueba explica por qué no bastaba en esta copa.

## Coste y límites

Los contadores de la última pasada de color son idénticos: cámaras 9/17/35 muestran 72/77/62 llamadas y 1198803/1341539/1168462 triángulos. **No son el coste total de la variante de profundidad**, pues Three reinicia esos contadores entre renders. El helper contabiliza sus dibujos auxiliares por separado. Con dos objetos parciales activos añade dos dibujos de profundidad por render principal; retiene dos targets a 1280×720, aproximadamente 14.0625 MiB nominales de color RGBA8 + profundidad uint32. No es una medición de VRAM física. La cámara 0 no tiene parciales y sirve de control.

El descarte de caras afecta la rasterización, no reduce el contador de triángulos enviados. No se midieron tiempos CPU/GPU ni se afirma una mejora de FPS. Falta una comparación temporal y de coste aislada para decidir integración. El objetivo visual global sigue pendiente.

`comparison.json` incluye diferencias de píxeles como diagnóstico, no como puntuación de calidad. PNG completos locales regenerables; láminas y metadatos publicados.

## Reproducción

Con Vite en 5190:

```powershell
node tools/experiments/capture-obstruction-backfaces-20261021.mjs
python tools/experiments/package-obstruction-backfaces-20261021.py
```

Usar los valores por defecto (Sabana, baja); las ramas heredadas para otros biomas no forman parte de esta comparación controlada.
