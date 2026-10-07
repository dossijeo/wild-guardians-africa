# Exponenciales compartidas en fades de obstrucción

Las dos velocidades originales (salida 16 / entrada 7) comparten sus factores por llamada. El cálculo es diferido: poblaciones nuevas, snap y cachés ya asentadas no evalúan exponenciales. No cambia el orden de interpolación, consultas, descarte, empaquetado de cobertura ni escrituras GPU.

Comparación contra Git 2efc8ed: 1200 frames de funciones reales con Three y poblaciones de 32/800/2048 instancias, cámara móvil y estática. Coberturas Float32, estadísticas y versiones de atributos coinciden exactamente en cada frame. Con 2048 instancias móviles se pasa de 407552 evaluaciones a 398 (200 frames, dos velocidades por frame como máximo). Los nueve tests existentes de obstrucción/caché pasan, incluida la comparación contra el oráculo anterior con cambios de lente, target, snap, distancia y pausa del fade.

Cuatro muestras alternadas por brazo, 1000 frames por muestra después de 300 de calentamiento. Medianas en milisegundos del lote completo:

| Instancias | Cámara | Antes | Después |
| --- | --- | --- | --- |
| 800 | moving | 172.602 | 149.409 |
| 800 | stationary | 1.266 | 1.264 |
| 2048 | moving | 445.841 | 344.439 |
| 2048 | stationary | 1.275 | 1.329 |

Es CPU aislada de presentación sobre una distribución en cuadrícula; tres campañas CPU seguían activas. En reposo no aparece mejora consistente. No acredita FPS, GPU, RAM, móvil o coste de frame completo. No se repite el benchmark durante la ventana gráfica del subagente de impostores.

Reproducir desde la raíz con node docs/qa/obstruction-rates/measure.mjs; requiere .cache y el baseline de Git. report.json conserva hashes y muestras; tests.log.gz conserva las pruebas dirigidas. No incorpora resultados del build provisional del intento de audio descartado.

Build final correcto en 14,41 s, con el aviso existente de chunk grande; salida conservada en build.log.gz. Comprobación posterior del paquete correcta: 641 archivos, 859 referencias relativas y 20 GLB de runtime, sin duplicados originales. La compilación se ejecutó antes de la ventana ABBA del subagente de impostores.
