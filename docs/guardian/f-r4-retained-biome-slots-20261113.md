# f-R4: conservar los lotes de props sin cambios

Incremento iniciado el 13 de noviembre; validación final del 14 de noviembre de 2026.

Continúa la [instalación nativa preparada de props](f-r4-native-prepared-props-20261113.md).
**f-R4, e-R3/e-R4 y los once padres A6 permanecen abiertos.** Conservar recursos
intactos es parte del contrato A4/f-R4; esta comprobación del mecanismo no es la
campaña integrada de rendimiento D ni aceptación de autonomía.

## Investigación aplicada

Se leyeron las implementaciones reales antes de diseñar el cambio:

- [Godot 4.5, MeshStorage/MultiMesh](https://github.com/godotengine/godot/blob/4.5/servers/rendering/renderer_rd/storage_rd/mesh_storage.cpp):
  `_multimesh_mark_dirty` distingue regiones y cambios de bounds;
  `_update_dirty_multimeshes` actualiza regiones modificadas y usa una copia más
  amplia cuando muchas regiones están sucias. La identidad del resto de recursos
  permanece estable. Se adapta su separación de datos modificados y conservados.
- [Three r180, InstancedMesh](https://github.com/mrdoob/three.js/blob/r180/src/objects/InstancedMesh.js):
  `setMatrixAt` escribe el array de instancias; geometría y datos de instancia
  tienen identidades separadas. La actualización y los bounds se solicitan
  explícitamente. Se conserva esa separación dentro del catálogo existente.

Nuestros lotes efectivos son inmutables durante la preparación previa al commit.
Por eso se preparan los slots modificados en otro grupo y se conservan los slots
idénticos en sus grupos admitidos. No se escribe anticipadamente en sus buffers
efectivos. No se introduce BatchedMesh, otro renderer, dependencia o propietario.
Dentro de un slot modificado aún se prepara un lote nuevo: no se afirma haber
implementado las actualizaciones parciales de MultiMesh a esa granularidad.

## Propiedad, admisión y publicación

El adaptador conjunto terreno/bioma solicita retención de slots en el propietario
de props. Se requiere la misma época, fuente visible completa, ausencia de otro
pending, instancias canónicas idénticas y los mismos grupos LOD, prototipos,
geometrías/materiales y máscara efectiva, además del estado de fuente. Una
supresión nueva prepara el slot aunque sus instancias canónicas no cambien.
Los grupos con overrides externos,
visibilidad/capas distintas o fuentes sustituidas siguen la ruta conservadora.
La readmisión visual de una misma revisión conserva su contrato anterior.

El coordinador existente admite una lista explícita de raíces por participante:
el grupo nuevo y los grupos efectivos conservados. Todas deben pertenecer al
footprint declarado, tener tickets reales y mantenerlos válidos tras activación,
attach y finalización. No se usan clones para acreditar la admisión de objetos
efectivos ni se añaden slots nuevos sin preparar. Se conserva la precedencia de
terreno sobre casters cuando es necesario crear el target de sombras.

Los grupos conservados no se mueven ni se modifican durante la preparación.
El nuevo registro referencia meshes nuevos y conservados en la misma transacción
que el terreno. Solo después de finalizar todos los participantes se retiran los
meshes sustituidos; los leases conservados no se vuelven a adquirir, confirmar
o liberar. Abortos y rollback descartan exclusivamente los meshes nuevos.
Los atributos de instancias y el inicio de fade de meshes conservados no se
reescriben. La selección sigue usando los objetos efectivos originales.

Un chunk puede quedar representado por varios grupos de lotes. La consulta far
certifica cada padre original y su residencia en esta escena; deja de ser válida
si alguno se mueve o pierde su raíz residente. Las notificaciones de árbol,
contactos, selección y cambio de fuente mantienen sus propietarios anteriores.
Los grupos candidatos vacíos de las revisiones conservadas se retiran; sus
grupos efectivos están limitados por los meshes actuales. La admisión inicial
de un chunk sin props conserva su marcador vacío anterior.

## Evidencia GPU

[Recibo](performance/native-biome-retention-20261113.json) y
[captura inspeccionada](performance/native-biome-retention-20261113.png).
Mismo harness WASM, propuesta/canal/coordinador de producto y draw Worker real,
NVIDIA Turing. Comparación con el recibo del incremento anterior:

| Paso | Preparación anterior | Preparación con retención |
| --- | ---: | ---: |
| Supresión de prop | 278,1 ms | 11,3 ms |
| Restauración de prop | 785,3 ms | 170,2 ms |

En esos pasos se conservan respectivamente **6 y 16 meshes** de slots intactos,
sus geometrías/materiales y los IDs GPU de sus atributos. Se comparan los IDs
anteriores/posteriores de cada lote; algunas referencias comparten un buffer
intercalado y no se cuentan como buffers únicos. El terreno revisado conserva
sus cuatro buffers y máscara, además del mismo dispositivo, renderer y personaje.

Las factories acumuladas creadas entre el comienzo y final de ambos cambios de
props pasan de 739 a 201 en estas dos ejecuciones. Incluyen recursos nuevos de
slots cambiados y actualizaciones ordinarias; no son memoria residente ni prueba
de mínima asignación global. No se confunden con reconstruir toda la escena.
No se crean nuevas texturas en esos dos pasos. Se mantienen cero errores GPU,
cero forks, el contador de recetas nativas sin incrementos en commit y el
cierre/drenaje comprobados antes de terminar Workers.

Son ejecuciones del mismo harness/hardware, no una distribución de latencias.
Sigue siendo un fixture a tiempo nativo 10 s con trabajador estacionario; los
props están fuera de cámara. La captura conserva suelo, personaje texturado y
sombra. No acredita locomoción GPU ni ausencia global de tirones. Reproducción:
`tools/experiments/audit_webgpu_temporal_ground.mjs`, `QA_NATIVE_DELTA=true`,
`QA_NATIVE_OBSOLETE=false`, `QA_BASE_URL` y `PLAYWRIGHT_MODULE` configurados, con
`.cache/tooling/node20.exe`.

## Validación de contratos

Los casos nuevos ejercitan los propietarios, el coordinador y los tickets reales
de admisión con compilador controlado, para ambos contratos de instancia:

- Identidad/versiones de atributos y selección por raycast después del cambio.
- Fallo tardío de finalización, aborto durante compilación y material cambiado.
- Payload canónico alterado después de preparar; época/fuente y LOD conservados.
- Época distinta y supresión visible distinta impiden conservar el slot anterior.
- Alternancia de slots, bosque acotado, queries far con varios padres y rechazo
  de fuentes que abandonan su escena.
- Cambios solo de terreno sin grupos vacíos ni retirada anticipada de leases;
  destrucción final única. Estanque con sólido y fluido conservados juntos.
- Rechazo de raíces de admisión ajenas al footprint de la transacción.

Selección final: **953 pruebas en 82 archivos**, concurrencia 2, sin fallos ni
skips: `.cache/native-biome-retention-selection.json` y
`.cache/native-biome-retention-regression.tap`. El archivo nuevo aporta 16 casos.
Los 122 casos dirigidos de ciclo de vida pasan en
`.cache/native-biome-retention-lifecycle.tap`.

La primera pasada amplia detectó que retirar cualquier grupo vacío alteraba
el marcador de la admisión inicial de un chunk sin props. Se limitó la limpieza
a los candidatos de revisiones conservadas; la prueba anterior pasa sin cambiar
su criterio. Se conserva `.cache/native-biome-retention-empty-marker-failure.tap`.
Build WebGPU/remote draw aprobado en 42,92 s, con las advertencias habituales de
tamaño de chunks: `.cache/native-biome-retention-build.log`. Sintaxis de los
módulos modificados y del harness comprobada.
La ejecución GPU final consta en `.cache/native-biome-retention-gpu-final.json`.
La regresión con los Workers reales de presentación/dibujo sigue regrabando dos
frames rechazados, con cero reemplazos de dispositivo, 93 buffers de vértices
compartidos por paso y cero errores GPU; cierre/drenaje verificados:
`.cache/native-biome-retention-frame-regression.json`.

## Siguientes dependencias

Continuar la preparación/instalación de terreno y las familias de f-R4 pendientes,
y la conservación de streams reutilizables dentro de slots modificados. La vía
de autoridad ordinaria y los personajes/intenciones todavía deben conectarse a
estos propietarios comunes. Se conservan las protecciones existentes hasta su
reemplazo y la aceptación A–F/C. No se cierra el objetivo ni se alteran recuentos.
