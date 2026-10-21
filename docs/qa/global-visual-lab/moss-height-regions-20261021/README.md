# Manglares: ponderación regional por altura

Control:dos escalas. Candidata:cuatro desplazamientos regionales con peso bilineal multiplicado por exp2((altura-.5)*12),normalizado. Color,normal yARH usan los mismos pesos. Conserva geometría,máscaras ytexturas.

Seis parejas reales,semilla712,media,1280×720,tres cámaras,día/noche. Misma cámara,hora,draw calls ytriángulos,sin errores. [Normal diurna](day-0-pair.webp),[elevada](day-1-pair.webp),[normal nocturna](night-0-pair.webp). Izquierda dos escalas,derecha regiones por altura.

Decisión:no promover por resultado artístico. La normal diurna revisada sigue perdiendo contraste respecto al control;no se aprecia salto suficiente hacia acumulaciones orgánicas. No se ha aislado mediante ablation cuánto aporta la ponderación frente al promedio regional anterior;esta prueba responde si sustituye a la candidata retenida,yla respuesta es no. No seguir afinando exponentes sin una hipótesis distinta sobre material o iluminación.

Coste no medido por contención GPU reciente;12 lecturas de textura del bucle yponderación exponencial frente a hasta6 del control. Lecturas originales sobrescritas podrían ser eliminadas por compilador,pendiente inspección. No es un descarte por rendimiento. Persisten limitaciones de origen flotante ynormales mezcladas que no derivan una superficie física.

```text
node tools/experiments/capture-moss-height-regions-20261021.mjs
python tools/experiments/package-moss-height-regions-20261021.py
```

Vite5190;archivar salidas antes de repetir. Main,predeterminado yassets intactos. Se conserva la candidata de dos escalas yeste experimento como evidencia negativa.
