# Transporte de audio independiente del cargador GLB

AudioSystem solo necesita los transportes JSON y ArrayBuffer. Ahora los importa desde `asset-fetch.js`; `assets.js` conserva sus exportaciones públicas como reexports y utiliza exactamente las mismas funciones. Se preservan sustituciones MP3/Opus y GLB optimizado, rutas relativas, resolución recursiva de referencias JSON, parámetros fetch/AbortSignal y rechazo de respuestas no OK.

El grafo de fuentes estáticas accesible desde AudioSystem pasa de 74 a 43 módulos locales y de 579677 a 370334 bytes de fuentes. Deja de incorporar GLTFLoader, MeshoptDecoder y los shaders de edificios a través del transporte. Aún hay una dependencia de Three mediante locomoción/ripples; no se afirma que AudioSystem esté totalmente libre de Three. `graph.json` conserva ambos inventarios con hashes; `measure-source-graph.mjs` reproduce la comparación desde la raíz del repo cambiando únicamente la importación de transporte para reconstruir el grafo anterior.

Esto es una reducción del grafo ESM de fuentes, no una medición de descarga, tiempo de parseo, RAM, frametime ni ahorro del bundle de producción. El bundle del juego sigue necesitando los módulos de renderizado por otras rutas y su tamaño queda prácticamente igual.

- 49 tests dirigidos aprobados: rutas de los 126 SFX, ciclo de vida de assets/audio, fragmentos, transporte binario/JSON, aborto y errores.
- Build terminado correctamente con el aviso existente de chunk grande.
- Paquete: 641 archivos, 382701808 bytes, 859 enlaces relativos, 20 GLB de runtime, sin duplicados originales.
- Auditoría de asignaciones SFX vigente: 94/126 asignados.

Durante estas pruebas apareció una omisión del commit anterior: el test de rutas de las 126 entradas todavía clasificaba SFX 043/046 como reservados. Se añade su contrato exacto conectado, sin quitar ni relajar la revisión de las demás entradas.

La pestaña nativa de fragmentos 642 sigue en «Cargando módulos», incluso tras mostrar temporalmente el navegador y separar el transporte, sin informe terminal. No se atribuye el bloqueo a esta dependencia ni se acredita reproducción nativa. Se conserva la pestaña para continuar el diagnóstico; el navegador vuelve a su visibilidad previa.

El diagnóstico posterior encontró sintaxis inválida en el módulo inline de la fixture, devuelto por Vite como HTTP 500. Está corregida y cubierta por el nuevo gate de sintaxis (`../browser-script-syntax`). Esto explica la falta inicial de ejecución del handler; no acredita que se haya resuelto el acceso CDP ni la reproducción nativa pendiente.
