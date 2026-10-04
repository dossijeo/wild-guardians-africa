# Historial de eventos y coste CPU del audio

Comparación contra `4eb8420eefa317fa635c963b89512eef7cc93b94`.

`Game.emit` conserva como máximo **200 eventos** mediante `push` y `shift`;
no había un historial de campaña ilimitado. Sin embargo, `AudioSystem.process`
recorría ese historial en todos los fotogramas, aunque no hubiera novedades.

La ruta actual conserva la referencia y el último evento observado. Cuando
el historial permanece estable o recibe nuevos eventos al final, procesa
únicamente la parte nueva. Cuando `Game.emit` desplaza la ventana, busca el
último evento observado y continúa desde ahí. Si ese evento desaparece, o se
sustituye el array, recorre los eventos disponibles con la deduplicación
existente por ID. `remember` inicializa también el cursor al cargar una partida.

El contrato de la ventana residente es el de `Game.emit`: registros inmutables,
añadidos al final y retirados del principio. Una importación o edición arbitraria
del historial debe sustituir el array o usar `remember`; el cursor no detecta
ediciones de registros antiguos dentro del mismo array. No cambia la selección
de sonidos, sus buses, prioridades, límites, velocidad ni la simulación.

## Evidencia

Las **203 pruebas dirigidas de audio, SFX y música** pasan sin fallos ni
omisiones (2.545,80 ms). Incluyen nueve pruebas nuevas: mil fotogramas estables
sin leer nuevamente los IDs, 2.400 eventos reales de `Game.emit` atravesando
el límite de deduplicación, pérdida del ancla, sustitución/truncamiento de la
ventana, carga silenciosa, salida del audio, resultados de campaña, fallos
asíncronos y conservación de todas las rutas lógicas.

La compilación Vite pasa en 5,96 s. El paquete web pasa con 578 archivos,
406.693.187 bytes, 816 enlaces relativos y 20 GLB de ejecución.
La suite completa de 1.374 pruebas correspondía al commit anterior; no se
atribuye esa ejecución a esta modificación. GitHub ejecutará la suite completa
del nuevo commit al publicarlo.

[`history-benchmark.json`](history-benchmark.json) contiene las siete muestras,
los hashes de las fuentes, el entorno y el alcance de la medición. Se reproduce
con `node tools/benchmark_audio_history.mjs` desde el repositorio.

| 100.000 llamadas, mediana de siete muestras | Antes | Después |
| --- | ---: | ---: |
| Ventana quieta de 200 eventos | 268,74 ms | 3,39 ms |
| Un evento nuevo cada 40 llamadas, ventana de 200 | 258,01 ms | 4,80 ms |

Es un diagnóstico aislado en Node con hechos sin ruta de sonido, sin
decodificación, navegador, mundo 3D ni GPU. El ahorro quieto es aproximadamente
**0,00265 ms por llamada**, pequeño frente al coste total de un fotograma.
No prueba una mejora de FPS, de frametime del juego ni de rendimiento móvil;
las pruebas de rutas con sonidos reales son independientes de este diagnóstico.
