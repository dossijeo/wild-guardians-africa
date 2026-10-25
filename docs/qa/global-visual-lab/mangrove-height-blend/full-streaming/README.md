# Sustrato completo aprobado: streaming y liberación

Se prueba la receta completa de Manglares, sin los microajustes de muestreo condicional. Control Moss002 puro, misma mezcla QA de parches en ambos. Candidata: altura calibrada, color lineal aproximado, barro toon y omisión de iluminación sin contribución. No se reduce calidad para pasar esta prueba.

36 capturas reales,18 parejas, media1280×720, semilla712, día150/noche350. Nueve posiciones por fase: dos circuitos con desplazamientos±192m y regreso al inicio. Cámaras, objetivos globales, origen de render, claves de chunks, llamadas y triángulos coinciden entre variantes. Cero errores de página o GL. [Registros](captures.json), [resumen](summary.json), [comparación](parity.json).

[Regresos diurnos de candidata](candidate-day-returns.webp), [nocturnos](candidate-night-returns.webp), [control diurno](original-day-returns.webp), [control nocturno](original-night-returns.webp). Inspeccionada tira diurna candidata: conserva patrón y posición del material al regresar. No se inspeccionó visualmente cada destino. La posición3 produce imágenes iguales entre variantes; no se interpreta como prueba de activación del material allí.

Regresos nocturnos RGB exactos para ambas variantes. Error absoluto RGB medio diurno: control.0032523 y candidata.0036162, igual en ambos regresos de cada variante. Causa residual no aislada; no atribuirla a streaming ni afirmar igualdad diurna exacta.

## Recursos

Al cerrar candidata, las tres texturas layerTextures notifican dispose exactamente una vez cada una.24 geometrías de parches también una vez, y referencias activas QA pasan de24 a0. [Candidata](media-candidate-disposal.json), [control](media-original-disposal.json). La comprobación de texturas ocurre en el capturador y falla si no son tres o si alguna cuenta difiere de1.

En los regresos diurnos candidata mantiene76 geometrías/49 texturas; noche permanece76/49 en los tres puntos de origen. Control acaba76/48; al inicio diurno existen contadores transitorios diferentes. Son contadores renderer.info, no VRAM ni inventario completo de recursos. No equiparar la diferencia de un contador con memoria de una única textura: la receta carga tres clones y el renderizador puede compartir almacenamiento. Programas terminan32 en ambas variantes.

No se observa crecimiento acumulado en estos retornos, pero dos circuitos no prueban ausencia de fugas prolongadas ni validan todas las transiciones del horizonte. settleMs incluye esperas y renders de asentamiento; no es latencia pura de streaming ni benchmark de fotograma. Esta ronda no cambia las conclusiones de coste anteriores.

## Decisión y reproducción

Conservar la receta completa aprobada como candidata a integración experimental; esta prueba refuerza su comportamiento al volver a zonas descargadas y al cerrar. Rendimiento, horizonte y validación prolongada siguen pendientes. Ningún cambio en main, simulación, navegación o modelos.

```powershell
node tools/experiments/capture-mangrove-full-streaming.mjs
python tools/experiments/package-mangrove-full-streaming.py
```

Vite5190. Reutiliza helper de recorrido de parches; campos radiusAttributes son cero en ambas variantes porque este ensayo no activa el borde dependiente del tamaño. PNG locales, tiras y datos publicados. Calidad global de seis biomas todavía pendiente.
