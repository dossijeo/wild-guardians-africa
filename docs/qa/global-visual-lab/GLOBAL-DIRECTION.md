# DecisiÃ³n de direcciÃ³n global

> ActualizaciÃ³n de alcance (20/10/2026): la investigaciÃ³n prioritaria es ahora una **cubierta herbÃ¡cea continua** en Sabana, no matas decorativas dispersas. La propuesta histÃ³rica de reutilizar pocas matas queda sustituida por el [objetivo vigente de cobertura A/B/C](continuous-grass/OBJECTIVE.md). El usuario permite estudiar cards con cutout si aportan una alternativa real; no se mantiene una prohibiciÃ³n general de esa representaciÃ³n. Las conclusiones anteriores se conservan como historial, no como criterio de Ã©xito del nuevo ensayo.

Estado: 19 de octubre de 2026, rama experimental `codex/global-visual-lab`. Referencias: seis mockups proporcionados y capturas del renderer real. No se integra en main ni cambia la opciÃ³n por defecto.

## Alcance y pausa del atlas

La prioridad es la escena completa: iluminaciÃ³n, integraciÃ³n de suelo/objetos, lectura de volumen y vegetaciÃ³n desde cÃ¡mara normal. **Quedan en pausa el retoque minucioso del atlas del taller y su automatizaciÃ³n.** Se conservan sus variantes, archivos fuente, comparaciones y lÃ­mites; no se revierten ni se presentan como acabadas. Solo se retomarÃ¡n cuando exista una direcciÃ³n global visualmente convincente y con coste aceptable.

## Primera comparaciÃ³n y variante elegida para continuar

La direcciÃ³n con mejor relaciÃ³n entre impacto visible y coste es **el relleno diurno del suelo y la lectura de sombras proyectadas**. El ensayo demuestra que parte del aspecto plano procede del relleno del suelo, mÃ¡s claro que el de los props. Cambiar ese relleno recupera sombras amplias sin geometrÃ­a, atlas, texturas o draw calls adicionales.

No se adopta la sustituciÃ³n literal del perfil de sombra sobre todo el suelo: enfrÃ­a zonas soleadas, oscurece demasiado Volcanes y no afecta a la rama toon del Desierto. Es una direcciÃ³n para continuar, no una soluciÃ³n terminada en seis biomas.

| IntervenciÃ³n | Resultado visual | Coste verificado | DecisiÃ³n |
|---|---|---|---|
| Contacto aplicado tambiÃ©n a luz directa | PrÃ¡cticamente invisible desde cÃ¡mara normal | Sin recursos nuevos; una lectura lÃ³gica adicional del mapa | Descartar |
| Relleno del suelo con paleta de sombra de props | Mejor volumen en Sabana, Gran RÃ­o y CaÃ±Ã³n; beneficios desiguales | ABBA sin regresiÃ³n observada en Sabana/Gran RÃ­o; recursos iguales | Continuar con alcance controlado |
| Placas de basalto horneadas en Blender | Parecen pavimento; pierden detalle y lectura nocturna | Tres mapas 1024Â²; geometrÃ­a y draws de Volcanes iguales | Descartar |
| VegetaciÃ³n adicional o sustituta de rondas previas | Matas insuficientes o identidad incorrecta; una prueba empeorÃ³ GPU nocturna | RegresiÃ³n observada de +2,19 ms en matas bajas | No generalizar ni aumentar densidad sin una propuesta artÃ­stica distinta |

## Coste real del candidato de iluminaciÃ³n

ABBA aislado, calidad media, 1280Ã—720, semilla 712, cÃ¡mara fija, 180 muestras por fase. Medias de dos repeticiones:

| Escena | GPU original â†’ variante | CPU envÃ­o original â†’ variante |
|---|---:|---:|
| Sabana dÃ­a | 18,199 â†’ 18,158 ms | 5,359 â†’ 5,210 ms |
| Sabana noche | 19,023 â†’ 18,693 ms | 5,016 â†’ 4,917 ms |
| Gran RÃ­o dÃ­a | 14,446 â†’ 14,097 ms | 5,991 â†’ 5,654 ms |
| Gran RÃ­o noche | 14,955 â†’ 14,829 ms | 5,654 â†’ 5,348 ms |

Presupuesto previo: +0 mapas/draws/geometrÃ­a y mÃ¡ximo +0,5 ms GPU. Cumple en estos casos. Las pequeÃ±as diferencias negativas no prueban aceleraciÃ³n; el shader no reduce trabajo y la noche es esencialmente idÃ©ntica. No hay mediciÃ³n GPU de los otros cuatro biomas, latencia de carga ni VRAM residente. No confundir el nÃºmero de recursos con bytes residentes.

## DecisiÃ³n por bioma

| Bioma | Lo que merece conservar de la direcciÃ³n | CondiciÃ³n para continuar |
|---|---|---|
| Sabana | Sombras amplias bajo copas y objetos mÃ¡s legibles | Mantener el amarillo cÃ¡lido de zonas al sol; no aÃ±adir grano uniforme |
| Gran RÃ­o | Mejor agrupaciÃ³n visual bajo Ã¡rboles | Evitar que la sombra funda plantas pequeÃ±as con el tapiz |
| Manglares | Algo mÃ¡s de profundidad | Resolver integraciÃ³n de bases/musgo sin oscurecer toda la isla; no reclamar raÃ­ces nuevas mediante textura |
| Volcanes | El ensayo no justifica el nuevo relleno | Conservar su versiÃ³n anterior; el albedo azul y la escala de fractura requieren una propuesta distinta a placas regulares |
| Gran CaÃ±Ã³n | Mayor separaciÃ³n de planos del relieve | Validar tambiÃ©n cÃ¡mara normal transitable: la fixture amplia tiene una pared dominante |
| Desierto | Sirve de control sin cambios | Su rama toon necesita evaluaciÃ³n propia; no afirmar que comparte el resultado del suelo fÃ­sico |

## Siguiente revisiÃ³n concreta

Preparar una variante QA que reduzca el relleno **solo donde existe sombra proyectada**, usando la cobertura ya calculada en el shader. Mantener iluminaciÃ³n del suelo soleado y noche originales. Evaluar primero si conserva el beneficio de volumen sin la pÃ©rdida de calidez; no realizar un barrido ciego de constantes. Volcanes y Desierto deben mantenerse como controles hasta que haya evidencia especÃ­fica para modificarlos.

Antes de adoptar: repetir seis biomas, cÃ¡mara normal y baja, dÃ­a/noche con encuadre/semilla/hora iguales; revisar transiciÃ³n sol/sombra y cambios de cÃ¡mara. Solo si mejora claramente, coordinar ABBA GPU y validar streaming/calidad. Mantener los mismos presupuestos y documentar toda excepciÃ³n.

## Evidencia revisable

- [Relleno: 48 capturas, evaluaciÃ³n artÃ­stica y ABBA](ground-shade-coherence/README.md)
- [Sabana original](ground-shade-coherence/savanna-0-game-day.png) / [relleno candidato](ground-shade-coherence/savanna-ground-shade-coherence-game-day.png)
- [Gran RÃ­o original](ground-shade-coherence/grand-river-0-game-day.png) / [relleno candidato](ground-shade-coherence/grand-river-ground-shade-coherence-game-day.png)
- [Volcanes original](ground-shade-coherence/volcano-0-game-day.png) / [relleno candidato](ground-shade-coherence/volcano-ground-shade-coherence-game-day.png)
- [Contacto: 48 capturas y descarte](ground-contact-integration/README.md)
- [Basalto: 48 capturas, Blender y descarte](basalt-plates/README.md)

144 capturas de esta ronda, no 144 escenas de campaÃ±a. Son fixtures del renderer real; no equivalen a navegaciÃ³n o combate. Build correcto de 402 mÃ³dulos en `54e3e0fd`; los cambios siguientes son QA/documentaciÃ³n y conservan runtime original.

## Pase de relleno restringido a sombras

[48 capturas y ABBA](ground-shadow-fill/README.md): mejora localizada visible sin enfriar el suelo soleado; noche idÃ©ntica en los biomas modificados. Se conserva como candidato QA, sin adoptarlo todavÃ­a: la ronda de Sabana diurna supera el presupuesto GPU y requiere una mediciÃ³n mÃ¡s estable. Gran RÃ­o y CaÃ±Ã³n pasan el umbral en esta ronda, sin probarlo para todo el juego. Los seis mockups originales estÃ¡n localizados en [ART-REFERENCES.md](ART-REFERENCES.md).

La inspecciÃ³n de CaÃ±Ã³n confirma que reforzar sombras de objetos no resuelve las del relieve: el terreno residente recibe sombra pero no la proyecta. Se prepara un experimento separado, `qa-terrain-shadow-volume.js`, reutilizando geometrÃ­a y el pass existentes; todavÃ­a sin decisiÃ³n de adopciÃ³n ni coste aprobado.

## RevisiÃ³n de campaÃ±a y nuevos candidatos (20/10)

- [Partidas reales pausadas](campaign-shadow-review/README.md): 18 capturas de Sabana, Gran RÃ­o y CaÃ±Ã³n desde el menÃº, sin entidades artificiales; cÃ¡maras estables por pareja y sin errores de red/JS registrados.
- [Sombras de relieve](terrain-shadow-volume/README.md): beneficio claro en CaÃ±Ã³n, no en las vistas de Sabana/Gran RÃ­o. Pendiente benchmark de cada pass y streaming; no activado globalmente.
- [RepeticiÃ³n del relleno en misma pÃ¡gina](ground-shadow-fill/PAIRED.md): el salto diurno de Sabana no reaparece; CaÃ±Ã³n nocturno supera por poco el umbral. Mantener incertidumbre, no afirmar aceleraciÃ³n.
- [Cojines de hierba](grass-cushions/README.md): fuente Blender y 8 capturas; descartados por poca presencia visual para +151.140 triÃ¡ngulos. No aumentar densidad del piloto. Se necesita una propuesta conjunta de suelo y masas de vegetaciÃ³n.

La opciÃ³n integrada `?visualLab=global-lighting` conserva el relleno local y aÃ±ade casters de terreno solo en CaÃ±Ã³n. Build y 20 pruebas existentes pasan; [capturas de integraciÃ³n y recorrido de chunks](global-lighting-integrated/README.md). Es una opciÃ³n de evaluaciÃ³n, no una declaraciÃ³n de calidad final. Se documenta explÃ­citamente el coste nocturno de terreno por encima del presupuesto previo y el borde de fixture tambiÃ©n presente en la referencia.

