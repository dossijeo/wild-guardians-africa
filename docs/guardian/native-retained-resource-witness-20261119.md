# Recursos durante la recuperación nativa: testigo GPU — 2026-11-19

Continuación A4/e-R3/f-R4 del [plan integrado](integrated-gpu-migration-plan-20261104.md), después de [serializar la preparación de materiales](native-finite-material-ownership-20261119.md). Cambian únicamente dos herramientas de validación. La implementación de producto conserva los 619 inputs anteriores, los 64 artefactos nativos y los 16 archivos ajenos. No se cierra A6/A/B/C ni se inicia D; f-R3 conserva su cierre de seguridad.

## Qué queda comprobado

Dos ensayos finales reales NVIDIA/Turing, con el mismo código congelado, completan adquisición nativa WALK, suspensión/checkpoint/ACK, reconexión retenida, activación y frame de nueva generación. Mantienen una autoridad, un snapshot inicial, los propietarios Surface/renderer/escena/terreno/roster y el inventario de actores. La selección identifica worker-900011 sobre su geometría deformada. La captura muestra terreno y trabajador; las imágenes se inspeccionaron. El drenaje gráfico real devuelve disposed mientras la autoridad sigue activa.

| Control | Pausado | En movimiento |
| --- | --- | --- |
| Recuperación funcional, selección, imagen y drenaje | pasan | pasan |
| Recursos de datos del fotograma retenidos | 1355 | 1355 |
| Bindings del fotograma retenidos | 259 | 259 |
| Versiones físicas uniformes | 8 | 8 |
| Bytes nativos cambiados por versión | 0 | 4 |
| Aceptación estricta de recursos | rechazada | pendiente de atribución |

La instrumentación delega cada writeBuffer original con sus argumentos exactos y registra solo buffers uniformes pequeños. No lee GPU, modifica valores, sustituye ACK/autoridad ni introduce reloj, permiso o propietario en el producto. Exige cobertura completa de bytes; invalida el testigo si no conoce los argumentos o hay escrituras GPU que no observa. El shadow del productor excluye los parches del consumidor y no bastaba para decidir si una escritura era idéntica. El testigo demuestra ahora que las ocho copias pausadas también recibían bytes GPU idénticos. Se conserva el criterio estricto rechazado; no se elimina el aislamiento entre el reloj del fotograma publicado y la preparación siguiente sin demostrar seguridad.

El inventario compara recursos realmente vinculados al fotograma. Los temporales sin referencias se informan aparte: su recogida ordinaria no prueba que se haya reconstruido una escena. Los guardas siguen rechazando pérdida o sustitución de datos residentes y versiones sin explicación. Se comprueba además que actores, geometrías y materiales del roster permanecen idénticos.

## Asignaciones y límites

En pausa, las fábricas del productor registran cero buffers, texturas, samplers, shaders y pipelines; aparece un bind group. Las ocho copias físicas y sus ocho bindings se contabilizan aparte, no se ocultan dentro de esos ceros. En movimiento, las ocho versiones tienen cuatro bytes nativos distintos cada una. Se observan además 42 buffers, 3 texturas, 3 samplers y 5 pipelines nuevos del productor, junto con layouts y bindings. La primera huella pasa de gpu 0 a gpu 1 y aparece un efecto footstep. El atlas 4096×2048 y los datos 44×97 coinciden con los constructores VFX existentes; falta atribuir cada fábrica a su propietario de admisión. El ensayo también queda rechazado por esa atribución pendiente. No se afirma que sean una reconstrucción de recursos existentes ni que se hayan aceptado todas las asignaciones nuevas. El bloqueo cpu-vfx observado sigue fuera de la aceptación de autonomía completa.

El campo functionalOk describe únicamente los controles funcionales. El resultado ok exige además resourceBudget.accepted: ambos ensayos finales terminan con exit 1 y presupuesto sin aceptar. Los ensayos intermedios conservan sus raws: pilot 2 usó por error el antiguo gate del ejecutor, y el primer final-moving solo controlaba versiones uniformes; sus flags verdes no acreditan aceptación completa. El ejecutor final comprueba también las fábricas nuevas todavía sin atribuir.

## Referencias y validación

Se inspeccionaron [Babylon WebGPUCacheBindGroups](https://github.com/BabylonJS/Babylon.js/blob/048566f71dfce0f62d993fd3a7bcadc844407315/packages/dev/core/src/Engines/WebGPU/webgpuCacheBindGroups.ts) y [UniformBuffer](https://github.com/BabylonJS/Babylon.js/blob/048566f71dfce0f62d993fd3a7bcadc844407315/packages/dev/core/src/Materials/uniformBuffer.ts): claves por identidad real de dependencias, comparación de contenido y versiones por fotograma son decisiones distintas. Se utiliza ese patrón para clasificar la evidencia, sin añadir una caché, pool, dependencia ni mecanismo experimental al producto.

Dos comprobaciones de sintaxis nuevas; 621 inputs congelados, 64 nativos y 16 ajenos exactos. Los 938 casos dirigidos, 4441 de 4442 seleccionados (una omisión) y build de 57.081 s son HEREDADOS de 29bb3950a, no se han repetido ni se presentan como validación nueva. Solo cambian los dos archivos QA. Se mantienen las tres exclusiones anteriores de host/timeline.

[Recibo, hashes y archivos completos](performance/native-retained-resource-witness-validation-20261119.json). [Imagen pausada](performance/native-retained-resource-witness-20261119/native-retained-resource-witness-paused.png) y [en movimiento](performance/native-retained-resource-witness-20261119/native-retained-resource-witness-moving.png).

Siguiente: cerrar el criterio de recursos pausados y atribuir las asignaciones de la huella mediante los dueños/admisión existentes. La recuperación funcional de esta cohorte y sus controles de selección/imagen/drain ya están comprobados; no repetirlos como trabajo pendiente. Recursos ordinarios en main, cohortes y consumidores fallidos, pérdida de dispositivo, coste de pausa, cadencia y plataformas siguen abiertos.
