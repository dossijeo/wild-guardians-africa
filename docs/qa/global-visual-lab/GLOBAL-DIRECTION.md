# Decisión de dirección global

> Actualización de alcance (20/10/2026): la investigación prioritaria es ahora una **cubierta herbácea continua** en Sabana, no matas decorativas dispersas. La propuesta histórica de reutilizar pocas matas queda sustituida por el [objetivo vigente de cobertura A/B/C](continuous-grass/OBJECTIVE.md). El usuario permite estudiar cards con cutout si aportan una alternativa real; no se mantiene una prohibición general de esa representación. Las conclusiones anteriores se conservan como historial, no como criterio de éxito del nuevo ensayo.

Estado: 19 de octubre de 2026, rama experimental `codex/global-visual-lab`. Referencias: seis mockups proporcionados y capturas del renderer real. No se integra en main ni cambia la opción por defecto.

## Alcance y pausa del atlas

La prioridad es la escena completa: iluminación, integración de suelo/objetos, lectura de volumen y vegetación desde cámara normal. **Quedan en pausa el retoque minucioso del atlas del taller y su automatización.** Se conservan sus variantes, archivos fuente, comparaciones y límites; no se revierten ni se presentan como acabadas. Solo se retomarán cuando exista una dirección global visualmente convincente y con coste aceptable.

## Primera comparación y variante elegida para continuar

La dirección con mejor relación entre impacto visible y coste es **el relleno diurno del suelo y la lectura de sombras proyectadas**. El ensayo demuestra que parte del aspecto plano procede del relleno del suelo, más claro que el de los props. Cambiar ese relleno recupera sombras amplias sin geometría, atlas, texturas o draw calls adicionales.

No se adopta la sustitución literal del perfil de sombra sobre todo el suelo: enfría zonas soleadas, oscurece demasiado Volcanes y no afecta a la rama toon del Desierto. Es una dirección para continuar, no una solución terminada en seis biomas.

| Intervención | Resultado visual | Coste verificado | Decisión |
|---|---|---|---|
| Contacto aplicado también a luz directa | Prácticamente invisible desde cámara normal | Sin recursos nuevos; una lectura lógica adicional del mapa | Descartar |
| Relleno del suelo con paleta de sombra de props | Mejor volumen en Sabana, Gran Río y Cañón; beneficios desiguales | ABBA sin regresión observada en Sabana/Gran Río; recursos iguales | Continuar con alcance controlado |
| Placas de basalto horneadas en Blender | Parecen pavimento; pierden detalle y lectura nocturna | Tres mapas 1024²; geometría y draws de Volcanes iguales | Descartar |
| Vegetación adicional o sustituta de rondas previas | Matas insuficientes o identidad incorrecta; una prueba empeoró GPU nocturna | Regresión observada de +2,19 ms en matas bajas | No generalizar ni aumentar densidad sin una propuesta artística distinta |

## Coste real del candidato de iluminación

ABBA aislado, calidad media, 1280×720, semilla 712, cámara fija, 180 muestras por fase. Medias de dos repeticiones:

| Escena | GPU original → variante | CPU envío original → variante |
|---|---:|---:|
| Sabana día | 18,199 → 18,158 ms | 5,359 → 5,210 ms |
| Sabana noche | 19,023 → 18,693 ms | 5,016 → 4,917 ms |
| Gran Río día | 14,446 → 14,097 ms | 5,991 → 5,654 ms |
| Gran Río noche | 14,955 → 14,829 ms | 5,654 → 5,348 ms |

Presupuesto previo: +0 mapas/draws/geometría y máximo +0,5 ms GPU. Cumple en estos casos. Las pequeñas diferencias negativas no prueban aceleración; el shader no reduce trabajo y la noche es esencialmente idéntica. No hay medición GPU de los otros cuatro biomas, latencia de carga ni VRAM residente. No confundir el número de recursos con bytes residentes.

## Decisión por bioma

| Bioma | Lo que merece conservar de la dirección | Condición para continuar |
|---|---|---|
| Sabana | Sombras amplias bajo copas y objetos más legibles | Mantener el amarillo cálido de zonas al sol; no añadir grano uniforme |
| Gran Río | Mejor agrupación visual bajo árboles | Evitar que la sombra funda plantas pequeñas con el tapiz |
| Manglares | Algo más de profundidad | Resolver integración de bases/musgo sin oscurecer toda la isla; no reclamar raíces nuevas mediante textura |
| Volcanes | El ensayo no justifica el nuevo relleno | Conservar su versión anterior; el albedo azul y la escala de fractura requieren una propuesta distinta a placas regulares |
| Gran Cañón | Mayor separación de planos del relieve | Validar también cámara normal transitable: la fixture amplia tiene una pared dominante |
| Desierto | Sirve de control sin cambios | Su rama toon necesita evaluación propia; no afirmar que comparte el resultado del suelo físico |

## Siguiente revisión concreta

Preparar una variante QA que reduzca el relleno **solo donde existe sombra proyectada**, usando la cobertura ya calculada en el shader. Mantener iluminación del suelo soleado y noche originales. Evaluar primero si conserva el beneficio de volumen sin la pérdida de calidez; no realizar un barrido ciego de constantes. Volcanes y Desierto deben mantenerse como controles hasta que haya evidencia específica para modificarlos.

Antes de adoptar: repetir seis biomas, cámara normal y baja, día/noche con encuadre/semilla/hora iguales; revisar transición sol/sombra y cambios de cámara. Solo si mejora claramente, coordinar ABBA GPU y validar streaming/calidad. Mantener los mismos presupuestos y documentar toda excepción.

## Evidencia revisable

- [Relleno: 48 capturas, evaluación artística y ABBA](ground-shade-coherence/README.md)
- [Sabana original](ground-shade-coherence/savanna-0-game-day.png) / [relleno candidato](ground-shade-coherence/savanna-ground-shade-coherence-game-day.png)
- [Gran Río original](ground-shade-coherence/grand-river-0-game-day.png) / [relleno candidato](ground-shade-coherence/grand-river-ground-shade-coherence-game-day.png)
- [Volcanes original](ground-shade-coherence/volcano-0-game-day.png) / [relleno candidato](ground-shade-coherence/volcano-ground-shade-coherence-game-day.png)
- [Contacto: 48 capturas y descarte](ground-contact-integration/README.md)
- [Basalto: 48 capturas, Blender y descarte](basalt-plates/README.md)

144 capturas de esta ronda, no 144 escenas de campaña. Son fixtures del renderer real; no equivalen a navegación o combate. Build correcto de 402 módulos en `54e3e0fd`; los cambios siguientes son QA/documentación y conservan runtime original.

## Pase de relleno restringido a sombras

[48 capturas y ABBA](ground-shadow-fill/README.md): mejora localizada visible sin enfriar el suelo soleado; noche idéntica en los biomas modificados. Se conserva como candidato QA, sin adoptarlo todavía: la ronda de Sabana diurna supera el presupuesto GPU y requiere una medición más estable. Gran Río y Cañón pasan el umbral en esta ronda, sin probarlo para todo el juego. Los seis mockups originales están localizados en [ART-REFERENCES.md](ART-REFERENCES.md).

La inspección de Cañón confirma que reforzar sombras de objetos no resuelve las del relieve: el terreno residente recibe sombra pero no la proyecta. Se prepara un experimento separado, `qa-terrain-shadow-volume.js`, reutilizando geometría y el pass existentes; todavía sin decisión de adopción ni coste aprobado.

## Revisión de campaña y nuevos candidatos (20/10)

