# Candidata de grupos de trabajadores: pendiente, fuera de producción

La candidata agrupa trabajadores elegibles por centro para reservas de64 o más tareas. Se conservan fuentes y scripts comprimidos; src/simulation/tasks.js no se modifica. Comparación sintética:500 estados completos y orden de consultas idénticos; mediana aislada0,7075→0,4336ms (480 muestras). No acredita FPS.

El ensayo integrado inicial de215 plantas vivas/18 trabajadores pagados conserva60 estados exactos, pero sus40 muestras tras calentamiento no ejercen la candidata: instrumentación aparte detecta una única entrada, en el frame0 (209 tareas). Por tanto5,7175→5,9294ms no evalúa su beneficio activo.

Ensayo corregido:24 pares de primeras asignaciones sobre el snapshot histórico con Navigation real,20 muestras después de cuatro calentamientos, todos los estados iguales. Medianas304,5374→296,5008ms, pero medias311,7101→314,3051ms y solo11/20 pares más rápidos: no demuestra ganancia consistente. Fuentes compartidas salvo tasks de candidata; hay campañas y suite del subagente en segundo plano, sin GPU propio. No se incorpora la candidata ni se certifica balance actual100 noches por usar este snapshot histórico.

Perfil V8 del código actual, dentro de tickScoped durante la primera asignación y59 intervalos posteriores:992 muestras/1.160.515us muestreados. Rutas/A* y workerEntityLookup concentran trabajo; los totales inclusivos se solapan (los grupos de funciones anónimas pueden superar100%). No son timings aislados ni GPU. Próxima investigación: comprobar el coste de reconstruir índices de entidades históricas y la posibilidad de reutilizarlos con invalidación correcta. Ese cambio aún no existe ni está aceptado.