## Pase de paleta volcÃ¡nica y estratos (20/10)

Se conserva [carbÃ³n volcÃ¡nico](volcanic-charcoal/README.md) Ãºnicamente en la opciÃ³n experimental: reduce el azul del suelo hacia roca neutra cÃ¡lida, sin recursos adicionales. ABBA QA diurno: 14,416 â†’ 14,424 ms GPU; la deriva nocturna impide concluir sobre rendimiento a partir de su media. La noche y la escala del relieve siguen pendientes. La ruta integrada coincide visualmente con el candidato.

Se elimina la selecciÃ³n de bioma por fragmento del relleno integrado, usando constantes de material; 24 capturas confirman conservaciÃ³n de apariencia. El benchmark de uniformes es histÃ³rico, no prueba de coste de la revisiÃ³n actual. [Estratos del CaÃ±Ã³n](canyon-bedding/README.md) descartados: no mejoran el volumen y aÃ±aden discontinuidades visibles.

La siguiente intervenciÃ³n artÃ­stica debe concentrar geometrÃ­a vegetal legible en masas y distancias Ãºtiles, con culling y presupuesto explÃ­cito, coordinada con la lectura del suelo. No repetir una distribuciÃ³n uniforme de matas casi invisibles. Ninguno de estos pases alcanza todavÃ­a la calidad de los seis mockups.

La [ronda integrada de paletas constantes](global-lighting-integrated/CONSTANT-PERFORMANCE.md) confirma que queda trabajo de coste: Sabana y CaÃ±Ã³n diurno superan +0,5 ms GPU. No se promociona la opciÃ³n a comportamiento por defecto ni se da por aprobado el presupuesto global. Se corrigiÃ³ ademÃ¡s una colisiÃ³n de claves de cachÃ© entre biomas introducida al usar constantes de material (prueba que falla antes y pasa despuÃ©s).

[Islas de hierba visible](grass-islands/README.md): la selecciÃ³n por cÃ¡mara reduce la geometrÃ­a adicional a 18.540 triÃ¡ngulos en la vista normal y 26.280 en la baja, pero los tallos angulosos no alcanzan la direcciÃ³n artÃ­stica. Descartada la malla; el ahorro no constituye aprobaciÃ³n visual ni benchmark GPU. Fuente Blender, ocho capturas y lÃ­mites de la prueba conservados.

## Agua: superficie y coste (20/10)

El [diagnÃ³stico de agua](water-route-audit/README.md) confirma que el material procedural sÃ­ cubre la charca; no hace falta cambiar su geometrÃ­a. Las [normales irregulares](water-surface/README.md) mejoran la lectura en 48 capturas de seis biomas y 32 vistas adicionales con animaciÃ³n visual, pero el coste supera el presupuesto en varias vistas. Eliminar el dibujo residual de bandas conserva el aspecto y da resultados de coste mixtos: [prueba sin bandas](water-surface-lean/README.md). Pendiente evaluar el mapa compartido de pendientes y partidas reales antes de integrar. La calidad global, las orillas y la vegetaciÃ³n siguen incompletas.

Se conserva el [agua con mapa de pendientes compartido](water-integrated/README.md) dentro de `global-lighting`: 48 capturas integradas, 16 de partidas reales y prueba de streaming/origen. El ABBA del candidato con mapa queda dentro de +0,5 ms en las ocho fases de cuatro biomas (mÃ¡ximo +0,250 ms), con deriva documentada. Una textura nominal de ~171 KiB con mipmaps sustituye el cÃ¡lculo irregular por fragmento; los nuevos chunks comparten el recurso y se libera una vez al cerrar la escena. Build de 404 mÃ³dulos y 23 pruebas pasan. Esto no resuelve las orillas, la lectura nocturna ni el coste total pendiente del relleno/sombras globales.

## VegetaciÃ³n externa CC0 (20/10)

[Hierba Kenney adaptada en Blender](kenney-grass/README.md): ocho capturas comparables de dÃ­a/noche. Malla cerrada de 512 triÃ¡ngulos, 103/128 instancias visibles y un draw adicional; +52.736/+65.536 triÃ¡ngulos. Descartada por lectura demasiado cuadrada y arbustiva. No integrada ni aprobada por rendimiento temporal. Se conservan fuente CC0, licencia y auditorÃ­a; buscar hojas mÃ¡s finas y masas coherentes con el suelo antes de aumentar densidad. El objetivo global sigue pendiente.

[Filtrado de frecuencia del suelo](ground-frequency/README.md): 48 capturas, 24 parejas verificadas. Filtrar conjuntamente albedo/normales/ARH reduce ruido pero produce desenfoque y manchas blandas, especialmente en Sabana y Gran RÃ­o. Descartado; no integrado. Sin geometrÃ­a/draw/textura adicional, sin aprobaciÃ³n temporal GPU. Separar contraste cromÃ¡tico de normales y oclusiÃ³n en el siguiente ensayo.

[Normales al 45 %](ground-normal-balance/README.md) y [normales al 160 %](ground-normal-rich/README.md): 32 capturas de Sabana/Gran RÃ­o. El primer extremo aplana el tapiz; el segundo enfatiza la paja sin crear masas vegetales. Ambos descartados, valor original conservado. El siguiente pase debe abordar geometrÃ­a fina y distribuciÃ³n, no seguir ajustando Ãºnicamente la intensidad de normales. Contadores y variaciones entre cargas documentados; sin aprobaciÃ³n temporal GPU.

[Matas de hojas finas](grass-fine/README.md): fuente Blender cerrada de 72 hojas, ocho capturas y benchmark de visibilidad en la misma escena. Lectura mÃ¡s fina, todavÃ­a poca cobertura. +118.656 triÃ¡ngulos en juego; GPU dÃ­a +0,300 ms, noche +3,196 ms y repeticiÃ³n BAAB +1,192 ms. No integrada por coste. Se conserva la forma para reducir geometrÃ­a/material antes de ampliar cobertura; no repetir simplemente mayor densidad.

[Hierba fina reducida](grass-fine-lite/README.md): mismas 72 hojas y posiciones, 720 frente a 1.152 triÃ¡ngulos por mata (-37,5 %), apariencia similar en cÃ¡mara baja. Se conserva como base de investigaciÃ³n, no integrada. GPU ABBA dÃ­a/noche +0,990/+0,137 ms; BAAB -0,474/+0,916 ms, variaciÃ³n documentada. El presupuesto sigue sin aprobar; aislar material antes de aumentar densidad.

[Material difuso de hierba](grass-diffuse/README.md): ocho capturas y comparaciÃ³n ABBA de materiales sobre idÃ©ntica geometrÃ­a. GPU -0,258 ms dÃ­a/+0,240 ms noche; no prueba ventaja consistente. Material actual conservado. La siguiente prueba debe reducir segmentos a distancia mediante niveles de detalle, preservando curvatura cercana; no aumentar densidad ni aprobar presupuesto con estos datos.

[Hierba con dos niveles geomÃ©tricos](grass-lod/README.md): 29.664 triÃ¡ngulos adicionales en juego frente a 74.160 del piloto reducido; 42.480 en baja. Ocho capturas, seis vistas de transiciÃ³n y poblaciÃ³n sin duplicados. GPU ABBA +1,568 ms dÃ­a/+0,238 ms noche: no integrado, presupuesto pendiente. El lateral expone brillo excesivamente claro del suelo a contraluz; siguiente prioridad: aislar respuesta especular del terreno antes de aÃ±adir complejidad vegetal. No dar por resuelta la transiciÃ³n abrupta de LOD.

## Suelo mate a contraluz (20/10)

Se conserva [rugosidad mÃ­nima seca 0,86](ground-roughness/README.md) en global-lighting para Sabana, Gran RÃ­o y suelo de CaÃ±Ã³n: elimina buena parte del reflejo blanquecino sin borrar fibras, normales ni sombras. 72 capturas QA, [36 integradas y 12 de campaÃ±a](roughness-integrated/README.md); streaming de los tres biomas y 18 pruebas pasan, build correcto. No aÃ±ade draw calls, triÃ¡ngulos ni texturas. GPU lateral: Sabana +0,380/+0,043 ms dÃ­a/noche; RÃ­o +0,113/-0,210; CaÃ±Ã³n -0,476/+0,848, repeticiÃ³n nocturna -0,289. VariaciÃ³n temporal documentada, no garantÃ­a de coste cero ni aprobaciÃ³n del presupuesto global. Renderer por defecto, musgo, volcÃ¡n y Desierto sin este ajuste. Calidad de mockups todavÃ­a pendiente.

[Respuesta de cielo en paredes](canyon-sky/README.md) y [suavizado de normales compartidas](canyon-normal-smooth/README.md): 24 capturas de CaÃ±Ã³n. El primer ensayo resalta triangulaciÃ³n regular; el segundo la atenÃºa, pero mantiene bandas planas. Ambos descartados, sin cambios runtime. Normales: 23.243 vÃ©rtices modificados en 15 mallas, posiciones y colores verificados intactos. Evaluar material rocoso proyectado sobre las paredes, no repetir un barrido de intensidades de luz.

[Rock035 proyectado en paredes](canyon-rock-texture/README.md) y [color con normales](canyon-rock-normal/README.md): 24 capturas, cero triÃ¡ngulos/draw calls adicionales y una/dos texturas. Descartados: grano fino sin fracturas ni capas amplias; las bandas siguen planas. Fuente existente identificada y licencia CC0 verificada en ambientCG. Buscar roca estratificada a escala mayor, sin intensificar este mapa ni cambiar siluetas. Sin benchmark temporal ni integraciÃ³n.

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

[Foliage detail](foliage-detail/README.md): fuente propia de 72 hojas cerradas, mosaico normal 512Â², sin nueva geometria en juego. 24 capturas reales y 12 parejas verificadas fuera del poblado en Sabana/Rio/Manglares. El efecto produce pequenas marcas angulosas en copas cercanas y es escaso a distancia; descartado. ABBA de 24 bloques: +0,119 a +0,771 ms GPU, con deriva, mas una textura nominal de 1,33 MiB. No integrado. Priorizar lectura amplia del terreno y masas vegetales; no continuar aumentando detalle fino de copas sin una mejora visual demostrada. Calidad global pendiente.

## Variacion amplia del color del suelo (20/10)

