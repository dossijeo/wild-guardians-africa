# Ceniza disponible como opción explícita del laboratorio

La partida normal puede mostrar ambas variantes sin interceptar los módulos del material:

- [Procedural](http://127.0.0.1:5190/?visualLab=global-lighting&volcanicAsh=procedural)
- [Máscara precalculada](http://127.0.0.1:5190/?visualLab=global-lighting&volcanicAsh=mask)
- [Sin ceniza](http://127.0.0.1:5190/?visualLab=global-lighting)

Con el servidor local en 5190, iniciar Volcanes. La opción solo se lee al cargar el bioma y exige `visualLab=global-lighting`; valores ausentes o desconocidos conservan el comportamiento anterior. No se activa en los demás biomas. No se recomienda todavía como valor predeterminado ni se declara alcanzada la calidad global objetivo.

## Integración

`global-volcanic-ash.js` contiene la receta y el precálculo. `BiomeGround` guarda el modo, prepara R únicamente en modo máscara y transmite el modo al material. `AfricanToon` aplica la receta solo al suelo volcánico del laboratorio y distingue las claves de programa para evitar compartir shaders entre modos. La variante procedural no genera máscaras de ceniza. No cambia simulación, navegación, siluetas ni geometría.

Los prototipos QA anteriores quedan como referencia congelada para comprobar paridad. Sus rutas se adaptaron a los nuevos imports sin activar la opción integrada a la vez.

## Validación

36 capturas integradas contra las referencias anteriores: ambos modos y desactivado, tres vistas, baja/media, día/noche, semilla 712, 1280 × 720. **36/36 pares RGB exactos**, con cámara, hora, llamadas y triángulos coincidentes y sin errores registrados. La opción desactivada coincide con el suelo anterior sin depósitos; las otras dos coinciden con sus prototipos. Las capturas usan solo el observador del mundo para QA, sin interceptación de shaders o material.

[Paridad](parity.json) · [Trazas](captures.json) · [Máscara diurna](combined-day.webp) · [Procedural diurna](base-day.webp) · [Desactivada](off-day.webp)

Ocho pruebas de Node pasaron: opt-in, separación de shaders, restricción por bioma, bordes de máscara y regresiones de iluminación global/arena. `npm run build` terminó correctamente; conserva avisos de chunks grandes y de importación mixta de far-atmosphere. No se afirma que esta prueba cubra todas las campañas ni los seis biomas visualmente.

No se repitió el benchmark al integrar código equivalente. Siguen vigentes [costes y límites de ambas variantes](../volcanic-ash-mask/README.md) y [preparación/recarga de máscara](../volcanic-ash-mask-motion/README.md): señal nocturna favorable, mejora GPU diurna no consistente, ~0,55 ms por máscara nueva durante el recorrido medido. La opción permite revisión real; no convierte esos resultados en una aprobación de rendimiento universal.

## Reproducción

```powershell
node --test tests/global-volcanic-ash.test.js tests/global-visual-lighting.test.js tests/global-desert-sand.test.js
node tools/experiments/capture-volcanic-ash-review-option.mjs
python tools/experiments/package-volcanic-ash-review-option.py
npm run build
```

La comparación requiere los PNG locales de los pilotos originales; sus capturadores están documentados en los informes enlazados. Se publican trazas, paridad y seis vistas seleccionadas. Main permanece intacto; PR #159 sigue abierta para revisión.
