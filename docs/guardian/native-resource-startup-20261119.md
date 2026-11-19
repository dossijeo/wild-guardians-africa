# Conexión de recursos nativos en el arranque — 2026-11-19

Continuación A4/A5/e-R3/f-R4 del [plan integrado](integrated-gpu-migration-plan-20261104.md), después de [atribuir los recursos retenidos](native-retained-resource-owners-20261119.md). Se conecta una API existente desde main; no se cambia la admisión de cohortes ni se introduce dependencia, RPC, propietario, cola, caché o reloj.

## Implementación

Cuando el arranque remoto ya ha creado su canal nativo, main espera la conexión de control y conecta los extremos de otro MessageChannel al preparador gráfico y a la autoridad. La función compartida attachWebGpuNativeResources espera el ACK versionado existente de la fuente antes de continuar. En el arranque temprano sucede antes de activateClock. Si cambia la partida durante la espera, rechaza el resultado; ante fallo cierra los extremos aún locales y el cierre de arranque existente dispone los dueños remotos. Una conexión correcta no cierra sus puertos.

El harness hardware utiliza la misma función. La recuperación retenida conserva el endpoint; no vuelve a conectarlo ni sustituye sus dueños. Las guardas de nativeRosterSupported y Game quedan intactas. El productor se crea hoy para declaraciones nativas restauradas de las clases admitidas: conectar el puerto no convierte trabajadores ordinarios, nacimientos, incursiones o puertas en una cohorte soportada.

## Fuente consolidada y decisión

Se leyó código real de [Comlink v4.4.2](https://github.com/GoogleChromeLabs/comlink/blob/v4.4.2/src/comlink.ts): proxyTransferHandler.serialize, expose, requestResponseMessage y releaseEndpoint. El patrón separa los extremos transferidos de su dueño local, correlaciona respuestas y espera la respuesta remota antes de cerrar un endpoint liberado. Se aprovechan aquí los puertos y el ACK ya implementados; transferir un puerto no acredita por sí solo que el receptor esté listo. El hash de la fuente consultada y la decisión se conservan en el recibo. No se instala Comlink ni se añade otro proxy o protocolo.

## Validación nueva

- Nueve casos de conexión y una integración con el host, SourceWorker y autoridad C++ reales. Comprueban handshake aplazado, orden gráfico/fuente, propiedad de puertos, cambio de partida, errores síncronos/asíncronos y limpieza sin ocultar el error. La integración adquiere el actor nativo sobre el mismo dueño. Los 31 casos iniciales pasan tras corregir un predicado incorrecto del fixture; el fallo inicial se conserva y no se presenta como baseline del producto.
- 951 pruebas dirigidas en 69 archivos y cinco sintaxis pasan. La regresión de 346 archivos termina con 4440 pases y 13 omisiones. Doce eran casos sin las variables de ruta WASM del runner anterior; se ejecutan los dos archivos afectados con los binarios ya existentes: 15 pases y una omisión entre 16 casos. El recibo comprueba por nombre los doce resultados nuevos y los cuatro repetidos. La cobertura única de la selección es 4452 pases de 4453 casos, sin fallos y con una omisión opcional por falta del segundo WASM de comparación. No se reconstruyen nativos ni se repite toda la suite para cambiar esas variables.
- Dos builds pasan: el predeterminado en 59.831 s totales y otro con VITE_PRESENTATION_BACKEND=webgpu-worker y VITE_WEBGPU_REMOTE_DRAW=true; el núcleo Vite de este último informa 46.22 s, sin confundirlo con tiempo total. Se conserva el aviso de chunks grandes.
- 625 inputs fijados: 620 anteriores intactos, tres modificados y dos añadidos al mapa; 64 nativos y 16 archivos ajenos exactos.

Las tres exclusiones históricas de host/timeline permanecen fuera de la selección y abiertas. No se presentan como reparadas ni como omisiones opcionales de esta ejecución.

## GPU y aplicación real

Los dos ensayos NVIDIA/Turing de WALK restaurado, con la conexión compartida, conservan 1355 datos y 259 bindings del frame, seis dueños y el inventario de actores/geometrías/materiales. Cada uno usa una autoridad y un snapshot inicial; pasan adquisición, suspensión/checkpoint/ACK, frame de generación nueva, picking, imagen y drain gráfico real con la autoridad aún viva. Se inspeccionan las imágenes.

La pausa conserva ocho versiones de uniformes con escritor vivo y cero bytes nativos distintos; el productor crea cero buffers, texturas, samplers, shaders y pipelines, y dos bind groups de contexto existente. El caso móvil conserva ocho versiones de cuatro bytes distintos y atribuye 101 fábricas a demanda VFX/profundidad y contexto existente, con el clasificador del incremento anterior sin modificar. Los contadores completos siguen en los informes. No son una prueba de minimalidad, autonomía VFX completa o cadencia.

Un tercer ensayo abre la partida desde el menú real, mediante guardado, main y perfil Worker de producto. Completa exactamente un handshake de recursos, dos recuperaciones retenidas con el mismo cliente/canvas/binding y frame vigente, y cierre por el menú con confirmación de disposición gráfica. No hay errores de navegador/HTTP/GPU; se conserva una petición de audio abortada durante el cierre. Es una partida pausada de dos chunks de sabana con cohorte nativa inactiva; no acredita WALK integrado en esa interfaz ni nacimientos ordinarios.

**La aceptación de recursos de esa interfaz sigue abierta.** Su contador del productor sube 1768 → 1945 → 2477 y las compilaciones iniciadas 44 → 45 → 62. No hay forks uniformes ni de bindings en ese ensayo, pero esos incrementos aún no se atribuyen. La primera recuperación coincide con una preparación Group activa; esto no demuestra que todo el crecimiento sea carga normal ni que lo cause la recuperación. El resultado ok del driver es funcional y el recibo marca resourceBudgetAccepted=false. Antes de dar por cerrada la reutilización en main se debe observar la identidad de cada recurso y su dueño/demanda, distinguir nueva admisión de recreación evitable y corregir cualquier recreación de recursos intactos. No se equipara conservar el canvas con conservar todos sus assets.

## Estado

Se completa la conexión de la API de recursos en main, con validación funcional del arranque y del relevo. El siguiente punto es atribuir y resolver el crecimiento de recursos en esa recuperación ordinaria; después siguen la entrada nativa ordinaria/nacimientos y los cohortes aún no admitidos. La recuperación de consumidor/cohort fallido, pérdida de dispositivo, coste de publicación pausada, autonomía VFX, cadencia y plataformas siguen abiertos. A6/A/B/C no se cierran, D no iniciado y f-R3 conserva el cierre de seguridad.

[Recibo, fuentes servidas, logs, imágenes y controles](performance/native-resource-startup-validation-20261119.json).