- [Partidas reales pausadas](campaign-shadow-review/README.md): 18 capturas de Sabana, Gran Río y Cañón desde el menú, sin entidades artificiales; cámaras estables por pareja y sin errores de red/JS registrados.
- [Sombras de relieve](terrain-shadow-volume/README.md): beneficio claro en Cañón, no en las vistas de Sabana/Gran Río. Pendiente benchmark de cada pass y streaming; no activado globalmente.
- [Repetición del relleno en misma página](ground-shadow-fill/PAIRED.md): el salto diurno de Sabana no reaparece; Cañón nocturno supera por poco el umbral. Mantener incertidumbre, no afirmar aceleración.
- [Cojines de hierba](grass-cushions/README.md): fuente Blender y 8 capturas; descartados por poca presencia visual para +151.140 triángulos. No aumentar densidad del piloto. Se necesita una propuesta conjunta de suelo y masas de vegetación.

La opción integrada `?visualLab=global-lighting` conserva el relleno local y añade casters de terreno solo en Cañón. Build y 20 pruebas existentes pasan; [capturas de integración y recorrido de chunks](global-lighting-integrated/README.md). Es una opción de evaluación, no una declaración de calidad final. Se documenta explícitamente el coste nocturno de terreno por encima del presupuesto previo y el borde de fixture también presente en la referencia.

## Pase de paleta volcánica y estratos (20/10)

Se conserva [carbón volcánico](volcanic-charcoal/README.md) únicamente en la opción experimental: reduce el azul del suelo hacia roca neutra cálida, sin recursos adicionales. ABBA QA diurno: 14,416 → 14,424 ms GPU; la deriva nocturna impide concluir sobre rendimiento a partir de su media. La noche y la escala del relieve siguen pendientes. La ruta integrada coincide visualmente con el candidato.

Se elimina la selección de bioma por fragmento del relleno integrado, usando constantes de material; 24 capturas confirman conservación de apariencia. El benchmark de uniformes es histórico, no prueba de coste de la revisión actual. [Estratos del Cañón](canyon-bedding/README.md) descartados: no mejoran el volumen y añaden discontinuidades visibles.

La siguiente intervención artística debe concentrar geometría vegetal legible en masas y distancias útiles, con culling y presupuesto explícito, coordinada con la lectura del suelo. No repetir una distribución uniforme de matas casi invisibles. Ninguno de estos pases alcanza todavía la calidad de los seis mockups.

La [ronda integrada de paletas constantes](global-lighting-integrated/CONSTANT-PERFORMANCE.md) confirma que queda trabajo de coste: Sabana y Cañón diurno superan +0,5 ms GPU. No se promociona la opción a comportamiento por defecto ni se da por aprobado el presupuesto global. Se corrigió además una colisión de claves de caché entre biomas introducida al usar constantes de material (prueba que falla antes y pasa después).

[Islas de hierba visible](grass-islands/README.md): la selección por cámara reduce la geometría adicional a 18.540 triángulos en la vista normal y 26.280 en la baja, pero los tallos angulosos no alcanzan la dirección artística. Descartada la malla; el ahorro no constituye aprobación visual ni benchmark GPU. Fuente Blender, ocho capturas y límites de la prueba conservados.

## Agua: superficie y coste (20/10)

El [diagnóstico de agua](water-route-audit/README.md) confirma que el material procedural sí cubre la charca; no hace falta cambiar su geometría. Las [normales irregulares](water-surface/README.md) mejoran la lectura en 48 capturas de seis biomas y 32 vistas adicionales con animación visual, pero el coste supera el presupuesto en varias vistas. Eliminar el dibujo residual de bandas conserva el aspecto y da resultados de coste mixtos: [prueba sin bandas](water-surface-lean/README.md). Pendiente evaluar el mapa compartido de pendientes y partidas reales antes de integrar. La calidad global, las orillas y la vegetación siguen incompletas.

Se conserva el [agua con mapa de pendientes compartido](water-integrated/README.md) dentro de `global-lighting`: 48 capturas integradas, 16 de partidas reales y prueba de streaming/origen. El ABBA del candidato con mapa queda dentro de +0,5 ms en las ocho fases de cuatro biomas (máximo +0,250 ms), con deriva documentada. Una textura nominal de ~171 KiB con mipmaps sustituye el cálculo irregular por fragmento; los nuevos chunks comparten el recurso y se libera una vez al cerrar la escena. Build de 404 módulos y 23 pruebas pasan. Esto no resuelve las orillas, la lectura nocturna ni el coste total pendiente del relleno/sombras globales.

## Vegetación externa CC0 (20/10)

[Hierba Kenney adaptada en Blender](kenney-grass/README.md): ocho capturas comparables de día/noche. Malla cerrada de 512 triángulos, 103/128 instancias visibles y un draw adicional; +52.736/+65.536 triángulos. Descartada por lectura demasiado cuadrada y arbustiva. No integrada ni aprobada por rendimiento temporal. Se conservan fuente CC0, licencia y auditoría; buscar hojas más finas y masas coherentes con el suelo antes de aumentar densidad. El objetivo global sigue pendiente.

[Filtrado de frecuencia del suelo](ground-frequency/README.md): 48 capturas, 24 parejas verificadas. Filtrar conjuntamente albedo/normales/ARH reduce ruido pero produce desenfoque y manchas blandas, especialmente en Sabana y Gran Río. Descartado; no integrado. Sin geometría/draw/textura adicional, sin aprobación temporal GPU. Separar contraste cromático de normales y oclusión en el siguiente ensayo.

[Normales al 45 %](ground-normal-balance/README.md) y [normales al 160 %](ground-normal-rich/README.md): 32 capturas de Sabana/Gran Río. El primer extremo aplana el tapiz; el segundo enfatiza la paja sin crear masas vegetales. Ambos descartados, valor original conservado. El siguiente pase debe abordar geometría fina y distribución, no seguir ajustando únicamente la intensidad de normales. Contadores y variaciones entre cargas documentados; sin aprobación temporal GPU.

[Matas de hojas finas](grass-fine/README.md): fuente Blender cerrada de 72 hojas, ocho capturas y benchmark de visibilidad en la misma escena. Lectura más fina, todavía poca cobertura. +118.656 triángulos en juego; GPU día +0,300 ms, noche +3,196 ms y repetición BAAB +1,192 ms. No integrada por coste. Se conserva la forma para reducir geometría/material antes de ampliar cobertura; no repetir simplemente mayor densidad.

[Hierba fina reducida](grass-fine-lite/README.md): mismas 72 hojas y posiciones, 720 frente a 1.152 triángulos por mata (-37,5 %), apariencia similar en cámara baja. Se conserva como base de investigación, no integrada. GPU ABBA día/noche +0,990/+0,137 ms; BAAB -0,474/+0,916 ms, variación documentada. El presupuesto sigue sin aprobar; aislar material antes de aumentar densidad.

[Material difuso de hierba](grass-diffuse/README.md): ocho capturas y comparación ABBA de materiales sobre idéntica geometría. GPU -0,258 ms día/+0,240 ms noche; no prueba ventaja consistente. Material actual conservado. La siguiente prueba debe reducir segmentos a distancia mediante niveles de detalle, preservando curvatura cercana; no aumentar densidad ni aprobar presupuesto con estos datos.

[Hierba con dos niveles geométricos](grass-lod/README.md): 29.664 triángulos adicionales en juego frente a 74.160 del piloto reducido; 42.480 en baja. Ocho capturas, seis vistas de transición y población sin duplicados. GPU ABBA +1,568 ms día/+0,238 ms noche: no integrado, presupuesto pendiente. El lateral expone brillo excesivamente claro del suelo a contraluz; siguiente prioridad: aislar respuesta especular del terreno antes de añadir complejidad vegetal. No dar por resuelta la transición abrupta de LOD.

