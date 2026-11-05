# Plan de cierre estructural y migración de Wild Guardians

Revisión del 5 de noviembre de 2026. Rama de trabajo: `codex/guardian-3d-animation`. Este documento sustituye la secuencia del plan del 4 de noviembre; su versión anterior permanece en Git. Estado: plan de implementación, no arquitectura ya terminada.

La prioridad es implementar una arquitectura común correcta, completar sobre ella los elementos pendientes y después validar la partida completa. Se suspenden las rondas de benchmarks, trazas comparativas y pruebas de incursiones sobre versiones parcialmente migradas. No se acepta como avance arquitectónico otra solución aislada que el juego principal no utilice.

El orden obligatorio es **A: cierre estructural → B: migración completa → C: validación integrada → D: optimización medida**. Durante A y B se mantienen compilación, análisis estático, comprobaciones de contratos y pruebas unitarias de los cambios de estado, propiedad y determinismo que se modifiquen. Esos controles de ingeniería impiden acumular errores; no son otra campaña de rendimiento ni permiten declarar validada la experiencia de juego. La corrección del diseño no sustituye a la validación final.

## 1. Problemas que debe cerrar la arquitectura

La [traza de la incursión y primer Attack](attack-lag-trace-20261105.md) identifica una espera del dibujo WebGL antiguo y compilaciones de pipelines WebGPU al aparecer el guardián. El control sin dibujo antiguo conserva bloqueos de compilación. Los perfiles también muestran preparación recurrente de materiales y reconciliación de estados.

Las causas estructurales que debe resolver el plan son:

- Propiedad del dibujo compartida entre la escena antigua y la presentación WebGPU; omitir un draw no retira sus actualizaciones.
- Confusión entre recurso descargado, modelo construido y recurso listo para presentación. `prepare()` del guardián no acredita disponibilidad de pipelines.
- Incorporación de objetos sin una admisión gráfica común; el primer render puede crear pipelines y subir recursos pendientes.
- Materiales, atributos, samplers y pases sin un contrato global de compatibilidad; la apariencia puede cambiar la estructura del programa.
- Recursos compartidos cuya residencia depende de la última instancia, con riesgo de repetir preparación al reaparecer.
- Sincronizaciones extensas por publicación y dependencia residual de la escena antigua para entrada, cámara, HUD y efectos.
- Trayectorias, animaciones, recuperación y publicación todavía conectadas mediante rutas experimentales que no constituyen el backend normal del producto.

No se atribuyen todos los tirones a estas causas ni se promete eliminar cualquier pausa del controlador. La obligación estructural es retirar los mecanismos que permiten preparación inesperada, autoridades duplicadas y dependencia temporal del render respecto a la simulación.

## 2. Decisiones que quedan fijadas

| Área | Alternativas consideradas | Decisión |
| --- | --- | --- |
| Escena antigua | Optimizarla; omitir únicamente el dibujo; separar sus servicios y retirarla de la ruta WebGPU | Separación y retirada. WebGL queda como backend alternativo exclusivo |
| Compilación | Precargar todas las variantes; descubrirlas al dibujar; preparar bajo demanda antes de publicar | Preparación bajo demanda con control común de admisión |
| Materiales | Material por modelo; un pipeline para cualquier estado; sistema lógico universal con interfaces estables | Sistema universal y catálogo acotado por diferencias estructurales necesarias |
| Preparación | Repartir colas entre subsistemas; mover todo a nuevos Workers; coordinar recursos con los Workers existentes | Propietario gráfico único y preparación auxiliar de datos transferibles |
| Publicaciones | Acelerar snapshots; reducir frecuencia perdiendo intermedios; acumular cambios conservando eventos y barreras | Cambios acumulados y eventos autocontenidos ordenados |
| Residencia | Liberar con cada última instancia; conservar todo; residencia por memoria y reutilización | Catálogo compartido con referencias, prioridades y expulsión explícita |

No se cambia Three.js, Wild Engine ni Rapier por otros motores. No se introduce D* Lite, predicción del modelo B, nuevos sistemas de navegación o nuevas precargas exhaustivas. Se reutilizan los laboratorios como fuente de código, no se amplían como productos paralelos.

## 3. Propiedad final de cada responsabilidad

| Propietario | Responsabilidad exclusiva |
| --- | --- |
| Worker autoritativo y Wild Engine | Tiempo, reglas, intenciones, reservas, movilidad, colisiones, Rapier, daños, economía y resultados confirmados |
| Host Worker existente | Orden de comandos, acumulación y transporte, cursores y recuperación; no ejecuta otra simulación |
| Worker gráfico | Dispositivo WebGPU, escena, cámara visual, selección, recursos GPU, preparación de pipelines, reproducción y efectos |
| GPU | Interpolación visual, skinning precocinado, deformaciones, iluminación y dibujo dentro del horizonte autorizado |
| Preparación auxiliar | Descarga, decodificación, conversiones y generación de datos transferibles cuando proceda |
| Hilo principal | DOM, entrada, HUD, audio que requiera navegador y coordinación ligera |

Cada estado mutable tiene un solo propietario. El hilo principal no conserva una segunda escena del mundo, ni actualiza rigs, física o navegación para alimentar la presentación. Los Workers auxiliares no crean pipelines de otro dispositivo. La simulación no espera a un fotograma ni necesita que el renderer confirme un dibujo para avanzar normalmente.

## A. Implementar y cerrar la arquitectura común

### A1. Contratos y arranque de producto

Definir contratos versionados para sesión, generación de dispositivo, entidad, recurso, trayectoria, publicación y comando. Registrar qué módulo los produce, quién puede modificarlos y qué consumidor los aplica. Los nombres definitivos se adaptan a los módulos existentes; no se crea una infraestructura paralela por conservar nombres propuestos.

Crear una interfaz de presentación que concentre inicio, cámara, resize, selección, feedback provisional, publicación, recuperación y cierre. El backend se elige al iniciar la sesión por capacidad y configuración. WebGPU verifica explícitamente su backend; no se admite un fallback silencioso.

