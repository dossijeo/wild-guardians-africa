# Reparación de trabajadores en WebGPU

La reparación confirmada (`repair`) solicita bajo demanda un banco `Dig` compartido para cada uno de los cuatro perfiles y reproduce en GPU el esqueleto y las cuatro piezas rígidas de la azada. Los datos se generan con el mismo rig y `workerPose` usados por el mezclador CPU; `node tools/guardian/build-worker-gpu-walk.mjs --clip=Dig --check` verifica los cuatro bancos. Cada banco ocupa 143.640 bytes. La admisión conserva el rig original hasta completar la preparación y descarta una respuesta tardía si cambia la tarea o el objetivo. Una interrupción, caída, recuperación o recurso no disponible conserva o recupera la ruta CPU.

La fase de la reparación sigue las publicaciones confirmadas: no se certifican ni extrapolan intervalos históricos para `Dig`. Los resultados de reparación, navegación, colisiones y eventos permanecen en la simulación. El banco participa en la liberación diferida de recursos y en la composición de movimiento, sombras y picking existentes.

Las pruebas dirigidas cubren los cuatro rigs reales, muestras de autoría exactas, herramientas, cambio de tarea, objetivo obsoleto, liberación y generación WGSL de color y sombra con trayectoria. Pasan 83 pruebas de catálogos, roster, acciones y certificación previa. Las pruebas gráficas usan dobles o generación WGSL sin dispositivo: quedan pendientes la comparación perceptiva de la azada, el dibujo real, las incursiones y la medición de CPU, GPU y memoria en la fase C. No se afirma una mejora global de rendimiento.

