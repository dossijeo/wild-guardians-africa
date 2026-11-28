# Preparación compartida de Idle y Alert sobre el actor residente

Continúa [el control de Idle inicial](e-r3-native-initial-idle-control-20261116.md). El selector precocinado existente admite los clips originales Idle y Alert en una misma variante. La preparación puede partir de la vigilancia ya presentada, conservar su actor y revertir el relevo. Es una primitiva de preparación; aún no concede la admisión ejecutable de Idle inicial ni migra su política.

## Código de referencia y adaptación

Antes de diseñar este cambio se revisaron las implementaciones reales de Three.js 0.180.0: [activación y reutilización de bindings en `AnimationMixer`](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationMixer.js#L123-L163) y [origen programado, tiempo local y final acotado de `AnimationAction`](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationAction.js#L553-L778). La activación reutiliza bindings y conserva sus referencias; el tiempo pertenece a la acción, separado de la construcción del objeto. Se aplica ese criterio a la preparación y se conserva la autoridad temporal pendiente del propietario nativo.

También se contrastó el código local del selector Plant/Water, que ya evalúa varios clips residentes sin construir otro rig. Se reutilizan su grafo, validación de huesos/canales/origen, matrices precocinadas y materiales. La única ampliación del catálogo permitido es Alert; el límite de cuatro clips y sus comprobaciones permanecen. No se añade biblioteca, motor, jugador de animación o precarga exhaustiva.

## Cambio

El adaptador de trabajador permite seleccionar el Alert ya instalado como base de una variante nativa y conserva la captura reversible de visibilidad. Un Alert activo es una pose estacionaria válida desde la que preparar otro movimiento; siguen bloqueadas las presentaciones GetUp, Fall, Water, Plant y Harvest que requieren sus relevos específicos. La validación del permiso físico y del commit continúa en sus propietarios actuales.

Idle/Alert comparte los mismos objetos de material y la misma clave estructural del programa al cambiar el selector uniforme y la fase. Se conserva el actor, sus huesos, geometrías e índices; no se crea un actor para cada clip. La cancelación y rollback recuperan la vigilancia anterior y sus materiales, en vez de obligar a presentar primero una pose Idle intermedia.

## Validación

Los siete casos nuevos pasan para los cuatro perfiles originales. Comparan vértices de selección contra la animación CPU original con tolerancia inferior a 0,02 unidades y comprueban identidad de actor, huesos, geometrías, índices, materiales y clave estructural durante varios cambios Idle/Alert, sin nuevas conversiones de material. Comprueban también el relevo reversible Alert → Walk y rechazan bancos incompletos, duplicados o de otro origen antes de cambiar la vigilancia.

El generador real de nodos de Three compila ambos bancos de texturas tanto para color como para la sustitución de material del pase de sombra. Las pruebas de preparación usan fases uniformes de prueba: no simulan una tarea o permiso nativo de Idle para conseguir ese resultado.

Un cargador de lectura con sólo los dos módulos de renderizado del commit anterior reproduce seis fallos en los casos positivos nuevos; el caso negativo y catorce casos ajenos seleccionados para omisión se mantienen separados. El producto no se modifica durante ese contrajemplo. Los resultados de regresión y compilación se registran en [la validación](performance/native-idle-alert-variant-validation-20261116.json).

Pasan 7/7 casos nuevos dirigidos (3.351,6776 ms; 14 omitidos por filtro) y 807/807 de regresión en 74 archivos (458.752,4221 ms), incluidas las pruebas completas existentes de Idle, Alert y horizonte. Producto compila en 45,71 s. Los nueve hashes nativos y los 16 archivos previos protegidos permanecen idénticos por bytes.

Esto verifica compatibilidad estructural y reutilización de objetos; no es una medición de asignaciones GPU reales ni un ensayo de hardware de Idle inicial. Faltan el binding nativo y transactor de su admisión estacionaria, su consumidor temporal autorizado y la ejecución completa de descanso/vigilancia/paseo con RNG y anclas originales. También permanecen abiertos productor ordinario, otros finales y puertas, nacimiento físico en partida viva, sustitución de mundo, recuperación incremental de los 3123 recursos sanos y aceptación A/B/C antes de D. Ningún cierre cambia por esta primitiva.
