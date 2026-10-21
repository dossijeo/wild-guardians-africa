# Coste de sandMeso nativo: tanda contaminada

No utilizar estos tiempos para estimar el coste de la mejora. La comprobación previa no detectó otra prueba gráfica, pero durante ABBA se reactivó tools/qa-renderer-rescue.mjs con 35–80 % de uso GPU. during.json conserva los procesos y porcentajes; no se intervino en la otra tarea. validity.json marca explícitamente performanceComparisonValid=false.

Intel UHD ANGLE D3D11, 1280×720, media, semilla 712, cámara fija de juego, día/noche, A/B/B/A en páginas separadas. A es sandMeso desactivado; B es opción nativa filtrada sandMeso=1. 60 frames de calentamiento por modo; 90 muestras GPU y 90 de cadencia por fase y ejecución. GPU y cadencia se miden por separado.

La auditoría confirma 720 queries válidas, sin disjoint, pendientes, descartes ni pérdida de contexto; 720 muestras de cadencia. Cámaras, calls y triángulos coinciden entre variantes y repeticiones. Estado lógico sin cambios y sin errores capturados. Validez técnica de query no significa ausencia de contención ni causalidad de la diferencia.

El control diurno cambia de GPU media 10.103 a 16.819 ms y su intervalo de 16.632 a 24.971 ms. El control nocturno cambia de 11.940 a 16.436 ms. Esta deriva y la carga externa documentada invalidan una estimación del coste incremental. No calcular FPS ganados/perdidos ni descartar la candidata con esta tanda. Los resúmenes crudos quedan solo para diagnóstico.

measure-desert-meso-native-cost-20261021.mjs y audit-desert-meso-native-cost-20261021.py reproducen ejecución y auditoría con Vite 5190. Para una repetición usar directorio nuevo y supervisar carga durante toda la ventana. No ejecutar dos benchmarks propios simultáneamente. La prueba es estática y de cachés calientes: no cubre movimiento/streaming ni memoria GPU real.

Mantener la candidata optativa por su mejora visual comprobada; el coste sigue pendiente de una ventana sin otra carga GPU. Main intacta.
