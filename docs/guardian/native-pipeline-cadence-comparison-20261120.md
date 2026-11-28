# Contraste del límite de compilación a 60 Hz

El candidato acotó de seis a una las fábricas explícitas simultáneas de pipelines observadas. El intervalo más largo de arranque persistió y la primera adquisición de Farm ocurrió más tarde. El Host de producción conserva su programación anterior. El parche queda disponible como evidencia para investigar el coste de las fábricas. [Diseño, fuente de Three y parche](native-pipeline-admission-handoff-20261120.md).

La referencia y el candidato completaron el mismo escenario Farm con segunda Task, selección y drenaje en NVIDIA/Turing. Se utilizó Edge 157.0.4341.60 en 4K/60 Hz, las mismas opciones de observación y los mismos binarios nativos. Ambos recorridos conservaron sus entradas durante la medición. Las trazas llegaron al drenaje con ordinales contiguos y CDP sin pérdida. Windows volvió a 4K/30 Hz tras cada recorrido.

| Medida | Referencia | Candidato |
| --- | ---: | ---: |
| Fábricas explícitas observadas | 107 | 107 |
| Máximo de fábricas explícitas simultáneas | 6 | 1 |
| Dibujos enviados / oportunidades | 4.925 / 4.967 | 5.052 / 5.099 |
| p95 y p99 del intervalo de inicio de dibujo | 17,515 / 18,985 ms | 17,535 / 18,925 ms |
| Intervalos de inicio superiores a 1000/60 ms | 2.456 | 2.462 |
| Intervalos de al menos dos períodos | 5 | 6 |
| Intervalo más largo de arranque | 177,275 ms | 183,575 ms |
| Oportunidades bloqueadas por una mutación | 4 | 2 |
| Primera adquisición Farm desde el inicio de observación | 8,957 s | 13,659 s |

El máximo de ambos recorridos se produjo durante el arranque, en la secuencia 4 antes de instalar una frontera nativa. El inicio de dibujo correspondiente consumió 0,350 ms de CPU en la referencia y 0,195 ms en el candidato. En esos intervalos se solaparon dos fábricas explícitas y una, respectivamente. Las trazas siguen delimitando un problema de arranque distinto del número de fábricas simultáneas. Esta pareja no mide la presentación física y no establece cuánto del retraso de la primera adquisición es atribuible al límite de compilación.

El candidato pasó 329 pruebas seleccionadas de transporte, control e instrumentación y la compilación de producto. La prueba GPU confirma su límite de concurrencia. La decisión de conservar la política actual se apoya en la ausencia de una mejora de cadencia apreciable en el contraste y en el tiempo hasta la primera adquisición observado. El límite y las fuentes de instrumentación quedan reproducibles. [Contraste, ordinales y recibos](performance/native-pipeline-cadence-comparison-20261120/manifest.json).

La captura con historial reducido conservó la observación íntegra en ambos recorridos. Los bloqueos causales siguen abiertos. En la referencia se perdieron oportunidades durante bloqueos de 20,150, 18,235, 13,265 y 10,660 ms. El candidato perdió dos durante bloqueos de 24,095 y 17,915 ms. El objetivo de 60 fps y el cierre de C4 permanecen abiertos.
