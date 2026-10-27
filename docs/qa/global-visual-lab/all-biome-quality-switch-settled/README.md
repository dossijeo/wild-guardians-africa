# Cambio de calidad: seis biomas

48capturas reales en media → muy_baja → baja → media, día y noche, semilla7121280×720. El controlador espera chunks y horizonte antes de cada paso. Cero errores de página/shader/WebGL.

| Bioma | Píxeles distintos al regresar, día/noche | Diferencia máxima RGB día/noche |
|---|---:|---:|
| Sabana |2 /2 |1 /6 |
| Gran Río |5 /6 |25 /1 |
| Gran Cañón |0 /1 |0 /1 |
| Manglares |0 /0 |0 /0 |
| Volcanes |0 /0 |0 /0 |
| Desierto |1 /0 |1 /0 |

Seis de12regresos exactos. Residuos restantes pequeños, causa no aislada: no afirmar identidad total. Mosaico diurno inicial/regreso inspeccionado: se recuperan las sombras sin la desaparición observada antes del fix. La comparación nocturna es numérica; no inspección artística exhaustiva de48imágenes.

Máscaras25 constantes en todas las secuencias. Geometrías/texturas regresan al valor inicial de cada bioma. Manglares conserva24parches y libera una vez cada material sustituido en los pasos hacia Basic y hacia Standard. No se mide VRAM, no prueba prolongada de fugas ni benchmark FPS.

La primera ejecución sin espera suficiente queda local en ../all-biome-quality-switch/: Desierto diurno creció20→25máscaras y cambió triángulos. Se invalidó esa comparación por carga incompleta y se repitió la matriz completa. No se modificó el renderizador para ocultar la diferencia.

Configuración: global-lighting, sandRelief1, Manglaresfull; coberturaQA C/viento8 en Sabana/Río, paletaQA de Río y piso cálidoQA de Cañón. No es una comparación integral de todas las candidatas artísticas (por ejemplo, no activa canyonSandfull ni volcanicAshprocedural). Verifica reversibilidad del perfil en esta configuración. Falta aislar costeCPU de Manglares y continuar evaluación artística global.

Reproducir: `node tools/experiments/capture-all-biome-quality-switch.mjs` y `python tools/experiments/package-all-biome-quality-switch.py`, Vite5190. Capturas originales locales; captures.json,summary.json y day-quality-returns.webp versionados.