Extraer de `WorldScene` los servicios todavía utilizados por cámara, entrada, selección, HUD y audio. El arranque WebGPU no debe construir el mundo WebGL, obtener plantillas físicas de sus meshes ni llamar a `renderFrameUpdates()`. Las plantillas físicas se cargan en la autoridad desde datos existentes de autoría.

La ruta de producto debe funcionar sin `import.meta.env.DEV` ni parámetros `qa-*`. Los flags se reservan para diagnósticos y reversión temporal, no para habilitar capacidades esenciales. El fallback WebGL se inicializa como alternativa, sin mantener dos mundos vivos. La cobertura de sus contenidos se conserva sin invertir en nuevas optimizaciones WebGL.

**Entrega:** contratos, interfaz única y bootstrap desacoplado. **Cierre interno:** revisión de dependencias y comprobaciones que impiden construir, actualizar o dibujar el mundo antiguo en la ruta WebGPU.

### A2. Comunicación incremental y reloj común

Completar el transporte existente en lugar de añadir otra cola:

1. Acumular últimos valores por entidad y campos modificados entre publicaciones. Conservar altas, bajas y generaciones.
2. Conservar todos los eventos confirmados, su orden y contexto causal. Un consumidor no debe consultar un snapshot posterior para reconstruir qué ocurrió antes.
3. Preservar barreras de física, revisiones de geometría, invalidaciones, discontinuidades y pausas al fusionar varios ticks.
4. Mantener una ventana de envíos acotada; sustituir trabajo pendiente equivalente sin acumular snapshots completos por tick.
5. Entregar al HUD una proyección pequeña y a audio sus eventos. El hilo principal no necesita reconciliar otra copia gráfica completa del mundo.
6. Registrar consumidores y cursores independientes. El ACK confirma recepción o aplicación del protocolo, no finalización de texturas, compilación ni dibujo.
7. Utilizar checkpoints para arranque, guardado, recuperación y resincronización, con un corte atómico de secuencia y replay posterior sin pérdidas ni duplicaciones.

Definir la política de saturación antes de retirar cualquier bloqueo actual: retención acotada, diario de eventos y barreras recuperables, desacoplamiento de un consumidor gráfico averiado y recuperación desde checkpoint. No es posible conservar eventos ilimitados para un consumidor ausente con memoria finita. Si se agota también la retención recuperable, emitir un fallo controlado o una pausa de seguridad explícita; nunca perder eventos silenciosamente ni convertir el ACK gráfico en presupuesto normal de simulación.

Usar tiempo de simulación en trayectorias, animaciones confirmadas, pausas, aceleración y restauración. El reloj de feedback provisional se mantiene identificado y se reconcilia con el confirmado.

**Entrega:** protocolo normal incremental y sincronizadores por cambios. **Cierre interno:** pruebas de orden, acumulación, consumidores lentos, duplicados, restauración y barreras; ausencia de recorrido obligatorio de todos los subsistemas por una modificación local.

### A3. Material lógico universal y catálogo de pipelines

Implementar un contrato común de datos de frame, objeto, material y animación. Reutilizar las fórmulas TSL de AfricanToon, guardián, terreno, vegetación y efectos. Los subsistemas solicitan una receta del catálogo y aportan datos; no construyen arbitrariamente nuevos grafos por modelo o instancia.

Separar dos clases de cambios:

- **Dinámicos:** colores, tintes, día/noche, intensidad de mapas, transición Vertex Colors/textura, tiempo, viento, crecimiento, bendición y disolución. Modifican datos sin alterar el grafo.
- **Estructurales:** estados de mezcla/profundidad/culling, topología, formatos de targets, muestras, layouts de vértices/bindings y deformaciones todavía incompatibles. Tienen claves explícitas en el catálogo.

Un único material lógico no implica un único objeto JavaScript ni un pipeline físico capaz de reproducir cualquier estado fijo. No se obliga al agua, humo y sólidos a compartir reglas que cambien su apariencia. Los buffers de animación, instancias y parámetros usan offsets y contadores estables; la capacidad o identidad de una instancia no debe crear código nuevo sin una razón de compatibilidad registrada.

Los slots de textura existen desde el comienzo. Placeholder y recurso final deben respetar tipo de binding, dimensión, espacio de color, UV y política de muestreo compatibles. Normal plana y mapas neutros se definen por función. Una textura inicial transparente no anula el alfa del modelo presentado con Vertex Colors. No se fuerza un atlas gigantesco ni se incrementa geometría para homogeneizar casos incompatibles.

Color, sombra y profundidad comparten la misma deformación, cobertura y reloj. Los pases auxiliares forman parte de la receta; no se descubren al dibujar por primera vez.

El catálogo distingue claves del motor, shaders generados y descriptores finales. No se falsean las claves internas de Three.js para hacer coincidir objetos incompatibles. Un incremento de variantes requiere una modificación explícita del catálogo y una justificación estructural.

**Entrega:** materiales y adaptadores TSL comunes, descriptores y bindings estables. **Cierre interno:** pruebas de invariantes de parámetros y claves, cobertura de pases y revisión del código de Three.js fijado en dependencias. Todavía no se declara rendimiento ni paridad artística global.

### A4. Admisión gráfica y preparación bajo demanda

Crear un único servicio de preparación en el Worker gráfico, conectado a los cargadores y bancos existentes. Su máquina de estados debe distinguir al menos: solicitado, datos disponibles, preparando, listo, publicado, retirado y fallido/cancelado. Pipelines y recursos mantienen requisitos independientes; una descarga terminada no marca todo como listo.

La clave de preparación incluye receta, layout geométrico, pase/target, revisión del recurso y generación del dispositivo. Solicitudes equivalentes comparten trabajo. Las sustituciones pendientes conservan el material anterior o una representación provisional ya preparada.

Antes de publicar:

