# Variantes de acción sobre el cuerpo gráfico admitido

Continuación del [candidato nativo de acción](e-r3-native-task-action-proposal-20261115.md).
e-R3/e-R4/f-R4, los once puntos principales de A6 y A/B/C siguen abiertos.
Este incremento prepara las variantes de clips en los propietarios gráficos
existentes. **Falta conectarlas al reloj, al paquete retenido y al commit nativo
de la acción**; todavía no se activa la acción en la partida ordinaria.

## Reutilización y selección

`prepareNativeMotionVariant` y `prepareMaterialVariant` pueden preparar ahora
una selección acotada de Harvest/Plant/Water/Idle. Reciben las texturas existentes
y nodos de fase/selección; no crean un temporizador, ejecutan el mixer por frame
ni deducen permiso a partir del estado del renderer. La selección se evalúa en
el grafo TSL. El consumidor autoritativo del reloj aún debe conectarse.

El cuerpo conserva las mismas mallas, geometrías y bases de skinning admitidas.
Se preparan materiales alternativos para esas mallas. Los catálogos incompletos,
duplicados, de otro archivo/rig o con bases incompatibles se rechazan antes de
alterar la presentación. Las reglas anteriores de locomoción se conservan.

Water tiene seis mallas rígidas de accesorios que Plant no usa. La variante
incorpora únicamente esas mallas, compartiendo sus geometrías y materiales de
origen; no construye otro rig ni otro cuerpo. Sus matrices se leen de la textura
original de Water. Fuera de ese clip sus vértices forman primitivas de área cero,
también en el pase de sombras, y se omiten del picking. El cuerpo y los accesorios
usan la misma selección de clip al congelar la pose para entrada.

Los materiales canónicos de los accesorios se conservan al construir la
presentación existente: un binding corporal antiguo puede haberse retirado antes
de la primera acción y ya no puede resolverlos. Las referencias se obtienen de
los grupos de herramientas originales y sus mallas hijas. No se reconstruyen
texturas ni se consulta un binding ya cerrado.

## Preparación, sustitución y retirada

Las mallas nuevas permanecen ocultas durante la preparación. Activar la variante
oculta los accesorios de la selección anterior; una reversión recupera esa
selección y sus visibilidades. Retirar la variante activa restaura los accesorios
originales para la presentación posterior. Esa visibilidad se conserva por modelo,
antes de su primera variante; la sucesora puede restaurarla incluso después de
retirar a su predecesora. Retirar una variante anterior después de un reemplazo
no altera los recursos de la nueva propietaria.

La validación comprueba también geometría y material de cada malla candidata.
El binding de movimiento existente instala y revierte cuerpo y accesorios como
el mismo reemplazo. Cancelar libera únicamente las mallas/materiales de la
variante; las geometrías y texturas compartidas siguen perteneciendo a sus bancos.
`valid()` acredita vigencia de la fuente, **no pipelines preparados ni autorización
de una acción**. La admisión común y el recibo causal siguen siendo obligatorios.

## Código fuente consultado

Se revisó [Babylon.js 8.0.0, `BakedVertexAnimationManager.bind` y `setAnimationParameters`](https://github.com/BabylonJS/Babylon.js/blob/8.0.0/packages/dev/core/src/BakedVertexAnimation/bakedVertexAnimationManager.ts)
(125–138, 158–160), junto con su [shader de animación precocinada](https://github.com/BabylonJS/Babylon.js/blob/8.0.0/packages/dev/core/src/Shaders/ShadersInclude/bakedVertexAnimation.fx)
(8–25). La textura residente se mantiene y los parámetros de reproducción
seleccionan los frames en el shader. Se adapta esa separación a los bancos y
grafos TSL existentes; se conservan las bases, interpolación y reglas de los clips
originales de Wild Guardians. No se añade Babylon ni otra biblioteca.

## Validación y alcance

La [evidencia final](performance/native-worker-action-variants-validation-20261115.json)
registra hashes y resultados. Los trece casos nuevos cargan las geometrías y los
clips originales de los cuatro perfiles. Comparan vértices de cuerpo/accesorios
con el rig original, comprueban identidad de las geometrías reutilizadas,
visibilidad, retirada de un binding previo, cancelación y reemplazo mediante el
binding real de movimiento. El constructor real de Three genera WGSL de color y
sombras para cuerpo y accesorios; **esa comprobación no es una ejecución GPU de
la acción nueva**.

Las regresiones GPU conservan los escenarios existentes de primera tarea y
reanudación, con fuente `SpatialGameSession` en la página y los Workers gráficos
reales. No sustituyen la aceptación de la acción ni del productor ordinario.
Los cinco fallos históricos de la selección amplia permanecen identificados.

El siguiente enlace pendiente es asociar esta selección al candidato nativo y a
su reloj físico, preparar el paquete retenido con los propietarios existentes y
exigir su recibo antes del commit. Después siguen ejecución/consecuencias,
persistencia de acciones, productor ordinario, otras intenciones y aceptación.
