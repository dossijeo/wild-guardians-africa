# Terreno, tabla GPU, reloj y picking de Farm23

Continúa el [contrato de puertos y publicación](e-r3-native-farm-arrival-route-ports-20261117.md) del [plan principal](integrated-gpu-migration-plan-20261104.md). Farm23 reutiliza el soporte geométrico, tabla de movimiento y metadatos de reloj existentes. El picking puede leer su edad relativa y origen de ejecución de un testigo de imagen. La capacidad y preparación del consumidor remoto/Host/roster/Surface aún están pendientes; Game/productor ordinarios siguen cerrados. A6/A/B/C permanecen abiertos; D no se inicia.

## Código de referencia y decisión

Antes de implementar se consulta de nuevo [`Graphics.updatePositions`, Rapier.js, commit fac979eec2a0cd83878e29ca3cb8a5a1fb35fedc](https://github.com/dimforge/rapier.js/blob/fac979eec2a0cd83878e29ca3cb8a5a1fb35fedc/testbed3d/src/Graphics.ts#L328): la transformación del propietario físico se copia a la instancia existente. Se mantiene esa dirección de propiedad, sin otro integrador ni barrido global de actores. El adaptador usa muestras nativas y triángulos residentes reales.

Se inspeccionan además las implementaciones instaladas de Three.js 0.180.0, `Node.getCacheKey` y [`NodeUtils.getCacheKey/getNodeChildren`, r180](https://github.com/mrdoob/three.js/blob/r180/src/nodes/core/NodeUtils.js#L84). La clave recorre los hijos obtenidos por nombres de propiedades; un `Symbol` queda fuera de ese recorrido. La copia oficial de `NodeUtils.js` coincide byte por byte con la instalada. Se amplían los metadatos simbólicos existentes y el retag del mismo uniforme, conservando el grafo. No se añade otra caché de programas, dependencia o reloj. La investigación queda registrada con hashes; no se sustituye el algoritmo de movimiento.

## Implementación

`prepareNativeFarmArrivalProposal` valida el codec23 y utiliza el mismo kernel de soporte sobre triángulos visibles. `prepareNativeFarmArrivalGpuTable` empaqueta sus muestras con el formato existente de cinco texels RGBA por knot. Se conservan altura, posición, orientación, fases, presupuesto y selección Run/Walk. La llegada cero admite cero segmentos y un knot, sin fabricar una distancia pequeña.

`createNativeFarmArrivalGpuMotion` reutiliza el decodificador y grafo TSL comunes. Las referencias23 identifican el reloj relativo y el origen modular de Idle; no se presentan como Home, Task o una asignación genérica. El retarget exclusivo de una propuesta no publicada conserva textura, uniforme, buffer y entrada del registro. Si los datos relativos son idénticos, no cambia `texture.version` ni se marca una nueva subida. Un recurso compartido o publicado no se puede retargetar. La suspensión/parada de Farm se rechaza explícitamente hasta implementar su relevo preparado.

El reloj valida fuente, época, semántica y exclusión de otros propietarios. Su retag exige el sucesor nativo y conserva el horizonte del recurso. El picking exige una edad Float32 y origen de ejecución coherentes con la frontera y reloj del testigo de imagen; distingue tiempo del programa preparado de tiempo de ejecución real. Un marcador pendiente o una referencia preparada sin binding en el testigo no conceden picking. No consulta el reloj global para fabricar esa edad.

El cliente remoto rechaza explícitamente relojes y frames23 mientras falta su consumidor. No se anuncia una capacidad prematura del draw Worker. Estos adaptadores de datos/grafo no autorizan la adquisición gráfica del Host ni el avance ordinario de Game.

## Validación y continuación

La [evidencia](performance/native-farm-arrival-route-clock-validation-20261117.json) recoge los resultados finales y hashes. Las 19 pruebas nuevas cubren cuatro perfiles caminando/corriendo contra cuerpo y acumuladores nativos reales, alturas residentes, transición Run → Walk al agotar presupuesto, pthread, llegada cero, fuentes/terreno ajenos, invalidación de residencia y cierre de los relevos aún no soportados. Las pruebas de picking construyen testigos de formato explícitos; no son imágenes GPU certificadas.

El compilador TSL real de Three genera exactamente el mismo **WGSL de vértices** para Farm y Home en el caso contrastado. Al revalidar se fuerza el recálculo de `getCacheKey(true)`: la clave y las propiedades del nodo permanecen iguales. También se conservan textura, buffer, uniforme y registro, con datos relativos idénticos y versión de textura estable. Son pruebas estructurales/de componentes, no una medición de continuidad de hardware.

Un loader ESM de sólo lectura fuerza `texture.needsUpdate` aunque los datos sean idénticos. La prueba detecta versión **2 en vez de 1**, sin modificar el árbol ni los WASM. Acredita que este componente detecta solicitudes redundantes de subida; no prueba todavía la recuperación incremental del conjunto de 3.123 recursos.

Los 64 inputs/artefactos nativos permanecen exactos. Se validan regresión y build sin recompilar C++ ni repetir hardware. Los resultados históricos de la vertical previa —569 IDs conservados, 30 recursos tardíos y máximo global de 66,72 ms— mantienen sus límites; Farm23 no tiene aún aceptación de hardware.

El siguiente punto es integrar estas referencias en bindings, reloj/picking, retención y recibo del cliente/Host originales y después roster/Surface, anunciando la capacidad sólo con evidencia del recorrido completo. Continúan pendientes los relevos durante movimiento y finales Idle/Task/Home, cohort/entradas alternativas, contratos/puertas/raid, productor integral, guardado UI y aceptación integrada A/A6/B/C.
