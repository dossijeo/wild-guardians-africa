# Gran Río: irregularidad limitada a la mezcla del material

Control: capa de tierra V2 conservada, paleta y cobertura existentes. Candidata: mismo material con variación del peso de tierra en su transición. Ambos incluyen la capa; no comparar etiquetas heredadas base/combined con ausencia/presencia de tierra.

Peso s=smoothstep(.12,.70,wear); candidata clamp(s+(noise-.5)*1.8*s*(1-s),0,1), ruido mundial frecuencia.35. Conserva exactamente extremos s0/1. No modifica máscara nativa, selección de hojas, geometría, ocupación ni caminos autoritativos. La atenuación POM sigue usando el desgaste original, sin nueva técnica de relieve. No se afirma correspondencia nueva entre frontera material y cobertura.

24capturas/12parejas, baja/media1280×720, semilla712, día150/noche350, tres poses. Cámara, hora y geometría verificadas por empaquetador; sin errores. [Día](gran-rio-media-day-pair.webp), [noche](gran-rio-media-night-pair.webp), [registros](captures.json), [auditoría](comparison.json). Conversión de capturas individuales sin pérdida comprobada.

Inspeccionadas parejas normales media de día/noche: diferencia sutil, claro amplio sigue dominando; no mejora suficiente de transición a escala de juego. No promover este microajuste. El motivo es visual, no rendimiento: no se ejecutó benchmark ni se afirma coste nulo. Añade ruido y operaciones por fragmento, sin nuevos mapas, triángulos o llamadas.

Conservar V2 y la cobertura continua como referencias. La prueba muestra que perturbar solo peso en una franja estrecha no resuelve la estructura amplia del claro. Evitar acumular nuevos umbrales menores como si eso alcanzara la dirección artística. Reconsiderar composición visual de terreno y borde a escala mayor preservando exclusiones y reglas.

```powershell
node tools/experiments/capture-river-soil-material-fringe.mjs
python tools/experiments/package-river-soil-material-fringe.py
```

Vite5190. Opción materialFringe falsa por defecto; QA exclusivamente. Main, simulación, navegación y modelos intactos. No abandono de una variante visual buena por su coste; la receta V2 sigue conservada.
