# Invocación cinematográfica y derribo físico

Ampliación solicitada por el usuario durante la fase 2. Rama actual, un único Guardián, sin cámara nueva ni merge. Sustituye la preferencia anterior por impactos exclusivamente esqueléticos suaves. Estado: en desarrollo; **no entregado ni validado como ragdoll funcional**.

## Contrato de entrega

- Anticipación breve, motas convergentes, vórtice vertical tridimensional, silueta y revelado de abajo arriba, pulso en ojos/medallón/manos, ráfaga de manto/plumas y disolución con residuos.
- Clímax distintos para Grow, Multiply, Shield y Attack; secuencia de lanzamiento/contacto/reacción sincronizada sin bloquear órdenes.
- Reutilizar viento y SFX existentes, limitar voces y duración, evitar luces globales caras.
- Ragdoll híbrido desde la pose actual: impulso direccional por contacto/masa/velocidad, desplazamiento inicial orientativo de 1–2 m en especies derribables, caída articulada, estabilización, recuperación gradual y devolución de control en la posición real.
- IA suspendida durante caída/recuperación; daño, aturdimiento y huida coherentes; golpes repetidos no dejan estados bloqueados.
- Colisión con terreno inclinado, edificios, murallas, puertas, rocas, árboles y bestias; sin penetraciones importantes ni extremidades estiradas.
- Presupuesto limitado de ragdolls, reutilización y reposo; alternativa visible cuando se agota; evaluar integración multihilo y coste real en navegador.
- Validación gráfica día/noche, cuatro magias, obstáculos, ráfagas, impactos frontal/lateral/elevado, varias especies, caída/levantarse/huida y múltiples impactos. Capturas/vídeos inspeccionados, comparativa de frame/CPU/físicas/VFX/draws/memoria y respuesta de controles.
- Sólo assets externos CC0 verificados. Las bibliotecas de código se evalúan por separado; procedencia/licencia documentadas. Commits y PR revisables, sin merge.

## Inspección realizada

Los cinco GLB originales tienen 28 articulaciones de skin con jerarquía Mixamo: Hips, Spine/Spine1/Spine2, Neck/Head, hombros/brazos/antebrazos/manos, muslos/piernas/pies/dedos. Las dimensiones difieren: HeadTop_End en reposo va de 1,79 m (león) a 2,91 m (rinoceronte), antes de cualquier ajuste de presentación. Son los animales antropomórficos originales del juego; no se sustituyen por cuadrúpedos. Los clips disponibles son caminar, correr y ataques con arma; no hay clips de levantarse. El jabalí incluye además restpose. Será necesaria recuperación procedural o autoría adicional.

Audio disponible: `amb_wind_soft` y `amb_wind_strong` son bucles de 12 s; no deben dispararse completos por invocación. Se pueden reutilizar extractos con envolvente corta. `spirit_appear` dura 1,6 s y `spirit_disappear` 2,48 s; daño/huida por especie ya están conectados. No se han añadido audios externos.

## Viabilidad física inicial

