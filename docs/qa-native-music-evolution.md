# Evolución de capas y arreglos de resultado

Implementación `8798a1b`. Continúa QA-156; el caso permanece parcial.

## Política importada

Se leen las funciones evolve, triggerEvent, schedule y buildTransition de los
dos HTML originales, líneas 468–555. Sus hashes y procedencia se conservan en
music-policy.js y en el informe de mezclas nativas. Los archivos originales y
los MP3 no se modifican.

La evolución usa los valores seleccionados de fábrica: 16 compases, densidad 3,
fade 2 s y rejilla propia de cada composición. Solo cambia una capa elegible;
descarta nearSilent, la última capa modificada y bases de volumen ≤0,14.
Conserva los apoyos s2/s4 al retirar capas. La reducción a 48 %, reposición y
retirada siguen las alternativas y umbrales originales. La elección aleatoria
usa Math.random para presentación, sin consumir el RNG del dominio.

La evolución se detiene mientras haya transición pendiente, arreglo temporal,
salto cercano o protección posterior al salto. Su reloj es WebAudio, no el reloj
simulado: ×5 no acelera el tono ni el compás. La suspensión del contexto la congela.

El lab empieza con evolución automática desactivada y ofrece un botón para
activarla. MusicMixer conserva ese valor por defecto para uso independiente;
la integración de partida la activa explícitamente. Esa activación es una decisión
de integración, no un valor predeterminado atribuido al lab.

Éxito y fracaso conservan sus overrides distintos por pack, fade de 2,4 s y ocho
compases de duración. Se guarda la mezcla lógica previa, incluida su evolución.
Eventos superpuestos conservan el primer snapshot; al terminar vuelven
progresivamente a él. Elegir otra escena cancela el arreglo anterior, como en
chooseScene del original. Los decks que se solapan reciben las mismas curvas.

CampaignWon y GameOver activan respectivamente éxito y fracaso una sola vez.
Se aplican después de actualizar la escena del mismo frame, para que el cambio
de ataque a noche no elimine el arreglo de derrota. Los eventos históricos
recordados al cargar no lo activan. Parar limpia la orden pendiente.

## Pruebas y alcance

[47 pruebas dirigidas](qa/music-evolution/directed.txt), cero fallos/omisiones,
4.435,7982 ms: evolución de ambos packs, rejillas, una capa, apoyos, exclusión de
pistas casi silenciosas, cortes protegidos, snapshots, arreglos superpuestos,
retorno, ganancias de dos decks y entrada durante un fade, suspensión,
deduplicación, escena de resultado y ausencia de cambios en el estado del juego.
Incluye las regresiones anteriores de carga, voces, mezclas y transporte.

La fixture de navegador usa AudioSystem y los MP3 originales, con salida
silenciada y tiempos nativos. Los JSON registran relojes, gains de WebAudio,
fuentes musicales y SFX separados, velocidad y evolución observada.
La comprobación de audio silenciado no acredita escucha perceptual ni una
campaña natural completa. Los arreglos se disparan con eventos de QA, usando
la misma ruta process/updateMusic de producción.

[Comparación de registros](qa/music-evolution/comparison.json): éxito y fracaso
observados en ambos packs; error máximo entre el gain real y el objetivo escalado
1,475×10⁻⁸. Cada primera evolución tiene una tarea y diez voces musicales a ×1.
La muestra final B coincide con un fundido de retorno global: dos decks y veinte
voces programadas, como en el transporte original; después vuelve a un deck.
[Captura](qa/music-evolution/native-b.png). No son veinte stems A/B mezclados.
[Parada](qa/music-evolution/stops.json): cero fuentes de música y SFX en ambos
contextos. [Consolas](qa/music-evolution/console.json): sin avisos ni errores.

Los registros del navegador muestran que el evento termina y vuelve la evolución.
La restauración exacta del snapshot se comprueba en las pruebas dirigidas; los
registros finales del navegador pueden incluir una evolución posterior y no se
presentan como una fotografía exacta del instante de retorno.

[Build](qa/music-evolution/build.txt): 5,47 s, aviso conocido de bundle grande.
[Paquete](qa/music-evolution/package.txt): 559 archivos, 379782379 bytes,
796 enlaces relativos y 20 GLB runtime sin originales duplicados.

Quedan la escucha de los empalmes candidatos y la alternancia A/B dentro de
una campaña integrada. La elección por día par/impar sigue siendo una decisión
de integración, no una regla entre composiciones independientes prescrita por
los labs. Este trabajo no acredita esos puntos ni cierra el Plan Maestro.
