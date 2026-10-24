# Gran Río: alinear tierra con el corte de cobertura

**No promover.** La mezcla V2 termina en desgaste .70, mientras las hojas se excluyen con desgaste central >.25 o de huella >.27. Esta prueba cambia solo los dos smoothstep del suelo (mezcla y atenuación del relieve) de .12–.70 a .08–.30. Conserva máscaras, distribución, color y recursos de V2. La opción `wearAligned` queda falsa por defecto; no afecta al juego normal.

[Comparación media diurna](gran-rio-media-day-pair.webp) · [Comparación nocturna](gran-rio-media-night-pair.webp)

La inspección de la vista normal diurna muestra menos franja verde plana, pero un claro de tierra mayor y una frontera circular más marcada. Alinear umbrales no basta para naturalizar la forma de la máscara. No se modifica ocupación autoritativa ni se añade hierba sobre caminos para ocultarlo.

24 capturas reales, 12 parejas: semilla 712, 1280×720, baja/media, día 150/noche 350, tres cámaras. Auditoría de cámara, objetivo, hora, llamadas, triángulos e instancias near/far idénticos, sin errores ni desbordamiento. Viento 8 congelado en tiempo 2. Cada pose se estabiliza con 30 renders adicionales; no se registra la lista completa de opacidades. Se inspeccionó visualmente el par normal diurno medio; las restantes imágenes tienen comprobación automatizada, no aprobación artística individual.

No se mide CPU/GPU ni movimiento porque no supera el criterio artístico. No añade texturas ni lecturas al shader V2, pero cambiar la región de mezcla puede cambiar su coste efectivo; no afirmar coste idéntico. Mantener V2 y este candidato como QA, sin integración. El siguiente trabajo debe investigar la forma espacial del borde visual y la continuidad de cobertura, no seguir estrechando el mismo umbral.

Reproducción con Vite en 5190:

```powershell
node tools/experiments/capture-river-soil-wear-aligned.mjs
python tools/experiments/package-river-soil-wear-aligned.py
```

Capturas fuente PNG locales; se publican dos pares, trazas y auditoría. Main y simulación intactos.