Candidato: [Rapier](https://rapier.rs/docs/user_guides/javascript/joints/), bindings oficiales `@dimforge/rapier3d-compat` 0.21.0, licencia Apache-2.0, [repositorio](https://github.com/dimforge/rapier). Instalado únicamente en `C:/tmp/guardian-physics` para evaluación; aún no es dependencia de producción. No es un asset CC0 ni se presenta como tal.

`tools/guardian/measure_ragdoll.mjs` lee las transformaciones reales de los cinco GLB y ensaya 14 cápsulas/13 articulaciones esféricas por ragdoll, suelo plano, 360 pasos de 1/60 s y despertares forzados. Reproducción: `node tools/guardian/measure_ragdoll.mjs <ruta-absoluta-a-rapier.mjs> docs/guardian/ragdoll-feasibility.json`.

| Ragdolls | Cuerpos | Creación (ms) | Paso medio / p95 / máximo (ms) |
|---|---:|---:|---:|
| 1 | 14 | 5,90 | 0,77 / 0,95 / 104,90 |
| 3 | 42 | 1,93 | 0,54 / 0,83 / 3,09 |
| 6 | 84 | 2,61 | 1,02 / 1,71 / 2,59 |

Inicialización/importación: 101,73 ms. Módulo compat: 4.340.292 bytes, gzip 1.645.573 bytes (no tamaño final Vite). El pico frío requiere precalentamiento fuera de combate. Estas medidas Node sólo justifican investigar el candidato: no prueban coste de navegador, corrección anatómica ni calidad visual. El ensayo no tiene límites angulares, colisiones del escenario, transferencia a la malla ni recuperación. Ninguna de esas funciones se marca como completada.


## Primera iteración de materialización

Implementados en WorldScene: tres cintas helicoidales volumétricas y 96 motas, silueta con iluminación de contorno, revelado vertical de los materiales originales, borde emisivo, disolución granular ascendente y pulso secundario desfasado sobre los huesos de manto/adornos. El vórtice conserva geometría, materiales y uniforms entre invocaciones: dos draw calls, animación de vértices en GPU, sin asignaciones de partículas por frame ni luces nuevas. Se precalienta durante la carga y se limpia al sustituir/finalizar la única invocación.

Validación gráfica real en la fixture WorldScene, Intel UHD, 1600×900: Grow de día a 0,24 / 0,60 / 1,80 s, limpieza después de 2,2 s, Attack nocturno sustituyendo la invocación anterior. Sin errores de shader/JavaScript, máximo un Guardián visible. Capturas: `phase2/cinematic-arrival-024.png`, `cinematic-materialized-060.png`, `cinematic-dissolve-180.png`, `cinematic-night.png`. Los fotogramas 0,60 y 1,80 preceden al último ajuste del sombreado de la silueta, que sólo afecta al tramo de llegada; el fotograma 0,24 y el nocturno se repitieron con dicho ajuste.

Esto **no completa** la nueva entrega: Attack conserva por ahora el impacto inmediato anterior (se revisará junto con el derribo), faltan la envolvente corta de viento, el clímax por magia y las pruebas de rendimiento de estos nuevos efectos. La comparación de navegación de PHASE2 corresponde a la versión anterior al vórtice, no demuestra el coste del nuevo shader. No se ha integrado aún el ragdoll ni su recuperación.


## Solver articulado y primera transferencia a la malla

Implementados `src/simulation/beast-ragdoll.js` y `src/rendering/beast-ragdoll-binding.js`: 14 cuerpos, 13 bisagras limitadas, cápsulas CCD, suelo triangulado y cajas estáticas, límite de capacidad, detección de reposo, limpieza de cuerpos/joints y snapshots numéricos independientes del renderizador. Los huesos conservan sus longitudes; sólo se transfiere la traslación de Hips. Se normalizan los nombres que GLTFLoader sanea y los cuaterniones Float32 para evitar deriva al transferir la pose.

Rapier 0.21.0 queda fijado en package.json/lock, licencia Apache-2.0. Por ahora sólo lo importa dinámicamente la herramienta gráfica de QA; **no está conectado al combate de producción**. La auditoría npm informa avisos del Vite 6.4.3 preexistente, no de Rapier; no se actualizó el bundler dentro de este cambio.

Cuatro pruebas reales con los cinco esqueletos originales comprueban: cuerpos finitos, estabilidad/reposo, contactos con suelo, restricción de lanzamiento por una pared sólida, capacidad sin cuerpos extra, ausencia de estiramiento, rechazo de poses inválidas y transferencia inicial de pose sin salto. Desplazamiento X desde reposo en el ensayo final: hiena 1,91 m, jabalí 1,88 m, león 1,08 m, búfalo 0,35 m, rinoceronte 0,27 m. Estos valores no sustituyen pruebas con poses de correr/atacar ni otros puntos de contacto.

La fixture gráfica añade «Ensayar ragdoll físico» y usa la malla y terreno de WorldScene. En una hiena desde caminar se observó caída y reposo: 1,33 m de desplazamiento, 14 cuerpos, p95 del paso físico 0,70 ms (una sola bestia; no comparación de incursión). Evidencia `phase2/ragdoll-first-contact.json` y `.png`. **Defecto detectado y pendiente:** el muestreo de 7.859 vértices encuentra penetración máxima de 14,2 cm y 0,32 % de muestras a más de 8 cm bajo el terreno. No se acepta todavía el contacto visual como terminado. Ensanchar indiscriminadamente todas las cápsulas impidió estabilizar al jabalí y se descartó; se mantiene cobertura adicional sólo en cabeza. Se necesita ajustar colisionadores a las envolventes de skin por especie.

Pendientes: cobertura anatómica por especie, límites relativos al reposo (las bisagras actuales se referencian a la pose de entrada), escenario completo/otros animales, impulso por punto de contacto, worker/pooling, recuperación y reconciliación lógica, integración de Attack y su timing, fallback al agotar presupuesto, vídeos y matriz gráfica/rendimiento completa. El ensayo congela explícitamente la simulación de juego: **no demuestra suspensión de IA en producción**.


## Corrección de contactos por especie

Se añadió ajuste de envolventes convexas desde los pesos y vértices reales: un máximo de 96 puntos de soporte por cuerpo, manteniendo cápsula de reserva cuando no hay geometría suficiente. El cálculo se realiza al preparar el ensayo, nunca por paso físico; todavía debe moverse al precalentamiento/caché de producción. Se conserva un margen de contacto de 2,5 cm. La captura actualiza también la matriz inversa de unión de SkinnedMesh: actualizar sólo matrixWorld dejaba un desplazamiento vertical anterior en el ajuste.

Se incorporó un lector GLB de geometría/skin para las pruebas: usa pesos, joints e inverseBindMatrices originales de las cinco especies. Después de ocho segundos de caída sobre suelo plano, todas se estabilizan; penetración muestreada: hiena/jabalí/león/búfalo 0, rinoceronte 0,00116 m. La prueba falla a partir de 3 cm y comprueba separaciones entre articulaciones. No demuestra otras poses ni obstáculos.

Repetición gráfica con una pose de caminar fija (fase 0,35), terreno real, hiena: 1,40 m de desplazamiento, reposo confirmado, 0 penetración en 7.859 muestras, p95 del paso 0,90 ms. Evidencia `phase2/ragdoll-fitted-contact.json` / `.png`. El informe conserva los puntos usados para reproducir el ajuste. El pico frío inicial sigue requiriendo precalentamiento; no se presenta esta medición aislada como rendimiento de incursión. Las cápsulas sobredimensionadas se descartaron porque elevaban el cuerpo y no estabilizaban correctamente. Esta corrección cierra el defecto observado en ese ensayo, no la matriz completa de colisiones.

Siguen pendientes recuperación/levantarse, integración de estados y posición lógica, coordinación temporal con Attack, escenario completo y otras especies/poses en pruebas gráficas, worker/pooling y comparativa de rendimiento. La implementación continúa disponible sólo en el ensayo QA.


## Recuperación procedural por etapas (QA)

`src/rendering/beast-recovery.js` mezcla desde la pose física exacta hacia una postura de apoyo/agachada y después a la animación normal en 1,65 s. Incluye ajuste analítico de ambas piernas para orientar los pies hacia sus apoyos, activado después de incorporar el torso y retirado gradualmente al terminar. Se conserva la posición horizontal alcanzada; la fixture reconcilia el origen lógico con la pelvis caída antes de mezclar, vacía la ruta y libera los cuerpos físicos. La selección de muestras de contacto incluye extremos por hueso (dedos, colmillos, pies) y se cachea por geometría; un muestreo uniforme había omitido penetraciones en jabalí y se sustituyó.

Prueba sobre las cinco mallas: inicio sin salto mayor de 3 cm, raíz desplazada invariable durante recuperación, devolución de control al terminar, sin penetraciones detectadas en el muestreo de cada décimo paso. Máximo desplazamiento de pelvis por paso de 1/60 s: hiena 3,58 cm, jabalí 2,30 cm, león 3,34 cm, búfalo 3,94 cm, rinoceronte 6,33 cm (límite de prueba 8 cm). La primera versión de apoyo introducía un tirón; se retrasó el ajuste de pies hasta que el torso se incorpora.

Validación gráfica por avance manual en WorldScene con hiena desde caminar: fase de apoyo y posición final inspeccionadas, posición lógica desplazada 1,33 m, 0 cuerpos físicos al finalizar y ningún error de JavaScript. Capturas `phase2/ragdoll-recovery-brace.png`, `ragdoll-recovered.png` e informe `ragdoll-recovery.json`. La pose de apoyo se ha mejorado, pero aún requiere revisión animada con otras especies y orientaciones; no se considera completada la calidad artística de toda la matriz. En ese terreno, el corrector vertical registra 4,47 cm al terminar frente al apoyo nativo: hay que resolver ese pequeño ajuste en la transición de producción, no atribuirle ausencia absoluta de salto.

La recuperación sigue conectada sólo al ensayo QA, con controles de velocidad/pausa/avance físico. Pendientes: integración de IA (suspender ataques y navegación durante la secuencia), impacto sincronizado con Attack, validación/reconciliación contra obstáculos al levantarse, golpes repetidos, retirada posterior y presupuesto de rendimiento. No se ha dado por terminada la funcionalidad.
