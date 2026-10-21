# Intersección POM interpolada en roca volcánica

La marcha actual para cuando depth>=1-height y adopta directamente la UV del último paso. La candidata guarda posición y error del paso previo; al encontrar cruce, interpola con previousError/(previousError-currentError), limitado a0..1. Se aplica a rock. No añade muestras de textura: máximo8como antes. Conserva altura0,44, escala0,06, ceniza por altura, iluminación y geometría. Si no encuentra cruce en8pasos conserva la salida anterior; no se declara resuelto ese límite.

Doce capturas de renderer real, media1280x720, semilla712, tres cámaras día/noche. Cámaras/hora/calls/triángulos iguales en las seis parejas; sin erroresGL/página. La vista cercana inspeccionada suaviza parte del escalonado conservando profundidad. Persisten líneas de textura/normales; no se declara eliminado todo artefacto ni estabilidad temporal certificada.

Conservar como candidata QA. Pendientes comparación en movimiento y costeALU/GPU; igual número máximo de muestras no implica coste idéntico. No nuevas pasadas ni geometría. No se modifica producción ni otros biomas como resultado de este piloto.

[Comparación cercana](day-1-pair.webp), [datos](captures.json), [ablación previa](../volcanic-pom-ablation/README.md). Reproducir capture-volcanic-pom-refined.mjs, Vite5190. Código de transformación aislado en qa-volcanic-pom-refine.mjs.
