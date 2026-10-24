# Musgo y sustrato texturizado: dos repartos, ninguno aprobado

Prototipo QA con dos materiales reales usando los mapas Moss002 y de barro ya existentes. Mantiene pureMoss y sustituye únicamente su salida por una mezcla de color, normales, rugosidad y AO. Mantiene wet=0 y rugosidad del barro limitada a .78–.96. No recupera la rama húmeda descartada ni cambia geometría, simulación o navegación.

## Resultado artístico

La primera calibración expone demasiado barro y pierde la identidad verde: [elevada diurna](manglares-media-day-1-pair.webp). La segunda reduce el peso del desgaste y aumenta la cobertura mínima de musgo: [elevada diurna](cover/manglares-media-day-1-pair.webp), [normal nocturna](cover/manglares-media-night-0-pair.webp). Izquierda control, derecha candidata en cada pareja.

Se inspeccionaron las candidatas completas elevada diurna de ambas series y normal nocturna de la segunda. La segunda conserva más verde, pero aparece una mancha amplia con detalles de materiales superpuestos. No produce agrupaciones claras ni un salto suficiente de volumen. **No promover ninguna de las dos.** No ejecutar benchmarks de una candidata que aún falla el criterio artístico.

## Receta reproducible y costes pendientes

Se cargan clones de base/normal/ARH del barro en los tres slots de capas existentes de BiomeGround; se usa su gestión de recursos, pero no se ha validado su lifecycle en este ensayo. Se añade una lectura de máscara y tres lecturas de textura por fragmento de suelo, además de ruido procedural. No añade draw calls ni triángulos. Hay tres objetos de textura adicionales; no se midió VRAM ni tiempo GPU. No afirmar coste gratuito por reutilizar archivos.

Campo = .64G + .18R + .18ruido − desgaste×coeficiente. Primera: smoothstep(.40,.66), coeficiente .22, cobertura .12–.98. Segunda: smoothstep(.30,.50), coeficiente .10, cobertura .38–.98. La máscara observada en la auditoría nativa guía estos rangos. No se usa humedad B para controlar brillo. Fuera de chunks mapeados se usa un contexto constante provisional: la continuidad con horizonte no está validada.

El barro proyectado usa escala/orientación del musgo y multiplicador RGB(.58,.61,.64). La receta no es idéntica a la del material independiente de los parches, que tiene otra ruta de conversión de color e iluminación: esa coherencia sigue pendiente. La mezcla es lineal entre mapas, no mezcla por altura. La silueta del terreno permanece intacta.

## Evidencia

Cada serie:24 capturas/12 parejas, media/baja, día150/noche350, tres cámaras, seed712,1280×720. Verificados cámara, objetivo, hora, draw calls y triángulos iguales, sin errores registrados en las series finales. 48 conversiones individuales lossless verificadas contra PNG entre las dos series; pares reducidos publicados.

[Registros primera](captures.json) · [Comparación primera](comparison.json) · [Registros segunda](cover/captures.json) · [Comparación segunda](cover/comparison.json).

La primera ejecución falló por samplers declarados después de su uso. Se corrigió el orden en las rutas QA y se repitió toda la serie; las capturas fallidas no son evidencia. No se modifica el shader predeterminado.

Pendientes antes de reconsiderar: separación por altura/estructura en la transición, coherencia de color con parches, horizonte, cercanía, movimiento, coste y recursos. Cambiar solamente umbrales no resuelve la superposición de materiales ni la repetición global. No hay nuevo recurso externo ni cambio de licencia.

## Reproducción

Con Vite5190:

```powershell
node tools/experiments/capture-mangrove-substrate.mjs
python tools/experiments/package-mangrove-substrate.py
node tools/experiments/capture-mangrove-substrate-cover.mjs
python tools/experiments/package-mangrove-substrate-cover.py
```
