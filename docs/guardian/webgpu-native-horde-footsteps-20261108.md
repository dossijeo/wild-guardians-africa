# Incursión nativa en WebGPU: primera observación

El 8 de noviembre de 2026 se arrancó en Edge una copia de `tests/fixtures/sabana712-d6-native-multi-reservation.json.gz`, con ocho animales y la simulación pausada hasta que las señales de recursos del escenario estuvieron preparadas. El archivo original carece de `wildEngineWorldVersion`; para permitir el arranque se asignó `1` solo a la respuesta de laboratorio y se añadió la pausa `qa-stable-start`. Esta adaptación no prueba la restauración de partidas antiguas ni la equivalencia espacial de la partida. En la misma máquina Windows detecta una GTX 1660 (controlador 32.0.15.8129); el renderizador declara WebGPU y una petición independiente de adaptador informa NVIDIA/Turing, sin identificador del dispositivo.

Después de esperar diez segundos adicionales con la simulación pausada, se soltó la pausa. Una única ejecución registró 179 intervalos de `requestAnimationFrame` en una ventana solicitada de 10 s, que duró 11,68 s: media 65,55 ms, p95 133,34 ms, p99 666,63 ms y máximo 733,36 ms. Las tres consultas al estado de presentación indicaron un retraso aproximado respecto a la simulación de 0,20, 2,35 y 4,85 segundos. Esas consultas son asíncronas, no son una muestra estadística de latencia y perturban la ejecución. La preparación hasta las señales de disponibilidad tardó 43,04 s, además de la espera de 10 s.

La [captura](webgpu-native-horde-footsteps-20261108.png) muestra la escena nocturna, pero la cámara está demasiado lejos para valorar las diferencias de las pisadas. Las señales registradas muestran ocho bestias visibles; no acreditan que los intervalos históricos de pisadas se hayan admitido. No se capturaron tiempos GPU, una traza de los bloqueos ni una comparación A/B: no se puede atribuir el retraso ni los fotogramas largos a una operación concreta, ni al cambio de pisadas. Es una sola ejecución y no establece una mejora o regresión de rendimiento. [Datos íntegros](webgpu-native-horde-footsteps-20261108.jsonl).

Reproducción aproximada desde la raíz, con Edge y Playwright instalados:

```powershell
$env:VITE_PRESENTATION_BACKEND='webgpu-worker'
.\.cache\tooling\node20.exe node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5175 --strictPort
# En otra terminal:
$env:NODE_PATH='C:\Users\Gabriel\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:QA_ONLY_SKIP_LEGACY='1'
$env:QA_REPEATS='1'
$env:QA_WINDOW_MS='10000'
$env:QA_OUT_FILE='.cache/webgpu-native-horde.jsonl'
.\.cache\tooling\node20.exe tools/experiments/measure_webgpu_native_horde.mjs
```

La ejecución se hizo con modificaciones preexistentes sin confirmar en el árbol de trabajo, incluidos archivos de escena y preparación de personajes. Por ello el commit del ensayo por sí solo no reproduce exactamente el estado probado. La cámara próxima, la comparación visual entre vías y una traza que identifique las causas del retraso siguen pendientes.
