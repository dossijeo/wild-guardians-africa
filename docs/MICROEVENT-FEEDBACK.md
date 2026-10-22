# Feedback audiovisual y persecución

Los 40 microeventos usan sprites renderizados desde geometría 3D low-poly original y billboards dentro de la escena, con perspectiva y prueba de profundidad. Los nuevos VFX son originales, procedurales y reutilizan el atlas de Wild Guardians: no hay recursos externos ni licencias CC0 de terceros que atribuir.

## Movimiento de criaturas

Aves, luciérnagas, mariposas, escarabajo, langostas, insectos y espíritu tienen vuelo autónomo rápido, curvas y giros de retorno dentro de un volumen fijo del mundo. Velocidades objetivo configurables: 125–215 unidades locales/s (5,6–9,7 m/s antes del viraje, fuerzas y límite de velocidad); el recorrido medido es aproximadamente 79–107 unidades/s según el tipo. No siguen a la cámara. El movimiento reducido baja el desplazamiento al 45%. Se conservan hitboxes amplias y captura accesible manteniendo pulsado tras acertar el primer contacto. Son parámetros de jugabilidad, no cambios económicos.

## VFX

Se emiten al alcanzar tramos reales de progreso, duran 0,45 s y se desvanecen en su posición del mundo. Cada partícula genera como máximo tres elementos transitorios a la vez; comparten el único lote instanciado de capacidad 160. No crean luces, escaneos, geometría física ni llamadas al motor lógico. El hover reacciona físicamente pero no genera progreso ni recompensa. Cancelar limpia el lote.

| Familia | Reacción |
| --- | --- |
| Aves | Plumas cortas que se separan al espantarlas |
| Mariposas y recogibles | Pequeños destellos de contacto |
| Luciérnagas, espíritu, estrella, polen y motas | Luz suave y motas que se dispersan |
| Insectos, maleza, polvo, hojas y fragmentos | Bocanadas pequeñas de polvo |
| Nube, niebla, humo, fuego y tormenta | Volutas que se deshacen; el fuego además se reduce con el progreso |
| Granizo y gotas | Gotas pequeñas que saltan y se evaporan |

## SFX existentes conectados

Procedencia: biblioteca original del proyecto, catálogo `public/content/sfx.json` (banco v12) y rutas MP3/Opus existentes. No se modificaron los archivos de audio. `src/microevents/feedback.js` es la configuración autoritativa. Bus `world`, ganancia 0,35, políticas existentes de prioridad, volumen y silenciamiento. No se añaden bucles ni sonidos de aparición no solicitados.

| Evento | ID existente | Momento |
| --- | --- | --- |
| Semillas | `farm_seeds_drop` | Primer contacto deliberado, una vez por evento |
| Semillas | `eco_gain` | Completar, únicamente si se acredita una moneda real |
| Grano derramado | `farm_sack_handle` | Primer contacto deliberado con el grano y su saco decorativo |
| Maleza | `farm_plant_pull` | Primer contacto deliberado |
| Flor | `farm_harvest_pick` | Primer contacto deliberado |
| Semilla rara | `farm_seeds_drop` | Primer contacto deliberado, sin sonido de ingreso ficticio |
| Fragmentos de roca | `wall_debris_small` | Primer contacto deliberado, sin daño estructural |
| Luciérnagas, espíritu, estrella, polen, motas arcoíris | `spirit_touch` | Completar, una vez |

No se usa el antiguo `spirit_valid` genérico para dar sonido mágico a todas las criaturas. Tampoco se dispara `amb_birds`, `amb_insects`, `amb_rain` o viento como impacto: son bucles ambientales largos. La auditoría verifica IDs, rutas y bytes originales; esto no equivale a una sesión de escucha artística aprobada.

## Sonidos que puedes proporcionar

Los eventos sin una correspondencia convincente permanecen sin SFX específico. El feedback visual sí funciona. Preferimos clips breves, suaves, sin voces, sin música y sin cola larga; 2–3 variantes cuando corresponda. No se requiere ningún recurso nuevo para jugar.

| Eventos | Efecto necesario | Duración orientativa |
| --- | --- | --- |
| Aves | Aleteo corto de bandada al espantarla; gorjeo discreto opcional | 0,3–0,7 s |
| Mariposas | Aleteo muy ligero o roce suave | 0,2–0,4 s |
| Escarabajo, langostas, insectos | Zumbido corto con desplazamiento y retirada | 0,3–0,6 s |
| Termitas, hormigas, serpiente, visitante de madriguera | Cepillado/roce seco; salida de tierra para la madriguera | 0,2–0,5 s |
| Pluma, hojas doradas, hojas del suelo, restos de madera, semillas espinosas | Barrido de hojas/roce ligero con variantes | 0,2–0,5 s |
| Rocío, nube de lluvia | Tintineo/gota o salpicadura muy pequeña; no regadera completa | 0,2–0,6 s |
| Polvareda, remolino, ráfaga, niebla, humo, calor | Soplo breve o disolución suave | 0,3–0,7 s |
| Esporas, telaraña | Roce delicado/separación de fibras | 0,2–0,4 s |
| Fuego | Soplido de apagado y pequeño siseo; crepitar corto opcional | 0,3–0,8 s |
| Tormenta, aviso de rayo | Descarga amortiguada pequeña; el trueno de 6 s existente es excesivo | 0,3–0,8 s |
| Granizo | Golpecitos de hielo, sin rotura de edificio | 0,2–0,6 s |
| Rama | Roce/chasquido pequeño de madera, sin colapso | 0,3–0,6 s |

## Validación

84 pruebas dirigidas pasan, incluyendo movimiento autónomo, virajes, accesibilidad a 30/60/120 Hz, progreso/VFX y todos los IDs de audio cortos no cíclicos. Build de producción correcto. Las capturas `birds-fast-flight-a.jpg` y `birds-contact-vfx.jpg` muestran la integración actual; `pursuit-real-ui.json` conserva resultados reales y también intentos fallidos (objetivo en movimiento u oculto), sin debilitamiento del control de oclusión. Las 40 capturas/completados anteriores se conservan como evidencia anterior a este ajuste de vuelo, no como una repetición posterior. No se ejecutaron campañas ni se cambió el balance.

Rendimiento posterior a este ajuste: 400.000 muestras de simulación de partículas, 30 partículas por tipo, p95 = 0,0358 ms en Node. Excluye renderizado, escena y GPU; no representa FPS del juego. Informe: `qa/microevents/particle-feedback-cpu.json`.


La revisión posterior de [interacciones principales](MICROEVENT-INTERACTIONS.md) amplía la validación a 99 pruebas y a 40 resoluciones principales en escena. Las cifras de 84 pruebas y rendimiento de las secciones anteriores corresponden a la revisión inicial de feedback. Los clips ausentes de la tabla siguen documentados para su provisión por el autor.
