# Infraestructura y responsabilidades de la migración B

## Estado actual de los tres pendientes

| Área | Estado implementado | Límite y validación pendiente |
| --- | --- | --- |
| Eventos interiores | El protocolo v2 captura deltas causales al observar cada evento y un delta silencioso al terminar el tick. El receptor aplica sublímites ordenados, el reloj se detiene en ellos y el ACK exterior llega una sola vez al completar la publicación. El pump certifica cada tramo y recurre a la vía ordinaria si faltan pruebas. | El perfil es opt-in. Cambios interiores de `suppressed`, `structures` o `villages`, actividad física, lifecycle no representado y otros casos sin evidencia conservan fallback. Falta comprobar el flujo en una partida con Worker y GPU reales. [Contrato de eventos](historical-interior-events-contract.md). |
| Física histórica | Hay captura Rapier y reproducción discreta de un único ragdoll aislado, con verificaciones de muestras, rig, terreno, separación y propiedad de pose. Los participantes restantes conservan sus certificados. | No equivale a interpolación articular ni cubre física baked, recuperación, transiciones, varios cuerpos físicos o intervalos con eventos interiores. Verificada la reproducción en la partida WebGPU con rig real: 78 huesos, error 0; dos inicios, cinco cambios de muestra y una finalización. Attack entró por ID en la ruta normal de acción; no valida selección por píxel ni paridad artística o separación completa de mallas. [Evidencia](b-close-20261107/historical-physical.json). [Muestras y límites](historical-physics-samples-20261107.md). |
| Recuperación de presentación | Existen checkpoint, diario ordenado, reconstrucción de Worker y señal explícita de invalidación histórica; la nueva generación parte de un límite externo confirmado. Las pruebas de contrato cubren pérdida y repetición sin ACK prematuro. | Corregidos el falso rechazo del watermark, la carrera `markLost` → `prepareVisualRecovery`, los plazos gráficos y la acumulación de tiempo real. La prueba real sobre GTX 1660 pasa: generación nueva, secuencia 166 → 256 → 257, 13 animales preparados y dos eventos de replay sin duplicados. No incluye impacto físico activo ni certifica paridad visual. Evidencia: [informe](b-close-20261107/device-recovery.json) y [captura posterior](b-close-20261107/device-recovery-after.png). [Contrato de recuperación](temporal-recovery-contract.md). |

El núcleo revisado está en el commit `34124bd94`, sincronizado en GitHub; el
barrido conjunto comunicado para ese núcleo pasa 363 pruebas. Estas pruebas no
son una validación de imagen, una campaña completa ni una medición de rendimiento
en GPU. La recuperación real tiene además la prueba específica descrita arriba. Las
combinaciones con física y eventos no quedan cerradas por el barrido de contratos.

## Activación reproducible para investigar eventos

El perfil siguiente se selecciona al arrancar Vite; no se habilita mediante una
URL de diagnóstico ni modifica el valor predeterminado del producto. En una
sesión PowerShell desde la raíz del repositorio:

```powershell
$env:VITE_PRESENTATION_BACKEND = 'webgpu-worker'
$env:VITE_HISTORICAL_PRESENTATION_RECOVERY = 'true'
$env:VITE_HISTORICAL_EVENT_BOUNDARIES = 'true'
npm run dev
```

Inicia una partida en un navegador con WebGPU y verifica explícitamente el
backend y el adaptador del dispositivo. Para contrastar con la ruta anterior,
reinicia Vite con `VITE_HISTORICAL_EVENT_BOUNDARIES` sin definir o con otro
valor; no basta con cambiarlo en una pestaña ya abierta. La activación por sí
sola no demuestra que un intervalo haya sido admitido: hay que registrar los
inicios, sublímites, rechazos y fallback, y verificar eventos, estado, pausas,
ACK y recuperación contra una referencia. No atribuir resultados a hardware
si el navegador utiliza un adaptador por software.

Pruebas de contrato dirigidas:

```powershell
node --test tests/historical-event-boundaries.test.js tests/historical-event-auto-recovery-integration.test.js tests/confirmed-historical-event-playback.test.js tests/confirmed-historical-clock.test.js tests/slice-historical-preview.test.js tests/webgpu-historical-boundary-sync.test.js
node --test tests/confirmed-physics-pose-samples.test.js tests/worker-historical-physics-isolation.test.js tests/worker-historical-physics-gates.test.js
```

Para física, utiliza además el procedimiento y las opciones del experimento
indicados en [Muestras históricas de física](historical-physics-samples-20261107.md).
Los dos grupos requieren pruebas de navegador con actores y terreno reales; los
dobles gráficos de las pruebas de contrato no sustituyen ese paso.

## Reparto de responsabilidades

El trabajo de contenido comprende modelos, texturas, recetas TSL, clips,
parámetros artísticos y conexión con los propietarios existentes. La
infraestructura conserva la autoridad de simulación, transporte, secuencias,
admisión, propiedad de recursos y poses, cancelación y recuperación. Evita
replicar esos protocolos por especie, animación o efecto.

| Área | Propietarios y obligaciones de infraestructura |
| --- | --- |
| B1 terreno, agua e iluminación | Surface, residencia temporal y admisión coordinan revisiones visibles y confirmadas, recursos y pases. La paridad de fórmulas y texturas corresponde a contenido. |
| B2 vegetación y LOD | Coordinador de chunks y residencia gestionan generaciones, cancelación, relevo de LOD y recursos tras recuperación. |
| B3 cultivos y construcción | Previews por ID y bancos progresivos mantienen orden entre petición, carga, confirmación, rechazo y destrucción sin crear colisiones provisionales. |
| B4 trabajadores y bestias | Rosters, bancos compartidos, reloj y certificados coordinan acciones, sustituciones, movimiento y propiedad de pose; se mantienen los límites de eventos y física arriba indicados. |
| B5 guardián y combate | Feedback provisional y autoridad conservan validación de objetivos, orden causal y transferencia de pose; contenido mantiene gestos, rostro y VFX. |
| B6 efectos y destrucción | Diario y admisión conservan recursos y dependencias de terreno, sin duplicar ni perder eventos durante recuperación. |
| B7 tutorial, cinemáticas y guardado | El perfil Worker mantiene continuidad, tiempo de simulación, pausas, cancelación y restauración sin introducir dependencias nuevas del renderer anterior. |

La lectura del código y las pruebas aisladas no acreditan que B esté terminado.
La validación integrada debe cubrir inicio, interacción, cambios de mundo,
incursiones, pausa, guardado, recuperación y continuidad visual antes de cerrar
la migración o medir su rendimiento conjunto.
