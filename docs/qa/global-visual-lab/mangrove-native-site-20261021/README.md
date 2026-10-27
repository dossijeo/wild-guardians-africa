# Manglares: datos nativos del asentamiento localizados

Captura real de seis vistas día/noche,semilla712,media. horizonSource.snapshot() devuelve version1,seed712,biome=mangrove y asentamiento x60,z0,hx28.404998779296875,hz15.724272727966309. Igual en seis observaciones,sin errores. nav.field.c y village.terrainSite no son la fuente en esta ruta; intento alternativo fue detenido correctamente por la comprobación explícita.

API existente: world.spatialSession.horizonSource.snapshot(),definida en spatial-game-session.js y respaldada por core.terrainState(). spatial-state.js lee cuatro float32 por asentamiento desde memoria WASM. No requiere añadir API ni consultar cada fotograma; el prototipo puede capturar al instalar y refrescar solo al invalidarse asentamientos.

spatial-savanna.cpp confirma receta nativa: clear=max(19,hypot(hx,hz)),soft=clear+6,halo=clear+13. La máscara combina max(core*(.81+.19*meso),path*.74),con corredores de ejes ynoise nativo. Antes de reutilizar noise JS hay que verificar equivalencia de semilla/función; no asumir por nombre igual.

Siguiente paso: máscara visual de patios usando metadatos nativos,conservando corredores yocupación. No se ha cambiado aún la distribución ni demostrado mejora visual. Sin benchmark,solo diagnóstico de lectura. V10 intacta y objetivo global pendiente.

Reproducir capture-mangrove-native-site-20261021.mjs con Vite5190. captures.json guarda resumen nativo junto a cámara ycontadores; PNG locales regenerables.
