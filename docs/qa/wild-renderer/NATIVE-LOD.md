# Selección LOD nativa: primera etapa

Se añadió `wr_lod` a Wild Renderer, todavía sin conexión al renderer del juego. Consume registros persistentes Float64 de posición/centro visual/radio y genera índices estables separados en tres rangos. La cámara y los tres umbrales son los únicos parámetros variables de selección; no necesita copiar registros por frame. El registro y retiro de esos datos aún deben conectarse a eventos del ciclo de vida.

La prueba compara con `nativeLodBins` original: 2 roles, 6 grupos, 4 calidades, 3 cantidades de niveles y 3 cámaras, 432 combinaciones de 2.048 instancias. Incluye escalas no uniformes, centro vertical, umbrales exactos y valores a ambos lados, descarte por distancia máxima y población vacía. Todos pasan. Esto no prueba equivalencia para todos los números de coma flotante: Math.hypot y std::hypot pueden diferir en casos extremos; la prueba del juego sigue siendo obligatoria.

No se ha medido aceleración ni se ha reducido trabajo del juego todavía. No hay un nuevo benchmark sintético presentado como resultado final. El siguiente paso es registrar estos datos desde los recursos persistentes y los exports compactos de Engine, conservar las invalidaciones por geometría/calidad y conectar las listas a los consumidores de sombras/cobertura antes del A/B completo.

Compilar mediante tools/build-wild-renderer.ps1 y ejecutar node --test tests/wild-renderer-lod.test.mjs. El export nuevo no altera los selectores anteriores ni activa cambios de producción.
