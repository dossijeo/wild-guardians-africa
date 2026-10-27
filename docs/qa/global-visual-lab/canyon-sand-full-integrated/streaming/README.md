# Arena completa integrada: recorrido y cierre

Comparación de receta QA completa contra `visualLab=global-lighting&canyonSand=full`, ambas con dos mapas, misma iluminación y helper QA de suelo cálido. No compara completa contra económica.36capturas/18parejas, calidad media1280×720, semilla712, día150/noche350; dos circuitos de nueve posiciones totales por fase con desplazamientos±192m y regreso.

Cámara, objetivo global, origen de render, claves de chunks, draw calls y triángulos coinciden por posición; sin errores.13/18parejas RGB exactas; las cinco restantes cambian2–5píxeles, máximo1nivel. No atribuir los residuos a precisión o streaming sin aislamiento. [Registros](captures.json), [paridad](parity.json), [resumen](summary.json).

[Regresos diurnos](candidate-day-returns.webp) · [nocturnos](candidate-night-returns.webp). Inspeccionada tira diurna integrada: mantiene distribución de arena y ondulaciones. Retornos diurnos frente a primera imagen tienen MAE.0020497 en QA e integrada. Nocturnos0–.000000723; no identidad absoluta de todos los retornos. Las diferencias entre momentos no prueban desplazamiento del material.

## Recursos

Cada una de las dos texturas de capa notifica dispose exactamente una vez en ambas variantes; layerTextures queda vacío y BiomeGround.disposed=true. [Cierre integrado](media-candidate-disposal.json), [cierre QA](media-original-disposal.json). Capturador falla si no son dos recursos o alguna liberación no es única.

Contadores nocturnos de ambas variantes en origen y regresos: geometrías89/88/89, texturas48/48/48. Programas terminan36. No crecimiento acumulado observado entre regresos comparables, pero no prueba de ausencia de fugas prolongadas. Contadores renderer.info no son VRAM. La diferencia de contadores transitorios iniciales entre cargas no acredita optimización. settleMs incluye esperas y renders; no es coste puro de streaming.

Conservar opción completa en el laboratorio. Esta validación cubre el recorrido ensayado y cierre; siguen pendientes coste cercano directo, sesiones largas y revisión global de seis biomas. No demuestra cobertura exhaustiva del horizonte solo por capturar vistas elevadas. No cambia el benchmark anterior ni activa la variante por defecto.

```powershell
node tools/experiments/capture-canyon-sand-full-streaming.mjs
python tools/experiments/package-canyon-sand-full-streaming.py
```

Vite5190. PNG locales, tiras y registros publicados. Main, simulación, navegación y modelos intactos.
