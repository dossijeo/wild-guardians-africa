# Microeventos en el perfil WebGPU Worker

El controlador `src/microevents/controller.js` todavía no funciona con el
mundo del Worker gráfico. El guard de `installMicroevents()` es necesario:
`MicroeventBillboards` crea un `ShaderMaterial` GLSL y lo incorpora a
`world.scene`; `MicroeventSpace` consulta `world.objects` y
`world.terrainMeshes`, mientras que el mundo Worker no posee esas geometrías
en el hilo principal. Sin ellas, `occluded()` rechaza de forma conservadora el
objetivo. No basta con suministrar geometría incompleta: un adaptador que asuma
ausencia de obstáculos permitiría interacciones ocultas.

La reserva, la liquidación y el calendario ya tienen comandos serializados
en la autoridad (`src/microevents/worker-economy.js`). La presentación no debe
aplicar economía ni fabricar resultados. En una restauración hay que cancelar
el ticket huérfano con `microSettle`, como hace ese adaptador, pero preservar
`pendingLosses`: son consecuencias autoritativas que ya se confirmaron.

## Contrato mínimo pendiente

1. El presentador solicitará los candidatos de cultivos y madera visibles al
   propietario de la escena gráfica. La respuesta deberá identificar la sesión,
   la secuencia confirmada, la cámara y las generaciones de terreno y objetos;
   se descartan candidatos si el estado o la escena necesarios ya no coinciden.
   La altura solo se obtiene del terreno confirmado y visible.
2. Tras reservar el ticket en la autoridad, el evento visual se identifica por
   `ticket.id`, `type`, `targetId` y una generación propia de presentación.
   La publicación o la cancelación de una generación anterior no podrá crear,
   ocultar ni resolver la siguiente. El evento solo se hace interactivo cuando
   su atlas y pipeline estén admitidos y se haya presentado un fotograma válido.
3. La selección de una partícula requiere un resultado del Worker gráfico con
   el mismo ticket y generación, cámara y versión de escena que el fotograma
   pertinente. El cálculo debe comprobar la oclusión frente al terreno y los
   objetos realmente visibles, y rechazar las respuestas obsoletas o incompletas;
   no basta con asumir visibilidad si faltan geometrías. La captura del puntero
   debe reservarse sin bloquear la cámara esperando esa respuesta.
4. La presentación recibe únicamente los datos necesarios para dibujar las
   partículas y mantiene una cola acotada de actualizaciones sustituibles;
   inicio, finalización y cancelación no pueden perderse ni reordenarse con los
   cuadros. El Worker gráfico libera sus recursos cuando la generación se retira
   y no entrega recompensas. El estado interactivo conserva una sola autoridad.
5. El controlador solo solicita `completed`, `ignored` o `cancelled` mediante
   `createWorkerMicroeventEconomy`; espera la respuesta antes de guardar. Al
   fallar el canal gráfico, perder la escena o cerrar la partida debe cancelar
   la reserva y evitar una liquidación exitosa tardía.

El cliente ya mantiene un token de fotograma con `sequence`,
`terrainGeneration`, `selectableGeneration` y `cameraVersion`, y el selector
de objetos verifica respuestas obsoletas. Es el punto de partida para el
contrato anterior, no una garantía de que los microeventos estén implementados:
faltan la consulta específica de partículas y oclusión, el dibujo TSL con su
atlas, la integración del ciclo de vida y las pruebas funcionales completas.
Las pruebas deberán cubrir cambios de cámara, terreno, objetos y ticket entre
solicitud y respuesta; cancelación durante la preparación; recarga con ticket;
y liquidaciones ordenadas. La paridad visual se comprobará en la fase acordada.
