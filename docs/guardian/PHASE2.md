# Guardián: invocación y combate (fase 2)

Actualizado el 27 de octubre de 2026. Rama `codex/guardian-3d-animation`; PR #217. No se ha hecho merge. La fase está implementada y disponible para revisión visual; la aceptación de rendimiento sostenido sigue pendiente.

## Estado de esta documentación

Los datos de geometría y los primeros valores de viento de este documento describen la revisión del 27 de octubre. Para la implementación y las comprobaciones posteriores, consultar [CURRENT-STATUS.md](CURRENT-STATUS.md), especialmente el apartado de revisión de entrega al commit de1693154. No interpretar las medidas históricas como una validación de la versión actual.

## Comportamiento

Grow, Multiply, Shield y Attack reutilizan **una sola instancia** del Guardián. La simulación aplica los resultados del comando inmediatamente. La presentación mantiene una cola durante el lanzamiento y el impacto de Attack para que la descarga siempre salga del único cuerpo visible; los siguientes efectos se muestran secuencialmente. Esa cola visual no aplaza el daño ni los resultados de las magias. Los objetivos eliminados se descartan y las interrupciones limpian los efectos. El personaje aparece en el mundo durante 2,2 s; la entrada dura 0,12 s y la salida 0,7 s. No navega hasta el objetivo ni modifica la cámara.

Si coincide con el tutorial, se oculta únicamente su avatar de diálogo: se conservan texto, controles y voz. El cuerpo del mundo puede muestrear esa misma voz y secuencia facial. Al terminar la invocación vuelve el avatar del tutorial, sin reiniciar la locución.

`guardian-placement.js` evalúa 16 posiciones alrededor del objetivo, proyección en cámara, terreno, cultivos, trabajadores, bestias y volúmenes de edificios/murallas/árboles. Se reutiliza CameraBuildingRegistry para evitar raycasts repetidos contra mallas animadas. Si no encuentra un emplazamiento libre usa una alternativa elevada; es una aproximación geométrica, no una garantía de visibilidad perfecta en cualquier escena.

## Brazos, viento y energía

La fuente Blender conserva la máscara, adornos y anatomía sin piernas. Mantiene 37 huesos, 6 primitivas y 17.025 triángulos; el GLB ocupa 2.694.836 bytes. Se añaden cuatro clips de 2 s a las nueve animaciones anteriores.

`spell_actions.py` resuelve dos segmentos del brazo offline y hornea sus rotaciones: manos próximas al pecho, extensión y recuperación. Grow eleva las manos; Multiply concentra y separa; Shield abre una postura protectora; Attack adelanta un brazo y recoge el otro. Una corrección angular limitada en ejecución orienta antebrazos y manos hacia el punto tridimensional del objetivo. La energía se origina en los huesos de las manos: dos haces instanciados para las tres magias de apoyo y una descarga rápida para Attack. Ataque comienza en la preparación del gesto y conserva el daño inmediato del comando; no se simula un proyectil lento con daño retrasado.

El manto tiene ondas viajeras con mayor deflexión en el borde (0,42 rad en brisa, multiplicador 1,35 en hechizo); las plumas tienen raíz y punta desfasadas, y los fragmentos de madera oscilan como piezas rígidas. El estudio físico de tela es offline. No se ejecutan tela, IA ni IK iterativo en el navegador.

Se corrigieron gradientes de pesos de hombro que se hacían visibles con las nuevas poses. La comprobación numérica final conserva cuatro influencias normalizadas. P99 de cociente de longitud de aristas: 1,20–1,23 en los nuevos hechizos; máximos locales 2,88–3,24 en aristas cortas. Estos números no equivalen a ausencia matemática de estiramiento: el rig usa skinning lineal y no tiene correctivos de codo. Los renders y capturas inspeccionados no mostraron agujeros manifiestos; las poses extremas necesitan revisión artística adicional si se amplían sus límites.

## Attack y respuesta física

Se añade Ataque al menú existente (cuatro tarjetas, icono SVG propio). Se selecciona una bestia activa mediante el raycast existente y se conserva el punto de intersección. El comando valida permisos, pausa y recarga antes de calcular la presentación. La simulación es autoritativa incluso si falla el cálculo visual de posición.

Balance centralizado en `content/balance/balance_confirmado.json`, generado a `src/simulation/balance.js`:

| Especie | Resistencia | Golpes de 28 para retirarse | Masa relativa | Aturdimiento (s) |
|---|---:|---:|---:|---:|
| Hiena | 56 | 2 | 0,7 | 0,70 |
| Jabalí | 84 | 3 | 1 | 0,55 |
| León | 112 | 4 | 1,5 | 0,45 |
| Búfalo | 140 | 5 | 3 | 0,30 |
| Rinoceronte | 168 | 6 | 5 | 0,20 |

Recarga global: 12 s. Disponible desde la noche 1, con centro operativo e incursión activa. No se añade maná: el sistema anterior usa recargas. No hay daño de área ni muerte nueva. La resistencia mágica es específica de esta intervención, separada del presupuesto de ataques de la incursión. Dos a seis usos separados por recarga permiten aliviar una amenaza sin sustituir las defensas.

`animal-impact.js` usa dirección, altura del contacto sobre el suelo, palanca lateral, orientación, intensidad y masa. La reacción es una solución analítica de oscilación amortiguada, aplicada al torso/cabeza y parcialmente al cuerpo, con transición breve desde la pose anterior. Se restaura la pose antes de cada muestreo para evitar acumulación. No desplaza el agente de navegación ni introduce ragdoll: el retroceso perceptivo es esquelético, no una fuerza de colisión sobre el mundo.

El golpe cancela la acción ofensiva comprometida, aplica un aturdimiento breve y permite continuar. Al agotar resistencia, `retreatAnimal` libera reserva/objetivo y usa la ruta de salida existente. El daño, contacto, aturdimiento y retirada son serializables y se validan al cargar.

## Audio y recursos

Se reutilizan `spirit_appear`, `spirit_disappear`, `spirit_power_activate`, `beast_take_damage` y los SFX de daño/retirada de cada especie. Se respetan los buses, límites de voces y controles de vigencia. La retirada suena al cambiar a ese estado, no en todos los golpes. La posición atenúa volumen mediante el sistema existente; no se incorpora un motor HRTF nuevo.

No se incorporan assets externos en esta fase. El icono, haces y geometrías auxiliares son autoría del cambio; partículas/atlas y SFX proceden del banco ya incluido en el repositorio. Véase `PHASE2-ASSETS.md`.

El modelo comparte geometría y texturas del gestor de assets; cada invocación reutiliza materiales, mixer, aura y geometría. Las dos trayectorias de apoyo comparten un InstancedMesh. Se precalientan shaders durante la carga. La iluminación local del Guardián usa sol/noche y mapas originales sin depender del número de luces temporales. Es una aproximación estilizada al PBR del GLB. El aura usa el VFX nativo con partículas sin suavizado por profundidad: conserva depth test y evita solicitar una captura extra de toda la escena. No introduce postprocesado global. Se eliminan materiales, buffers, esqueletos y efectos al disponer el mundo.

## Pruebas ejecutadas y evidencia

- Build de Vite aprobado. 97 pruebas Node dirigidas aprobadas: rig, visemas, ciclo de vida, audio, comandos, selección, snapshots y VFX. Se repitieron pruebas focalizadas tras el enlace de voz al cuerpo del mundo. No se ha ejecutado toda la batería larga de campañas en esta iteración.
- Prueba de 20 órdenes consecutivas: misma instancia, máximo un cuerpo visible, limpieza al expirar y al disponer.
- Interfaz principal ejecutada: nueva partida Suajili, tutorial con modelo 3D y menú real con Ataque y bloqueo correcto durante el día 1 (`phase2/main-magic-menu.png`).
- WorldScene real: Grow, Multiply, Shield y Attack, giro de cámara, zoom, ráfagas y desaparición. Vídeos `videos/guardian-combat-day.mp4` y `videos/guardian-combat-night.mp4` (H.264/AAC, 1600×900). Son una fixture controlada con los comandos, modelos, audio y renderizador reales; reinicia recargas para demostrar secuencias, no representa el equilibrio de una partida normal.
- Ataque junto a muralla/edificio, lateral sobre rinoceronte y elevado sobre hiena. Los ángulos forzados del laboratorio comprueban la reacción y pueden sacar al Guardián del encuadre; el posicionador normal no usa esas coordenadas forzadas.
- Navegación real activada: aproximación y ataque al objetivo, interrupción con Attack y continuación de la simulación. El vídeo termina con una hiena agotando resistencia y retirándose por la navegación existente.
- Renders Blender de los cuatro gestos y muestreo de deformaciones guardados. Las capturas de muralla/lateral/elevado corresponden a la iteración anterior al último suavizado de hombros; los dos vídeos y renders Spell_* usan el rig final.
- Los vídeos contienen una pista de audio y las pruebas verifican su selección/atenuación. No se certifica aquí una revisión auditiva subjetiva exhaustiva de todos los SFX.