1. Resolver geometría, bindings y recursos necesarios para la representación solicitada.
2. Preparar únicamente sus pipelines mediante la ruta asíncrona, en el dispositivo propietario y con el contexto final de renderizado.
3. Cubrir los pases aplicables y las subidas requeridas; distinguir en el estado la solicitud de subida de su disponibilidad para uso.
4. Comprobar cancelación, generación, entidad y versiones después de cada operación asíncrona.
5. Encolar un commit visual pequeño entre dibujos. No mutar la estructura de un material publicado desde una callback de carga.

El renderer consume únicamente recursos admitidos. Un fallo de preparación conserva la representación anterior o provisional y reporta el error; no recae en creación síncrona durante el draw. El tratamiento alcanza sombras, profundidad, destrucción, nuevos LOD, postprocesado y pipelines internos necesarios de Three.js, no solo materiales del pase principal.

Centralizar la adaptación a Three.js en una capa pequeña. Confirmar propagación de rechazos, device loss y disponibilidad de pipelines; cancelar lógicamente solicitudes obsoletas aunque el driver no pueda detener una compilación. No convertir `createRenderPipeline()` en una promesa mediante un parche indiscriminado: los contratos de devolución son distintos.

La fase JavaScript de `compileAsync()` y la preparación de bindings siguen compartiendo el Worker gráfico. Limitar concurrencia y tamaño de los trabajos gráficos, conservar oportunidades de dibujo y enviar procesamiento de datos transferibles a auxiliares. Esto no reintroduce presupuestos de FPS en navegación o simulación.

**Entrega:** admisión obligatoria, estados, cancelación y publicación atómica. **Cierre interno:** ninguna ruta de incorporación visible evita el servicio; casos de rechazo y obsolescencia cubiertos. La ausencia de picos del controlador se comprobará en C, no se presupone por usar promesas.

### A5. Propiedad y residencia de recursos

Unificar los bancos existentes de animales, trabajadores, estructuras y vegetación bajo reglas comunes de identidad, adquisición, residencia y liberación. No duplicar fuentes, geometrías ni bibliotecas cuando ya se comparten.

Separar referencias de instancias de la residencia de recursos reutilizables. La última bestia de una especie puede desaparecer sin destruir inmediatamente todo lo necesario para su regreso. Definir límites de memoria, prioridades, retención de esenciales y expulsión segura; liberar lo que queda sin uso sin invalidar otro consumidor.

Reutilizar Vertex Colors, paquetes progresivos y KTX2/BC7. Seleccionar el formato compatible antes de descargar; evitar recursos alternativos que no se usarán. Las transiciones afectan parámetros y bindings admitidos, sin reconstruir objetos. No añadir una fence global por instancia ni esperar a GPU desde el bucle de render; coordinar la finalización de los lotes de preparación fuera de ese bucle.

**Entrega:** registro de recursos compartidos con métricas de bytes, generaciones y trabajos pendientes. **Cierre interno:** liberación, cancelación, deduplicación y reaparición no dejan propietarios ambiguos ni recursos destruidos aún referenciados.

### A6. Contrato de movilidad y animación autónomas

Completar el contrato genérico que consumirá todo personaje: entidad/generación, versión, tiempo inicial, tramos o poses, duración, horizonte seguro, modo y estado de animación. Separar desplazamiento lógico, pose local y adaptación visual.

Wild Engine conserva intenciones, reservas, vigencia de rutas y seguridad física. El hilo principal no reconstruye navegación. La GPU reproduce intervalos autorizados con buffers persistentes; no necesita actualizaciones individuales de posición por fotograma.

La primera implementación usa intervalos confirmados y coherentes de movimiento, terreno, cuerpos y eventos. No interpreta una ruta prevista como autorización física de todo su futuro. Las interpolaciones deben conservar los tramos ejecutados; dos extremos no prueban que el recorrido intermedio sea seguro. Al agotarse el horizonte, se retiene la última presentación coherente, sin atravesar cuerpos ni avanzar impactos en otra cronología.

Proporcionar una interfaz común de clips precocinados, mezclas, expresiones y LOD. Pausa y aceleración modifican el reloj común. Los casos de física/IK necesarios para la autoridad continúan en CPU. Las excepciones visuales justificadas se ejecutan en el Worker gráfico, con transferencia explícita de propiedad de pose y sin evaluar a la vez otra presentación GPU.

**Entrega:** contratos temporales, buffers y reproductores comunes. **Cierre interno:** versiones, horizontes, invalidaciones y cambios de propietario cubiertos. La migración de todos los clips y personajes corresponde a B.

### A7. Interacción y recuperación sin dependencias antiguas

Conectar cámara y entrada al propietario gráfico sin esperar a un tick de simulación. Solo los estados de cámara reemplazables se fusionan; los comandos discretos conservan orden. La selección identifica entidad, cámara, tiempo presentado y revisiones; la autoridad revalida el objetivo al ejecutar.

Todas las acciones provisionales usan ID y estado de confirmación/rechazo. La presentación no concede recursos ni inventa resultados. Attack conserva gesto encadenable, exclusión de bestias pendientes/derribadas y daño actual. Preparar los recursos físicos de una bestia oportunamente en el Worker autoritativo; no supeditar su carga a la textura ni a la escena gráfica.

Definir explícitamente la política temporal del comando. No reordenar hechos ya confirmados mediante una corrección cosmética. Si una mecánica requiere retroceso causal, necesita checkpoint y replay determinista de todas las dependencias antes de declararse soportada.

Ante pérdida del dispositivo o reinicio gráfico: invalidar su generación, descartar resultados antiguos, reconstruir recursos del catálogo y restaurar desde checkpoint más eventos. Mantener un estado visual seguro y señalizar la recuperación. El fallback no se consigue manteniendo el mundo WebGL vivo detrás del nuevo.

**Entrega:** input, provisionales, lifecycle y recuperación comunes. **Cierre interno:** errores y reinicios no crean una segunda autoridad, duplican efectos ni reutilizan recursos de un dispositivo perdido.

### Cierre del bloque A

No se abre B porque los contratos estén escritos. Deben estar implementados y conectados al bootstrap y a los puntos comunes de carga/publicación del juego. La revisión debe comprobar:

