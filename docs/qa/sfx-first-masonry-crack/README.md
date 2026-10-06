# Primera rotura de mampostería — SFX 042

`wall_crack_small` acompaña al primer impacto real que reduce la vida desde el máximo en murallas de piedra, adobe y adobe reforzado, incluidas sus puertas. El morph nativo empieza a mostrar daño en cuanto baja la vida; no se introduce un umbral visual o daño nuevo. El crujido crítico existente tiene prioridad si ese mismo impacto cruza su umbral. Madera y zarzas conservan sus contactos propios.

La ruta usa la posición capturada del impacto, el bus world, la familia structure-detail y el emisor del bloque. Comparte los límites de voces, deduplicación de historial y rechazo de decodificación tardía, menú, ocultación o escena descartada. Una reparación completa permite una nueva transición intacto → dañado; una partida cargada no vuelve a reproducir su historial. No altera daño, reparación, economía ni colas.

Validación: 139 pruebas dirigidas, con daños producidos por updateRaid en los cinco animales, cinco materiales y puertas/bloques; casos negativos, prioridad crítica, posición, deduplicación, estado de dominio y cancelación. La suite de audio completa pasa 484/484. Build correcto y verificadores de audio/Opus e inventario de los 126 originales correctos. 90 asignados y 36 pendientes. Esta evidencia utiliza dobles del dispositivo de audio: no acredita escucha, mezcla perceptual ni móvil físico.