## Suelo mate a contraluz (20/10)

Se conserva [rugosidad mínima seca 0,86](ground-roughness/README.md) en global-lighting para Sabana, Gran Río y suelo de Cañón: elimina buena parte del reflejo blanquecino sin borrar fibras, normales ni sombras. 72 capturas QA, [36 integradas y 12 de campaña](roughness-integrated/README.md); streaming de los tres biomas y 18 pruebas pasan, build correcto. No añade draw calls, triángulos ni texturas. GPU lateral: Sabana +0,380/+0,043 ms día/noche; Río +0,113/-0,210; Cañón -0,476/+0,848, repetición nocturna -0,289. Variación temporal documentada, no garantía de coste cero ni aprobación del presupuesto global. Renderer por defecto, musgo, volcán y Desierto sin este ajuste. Calidad de mockups todavía pendiente.

[Respuesta de cielo en paredes](canyon-sky/README.md) y [suavizado de normales compartidas](canyon-normal-smooth/README.md): 24 capturas de Cañón. El primer ensayo resalta triangulación regular; el segundo la atenúa, pero mantiene bandas planas. Ambos descartados, sin cambios runtime. Normales: 23.243 vértices modificados en 15 mallas, posiciones y colores verificados intactos. Evaluar material rocoso proyectado sobre las paredes, no repetir un barrido de intensidades de luz.

[Rock035 proyectado en paredes](canyon-rock-texture/README.md) y [color con normales](canyon-rock-normal/README.md): 24 capturas, cero triángulos/draw calls adicionales y una/dos texturas. Descartados: grano fino sin fracturas ni capas amplias; las bandas siguen planas. Fuente existente identificada y licencia CC0 verificada en ambientCG. Buscar roca estratificada a escala mayor, sin intensificar este mapa ni cambiar siluetas. Sin benchmark temporal ni integración.

[Cliff Side estratificado CC0](canyon-stratified/README.md): doce capturas y seis parejas verificadas. Las grietas ya se leen, pero persisten bandas y aparece discontinuidad al horizonte. GPU ABBA lateral +2,040 ms dia/+1,432 noche, dos texturas, cero draw calls/triangulos extra. Piloto no integrado. Reducir lecturas y resolver continuidad antes de nueva evaluacion; conservar fuente, licencia y hashes.

[Proyeccion dominante con continuidad](canyon-dominant/README.md): reduce cuatro lecturas a dos y aplica roca tambien al horizonte y chunks nuevos. 12 capturas finales y 12 del primer intento descartado; recorrido 0/+96/-96 m verifica claves de chunks diferentes y todos los materiales conectados. GPU ABBA +0,724 ms dia/+0,696 noche: todavia no integrado. Las bandas claras siguen dominando; aislar aporte de normales y color antes de optimizar mas.

[Aislamiento de normales](canyon-color-only/README.md): las grietas permanecen con una textura menos; 12 capturas, aporte normal pequeno en estas vistas. GPU frente a global-lighting +1,531/+0,893 ms, sin ahorro temporal demostrado. [Franjas atenuadas](canyon-soft-bands/README.md): 12 capturas finales mas 12 del intento con anclaje inactivo documentado. Mejora la jerarquia de grietas/franjas; GPU -0,066/+0,461 ms en otra ronda con deriva. Conservar candidato para campana y angulos adicionales, no integrado ni aprobado globalmente.

## Roca de Canon integrada (20/10)

Se conserva [color estratificado con franjas atenuadas](canyon-integrated/README.md) dentro de global-lighting: una textura compartida entre terreno/horizonte, sin mapa normal externo, sin geometria extra. 72 capturas de seis biomas, 12 de campana integrada y 12 del piloto; streaming 0/+96/-96 m, propiedad/liberacion y 12 pruebas pasan. Build correcto. Coste del candidato equivalente -0,066/+0,461 ms GPU con deriva documentada; esta ronda integrada verifica aspecto y contadores, no nuevo benchmark temporal. Renderer por defecto y otros biomas sin nueva textura. Calidad global, vegetacion, lectura nocturna y presupuesto conjunto siguen pendientes.

[Legibilidad nocturna compartida](night-readability/README.md): 72 capturas, 36 parejas, cero recursos/draws/triangulos extra. Uniforme 1,12 -> 1,55 ayuda modestamente en cinco biomas; Desierto mas marron sin mejora convincente, descartado alli. GPU nocturno ABBA -0,087 a +0,396 ms con variacion; dia practicamente identico. Conservar candidato para campana/transicion, no integrado. Volcanes y plantas oscuras siguen pendientes.

## Noche por bioma integrada (20/10)

Se conserva [intensidad nocturna 1,55 en cinco biomas](night-integrated/README.md) dentro de global-lighting; Desierto y renderer por defecto quedan en 1,12. 48 capturas de campana integrada, 48 del piloto y 216 muestras numericas de transicion verifican alcance y curva nocturna intacta. Sin recursos, geometria ni instrucciones shader nuevas. Siete pruebas y build pasan. GPU del piloto -0,087 a +0,396 ms con variacion; sin nuevo benchmark temporal integrado. Volcanes, cultivos pequenos, vegetacion 3D y presupuesto conjunto siguen pendientes.

## Matas 3D agrupadas (20/10)

[Grass clumps](grass-clumps/README.md): candidato Blender de 360 triangulos por mata, 192 instancias, 24 capturas validas Sabana/Gran Rio dia/noche y tres camaras. +1 draw, +69.120 triangulos, sin texturas; GPU ABBA +0,186 a +0,703 ms con deriva. Dos ensayos previos archivados: tratamiento generico y reconstruccion nativa que excedia el limite. El pase final aisla callbacks y comprueba capacidad. Conservar modelo para desarrollar distribucion/streaming; no integrar el modulo QA ni declarar alcanzada calidad global.

## Distribucion de matas con streaming (20/10)

[Grass streaming](grass-streaming/README.md): el piloto sigue chunks y eventos de ocupacion, con 192 instancias y transiciones de escala. 24 capturas antes/despues a 0/+288/0 m en Sabana y Gran Rio; mantiene matas donde la instantanea anterior se vaciaba. Pruebas de ocupacion, capacidad y liberacion pasan. GPU incremental +0,217 a +0,475 ms; seleccion durante movimiento optimizada de ~1,2 a 0,54-0,59 ms medios. Conservar para campana y revision de transiciones; no integrado, otros cuatro biomas y presupuesto conjunto pendientes.

## Matas en campana nativa (20/10)

[Grass campaign](grass-campaign/README.md): 24 capturas finales y cuatro videos dia/noche en Sabana/Gran Rio. La campana detecto incompatibilidad con field.moisture y exclusiones incompletas. El piloto ahora lee la mascara RGBA nativa y las huellas existentes: cero invasiones de edificios o desgaste alto entre 5.747 candidatas por bioma. Dos rondas intermedias archivadas. GPU real de campana +0,348 a +1,313 ms con deriva: no promover las 192 matas actuales. Conservar compatibilidad/distribucion y mejorar forma/coste del modelo; calidad global y otros cuatro biomas pendientes.

## Forma de matas arqueadas (20/10)

[Grass arched](grass-arched/README.md): conservar candidato Blender de 15 hojas, 240 triangulos y 150 vertices exportados (antes 360/868), GLB 8.008 bytes sin texturas. 32 capturas finales de campana y cuatro videos en Sabana/Gran Rio; 16 parejas con camara/poblacion coincidentes. GPU de visibilidad -0,073 a +0,420 ms, con variacion y sin comparacion temporal directa contra el modelo anterior. [Grass broad](grass-broad/README.md) descartado por aspecto de listones. Siguiente pase: distribucion menos regular y adaptacion a los otros cuatro biomas; todavia no integrado ni calidad global alcanzada.

