# Gran Cañón: separación entre arena y grava

**Dirección de composición útil; receta no aprobada.** La referencia original del cañón muestra grandes superficies arenosas y acumulaciones localizadas, mientras el suelo de prueba presenta grava casi uniforme. Este piloto introduce depósitos sobre el material existente para evaluar esa diferencia de escala, sin geometría nueva.

[Antes / candidata, vista cercana](media-day-2-pair.webp) · [Noche](media-night-2-pair.webp)

Se mezclan dos campos de ruido mundial (.10 y .27 por metro, pesos .75/.25) con smoothstep .32–.62 y máscara de suelo plano. En depósitos se mezcla el color hacia arena cálida (.66,.44,.23), se atenúan normales y AO y se eleva rugosidad a .98. La grava mantiene escala .08 en ambos casos. No añade texturas, lecturas de mapas, pasadas ni geometría, pero sí dos evaluaciones de ruido por fragmento. POM original sigue calculándose y el detalle de color residual deriva de la grava: no se representa una capa de arena físicamente independiente.

La vista cercana candidata inspeccionada muestra un cambio amplio de material, pero la arena queda demasiado lisa y conserva huellas de piedras. No considerar esta simplificación un aumento de volumen. No integrar. El siguiente candidato necesita un material de arena coherente (color, normal y altura adecuados), con depósitos localizados, en vez de seguir reduciendo el detalle de grava.

## Validación y límites

24 capturas reales, 12 parejas: semilla712, 1280×720, media/baja, día150/noche350, tres posiciones cercanas de suelo despejado. Empaquetado verifica cámara, objetivo, hora, llamadas y triángulos idénticos, sin errores. La noche también cambia porque se modifica material, no exclusivamente luz solar. Se inspeccionó la candidata cercana media diurna; no se aprueban las demás vistas por inferencia. Faltan cámara normal/elevada, movimiento y streaming.

No se ejecuta benchmark temporal al no superar la receta el criterio artístico. No afirmar coste idéntico por no añadir texturas. El campo de ruido conserva continuidad mundial mediante worldPatternPosition, pero aún no se ha validado su cambio de origen en este piloto.

La etiqueta study heredada del ensayo anterior se corrigió después de la captura; captures.json registra esa corrección. El código ejecutado fue qa-canyon-sediment-route.mjs, sin mapa de microvisibilidad solar. Fuente de referencia: ART-REFERENCES.md, Gran Cañón. Recursos existentes Ground079S, sin recursos externos nuevos.

```powershell
node tools/experiments/capture-canyon-sediment.mjs
python tools/experiments/package-canyon-sediment.py
```

Vite5190. PNG fuente locales; pares y registros publicados. Runtime por defecto/main intactos; objetivo global no alcanzado.
