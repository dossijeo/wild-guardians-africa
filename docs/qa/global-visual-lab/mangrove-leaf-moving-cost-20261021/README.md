# Coste con cámara móvil: Manglares, Intel UHD

A:cubierta desactivada;B:ocho hojas variadas con streaming QA. Misma página,cachés residentes,semilla712,baja,1280×720,target(52,28). ABBA día y noche. 90muestrasGPU y90frames de cadencia por bloque,60calentamiento por medición. 720muestrasGPU y720frames de cadencia válidos. Cámara cercana→normal:12unidades enX,25enZ,10enaltura;misma secuencia de90posiciones comprobada en todos los bloques. Sin esperas explícitas por pose. Datos precreados/calentados:construcción de tiles durante frames registrados=0;no representa streaming frío de larga distancia.

| Fase | GPU A1/A2 | GPU B1/B2 | CPU render A1/A2 | CPU render B1/B2 | Intervalo A1/A2 | Intervalo B1/B2 |
|---|---|---|---|---|---|---|
| Día |17.070/16.682|17.369/17.692|3.728/3.521|3.573/3.623|19.436/19.363|21.014/21.522|
| Noche |17.504/17.435|18.384/18.074|3.433/3.484|3.440/3.577|19.671/20.279|21.712/22.859|

Todo enms. Diferencia de mediasGPU +0.655día/+0.760noche. Intervalos +1.869día/+2.311noche. P95intervalos entre38.46y44.26ms:hay picos también en control. No reducir todo a FPS medios ni atribuir todos los picos a la cubierta. Dos repeticiones no son confianza estadística. No sumarGPU yCPU,medidos por separado ysolapados en ejecución.

Selector B:0.163/0.172ms día,0.161/0.168ms noche;P95 0.3ms en todos. Incluye selección yrelleno de atributos,medido con instrumentación existente dentro de render;no sumar otra vez alCPU total. A no ejecuta selector. CPU global no aumenta proporcionalmente en todas las rondas:hay variabilidad de otros trabajos. No afirmar que moverlo a WASM resolvería todo basándose en este dato.

Estado invariable,sin erroresGL,disjoint,queries perdidas/pendientes,context loss ooverflow. Pre/postflightCIM sin motores>2%;sin monitorización continua. Draw calls ytriángulos varían por cámara,se conservan secuencias crudas en benchmarks.json. Instrumento guarda CPU,selección,construcción yposición porframe. No mide VRAM física nioverdraw. Preparación de cámara fuera del temporizadorCPU es idéntica entre variantes.

Recomendación:conservar candidata yoptimizar selección/envíos sin empobrecer la cubierta. Coste móvil medible,superior al indicado por prueba estática,no aprobar rendimiento global todavía. Pendientes perfilmedia,regiones más densas,streaming frío,eventos reales yvalidación visual global. Las imágenes previas de candidata están en ../mangrove-leaf-varied-20261021/game;este ensayo de coste no sustituye comparación artística.

Reproducción Vite5190:node tools/experiments/measure-mangrove-leaf-moving-cost-20261021.mjs;python tools/experiments/audit-mangrove-leaf-moving-cost-20261021.py. Helper qa-mangrove-moving-measure-20261021.js registra recorrido sin alterar simulación. Sin cambios en main.
