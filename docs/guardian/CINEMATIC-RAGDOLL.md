# Invocaci√≥n cinematogr√°fica y derribo f√≠sico

Ampliaci√≥n solicitada por el usuario durante la fase 2. Rama actual, un √∫nico Guardi√°n, sin c√°mara nueva ni merge. Sustituye la preferencia anterior por impactos exclusivamente esquel√©ticos suaves. Este documento conserva el historial de desarrollo, incluidas etapas anteriores a la integraci√≥n. El ragdoll y su recuperaci√≥n s√≠ est√°n integrados actualmente; la aceptaci√≥n completa de la fase sigue abierta. Consultar [CURRENT-STATUS.md](CURRENT-STATUS.md) para la evidencia vigente.

## Contrato de entrega

- Anticipaci√≥n breve, motas convergentes, v√≥rtice vertical tridimensional, silueta y revelado de abajo arriba, pulso en ojos/medall√≥n/manos, r√°faga de manto/plumas y disoluci√≥n con residuos.
- Cl√≠max distintos para Grow, Multiply, Shield y Attack; secuencia de lanzamiento/contacto/reacci√≥n sincronizada sin bloquear √≥rdenes.
- Reutilizar viento y SFX existentes, limitar voces y duraci√≥n, evitar luces globales caras.
- Ragdoll h√≠brido desde la pose actual: impulso direccional por contacto/masa/velocidad, desplazamiento inicial orientativo de 1‚Äì2 m en especies derribables, ca√≠da articulada, estabilizaci√≥n, recuperaci√≥n gradual y devoluci√≥n de control en la posici√≥n real.
- IA suspendida durante ca√≠da/recuperaci√≥n; da√±o, aturdimiento y huida coherentes; golpes repetidos no dejan estados bloqueados.
- Colisi√≥n con terreno inclinado, edificios, murallas, puertas, rocas, √°rboles y bestias; sin penetraciones importantes ni extremidades estiradas.
- Presupuesto limitado de ragdolls, reutilizaci√≥n y reposo; alternativa visible cuando se agota; evaluar integraci√≥n multihilo y coste real en navegador.
- Validaci√≥n gr√°fica d√≠a/noche, cuatro magias, obst√°culos, r√°fagas, impactos frontal/lateral/elevado, varias especies, ca√≠da/levantarse/huida y m√∫ltiples impactos. Capturas/v√≠deos inspeccionados, comparativa de frame/CPU/f√≠sicas/VFX/draws/memoria y respuesta de controles.
- S√≥lo assets externos CC0 verificados. Las bibliotecas de c√≥digo se eval√∫an por separado; procedencia/licencia documentadas. Commits y PR revisables, sin merge.

## Inspecci√≥n realizada

Los cinco GLB originales tienen 28 articulaciones de skin con jerarqu√≠a Mixamo: Hips, Spine/Spine1/Spine2, Neck/Head, hombros/brazos/antebrazos/manos, muslos/piernas/pies/dedos. Las dimensiones difieren: HeadTop_End en reposo va de 1,79 m (le√≥n) a 2,91 m (rinoceronte), antes de cualquier ajuste de presentaci√≥n. Son los animales antropom√≥rficos originales del juego; no se sustituyen por cuadr√∫pedos. Los clips disponibles son caminar, correr y ataques con arma; no hay clips de levantarse. El jabal√≠ incluye adem√°s restpose. Ser√° necesaria recuperaci√≥n procedural o autor√≠a adicional.

Audio disponible: `amb_wind_soft` y `amb_wind_strong` son bucles de 12 s; no deben dispararse completos por invocaci√≥n. Se pueden reutilizar extractos con envolvente corta. `spirit_appear` dura 1,6 s y `spirit_disappear` 2,48 s; da√±o/huida por especie ya est√°n conectados. No se han a√±adido audios externos.

## Viabilidad f√≠sica inicial

