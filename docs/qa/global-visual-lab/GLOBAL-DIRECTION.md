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
