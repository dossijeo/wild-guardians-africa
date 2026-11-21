# Cierre de infraestructura: eventos, física y recuperación

Los tres contratos se implementaron y comprobaron en el juego con Worker y WebGPU reales. El perfil histórico sigue siendo explícito y reversible. Este cierre permite continuar la migración de contenido B; no declara terminada su paridad visual ni habilita por defecto todas las rutas experimentales.

| Contrato | Evidencia | Alcance |
| --- | --- | --- |
| Eventos interiores | [Informe](historical-events.json), [captura](historical-events.png), [registro completo](historical-events-full.json.gz) | Incursión nativa de manglares sin modificar, cinco bestias y un trabajador. Cuatro eventos, dos sublímites y una publicación completada; sin recuperación automática ni errores de página. Dos ejecuciones pasan; la final termina en la secuencia 1233, 22,50 s. |
| Física histórica activa | [Informe](historical-physical.json), [captura](historical-physical.png), [registro completo](historical-physical-full.json.gz) | Un ragdoll Rapier real aislado, dos inicios, cinco cambios de muestra y una finalización. Los 78 huesos coinciden con la muestra confirmada: error 0. Attack entra por ID a la ruta normal de acción, no por selección de píxel. |
| Pérdida real de dispositivo | [Informe](device-recovery.json), [captura posterior](device-recovery-after.png) | Destrucción del dispositivo, Worker de reemplazo, checkpoint 66 y replay hasta 193; reanudación visual 194 y autoritativa 196. Trece animales preparados; event-323 y event-324 reproducidos sin duplicados. |

La física se verificó antes del arreglo final de continuaciones de eventos. Su registro combinado conserva honestamente el fallo de eventos de aquella ejecución; la ejecución posterior de eventos tiene su propia evidencia. No se ha certificado una combinación de física activa, eventos interiores y pérdida del dispositivo. La recuperación registra dos respuestas HTTP 404 sin identificar y el aviso esperado de destrucción del dispositivo, aunque no errores de página.

Backend comprobado: WebGPU, adaptador NVIDIA Turing, isFallbackAdapter=false. La captura de recuperación identifica la GTX 1660 en el inventario del navegador. No se utilizan los datos de tiempos de estos informes para atribuir mejoras de rendimiento: son comprobaciones funcionales, con instrumentación y otras verificaciones CPU concurrentes.

## Trabajo resuelto

- Los subtramos comparten la publicación exterior sin ser rechazados como versiones obsoletas. Su continuación exige reloj activo, extremo confirmado y continuidad exacta. La parada intermedia se extiende solo con un participante inmóvil certificado. Reset revoca el permiso y rollback lo restaura antes de avanzar el reloj.
- El diagnóstico distingue un fallo al certificar del fallo al instalar animales, trabajadores o efectos, y conserva el rechazo de evento aunque falle después una vista ordinaria.
- Se admite el índice canónico de terreno promovido por Three.js de Uint16 a Uint32, comprobando aún todos sus índices y posiciones.
- La colocación del guardián dispone de límites de los biomas y dependencias precisas de edificios y terreno. La reserva acotada del journal permite resolver el gesto provisional que aplaza su checkpoint, sin reordenar comandos.
- El canal sin journal mantiene la barrera de checkpoint hasta su aplicación. Con journal conserva la admisión limitada por su capacidad.

## Validación y reproducción

Node 20 local: `.cache/tooling/node20.exe`. La batería final pasa **307/307** pruebas, secuencialmente; [salida TAP](contracts-tests.tap.gz). Incluye autoridad nativa, eventos causales, física, rosters, continuación GPU, terreno, recuperación, metadata del guardián y confirmaciones. La batería independiente de recuperación pasa 183/183; sus casos se solapan parcialmente. La [compilación](build.txt) del perfil WebGPU pasa con avisos de tamaño de chunks existentes.

Arranca Vite en un puerto libre con estas variables del proceso:

```powershell
$env:VITE_PRESENTATION_BACKEND='webgpu-worker'
$env:VITE_HISTORICAL_PRESENTATION_RECOVERY='true'
$env:VITE_HISTORICAL_EVENT_BOUNDARIES='true'
.\.cache\tooling\node20.exe node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5187 --strictPort
```

En otra terminal, con Playwright disponible, ejecuta una prueba de navegador cada vez:

```powershell
$env:QA_BASE_URL='http://127.0.0.1:5187'
$env:QA_OUTPUT='.cache/historical-events-check'
$env:QA_EVENTS_ONLY='1'
$env:QA_TIMEOUT_MS='360000'
.\.cache\tooling\node20.exe tools/experiments/audit_webgpu_historical_rapier.mjs
```

El arnés exige WebGPU por hardware y una publicación histórica completada. El modo de eventos no ataca ni altera la captura nativa. Para física, elimina QA_EVENTS_ONLY, selecciona QA_INPUT_MODE=id y consulta [su procedimiento](../historical-physics-samples-20261107.md). Para pérdida de dispositivo utiliza tools/experiments/audit_integrated_device_recovery.mjs; su QA_OUT controla la carpeta de salida. PLAYWRIGHT_MODULE permite indicar una instalación local: el arnés físico/de eventos usa el directorio del paquete, y el de recuperación su archivo index.mjs. No cambia el backend comprobado.

## Límites que conserva B/C

Los intervalos sin certificado suficiente usan la presentación ordinaria: no se aceptan cambios estructurales interiores, varios cuerpos físicos, física baked o recuperaciones como si estuvieran cubiertos por estos tres ensayos. Su presentación normal continúa disponible. La selección exacta por píxel bajo desfase de publicación tiene [un límite documentado](../historical-input-picking-limit.md), independiente de esta auditoría. La calidad visual de las capturas muestra pendientes de iluminación, sombras y materiales; no es prueba de paridad artística. Las campañas prolongadas y las combinaciones de excepciones siguen siendo validación B/C, no garantías deducidas de estos resultados.