## Rendimiento: resultados y límite de aceptación

Medición en navegador integrado, ANGLE/D3D11 sobre Intel UHD, 1600×900, pixel ratio 1, calidad media. Archivo final: `phase2-perf-final-raid.json`. Veinte bestias con sus rigs visibles; ataques cada 600 ms en fixture, sin navegación durante el benchmark para aislar render/animación. Cada ventana dura 8 s, con separación de 2,5 s. Por tanto no sustituye una campaña con cientos de entidades y navegación activa.

| Ventana | FPS medios | Frame p95 / p99 (ms) | CPU render p95 (ms) | CPU Guardián / VFX p95 (ms) | Draw calls p95 |
|---|---:|---:|---:|---:|---:|
| Sin ataques | 27,26 | 50,0 / 50,1 | 24,0 | 0 / 0 | 72 |
| Ataques + Guardián | 22,35 | 83,2 / 99,8 | 19,1 | 0,3 / 0,8 | 83 |
| Ataques sin Guardián | 25,83 | 50,1 / 66,6 | 23,2 | 0 / 0 | 72 |
| Ataques + Guardián repetido | 22,46 | 83,1 / 99,6 | 19,5 | 0,2 / 0,8 | 83 |

Geometrías: 180 en las cuatro ventanas; texturas: 87. Heap JS oscila entre 449 y 483 MB y vuelve a bajar; no se detecta crecimiento monotónico en esta prueba corta. No se dispone de una medición separada fiable de memoria GPU. Colocar y emitir un comando caliente suele costar menos de 1 ms de planificación y unas décimas de lógica; el render completo del comando es adicional.

Hay una regresión de fluidez en esa ejecución y **no se marca como superada**. Otras repeticiones muestran gran variación de la referencia, incluso sin Guardián. `phase2-perf-gpu-isolation.json` separa cuerpo/efectos, pero su referencia cae de 16,9 a 11,9 FPS durante la prueba; no permite atribuir causalmente todo el cambio a un componente. Se conservan los registros anteriores para auditar las iteraciones, no para escoger sólo el resultado más favorable. Los registros `investigation`, `isolated` y `optimized` preceden al requisito de instancia única; no describen la versión actual.

Optimización ya realizada: una instancia, posicionamiento por volúmenes en vez de raycasts de triángulos, shaders precalentados sin recompilación por luces, una pasada por superficie, haces instanciados y aura sin captura adicional de profundidad. Queda pendiente cerrar una comparación sostenida y estable y reducir los picos bajo carga antes de declarar cumplido el criterio de rendimiento del usuario.

## Revisión posterior: granja de noche 31 y buffers VFX

Se cargó la instantánea existente `docs/qa/raid-paid-defense-night31/failure-state.json.gz` en el laboratorio mediante `?campaign=1`: 135 trabajadores, 51 estructuras y 5.362 cultivos. Para el estrés se sustituyó únicamente la incursión de la fixture por 20 bestias. La simulación permanece detenida durante las mediciones; no representa el coste de navegación de una incursión completa.

El posicionador filtra los cultivos y trabajadores próximos una vez por comando antes de evaluar sus 16 candidatos. Evita los cuerpos de trabajadores, también incapacitados. Los volúmenes se precalientan durante la carga. Una prueba con 10.000 cultivos lejanos comprueba una sola lectura de coordenada por cultivo y conserva la posición elegida. La captura `phase2/campaign-worker-clearance.png` muestra el espacio corregido. `campaign-rotated-zoom.png` documenta un límite: al girar la cámara después de colocar al Guardián puede quedar oculto por el follaje. No se recoloca durante el gesto ni se declara resuelta toda oclusión.

El empaquetador VFX reutiliza el Float32Array del buffer de subida, elimina arrays temporales del comparador y actualiza sólo las filas activas. Evita una asignación de 76.000 bytes por efecto y fotograma (2,28 MB/s a 30 FPS), además de la copia; esto es una reducción de asignaciones calculable, no una mejora de FPS demostrada. Se regeneró el código desde `tools/prepare_vfx_renderer.py`. Las pruebas comparan los datos con y sin buffer prestado, identidad, vaciado y rangos de subida.