Candidato: [Rapier](https://rapier.rs/docs/user_guides/javascript/joints/), bindings oficiales `@dimforge/rapier3d-compat` 0.21.0, licencia Apache-2.0, [repositorio](https://github.com/dimforge/rapier). Instalado √∫nicamente en `C:/tmp/guardian-physics` para evaluaci√≥n; a√∫n no es dependencia de producci√≥n. No es un asset CC0 ni se presenta como tal.

`tools/guardian/measure_ragdoll.mjs` lee las transformaciones reales de los cinco GLB y ensaya 14 c√°psulas/13 articulaciones esf√©ricas por ragdoll, suelo plano, 360 pasos de 1/60 s y despertares forzados. Reproducci√≥n: `node tools/guardian/measure_ragdoll.mjs <ruta-absoluta-a-rapier.mjs> docs/guardian/ragdoll-feasibility.json`.

| Ragdolls | Cuerpos | Creaci√≥n (ms) | Paso medio / p95 / m√°ximo (ms) |
|---|---:|---:|---:|
| 1 | 14 | 5,90 | 0,77 / 0,95 / 104,90 |
| 3 | 42 | 1,93 | 0,54 / 0,83 / 3,09 |
| 6 | 84 | 2,61 | 1,02 / 1,71 / 2,59 |

Inicializaci√≥n/importaci√≥n: 101,73 ms. M√≥dulo compat: 4.340.292 bytes, gzip 1.645.573 bytes (no tama√±o final Vite). El pico fr√≠o requiere precalentamiento fuera de combate. Estas medidas Node s√≥lo justifican investigar el candidato: no prueban coste de navegador, correcci√≥n anat√≥mica ni calidad visual. El ensayo no tiene l√≠mites angulares, colisiones del escenario, transferencia a la malla ni recuperaci√≥n. Ninguna de esas funciones se marca como completada.


## Primera iteraci√≥n de materializaci√≥n

Implementados en WorldScene: tres cintas helicoidales volum√©tricas y 96 motas, silueta con iluminaci√≥n de contorno, revelado vertical de los materiales originales, borde emisivo, disoluci√≥n granular ascendente y pulso secundario desfasado sobre los huesos de manto/adornos. El v√≥rtice conserva geometr√≠a, materiales y uniforms entre invocaciones: dos draw calls, animaci√≥n de v√©rtices en GPU, sin asignaciones de part√≠culas por frame ni luces nuevas. Se precalienta durante la carga y se limpia al sustituir/finalizar la √∫nica invocaci√≥n.

Validaci√≥n gr√°fica real en la fixture WorldScene, Intel UHD, 1600√ó900: Grow de d√≠a a 0,24 / 0,60 / 1,80 s, limpieza despu√©s de 2,2 s, Attack nocturno sustituyendo la invocaci√≥n anterior. Sin errores de shader/JavaScript, m√°ximo un Guardi√°n visible. Capturas: `phase2/cinematic-arrival-024.png`, `cinematic-materialized-060.png`, `cinematic-dissolve-180.png`, `cinematic-night.png`. Los fotogramas 0,60 y 1,80 preceden al √∫ltimo ajuste del sombreado de la silueta, que s√≥lo afecta al tramo de llegada; el fotograma 0,24 y el nocturno se repitieron con dicho ajuste.

Esto **no completa** la nueva entrega: Attack conserva por ahora el impacto inmediato anterior (se revisar√° junto con el derribo), faltan la envolvente corta de viento, el cl√≠max por magia y las pruebas de rendimiento de estos nuevos efectos. La comparaci√≥n de navegaci√≥n de PHASE2 corresponde a la versi√≥n anterior al v√≥rtice, no demuestra el coste del nuevo shader. No se ha integrado a√∫n el ragdoll ni su recuperaci√≥n.


## Solver articulado y primera transferencia a la malla

Implementados `src/simulation/beast-ragdoll.js` y `src/rendering/beast-ragdoll-binding.js`: 14 cuerpos, 13 bisagras limitadas, c√°psulas CCD, suelo triangulado y cajas est√°ticas, l√≠mite de capacidad, detecci√≥n de reposo, limpieza de cuerpos/joints y snapshots num√©ricos independientes del renderizador. Los huesos conservan sus longitudes; s√≥lo se transfiere la traslaci√≥n de Hips. Se normalizan los nombres que GLTFLoader sanea y los cuaterniones Float32 para evitar deriva al transferir la pose.

Rapier 0.21.0 queda fijado en package.json/lock, licencia Apache-2.0. Por ahora s√≥lo lo importa din√°micamente la herramienta gr√°fica de QA; **no est√° conectado al combate de producci√≥n**. La auditor√≠a npm informa avisos del Vite 6.4.3 preexistente, no de Rapier; no se actualiz√≥ el bundler dentro de este cambio.

Cuatro pruebas reales con los cinco esqueletos originales comprueban: cuerpos finitos, estabilidad/reposo, contactos con suelo, restricci√≥n de lanzamiento por una pared s√≥lida, capacidad sin cuerpos extra, ausencia de estiramiento, rechazo de poses inv√°lidas y transferencia inicial de pose sin salto. Desplazamiento X desde reposo en el ensayo final: hiena 1,91 m, jabal√≠ 1,88 m, le√≥n 1,08 m, b√∫falo 0,35 m, rinoceronte 0,27 m. Estos valores no sustituyen pruebas con poses de correr/atacar ni otros puntos de contacto.

La fixture gr√°fica a√±ade ¬´Ensayar ragdoll f√≠sico¬ª y usa la malla y terreno de WorldScene. En una hiena desde caminar se observ√≥ ca√≠da y reposo: 1,33 m de desplazamiento, 14 cuerpos, p95 del paso f√≠sico 0,70 ms (una sola bestia; no comparaci√≥n de incursi√≥n). Evidencia `phase2/ragdoll-first-contact.json` y `.png`. **Defecto detectado y pendiente:** el muestreo de 7.859 v√©rtices encuentra penetraci√≥n m√°xima de 14,2 cm y 0,32 % de muestras a m√°s de 8 cm bajo el terreno. No se acepta todav√≠a el contacto visual como terminado. Ensanchar indiscriminadamente todas las c√°psulas impidi√≥ estabilizar al jabal√≠ y se descart√≥; se mantiene cobertura adicional s√≥lo en cabeza. Se necesita ajustar colisionadores a las envolventes de skin por especie.

Pendientes: cobertura anat√≥mica por especie, l√≠mites relativos al reposo (las bisagras actuales se referencian a la pose de entrada), escenario completo/otros animales, impulso por punto de contacto, worker/pooling, recuperaci√≥n y reconciliaci√≥n l√≥gica, integraci√≥n de Attack y su timing, fallback al agotar presupuesto, v√≠deos y matriz gr√°fica/rendimiento completa. El ensayo congela expl√≠citamente la simulaci√≥n de juego: **no demuestra suspensi√≥n de IA en producci√≥n**.


## Correcci√≥n de contactos por especie

Se a√±adi√≥ ajuste de envolventes convexas desde los pesos y v√©rtices reales: un m√°ximo de 96 puntos de soporte por cuerpo, manteniendo c√°psula de reserva cuando no hay geometr√≠a suficiente. El c√°lculo se realiza al preparar el ensayo, nunca por paso f√≠sico; todav√≠a debe moverse al precalentamiento/cach√© de producci√≥n. Se conserva un margen de contacto de 2,5 cm. La captura actualiza tambi√©n la matriz inversa de uni√≥n de SkinnedMesh: actualizar s√≥lo matrixWorld dejaba un desplazamiento vertical anterior en el ajuste.

Se incorpor√≥ un lector GLB de geometr√≠a/skin para las pruebas: usa pesos, joints e inverseBindMatrices originales de las cinco especies. Despu√©s de ocho segundos de ca√≠da sobre suelo plano, todas se estabilizan; penetraci√≥n muestreada: hiena/jabal√≠/le√≥n/b√∫falo 0, rinoceronte 0,00116 m. La prueba falla a partir de 3 cm y comprueba separaciones entre articulaciones. No demuestra otras poses ni obst√°culos.

Repetici√≥n gr√°fica con una pose de caminar fija (fase 0,35), terreno real, hiena: 1,40 m de desplazamiento, reposo confirmado, 0 penetraci√≥n en 7.859 muestras, p95 del paso 0,90 ms. Evidencia `phase2/ragdoll-fitted-contact.json` / `.png`. El informe conserva los puntos usados para reproducir el ajuste. El pico fr√≠o inicial sigue requiriendo precalentamiento; no se presenta esta medici√≥n aislada como rendimiento de incursi√≥n. Las c√°psulas sobredimensionadas se descartaron porque elevaban el cuerpo y no estabilizaban correctamente. Esta correcci√≥n cierra el defecto observado en ese ensayo, no la matriz completa de colisiones.

Siguen pendientes recuperaci√≥n/levantarse, integraci√≥n de estados y posici√≥n l√≥gica, coordinaci√≥n temporal con Attack, escenario completo y otras especies/poses en pruebas gr√°ficas, worker/pooling y comparativa de rendimiento. La implementaci√≥n contin√∫a disponible s√≥lo en el ensayo QA.


## Recuperaci√≥n procedural por etapas (QA)

`src/rendering/beast-recovery.js` mezcla desde la pose f√≠sica exacta hacia una postura de apoyo/agachada y despu√©s a la animaci√≥n normal en 1,65 s. Incluye ajuste anal√≠tico de ambas piernas para orientar los pies hacia sus apoyos, activado despu√©s de incorporar el torso y retirado gradualmente al terminar. Se conserva la posici√≥n horizontal alcanzada; la fixture reconcilia el origen l√≥gico con la pelvis ca√≠da antes de mezclar, vac√≠a la ruta y libera los cuerpos f√≠sicos. La selecci√≥n de muestras de contacto incluye extremos por hueso (dedos, colmillos, pies) y se cachea por geometr√≠a; un muestreo uniforme hab√≠a omitido penetraciones en jabal√≠ y se sustituy√≥.

Prueba sobre las cinco mallas: inicio sin salto mayor de 3 cm, ra√≠z desplazada invariable durante recuperaci√≥n, devoluci√≥n de control al terminar, sin penetraciones detectadas en el muestreo de cada d√©cimo paso. M√°ximo desplazamiento de pelvis por paso de 1/60 s: hiena 3,58 cm, jabal√≠ 2,30 cm, le√≥n 3,34 cm, b√∫falo 3,94 cm, rinoceronte 6,33 cm (l√≠mite de prueba 8 cm). La primera versi√≥n de apoyo introduc√≠a un tir√≥n; se retras√≥ el ajuste de pies hasta que el torso se incorpora.

Validaci√≥n gr√°fica por avance manual en WorldScene con hiena desde caminar: fase de apoyo y posici√≥n final inspeccionadas, posici√≥n l√≥gica desplazada 1,33 m, 0 cuerpos f√≠sicos al finalizar y ning√∫n error de JavaScript. Capturas `phase2/ragdoll-recovery-brace.png`, `ragdoll-recovered.png` e informe `ragdoll-recovery.json`. La pose de apoyo se ha mejorado, pero a√∫n requiere revisi√≥n animada con otras especies y orientaciones; no se considera completada la calidad art√≠stica de toda la matriz. En ese terreno, el corrector vertical registra 4,47 cm al terminar frente al apoyo nativo: hay que resolver ese peque√±o ajuste en la transici√≥n de producci√≥n, no atribuirle ausencia absoluta de salto.

La recuperaci√≥n sigue conectada s√≥lo al ensayo QA, con controles de velocidad/pausa/avance f√≠sico. Pendientes: integraci√≥n de IA (suspender ataques y navegaci√≥n durante la secuencia), impacto sincronizado con Attack, validaci√≥n/reconciliaci√≥n contra obst√°culos al levantarse, golpes repetidos, retirada posterior y presupuesto de rendimiento. No se ha dado por terminada la funcionalidad.


## Primera integraciÛn en combate y coste de activaciÛn

El controlador `beast-combat-physics.js` ya conecta el solver con WorldScene y el paso real de Game.tick, antes de la IA de incursiones y trabajadores. Durante caÌda/recuperaciÛn, `magicDown` impide navegar, atacar estructuras y golpear trabajadores. La pelvis fÌsica actualiza la posiciÛn lÛgica; al terminar, se vacÌa la ruta y el comportamiento nativo contin˙a desde allÌ. Se liberan cuerpos al retirar la bestia, terminar la partida o cerrar la escena. Un segundo golpe durante la caÌda reutiliza los 14 cuerpos y conserva su pose. El runtime de Rapier se inicializa una sola vez, tambiÈn para el ensayo QA.

Se activan como m·ximo tres ragdolls. Cada actor activo todavÌa tiene su propio mundo fÌsico con un parche de terreno de 16 m y cajas conservadoras de estructuras/props cercanos. No se ejecuta fÌsica cuando no hay actores activos. La simulaciÛn contin˙a en el hilo principal: no se da por resuelta todavÌa la integraciÛn multihilo ni el pooling de mundos.

Primera medida gr·fica (Intel UHD, 1600◊900, una hiena, primer avance manual de 0,12 s): construcciÛn 63,4 ms y m·ximo paso 186,3 ms. Era un tirÛn inaceptable. Se precalienta ahora la ruta articulada/contactos durante la carga, cediendo ejecuciÛn cada ocho pasos, y se seleccionan/cachean por geometrÌa los vÈrtices de soporte de los colisionadores. La activaciÛn vuelve a deformar estos vÈrtices seg˙n la pose actual, sin recorrer toda la piel. RepeticiÛn: construcciÛn 7,5 ms, m·ximo paso 16,8 ms, paso posterior 0,4 ms. Son dos observaciones preliminares, no una comparaciÛn estadÌstica ni el coste total de fotograma. Evidencia: `phase2/combat-physics-cold.json` (transcripciÛn de la salida observada) y `combat-physics-warm.json` (estado QA guardado).

ValidaciÛn gr·fica: Attack real con Game.tick, hiena desde caminar, caÌda junto a vegetaciÛn, desplazamiento horizontal aproximado 2,1 m, incorporaciÛn y vuelta a caminar/atacar sin errores JavaScript. Capturas `combat-ragdoll-fallen.png` y `combat-ragdoll-getup.png`. GrabaciÛn nocturna actualizada con Attack, Shield, hiena, rinoceronte y golpes consecutivos; se inspeccionaron fotogramas de la grabaciÛn. Las pruebas automatizadas comprueban adem·s bloqueo de daÒo a trabajadores/IA, segunda descarga sin reiniciar pose y limpieza al quitar la incursiÛn. Las 48 pruebas dirigidas pasaron, asÌ como el build; el chunk Rapier ocupa 4,34 MB sin comprimir / 1,65 MB gzip.

**Pendiente antes de considerar completa esta integraciÛn:** sincronizar mejor apariciÛn/descarga/SFX con el impulso (la descarga anterior a˙n es inmediata); continuidad de un golpe durante la recuperaciÛn; diferir vocalizaciÛn de huida hasta levantarse; fallback contundente cuando se alcanza la capacidad (ahora conserva la reacciÛn anterior); restaurar la pose fÌsica en guardados (se conserva posiciÛn, pero se limpia un estado fÌsico sin controlador); colisiones entre bestias, puertas abiertas y detalle de pueblos/obst·culos; corregir el ajuste vertical final ya documentado; revisiÛn visual de todas las especies/direcciones/pendientes; perfiles anatÛmicos desde distintas poses y comparaciÛn de incursiones masivas. La nueva prueba no sustituye esos requisitos ni cierra el objetivo.


## Golpes durante incorporaciÛn y sonido de retirada

Un impacto durante el levantamiento vuelve a muestrear la pose procedural en el tiempo de simulaciÛn y reconstruye los cuerpos en el mismo mundo de colisiones. La captura ocurre antes de restaurar la pose animada, evitando el salto a erguido observado por inspecciÛn del cÛdigo anterior. Se conserva el origen lÛgico y el controlador vuelve a completar caÌda/recuperaciÛn. Pruebas a 0,15 / 0,65 / 1,40 s de incorporaciÛn: continuidad de cada hueso dentro de 0,1 mm / 0,001 rad, 14 cuerpos, mismo mundo y limpieza posterior. Esos umbrales comprueban la transferencia instant·nea, no la naturalidad de toda la animaciÛn.

ValidaciÛn gr·fica con hiena y Attack real durante `recovering`: capturas `phase2/rehit-before.png`, `rehit-after.png`, informe `rehit-after.json`; despuÈs de otro derribo completa la incorporaciÛn y contin˙a huyendo, sin errores y con m·ximo un Guardi·n. La cobertura gr·fica de esta interrupciÛn sigue limitada a hiena; las dem·s especies requieren la matriz pendiente.

La retirada ya no dispara sonido desde el evento histÛrico de resistencia agotada. AnimalAudio observa una fase silenciosa durante stun/caÌda/incorporaciÛn, cancela voces de ataque pendientes y reproduce la vocalizaciÛn una vez cuando comienza la locomociÛn de retirada, con posiciÛn y atenuaciÛn actuales. Se evita duplicar la lÛgica de sonido o cambiar los estados de la IA. Las pruebas de recarga/pausa y rutas por especie siguen pasando. La fixture gr·fica ahora ejecuta tambiÈn el observador nativo de audio, adem·s del procesador de eventos.

`phase2/rehit-audio.json` registra fuentes realmente aceptadas: ˙ltimo `hyena_hurt` a 3018,944 s en caÌda y ˙nico `hyena_retreat` a 3023,344 s en retirada, sin voces de huida durante la recuperaciÛn. El vÌdeo nocturno H.264/AAC se volviÛ a grabar con esa ruta, y se inspeccionaron sus fotogramas. La traza prueba el momento de reproducciÛn; no equivale a una evaluaciÛn auditiva de la mezcla. Pasan 73 pruebas dirigidas y el build. Siguen pendientes sincronizaciÛn del clÌmax/proyectil, viento sonoro, lÌmites y fallback, persistencia fÌsica, colisiones completas, ajuste vertical de salida, validaciÛn masiva y rendimiento.


## Reloj compartido para descarga, contacto y fÌsica

`guardian-timing.js` centraliza los marcadores de Attack: salida a 0,14 s, contacto a 0,24 s y estela residual de 0,28 s. El comando sigue gastando enfriamiento, reduciendo resistencia e interrumpiendo al objetivo inmediatamente. SÛlo la representaciÛn del golpe espera el vuelo breve. La activaciÛn fÌsica integra ˙nicamente la fracciÛn del paso posterior al marcador, evitando adelantar el impulso cuando un tick cruza el contacto. TambiÈn se bloquean encuentros con trabajadores durante el stun previo al ragdoll.

El Guardi·n se revela m·s deprisa para Attack, acumula energÌa en la mano y proyecta un n˙cleo con estela que llega al contacto antes de la onda y del derribo. La animaciÛn corporal acelera su extensiÛn hasta ese clÌmax. El tiempo visual parte del timestamp del evento, no del fotograma en que el renderizador lo recibe. La reacciÛn procedural de fallback usa el mismo marcador. Se corrige una diferencia de redondeo entre edad relativa y marcador absoluto que podÌa retrasar el anillo respecto a las fÌsicas.

La cola de sonidos usa tiempo de simulaciÛn, no setTimeout: mantiene el orden lanzamiento/impacto incluso si un fotograma cruza ambos marcadores, respeta pausas y descarta objetivos retirados, escenas sustituidas o sonidos atrasados. Mantiene el recorrido incremental del historial de eventos. En la primera grabaciÛn se detectÛ una vocalizaciÛn de daÒo descartada porque la descarga usaba el emisor de la bestia; se ha corregido para que el lanzamiento tenga emisor y posiciÛn del Guardi·n, sin ampliar lÌmites de voces.

Prueba gr·fica con avance de 20 ms: a 0,18 s hay proyectil en vuelo, sin destello y sin cuerpos fÌsicos; a 0,24 s aparecen juntos destello, voces de daÒo y ragdoll; a 0,36 s comienza el desplazamiento visible. Evidencia `phase2/attack-flight-018.*`, `attack-contact-024.*`, `attack-charge-012.png`, `attack-impulse-036.png`. Estas capturas preceden sÛlo al ajuste de emisor de audio; la geometrÌa y los marcadores son los mismos. Nueva grabaciÛn nocturna y traza `attack-timing-recording.json`: cinco voces de daÒo de hiena/rinoceronte admitidas, lanzamientos desde `guardian-world`, retirada posterior, sin errores, cero fÌsicas activas al terminar y m·ximo un Guardi·n. No se presenta la traza como evaluaciÛn auditiva ni benchmark de incursiones.

Pasan 105 pruebas dirigidas y el build. Una prueba antigua de precarga esperaba cinco sonidos por especie y omitÌa el hurt incorporado anteriormente: ahora verifica las URLs concretas, incluyendo daÒo, y la ausencia de decodificaciones repetidas.

Pendientes relevantes: una nueva magia que sustituye al Guardi·n antes de 0,24 s puede cortar la estela anterior aunque el impacto lÛgico/fÌsico siga ocurriendo; hace falta conservar esos VFX independientemente del ˙nico cuerpo. TambiÈn siguen abiertos el clÌmax especÌfico de las magias agrÌcolas, viento sonoro, fallback al presupuesto, guardados fÌsicos, colisiones completas, ajuste vertical al terminar get-up y matriz/perfilado de incursiones masivas. Esta iteraciÛn no cierra el objetivo.
