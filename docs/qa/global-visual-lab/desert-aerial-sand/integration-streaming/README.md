# Arena integrada: streaming y cierre

La opción `visualLab=global-lighting&sandRelief=1` conserva su receta al generar nuevos chunks. Validado en campaña real semilla712, Desierto, 1280×720, media/baja, día/noche. Recorrido con carga completa en posiciones 0,144,288,0 metros; no es un vídeo continuo ni benchmark de latencia.

En las 16 capturas se comprueban 25 materiales residentes y un horizonte, sus parámetros UV1/30/normal1/relief0, contorno geométrico y receta compilada. Regresar recupera las claves de chunks, cámara y objetivo iniciales. No hay errores HTTP/JS ni GL al capturar. Se inspeccionó visualmente la región nueva a288m: mantiene crestas de arena y paleta cálida.

Al llamar al cierre normal de la aplicación, tanto la normal clonada de BiomeGround como su fuente de Assets emiten exactamente un dispose. BiomeGround queda marcado disposed, con cero texturas y máscaras propias. Una segunda llamada a World.dispose no duplica los eventos. Esto verifica ownership y cierre en dos sesiones, no ausencia de fugas prolongadas, memoria física/VRAM o múltiples reaperturas.

Los contadores Three son objetos: en media el recorrido pasa de95geometrías/59texturas a78/49 al retornar. No equivale a bytes ni demuestra una reducción de memoria atribuible a la receta. El streaming retira otros recursos del mundo.

## Retorno visual

[Comparación cuantitativa](return-comparison.json): misma cámara y chunks al regresar, pero no identidad RGB. Cambian1587–1796píxeles de921600; MAE0,00085–0,00090 niveles/255, máximo28–36. No se atribuyen esas diferencias a arena sin un control equivalente; este harness no verifica igualdad de draw calls/triángulos al retornar. La paridad con el helper ya se valida en la [integración estática](../integration/README.md).

Capturas: [inicio día](media-start-day.webp), [288m día](media-away288-day.webp), [retorno día](media-return-day.webp), [288m noche baja](baja-away288-night.webp). Se incluyen las16 WebP RGB sin pérdida, verificadas contra PNG. Datos: [media](media.json), [baja](baja.json).

## Reproducción y límites

Vite5190; ejecutar `node tools/experiments/check-integrated-desert-sand-streaming.mjs`, después `python tools/experiments/package-integrated-desert-sand-streaming.py` (Pillow/NumPy).

El primer intento de harness no llegó a lanzar navegador por declaración duplicada. El primer recorrido válido observó solo el clon: la clave de caché omitía el sufijo false. Se corrigió la observación y se repitió; los JSON finales exigen observar y liberar también la fuente. No se alteró el renderer para pasar la prueba.

Conservar la opción experimental: supera esta prueba de nuevos materiales y cierre. Pendientes reapertura repetida en la misma aplicación y presupuesto del conjunto global. No promover aún a configuración por defecto ni declarar calidad global de seis biomas alcanzada.
