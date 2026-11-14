# f-R4 parcial: Carry nativo y parámetros de ruta como datos

14 de noviembre de 2026. Base `9a7df2d37`, rama `codex/guardian-3d-animation`.
Continúa [Run/Walk](f-r4-native-run-walk-20261114.md), el
[plan integrado](integrated-gpu-migration-plan-20261104.md) y la
[corrección de A6](intent-route-architecture-correction-20261108.md).
No cambia ningún cierre: e-R3/e-R4/f-R4 y los once padres de A6 siguen abiertos.

## Referencias consultadas y adaptación

Se consultó código fuente antes de implementar cada mecanismo:

- [Godot 4.5.1, BoneAttachment3D](https://github.com/godotengine/godot/blob/4.5.1-stable/scene/3d/bone_attachment_3d.cpp#L274)
  compone el attachment con el hueso de su skeleton. Se conserva ese propietario:
  las nueve piezas de nuestra caja usan las matrices ya precocinadas junto al
  cuerpo. No se añade un rig ni un solver independiente.
- [Babylon.js 8.0.0, TransformNode.attachToBone](https://github.com/BabylonJS/Babylon.js/blob/8.0.0/packages/dev/core/src/Meshes/transformNode.ts#L888)
  mantiene el padre y la base del skeleton al asociar un objeto; nuestro relevo
  conserva las geometrías, fuente y restauración del propietario baked existente.
- [Babylon.js 8.0.0, bakedVertexAnimation.fx](https://github.com/BabylonJS/Babylon.js/blob/8.0.0/packages/dev/core/src/Shaders/ShadersInclude/bakedVertexAnimation.fx)
  expresa rango, offset y velocidad mediante datos uniformes; se adapta ese patrón
  a número de nudos, columnas, duración y orientación de la ruta.
  [Three r180, Pipelines.getForRender](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Pipelines.js#L142)
  reutiliza programas por su código shader exacto. Esos cuatro parámetros dejan
  de cambiar el WGSL. No se modifica la caché de Three ni se añade una dependencia.

## Implementación conectada

La captura del bridge expone los seis bits `motionFlags` ya calculados por C++.
El receptor conserva y valida esos bits; paquetes v1 antiguos sin el campo usan
cero. No cambia el stride de 16 columnas ni se reconstruye WASM. Carry exige el
bit nativo correspondiente y la propiedad confirmada de la misma caja en
trabajador y `state.crates`. Recuperación, incapacidad, puertas, intervalos
retenidos y una combinación Carry/Run incoherente siguen rechazados.

El roster espera la carga/admisión normal de Carry y prepara una alternativa
oculta de sus materiales sobre el mismo actor. La versión anterior permanece
activa hasta que la admisión completa publica el relevo. La validez comprueba
otra vez la identidad de la caja después de cada espera y antes de activar.
Walk → Carry y Carry → Walk reutilizan los propietarios de clips existentes;
al activar se ocultan tanto los meshes GPU descartados como los originales CPU,
incluidas las piezas de caja que podrían seguir visibles bajo el rig congelado.
La restauración y retirada conservan los fences existentes.

Cuerpo y caja consumen `carryPhase` y la posición/orientación del mismo recurso
nativo. El rig CPU permanece quieto; el proxy de selección se prepara solamente
para una entrada con el tiempo congelado del consumidor. No hay muestreo de
huesos por frame ni escritura periódica de fases desde el preparador.

## Evidencia y coste pendiente

[Recibo WebGPU actual](performance/native-worker-world-owner-carry-parameters-20261114.json),
[pose inicial](performance/native-worker-world-owner-carry-parameters-20261114-start.png)
y [pose posterior](performance/native-worker-world-owner-carry-parameters-20261114-moved.png).
WorldClient → WorldWorker → WorldSurface → roster y draw Worker normales,
C++/WASM real, GLB/texturas/bake originales olderFemale, NVIDIA Turing:

- Bloqueo real de preparación de 500 ms: 15 dibujos y reloj nativo finito.
- Las nueve piezas conservan sus IDs de mesh/geometría durante el bloqueo y
  después de sustituir la ruta. El hash de transformaciones CPU no cambia.
- La misma asignación se reutiliza sin recursos adicionales. Los totales de
  arranque varían entre ejecuciones; solo se compara antes/después del mismo ensayo.
- Cero fábricas GPU en el primer render inicial y del relevo; mismo dispositivo
  y generación, cero errores GPU/JS/consola/HTTP y drenaje antes de liberar WASM.

También se instrumenta ahora la preparación, separada del primer render.
El [recibo anterior a uniformizar parámetros](performance/native-worker-world-owner-carry-20261114.json)
es una revisión intermedia de este incremento. El relevo preparaba 22 pipelines;
con los parámetros como datos prepara 12, manteniendo una textura nueva para la
ruta. Todavía crea 213 buffers y 108 pares de bind groups/layouts. Esto **no**
prueba reutilización completa ni ausencia total de tirones. El análisis de WGSL
localiza seis programas de skinning que solo cambian nombres internos y seis
programas de sombra idénticos recreados; debe reducirse el trabajo de materiales
no utilizados antes de aceptar el presupuesto integrado. No se conservan
programas indefinidamente ni se falsean sus claves para esconder ese coste.

La prueba de builder real exige WGSL exactamente idéntico para dos rutas con
número de nudos, columnas, duración y yaw diferentes. Las pruebas de roster usan
GLB/bakes originales y verifican Carry, picking, relevo en ambas direcciones,
visibilidad de originales, conservación del rig y rechazo al cambiar la caja.
Los resultados de pruebas, comparación con base y build figuran en
[validación](performance/native-carry-validation-20261114.json).
61 pruebas dirigidas aprobadas, sin omisiones. Regresión de 40 archivos: 561 casos,
539 aprobados, tres fallos y 19 omisiones. Los mismos tres fallos y 19 omisiones
se reproducen con los seis módulos de producción originales de `9a7df2d37` en
los tres archivos afectados: admisión Carry, horizonte Harvest y mock de gate con
ABI antiguo. No se corrigen fixtures para ocultarlos. Build aprobado en 45,43 s
y verificación de sintaxis de scripts de navegador aprobada.

## Siguiente trabajo y límites

El ensayo comienza con una caja confirmada ya transportada y sustituye Carry
por Carry. Los casos de Walk ↔ Carry verifican la preparación gráfica con estado
confirmado; no prueban todavía recogida, entrega, economía ni su ejecución nativa
ordinaria. No se activa la alimentación automática de rutas ni se retiran los
movers JS ordinarios por disponer de esta API.

Quedan Idle/puerta/acción, fases persistentes al cambiar intención, productor y
executor comunes de entidades/consecuencias, AttackCrops y todas las intenciones,
mutaciones con personajes/efectos en movimiento, recuperación, guardado y aceptación
A–F/B/C. El próximo incremento conserva este orden e investiga en fuentes reales
cómo limitar la admisión a los recursos cuyo uso cambia.