- Un propietario por responsabilidad y backend del mundo exclusivo.
- Ninguna dependencia esencial de WorldScene ni de flags de laboratorio en la ruta nueva.
- Materiales, preparación, recursos, transporte y tiempo bajo interfaces comunes.
- Admisión gráfica sin rutas alternativas de primera compilación durante el draw.
- Tratamiento explícito de pendientes, errores, saturación, cancelaciones y recuperación.
- Implementación compilable y controles internos aprobados; excepciones pendientes de contenido enumeradas para B.

Esto acredita cierre de diseño e implementación del núcleo. La calificación de producto jugable, paridad y fluidez se reserva a C.

## B. Terminar la migración sobre los contratos cerrados

No se añaden sistemas alternativos por subsistema. Cada elemento debe suministrar su receta, recursos, eventos, temporalidad y política de recuperación a las interfaces de A.

| Orden | Elementos que deben quedar integrados | Condición de cierre de contenido |
| --- | --- | --- |
| B1 Mundo | Terreno de todos los biomas, agua, iluminación, sombras y postprocesado | Fórmulas artísticas trasladadas; ninguna superficie provisional pendiente; manglares con islotes de Wild Engine |
| B2 Vegetación | Árboles, hierba, viento, impostores, LOD, texturas cercanas y streaming | Admisión común en cada nivel, geometría compartida y actualizaciones parciales; sin ruta de aparición que eluda la preparación |
| B3 Economía y construcciones | Cultivos, trabajadores, cajas, poblados, centros y murallas | Previews por ID, cultura de partida, Vertex Colors/texturas completas, crecimiento y trabajo conectados |
| B4 Personajes | Cinco bestias y cuatro trabajadores, locomoción y acciones | Trayectorias y bibliotecas GPU compartidas; sombras/deformación coherentes; apoyo aproximado suficiente y excepciones explícitas |
| B5 Guardián y combate | Guardián 3D, rostro, parpadeo, visemas, Attack, Grow, Multiply y despertares | Todos los materiales y efectos bajo admisión común; provisionales reconciliados; daño, resistencia y recuperación autoritativos |
| B6 Efectos | Bendiciones, Shield, destrucción de centros/muros, partículas, humo, escombros y ambiente | Pases y recursos registrados, eventos ordenados y cancelación/recuperación implementadas |
| B7 Flujo completo | Tutorial, carga/transición al cielo, cinemáticas/lápiz, pausas, velocidades, guardado/restauración y reanudación | Ningún módulo necesita el renderer antiguo para funcionar en WebGPU; controles de carga retirados en la transición prevista |

Completar en B la autoridad central de movilidad del modelo A y retirar decisiones duplicadas de los personajes según se conecten sus intenciones. Extender la infraestructura existente de AttackCrop a trabajo, retorno y huida, manteniendo las reglas. No introducir algoritmos nuevos como requisito de migración.

La lista de animación incluye marcha, carrera, reposo, trabajo, ataques, impactos, caídas y recuperación. Mantener física autoritativa y fallbacks visuales limitados que sean necesarios. Cada excepción debe identificar motivo, propietario, activación y salida; una especie completa sin migrar no se oculta como excepción.

**Cierre de B:** inventario completo de elementos y pases, arranque de producto independiente, cero funcionalidades esenciales habilitadas solo con QA y cero rutas de contenido por fuera del núcleo común. Se completan controles de construcción, imports, contratos y referencias a recursos. La paridad perceptiva y funcional queda pendiente de C; no se declara comprobada por inspección.

## C. Validar el sistema integrado

Solo tras cerrar A y B se inicia la batería de partidas, campañas, capturas, vídeos, trazas y comparativas. Se reutilizan los harnesses existentes y una configuración reproducible, sin crear otra colección de laboratorios.

### C1. Funcionalidad y determinismo

Arranque, tutorial, cámara/selección, construcción, agricultura, reservas, intenciones, incursiones, Attack encadenado y rechazo sobre bestias derribadas, pausas, velocidad, guardado/restauración y reanudación. Comparar comandos y resultados autoritativos; ejecutar las campañas deterministas y el alcance de 100 noches con Wild Engine real. Incluir multitudes, obstáculos cambiantes, pasos estrechos y tamaños distintos.

### C2. Paridad visual y recursos

Todos los biomas, distancias y día/noche; primera aparición y reaparición de modelos; transición Vertex Colors/textura y KTX2/fallback; sombras y profundidad; movimientos, caras, ataques, recuperaciones, destrucción y cámara/zoom. Comprobar calidad perceptiva suficiente sin exigir precisión geométrica milimétrica. No aceptar impostores próximos incorrectos, pérdidas de detalle, penetraciones importantes, saltos o efectos duplicados.

### C3. Desacoplamiento y fallos

Inyectar retrasos de 30/50/100 ms en la autoridad, lentitud y fallo de cargas, rechazo de pipelines, publicación atrasada, cancelación, device loss y reinicio. Verificar que el render no espera síncronamente a la autoridad, respeta su horizonte y recupera una secuencia coherente. Medir latencia de respuesta por separado del intervalo entre fotogramas.

### C4. Rendimiento y cumplimiento estructural

Verificar backend WebGPU real. Registrar CPU principal, autoridad, Worker gráfico, compilador/proceso gráfico y consultas GPU donde estén disponibles, sin confundir sus tiempos. Medir carga, latencia, media, p95/p99, máximos, memoria, transferencias, colas, draw calls, shaders y pipelines. Repetir con condiciones y cachés identificadas; no declarar mejoras a partir de una sola pareja.

La instrumentación debe identificar descriptor, origen y pase de cada pipeline nuevo. Una modificación de parámetros o textura compatible no crea nuevas variantes. La cantidad de instancias no aumenta pipelines por su identidad. Primera aparición, LOD, sombra y destrucción no eluden la admisión. Comprobar el primer uso real incluso si la promesa de preparación terminó.

