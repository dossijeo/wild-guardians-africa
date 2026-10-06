# Herramientas nativas ocultas de trabajadores

Las animaciones ToolSafe de los cuatro rigs reducen las herramientas inactivas a escala 1e-5. Antes seguían enviándose sus meshes al render. Ahora se ocultan sus seis nodos de herramienta después de muestrear la pose, preservando las visibilidades originales y reactivándolos cuando su escala aumenta. Cuerpo, animación, física, tareas y fuente GLB permanecen intactos. No se eliminan geometrías ni se acredita ahorro de RAM.

## Medición nativa

Finca histórica real de Manglares/Saheliana, continuación normal y contratación pagada de 18 trabajadoras. Cuatro lotes A/B/B/A, solo cambia la supresión visual de herramientas; 15 segundos simulados de calentamiento y 20 medidos, 200 muestras CPU/GPU por lote. Calidad media, sombras, viewport 1280×720, buffer 1600×900, Intel UHD/ANGLE D3D11. Los contadores suman todos los pases del frame, incluida profundidad de VFX. Las dos campañas congeladas existentes seguían ejecutándose; no hubo otros tests/builds propios concurrentes con la medición.

| Lote | Ocultar herramientas | Llamadas | Triángulos | GPU ms | Render CPU ms | Intervalo RAF ms |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | no | 1730.5 | 6048399 | 62.83 | 50.10 | 70.70 |
| B1 | sí | 637 | 5135701 | 59.98 | 52.40 | 74.80 |
| B2 | sí | 637 | 5135701 | 60.34 | 52.95 | 73.60 |
| A2 | no | 1730.5 | 6048399 | 65.07 | 60.40 | 81.45 |

Reducción de llamadas de 63,2 % y de triángulos de 15,1 %. El tiempo GPU mejora modestamente en esta sesión; CPU e intervalos RAF presentan variación considerable y no acreditan una mejora estable/general de FPS. No sumar tiempos CPU y GPU: pueden solaparse o incluir esperas.

Los cuatro estados completos finales tienen el mismo SHA-256, 89 búsquedas de ruta, 17 entregas, 23 recogidas y dos riegos satisfechos durante la ventana medida. Se comparan estados finales, no todos los estados intermedios. Tiempo final 35 s, saldo 841, 186 cultivos vivos. Muestras en [benchmark.json](benchmark.json), hashes/fuentes en [proof.json](proof.json).

## Imagen y regresión

Cinco capturas estáticas emparejadas antes/después reconcilian todos los envíos y conservan el estado lógico. Las imágenes no son idénticas: las geometrías diminutas ocultas aún podían afectar unos puntos. Cambian 45–126 canales entre 5.760.000 canales RGBA por captura; el máximo de diferencia por canal llega a 124. Estos recuentos son canales, no píxeles. [Datos completos](visual.json.gz). [Antes](before.png) y [después](after.png) permiten revisar la apariencia; la comprobación visual es de esta finca/cámara, no de todas las culturas ni móvil.

62 pruebas dirigidas correctas: rigs reales de los cuatro perfiles, visibilidad de regadera/caja, marcadores físicos de acciones, rutas y cosecha automática. [TAP](tests.tap). [Auditoría de canales GLB](authored-tool-scales.json): doce clips por rig y valores originales de escala 1e-5/1 en los seis nodos. Build correcto, con aviso previo de tamaño de bundle ([log comprimido](build.log.gz)).

## Reproducir y límites

Preparar la copia privada del guardado con `node tools/prepare_late_farm_render.mjs` y servir Vite. La referencia congelada 1bfd85a y su Navigation deben estar presentes para los imports del visor. Abrir `/tests/browser/late-farm-render.html`; usar «Comparar herramientas ocultas A/B/B/A». «Diagnosticar envíos por categoría» añade renders y lecturas de píxeles: sus tiempos están perturbados y no sirven para comparar rendimiento. El checkbox estático solo pertenece al visor QA.

El visor utiliza advanceReal(0.1) por RAF: no reproduce el ritmo variable de producción. Sin audio/HUD/autosave/incursiones. No acredita móvil, Windows, RAM en bytes, aceptación de cien noches actuales ni todo el objetivo del juego. Queda pendiente reducir el coste sostenido de GPU y ampliar pruebas.

Revisión visual adicional tras reabrir el visor: cinco pares reconciliados, mismo estado final, consola sin errores y checkbox activado en la captura después. La repetición conserva 29–109 canales distintos, máximo 36; [registro adicional](visual-repeat.json.gz). Ambas capturas generales muestran el mismo estado/cámara con distinto overlay QA; los pares de lectura de píxeles son la evidencia cuantitativa.
