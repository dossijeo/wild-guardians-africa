# Huida y marcha de ataque simultáneas en Sabana

La partida de semilla 712 conserva la contratación y los cultivos pagados. Game ejecuta el primer día y su noche. Al alba del día 2 quedan `plant-5` y `plant-7` y el trabajador 21 se incorpora mediante una segunda contratación. El arnés adelanta la incursión diurna al segundo 4 del turno. El perfil de desarrollo requiere `qualifyFarmFlee` y `qualifyAnimalCrop`. [Controles de autoridad y WASM](sabana-flee-crop-handoff.md).

## Preparación de Farm y Stop24

En Sabana, Farm23 emplea el barrido continuo de trabajador para comprobar el corredor y el tramo final hacia el centro. La revalidación conserva la clase de barrido del ticket. Detour emplea su filtro de tránsito en cada cruce de polígonos de la consulta de segmento. Aquí se aplica la misma clase de prueba del motor nativo a ambos tramos. [DetourNavMeshQuery::raycast](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/Detour/Source/DetourNavMeshQuery.cpp#L2396-L2460).

La primera captura alcanzó la solicitud de Farm23. El preparador esperó 6,60 s a la publicación inicial y la autoridad agotó su plazo de 10 s antes de READY. Para aislar el recorrido funcional, el arnés posterior mantuvo el reloj suspendido hasta que NVIDIA dibujó la publicación 3 con los 25 chunks. Luego abrió el puerto de recursos con el mismo plazo. La preparación de esa segunda captura duró 3,08 s, incluidos 1,85 s de roster, 1,05 s de admisión y 0,18 s de captura.

El arranque WebGPU remoto de producto ahora usa la primera publicación real
de la autoridad. Conserva suspendido el reloj y espera un dibujo de esa
secuencia o posterior, con cámara y tamaño vigentes, antes de abrir el puerto
de preparación. Después mantiene el mismo ACK y el mismo plazo por petición.
Godot ejecuta sus callbacks al terminar el dibujo requerido. Aquí se reutiliza
el recibo de dibujo que ya usa el cliente WebGPU.
[Godot, pasos posteriores al dibujo](https://github.com/godotengine/godot/blob/4.4-stable/servers/rendering/rendering_server_default.cpp#L169-L184).

El arranque de una partida nueva desde el menú dibujó la secuencia 1 con 25
regiones a los 12,113 s y solo después conectó el puerto. En el guardado pagado
de Sabana, la primera publicación tardó 6,044 s tras arrancar la autoridad.
La solicitud Farm23 llegó 15,3 ms después de dibujar esa publicación. READY
tardó 3,327 s desde la recepción de la solicitud. NVIDIA dibujó el ticket 2
sobre el cuerpo 1 del trabajador 21 y el consumidor drenó sin errores.
Pasaron 128 pruebas de arranque, timeline y cliente, y el build WebGPU remoto.
La prueba de timeline volvió a publicar al completar su estado simulado con
el campo `suppressed` exigido por el receptor.
La captura de arranque pagado tuvo un máximo de 60,2 ms a 30 Hz. El dibujo
previo ocupó 59,9 ms en tiempo de pared y la captura carece de traza para
atribuirlo. C4 sigue abierto.
[Recibos de arranque](performance/native-sabana-flee-crop-physical-20261125.json).

La segunda captura avanzó desde `RaidSpawned` a los 604,00 s hasta los 604,20 s mientras Stop24 se preparaba. El roster rechazó la pose en movimiento porque la comparaba con la fila del ticket provisional. Game publica ahora la muestra del ejecutor Farm23 con el cuerpo, la asignación, el handle, el evento y el instante exactos. El roster usa esa muestra para la publicación posterior y conserva la comparación con la fila en el instante original. Al adquirir Stop24 se exige la pose final y se retira la muestra. El guardado público queda cerrado durante ese estado.

## Dos rutas adquiridas en NVIDIA

En la captura final sobre NVIDIA Turing, Stop24 se adquirió a los 606,75 s desde la pose (66 m, 1,29 m) del cuerpo 1. El facóquero 22 conservó su propio cuerpo 2 y Game seleccionó `plant-5`. El primer dibujo de su ruta adquirida empezó a edad cero. Luego hubo 15 testigos de envíos con los relojes de ambos actores, incluidos dos envíos en que las edades pasaron de 0,10 a 0,30 s en Home y de 2,60 a 2,80 s en AttackCrops. El trabajador llegó a (60 m, 0 m) sin impactos. Home19 retiró su presencia del dibujo y el facóquero siguió en marcha. El Draw Worker confirmó el drenaje sin errores.

El trabajador conservó la raíz y todas las identidades de malla y geometría comprobadas. Se conservaron las referencias de los **2.974 buffers comparables** y las versiones de 2.973. La actualización restante fue `iGrowth`, el atributo instanciado que el roster de cultivos actualiza sobre su buffer existente. [Recibo, trazas y comprobaciones](performance/native-sabana-flee-crop-physical-20261125.json).

La secuencia final adquirida fue Farm23 → Stop24 → AttackCrops26 → Home18 → Home19. El perfil cubre dos cuerpos con corredores cuya separación conservadora evita el contacto incluso al variar sus tiempos de salida o detenerse. El encuentro físico, el retorno al trabajo tras la incursión, AttackCenter, Recovery y la activación ordinaria siguen pendientes.

Pasaron las 111 pruebas de la selección final y el build de producto. Los binarios standalone y pthread conservan las firmas anteriores. El control pthread invocó los cuatro puntos de entrada nuevos y publicó un chunk en memoria compartida.

## Cadencia

En las 739 muestras de intervalo de la captura final a 30 Hz, el máximo fue de 45,40 ms. El Draw Worker estaba deserializando un mensaje durante 12,73 ms cuando Viz entregó el siguiente BeginFrame. El mismo hilo recibió el BeginFrame a los 45,17 ms desde el dibujo previo. Los intervalos de 44,10 y 41,80 ms incluyeron una oportunidad vetada por la mutación nativa antes de liberar el dibujo. El objetivo C4 continúa en 16,67 ms. [Trazas y cortes](performance/native-sabana-flee-crop-physical-20261125.json).