Un fallo funcional o de paridad vuelve a su bloque responsable. Una infracción de propiedad, preparación o temporalidad vuelve a A; no se tapa mediante precargas o cambios de mecánicas. Un pico residual sin infracción se registra para D.

## D. Optimizar únicamente los costes que permanezcan

Tras la validación integrada, ordenar cuellos de botella por coste total y relevancia perceptiva. Para cada cuello importante comparar al menos tres alternativas y priorizar eliminar, simplificar, reutilizar, reorganizar y finalmente acelerar.

Conservar mejoras reproducibles sin alterar las reglas ni degradar perceptiblemente la presentación. Los costes de CPU, GPU, transferencias, memoria y latencia se evalúan conjuntamente. No prometer cero tirones porque una API sea asíncrona.

## 4. Ejecución y seguimiento

Trabajar en la misma rama, sin tocar `main`, con commits pequeños y push de los avances. Mantener una sola línea compilable. Usar los adaptadores existentes para reversión por sesión; nunca dos autoridades o dos dibujos del mundo simultáneos. No retirar la referencia antigua de forma irreversible antes de la validación integrada.

Dependencias de ejecución: A1 precede al resto; A2 y A3 pueden avanzar de forma independiente; A4 y A5 se cierran juntos sobre A3; A6 usa A2/A3; A7 integra A1/A2/A4/A6. B comienza tras la revisión completa de A. Los frentes de B pueden distribuirse una vez estables esas interfaces. C comienza tras cerrar todo B.

Puntos de integración que se deben modificar o reutilizar, sin crear otro camino de juego:

| Entrega | Módulos de partida |
| --- | --- |
| A1 | `src/app/main.js`, `src/app/webgpu-legacy-draw.js`, `src/rendering/scene.js`, `webgpu-world-client.js` y `webgpu-world-worker.js` |
| A2 | `src/simulation/worker-runtime-host.js`, `host-publication-queue.js`, `confirmed-state-receiver.js` y `src/rendering/confirmed-presentation-stream.js` |
| A3 | `src/rendering/webgpu-stable-character-material.js`, `webgpu-guardian-material.js`, `webgpu-beast-toon.js` y recetas TSL de mundo/VFX |
| A4 | `src/rendering/webgpu-world-surface.js`, los puntos de incorporación de rosters/settlements/biome-props y la preparación bajo demanda de `src/labs/webgpu-on-demand.js` |
| A5 | `src/rendering/webgpu-progressive-character.js`, `webgpu-animal-bank.js`, `webgpu-worker-bank.js`, `webgpu-settlements.js` y `webgpu-biome-props.js` |
| A6 | Reproductores `src/rendering/webgpu-baked-walk.js`, `webgpu-actor-motion-binding.js`, flujo de movimiento confirmado y componentes nativos de intenciones/movilidad existentes |
| A7 | Cliente/Worker gráfico, comandos del runtime autoritativo, `src/rendering/webgpu-guardian-attack.js` y sistemas existentes de previews, checkpoints y recuperación |

Cada entrega actualiza el registro siguiente con archivos, commit y comprobaciones realizadas. Las actualizaciones de progreso responden qué contrato quedó implementado, qué dependencia antigua persiste y cuál es el siguiente bloqueo imprescindible. No se sustituyen entregas por nuevas mediciones intermedias.

| Entrega | Estado inicial | Evidencia necesaria para cerrar |
| --- | --- | --- |
| A1 Propiedad y bootstrap | Pendiente de cierre | Contratos, dependencias y selección exclusiva |
| A2 Transporte y tiempo | Pendiente de cierre | Acumulación, eventos, recuperación y consumidores |
| A3 Materiales y pipelines | Pendiente de cierre | Interfaces, catálogo y pases |
| A4 Admisión gráfica | Pendiente de cierre | Estados, publicación, errores y cancelación |
| A5 Recursos | Pendiente de cierre | Identidad, residencia, memoria y liberación |
| A6 Movilidad y reproducción | Pendiente de cierre | Horizonte, versiones, buffers y propiedad de pose |
| A7 Interacción y recuperación | Pendiente de cierre | Provisionales, orden temporal y reinicios |
| B Migración completa | Pendiente tras A | Inventario B1–B7 sin elementos esenciales omitidos |
| C Validación integrada | No iniciar antes de B | Resultados funcionales, visuales y mediciones |
| D Optimización | No iniciar antes de C | Mejora reproducible del conjunto |

El estado «pendiente de cierre» no descarta las implementaciones existentes: exige conectarlas y retirar los caminos que contradicen sus contratos. El primer trabajo es A1, no otra traza del guardián. El siguiente hito que habilita pruebas extensas será el cierre de B.

Avance parcial A1: la ruta experimental `qa-webgpu-world` omite por defecto el segundo dibujo cuando el Worker WebGPU está activo. `qa-webgpu-allow-legacy-draw` conserva la comparación explícita. Las comprobaciones unitarias cubren selección y fallback. Siguen activos `WorldScene.renderFrameUpdates()`, el arranque de QA y la recuperación mediante escena antigua; A1 no está cerrado ni se ha validado la fluidez.

El cliente distingue la inicialización del backend del primer dibujo solicitado por el Worker: la retirada del dibujo anterior espera a la señal `firstFrame`. Esa señal no acredita presentación física en pantalla ni contenido completo, pero evita tratar un renderer recién inicializado como si ya hubiera dibujado.

La ruta de arranque temprano dispone de un controlador independiente para tamaño de viewport, cámara sobre terreno, foco y gestos de muralla. Esa ruta todavía hereda otros servicios de `WorldScene`; falta conectar el controlador al arranque normal y retirar las etapas heredadas del fotograma.

El receptor confirmado, el enfoque de granja y tutorial y el servicio sin mallas de props también están separados del renderer antiguo para esa ruta. El controlador aún hereda `WorldScene` para otros servicios de interacción y continúa limitado a QA: esta extracción no completa A1 ni elimina el renderer antiguo del arranque normal.