Se añadió una comparación GPU intercalada con orden equilibrado, mundo y pose congelados: 40 fotogramas de calentamiento y 240 medidos, 60 por variante. Consultas GPU asíncronas, sin `gl.finish`. No se interpreta su RAF instrumentado como FPS de juego. Resultados `phase2-perf-balanced-gpu.json` y `phase2-perf-campaign-gpu.json`, sin muestras descartadas ni eventos disjoint:

| Escena / GPU mediana (ms) | Sin cuerpo ni aura | Sólo cuerpo | Sólo efectos | Ambos |
|---|---:|---:|---:|---:|
| Fixture 20 bestias | 26,71 | 27,07 | 24,60 | 24,91 |
| Granja noche 31, incursión original | 50,50 | 50,87 | 47,90 | 48,11 |

Las variantes con efectos arrojan menos tiempo en estas consultas. No se afirma que los efectos aceleren el juego: la medida de comandos GPU y el ritmo CPU/controlador no permiten esa conclusión. El cuerpo añade aproximadamente 0,37 ms a la mediana en ambas comparaciones, con seis draw calls adicionales; el conjunto añade once.

Se corrigió también el benchmark ordinario para que los comandos no fuercen un segundo render fuera del bucle RAF. Los botones manuales conservan ese render para inspección congelada. `phase2-perf-campaign-stress.json` es anterior a esta corrección y `phase2-perf-campaign-single-render.json` posterior; se conservan ambos, sin atribuir diferencias a una causa no aislada.

| Noche 31, un render por RAF | FPS medios | Frame p95 / p99 (ms) | Animación / VFX p95 (ms) |
|---|---:|---:|---:|
| Sin ataques | 9,30 | 133,2 / 150,1 | 0 / 0 |
| Ataques + Guardián | 8,73 | 133,1 / 199,5 | 0,4 / 1,2 |
| Ataques sin Guardián | 8,90 | 149,6 / 166,2 | 0 / 0 |
| Ataques + Guardián repetido | 7,20 | 166,4 / 266,1 | 0,5 / 1,0 |

En las cuatro ventanas se mantienen 282 geometrías y 98 texturas; máximo un Guardián, sin errores registrados. Los comandos calientes tardan 0,8–2,2 ms sin render inmediato. La referencia ya es lenta y deriva durante la sesión; los picos siguen pendientes de investigación y la aceptación de rendimiento permanece abierta. Esta revisión pasa 86 pruebas dirigidas de Guardián, selección y VFX; se ejecutaron además 67 pruebas focalizadas del empaquetado y los efectos antes de la revisión final.

## Comparación equilibrada y fin del trabajo de impacto

`phase2-perf-campaign-abba.json` mide ocho bloques ABBA/BAAB con comandos idénticos cada 600 ms: 1,2 s de calentamiento y 4 s de muestras por bloque, sin render adicional ni consultas GPU. La pestaña permaneció visible (cero fotogramas ocultos), sin Blender, ffmpeg ni mantenimiento Git en ejecución. En esta sesión, la media aritmética de las cuatro medias por bloque fue 9,07 FPS de referencia y 8,88 con Guardián (−2,1 %). Esto reduce la confusión por deriva temporal; no demuestra fluidez absoluta ni navegación bajo carga. La referencia ya es lenta. Los p95 de las etapas sitúan la etapa conjunta de LOD y sincronización del mundo en 23,4–31,1 ms y el dibujo en 17,2–27,7 ms; animación del Guardián 0,3–0,4 ms y VFX 1,0–1,4 ms. No se suman percentiles como si fueran el mismo fotograma.

El laboratorio registra las siete etapas de `renderFrameUpdates`, la terminación del iterador y el dibujo como nueve entradas en `stagesP95`. No modifica las responsabilidades del renderizador de producción. El siguiente diagnóstico de CPU debe separar cultivos, actores y resto de `sync`, en vez de atribuir toda esa etapa a las invocaciones.

Se corrigió un coste independiente: después de un impacto, el controlador seguía copiando las rotaciones de todos los huesos cada fotograma aunque la reacción hubiese expirado. Ahora restaura la pose una vez y sólo copia/aplica huesos durante los 1,1 s activos. El caché del rig se conserva para reutilización. Cargar un impacto ya expirado no inicializa ese caché. La prueba comprueba cero copias de cuaterniones durante 100 actualizaciones posteriores y que un segundo golpe parte de la pose actual.