[Ground palette patches](ground-palette-patches/README.md): 24 capturas, 12 parejas verificadas en Sabana/Rio/Canon, dia y noche. Dos escalas de ruido tintan el albedo conservando fibras, normales y geometria. Cambia el cromatismo pero no mejora claramente el volumen: descartado. ABBA final incluye terreno y horizonte; una ronda interrumpida con selector incompleto se archiva como invalida. Deriva relevante; no interpretar diferencias negativas como aceleracion. Siguiente paso: recorrido real de las matas arqueadas conservadas junto a la iluminacion global, antes de promoverlas al modo experimental, manteniendo Manglares excluido hasta resolver coste/aporte. No mas acumulacion de microajustes sin ganancia visible. Calidad global pendiente.

## Recorrido real de matas y coste fuera de la aldea (20/10)

[Grass traversal](grass-traversal/README.md): seis recorridos de 576 m, 36 PNG y seis videos separados de las mediciones. Sabana/Rio/Canon recuperan candidatas y camara al volver, con bloques residentes correctos y maximo 192 instancias; sin errores. GPU total en movimiento ~15-22 ms de media y ~19-28 ms p95. Nuevo ABBA de paisaje: +0,474 Sabana dia, +0,557 Rio dia, +0,733 Canon dia (182 matas, frente a 21 en la vieja vista de aldea). Variacion entre bloques; ningun ahorro probado por diferencias negativas. Conservar forma/distribucion, pero no aprobar presupuesto ni integrar aun: siguiente ensayo, presupuesto visible menor y revision del verde nocturno de Canon. Interaccion real de construccion, calidades baja/alta y otros tres recorridos pendientes. Calidad global pendiente.

## Limite de 128 matas (20/10)

[Grass budget128](grass-budget128/README.md): 24 capturas y ABBA directo 192/128/128/192 en tres biomas, camaras de paisaje dia/noche. Cobertura cercana similar, perdida lejana; sin ahorro temporal consistente y tres casos diurnos mas lentos pese a menos triangulos. No promover como optimizacion. Timeout inicial de carga de Rio documentado; repeticion completa sin errores. Mantener 192 como control QA, no como presupuesto aprobado. Siguiente ensayo: aislar material/recepcion de sombras con igual numero de instancias; revisar color seco por separado. Calidad global pendiente.

## Control de repetibilidad GPU (20/10)

[Grass repeatability](grass-repeatability/README.md): 32 bloques/5.760 muestras en Canon, A/A identico y ABBA BAAB de 192/128, dia/noche. Camara, matrices, cantidades y contadores invariantes en A/A; aun asi, rango entre bloques 2,135 ms dia/1,209 noche. La diferencia 128-192 cambia de signo respecto al pase previo (-0,171 dia/+0,548 noche). No demuestra ahorro ni lentitud intrinseca de 128. Informe anterior matizado. Siguiente ensayo: aislar recepcion de sombras en matas manteniendo modelo y cantidad, con controles y orden inverso; no usar un unico delta pequeno como veto o aprobacion. Calidad global y presupuesto acumulado pendientes.

## Relieve del suelo sin geometrÃ­a: Sabana (20/10)

La peticiÃ³n posterior del usuario limita este pase al material del suelo; quedan en pausa los ensayos de sombras de matas y toda geometrÃ­a adicional. [Ground POM](ground-pom/README.md) compara A original, B continua (equivalente: Sabana ya usa iluminaciÃ³n continua), C POM refinado y D microoclusiÃ³n precalculada. AÃ±ade dos hipÃ³tesis de altura coherente E/F como diagnÃ³sticos descartados.

56 capturas verificadas, ocho clips de cÃ¡mara, 9.600 muestras GPU en Intel UHD, calidades media/baja y dÃ­a/noche. A/B y vuelta A2 idÃ©nticos; geometrÃ­a, draw calls y entidades invariantes. La visibilidad solar forzada no altera un solo pÃ­xel nocturno. Contadores de shader: 3,615 lecturas de altura por fragmento de suelo cercano en A frente a 5,951 en C/D. GPU cercana diurna/media: 14,332 ms A; 16,340 C; 15,692 D; existe deriva entre controles idÃ©nticos.

**No integrar ni extender a otros biomas:** C reduce el escalonado, pero D no alcanza las acumulaciones del mockup. E parece moldeado y F pierde fibras. No estÃ¡ demostrada la procedencia fÃ­sica del ARH adaptado. El bake posterior de fibras conocidas mostrÃ³ que una correlaciÃ³n baja entre gradiente de altura y normales no prueba desalineaciÃ³n; se retira esa interpretaciÃ³n fuerte. Hace falta un conjunto de mapas coherente antes de aumentar muestras o amplitud. Solo se publican herramientas, mapas QA y evidencia; comportamiento por defecto intacto. El objetivo global de calidad sigue sin alcanzarse.

### Viento y sombras de matas: 2026-10-20

[Prototipo de viento](grass-wind/README.md): candidato QA sobre las mismas 192 matas Blender, sin coste de geometrÃ­a adicional frente al control estÃ¡tico. Presupuesto fino aÃºn incierto. [Sombras dinÃ¡micas](grass-wind-shadow/README.md): descartadas; invalidar el mapa solar completo aÃ±ade 22â€“44% GPU en la prueba de media y aporta poco en cÃ¡mara normal. No activar por defecto; calidad global y streaming largo siguen pendientes.

### Paleta seca de las matas del CaÃ±Ã³n (20/10)

[Canyon dry grass](canyon-dry-grass/README.md): perfil QA de CaÃ±Ã³n pasa a tinte lineal [1,.68,.48], conservando forma/distribuciÃ³n y otros biomas. Doce capturas, cuatro retornos exactos, 1.920 muestras GPU. Mejora modesta de coherencia seca, no de volumen. Diferencias temporales cercanas desfavorables y deriva documentadas; no aprueba el coste acumulado ni integra la vegetaciÃ³n en producciÃ³n.

### CorrecciÃ³n del callback de viento (20/10)

[Grass wind preserved](grass-wind-preserved/README.md): el piloto anterior reemplazaba AfricanToon; se corrige conservando callback y cachÃ©. DiecisÃ©is capturas, ocho pares estÃ¡ticos exactos, doce comprobaciones de identidad del shader y 3.840 muestras GPU. Se retira la aplicabilidad directa de los costes anteriores de viento/sombras a esta revisiÃ³n. Baja/juego/noche +9,74%; presupuesto no aprobado. HipÃ³tesis de transmisiÃ³n archivada como prueba inactiva, no descartada artÃ­sticamente. Calidad global pendiente.

### TransmisiÃ³n foliar en iluminaciÃ³n nativa (20/10)

[Grass translucency native](grass-translucency-native/README.md): parche activo de artLighting416, 36 capturas, seis controles nocturnos y doce retornos exactos, dos clips de cÃ¡mara en Gran RÃ­o y 5.760 muestras GPU. Descartado: aclara caras sin ganancia clara de volumen y reduce contraste en RÃ­o. Sin recursos geomÃ©tricos nuevos; coste variable y presupuesto no aprobado. No repetir aumentos de intensidad para forzar diferencia. La estructura de masas vegetales y el suelo siguen siendo la carencia principal.

### Bases cian en hierba seca (20/10)

[Native grass base](native-grass-base/README.md): raycasts identifican pintura del slot 8 sobre suelo seco, no agua del mundo. MÃ¡scara cromÃ¡tica limitada al material nativo conserva geometrÃ­a e iluminaciÃ³n. Doce capturas y 3.840 muestras GPU; tres retornos exactos y cinco pÃ­xeles residuales en el cuarto. Mejora parcial de color, pero persisten las peanas circulares y restos cian. Conservar solo como candidato QA, sin aprobar coste (+6,45% media/juego/noche). PrÃ³xima investigaciÃ³n: transiciÃ³n material base/suelo; no mÃ¡s aumento de luz para corregir una discontinuidad de materiales. Calidad global pendiente.

### TransiciÃ³n material de bases al terreno (20/10)

[Native grass ground base](native-grass-ground-base/README.md): comparte textura de suelo en coordenadas de mundo, con variante adicional de iluminaciÃ³n continua, sombra y contacto. Mejora localizada frente a los discos pintados, especialmente de noche; persisten contorno naranja y falta de normales/POM/mÃ¡scaras de terreno. DiecisÃ©is capturas, cuatro retornos exactos, cuatro clips de Ã³rbita y 5.760 muestras GPU. Conservar como candidato QA sin activar: tres condiciones de la variante continua superan el 5%; no extender la receta incompleta. La calidad global y la transiciÃ³n completa siguen pendientes.

### MÃ¡scara por altura en bases de hierba (20/10)

[Native grass root mask](native-grass-root-mask/README.md): una sola componente conectada en el recurso; la mÃ¡scara anterior excluÃ­a bordes inclinados y cian clasificado como follaje. La transiciÃ³n local 0,025â€“0,055 integra mejor la peana conservando geometrÃ­a, pero tiÃ±e raÃ­ces/piedras bajas. DiecisÃ©is capturas con cuatro retornos exactos, cuatro clips y 5.760 muestras GPU. Candidato QA sin aprobar coste: dos condiciones superan +5% frente al original. Cerrar por ahora la iteraciÃ³n de este recurso y volver a suelo/vegetaciÃ³n a escala global en Gran RÃ­o y CaÃ±Ã³n. No extender automÃ¡ticamente los umbrales ni declarar alcanzada la calidad global.

## Cubierta continua de Sabana â€” 20/10/2026

El [piloto A/B/C](continuous-grass/README.md) sustituye la prioridad de matas aisladas. La cobertura opaca instanciada forma franjas continuas con viento y LOD, preservando los modelos originales. C media aÃ±ade 212.704 triÃ¡ngulos y dos draws en cÃ¡mara normal; C baja hÃ­brida, 36.960 y un draw. Se entregan 48 capturas/control, dos vÃ­deos, 8.640 muestras GPU Intel UHD, overdraw, memoria y streaming. Se conserva como candidato QA, sin opciÃ³n por defecto ni extensiÃ³n a otros biomas: todavÃ­a falta finura/agrupaciÃ³n orgÃ¡nica comparable a la referencia y amortizar la activaciÃ³n. No fusionar.

## Cubierta continua: primer piloto de Gran RÃ­o

Tras conservar el resultado de Sabana y su viento 8Ã—, se ha preparado un [piloto especÃ­fico de Gran RÃ­o](continuous-grass-river/README.md): menor altura, pigmento verde y cobertura condicionada por humedad. Cuenta con 48 capturas y vÃ­deos, pero sigue pendiente de benchmark GPU aislado y revisiÃ³n de orillas/streaming. No se activa por defecto ni se generaliza a otros biomas.

## ActualizaciÃ³n: cobertura, costes y regreso al CaÃ±Ã³n

