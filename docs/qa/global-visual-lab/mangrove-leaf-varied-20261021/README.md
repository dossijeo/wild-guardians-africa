# Variación interna de hojas Blender

Asset original,Blender5.2.2,semilla712. Mismos ocho elementos y32triángulos cercanos: amplitud angular interna ±0.3→±1.1radianes yaltura0.055–0.095→0.09–0.16unidades. Misma longitud,anchura yubicación nominal de centros. No modifica modelos originales del juego. Conservados JSON,GLB,.blend,generador ypreview.

Piloto baja deriva ocho hojas lejanas de los vértices exteriores del nuevo módulo,16triángulos;el archivo JSON far contiene el LOD de cuatro hojas del generador y NO se usa directamente en este piloto. Comparación contra ocho hojas arqueadas anteriores,misma densidad,posiciones,cámara,hora ymaterial. Son dos cambios geométricos simultáneos;no atribuir resultado exclusivamente a orientación.

[Comparación día](game/comparison-day.jpg),[noche](game/comparison-night.jpg): menos alineación repetida ymejor lectura local de hojas,pero sigue visible la separación entre parche geométrico ysuelo. Conservar candidata de diseño,no declarar conseguido perfil bajo ni equivalencia con mockup. Sigue pendiente tratamiento artístico de forma/material yvalidación de movimiento.

Seis parejas reales,baja,semilla712,target fijo(52,28),1280×720. Instancias,triángulos,draw calls ybytes iguales:59504/71008/33376triángulos de cubierta por cámara,dos llamadas. Sin errores. Streaming ida/vuelta192unidades ydesmontaje completados;ver game/streaming.json. Sin benchmarkCPU/GPU:misma geometría enviada no implica mismo coste de rasterización/overdraw. La mayor altura requiere además revisión temporal de viento ysilueta.

Reproducción:generador tools/experiments/blender-mangrove-leaf-varied-20261021.py con Blender headless (rechaza sobrescribir assets);capture-mangrove-leaf-varied-20261021.mjs ypackage-mangrove-leaf-varied-20261021.py con Vite5190. PNG completos regenerables,láminas ymetadatos publicados. audit.json del generador describe solo asset,antes de integración. QA,sin cambios en main.