El mantenimiento de audio de música, ambiente, trabajadores, bestias y desplazamiento se comparte entre el arranque tradicional y la ruta temprana con Worker, usando el estado y los eventos confirmados. Esa ruta conecta también el menú de pausa y el bloqueo de suspensión de pantalla. La clasificación del sonido de pisadas por geometría de barro todavía depende de la escena antigua y no está disponible en el arranque temprano; la paridad sonora y las opciones gráficas completas siguen pendientes de validación e integración.

La ruta temprana experimental prepara y muestra la previsualización de nuevos poblados en el Worker gráfico, reutilizando la misma geometría y colocación que el poblado confirmado. El Worker de simulación sigue validando y ejecutando la fundación; tras su confirmación, la vista provisional se conserva hasta que el layout completo confirmado haya sido admitido. Cambiar la posición cancela la preparación anterior. Las pruebas son de contratos con admisión simulada: la interacción completa, el guardado y la paridad visual en partida todavía requieren la validación integrada, y el arranque normal sigue sin usar esta ruta.

La herramienta de poblado también se enruta al selector de terreno confirmado del Worker gráfico; antes se preparaba la vista pero el clic de colocación no llegaba al controlador. La prueba del adaptador comprueba el envío y la entrega de las coordenadas; la fundación completa sigue sin validarse en navegador.

Avance parcial A2: el diario de recuperación agrupa acuses consecutivos de vistas de fondo idénticas y conserva los rangos de secuencia. Tanto el diario como la cola activa conservan las confirmaciones de entrada, rechazos y campos nuevos como barreras, además de eventos y entradas selladas. Las comprobaciones de contrato cubren acumulación y replay. La política conservadora puede reducir la compactación de tipos de publicación aún no registrados. El diario y la recuperación siguen siendo experimentales; la autoridad aún se detiene ante saturación y no se ha demostrado el desacoplamiento completo.

La fusión de una vista con el estado previo también comprueba la publicación entrante: una revisión de terreno, confirmación de entrada, rechazo o campo desconocido impide la fusión. Sin esta comprobación la barrera podía perderse aunque la publicación previa fuese compactable.

La ruta QA que activa conjuntamente recuperación visual concurrente, checkpoint de efectos y recuperación automática puede separar un consumidor gráfico atrasado al llegar a 64 publicaciones pendientes, siempre que exista un checkpoint confirmado y el diario sea completo y no esté saturado. Se notifica la separación, se conserva el diario y se inicia la recuperación sin volver a marcar el canal perdido. Si falta esa garantía, o se alcanza el límite del diario durante la recuperación, se mantiene la barrera de seguridad. Los contratos están cubiertos por pruebas unitarias; esta ruta no está habilitada en producto ni validada de extremo a extremo en navegador.

El cliente, la superficie y el stream del Worker gráfico permiten ahora solicitar explícitamente replay y checkpoints de efectos sin depender de `DEV`; permanecen desactivados por defecto y el handoff solo puede enviarse una vez por sesión de recuperación. Falta activar y conectar el ciclo de producto completo desde el host y validar su recuperación integrada.

El host autoritativo también acepta ahora una configuración explícita de recuperación y expone las operaciones de pérdida, preparación, conexión y cancelación sin depender de las interfaces de QA. Exige canales independientes para terreno y presentación y conserva la barrera ante saturación. Sigue sin estar conectado al arranque normal, por lo que no se activa en producto.

El Worker autoritativo acepta una capacidad explícita `guardianPlacement` independiente de `DEV` para calcular el origen confirmado de Attack a partir del contexto de presentación versionado. Los metadatos de autoría se cargan de forma asíncrona y, si llega antes un ataque que los necesita, la espera se produce dentro del Worker y conserva el orden del comando; si no están disponibles, la acción se rechaza. Se mantienen las comprobaciones de época y secuencia y la consulta separada `qaGuardianOrigin` sigue siendo diagnóstica. La ruta de juego normal todavía no habilita la capacidad ni envía este contexto: faltan el enlace del Worker gráfico y la validación integrada de la interacción.

El canal de entrada presentación→host puede habilitarse mediante `presentationInputs` sin `DEV`. Conserva sus IDs ordenados y resuelve cada solicitud únicamente al aplicar la publicación confirmada; fuera de QA el host restringe el canal a Attack con contexto del guardián. La ruta experimental de entrada causal utiliza ese mismo canal general. Aún falta activar conjuntamente las capacidades en el arranque normal; no se considera completada la integración de Attack.

El Worker gráfico puede producir ese contexto fuera de QA cuando `presentationInputs` está habilitado. El selector comprueba la secuencia, las revisiones de terreno y entidades y la versión de cámara del último fotograma dibujado; si el contexto está incompleto o la cámara ha cambiado, rechaza la selección. La ruta experimental de Attack solicita ya este contrato. El fotograma dibujado no acredita su presentación por el compositor, y la frecuencia de rechazos durante movimiento de cámara aún debe evaluarse en la validación integrada. El arranque normal sigue sin habilitar estas capacidades.

En el arranque temprano experimental, cuando la autoridad y el canal gráfico habilitan conjuntamente el contrato, el menú de magia queda conectado: Attack envía el contexto validado por el canal ordenado y las magias agrícolas pueden iniciar una presentación provisional sin esperar a la respuesta. El guardián se prepara al solicitar el menú; las decisiones, daños y beneficios siguen siendo autoritativos. Se ha conectado también la selección gráfica de Escudo y la expiración de herramientas. No se ha ejecutado una partida integrada: faltan confirmar continuidad visual, tiempos de respuesta y comportamiento de todas las magias antes de habilitar la ruta en el arranque normal.

Cuando se habilita el diario de terreno, el cliente de la autoridad permite sustituir el canal de terreno fuera de `DEV`; espera a que la autoridad esté libre y no despacha nuevos comandos hasta confirmar el cambio. La preparación anticipada registra el diario antes de arrancar la autoridad y comprueba que la configuración de recuperación sea idéntica al conectar la presentación. Las pruebas del cliente y del host utilizan Workers simulados: aún faltan la conexión al arranque normal y la validación de recuperación real.

