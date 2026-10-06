# Supresión y persistencia visual por ID

Prototipo aislado, sin cambios del juego activo. setTreeEnabled(id,false) oculta ambas representaciones. Reutiliza el atributo de preparación con valor reservado -1 y la cobertura existente; no añade otra textura ni otro atributo de instancia. La preparación lógica se mantiene separada: puede avanzar mientras está oculto y se recupera al restaurar. No se acredita coste GPU idéntico del shader nuevo.

snapshotTreeState/restoreTreeState preservan solo excepciones por ID, sin depender de orden/slot. El visor guarda excepciones de regiones retiradas y actualiza/elimina las que vuelven al estado normal en la región actual; así pueden restaurarse si reaparecen más adelante. No es guardado de partida ni sustituto de nav.suppressed, al que todavía debe conectarse.

9 pruebas pasan(380.91ms), ampliando readiness con ocultación, cambios de preparación estando oculto, restauración .75, migración a lote reordenado, vecino nuevo intacto y validación de tipos. También cobertura nativa y cancelación regional. Migración en prueba CPU; este lote visual no prueba regreso real a una región retirada.

Nativo: acacia única, atlas8vistas128, día, bruma. Cerca cámara[0,10,25]: oculto, modelo e impostor descartados. Lejos cámara[0,25,100]: oculto, impostor descartado; al restaurar vuelve visible. Reportes GL0/errors[], consola vacía. Counts son instancias enviadas aunque sus fragmentos se descarten, no objetos visibles. Se limita el panel QA al viewport para evitar scroll del documento/redimensionamientos al añadir controles; no modifica HUD del juego.

Pendiente conectar estados por ID al streaming/supresiones reales y a preparación GPU, aplicar crossfade a batches de color nativos y su agrupación, pruebas de rotación/lateral/elevación, sombras/render-origin/culling, mobile GPU/RAM y resto de biomas. Los benchmarks previos no verifican este shader nuevo. La fase completa de impostores aún no está integrada.
