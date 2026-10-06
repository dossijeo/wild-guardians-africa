# Primera activación de VFX: llamadas GL y materiales

Diagnóstico nativo en Gran Cañón / Mapungubwe, seed 712, calidad media, facóquero individual. Centro y mijo pagados; contratación inicial legal sin trabajadores para aislar el animal. Pasos simulados de 50 ms hasta el primer AnimalLogicalHit real, sin modificar navegación, daño o eventos. No es una campaña nocturna natural ni QA-155 completo.

Reproducir: `tests/browser/animal-preload.html?biome=gran-canon&motion=1&attack-species=warthog&frame-profile=1`.

## Antes de preparar profundidad durante la carga

Cuatro ejecuciones completas: `warthog`, `owners`, `draws`, `roles`. Todas terminan correctamente a 19,95 s simulados (399 pasos), sin errores. Las fuentes de las variantes draws/roles se conservan literalmente como TXT. owners-fixture.txt es una copia retrospectiva con el texto de carga recodificado; no acredita identidad byte a byte del HTML ejecutado. La primera variante no dispone de copia contemporánea de la fuente. Los informes gzip conservan todas las filas.

| Paso / tiempo | Programas nuevos | Atribución de la cuarta ejecución | CPU world.render, cuarta ejecución |
| --- | ---: | --- | ---: |
| 1 / 0,10 s | 1 | Ondas de pasos en el río | 20,90 ms |
| 48 / 2,45 s | 9 | Dos Standard sin color, cuatro MeshDepth, polvo rígido sin color, polvo rígido y sprites de polvo con color | 339,10 ms |
| 367 / 18,40 s | 1 | Ribbons del ataque del facóquero | 124,80 ms |
| 398 / 19,95 s | 1 | Sprites del impacto del facóquero | 92,50 ms |

La atribución por escena después del render no encuentra los materiales de profundidad temporales, porque ya se han restaurado. La tercera y cuarta variantes observan renderBufferDirect y relacionan los enlaces ocurridos durante cada llamada con su material real, incluyendo colorWrite=false y efecto/rol. Ninguna fila con compilación registra luces puntuales visibles en la escena.

El paso 48 ocurre al empezar el polvo de pasos fuera del río, antes del ataque. El río crea una onda en el paso 1, sin captura de profundidad. No atribuir el pico del paso 48 a las ondas acuáticas ni a luces puntuales. La primera captura de profundidad necesaria para los sprites coincide con seis variantes de materiales del mundo todavía sin preparar.

## Alcance y límites

RenderGlCalls conserva receptor, argumentos, resultado y errores de los métodos observados; limita contadores al tramo begin/end y restaura hooks al salir, conservando hooks posteriores. Cuatro pruebas dirigidas verifican el contrato, incluida atribución de materiales temporales. Es código QA, no instrumentación de gameplay.

Los contadores miden llamadas API (compileShader/linkProgram/uploads), no duración GPU, instrucciones compiladas, bytes transferidos ni RAM. CPU world.render incluye toda esa llamada y el observador; la atribución y recorridos adicionales alteran el diagnóstico. No tratar estos valores como FPS normales, coste exclusivo de compilación o comparación de rendimiento controlada. Las campañas congeladas independientes seguían vivas durante las medidas.

La precarga de modelos sí evitó nuevas descargas GLB al aparecer el animal; eso no evita la compilación de shaders VFX/profundidad posterior. El diagnóstico no acredita ausencia de tirón, audio ni móvil físico.

## Cambio dirigido

Preparar la captura nativa de profundidad durante warmAnimalGpu, con los cinco modelos ya en staging, antes de declarar listo el mundo. Reutiliza las recetas/cachés existentes y su ciclo de disposición; no añade una receta de profundidad ni activa los candidatos alpha/empty. La pasada restaura materiales, target y estado de sombras mediante los finally existentes. No adelanta el reloj de simulación ni activa efectos en gameplay.

## Resultado con profundidad preparada

warm-depth.json.gz: carga y 399 pasos completados, sin errores. Primer contacto a 19,95 s, eventos, posiciones/estado del actor, HP del centro, sprites y esperas exactamente iguales al caso roles (proof.json). En el paso 48 aparecen cinco programas frente a nueve: desaparecen las cuatro compilaciones MeshDepthMaterial. Permanecen dos Standard sin color y tres recetas del polvo. CPU instrumentada: 329,20 ms; el pico persiste, no se acredita mejora de frametime con una pareja de trazas. Ribbons, sprites del ataque y ondas aún compilan al usarse.

32 pruebas dirigidas correctas y build de 204 módulos completado en 11,02 s (aviso habitual de bundle >500 kB). Regresión del modo original: 364 pasos / 18,20 s, StructureHit real, centro 600→580 y cero errores/esperas; no demuestra cinco ataques en un grupo.

Pendientes: preparar VFX/ondas, atribuir las dos variantes Standard restantes, medir carga/memoria y repetir biomas/culturas/calidades/móvil. Mejora parcial, sin acreditar eliminación del tirón.

Fuentes ejecutadas archivadas literalmente. El texto de carga del fixture y un mensaje de diagnóstico de scene.js se han restaurado después a su UTF-8 original; no cambia la ejecución de estas pasadas.

Regresión del modo original de grupo: `warm-original-group.json.gz`, 364 pasos / 18,20 s simulados, StructureHit real y centro 600→580, cero errores/esperas. No demuestra que las cinco especies ataquen en ese grupo.
