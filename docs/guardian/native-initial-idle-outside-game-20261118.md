# REST/WATCH exterior: puente tipado y Game — 2026-11-18

Continúa `77db85869`, A6-04.f-R3/e-R3. El nativo ya admitía explícitamente un 21 de reintento desde el 20 genuino adquirido fuera del ancla. El puente seguía usando la entrada antigua y el DTO rechazaba su header2. Ahora selecciona esa capacidad y reconoce únicamente esa combinación de origen/versión. Game proyecta el ciclo y la aproximación con sus mecanismos existentes.

## Investigación y decisión

Se leyó la implementación instalada de [Three r180 GLTFLoader.parse](https://github.com/mrdoob/three.js/blob/r180/examples/jsm/loaders/GLTFLoader.js#L415-L475), no solo su documentación: comprueba la versión antes de construir el parser. Se adapta esa discriminación al contrato existente, con versiones numéricas exactas y rechazo de campos/procedencia inválidos. No se copia su tratamiento permisivo de extensiones ni la comparación del primer carácter. Snapshot y hash en el recibo. No se añade dependencia, propietario, registro, caché ni reloj.

## Comportamiento

- El puente requiere `nav_idle_cycle_initial_retry_version()===1` y la función explícita solo para un origen `native-initial-idle-body-attestation` exterior al ancla real. Mantiene las entradas de WALK fallido, Farm e interior. Un WASM anterior rechaza con un error de capacidad antes de adquirir21.
- El DTO admite versión2 para ese20 exterior y reutiliza el horizonte mínimo programa/reintento. Conserva cuerpo20, secuencia adquirida, primer estado privado exacto, calibración y frontera causal. Sus sucesores estacionarios pueden conservar REST/WATCH parcial; el siguiente WALK valida remaining/RNG/retry/destino originales con el decodificador existente.
- No cambia producción Game ni C++/WASM. Las pruebas ejercen `Game.tick`, guardado público, autoridad nueva, proyección20/21/22 y REST21 de llegada reales. La intención no mueve el cuerpo ni instala la fase antes de adquirirla. El movimiento empieza en22; carga fría de ese WALK usa request2 nuevo y no hereda permisos.
- Se factoriza únicamente la creación del guardado real en el fixture anterior. El nuevo fixture Game tiene un trabajador nativo y commits de confianza; no conecta un peer Home legado a Game como si tuviera admisión nativa.

## Validación

**30 pruebas nuevas pasan**: REST/WATCH × cuatro perfiles × normal/pthread recorren20→21→22, guardado del WALK, nueva autoridad/request2→22→REST21. Se preservan remaining y RNG privados y no se consume el RNG global. También cubren reintento cero, coincidencia con fin REST, fin de fase antes del reintento, bloqueo y reparación, sucesores parciales, retiming/cancelación con ticket preparado, guardado de21 sin heredar permisos y preempción Home genuina desde20/21.

Los negativos rechazan variantes, horizonte, fase, origen, campos extra y objetos congelados ajenos; preparación con semántica alterada y proyección con pose física sustituida fallan antes de modificar el cuerpo. La proyección de un dueño ya adquirido escribe su estado nativo: no se cambia ese comportamiento para satisfacer una expectativa incorrecta de prueba.

Baseline: **29 fallos/1 pase** de30. Primera ejecución tras implementar:26 pases/4 fallos por supuestos del fixture (pose frente a semántica proyectada, pared añadida después de preparar y nombre del campo de traducción). Se conservan logs/snapshots; solo se corrigieron las pruebas. Segunda:30/30. Dos recibos detallados conservan cadenas Game y dos negativos con WASM anterior demuestran rechazo de capacidad sin modificar trabajador/cuerpo ni adquirir21.

**847 dirigidas/47 archivos**, **3.392 de 3.393 seleccionadas/283 archivos**, una comparación opcional omitida y siete exclusiones históricas. Build **46.32 s**. **474 inputs probados/64 nativos sin cambios/16 ajenos exactos**; worker ajeno intacto. Sin recompilación WASM ni captura GPU nueva en esta entrega tipada/Game.

[Evidencia, referencias, hashes, pruebas, cadenas y rechazo de capacidad](performance/native-initial-idle-outside-game-validation-20261118.json).

## Siguiente punto y límites

Siguiente: control del20 exterior y su21, después roster/actor/Surface/GPU. Estos fixtures no conceden un permiso gráfico ni prueban el productor ordinario. Las capturas GPU del checkpoint anterior siguen siendo regresiones heredadas. No se acepta cadencia ni se declara resuelta la reconstrucción de3.123 recursos: su recuperación incremental sigue pendiente, al igual que cierre fallido del Host, productor/cohort/paradas/relevos ordinarios y plataforma. A6/A/B/C permanecen abiertos; D no iniciado.