## Distribucion por seis biomas (20/10)

[Grass biomes](grass-biomes/README.md): 48 capturas finales de campana y 48 iniciales, grupos irregulares y paletas/densidades por bioma. Auditoria de todas las candidatas sin invasiones de fluidos, pendientes excluidas, desgaste alto o huellas. Benchmark de seis biomas: 48 bloques de 180 muestras; diferencias GPU -0,153 a +0,824 ms con variacion. Conservar distribucion irregular y Volcanes dorado como candidatos; descartar perfil de Manglares por aporte pequeno y coste diurno. Canon/Desierto mantienen presencia escasa. No integrado. Siguiente prioridad: volver al suelo/relieve del Desierto y volumen/sombras del Canon; Manglares necesita cobertura de hoja ancha. La ruta antigua de material del Desierto usa normalAmount .010 y es una hipotesis concreta para probar, no un cambio ya hecho.

## Relieve del Desierto: pilotos descartados (20/10)

[Normales amplificadas](desert-normal/README.md), [ondulaciones uniformes](desert-ripples/README.md) y [ondulaciones suaves](desert-ripples-soft/README.md): 36 capturas reales, 18 parejas verificadas, sin geometria adicional. La primera variante aporta motas; la segunda franjas demasiado regulares; la tercera mejora la discrecion pero apenas aporta volumen en estas camaras. No integradas. Dos benchmarks ABBA estaticos documentan coste y deriva, sin aprobar presupuesto de campana. Siguiente prioridad: sombreado amplio y sombras del terreno, incluyendo una camara fuera del poblado; no seguir aumentando solo microdetalle. Calidad global de los seis mockups pendiente.

## Luz gradual del Desierto (20/10)

Se conserva [la rampa de luz suavizada](desert-soft-light/README.md), con [integracion opt-in](desert-light-integrated/README.md) en terreno y horizonte del Desierto. Las bandas discretas eran la causa de los cortes amplios de color; suavizar sus transiciones mejora el volumen sin cambiar paleta ni geometria. 24 capturas piloto incluyen dunas fuera del poblado. GPU ABBA +0,014 ms dia/+0,113 noche, con deriva y sin aprobar el presupuesto global. No se combinan los pilotos anteriores de micrograno/franjas. La integracion se valida con seis biomas, dia/noche, streaming y pruebas de alcance. Arena fina, vegetacion y calidad global siguen pendientes; retomar despues el volumen/sombras de Sabana, Gran Rio y Canon.

## Filtro de sombras mas amplio (20/10)

