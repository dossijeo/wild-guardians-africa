# Actor residente del REST/WATCH exterior desde 20 — 2026-11-18

Continúa `741854b96`, A6-04.f-R3/e-R3. Roster y actor existentes admiten el nuevo origen exterior 20 sin modificar producción. Se comprueba su conservación durante 21, aproximación seleccionada 22 y REST21 de llegada. Surface/puertos/Host/GPU siguen siendo el siguiente punto.

## Investigación y decisión

Se releyó el código instalado de [Three r180 AnimationMixer._bindAction/_activateAction](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationMixer.js#L53-L185): identifica bindings por raíz y pista, reutiliza referencias y distingue su vida activa. El snapshot es idéntico al upstream ya verificado. Esa conservación de identidad ya está resuelta en el actor residente, variantes y bancos existentes. Se valida su reutilización; no se añade mixer, caché, propietario ni dependencia.

## Comprobaciones

- **16 cadenas REST/WATCH × cuatro perfiles × normal/pthread** preparan y adquieren un 20 genuino antes del primer 21. Durante 20→21→22→REST21 se conservan actor, raíz estática, geometrías/índices, texturas, datos y versiones de los bancos; una adquisición del actor y cero disposiciones de bancos durante el recorrido. Liberar una asociación 20/21 antigua no retira al propietario nuevo.
- Preparar/activar/revertir21 conserva cuerpo y Game. Cancelar restaura materiales y visibilidad; retirada o sustitución de remaining/RNG/retry/ancla/marcador invalida la candidatura antes de adquirir21.
- Retiming retaga el grafo existente y conserva los conteos del registro y la geometría; la adquisición usa el ticket preparado y la frontera real. Color y sombra generan programas con ambos bancos Idle/Alert y tags del ciclo versión2/origen20 exactos.
- Picking usa edades enviadas 0/0,5/1 del horizonte finito sobre la raíz conservada. No se infiere de ello precisión visual en hardware ni cadencia.

## Evidencia y alcance

**36 nuevas y 141 dirigidas en 5 archivos pasan**, sin fallos ni omisiones. Primero pasaron las 16 cadenas; después la selección ampliada de 36. Son pruebas de componente: Game, nativo, GLB/bancos originales, terreno y generación TSL/WGSL son reales; renderer, admisión y relojes de picking son dobles. Los commits/finalizaciones del fixture son de confianza.

Dos recibos detallados conservan las asociaciones y las identidades/datos/versiones/hashes de los bancos antes y después. Son objetos de Three y bytes de assets, **no IDs de asignaciones del dispositivo**. No hay prueba nueva de Surface, preparación física de GPU ni ausencia de tirones.

**478 inputs probados/64 nativos sin cambios/16 ajenos exactos**. Los 476 inputs previos son idénticos. La validación amplia anterior (3.392/3.393, una omisión/siete exclusiones históricas; 847 dirigidas; build de 46,32 s) se referencia como heredada, no se repite: solo se añaden pruebas/helper/documentación. No se recompila WASM ni Vite y no se ejecuta GPU hardware en esta entrega.

[Fuentes, hashes, selecciones y recibos de recursos](performance/native-initial-idle-outside-graphics-validation-20261118.json).

Siguiente: Surface/puertos/Host y GPU del origen 20 exterior. Continúan pendientes productor/cohort/paradas/relevos ordinarios, cierre fallido del Host, recuperación incremental de 3.123 recursos y cadencia/plataforma. A6/A/B/C abiertos; D no iniciado.
