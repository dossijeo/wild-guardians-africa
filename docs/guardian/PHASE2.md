# Guardián: invocación y combate (fase 2)

Actualizado el 27 de octubre de 2026. Rama `codex/guardian-3d-animation`; PR #217. No se ha hecho merge. La fase está implementada y disponible para revisión visual; la aceptación de rendimiento sostenido sigue pendiente.

## Comportamiento

Grow, Multiply, Shield y Attack reutilizan **una sola instancia** del Guardián. Una nueva orden sustituye su presentación, limpia el efecto anterior y conserva todos los resultados de simulación ya aplicados. No hay cola que retrase las magias. El personaje aparece en el mundo durante 2,2 s; la entrada dura 0,12 s y la salida 0,7 s. No navega hasta el objetivo ni modifica la cámara.

Si coincide con el tutorial, se oculta únicamente su avatar de diálogo: se conservan texto, controles y voz. El cuerpo del mundo puede muestrear esa misma voz y secuencia facial. Al terminar la invocación vuelve el avatar del tutorial, sin reiniciar la locución.

`guardian-placement.js` evalúa 16 posiciones alrededor del objetivo, proyección en cámara, terreno, cultivos, bestias y volúmenes de edificios/murallas/árboles. Se reutiliza CameraBuildingRegistry para evitar raycasts repetidos contra mallas animadas. Si no encuentra un emplazamiento libre usa una alternativa elevada; es una aproximación geométrica, no una garantía de visibilidad perfecta en cualquier escena.

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

## Reproducción

1. `npm run dev -- --port 5194` y abrir `/tests/browser/guardian-combat.html`.
2. Usar Día/Noche, especie, muralla, dirección, cámara, zoom y congelación/paso. Los controles de recarga/estado son exclusivos de la fixture.
3. Activar sonido, iniciar `python tools/guardian/receive_video.py` y pulsar Grabar día/Grabar noche. El receptor local sólo acepta los nombres autorizados.
4. Para autoría: `blender -b --python tools/guardian/build.py`; luego `check_deformation.py`, `render_spells.py` y `render_ethereal.py`. `update_spells.py` permite iterar sólo los clips sobre el blend existente; cambios de pesos requieren el build completo.
5. Las pruebas y muestras de las 54 voces ES/EN siguen en `/tests/browser/guardian-3d.html`. Sus vídeos anteriores documentan la fase de diálogo; no se han vuelto a grabar las 54 locuciones con esta revisión corporal.

Pendientes de aceptación: rendimiento sostenido de incursiones completas, revisión auditiva subjetiva y matriz visual exhaustiva en todos los biomas/cultivos y situaciones de oclusión. El código y las evidencias se publican para revisión sin ocultar estos límites.