[Disco de nueve muestras](ground-shadow-disk/README.md): 24 capturas comparables y 24 bloques ABBA en Sabana, Gran Rio y Canon. Bordes mas suaves con las mismas nueve consultas y sin geometria adicional; aporte global pequeno y Gran Rio diurno supera +0,5 ms en esta ronda. No integrado; movimiento y calidad baja/alta pendientes antes de reconsiderar. Priorizar vegetacion 3D y contacto local sobre mas desenfoque de sombras. [PR #159 en borrador](REVIEW.md), sin fusion y con alcance historico documentado.

## Sombras de matas arqueadas (20/10)

[Grass contact](grass-contact/README.md): 36 capturas, 18 parejas con matas identicas, 24 bloques ABBA de campana con cache solar desactivada. GPU incremental -0,148 a +0,421 ms con variacion; auditoria de todos los pases confirma +1 draw y 240 triangulos por instancia en cada actualizacion. No integrado: beneficio cercano discreto y casi nulo en Canon. Los contadores habituales de ultimo pase no incluyen sombras; la auditoria separada evita presentarlos como coste cero. Prioridad siguiente: forma y cobertura de las masas vegetales con el mismo presupuesto, antes de mas instancias o ajustes globales del sesgo solar.

## Hojas adicionales con triangulos acotados (20/10)

[Grass dense](grass-dense/README.md), 24 hojas/240 triangulos, descartado por tiras rigidas. [Grass mixed](grass-mixed/README.md), 19 hojas/238 triangulos, conserva algunas curvas pero no mejora claramente la masa. 16 capturas cercanas de campana en total, modelos Blender cerrados y validacion glTF sin avisos. ABBA directo del combinado contra el original en Sabana/Rio, sin confundirlo con ocultar vegetacion. Mantener grass-arched; no integrado. Proxima prioridad: lectura del material/normales de la vegetacion existente a escala de juego, antes de otro barrido de cantidad de hojas.

## Follaje nativo fuera del poblado (20/10)

[Transiciones suaves](foliage-soft-light/README.md), 24 capturas y ABBA de tres biomas: aporte pequeno, Sabana diurna +0,566 ms; descartado. [Mayor normal del atlas](foliage-normal/README.md), 28 capturas incluido Rio con camara elevada: no crea detalle nuevo convincente; descartado sin benchmark temporal. Ninguno integrado. Las vistas +50/+30 m muestran masas vegetales nativas mas densas que el claro de aldea: mantener paisaje y aldea en QA antes de juzgar cobertura. No seguir amplificando el atlas existente; siguiente ensayo, detalle de hojas modeladas en Blender y horneado para el material de copas, sin alterar contornos. Calidad global pendiente.

## Relieve foliar horneado en Blender (20/10)

[Foliage detail](foliage-detail/README.md): fuente propia de 72 hojas cerradas, mosaico normal 512², sin nueva geometria en juego. 24 capturas reales y 12 parejas verificadas fuera del poblado en Sabana/Rio/Manglares. El efecto produce pequenas marcas angulosas en copas cercanas y es escaso a distancia; descartado. ABBA de 24 bloques: +0,119 a +0,771 ms GPU, con deriva, mas una textura nominal de 1,33 MiB. No integrado. Priorizar lectura amplia del terreno y masas vegetales; no continuar aumentando detalle fino de copas sin una mejora visual demostrada. Calidad global pendiente.

## Variacion amplia del color del suelo (20/10)

[Ground palette patches](ground-palette-patches/README.md): 24 capturas, 12 parejas verificadas en Sabana/Rio/Canon, dia y noche. Dos escalas de ruido tintan el albedo conservando fibras, normales y geometria. Cambia el cromatismo pero no mejora claramente el volumen: descartado. ABBA final incluye terreno y horizonte; una ronda interrumpida con selector incompleto se archiva como invalida. Deriva relevante; no interpretar diferencias negativas como aceleracion. Siguiente paso: recorrido real de las matas arqueadas conservadas junto a la iluminacion global, antes de promoverlas al modo experimental, manteniendo Manglares excluido hasta resolver coste/aporte. No mas acumulacion de microajustes sin ganancia visible. Calidad global pendiente.

## Recorrido real de matas y coste fuera de la aldea (20/10)

[Grass traversal](grass-traversal/README.md): seis recorridos de 576 m, 36 PNG y seis videos separados de las mediciones. Sabana/Rio/Canon recuperan candidatas y camara al volver, con bloques residentes correctos y maximo 192 instancias; sin errores. GPU total en movimiento ~15-22 ms de media y ~19-28 ms p95. Nuevo ABBA de paisaje: +0,474 Sabana dia, +0,557 Rio dia, +0,733 Canon dia (182 matas, frente a 21 en la vieja vista de aldea). Variacion entre bloques; ningun ahorro probado por diferencias negativas. Conservar forma/distribucion, pero no aprobar presupuesto ni integrar aun: siguiente ensayo, presupuesto visible menor y revision del verde nocturno de Canon. Interaccion real de construccion, calidades baja/alta y otros tres recorridos pendientes. Calidad global pendiente.

## Limite de 128 matas (20/10)

[Grass budget128](grass-budget128/README.md): 24 capturas y ABBA directo 192/128/128/192 en tres biomas, camaras de paisaje dia/noche. Cobertura cercana similar, perdida lejana; sin ahorro temporal consistente y tres casos diurnos mas lentos pese a menos triangulos. No promover como optimizacion. Timeout inicial de carga de Rio documentado; repeticion completa sin errores. Mantener 192 como control QA, no como presupuesto aprobado. Siguiente ensayo: aislar material/recepcion de sombras con igual numero de instancias; revisar color seco por separado. Calidad global pendiente.

## Control de repetibilidad GPU (20/10)

[Grass repeatability](grass-repeatability/README.md): 32 bloques/5.760 muestras en Canon, A/A identico y ABBA BAAB de 192/128, dia/noche. Camara, matrices, cantidades y contadores invariantes en A/A; aun asi, rango entre bloques 2,135 ms dia/1,209 noche. La diferencia 128-192 cambia de signo respecto al pase previo (-0,171 dia/+0,548 noche). No demuestra ahorro ni lentitud intrinseca de 128. Informe anterior matizado. Siguiente ensayo: aislar recepcion de sombras en matas manteniendo modelo y cantidad, con controles y orden inverso; no usar un unico delta pequeno como veto o aprobacion. Calidad global y presupuesto acumulado pendientes.

## Relieve del suelo sin geometría: Sabana (20/10)

La petición posterior del usuario limita este pase al material del suelo; quedan en pausa los ensayos de sombras de matas y toda geometría adicional. [Ground POM](ground-pom/README.md) compara A original, B continua (equivalente: Sabana ya usa iluminación continua), C POM refinado y D microoclusión precalculada. Añade dos hipótesis de altura coherente E/F como diagnósticos descartados.

56 capturas verificadas, ocho clips de cámara, 9.600 muestras GPU en Intel UHD, calidades media/baja y día/noche. A/B y vuelta A2 idénticos; geometría, draw calls y entidades invariantes. La visibilidad solar forzada no altera un solo píxel nocturno. Contadores de shader: 3,615 lecturas de altura por fragmento de suelo cercano en A frente a 5,951 en C/D. GPU cercana diurna/media: 14,332 ms A; 16,340 C; 15,692 D; existe deriva entre controles idénticos.

**No integrar ni extender a otros biomas:** C reduce el escalonado, pero D no alcanza las acumulaciones del mockup. E parece moldeado y F pierde fibras. No está demostrada la procedencia física del ARH adaptado. El bake posterior de fibras conocidas mostró que una correlación baja entre gradiente de altura y normales no prueba desalineación; se retira esa interpretación fuerte. Hace falta un conjunto de mapas coherente antes de aumentar muestras o amplitud. Solo se publican herramientas, mapas QA y evidencia; comportamiento por defecto intacto. El objetivo global de calidad sigue sin alcanzarse.

### Viento y sombras de matas: 2026-10-20

[Prototipo de viento](grass-wind/README.md): candidato QA sobre las mismas 192 matas Blender, sin coste de geometría adicional frente al control estático. Presupuesto fino aún incierto. [Sombras dinámicas](grass-wind-shadow/README.md): descartadas; invalidar el mapa solar completo añade 22–44% GPU en la prueba de media y aporta poco en cámara normal. No activar por defecto; calidad global y streaming largo siguen pendientes.

### Paleta seca de las matas del Cañón (20/10)

[Canyon dry grass](canyon-dry-grass/README.md): perfil QA de Cañón pasa a tinte lineal [1,.68,.48], conservando forma/distribución y otros biomas. Doce capturas, cuatro retornos exactos, 1.920 muestras GPU. Mejora modesta de coherencia seca, no de volumen. Diferencias temporales cercanas desfavorables y deriva documentadas; no aprueba el coste acumulado ni integra la vegetación en producción.

### Corrección del callback de viento (20/10)

[Grass wind preserved](grass-wind-preserved/README.md): el piloto anterior reemplazaba AfricanToon; se corrige conservando callback y caché. Dieciséis capturas, ocho pares estáticos exactos, doce comprobaciones de identidad del shader y 3.840 muestras GPU. Se retira la aplicabilidad directa de los costes anteriores de viento/sombras a esta revisión. Baja/juego/noche +9,74%; presupuesto no aprobado. Hipótesis de transmisión archivada como prueba inactiva, no descartada artísticamente. Calidad global pendiente.

### Transmisión foliar en iluminación nativa (20/10)

[Grass translucency native](grass-translucency-native/README.md): parche activo de artLighting416, 36 capturas, seis controles nocturnos y doce retornos exactos, dos clips de cámara en Gran Río y 5.760 muestras GPU. Descartado: aclara caras sin ganancia clara de volumen y reduce contraste en Río. Sin recursos geométricos nuevos; coste variable y presupuesto no aprobado. No repetir aumentos de intensidad para forzar diferencia. La estructura de masas vegetales y el suelo siguen siendo la carencia principal.

### Bases cian en hierba seca (20/10)

[Native grass base](native-grass-base/README.md): raycasts identifican pintura del slot 8 sobre suelo seco, no agua del mundo. Máscara cromática limitada al material nativo conserva geometría e iluminación. Doce capturas y 3.840 muestras GPU; tres retornos exactos y cinco píxeles residuales en el cuarto. Mejora parcial de color, pero persisten las peanas circulares y restos cian. Conservar solo como candidato QA, sin aprobar coste (+6,45% media/juego/noche). Próxima investigación: transición material base/suelo; no más aumento de luz para corregir una discontinuidad de materiales. Calidad global pendiente.

### Transición material de bases al terreno (20/10)

[Native grass ground base](native-grass-ground-base/README.md): comparte textura de suelo en coordenadas de mundo, con variante adicional de iluminación continua, sombra y contacto. Mejora localizada frente a los discos pintados, especialmente de noche; persisten contorno naranja y falta de normales/POM/máscaras de terreno. Dieciséis capturas, cuatro retornos exactos, cuatro clips de órbita y 5.760 muestras GPU. Conservar como candidato QA sin activar: tres condiciones de la variante continua superan el 5%; no extender la receta incompleta. La calidad global y la transición completa siguen pendientes.

### Máscara por altura en bases de hierba (20/10)

[Native grass root mask](native-grass-root-mask/README.md): una sola componente conectada en el recurso; la máscara anterior excluía bordes inclinados y cian clasificado como follaje. La transición local 0,025–0,055 integra mejor la peana conservando geometría, pero tiñe raíces/piedras bajas. Dieciséis capturas con cuatro retornos exactos, cuatro clips y 5.760 muestras GPU. Candidato QA sin aprobar coste: dos condiciones superan +5% frente al original. Cerrar por ahora la iteración de este recurso y volver a suelo/vegetación a escala global en Gran Río y Cañón. No extender automáticamente los umbrales ni declarar alcanzada la calidad global.

## Cubierta continua de Sabana — 20/10/2026

El [piloto A/B/C](continuous-grass/README.md) sustituye la prioridad de matas aisladas. La cobertura opaca instanciada forma franjas continuas con viento y LOD, preservando los modelos originales. C media añade 212.704 triángulos y dos draws en cámara normal; C baja híbrida, 36.960 y un draw. Se entregan 48 capturas/control, dos vídeos, 8.640 muestras GPU Intel UHD, overdraw, memoria y streaming. Se conserva como candidato QA, sin opción por defecto ni extensión a otros biomas: todavía falta finura/agrupación orgánica comparable a la referencia y amortizar la activación. No fusionar.

## Cubierta continua: primer piloto de Gran Río

Tras conservar el resultado de Sabana y su viento 8×, se ha preparado un [piloto específico de Gran Río](continuous-grass-river/README.md): menor altura, pigmento verde y cobertura condicionada por humedad. Cuenta con 48 capturas y vídeos, pero sigue pendiente de benchmark GPU aislado y revisión de orillas/streaming. No se activa por defecto ni se generaliza a otros biomas.

## Actualización: cobertura, costes y regreso al Cañón

La cobertura de Sabana conserva el viento 8× aprobado. Gran Río dispone de [corrección de orillas](continuous-grass-river/shore-triangles/README.md) y [mediciones](continuous-grass-river/performance/README.md); la frase histórica de benchmark pendiente anterior ya no describe el estado actual. Las candidatas de LOD, continuidad de viento y normales siguen separadas. La [validación combinada](continuous-grass-river/combined-validation/README.md) y el [control intercalado](continuous-grass-river/interleaved-validation/README.md) no permiten promover por rendimiento: existe deriva incluso ejecutando la misma ruta en calidad baja. Se conserva la ruta original en baja y se cierran las repeticiones equivalentes en esta sesión.

En Gran Cañón, [textura al pie de pared](canyon-wall-foot/README.md) elimina una franja lisa, pero no mejora suficientemente el volumen global. Dieciséis capturas, ocho pares con cámara/entidades/draws/triángulos iguales y sin errores GL registrados. No integrar ni realizar otro barrido de intensidades; conservar evidencia. La primera cámara normal atravesaba una pared y se reemplazó antes de publicar. No se modifica geometría para imitar el mockup.

La calidad global continúa pendiente. Evitar confundir continuidad local de material o diferencias de píxeles con la estructura de masas y separación de planos de las referencias.


## Estado posterior: paleta del Cañón y materiales de Manglares/Desierto

El [relleno cálido de suelo en sombra del Cañón](canyon-warm-floor/README.md) se conserva como candidato QA reversible, con [comprobación de streaming](canyon-warm-floor/streaming/README.md), sin aprobar presupuesto global. La [revisión interactiva](global-candidate-review/README.md) reúne Sabana, Gran Río y Cañón; las coberturas mantienen viento 8× y no activan las variantes de LOD de coste incierto.

[Mangrove damp moss](mangrove-damp-moss/README.md) queda descartado: la máscara húmeda selecciona una región limitada y no aporta volumen apreciable. Se conservan Moss002 puro y barro independiente.

[Desierto: radiancia continua](desert-continuous-radiance/README.md) también se descarta como receta: 24 capturas de campaña y doce parejas verificadas muestran pérdida de dorado y facetas amplias persistentes. El diagnóstico confirma que la salida toon ordinaria de arena no consume la radiancia `lit` calculada previamente; no atribuirle mejoras por cambios en esa BRDF sin verificar la salida final. Mantener la rampa suavizada integrada. Sin benchmark temporal de esta receta rechazada; no repetir barridos de intensidad ni confundir cambio cromático con relieve. Calidad global pendiente.


## Cierre y reapertura de cobertura continua

[Lifecycle de cobertura](continuous-grass-lifecycle/README.md): fallo reproducido y corregido en Sabana/Gran Río conservados. El cierre ya no deja una instancia liberada como activa ni pisa callbacks posteriores. Doce ciclos completos en media/baja, 24 capturas día/noche; las reaperturas conservan cobertura y viento 8×, con diferencias residuales de hasta seis píxeles/un nivel RGB. Contadores de geometrías regresan al valor cerrado en cada ciclo. Es una corrección de fiabilidad del piloto, no una nueva aprobación de rendimiento o integración. Calidad global pendiente.


## Arena irregular CC0: nueva candidata del Desierto

[Aerial sand](desert-aerial-sand/README.md): 36 capturas en dunas, normal GL de Aerial Beach 01 a escala 30 m, conservando pintura cálida. Separar la normal geométrica para el detector de contorno elimina el punteado que producía el relieve fino. La variante final usa solo el mapa normal y conserva casi la misma imagen que la de dos mapas; se mantiene como candidata QA. 1440 muestras GPU de la receta intermedia muestran coste y deriva importantes, no aprobación. Pendientes coste de normal-only, cámara móvil, perfil bajo y streaming; no integrar todavía. No repetir variantes que usan la normal fina como contorno.


## Arena normal-only: activación segura y validación

[Validación](desert-aerial-sand/VALIDATION.md): se reproduce y corrige `glTexStorage2D: Texture is immutable` al activar después de noche. Reemplazo seguro del objeto de textura y actualización de uniformes; no mutar Source sobre memoria ya inicializada. Recorridos 0/144/288/0 en media/baja enlazan 25 materiales residentes y un horizonte; 40 capturas contando controles sin helper. Retornos con pequeñas diferencias adicionales cuantificadas, no identidad binaria. 2880 muestras GPU de la candidata final: baja diurna +.338 ms con poca deriva; media/noche aún variables. Mantener candidata QA, sin integrar. Siguiente puerta: cámara móvil y estabilidad de crestas, sin añadir geometría ni rebajar la mejora artística para pasar un contador.


## Arena en movimiento: comparativa controlada

[Cuatro vídeos](desert-aerial-sand/motion/README.md), media/baja y día/noche, de elevada a cercana y retorno. 484 parejas A/B coinciden en pose/hora/draws/triángulos tras corregir el harness por cargas asíncronas y caché LOD inicial. Los intentos no comparables se documentan y se excluyen. 308 parejas simétricas con geometría coincidente: 304 exactas, cuatro con hasta seis píxeles/un nivel RGB. No equivale a prueba universal de ausencia de aliasing ni a FPS real; mantener candidata QA y revisar presupuesto acumulado. Sin cambios de material en este pase ni activación general.


## Arena junto al poblado inicial

[Revisión de asentamiento](desert-aerial-sand/settlement/README.md): 24 capturas reales media/baja y día/noche, 12 parejas con cámara/hora/geometría iguales y sin errores. El volumen se aprecia entre edificios y conserva calidez; aparece un borde de camino más dentado en la vista normal. Antes de promover, aislar desgaste/máscara/iluminación en ese borde. No se repite rendimiento ni se integra la candidata; presupuesto media/noche y calidad global siguen pendientes.


## Arena seca: causa de la franja y corrección localizada

[Ablación](desert-aerial-sand/edge-ablation/README.md): 72 capturas comparables aíslan la franja dentada en la banda especular, no obligan a cambiar desgaste ni borrar normales. [Candidata seca](desert-aerial-sand/dry-specular/README.md): factor especular por suavidad al cuadrado, 24 capturas; ocho de doce vistas idénticas a normal-only y cuatro eliminan la franja conservando relieve. Sin geometría/pasadas nuevas; no hay aprobación temporal de coste. Mantener QA, pendiente movimiento y presupuesto acumulado; calidad global abierta.


## Arena seca: movimiento y contraste temporal

[Recorrido del poblado](desert-aerial-sand/dry-specular/motion/README.md): 484 parejas coinciden en cámara/hora/geometría; retorno reproducible con residuos mínimos compartidos por A/B. [Dos protocolos de coste](desert-aerial-sand/dry-specular/performance/README.md): 8.832 muestras válidas, serie larga e intercalación corta ABBA; sin errores ni regresión grande reproducida, pero dispersión impide certificar +0,5 ms media/noche. No reiterar esta microprueba hasta que pase. Siguiente contraste: cadencia de campaña real sin consultas GPU y coste acumulado del conjunto. La candidata no se integra todavía; objetivo de seis biomas abierto.

## Cadencia de campaña: controles corregidos

[Diagnóstico](desert-aerial-sand/dry-specular/campaign-settled/README.md): el tutorial avanzaba pese a la pausa QA y el horizonte podía incorporar materiales candidatos al control. Pausa existente de menú y estabilización previa corrigen ambos; 480 frames con estado/materiales residentes estables y cámara/geometría coincidentes. Pilotos archivados y excluidos. Serie completa corregida pendiente de cierre; no aprobar rendimiento ni integrar todavía.


## Arena seca: cadencia nativa completada

[Serie completa](desert-aerial-sand/dry-specular/campaign-final/README.md): 32 bloques, 7.680 frames con cámara/geometría/estado comparables, media/baja día/noche. No reproduce una penalización grande consistente; dispersión impide afirmar aceleración o certificar +0,5 ms GPU. Avanzar a integración opcional con carga y lifecycle propios, conservando original por defecto, y verificar paridad con helper/streaming. No repetir la serie esperando cifras favorables; conjunto global aún no aprobado.


## Arena integrada como opción explícita

[Integración](desert-aerial-sand/integration/README.md): `visualLab=global-lighting&sandRelief=1`, carga y dispose de BiomeGround. Doce parejas reales integración/helper: diez exactas y dos con un píxel/un nivel RGB; mismas cámaras y geometría. Once pruebas pasan. Original por defecto; pendientes streaming y lifecycle de esta nueva ruta antes de ampliar activación.


## Arena opcional: nuevos chunks y cierre

[Streaming integrado](desert-aerial-sand/integration-streaming/README.md): media/baja, 0/144/288/0m, día/noche. Los 25 materiales residentes y horizonte reciben receta; fuente y clon de normal se liberan una sola vez por cierre. Retorno con diferencias RGB pequeñas documentadas, no identidad. Pendientes reaperturas repetidas y revisión del conjunto; opción conservada sin cambiar defecto.


## Arena integrada: reapertura validada

[Seis ciclos](desert-aerial-sand/integration-reopen/README.md): tres por calidad media/baja, mismo documento sin reload, cierre por menú y nueva partida. Doce capturas; ocho comparaciones de reapertura idénticas RGB, misma geometría/cámara. Fuente y clon nuevos/liberados una vez en cada ciclo. No certifica fugas prolongadas. Conservar opción y volver a revisar el conjunto de seis biomas; no dedicar más rondas a microvalidar solo arena.


## Revisión conjunta actual de seis biomas

[Campaña comparada](combined-campaign-review/README.md): 72 capturas, 36 parejas de cámara/hora, tres vistas y día/noche media. Reúne iluminación, cobertura C viento8, Cañón cálido y arena. Sin nuevos benchmarks; coste geométrico de hierba explícito. Pendientes claros: borde de cobertura Río, suelo medio Cañón/Volcanes y repetición/bordes barro-musgo Manglares. Siguiente pase: integración visual de barro, respetando huella y reglas. No se acredita calidad global ni coste combinado.


## Manglares: recorte orgánico descartado

[Barro con borde irregular](mangrove-organic-mud-rim/README.md): 24 capturas, doce parejas sin cambios de cámara/geometría. Reduce el polígono visible pero conserva el salto de material y aspecto pegado. Descartado; no gastar presupuesto optimizando esta receta. Siguiente hipótesis: mezcla visual de color/normal/rugosidad en frontera, respetando contornos autoritativos.


## Manglares: frontera con mezcla material

[Mezcla barro/musgo](mangrove-mud-moss-blend/README.md): 24 capturas, doce parejas de cámara/geometría idénticas. La ruta común de suelo permite mezclar color/normal/rugosidad/AO sin recorte ni blending; transición más integrada. Interior más claro/húmedo, pendiente control. Preparación ingenua423–586ms acumulados: no promover; cachear cálculos duplicados antes de benchmark GPU. Candidata visual, sin aprobación global.


## Manglares: preparación reutilizada

[Caché y búsqueda acotada](mangrove-mud-moss-pruned/README.md): evita89977 evaluaciones repetidas inicialmente; preparación observada158–179ms frente423–460ms, sin atribuir toda diferencia a algoritmo. Once de doce capturas idénticas; cuatro píxeles residuales en una vista. Sigue QA; siguiente puerta visual: separar transición de aclarado/brillo interior antes de GPU/lifecycle.


## Manglares: conservar identidad del barro

[Control mate](mangrove-mud-moss-matte/README.md) reduce destellos pero no resuelve el aclarado. [Interior toon](mangrove-mud-moss-toon-interior/README.md) conserva respuesta estilizada hacia dentro y mezcla con suelo en borde; recupera color terroso sin cortar transición. 48 capturas entre ambos ensayos,24 parejas coincidentes en cámara/geometría, sin errores. Elegir interior toon para coste/movimiento; pendiente reutilizar lectura duplicada, GPU y lifecycle. No integrado.

## Manglares: ciclo QA y optimización descartada

Recorrido, descarga y normal única documentados en [motion](mangrove-mud-moss-toon-interior/motion/README.md) y [streaming](mangrove-mud-moss-toon-interior/streaming/README.md). La [rama de iluminación interior](mangrove-mud-moss-interior-branch/README.md) conserva doce capturas exactas, pero32 bloques no demuestran ahorro consistente: descartada. Mantener mezcla anterior solo QA; volver al corte de cobertura y color en Gran Río antes de nuevas micropruebas de barro. Calidad global aún no acreditada.

## Presupuesto conjunto: no promover todavía

La [revisión V2](combined-campaign-review-v2/README.md) reúne las candidatas de Río, Manglares y Cañón en seis biomas y dos calidades. El [benchmark en campaña baja](combined-campaign-budget/README.md) completa48 bloques ABBA,5.760 muestras GPU y8.640 frames de cadencia, con paridad de cámara/geometría y sin errores registrados. Manglares presenta una señal de mayor coste; Sabana ya excede el presupuesto de16,7ms en varios bloques. Los controles sin cambios también fluctúan sustancialmente: no atribuir cada delta al material ni anunciar aceleraciones. Mantener candidatas QA, inicio original intacto. Siguiente prioridad: reducir coste de cobertura de Sabana conservando continuidad visual y simplificar mezcla de Manglares; no repetir esta serie sin una hipótesis nueva.

## Sabana: no recortar cobertura sin atribución de coste

La [prueba de aislamiento](savanna-coverage-cost-isolation/README.md) cambia la prioridad anterior: ocho bloques ABBA,960 muestras GPU y1.440 frames muestran que desactivar la cobertura no elimina los picos ni produce una mejora consistente. Solo añade39.008 triángulos/un draw frente a1.235.913 triángulos ya enviados sin ella; no interpretar esa proporción como tiempo GPU. Seis parejas reales confirman pérdida visible de volumen al quitarla. Conservar densidad y viento; siguiente acción: atribuir el coste restante por materiales/objetos antes de reducir calidad. No acredita aún presupuesto estable ni calidad global.

## Sabana: eliminar envío fuera del encuadre

La [atribución por draw](savanna-draw-attribution/README.md) identifica lotes de objetos como origen de1,19millones de triángulos. La [candidata de frustum por instancia](savanna-instance-frustum/README.md), solo QA, reduce la vista normal a499mil sin cambiar modelos ni cobertura: cuatro capturas exactas y dos inversas con residuos pendientes. Ocho bloques ABBA muestran GPU diurna14,59–14,81→9,07–10,30ms; noche14,38–20,89→9,47–10,04ms. No extrapolar a toda campaña. Conservar candidata para medir movimiento, invalidación, streaming y seis biomas antes de integración. El objetivo artístico completo sigue pendiente.

## Frustum en movimiento: evitar subidas redundantes

[Recorrido y benchmark](savanna-instance-frustum/motion/README.md):70 de72 parejas RGB exactas; dos residuos localizados, causa pendiente.960 muestras GPU y1.440 frames revelan CPU aproximadamente1ms mayor y48 subidas de grupos/frame frente11, con p95 peor. No integrar la variante actual. Siguiente hipótesis: comprobar visibilidad al mover cámara, pero actualizar matrices/buffers solo si cambian selección u origen. Mantener cobertura y modelos; falta validación global.

## Selección estable y transiciones suaves

La [máscara de selección](savanna-instance-selection/README.md) reduce subidas de48 a unas14 por frame manteniendo geometría exacta; los tiempos se solapan, aún sin aprobación global.68 de72 pares RGB exactos, residuos pendientes. Conservar candidata QA.

El usuario propone suavizar ocultación cercana y paso impostor/3D. La [prueba MSAA](obstruction-msaa/README.md) elimina la cuadrícula8×8 pero4 muestras no producen un fundido continuo; no adoptar sola. Priorizar una transición limitada a instancias próximas que se ocultan y estudiar aparte la coordinación entre impostor y geometría. Mantener las optimizaciones independientes de estos cambios visuales.

## Fundidos de cámara: candidato con coste pendiente

El [fundido convencional](obstruction-blend/README.md) se descarta por superposición de caras internas. El [control de superficie cercana](obstruction-surface-blend/README.md) elimina el tramado y reduce esa acumulación, pero añade2–4 draws en poses afectadas y empeora GPU/CPU/cadencia en la serie móvil corregida.960 muestras GPU,1.440 frames; piloto de dt variable excluido por falta de repetibilidad. Mantener solo como candidato visual: pendiente vídeo, profundidad más barata, agua/transparencias, lifecycle e impostores. No activar globalmente ni cambiar main.

## Profundidad auxiliar reutilizada

[Material estándar de profundidad](obstruction-depth-only/README.md): ocho parejas exactas tras sincronizar opacidad.960 muestras GPU/1.440 frames, misma geometría por índice. GPU diurna15,83–16,08→14,70–15,17ms; noche y p95 no concluyentes. Conservar como base QA del fundido, no como aprobación global. Siguiente puerta: vídeo determinista y lectura de la silueta translúcida; después interacción con transparencias e impostores.

## Recorrido de ocultación sincronizado

[Vídeos día/noche](obstruction-fade-motion/README.md):180 parejas con cámara, viento y opacidad por instancia idénticos.119 exactas RGB, máximo3 instancias parciales/4 draws extra. La cuadrícula desaparece; persiste una silueta translúcida intermedia. Piloto con148 imágenes vacías por espera asíncrona tras render excluido; serie final verificada sin imágenes vacías. Candidato solo QA. Siguiente validación: agua/partículas, solapamiento de objetos y lifecycle; transición de impostores sigue independiente y pendiente.


### Precondición real de la transición de impostores

El piloto de fundido con impostores detectó que la campaña actual usa sesión espacial y desactiva la ruta antigua incluso con la preferencia activada. Se añadió una comprobación que impide emitir comparativas sin adaptadores. [Diagnóstico y prototipo no validado](impostor-blend-pilot/README.md). No hay resultado visual ni de rendimiento atribuible a este candidato; falta una escena con identidades y cobertura coincidentes. El commit de vídeos de ocultación cercana `8d6bc2fa5` quedó publicado correctamente.


### Piloto de ocultación junto al río

[Gran Río, nueve poses de día y noche](obstruction-water-pilot/README.md): 18 parejas auditadas, 12 exactas, máximo dos instancias parciales y tres llamadas adicionales. Quita el tramado en la orilla; no acredita un cruce significativo sobre el agua ni composición transparente (el agua actual es opaca). Candidata aún de QA; partículas, superposiciones y ciclo de vida siguen pendientes.


### Descartada la profundidad compartida del fundido cercano

La [prueba transparente controlada](obstruction-transparent-probe/README.md) confirma oclusión opaca de elementos detrás de objetos parcialmente desvanecidos: 25.431 píxeles del marcador quedan totalmente bloqueados por los auxiliares. No promover la candidata de superficie cercana; esta decisión sustituye su recomendación provisional anterior. Resolverlo necesita composición/profundidad aislada y medición adicional, no solo quitar el tramado. El renderer original permanece intacto.


### Volcanes: ceniza por zonas

[Depósitos visuales de ceniza](volcanic-ash-pilot/README.md): 24 capturas, 12 parejas con geometría idéntica, y 8 bloques ABBA en Intel UHD. La separación de zonas suaves/rocosas mejora la variedad a distancia de juego; conservar como dirección QA, sin promover todavía. GPU diurna +~1 ms en medias agregadas, con solapamiento entre bloques. Pendientes menor coste, movimiento y streaming; no se añaden texturas, geometría ni draw calls.


### Ceniza volcánica: movimiento y regreso

[72 parejas y recorrido de streaming](volcanic-ash-motion/README.md) con cámara/geometría coincidentes, día y noche. Depósitos estables en la muestra de regreso tras cambio de origen; no RGB exacto (2.053 píxeles candidata, 3.361 original). Sin crecimiento monotónico de contadores en una vuelta; no equivale a validar fugas ni coste dinámico. Sigue pendiente optimización antes de promover.


### Ceniza precalculada en máscara existente

[Comparación procedural/máscara](volcanic-ash-mask/README.md): 24 capturas coincidentes en geometría, bajo error RGB medio y 8 bloques ABBA. Se reutiliza R del suelo volcánico sin tocar canales restantes ni datos del worker. Mejora GPU nocturna en esta serie, resultado diurno variable; conservar alternativa QA sin promover. Preparación CPU ~0,535 ms/máscara en Node, no latencia de streaming. Pendientes borde con horizonte, movimiento y coste de creación de chunks.


### Máscara de ceniza: preparación y recarga real

[72 parejas y streaming en navegador](volcanic-ash-mask-motion/README.md): máscara sin desplazamiento amplio en la muestra de regreso, residuales similares a procedural. 85 máscaras nuevas, 46,6 ms CPU acumulados (~0,55 ms por máscara), no tiempo por frame. Horizonte volcánico adicional ausente por diseño y en ejecución; corregida esa precondición, sin declarar validada una transición inexistente. Mantener alternativa de revisión; rendimiento diurno aún variable.


### Ceniza accesible en una partida normal del laboratorio

[Opción explícita integrada](volcanic-ash-review-option/README.md): `visualLab=global-lighting&volcanicAsh=procedural` o `volcanicAsh=mask`. Solo Volcanes; ausente por defecto. 36/36 capturas RGB exactas contra QA y modo desactivado anterior, 8 pruebas aprobadas y build correcto. Permite revisar sin interceptación de shaders; no es promoción a valor predeterminado ni conclusión de calidad global. PR #159 permanece abierta.


### Gran Río: continuidad de paleta en la cubierta

[Paleta de suelo aplicada a hojas](river-cover-palette/README.md): 24 capturas, 12 parejas y 8 bloques ABBA. Menor borde oscuro en la muestra media, con el mismo desgaste, instancias y triángulos. Solo tres constantes, sin nuevas muestras o recursos. Tiempos GPU solapados y noche candidata algo mayor: no afirmar aceleración. Conservar candidata visual para probar movimiento/LOD; no sustituir aún receta anterior.


### Paleta de Gran Río: movimiento y LOD

[144 parejas y benchmark móvil](river-cover-palette-motion/README.md), baja/media y día/noche. Misma geometría, selección y viento; el color aclara la cubierta sin resolver todo el borde lejano. GPU menor en esta serie, picos nocturnos no mejores uniformemente: conservar como ajuste cromático, no optimización. Apto para revisión explícita, sin sustituir aún el valor anterior.
