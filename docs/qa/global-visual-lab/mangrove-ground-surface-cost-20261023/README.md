# Manglares: composicion material sin iluminacion final

Diagnostico QA, no candidata visual. Conserva groundMaterial417 y sus resultados de albedo, normal, roughness, AO, humedad y salida separada de suelo. Combina todos en una salida artificial para mantener sus dependencias observables y evitar que el compilador elimine calculos no usados. Omite iluminacion final, evaluacion de sombras receptoras y reflexion; shadow maps siguen dibujandose. La combinacion artificial tiene su propio coste y no constituye un contador exacto de instrucciones.

Intel UHD/ANGLE1280x720/media,fixture712 pausada,camara normal movil8m,A/B/A/B dia/noche.25 materiales residentes. Geometria, cantidad de suelo, overlays y resolucion sin cambios.480 consultas completas validas y ventanas separadas por subsistema/cadencia. Auditor verifica estado/camara/calls/triangulos/cobertura identicos por muestra. Sin errores ni consultas perdidas/disjoint.867475.5triangulos medios completos.

|Variante|Fase|Suelo color ms|GPU completa ms|Intervalo ms|p95 ms|
|---|---|---:|---:|---:|---:|
|base|day|8.223|24.601|30.835|38.1|
|base|night|8.406|23.846|30.332|38.9|
|surface|day|6.573|20.668|26.847|33.7|
|surface|night|6.907|20.929|27.567|32.9|
|base|day|7.692|22.245|26.797|33.1|
|base|night|8.003|22.549|29.012|38|
|surface|day|6.272|20.174|28.983|34.2|
|surface|night|6.342|21.833|27.008|33.1|

Composicion observable:6.272–6.907ms, original7.692–8.406ms. Diferencia por pareja1.420–1.661ms. Junto a la salida plana anterior (~1ms), indica que gran parte del coste de color permanece en la composicion/muestreo, no solo en la iluminacion final. No atribuye por separado ALU, ancho de banda, filtrado anisotropico, mezclas o overdraw. Diferencias de cadencia incluyen deriva; este shader no preserva la imagen y no se promueve.

Pendiente: ablaciones progresivas de segunda escala/substrato, dependencia de resolucion con LOD/geometria fijados y medida de solapamiento. No empezar precoccion por inercia. Una cache de tres RGBA8 a1024² con mipmaps cuesta16MiB/chunk o400MiB para25chunks (estimacion sin overhead, targets ni dobles buffers). El material original repite mapas1024² a escala0.115 (~8.70m por tile); un chunk48m a1024² pierde mucha resolucion espacial frente a ese detalle. Evaluar packing, caches limitadas o composicion hibrida si la fase diagnostica las justifica; no aceptar perdida de arte ni picos de streaming.

Reproducir con Vite5190:

```sh
node tools/experiments/measure-mangrove-ground-surface-20261023.mjs
python tools/experiments/audit-mangrove-ground-surface-20261023.py docs/qa/global-visual-lab/mangrove-ground-surface-cost-20261023
```

No cambio nativo ni simulacion. PR159 permanece borrador.
