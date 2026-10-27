# Muestreo condicional de color: rendimiento no concluyente

Comparación directa contra la receta completa aprobada; normales de barro siempre leídas. No reduce calidad, geometría o resolución. Se conserva la dirección visual independientemente de la viabilidad de esta optimización.

Intel UHD0x9A60 ANGLE D3D11, Chrome headless, WebGL2, baja1280×720, semilla712. A/B/A/B, páginas nuevas, día/noche;180frames de calentamiento y240muestras por bloque. GPU y CPU/cadencia medidos por separado, cámara móvil determinista y simulación pausada.1920consultas GPU válidas y1920frames de cadencia. Estado, dispositivo, cámara y geometría coinciden; cero errores GL, disjoint o consultas descartadas/pendientes. [Datos](benchmarks.json), [resumen](summary.json).

| Fase GPU ms | Control, dos bloques | Color condicional, dos bloques | B−A |
|---|---|---|---|
| Día |13.373 /17.360|18.820 /16.252|+5.446 /−1.108|
| Noche |13.385 /18.565|13.365 /15.021|−.019 /−3.543|

Variación fuerte incluso en el control. No demuestra ahorro estable ni permite atribuir el empeoramiento diurno íntegramente al shader. Dos bloques no son intervalos de confianza; no se controla temperatura/frecuencia ni carga externa. No comparar con las medias de height-guard como si ambas variantes se hubieran medido juntas.

CPU render día4.342/4.224 frente4.585/5.087ms; noche4.523/4.977 frente4.617/4.222. Cadencia media18.844–31.538ms, p9549.7–72.3ms entre bloques. CPU excluye simulación; cadencia no es presentación. Uploads assetGroups5.4/frame iguales, no todo tráfico GPU. Sin memoria GPU medida.

Las [72 parejas en movimiento](../../color-motion/README.md) acreditan pequeñas diferencias de imagen (0–11 píxeles/frame), pero no ahorro. Conservar color-only como prueba diagnóstica; no promoverla como optimización demostrada. El sustrato completo sigue siendo referencia visual aprobada. Evitar perseguir igualdad RGB como sustituto del objetivo artístico o repetir indefinidamente este microajuste sin aislar la variación del benchmark.

Siguiente trabajo: ampliar validación de la receta completa (streaming/recursos) y evaluar trabajo redundante de iluminación u otros costes medidos, manteniendo su aspecto. La calidad de los otros biomas y la revisión de candidatas visuales conservadas siguen pendientes. Main intacto.

```powershell
node tools/experiments/measure-mangrove-color-gate.mjs
python tools/experiments/audit-mangrove-color-gate.py
```

Vite5190. No hay cambio de renderer por defecto, simulación ni navegación.