La cobertura de Sabana conserva el viento 8Ã— aprobado. Gran RÃ­o dispone de [correcciÃ³n de orillas](continuous-grass-river/shore-triangles/README.md) y [mediciones](continuous-grass-river/performance/README.md); la frase histÃ³rica de benchmark pendiente anterior ya no describe el estado actual. Las candidatas de LOD, continuidad de viento y normales siguen separadas. La [validaciÃ³n combinada](continuous-grass-river/combined-validation/README.md) y el [control intercalado](continuous-grass-river/interleaved-validation/README.md) no permiten promover por rendimiento: existe deriva incluso ejecutando la misma ruta en calidad baja. Se conserva la ruta original en baja y se cierran las repeticiones equivalentes en esta sesiÃ³n.

En Gran CaÃ±Ã³n, [textura al pie de pared](canyon-wall-foot/README.md) elimina una franja lisa, pero no mejora suficientemente el volumen global. DiecisÃ©is capturas, ocho pares con cÃ¡mara/entidades/draws/triÃ¡ngulos iguales y sin errores GL registrados. No integrar ni realizar otro barrido de intensidades; conservar evidencia. La primera cÃ¡mara normal atravesaba una pared y se reemplazÃ³ antes de publicar. No se modifica geometrÃ­a para imitar el mockup.

La calidad global continÃºa pendiente. Evitar confundir continuidad local de material o diferencias de pÃ­xeles con la estructura de masas y separaciÃ³n de planos de las referencias.


## Estado posterior: paleta del CaÃ±Ã³n y materiales de Manglares/Desierto

El [relleno cÃ¡lido de suelo en sombra del CaÃ±Ã³n](canyon-warm-floor/README.md) se conserva como candidato QA reversible, con [comprobaciÃ³n de streaming](canyon-warm-floor/streaming/README.md), sin aprobar presupuesto global. La [revisiÃ³n interactiva](global-candidate-review/README.md) reÃºne Sabana, Gran RÃ­o y CaÃ±Ã³n; las coberturas mantienen viento 8Ã— y no activan las variantes de LOD de coste incierto.

[Mangrove damp moss](mangrove-damp-moss/README.md) queda descartado: la mÃ¡scara hÃºmeda selecciona una regiÃ³n limitada y no aporta volumen apreciable. Se conservan Moss002 puro y barro independiente.

[Desierto: radiancia continua](desert-continuous-radiance/README.md) tambiÃ©n se descarta como receta: 24 capturas de campaÃ±a y doce parejas verificadas muestran pÃ©rdida de dorado y facetas amplias persistentes. El diagnÃ³stico confirma que la salida toon ordinaria de arena no consume la radiancia `lit` calculada previamente; no atribuirle mejoras por cambios en esa BRDF sin verificar la salida final. Mantener la rampa suavizada integrada. Sin benchmark temporal de esta receta rechazada; no repetir barridos de intensidad ni confundir cambio cromÃ¡tico con relieve. Calidad global pendiente.


## Cierre y reapertura de cobertura continua

[Lifecycle de cobertura](continuous-grass-lifecycle/README.md): fallo reproducido y corregido en Sabana/Gran RÃ­o conservados. El cierre ya no deja una instancia liberada como activa ni pisa callbacks posteriores. Doce ciclos completos en media/baja, 24 capturas dÃ­a/noche; las reaperturas conservan cobertura y viento 8Ã—, con diferencias residuales de hasta seis pÃ­xeles/un nivel RGB. Contadores de geometrÃ­as regresan al valor cerrado en cada ciclo. Es una correcciÃ³n de fiabilidad del piloto, no una nueva aprobaciÃ³n de rendimiento o integraciÃ³n. Calidad global pendiente.


## Arena irregular CC0: nueva candidata del Desierto

[Aerial sand](desert-aerial-sand/README.md): 36 capturas en dunas, normal GL de Aerial Beach 01 a escala 30 m, conservando pintura cÃ¡lida. Separar la normal geomÃ©trica para el detector de contorno elimina el punteado que producÃ­a el relieve fino. La variante final usa solo el mapa normal y conserva casi la misma imagen que la de dos mapas; se mantiene como candidata QA. 1440 muestras GPU de la receta intermedia muestran coste y deriva importantes, no aprobaciÃ³n. Pendientes coste de normal-only, cÃ¡mara mÃ³vil, perfil bajo y streaming; no integrar todavÃ­a. No repetir variantes que usan la normal fina como contorno.


## Arena normal-only: activaciÃ³n segura y validaciÃ³n

[ValidaciÃ³n](desert-aerial-sand/VALIDATION.md): se reproduce y corrige `glTexStorage2D: Texture is immutable` al activar despuÃ©s de noche. Reemplazo seguro del objeto de textura y actualizaciÃ³n de uniformes; no mutar Source sobre memoria ya inicializada. Recorridos 0/144/288/0 en media/baja enlazan 25 materiales residentes y un horizonte; 40 capturas contando controles sin helper. Retornos con pequeÃ±as diferencias adicionales cuantificadas, no identidad binaria. 2880 muestras GPU de la candidata final: baja diurna +.338 ms con poca deriva; media/noche aÃºn variables. Mantener candidata QA, sin integrar. Siguiente puerta: cÃ¡mara mÃ³vil y estabilidad de crestas, sin aÃ±adir geometrÃ­a ni rebajar la mejora artÃ­stica para pasar un contador.


## Arena en movimiento: comparativa controlada

[Cuatro vÃ­deos](desert-aerial-sand/motion/README.md), media/baja y dÃ­a/noche, de elevada a cercana y retorno. 484 parejas A/B coinciden en pose/hora/draws/triÃ¡ngulos tras corregir el harness por cargas asÃ­ncronas y cachÃ© LOD inicial. Los intentos no comparables se documentan y se excluyen. 308 parejas simÃ©tricas con geometrÃ­a coincidente: 304 exactas, cuatro con hasta seis pÃ­xeles/un nivel RGB. No equivale a prueba universal de ausencia de aliasing ni a FPS real; mantener candidata QA y revisar presupuesto acumulado. Sin cambios de material en este pase ni activaciÃ³n general.


## Arena junto al poblado inicial

[RevisiÃ³n de asentamiento](desert-aerial-sand/settlement/README.md): 24 capturas reales media/baja y dÃ­a/noche, 12 parejas con cÃ¡mara/hora/geometrÃ­a iguales y sin errores. El volumen se aprecia entre edificios y conserva calidez; aparece un borde de camino mÃ¡s dentado en la vista normal. Antes de promover, aislar desgaste/mÃ¡scara/iluminaciÃ³n en ese borde. No se repite rendimiento ni se integra la candidata; presupuesto media/noche y calidad global siguen pendientes.


## Arena seca: causa de la franja y correcciÃ³n localizada

[AblaciÃ³n](desert-aerial-sand/edge-ablation/README.md): 72 capturas comparables aÃ­slan la franja dentada en la banda especular, no obligan a cambiar desgaste ni borrar normales. [Candidata seca](desert-aerial-sand/dry-specular/README.md): factor especular por suavidad al cuadrado, 24 capturas; ocho de doce vistas idÃ©nticas a normal-only y cuatro eliminan la franja conservando relieve. Sin geometrÃ­a/pasadas nuevas; no hay aprobaciÃ³n temporal de coste. Mantener QA, pendiente movimiento y presupuesto acumulado; calidad global abierta.


## Arena seca: movimiento y contraste temporal

[Recorrido del poblado](desert-aerial-sand/dry-specular/motion/README.md): 484 parejas coinciden en cÃ¡mara/hora/geometrÃ­a; retorno reproducible con residuos mÃ­nimos compartidos por A/B. [Dos protocolos de coste](desert-aerial-sand/dry-specular/performance/README.md): 8.832 muestras vÃ¡lidas, serie larga e intercalaciÃ³n corta ABBA; sin errores ni regresiÃ³n grande reproducida, pero dispersiÃ³n impide certificar +0,5 ms media/noche. No reiterar esta microprueba hasta que pase. Siguiente contraste: cadencia de campaÃ±a real sin consultas GPU y coste acumulado del conjunto. La candidata no se integra todavÃ­a; objetivo de seis biomas abierto.

## Cadencia de campaÃ±a: controles corregidos

[DiagnÃ³stico](desert-aerial-sand/dry-specular/campaign-settled/README.md): el tutorial avanzaba pese a la pausa QA y el horizonte podÃ­a incorporar materiales candidatos al control. Pausa existente de menÃº y estabilizaciÃ³n previa corrigen ambos; 480 frames con estado/materiales residentes estables y cÃ¡mara/geometrÃ­a coincidentes. Pilotos archivados y excluidos. Serie completa corregida pendiente de cierre; no aprobar rendimiento ni integrar todavÃ­a.


## Arena seca: cadencia nativa completada

[Serie completa](desert-aerial-sand/dry-specular/campaign-final/README.md): 32 bloques, 7.680 frames con cÃ¡mara/geometrÃ­a/estado comparables, media/baja dÃ­a/noche. No reproduce una penalizaciÃ³n grande consistente; dispersiÃ³n impide afirmar aceleraciÃ³n o certificar +0,5 ms GPU. Avanzar a integraciÃ³n opcional con carga y lifecycle propios, conservando original por defecto, y verificar paridad con helper/streaming. No repetir la serie esperando cifras favorables; conjunto global aÃºn no aprobado.


## Arena integrada como opciÃ³n explÃ­cita

[IntegraciÃ³n](desert-aerial-sand/integration/README.md): `visualLab=global-lighting&sandRelief=1`, carga y dispose de BiomeGround. Doce parejas reales integraciÃ³n/helper: diez exactas y dos con un pÃ­xel/un nivel RGB; mismas cÃ¡maras y geometrÃ­a. Once pruebas pasan. Original por defecto; pendientes streaming y lifecycle de esta nueva ruta antes de ampliar activaciÃ³n.


## Arena opcional: nuevos chunks y cierre

[Streaming integrado](desert-aerial-sand/integration-streaming/README.md): media/baja, 0/144/288/0m, dÃ­a/noche. Los 25 materiales residentes y horizonte reciben receta; fuente y clon de normal se liberan una sola vez por cierre. Retorno con diferencias RGB pequeÃ±as documentadas, no identidad. Pendientes reaperturas repetidas y revisiÃ³n del conjunto; opciÃ³n conservada sin cambiar defecto.


## Arena integrada: reapertura validada

