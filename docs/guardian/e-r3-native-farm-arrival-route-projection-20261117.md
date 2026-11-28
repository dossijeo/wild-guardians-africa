# Proyección semántica de la ruta nativa de llegada

Continúa la [referencia tipada del corredor23](e-r3-native-farm-arrival-route-data-20261117.md) según el [plan principal](integrated-gpu-migration-plan-20261104.md). Game puede proyectar explícitamente la pose de la ejecución nativa real y restaurar sus valores semánticos en una autoridad nueva. La clase sigue cerrada al tick y productor ordinarios hasta preparar sus relevos; A6/A/B/C permanecen abiertos y D no se inicia.

## Código consultado y decisión

Antes de implementar se consulta [`Graphics.updatePositions`, testbed de Rapier.js, commit fac979eec2a0cd83878e29ca3cb8a5a1fb35fedc](https://github.com/dimforge/rapier.js/blob/fac979eec2a0cd83878e29ca3cb8a5a1fb35fedc/testbed3d/src/Graphics.ts#L328). Obtiene `translation()` y `rotation()` del collider y copia la transformación al mesh o instancia existente. Se adapta la dirección de propiedad: la proyección lee la caché del propietario físico y actualiza el trabajador existente; no integra otra posición ni solicita otra ruta. No se adopta el barrido global de colliders del testbed. La consulta por actor usa los getters acotados ya implementados, sin registro, caché, dependencia o reconstrucción de geometría nuevos. El hash del código consultado queda en la evidencia.

## Implementación y límites

La proyección contrasta la asociación23, actor, cuerpo, centro, perfil, objetivo semántico, extremo elegido, handle/generación y secuencia de asignación con la frontera realmente ejecutada. Al adoptar por primera vez exige la pose/fases originales exactas; después exige el estado semántico activo. Copia posición, orientación, fases, presupuesto, carrera y espera de la caché nativa. Conserva `status:'arriving'`, sin Task, caja, ruta JS, destino o Idle ficticios. Una llegada de distancia cero conserva la pose double y sus acumuladores. No adelanta tiempo, mueve cuerpos, cambia la economía ni consume RNG.

El adaptador de planificación actualiza su mapa existente de posiciones proyectadas. La notificación ordinaria conserva `native-farm-arrival` en su lista de marcadores sin Task; no cambia prioridades ni elegibilidad. Sin ejecución se devuelve únicamente la petición vinculada o declaración fría actual, con autonomía en falso. Perder el cuerpo no convierte una lectura nula en llegada semántica ni concede otra intención.

El snapshot programático valida el estado activo y guarda sólo los valores semánticos. Una restauración exige un mundo físico nuevo **antes de mutar el estado** y normaliza el marcador a llegada pendiente. Conserva pose, orientación, fases y presupuesto; reinicia sólo los indicadores de ejecución/espera y crea una declaración nueva. El cuerpo se vincula después. No serializa ni restaura permisos, tickets, asociaciones o handles antiguos. La disponibilidad de guardado de interfaz sigue cerrada y la autoridad ordinaria informa `unsupported-cohort`.

Game asigna tareas reales a los trabajadores `arriving` antes de moverlos hacia la granja, también si un cultivo madura dentro del intervalo. Una ruta23 activa aún necesita un relevo preparado hacia Task/Home/Idle; el commit Task inmediato continúa rechazado. Se mantiene esa mecánica y se conserva el rechazo del cohort **antes de adelantar tiempo o cualquier cuerpo**, incluso con una tarea recién encolada. La nueva función es una proyección explícita de fuente; no es la activación integral de Game ni un recibo GPU.

## Validación y continuación

Los resultados exactos, hashes de inputs y logs figuran en la [evidencia de validación](performance/native-farm-arrival-route-projection-validation-20261117.json). Las 18 pruebas nuevas cubren cuatro perfiles caminando/corriendo, compañero Task, llegada cero, lectura pendiente fría/vinculada, semántica/fuente/frontera ajenas, atomicidad del rechazo de tick con tarea encolada, guardado/restauración en movimiento y al llegar, rechazo de reinicio del mundo vivo, cuerpo perdido, contrato vencido y pthread → autoridad standalone nueva. Su preparación usa commits de ABI de confianza explícita, sin fabricar recibos gráficos.

Un loader ESM de sólo lectura retira el marcador de la lista de conservación. La prueba detecta `undefined` en vez de `native-farm-arrival`, sin modificar el árbol ni los WASM. Las pruebas filtradas de ese control negativo no cuentan como fallos de la regresión final.

La revisión reproduce también un objeto manipulado cuyo actor de cabecera no coincide con la asociación/handle internamente coherentes. La prueba fallaba por ausencia de rechazo; la igualdad explícita de actor cierra el caso antes de mutar Game. La ejecución focalizada y la regresión finales incluyen esa corrección; la regresión interrumpida anterior no se presenta como validación final.

No cambian los 64 inputs/artefactos nativos ni roster, Surface, puertos, Host o programas GPU. Se valida la regresión compartida y el build; no se recompila C++ ni se repite hardware por esta proyección semántica. Los 569 IDs conservados, 30 recursos tardíos y máximo global de 66,72 ms de la vertical histórica anterior siguen siendo evidencia limitada, no aceptación GPU de Farm23. La recuperación incremental integral de los 3.123 recursos y la ausencia de tirones siguen pendientes.

Se continúa con el relevo/recibo preparado y su control directo, puertos y consumidor originales. Después deben completarse parada durante movimiento, finales hacia Idle/Task/Home, alternativas de entrada de todo el cohort, contratos/puertas/raid y productor ordinario, sin excluir llegadas del planificador para ocultar esas dependencias. El cierre exige la aceptación integrada A/A6, B1–B7 y C.