Validación posterior: 87 pruebas dirigidas aprobadas; build aprobado. Prueba gráfica de rinoceronte a 0,12 s, recuperación a 2,4 s y segundo golpe: `phase2/impact-active.png`, `impact-recovered.png`, `impact-second-hit.png` y `impact-recovery-check.json`. Un solo Guardián, salud 168→140→112, sin errores. No se atribuye a esta corrección una mejora global de FPS: la medición ABBA es anterior a ella.

## Navegación real y colocación aérea

Se ejecutaron dos restauraciones independientes de la instantánea de noche 31, con 135 trabajadores, 51 estructuras, 5.362 registros de cultivos y cuatro animales (dos ya estaban retirados del escenario). Se mantuvo congelada la instantánea antes de iniciar cada prueba y se avanzaron 400 pasos nativos de `Game.tick` de 0,05 s: 20 segundos de simulación, no 20 segundos de reloj. Attack se lanzó a 0,55 y 12,65 s, sin reiniciar salud ni recarga. La navegación permaneció activa.

`phase2-perf-navigation-reference.json` y `phase2-perf-navigation-guardian.json`: 10,62 frente a 10,60 FPS; p95 149,8 ms en ambos; p99 166,4 frente a 166,3 ms. Simulación p95 6,2/7,5 ms, máximos 178,2/171,6 ms. Animación del Guardián p95 0,2 ms, VFX 1,6 ms. Ambos terminan con 344 geometrías y 83 texturas. No se atribuyen diferencias pequeñas a una causa con sólo estas dos ejecuciones.

La comparación exacta de los campos registrados del estado final coincide: RNG, reloj, resultado/pausas, posiciones/estado/salud/objetivo de los animales, posiciones/estado de los 135 trabajadores, estado y HP de las 51 estructuras y número de cultivos vivos. No equivale a comparar byte por byte toda la partida. `phase2-navigation-comparison.json` conserva el hash y alcance. Sin errores y máximo un Guardián. La granja base sigue siendo lenta: esto verifica equivalencia de la simulación y un coste añadido pequeño en ese recorrido, no fluidez absoluta ni veinte bestias navegando.

La prueba de Grow sobre maíz descubrió que el último recurso de elevar cinco metros al Guardián podía dejarlo fuera de cámara. Ahora, cuando no hay huella libre, evalúa cuatro alturas sobre las 16 posiciones, comprueba el volumen corporal contra edificios/murallas/árboles/rocas, la altura de cultivos y actores y la proyección de cabeza y cuerpo. Conserva la búsqueda normal junto al objetivo. La elevación extrema sólo queda como último recurso cuando no hay alternativa validada. Se verificó gráficamente Grow sobre maíz y plátano y Multiply sobre yuca: `phase2/grow-maize.png`, `grow-banana.png`, `multiply-cassava.png`, con un único cuerpo y sin errores. Se corrigió además el botón Día del laboratorio para retirar su incursión de prueba; las reglas de disponibilidad del juego no se cambiaron.

La petición posterior amplía esta fase con invocaciones cinematográficas y ragdoll. Sus requisitos y estado de investigación se registran en `CINEMATIC-RAGDOLL.md`; no están completados por las pruebas anteriores.

## Reproducción

1. `npm run dev -- --port 5194` y abrir `/tests/browser/guardian-combat.html`.
2. Usar Día/Noche, especie, muralla, dirección, cámara, zoom y congelación/paso. Los controles de recarga/estado son exclusivos de la fixture.
3. Activar sonido, iniciar `python tools/guardian/receive_video.py` y pulsar Grabar día/Grabar noche. El receptor local sólo acepta los nombres autorizados.
4. Para autoría: `blender -b --python tools/guardian/build.py`; luego `check_deformation.py`, `render_spells.py` y `render_ethereal.py`. `update_spells.py` permite iterar sólo los clips sobre el blend existente; cambios de pesos requieren el build completo.
5. Las pruebas y muestras de las 54 voces ES/EN siguen en `/tests/browser/guardian-3d.html`. Sus vídeos anteriores documentan la fase de diálogo; no se han vuelto a grabar las 54 locuciones con esta revisión corporal.

Pendientes de aceptación: rendimiento sostenido de incursiones completas, revisión auditiva subjetiva y matriz visual exhaustiva en todos los biomas/cultivos y situaciones de oclusión. El código y las evidencias se publican para revisión sin ocultar estos límites.


## Current component profile

See `gpu-current/README.md` for five interleaved frozen-frame GPU runs of the current Guardian. Paired GPU medians add 0.351-1.028 ms; animation and VFX update costs are separately recorded. These are component measurements, not moving-raid FPS or a full performance acceptance.