[Seis ciclos](desert-aerial-sand/integration-reopen/README.md): tres por calidad media/baja, mismo documento sin reload, cierre por menÃº y nueva partida. Doce capturas; ocho comparaciones de reapertura idÃ©nticas RGB, misma geometrÃ­a/cÃ¡mara. Fuente y clon nuevos/liberados una vez en cada ciclo. No certifica fugas prolongadas. Conservar opciÃ³n y volver a revisar el conjunto de seis biomas; no dedicar mÃ¡s rondas a microvalidar solo arena.


## RevisiÃ³n conjunta actual de seis biomas

[CampaÃ±a comparada](combined-campaign-review/README.md): 72 capturas, 36 parejas de cÃ¡mara/hora, tres vistas y dÃ­a/noche media. ReÃºne iluminaciÃ³n, cobertura C viento8, CaÃ±Ã³n cÃ¡lido y arena. Sin nuevos benchmarks; coste geomÃ©trico de hierba explÃ­cito. Pendientes claros: borde de cobertura RÃ­o, suelo medio CaÃ±Ã³n/Volcanes y repeticiÃ³n/bordes barro-musgo Manglares. Siguiente pase: integraciÃ³n visual de barro, respetando huella y reglas. No se acredita calidad global ni coste combinado.


## Manglares: recorte orgÃ¡nico descartado

[Barro con borde irregular](mangrove-organic-mud-rim/README.md): 24 capturas, doce parejas sin cambios de cÃ¡mara/geometrÃ­a. Reduce el polÃ­gono visible pero conserva el salto de material y aspecto pegado. Descartado; no gastar presupuesto optimizando esta receta. Siguiente hipÃ³tesis: mezcla visual de color/normal/rugosidad en frontera, respetando contornos autoritativos.


## Manglares: frontera con mezcla material

[Mezcla barro/musgo](mangrove-mud-moss-blend/README.md): 24 capturas, doce parejas de cÃ¡mara/geometrÃ­a idÃ©nticas. La ruta comÃºn de suelo permite mezclar color/normal/rugosidad/AO sin recorte ni blending; transiciÃ³n mÃ¡s integrada. Interior mÃ¡s claro/hÃºmedo, pendiente control. PreparaciÃ³n ingenua423â€“586ms acumulados: no promover; cachear cÃ¡lculos duplicados antes de benchmark GPU. Candidata visual, sin aprobaciÃ³n global.


## Manglares: preparaciÃ³n reutilizada

[CachÃ© y bÃºsqueda acotada](mangrove-mud-moss-pruned/README.md): evita89977 evaluaciones repetidas inicialmente; preparaciÃ³n observada158â€“179ms frente423â€“460ms, sin atribuir toda diferencia a algoritmo. Once de doce capturas idÃ©nticas; cuatro pÃ­xeles residuales en una vista. Sigue QA; siguiente puerta visual: separar transiciÃ³n de aclarado/brillo interior antes de GPU/lifecycle.


## Manglares: conservar identidad del barro

[Control mate](mangrove-mud-moss-matte/README.md) reduce destellos pero no resuelve el aclarado. [Interior toon](mangrove-mud-moss-toon-interior/README.md) conserva respuesta estilizada hacia dentro y mezcla con suelo en borde; recupera color terroso sin cortar transiciÃ³n. 48 capturas entre ambos ensayos,24 parejas coincidentes en cÃ¡mara/geometrÃ­a, sin errores. Elegir interior toon para coste/movimiento; pendiente reutilizar lectura duplicada, GPU y lifecycle. No integrado.

## Manglares: ciclo QA y optimizaciÃ³n descartada

Recorrido, descarga y normal Ãºnica documentados en [motion](mangrove-mud-moss-toon-interior/motion/README.md) y [streaming](mangrove-mud-moss-toon-interior/streaming/README.md). La [rama de iluminaciÃ³n interior](mangrove-mud-moss-interior-branch/README.md) conserva doce capturas exactas, pero32 bloques no demuestran ahorro consistente: descartada. Mantener mezcla anterior solo QA; volver al corte de cobertura y color en Gran RÃ­o antes de nuevas micropruebas de barro. Calidad global aÃºn no acreditada.

## Presupuesto conjunto: no promover todavÃ­a

La [revisiÃ³n V2](combined-campaign-review-v2/README.md) reÃºne las candidatas de RÃ­o, Manglares y CaÃ±Ã³n en seis biomas y dos calidades. El [benchmark en campaÃ±a baja](combined-campaign-budget/README.md) completa48 bloques ABBA,5.760 muestras GPU y8.640 frames de cadencia, con paridad de cÃ¡mara/geometrÃ­a y sin errores registrados. Manglares presenta una seÃ±al de mayor coste; Sabana ya excede el presupuesto de16,7ms en varios bloques. Los controles sin cambios tambiÃ©n fluctÃºan sustancialmente: no atribuir cada delta al material ni anunciar aceleraciones. Mantener candidatas QA, inicio original intacto. Siguiente prioridad: reducir coste de cobertura de Sabana conservando continuidad visual y simplificar mezcla de Manglares; no repetir esta serie sin una hipÃ³tesis nueva.

## Sabana: no recortar cobertura sin atribuciÃ³n de coste

La [prueba de aislamiento](savanna-coverage-cost-isolation/README.md) cambia la prioridad anterior: ocho bloques ABBA,960 muestras GPU y1.440 frames muestran que desactivar la cobertura no elimina los picos ni produce una mejora consistente. Solo aÃ±ade39.008 triÃ¡ngulos/un draw frente a1.235.913 triÃ¡ngulos ya enviados sin ella; no interpretar esa proporciÃ³n como tiempo GPU. Seis parejas reales confirman pÃ©rdida visible de volumen al quitarla. Conservar densidad y viento; siguiente acciÃ³n: atribuir el coste restante por materiales/objetos antes de reducir calidad. No acredita aÃºn presupuesto estable ni calidad global.

## Sabana: eliminar envÃ­o fuera del encuadre

La [atribuciÃ³n por draw](savanna-draw-attribution/README.md) identifica lotes de objetos como origen de1,19millones de triÃ¡ngulos. La [candidata de frustum por instancia](savanna-instance-frustum/README.md), solo QA, reduce la vista normal a499mil sin cambiar modelos ni cobertura: cuatro capturas exactas y dos inversas con residuos pendientes. Ocho bloques ABBA muestran GPU diurna14,59â€“14,81â†’9,07â€“10,30ms; noche14,38â€“20,89â†’9,47â€“10,04ms. No extrapolar a toda campaÃ±a. Conservar candidata para medir movimiento, invalidaciÃ³n, streaming y seis biomas antes de integraciÃ³n. El objetivo artÃ­stico completo sigue pendiente.

## Frustum en movimiento: evitar subidas redundantes

[Recorrido y benchmark](savanna-instance-frustum/motion/README.md):70 de72 parejas RGB exactas; dos residuos localizados, causa pendiente.960 muestras GPU y1.440 frames revelan CPU aproximadamente1ms mayor y48 subidas de grupos/frame frente11, con p95 peor. No integrar la variante actual. Siguiente hipÃ³tesis: comprobar visibilidad al mover cÃ¡mara, pero actualizar matrices/buffers solo si cambian selecciÃ³n u origen. Mantener cobertura y modelos; falta validaciÃ³n global.

## SelecciÃ³n estable y transiciones suaves

La [mÃ¡scara de selecciÃ³n](savanna-instance-selection/README.md) reduce subidas de48 a unas14 por frame manteniendo geometrÃ­a exacta; los tiempos se solapan, aÃºn sin aprobaciÃ³n global.68 de72 pares RGB exactos, residuos pendientes. Conservar candidata QA.

El usuario propone suavizar ocultaciÃ³n cercana y paso impostor/3D. La [prueba MSAA](obstruction-msaa/README.md) elimina la cuadrÃ­cula8Ã—8 pero4 muestras no producen un fundido continuo; no adoptar sola. Priorizar una transiciÃ³n limitada a instancias prÃ³ximas que se ocultan y estudiar aparte la coordinaciÃ³n entre impostor y geometrÃ­a. Mantener las optimizaciones independientes de estos cambios visuales.

## Fundidos de cÃ¡mara: candidato con coste pendiente

El [fundido convencional](obstruction-blend/README.md) se descarta por superposiciÃ³n de caras internas. El [control de superficie cercana](obstruction-surface-blend/README.md) elimina el tramado y reduce esa acumulaciÃ³n, pero aÃ±ade2â€“4 draws en poses afectadas y empeora GPU/CPU/cadencia en la serie mÃ³vil corregida.960 muestras GPU,1.440 frames; piloto de dt variable excluido por falta de repetibilidad. Mantener solo como candidato visual: pendiente vÃ­deo, profundidad mÃ¡s barata, agua/transparencias, lifecycle e impostores. No activar globalmente ni cambiar main.

## Profundidad auxiliar reutilizada

[Material estÃ¡ndar de profundidad](obstruction-depth-only/README.md): ocho parejas exactas tras sincronizar opacidad.960 muestras GPU/1.440 frames, misma geometrÃ­a por Ã­ndice. GPU diurna15,83â€“16,08â†’14,70â€“15,17ms; noche y p95 no concluyentes. Conservar como base QA del fundido, no como aprobaciÃ³n global. Siguiente puerta: vÃ­deo determinista y lectura de la silueta translÃºcida; despuÃ©s interacciÃ³n con transparencias e impostores.

## Recorrido de ocultaciÃ³n sincronizado

[VÃ­deos dÃ­a/noche](obstruction-fade-motion/README.md):180 parejas con cÃ¡mara, viento y opacidad por instancia idÃ©nticos.119 exactas RGB, mÃ¡ximo3 instancias parciales/4 draws extra. La cuadrÃ­cula desaparece; persiste una silueta translÃºcida intermedia. Piloto con148 imÃ¡genes vacÃ­as por espera asÃ­ncrona tras render excluido; serie final verificada sin imÃ¡genes vacÃ­as. Candidato solo QA. Siguiente validaciÃ³n: agua/partÃ­culas, solapamiento de objetos y lifecycle; transiciÃ³n de impostores sigue independiente y pendiente.


### PrecondiciÃ³n real de la transiciÃ³n de impostores

El piloto de fundido con impostores detectÃ³ que la campaÃ±a actual usa sesiÃ³n espacial y desactiva la ruta antigua incluso con la preferencia activada. Se aÃ±adiÃ³ una comprobaciÃ³n que impide emitir comparativas sin adaptadores. [DiagnÃ³stico y prototipo no validado](impostor-blend-pilot/README.md). No hay resultado visual ni de rendimiento atribuible a este candidato; falta una escena con identidades y cobertura coincidentes. El commit de vÃ­deos de ocultaciÃ³n cercana `8d6bc2fa5` quedÃ³ publicado correctamente.


