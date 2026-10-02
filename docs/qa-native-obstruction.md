# Ocultación nativa de obstáculos de cámara

Se recuperan literalmente `obstructionRecord`, `obstructionFrame`,
`obstructionVisibility` y el patrón de cobertura 8×8 de Bioma Lab V4.0.
El volumen orientado usa dimensiones originales, escala y giro de cada
instancia. Distancia predeterminada 7, corredor central 0,82, margen 0,45;
la cámara dentro del volumen lo oculta. La cobertura disminuye a tasa 16
y se recupera a tasa 7, con dt visual limitado a 0,12 y umbrales originales.
Este reloj visual permite mover la cámara durante una pausa del juego.

Cada batch tiene un atributo privado de cobertura; los materiales y los
arrays estáticos de vértices/índices siguen compartidos. El descarte ordenado
se aplica al color y a la captura de profundidad para VFX. No usa blending
ni cambia colisiones, generación, selección o estado simulado. Las sombras
conservan los objetos completos, como el lab. La vegetación baja (grupo 2),
slot 19 y objetos de altura <=0,72 quedan excluidos. Las superficies de agua
y el horizonte tampoco usan esta ocultación.

Los paquetes Manglar/Cañón/Desierto no siempre declaran min/max. Se calculan
desde la geometría del LOD completo, usando sus coordenadas originales;
el volumen no cambia al mostrar un LOD reducido. Los overrides de grupo de
los paquetes se respetan. Las vistas geométricas con cobertura se liberan
al descargar su chunk, sin liberar el prototipo lógico. Three puede volver
a subir los buffers compartidos de un chunk retenido después de ese dispose;
la optimización global de buffers/VAO del lab sigue pendiente.

Pruebas: comparación independiente con el HTML en 45 combinaciones de giro,
escala y pose, offsets de chunk; exclusiones y fallback al LOD completo;
cobertura independiente, tasas de salida/recuperación, ausencia de uploads
en frames estáticos, descarga de recursos y composición con el cel shader.
Los controles de activación/desactivación y cámara dentro de un prop están
solo en el visor de QA; no se añaden reglas al juego ni a sus guardados.

CUA: seis biomas, cultura Mapungubwe y semilla 712. Sabana compara la misma
pose con ocultación activada/desactivada y noche; Manglar registra cuatro
ocultos mientras trabajadores y bestias siguen visibles; Cañón comprueba
ocultación y viaje con descarga; Gran río usa alta (49 chunks), Desierto
muy baja y Volcanes media. Todos registran cero errores WebGL y de consola.
Las capturas y estados quedan en `test-results/native-obstruction-*`.
Pasan 14/14 pruebas dirigidas en 4,704 s, build en 5,67 s y paquete web:
547 archivos / 379.354.008 bytes / 791 enlaces relativos / 20 GLB de ejecución.
CI del horizonte anterior 478acb0 aprobada en 37026532643.
La regresión completa final pasa 536/536, sin omisiones, en 275,037 s.

Quedan pendientes los materiales completos de props, LOD por distancia,
batching global, generación en worker, origen flotante y rendimiento móvil.
Esta comprobación no acredita todos los recorridos y culturas del juego.
