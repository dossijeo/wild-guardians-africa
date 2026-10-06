# Seguimiento regional del foco de cámara en el visor

Solo experimento aislado de Sabana/acacia; no se activa en gameplay.

FarRegionTracker consulta el foco de OrbitControls con cálculo constante, sin muestrear terreno ni árboles por frame. Centros en cuadrícula de 96 unidades; histéresis de 16 sobre el semiancho de celda (umbral 64) y espera de 150 ms en el mismo centro candidato. Orbitar/zoom no cambia el foco y no provoca nuevas regiones. El coordinador existente conserva último resultado y cancela lo obsoleto. Ante fallo se vuelve a la referencia residente y se retrasa el siguiente intento un segundo. Seguimiento detenido durante mediciones de lotes.

Las consultas ahora son simétricas en X/Z alrededor del foco: árboles 360×360 y terreno 480×480, con step4. Esto añade cobertura detrás de la cámara respecto a la región diagnóstica anterior 360×278; no comparar las mediciones históricas como si usaran la misma población. Bounds negativos/alineación y tamaños constantes comprobados. Los movimientos del botón «Cambiar región» desplazan cámara/foco 96 en ambos ejes; el botón ya no solicita la carga directamente ni mueve la cámara al terminar: la petición proviene del seguimiento en frames. La geometría nueva se adjunta cuando está lista.

## Evidencia

Veinte pruebas pasan (2.396 ms), incluyendo 10.000 posiciones de jitter sin petición, viaje diagonal y reverso con histéresis, desplazamiento rápido/settling del último candidato, reset tras fallo, bounds simétricos, solicitudes obsoletas, worker real, buffers transferidos, anclajes y solapamientos deterministas. Primer ensayo falló por comparación estricta de -0/0 en el resto módulo de coordenadas negativas; se corrige la aserción de alineación usando valor absoluto, sin relajar el requisito.

Prueba nativa archivada: initial/orbit comparten epoch1 y residente 0:0, cámara cambia de [0,22.485351,70] a [49.497475,22.485351,49.497475]. Tres desplazamientos diagonales llevan foco a [288,13.285760,288]. Pending conserva residente 0:0/petición192:192 mientras se estabiliza el nuevo destino; final publica 288:288, epoch4, sin pendiente. Acercar conserva foco/región, cámara [288,20.285760,313]. Todos GL cero, errores vacíos y consola sin avisos/errores. La prueba usa botones que desplazan los controles reales; no es un ensayo de touch/pan continuo en dispositivo físico.

Región final: 148 árboles, 28.800 triángulos de suelo, error máximo de altura en bases 0,134408. La captura revela diferencias de iluminación/silueta entre modelos e impostores. No acredita crossfade imperceptible, ausencia de vacío al teleportar fuera de los bounds anteriores ni estabilidad de GPU durante todos los movimientos. El campo workerLoad conserva valores iniciales; ground.buildMs posterior corresponde al worker, no a montaje del hilo principal. No es un benchmark FPS/RAM/móvil.

Cambios únicamente en herramientas/visor/pruebas, sin cambio del bundle del juego. Pendientes prefetched tiles o anillos para desplazamiento continuo/rápido, unión con chunks 3D/preparación GPU, supresiones de gameplay, bruma/agua/iluminación y validación móvil y de coste total. La zona nueva no se interpreta como aceptación final del horizonte.