### Piloto de ocultaciÃ³n junto al rÃ­o

[Gran RÃ­o, nueve poses de dÃ­a y noche](obstruction-water-pilot/README.md): 18 parejas auditadas, 12 exactas, mÃ¡ximo dos instancias parciales y tres llamadas adicionales. Quita el tramado en la orilla; no acredita un cruce significativo sobre el agua ni composiciÃ³n transparente (el agua actual es opaca). Candidata aÃºn de QA; partÃ­culas, superposiciones y ciclo de vida siguen pendientes.


### Descartada la profundidad compartida del fundido cercano

La [prueba transparente controlada](obstruction-transparent-probe/README.md) confirma oclusiÃ³n opaca de elementos detrÃ¡s de objetos parcialmente desvanecidos: 25.431 pÃ­xeles del marcador quedan totalmente bloqueados por los auxiliares. No promover la candidata de superficie cercana; esta decisiÃ³n sustituye su recomendaciÃ³n provisional anterior. Resolverlo necesita composiciÃ³n/profundidad aislada y mediciÃ³n adicional, no solo quitar el tramado. El renderer original permanece intacto.


### Volcanes: ceniza por zonas

[DepÃ³sitos visuales de ceniza](volcanic-ash-pilot/README.md): 24 capturas, 12 parejas con geometrÃ­a idÃ©ntica, y 8 bloques ABBA en Intel UHD. La separaciÃ³n de zonas suaves/rocosas mejora la variedad a distancia de juego; conservar como direcciÃ³n QA, sin promover todavÃ­a. GPU diurna +~1 ms en medias agregadas, con solapamiento entre bloques. Pendientes menor coste, movimiento y streaming; no se aÃ±aden texturas, geometrÃ­a ni draw calls.


### Ceniza volcÃ¡nica: movimiento y regreso

[72 parejas y recorrido de streaming](volcanic-ash-motion/README.md) con cÃ¡mara/geometrÃ­a coincidentes, dÃ­a y noche. DepÃ³sitos estables en la muestra de regreso tras cambio de origen; no RGB exacto (2.053 pÃ­xeles candidata, 3.361 original). Sin crecimiento monotÃ³nico de contadores en una vuelta; no equivale a validar fugas ni coste dinÃ¡mico. Sigue pendiente optimizaciÃ³n antes de promover.


### Ceniza precalculada en mÃ¡scara existente

[ComparaciÃ³n procedural/mÃ¡scara](volcanic-ash-mask/README.md): 24 capturas coincidentes en geometrÃ­a, bajo error RGB medio y 8 bloques ABBA. Se reutiliza R del suelo volcÃ¡nico sin tocar canales restantes ni datos del worker. Mejora GPU nocturna en esta serie, resultado diurno variable; conservar alternativa QA sin promover. PreparaciÃ³n CPU ~0,535 ms/mÃ¡scara en Node, no latencia de streaming. Pendientes borde con horizonte, movimiento y coste de creaciÃ³n de chunks.


### MÃ¡scara de ceniza: preparaciÃ³n y recarga real

[72 parejas y streaming en navegador](volcanic-ash-mask-motion/README.md): mÃ¡scara sin desplazamiento amplio en la muestra de regreso, residuales similares a procedural. 85 mÃ¡scaras nuevas, 46,6 ms CPU acumulados (~0,55 ms por mÃ¡scara), no tiempo por frame. Horizonte volcÃ¡nico adicional ausente por diseÃ±o y en ejecuciÃ³n; corregida esa precondiciÃ³n, sin declarar validada una transiciÃ³n inexistente. Mantener alternativa de revisiÃ³n; rendimiento diurno aÃºn variable.


### Ceniza accesible en una partida normal del laboratorio

[OpciÃ³n explÃ­cita integrada](volcanic-ash-review-option/README.md): `visualLab=global-lighting&volcanicAsh=procedural` o `volcanicAsh=mask`. Solo Volcanes; ausente por defecto. 36/36 capturas RGB exactas contra QA y modo desactivado anterior, 8 pruebas aprobadas y build correcto. Permite revisar sin interceptaciÃ³n de shaders; no es promociÃ³n a valor predeterminado ni conclusiÃ³n de calidad global. PR #159 permanece abierta.


### Gran RÃ­o: continuidad de paleta en la cubierta

[Paleta de suelo aplicada a hojas](river-cover-palette/README.md): 24 capturas, 12 parejas y 8 bloques ABBA. Menor borde oscuro en la muestra media, con el mismo desgaste, instancias y triÃ¡ngulos. Solo tres constantes, sin nuevas muestras o recursos. Tiempos GPU solapados y noche candidata algo mayor: no afirmar aceleraciÃ³n. Conservar candidata visual para probar movimiento/LOD; no sustituir aÃºn receta anterior.


### Paleta de Gran RÃ­o: movimiento y LOD

[144 parejas y benchmark mÃ³vil](river-cover-palette-motion/README.md), baja/media y dÃ­a/noche. Misma geometrÃ­a, selecciÃ³n y viento; el color aclara la cubierta sin resolver todo el borde lejano. GPU menor en esta serie, picos nocturnos no mejores uniformemente: conservar como ajuste cromÃ¡tico, no optimizaciÃ³n. Apto para revisiÃ³n explÃ­cita, sin sustituir aÃºn el valor anterior.


### Gran Río: descartada la reducción de altura más extensa

[Transición de 12 frente a 24 metros](river-cover-fade/README.md): 24 capturas, 12 parejas con geometría enviada idéntica. La franja más amplia suaviza parcialmente el borde, pero aplana la cubierta a distancia de juego. No adoptar ni invertir en benchmark temporal de esta candidata; conservar altura y estudiar la diferencia de respuesta suelo/cubierta. Sin cambios de producción.


### Gran Río: sombreado de raíz insuficiente

[24 capturas de raíz fija frente a atenuada](river-cover-root/README.md), geometría coincidente. No promover: el cambio es leve y no resuelve el borde. La lectura de shaders identifica respuestas difusas distintas entre suelo y cubierta; siguiente prueba debe aislar esa diferencia conservando volumen, en vez de acumular ajustes pequeños de brillo.


### Gran Río: Lambert de suelo no basta para hojas

[24 capturas con aproximación difusa del terreno](river-cover-diffuse/README.md): misma geometría, mayor lectura de orientación diurna pero oscurecimiento nocturno excesivo. Descartar; no confundir aproximación Lambert con equivalencia de BRDF completa. Próximo diagnóstico: contribución por ambas caras y luz transmitida, aislando términos antes de ajustar paleta. Sin benchmark temporal por fallo artístico.


### Gran Río: respuesta de la cara opuesta

[24 capturas y 8 bloques ABBA](river-cover-two-sided/README.md): aclarado moderado sin regresión nocturna visual como Lambert, pero el borde permanece. GPU de la candidata mayor en esta serie; no promover con una mejora limitada. Conservar alternativa QA y diagnosticar material subyacente/cobertura efectiva antes de otra corrección de iluminación.


### Diagnóstico: no confundir desgaste con alcance de hierba

[Seis parejas con falso color](river-cover-boundary/README.md) separan reducción por distancia y altura de ancla. El borde junto al poblado en media muestra reducción de ancla sin señal roja apreciable: no es solo LOD lejano. Suelo conserva textura herbácea donde la cubierta ya se elimina por desgaste. Priorizar coordinación material/máscaras, respetando caminos, antes de más ajustes de iluminación. Esta evidencia corrige la interpretación demasiado general del borde en ensayos anteriores.


### Gran Río: falta detalle de tierra bajo la cubierta

[Desgaste coordinado del material](river-ground-wear/README.md): 24 capturas, geometría igual. Al reducir Grass Medium 01 aparece color base casi uniforme y se pierde detalle en poblado/caminos; descartar implementación. Próxima prueba: capa de tierra reutilizable, revisando Ground079S existente, en lugar de retirar textura sin sustitución. Sin benchmark temporal por fallo artístico claro.


### Gran Río: tierra con detalle bajo el desgaste

[Ground079S pigmentado, segunda iteración](river-soil-layer-v2/README.md): recupera detalle de suelo desnudo y diferencia tierra/hierba; primera versión demasiado clara descartada. 24 capturas por iteración y 8 bloques ABBA para V2, geometría coincidente. Tres texturas adicionales (~16 MiB RGBA8+mips estimados), hasta tres lecturas en tierra. GPU con alta variabilidad y rangos solapados: candidata solo QA, sin aprobar coste. Pendientes movimiento, streaming y repetición de rendimiento.


### Capa de tierra: movimiento y liberación comprobados en una vuelta

[144 parejas, vídeos y streaming](river-soil-layer-motion/README.md). Cámara/viento/opacidades/geometría coinciden; muestra de regreso sin desplazamiento amplio, con pequeños residuales también en control. Tres eventos de liberación para tres texturas al cerrar cada candidata. Una vuelta por calidad no prueba ausencia de fugas; coste aún pendiente de repetición estable. Conservar QA sin promover.


### Tierra del río: coste móvil mixto

[Benchmark móvil de V2](river-soil-layer-motion/README.md): ocho bloques, 960 muestras GPU/1.440 frames, geometría igual. GPU diurna +~1,30 ms (11,4 %) agregado, noche menor; no promover todavía. Próxima optimización concreta: evitar leer mapas de hierba donde la capa de tierra los sustituye completamente, exigiendo equivalencia visual.


### Salida anticipada de tierra: no mejora GPU demostrada

[Paridad y benchmark móvil](river-soil-early/README.md): ocho de doce parejas exactas; otras cuatro suman cinco píxeles con máximo 1/255 tras sincronizar ocultaciones. 960 muestras GPU/1.440 frames no muestran ahorro consistente. Mantener opción desactivada; reducir lecturas teóricas no basta para aprobar la optimización.


### Cañón: tres muestras de microvisibilidad no aportan volumen

[24 capturas y análisis de altura](canyon-microshadow/README.md): solo 26–53 píxeles diurnos cambian; noche exacta. Descartar tres lecturas extra. Diagnóstico offline: 0,0384 % de texeles bloqueados con pasos .05/.12/.25 m a amplitud .10 m. No forzar profundidad; estudiar horizonte offline con pasos de texel antes de añadir más coste al shader.


### Cañón: precálculo solar recupera microdetalle, no volumen global

