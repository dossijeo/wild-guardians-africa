# Coste de ruido fino en finca avanzada real

Diagnóstico QA sobre `8865252`. Cuatro lotes A/B/B/A de continuación real archivada en Manglares/Saheliana, postgame normal y contratación pagada de 18 trabajadoras. Solo cambia el uniforme existente `uFineNoise=1/0/0/1`: las evaluaciones finas de pigmento/suelo usan valores medios en B. Coarse noise, paleta, bandas, contornos, entorno, luz, geometría y sombras permanecen. El uniforme también se comparte con la destrucción nativa; no es un recuento de instrucciones GPU ni diagnóstico de todas las recetas/materiales.

15 segundos simulados de calentamiento y 20 medidos por lote, 800 muestras CPU/GPU. Calidad media, viewport 1280×720, buffer 1600×900, Intel UHD/ANGLE D3D11. Las campañas congeladas PID 20608/36076 seguían vivas; sin otros tests/builds propios concurrentes con los tiempos.

| Lote | Ruido fino | GPU mediana ms | GPU media ms | CPU render mediana ms | Intervalo RAF ms |
| --- | --- | --- | --- | --- | --- |
| A1 | analítico | 62,16 | 62,30 | 43,75 | 67,60 |
| B1 | valor medio | 57,96 | 58,28 | 49,20 | 78,85 |
| B2 | valor medio | 58,79 | 59,17 | 48,95 | 69,90 |
| A2 | analítico | 61,46 | 61,77 | 54,00 | 76,65 |

Las medianas GPU se reducen en ambos pares (~4,2 y ~2,7 ms), por lo que el ruido fino merece estudiar una sustitución. **No se desactiva en producción:** cambia el acabado y no acredita frametime/FPS estables, todas las escenas o móvil. CPU/RAF varían y no deben sumarse al tiempo GPU.

Misma mediana de 637 llamadas y 5.135.701 triángulos con pases sumados. Cuatro estados completos finales iguales, 89 búsquedas de ruta, 17 entregas, 23 recogidas, dos riegos y tres maduraciones/órdenes de cosecha en la ventana medida. Final: 35 s, saldo 841, 18 trabajadores, 186 cultivos vivos. La comparación es final, no de todos los pasos intermedios. [Datos](native.json), [fuentes/hashes](proof.json). Consola y comprobación WebGL sin errores.

## Imagen y alcance

[Analítico](analytic.png) y [valor medio](mean.png) se capturan al mismo estado/cámara con el checkbox QA, cuya acción comprueba estado lógico intacto. Inspección visual: siluetas, poses y grandes colores conservados; diferencias de detalle/contraste. No son imágenes iguales ni aceptación completa.

Lectura RGB de screenshots en la región `x>=520 OR y>=650`, excluyendo el panel QA: 583.600 píxeles, 120.421 diferentes, 1.569 con diferencia máxima de canal >8/255, media del máximo de canal 0,486/255 y máximo 59/255. [Métricas](image-difference.json). No es comparación directa de framebuffer ni prueba de todos los materiales.

El visor usa advanceReal(0.1) por RAF, no el ritmo variable de producción. Sin audio/HUD/autosave, incursión, móvil ni RAM en bytes. Tampoco acredita cien noches actuales. Se conserva el shader original; la [textura de ruido experimental previa](../noise-volume/README.md) sigue fuera de producción y necesita evaluación en este escenario si se retoma. El coste GPU restante continúa siendo alto.

Para reproducir: `node tools/prepare_late_farm_render.mjs`, referencia congelada Game/Navigation 1bfd85a para imports, Vite y botón «Comparar ruido fino A/B/B/A» en `/tests/browser/late-farm-render.html`. El checkbox estático pertenece solo al visor QA. No requiere build nuevo del producto: únicamente cambia el arnés de prueba, ejecutado nativamente.