La integración experimental de recuperación del juego utiliza ya las operaciones generales del host y del Worker gráfico, y transmite la misma configuración al preparar la autoridad anticipadamente. Sigue limitada a opciones de QA, sin validación de partida ni activación normal; las pruebas de contrato no demuestran la recuperación integral ni sus tiempos.

El arranque y el Worker de reemplazo calculan sus opciones gráficas mediante el mismo perfil: se conservan también los modos de mundo y bioma temprano que antes se omitían al recuperar. La selección del actor se consulta de nuevo al crear el reemplazo. La equivalencia real de la escena recuperada sigue pendiente de la validación integrada.

Avance parcial A4: el modelo del guardián solicita `compileAsync` antes de hacerse visible mediante un primer servicio compartible de admisión. Se controlan visibilidad, errores y cierre en pruebas unitarias. Los VFX, sombras y demás subsistemas todavía no usan esta admisión; faltan claves estructurales, residencia y tratamiento integral de pérdida del dispositivo. La compilación y el primer uso reales aún no se han validado, por lo que no se considera terminado A4 ni demostrado que desaparezca el bloqueo.

Los centros de trabajo intactos solicitan también la admisión del modelo provisional antes de publicar el banco compartido; el cierre de la escena cancela la espera. La destrucción mantiene su instancia de efectos y prepara las mallas reales de cuerpo o ceniza antes de hacer visible una fase nueva; mientras tanto conserva la fase anterior. Una cancelación no sustituye el estado visual. La preparación cubre el pase principal: las sombras, la disponibilidad real de los efectos con cero instancias y las previsualizaciones aún necesitan sus propios contratos. Las pruebas usan un compilador simulado; no se ha demostrado que el primer dibujo real reutilice todos los pipelines ni que desaparezca un tirón.

Mientras una fase de destrucción confirmada está pendiente, el índice de cámara se marca incompleto también si continúa visible el centro intacto. Una prueba adicional utiliza la instancia real de destrucción para comprobar que cuerpo, ceniza y objetos de efectos se conservan al cambiar de fase, con admisión simulada.

Una prueba del consumidor de poblados, con carga de modelo y admisión simuladas, comprueba que el centro se publica tras la confirmación y que la cancelación o el fallo no lo hacen visible. `NativeWall.update()` reconstruye geometrías y materiales cuando cambia la fase de daño. El Worker gráfico prepara ahora la fase real entrante y mantiene la anterior hasta su admisión; cancela fases obsoletas y conserva la anterior si falla la preparación. Se cubren la selección de topología con geometría nativa y el ciclo asíncrono mediante un compilador simulado. El primer uso real, los pases de sombra y la equivalencia visual durante ataques y reparaciones siguen pendientes de validación integrada.

Los cambios de trazado y terreno de los poblados construyen el grupo correspondiente a los datos confirmados y esperan su admisión antes de sustituir la representación anterior. Una revisión obsoleta se cancela y el índice de cámara marca incompleta la información mientras esa representación no coincide con la última revisión. Las pruebas del ciclo usan un compilador simulado; la incorporación real de los materiales, sombras y buffers todavía debe validarse en la batería integrada.

Murallas y poblados utilizan ahora el mismo coordinador de sustitución y cancelación; cada consumidor conserva la propiedad y liberación de sus recursos. El índice de cámara también considera incompleta una muralla cuya nueva fase está pendiente de admisión. Esta consolidación no elimina la necesidad de preparar los pases auxiliares ni valida la imagen final.

Los lotes de vegetación de cada chunk también pasan por la admisión del pase principal antes de reemplazar los lotes visibles. Al llegar otra revisión se cancela la pendiente; si entra un slot adicional durante una preparación, la siguiente incluye todos los slots necesarios. Las envolventes para cámara se publican con la revisión visual que se incorpora. Esto no prepara el pase de sombra ni prueba la fluidez o la ausencia de compilaciones y subidas en el primer dibujo real.

Los lotes confirmados de cultivos esperan la admisión de las etapas y puentes realmente solicitados antes de reemplazar los lotes visibles; si una etapa deja de ser necesaria se cancela su preparación. Se conserva una excepción temporal para plantar directamente: el lote provisional se publica de inmediato por la ruta anterior para no demorar el feedback, por lo que todavía puede crear trabajo gráfico en el primer dibujo. Hay que sustituir esa excepción por una representación provisional ya admitida antes de cerrar A4. Las pruebas usan carga y compilación simuladas; sombras, transiciones y rendimiento en partida siguen pendientes.

Mientras esperan las etapas entrantes, los lotes anteriores conservan solamente las plantas cuya identidad sigue presente y viva en la vista confirmada o provisional. Una cosecha, destrucción o rechazo deja así de mostrar la planta sin esperar a la admisión de otros lotes. La prueba de contrato cubre la retirada durante una preparación pendiente; no acredita la reproducción visual real ni cierra A4.

En la ruta experimental, elegir una semilla solicita sin espera la preparación de su etapa inicial real; un cambio de selección cancela la solicitud obsoleta. Si termina antes del clic de plantar, la presentación reutiliza ese lote; si no, se conserva la excepción inmediata anterior. El GLB de cultivos contiene 40 primitivas con el mismo formato de posición, normal, UV e índices y dos materiales de atlas, pero ese inventario no prueba por sí solo que WebGPU reutilice el pipeline ni evita las subidas de geometría y textura.

Las etapas ordinarias de cultivo comparten el mismo grafo de posición y normal y reutilizan el material cuando comparten el material de origen. La altura, antes incrustada en el grafo por etapa, viaja en un atributo por instancia; no se añaden vértices. Los puentes de crecimiento comparten otra receta común y reciben las alturas y radios de sus extremos por instancia. Esto prepara la convergencia de materiales, pero no demuestra identidad de pipeline ni elimina todavía la excepción provisional.