[ARH alfa con 32 pasos de medio texel](canyon-microshadow-bake/README.md): RGB conservado, sin nuevas lecturas. 24 capturas; seis parejas nocturnas exactas, cambios diurnos pequeños sin salto artístico claro. No incorporar. Evitar más rondas equivalentes de microcontraste; el relieve mesoscópico sigue pendiente.

### Gran Río: alinear desgaste no naturaliza la frontera

[Comparación V2 frente a transición .08–.30](river-soil-wear-aligned/README.md): 24 capturas con geometría idéntica. Reduce franja verde plana pero agranda y acentúa el claro circular. No promover; investigar forma espacial visual antes de más cambios de umbral.

### Gran Río: ruta nativa de máscaras confirmada

[Diagnóstico del borde irregular](river-yard-shape/README.md): modificar el generador JavaScript deja 12/12 parejas RGB exactas porque BiomeGround recibe bytes nativos. No es rechazo artístico. El siguiente piloto debe transformar una copia visual al recibir los bytes y comprobar cambios efectivos antes de ampliar capturas.

### Gran Río: transformación de máscara residente funcional

[Franja irregular monotónica](river-fringe-mask/README.md): 633 cambios de alfa registrados, 24 capturas, invariantes y solapes sintéticos correctos. Cambia suelo y selección de hojas sin tocar Wild Engine. No promover receta: irregularidad limitada y pérdida de cobertura; falta una mejora artística clara.

### Cañón: separar depósitos arenosos de grava

[Prueba de composición](canyon-sediment/README.md): 24 capturas, geometría idéntica. Cambio amplio de lectura frente a grava uniforme, pero arena procedural demasiado lisa y con patrón residual de piedras. No integrar receta; investigar material de arena coherente, no más microcontraste.

### Cañón: mapas de arena recuperan ondulaciones

[Depósitos Aerial Beach 01](canyon-sand-maps/README.md): 24 capturas, geometría idéntica. Candidata cercana con ondulaciones visibles, pero crestas demasiado destacadas en sombra. Dos mapas y dos lecturas extra; coste temporal, cámara normal y lifecycle pendientes. No integrar aún.

### Cañón: arena visible a cámara normal, coste nocturno pendiente

[Revisión normal](canyon-sand-maps/overview/README.md) y [ABBA Intel UHD](canyon-sand-maps/performance/README.md): 24 capturas adicionales; elevada obstruida no válida para evaluar conjunto. Arena conserva ondulaciones normales; 960 muestras GPU muestran noche 7.69–8.20ms contra 6.63–7.27ms. No aprobar coste ni integrar.

### Cañón: precalcular depósitos no ahorra GPU demostrado

[Máscara residente](canyon-sand-mask/README.md): 24 capturas con diferencias pequeñas (.036–.168/255), 960 muestras GPU. Día procedural7.51–7.69ms contra máscara8.16–9.60ms; noche variable sin ventaja. No promover. También pendiente tratar horizonte sin máscara; mantener receta procedural QA.

### Cañón: elevada útil y liberación de arena verificadas

[12 capturas elevadas](canyon-sand-maps/elevated/README.md): vista corregida muestra ambas orillas y ondulaciones; noche oscurece depósitos. world.dispose libera exactamente una vez cada uno de los dos clones. No equivale a prueba de fugas prolongada; coste nocturno y movimiento pendientes.

### Cañón: crestas claras vinculadas a reflexión ambiental

[Ablación normal/color](canyon-sand-ablation/README.md),18 capturas, y [reflexión](canyon-sand-reflection/README.md),12 capturas: normal plana elimina crestas pero borra volumen; color medio no elimina el patrón. Anular biomeSpec quita crestas blancas en sombra conservando relieve soleado, pero afecta otros materiales. No integrar anulación global; estudiar respuesta especular limitada a arena seca.

### Cañón: respuesta seca acotada a depósitos

[36 capturas](canyon-sand-dry/README.md): atenuación especular ambiental por peso de arena, conservando normales e iluminación directa. Reduce crestas claras cercanas y mantiene ondulación normal/nocturna. Conservar QA, no integrar: movimiento y coste total siguen pendientes.

### Cañón: arena seca sigue costando más con cámara móvil

[ABBA completo](canyon-sand-dry/moving-performance/README.md):960 muestras GPU,1440 frames, geometría y cámaras iguales. Día grava6.04–6.63ms/arena7.29–7.70ms; noche6.79–7.21/7.38–8.09ms. No aprobar presupuesto. Investigar reducir trabajo del material manteniendo relieve, no repetir la máscara descartada.

### Cañón: arena con un mapa, candidata de coste

[Normal-only seca](canyon-sand-normal-only/README.md):24 capturas frente a completa, una textura adicional verificada. ABBA móvil frente a grava: noche6.89–7.01ms contra6.85–7.06ms; control diurno deriva5.61–7.51ms y no permite aprobar presupuesto. Conserva relieve cercano con menor variación de color. Continuar, no integrar.

### Cañón: normal-only conserva lectura a cámara normal

[12 capturas y cierre real](canyon-sand-normal-only/overview/README.md): mantiene ondulaciones en normal diurna y elevada nocturna inspeccionadas, con color más uniforme. Una textura adicional, liberada una vez. Pendientes revisión temporal y medición diurna estable; no integrar.

### Cañón: aproximación cercana de arena normal-only

[Cuatro vídeos y 144 parejas](canyon-sand-normal-only/motion-close/README.md), media/baja y día/noche: cámara, hora y geometría coincidentes, cero errores registrados. Pareja diurna inspeccionada conserva ondulaciones; secuencia disponible para revisión temporal completa. Recorrido inicial oculto por meseta descartado y sustituido por aproximación corta despejada. No mide FPS ni streaming largo. Coste diurno todavía inconcluso; mantener QA sin integrar.

### Cañón: confirmación diurna de coste normal-only

[ABAB con 180 frames de calentamiento](canyon-sand-normal-only/day-confirmation/README.md):960 muestras GPU y960 frames separados de cadencia, cámaras/geometría iguales. Grava6.62–6.72ms frente a arena6.59–6.77ms; sin sobrecoste relevante observado en este recorrido bajo. No prueba aceleración ni coste cercano con mayor ocupación de pantalla. Conservar candidata; pendientes revisión temporal completa y streaming prolongado antes de integrar.

### Cañón: coste cercano limita la aprobación de arena

[ABAB cercano día/noche](canyon-sand-normal-only/close-performance/README.md):1920 muestras GPU y1920 frames, geometría/cámara iguales. Día +0.230/+0.536ms GPU frente a grava; noche mixta. Conservar candidata visual, no aprobar presupuesto universal desde la cámara anterior. Siguiente investigación: trabajo redundante de grava/POM y mezcla, con ablación que conserve lectura de material.

### Cañón: atenuación de POM bajo arena, prueba visual

[24 capturas](canyon-sand-buried-relief/README.md) comparan normal-only con/sin atenuar parallax residual de grava bajo depósito. Parejas cercanas media día/noche conservan ondulaciones, cambian detalle fino. No es equivalente exacto: grava conserva peso residual. Una textura y geometría iguales. Conservar QA para medir; no afirmar ahorro antes del benchmark ni activar por defecto.

### Cañón: descartar atenuación de POM como ahorro

[ABAB directo](canyon-sand-buried-relief/performance/README.md),1920 muestras GPU/1920 frames: candidata más lenta en cuatro parejas (+0.028/+0.429ms día,+0.543/+0.137ms noche), sin ahorro demostrado. No atribuir causa sin más instrumentación. Mantener buriedRelief=false y arena normal-only sin esta aproximación. No promover ni repetir la misma receta sin nueva hipótesis.

### Cañón: arena conserva distribución tras cambios de origen

[Streaming corregido](canyon-sand-normal-only/streaming-corrected/README.md):36 capturas,18 parejas, dos circuitos por fase,16 cambios de origen/variante. Regresos globales verificados; tira diurna mantiene depósitos. Una capa liberada una vez. Recuentos nocturnos regresan sin crecimiento acumulado observado; no prueba de fugas largas. Piloto con conversión doble de origen excluido. Coste cercano previo sigue vigente; no integrar todavía.

### Cañón: arena normal-only integrada como opción explícita

[`canyonSand=1` con global-lighting](canyon-sand-integrated/README.md), solo Cañón y off por defecto.12/12 parejas RGB exactas QA/integrada, media/baja día/noche, una capa y geometría iguales; build pasa. No incluye atenuación POM descartada. Coste cercano previo persiste; pendiente validar streaming integrado y revisión temporal. No aprobación global ni main.

### Cañón: streaming de canyonSand integrado

[18 parejas QA/integrada](canyon-sand-integrated/streaming/README.md):10 exactas RGB; otras1–7 píxeles, máximo10 niveles, causa no aislada. Cámaras/chunks/geometría iguales,16 cambios de origen por variante, textura adicional liberada una vez. Tira diurna conserva depósitos. Mantener opción explícita; pendiente revisión temporal continua. No afirmar paridad exacta global ni ausencia de fugas largas.

### Revisión conjunta V3: priorizar repetición de Manglares

[Seis biomas día/noche](combined-campaign-review-v3/README.md), calidad media y tres poses. Integra en la comparación paleta de Río, arena de Cañón y ceniza; otros tres controles sin cambios A/B. Persisten claro uniforme del Río, musgo repetitivo de Manglares y masas planas de ceniza. Siguiente prioridad: romper repetición y organizar cobertura de Manglares sin cambiar ocupación/siluetas. No hay benchmark nuevo ni aprobación global.

### Manglares: deformar UV no resuelve cobertura uniforme

[Prueba UV](mangrove-uv-warp/README.md):24 capturas tras corregir inserción de shader. Curva filas pero conserva formas abultadas uniformes; descartar artísticamente sin benchmark. Hallazgo de pipeline: uGroundPureMoss retorna antes de POM/máscaras generales y fija cobertura1. Siguiente trabajo debe actuar sobre esa rama real y distribución de material, no aumentar parallax inactivo.

### Manglares: dos escalas suavizan patrón pero exceden coste

[24 capturas y ABAB](mangrove-moss-scales/README.md):menos repetición gruesa, pérdida de relieve; GPU+1.81ms día/+2.12ms noche agrupados,1920muestras. Descartar mezcla doble en tiempo real. Investigar composición offline reutilizable manteniendo tres lecturas, sin presentar ahorro antes de probarlo.

### Manglares: composición offline a memoria nominal constante

[24 capturas](mangrove-moss-composite/README.md):tres mapas1024² con escalas1/4 precalculadas. Mantiene áreas gruesas y finas sin seis lecturas en runtime; shader original,16MiB nominal como fuente. Pierde ancho de banda fino y sigue repitiendo cada~8.7m. Conservar QA para benchmark/juntas/movimiento, no afirmar coste igual ni integrar todavía.

