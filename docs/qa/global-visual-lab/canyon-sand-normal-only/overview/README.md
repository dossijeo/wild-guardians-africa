# Arena normal-only: cámara de juego y cierre

12 capturas /6 parejas, calidad media, seed712,1280×720, día150/noche350. Compara arena seca completa con su versión normal-only; no compara contra grava. Tres cámaras: normal, elevada corregida y reversa. Cámara/objetivo/hora/llamadas/triángulos coinciden; sin errores.

[Normal diurna](media-day-0-pair.webp) · [Elevada nocturna](media-night-1-pair.webp)

Se inspeccionaron esos dos pares. Normal-only conserva ondulaciones y distribución de depósitos; el color es más uniforme. No se detecta en estos encuadres pérdida importante de lectura de volumen, pero no es identidad ni aprobación visual de todos los sectores. Diferencia media RGB de la matriz .38–.59/255. La métrica no reemplaza revisión artística. No hay vídeo ni validación temporal.

## Recursos

Después de capturar se comprueba que los uniformes uLayerSandNormal encontrados en materiales de chunks apuntan a layerTextures. Se llama a world.dispose(). En candidata hay1 textura de capa y exactamente1 evento dispose; en completa hay2 y1 evento por recurso. Ambas terminan con biomeGround.disposed=true y layerTextures vacío. Los registros lifecycle conservan UUID/conteos/bindingOK.

El chequeo de enlaces no cuenta materiales ni recorre horizonte, por lo que no demuestra cobertura exhaustiva. Un cierre no prueba ausencia de fugas en streaming prolongado o repetidas aperturas. No mide VRAM ni memoria de caché. La disposición reducida de recursos funciona en la escena ensayada.

**Decisión:** conservar candidata normal-only para continuar. La revisión normal/elevada ya aporta evidencia visual adicional; quedan movimiento y presupuesto diurno estable. El ABBA anterior tuvo fuerte deriva y no se invalida ni se convierte en aprobación por estas capturas. Sin integración en main.

```powershell
node tools/experiments/capture-canyon-sand-normal-overview.mjs
python tools/experiments/package-canyon-sand-normal-overview.py
```

Vite5190. PNG fuente locales; dos pares seleccionados, trazas y ciclos de vida publicados.
