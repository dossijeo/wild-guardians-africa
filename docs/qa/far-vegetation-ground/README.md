# Relieve simplificado para el visor de impostores

Prueba aislada de Sabana/acacia, semilla 712: `tests/browser/far-vegetation-transition.html?lighting=real&population=procedural`. No se activa en gameplay.

El suelo consulta el mismo TerrainField y groundColor del mundo, con cuadrícula de cuatro unidades y colores lavados un 25 %. No genera chunks nativos, texturas detalladas, normales, sombras, agua ni props. La función original se exporta sin cambiar su receta y el generador conserva esa exportación.

Superficie 480×480: 14.641 vértices y 28.800 triángulos, frente a 460.800 en cuadrícula de una unidad. Error vertical en los 112 orígenes originales de árboles: máximo 0,070554 y media 0,014971 unidades. Es una comprobación puntual, no garantía de contactos en toda la superficie ni de equivalencia del footprint del tronco. Native inicial conservado en native.json/relief.png; vistas posteriores near.json/near.png y night.json/night.png.

## Pruebas y medición

Ocho pruebas correctas (5.560 ms): interpolación exacta de campo lineal, orientación de índices, bordes, presupuesto, repetibilidad y relieve procedural, muestreo de colores, árboles deterministas/anclaje y geometría nativa original en todos los biomas. Build correcto (208 módulos, 13,12 s); paquete web: 587 archivos / 382.112.442 bytes / 859 enlaces relativos / 20 GLB runtime. Auditoría SFX sin desfase, 89 asignados/37 reservas. Persiste el aviso de bundle >500 kB.

Ensayo nativo terminado: ocho lotes plano/relieve/relieve/plano/plano/relieve/relieve/plano, cámara fija y mismo conjunto de árboles/densidad/luz. 45 frames de calentamiento y 180 consultas GPU por lote, 1280×720, DPR1, mediodía. Sin disjoint, consultas pendientes ni errores GL; consola vacía. Datos íntegros comprimidos y resumen/hashes adjuntos. La primera pestaña de medición quedó ausente tras cambiar de turno y no se recuperó su resultado; este ensayo proviene de una nueva pestaña actual, cerrada al terminar.

Medianas GPU por lote: plano 0,783 / 0,823 / 0,893 / 0,787 ms; relieve 1,097 / 1,033 / 1,000 / 1,162 ms. Dos draw calls en ambos; 226 frente a 29.024 triángulos. Selección estable (dos escaneos/subidas acumulados) durante la medición. El relieve añade trabajo y altera la oclusión: no es comparación de imágenes idénticas ni promesa de rendimiento gratuito. No mide FPS del juego, RAM física o móvil. Las campañas largas 20608 y 43068 seguían vivas durante la prueba; no se ejecutaron tests/builds propios durante los lotes.

La generación síncrona inicial cuesta 352,5 ms en esta muestra (375,1 en la anterior). Requiere partición/worker y streaming acotado antes de integrar. La noche aplica tintado sencillo al terreno y fog compartido: se observa diferencia perceptual entre copas cercanas/lejanías y no se acredita coherencia de iluminación terminada.

Pendientes: terreno lejano integrado con anillo cercano exacto, bruma/iluminación coherente, agua, streaming y chunks tardíos, pruebas de cámara orbital/lateral y crossfade, otros estados/biomas/móvil y presupuesto total. Este paso elimina el plano de diagnóstico para valorar alturas, no completa la aceptación del sistema de horizonte.