### Manglares: coste offline no concluyente

[ABAB de compuesto](mangrove-moss-composite/performance/README.md),1920muestras GPU/1920frames: +0.283ms día/+0.460ms noche agrupados, pero parejas cambian signo y una noche+1.108ms. No aprobar equivalencia o presupuesto estable. Revisar detalle cercano y juntas antes de más repeticiones; candidata solo QA.

### Manglares: compuesto cercano insuficiente para promover

[24 capturas cercanas](mangrove-moss-composite/close/README.md):rompe uniformidad pero detalle fino granular y volumen todavía plano en oblicua; no promover. Bordes numéricos no certifican juntas y normal horizontal empeora relativamente. Mantener estudio; siguiente cambio debe mejorar estructura/transición a humedad, no solo escala.

### Manglares: borde variable insuficiente; avance de musgo candidato

[36 capturas en dos ensayos](mangrove-mud-fringe/README.md):variar anchura conserva disco; avance desigual de musgo hacia interior rompe contorno aparente en parche cercano día/noche. Geometría/ocupación intactas. Reduce área visible y podría borrar parches pequeños: conservar QA para normal/tamaños/coste, no integrar. Sin benchmark nuevo.

### Manglares: el borde irregular fijo no supera la vista general

[24 capturas y 12 parejas](mangrove-mud-fringe/overview/README.md), media/baja, día/noche y tres vistas. Cámaras, hora y geometría coinciden. La inspección elevada diurna y normal nocturna muestra reducción excesiva de varios parches: descartar el avance fijo de 2,2 unidades, sustituyendo la valoración provisional cercana. Sin nuevo benchmark; primero preservar núcleos de barro con un límite dependiente del tamaño. El musgo repetitivo sigue sin alcanzar la referencia artística.

### Manglares: borde limitado por tamaño, solo QA

[24 capturas y benchmark ABAB](mangrove-mud-fringe/sized-inset/README.md). El radio aproximado del contorno limita el avance y conserva mejor el núcleo de barro en las vistas inspeccionadas. 1.920 muestras GPU válidas y 1.920 frames de cadencia, con geometría coincidente; diferencias GPU cambian de signo y último bloque nocturno empeora notablemente. No hay coste estable demostrado: conservar solo como prototipo visual, pendiente temporal/streaming y diagnóstico de variabilidad. No resuelve el musgo repetitivo ni acredita calidad global.

### Borde de Manglares: recarga acotada validada

[Dos circuitos y cierre del mundo](mangrove-mud-fringe/sized-inset/streaming/README.md), 36 capturas/18 parejas, misma cámara/geometría. Atributos válidos en chunks cargados; 371.100 bytes adicionales constantes al volver; 24 geometrías notifican dispose una vez y cero referencias activas tras cierre. Retornos nocturnos exactos, diurnos con residuo pequeño no aislado. No prueba prolongada de fugas ni coste estable. Mantener QA y volver a priorizar la estructura superficial del musgo y su relación con los otros biomas, no seguir acumulando retoques menores de borde.

### Manglares: escala uniforme fina insuficiente

[Ensayo .115 frente a .32](mangrove-moss-fine-scale/README.md):24 capturas/12 parejas, media/baja, día/noche, cámara/geometría coincidentes. Reduce los abultamientos grandes pero conserva cobertura homogénea y pierde lectura nocturna. No promover ni hacer benchmark de esta candidata como solución completa. Siguiente hipótesis: distribución de materiales por condiciones del terreno, no otra intensidad universal de normal o escala.

### Manglares: ruta contextual existente descartada como sustitución

[24 capturas](mangrove-context/README.md) comparan pureMoss con la rama contextual existente, misma escala/mapas y amplitud parallax cero. Cámara/geometría coinciden. Brillo húmedo extenso y zonas oscuras homogéneas; no adoptar. La rama mezcla color base fuera del musgo, no otro material texturizado. Reutilizar máscaras requiere desacoplar cobertura y humedad, verificar sus datos reales y diseñar distribución entre materiales; no basta con desactivar pureMoss. Sin nuevo benchmark por fallo artístico.

### Manglares: rangos contextuales verificados en campaña espacial

[Auditoría de 25 máscaras enlazadas](mangrove-context/mask-audit/README.md): cobertura R mediana235/255 y máximo245, frente al límite0.42 del generador JS de humedal. La partida utiliza payload nativo; no calibrar mezcla con el rango antiguo. G/B aportan variación espacial y A desgaste localizado. Diseñar mezcla visual sin alterar motor, pendiente horizonte y otras semillas. Esta auditoría no es una mejora visual ni un benchmark.

### Manglares: mezcla texturizada todavía insuficiente

[Dos repartos de musgo/barro](mangrove-substrate/README.md),48 capturas/24 parejas. Primero demasiado barro; segundo conserva verde pero aparece mancha amplia de detalles superpuestos. Ninguno aprobado. Mezcla de mapas reales con rugosidad alta evita la respuesta húmeda anterior, pero necesita transición por estructura/altura y coherencia con parches. Tres lecturas extra de mapas y una máscara; sin benchmark por fallo artístico, horizonte y lifecycle pendientes. No seguir solo ajustando umbrales.

### Manglares: transición por altura, candidata sin aprobar

[48 capturas](mangrove-height-blend/README.md) frente a mezcla lineal. Mapas de altura con medianas186/255 y39/255 requieren normalización artística antes de comparar. La variante calibrada separa musgo/barro, pero tiene borde de detalle pequeño y barro nocturno azulado. Conservar solo para estudiar primer plano/movimiento y coherencia de color; coste, horizonte y recursos pendientes. No integrar ni declarar mejora global.

### Manglares: la transición por altura no basta para volumen

[24 capturas cercanas](mangrove-height-blend/transition-close/README.md) en región seleccionada por máscara contextual. Separación visible entre materiales, pero musgo pegado al plano, sin espesor/oclusión de borde, y barro cromáticamente incoherente. No integrar ni endurecer máscara para simular volumen. Sin benchmark nuevo; piloto inicial sin transición excluido.

### Manglares: conversión de color no resuelve la discrepancia

[24 capturas](mangrove-height-blend/linear-color/README.md) con transición por altura fija: multiplicador en RGB codificado frente a luz lineal aproximada. Barro más claro, pero sigue diferencia con parches y tinte nocturno. No adoptar como corrección completa; toLinear4 es gamma2.2, no sRGB exacto. Separar iluminación/rugosidad de las dos rutas antes de más calibración cromática. Sin benchmark ni integración.

### Manglares: el azul no desaparece al atenuar especular ambiental

[Ablación localizada](mangrove-height-blend/soil-spec/README.md),24 capturas con escena/geometría coincidentes. biomeSpec ponderado por cobertura de musgo: barro más oscuro, pero persiste tinte nocturno y diferencia con parches. No adoptar supresión general ni atribuir toda la discrepancia a reflejos. Sin benchmark; el cálculo original sigue ejecutándose.

### Manglares: receta compartida mejora coherencia, coste no aprobado

[24 capturas y ABAB](mangrove-height-blend/soil-toon/README.md). La receta del barro aproxima su respuesta a los parches, cálida de día y menos azul de noche. 1.920 muestras GPU válidas/1.920 frames, misma geometría; deriva fuerte y candidata más lenta en ambas noches (+5.944/+1.008ms). Conservar referencia visual, no integrar doble iluminación sin evitar trabajo redundante y validar coste/imagen. No demuestra volumen global ni presupuesto cumplido.

### Manglares: omitir iluminación sin peso ofrece ahorro nocturno

[Capturas, repetición y ABAB](mangrove-height-blend/lighting-skip/README.md).11/12 parejas iniciales exactas;18 píxeles residuales en una pose. Repetición baja6/6 exactas, causa del residuo no aislada.1.920 muestras GPU válidas/1.920 frames: noche−2.934/−0.647ms frente a doble iluminación; día+0.749/−0.394ms. Conservar candidata QA, no aprobar presupuesto global; flag falso por defecto. Coste total frente a musgo puro pendiente.

### Decisión del conjunto de Manglares: no integrar

[Comparación total contra musgo puro](mangrove-height-blend/full-review/README.md):24 capturas y1.920 muestras GPU válidas/1.920 frames. Sobrecoste en los cuatro pares:+4.735/+3.669ms día,+4.622/+3.862ms noche (promedios+47.9%/+45.2%). La distribución mejora, pero no el volumen suficiente. Descartar esta implementación de mezcla/iluminación para integración; sustituye recomendaciones provisionales previas. Conservar hallazgos de máscaras/color/altura, no seguir puliendo pequeños umbrales de esta receta. Retomar prioridades Sabana/Gran Río/Gran Cañón; objetivo global no alcanzado.


## Corrección de criterio por indicación del usuario: calidad y coste separados

La valoración artística no se descarta automáticamente al superar un presupuesto de GPU. Una variante visualmente prometedora se conserva con receta, capturas y coste, pendiente de optimización local o compensación medida en otros sistemas. No activar por defecto no significa abandonar la dirección visual. Las simplificaciones deben compararse con la mejor imagen conservada, no solo con el original plano.

Queda revocada la recomendación anterior de abandonar el sustrato completo de Manglares: el usuario aprueba su aspecto y pide optimizarlo. Sus medidas siguen vigentes; no hay aprobación de rendimiento ni de integración en main. Véase [revisión de decisiones](VISUAL-CANDIDATES-REVIEW.md).


### Manglares: optimización conservando la referencia visual aprobada

[Protección por altura](mangrove-height-blend/sample-gate/height-guard/README.md): seis parejas reales,8–25 píxeles residuales por imagen.1920 muestras GPU válidas; cuatro diferencias favorables, pero magnitud variable (−.087 a−1.927ms) y última candidata con peor CPU/cadencia. Conservar candidata sin afirmar equivalencia exacta ni ahorro estable. La receta visual aprobada sigue intacta; no se abandona por coste.


### Manglares: color-only no acredita ahorro estable

[Benchmark de color condicional](mangrove-height-blend/sample-gate/color-only/performance/README.md):1920 muestras GPU válidas; diferencias diurnas+5.446/−1.108ms, nocturnas−.019/−3.543ms, con fuerte variación del control. No promover como optimización demostrada. Las72 parejas móviles conservan diferencias pequeñas, pero no sustituyen la prueba de coste. La receta visual aprobada se conserva; ampliar validación de recursos y buscar trabajo redundante sin degradar la imagen.
