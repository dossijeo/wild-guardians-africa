# Gran Cañón: cámara elevada corregida y cierre de recursos

12 capturas /6 parejas reales, calidad media, seed712,1280×720, día150/noche350, tres cámaras elevadas con desplazamientos horizontales cortos. La vista0 ya muestra ambas orillas sin la meseta que bloqueaba el pase overview. Mismo material de arena procedural, sin la optimización de máscara descartada.

[Elevada diurna](media-day-0-pair.webp) · [Elevada nocturna](media-night-0-pair.webp)

Se inspeccionaron ambos pares de vista0. Las ondulaciones se conservan a esta altura y las zonas arenosas rompen la uniformidad de grava. La diferencia nocturna es grande y oscurece depósitos; no afirmar equivalencia cromática. Las demás poses tienen auditoría automática, no aprobación artística individual. Es un encuadre de ambas orillas, no prueba de todos los sectores del bioma ni equivalencia al mockup completo.

Auditoría: cámara/objetivo/hora/llamadas/triángulos iguales por pareja, sin errores. Ocultación cercana fijada por pose. No repite el benchmark: el sobrecoste nocturno de ../performance sigue pendiente y evita integrar la receta.

## Liberación real

Tras terminar capturas se instala un listener en cada textura de layerTextures y se llama a world.dispose(), no directamente a texture.dispose(). En la candidata: dos recursos, un evento dispose cada uno, biomeGround.disposed=true y layerTextures vacío. El control no posee capas adicionales. Los JSON lifecycle conservan UUID y conteos. Esto demuestra el camino de liberación de esos dos clones en un cierre; no mide VRAM, caché de assets, ciclos repetidos ni fugas de streaming prolongado.

```powershell
node tools/experiments/capture-canyon-sand-elevated.mjs
python tools/experiments/package-canyon-sand-elevated.py
```

Vite5190. PNG fuente locales; pares seleccionados y trazas publicados. Candidata QA, no integrada. Siguientes requisitos: corregir crestas demasiado claras en sombra cercana sin perder ondulación, validar movimiento y resolver presupuesto GPU. Main y simulación intactos.
