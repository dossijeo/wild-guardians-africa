# f-R4: proyección canónica de recursos del commit nativo

Continuación de `749a71b52`. **f-R4 sigue parcial** y los once puntos principales
de A6 siguen abiertos. Se conserva el orden A → B → C → D del plan integrado.
Este incremento conecta la fuente de datos a los propietarios existentes; la
admisión gráfica completa y la aceptación con personajes siguen pendientes.

## Implementación

Wild Engine registra los chunks realmente publicados durante el commit de una
propuesta física, usando el mismo punto de publicación de los recursos nativos.
El journal versionado contiene upserts y retiradas deduplicadas, sesión, ticket,
tiempo efectivo, familia y revisiones del mundo. El staging no lo publica. Si el
mundo cambia después, no puede leerse como una proyección vigente del ticket.
Incluye adición/publicación pthread, retirada, props y terreno protegido; recoge
los halos publicados sin convertir chunks auxiliares de navegación en visibles.

El adaptador copia el journal antes de seleccionar chunks, porque WASM puede
crecer, y obtiene sus buffers mediante el exportador canónico existente. No
regenera terreno en JS ni vuelve a efectuar la mutación. Las retiradas exigen
que el chunk ya no resida en el motor. Se restaura la selección anterior.

La sesión reutiliza `stream.onData` para actualizar la vista de lectura de props
y entregar los payloads al canal de terreno existente. Las retiradas invalidan
sus caches y notifican `onRelease`. Cada publicación tiene revisión por chunk;
un ticket repetido se rechaza. Un fallo de conversión, staging u observador
posterior al commit conserva la condición de commit efectivo y cierra el control;
no libera al dibujante como si la mutación hubiera sido abortada.

El planner de la autoridad recibe esa publicación y acumula en la siguiente
publicación confirmada `nativeWorldResources`: identidad del mundo, familia,
coordenadas modificadas y retiradas. Los buffers siguen por el canal de terreno;
el puerto de control crítico no los transporta. Las respuestas compactas no
pueden ocultar esa frontera y la cola del host la conserva como barrera.

No se activan nuevos comandos nativos de producto. El journal de chunks tampoco
implementa la representación visual de polígonos/barreras ni de puertas móviles.
Los ACK del transporte siguen sin significar disponibilidad GPU. El surface aún
debe coordinar payload, retirada, preparación y admisión antes de etiquetar un
frame con la identidad nueva; consultar el ticket actual no basta.

## Validación ejecutada

- Nueve pruebas nuevas con WASM real: recibo antes de publicar, propiedad de
  buffers, retirada exacta, canal de terreno con confirmación de secuencia,
  supresión/restauración de props, terreno protegido, tickets inválidos/obsoletos,
  fallos posteriores al commit y publicación pthread real.
- Selección de 38 archivos: 493 pruebas, 489 aprobadas y 4 omitidas por el opt-in
  del prototipo. Se vuelve a ejecutar ese archivo con
  `WILD_ENGINE_NATIVE_ROUTE_WASM=src/world/wild-engine/spatial-savanna.wasm`:
  sus 5 pruebas pasan sin omisiones. No se suman como pruebas únicas.
- Otras 80 pruebas de consulta de props, settlements, prototipo y transiciones
  pasan sin fallos ni omisiones. Build WebGPU de producción aprobado en 1m 6s;
  conserva los avisos existentes de imports mixtos y tamaño de chunks.
- Ambos binarios se reconstruyen con el SDK Emscripten local y los flags del
  script oficial (standalone y pthread, sin perfilado experimental). El comando
  usa un response file para superar el límite de longitud de CMD en Windows.
- Los seis casos reales WASM/WebGPU de f-R2 vuelven a confirmar sin dibujar el
  paquete antiguo tras el commit. También pasan identidad/sustitución de f-R4 y
  relevo, pérdida real de dispositivo y silencio de f-R3, con preparación
  bloqueada 500 ms. Cero errores GPU/página; persiste el 404 de consola sin URL
  atribuida del harness. Son triángulos y cambios fuera de vista, no aceptación
  de recursos visibles, personajes ni rendimiento integrado.

Recibos locales reproducibles: `.cache/native-resource-projection-regression.tap`,
`.cache/native-resource-projection-prototype.tap`,
`.cache/native-resource-projection-legacy.tap`,
`.cache/native-resource-projection-build.log`,
`.cache/native-canonical-resource-boundary.json`,
`.cache/native-world-mutations-regression.json` y
`.cache/native-canonical-control-lifecycle.json`.

## Siguiente punto pendiente

Aplicar esta frontera en el preparador gráfico existente, incluyendo retiradas,
cancelación y recuperación de recursos rechazados. Admitir todos los recursos
afectados antes de abrir el frame nuevo y conservar congelada la generación
anterior mientras tanto. Después acreditar el mismo cambio físico y visible con
personajes reales consumiendo planes nativos completos, bloqueo del preparador,
pausa/velocidad y revocación, sin posiciones JS periódicas. No se reduce f-R4 a
estos contratos de datos ni se cierran e/f por sus incrementos internos.