Avance parcial A3: las texturas progresivas de personajes comprueban que las propiedades del binding y del sampler final coinciden con el provisional antes de aplicar el cambio. Una incompatibilidad mantiene el aspecto provisional y se comunica como error de textura. Los rosters de animales, trabajadores y cajas sueltas solicitan admisión antes de publicar cada raíz y cancelan la preparación cuando desaparece la entidad. Falta verificar las variantes de recursos reales y cubrir sombras, cambios de animación y otros objetos; no se considera demostrada la carga final de todos los personajes.

Los materiales progresivos reutilizan texturas neutras compatibles por renderer mediante referencias compartidas. La última referencia las libera; un error de preparación no invalida los recursos de otros propietarios. Esto no equivale todavía al material lógico universal ni demuestra la estabilidad de todos los pipelines.

Los bancos progresivos de trabajadores, centros y bestias pueden reutilizar un material entre primitivas que tengan el mismo material de origen y el mismo tratamiento de normales y tangentes. En las bestias se separan explícitamente las variantes con y sin atributo de pelaje y se prepara ese atributo por malla. La transición de texturas se aplica una vez al material compartido. Esto no implica que primitivas de geometría distinta compartan necesariamente el mismo pipeline WebGPU; la paridad visual y el número real de pipelines siguen pendientes de validación integrada.

Avance parcial A5: la superficie gráfica es propietaria del banco compartido de trabajadores y cajas; los rosters liberan sus referencias antes de que se cierre el banco. El paquete de producción compila e incluye el código de espera de pipelines compartidos. Falta el catálogo de residencia y la validación de recuperación de recursos en juego.

Los bancos de animales y trabajadores comparten retención LRU para fuentes inactivas ya texturizadas, con un presupuesto conjunto estimado de 96 MiB y propietarios independientes. La inspección del Worker expone el consumo agregado. Si la carga aún no terminó o no se puede estimar algún recurso, se libera al quedar sin referencias. El presupuesto estima buffers, imágenes y clips inactivos: no incluye los recursos activos, no mide la memoria real del driver ni todos los gastos de Three.js. Falta integrar el resto de recursos y validar memoria y reapariciones en la batería final.

La admisión iguala el target intermedio del renderer, restaura sus estados antes de esperar y cancela las solicitudes pendientes al cerrarse o perderse el dispositivo. Un parche acotado y reproducible en `postinstall` corrige la propagación de rechazos y conserva la espera de compilaciones compartidas en Three.js 0.180.0; verifica versión y código antes de modificar los módulos distribuidos. Hay que conservarlo al reinstalar y revisarlo al actualizar Three.js; instalaciones con scripts deshabilitados requieren ejecutar explícitamente `node tools/patch-three-webgpu-pipeline.mjs`. Las pruebas unitarias cubren éxito, rechazo y reutilización de un pipeline aún pendiente. Ante un rechazo, la admisión retira el renderer completo para no reutilizar la caché posiblemente inválida; la reconstrucción autónoma del Worker y la verificación en navegador siguen pendientes.

La cola de admisión retira inmediatamente las solicitudes canceladas antes de su turno y rechaza todas las pendientes al cerrarse, incluso si una compilación previa no termina. La compilación activa cancelada todavía puede terminar dentro del controlador; si falla después, se retira el renderer para no reutilizar una caché inválida. Las pruebas cubren estas condiciones con un renderer simulado, no el comportamiento del controlador WebGPU real.

Durante la preparación se suspenden temporalmente las actualizaciones automáticas de los mapas de sombra, que Three.js puede ejecutar desde `compileAsync`, y se restauran sus marcas antes del siguiente fotograma. Esto evita solicitar ese dibujo implícito durante la preparación; no prepara por sí solo el pipeline del pase de sombras, que sigue pendiente.

En Three.js r180 el pase de sombra usa `getShadowMaterial(light)`, la cámara y el render target de la sombra y una función específica de renderizado. Además, `compileAsync` sobre un grupo utiliza una escena interna para procesar el material, aunque reciba la escena real como contexto. La preparación de color existente no cumple por sí sola ese contrato: cualquier adaptación debe conservar esos objetos y estados reales, incluida la deformación y cobertura de cada material, antes de declarar admitido el pase de sombra.

La superficie registra explícitamente su luz de sombra en el servicio de admisión. El contrato permite altas y bajas con referencias compartidas, evitando recorrer toda la escena al preparar cada entidad. Cualquier futura luz que proyecte sombras debe registrarse al incorporarse a la escena.

La admisión del pase principal invalida ahora su resultado si el conjunto registrado de luces cambia mientras el controlador compila y vuelve a preparar el objeto para la revisión vigente. Añadir o retirar una referencia adicional a la misma luz no provoca una recompilación. Las pruebas usan un renderer simulado; esta garantía no prepara el pase de sombra ni sustituye el registro explícito de cambios estructurales de iluminación.

Se ha añadido una ruta optativa de admisión que espera también el pase de sombra de luces direccionales. El parche reproducible de Three r180 permite compilar usando la escena, cámara, destino, material y callback de sombra reales sin emitir un dibujo; restaura los estados del renderer antes de esperar. Esta compilación exige que `light.shadow.map` ya exista; aún no se ha demostrado que el primer dibujo reutilice el pipeline. Las pruebas de contrato verifican estados y cancelación con renderizadores simulados, no la ejecución WebGPU real; no se considera cerrado A4.

La superficie WebGPU experimental activa ahora esa ruta cuando activa sus sombras. Si el mapa todavía no existe, la admisión espera a que el renderizado ordinario del mundo lo cree y se despierta al terminar ese fotograma; no crea un segundo mapa ni realiza dibujos auxiliares. La espera admite cancelación, pérdida del dispositivo y retirada de la luz. La inicialización depende de que llegue a dibujarse una superficie receptora de sombra: mientras no exista, la publicación de objetos que proyectan sombras queda pendiente. Esto sigue sin verificar en navegador, en especial el primer uso real y el avance de la carga cuando no haya terreno disponible; no acredita todavía la eliminación de bloqueos.
