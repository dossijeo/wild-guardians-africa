# Gran Río: variación espacial de pigmento

Seis parejas día/noche,semilla712,media,1280×720,con cámara,hora,draw calls,triángulos e instancias iguales y sin errores. Control:LOD coherente de V8. Candidata:campo de valor interpolado de7.5 unidades,determinista por semilla y posición,mezclado20% con meso/humedad existentes y80% con campo nuevo.

El campo se calcula al generar tiles y se guarda en coverageData.y. No añade atributos,instancias,texturas ni muestras GPU. Cambia la expresión de tinte en vertex shader. No medir su coste mediante estos tiempos de captura: falta benchmark CPU/GPU y streaming.

[Vista elevada diurna](day-1-pair.webp),[normal diurna](day-0-pair.webp),[normal nocturna](night-0-pair.webp). Original izquierda,candidata derecha.

La vista elevada revisada muestra variación suave entre zonas verdes y algo más secas,con caminos intactos. Mejora modesta:persiste la uniformidad del conjunto y no se consigue aún la estructura orgánica del mockup. No confundir cambio de color con relieve nuevo. Conservar como candidata QA,sin promover por defecto ni declarar conseguido el objetivo. Pendientes revisión nocturna detallada,transición al terreno sin geometría,movimiento y coste.

```text
node tools/experiments/capture-river-patch-color-20261021.mjs
python tools/experiments/package-river-patch-color-20261021.py
```

Vite5190. Archivar salidas antes de repetir. Sin cambios de simulación ni main.
