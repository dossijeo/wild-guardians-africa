# Hojas arqueadas cerca de cámara en perfil bajo

Seis parejas reales día/noche,baja,semilla712,1280×720,target fijo(52,28). Control ocho hojas simplificadas,16triángulos por módulo. Candidata ocho hojas arqueadas32triángulos hasta24unidades,convergencia18–24hacia las mismas ocho hojas lejanas. Igual densidad,instancias,máscaras y color. El centro y normales convergen hacia la versión simplificada; no se ocultan cuatro hojas porque este LOD lejano conserva las ocho.

[Día](comparison-day.jpg),[noche](comparison-night.jpg): mejora local modesta de iluminación/forma cercana,pero persiste aspecto de parches planos desde vista normal. No promover todavía ni afirmar cumplimiento artístico. La falta de arqueado no explica por sí sola el problema del perfil bajo. Conservar variante,no descartarla únicamente por coste.

Instancias idénticas2351/2605/1272. Control37616/41680/20352triángulos;candidata59504/71008/33376. Incremento exacto16triángulos por instancia cercana1368/1833/814. Pasa de una a dos llamadas de cobertura. No benchmarkCPU/GPU ni FPS. Las máscaras y la densidad no cambian.

Capturas sin errores. Se ejecuta además recorrido0→96→192→96→0 ydesmontaje del helper,con25chunks sincronizados yrestauración de capa original;detalles en streaming.json. No certifica fugas o comportamiento temporal del LOD de ocho hojas. Pendiente diseñar una unidad simplificada con mejor lectura de hojas y variación interna,antes de adoptar más geometría.

Reproducir con Vite5190:node tools/experiments/capture-mangrove-leaf-low-arched-20261021.mjs;python tools/experiments/package-mangrove-leaf-low-arched-20261021.py. equivalence.json registra diferencias,no equivalencia esperada. PNG completos regenerables,láminas ymetadata publicadas. QA únicamente,sin main.
