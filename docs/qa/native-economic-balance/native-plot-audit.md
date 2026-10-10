# Colocación nativa inicial: seis biomas

Semilla712, cultura Mapungubwe, datos originales de terreno y comandos pagados. Los seis biomas permiten colocar60 brotes de mijo: centro800, brotes300 y jornal30, dejando370 de las1500 monedas iniciales. Cada candidato requiere placement nativo y rutas de ida/vuelta; no se modifican fluidos, pendientes, dinero ni productividad.

No se avanza tiempo simulado. Esto demuestra capacidad económica y espacial de compra, no producción de60 cultivos al día, movimiento visual, rendimiento de trabajadores o supervivencia. Los demás perfiles, culturas y semillas permanecen fuera de este diagnóstico.

`native-plot-audit.json` conserva coordenadas, resultados, hashes de fuentes y duración de cada diagnóstico. Las duraciones no son benchmarks aislados de frametime: hubo posible solapamiento con un build de otra rama. No se usan para aceptar una optimización. Los resultados parciales y errores se conservan; el CLI devuelve fallo si algún bioma no alcanza el objetivo.

Reproducción: `node tools/audit-native-campaign-plots.mjs docs/qa/native-economic-balance`.
