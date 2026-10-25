# Protección de derivadas en el muestreo condicional

Segunda prueba de optimización, sin cambiar la referencia visual aprobada. Además de mossCover<1, mantiene las lecturas de color/normal de barro cuando fwidth(mossCover)>0. Busca conservar valores de píxeles vecinos en la transición. No modifica distribución, alturas, mapas ni receta de iluminación.

12 capturas reales, seis parejas, baja1280×720, semilla712, día150/noche350 y tres vistas cercanas. Cámaras, objetivos, hora, llamadas y triángulos iguales; sin errores registrados. [Día](day-pair.webp), [noche](night-pair.webp), [trazas](captures.json), [paridad](parity.json).

La diferencia baja de3101–7166 píxeles en la primera prueba a71–162 en esta. Máximos RGB11–25: no son solo diferencias de un nivel. La reducción es consistente con dependencias entre fragmentos vecinos, pero no prueba por sí sola cuál operación posterior las causa. sampleTurfN410 no contiene derivadas; no atribuirle el problema. Persisten residuos que deben localizarse antes de afirmar equivalencia. No hay benchmark ni ahorro demostrado.

Mantener la receta original aprobada como control. Próximo diagnóstico: localizar residuos y comprobar protección del grupo completo de fragmentos y operaciones posteriores que dependen de derivadas. No sustituir silenciosamente el material por esta candidata.

Reproducir con Vite5190:

```powershell
node tools/experiments/capture-mangrove-sample-guard.mjs
python tools/experiments/audit-mangrove-sample-gate.py docs/qa/global-visual-lab/mangrove-height-blend/sample-gate/derivative-guard
```

Solo QA, flags nuevos desactivados por defecto. Main y simulación intactos. PNG locales, pares lossless publicados. Esta prueba técnica no reevalúa ni descarta la dirección visual de Manglares.
