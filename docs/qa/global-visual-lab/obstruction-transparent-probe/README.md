# Resultado: profundidad compartida incompatible con transparencias

**Descartar la candidata de superficie cercana con profundidad compartida como sustitución global del tramado.** Conservamos el prototipo para investigación, sin activarlo por defecto. Quita la cuadrícula, pero escribe una silueta completamente opaca en profundidad y puede borrar efectos que deberían verse a través del fundido.

[Comparación: profundidad auxiliar activada / desactivada](aux-depth-on-off.webp) · [Píxeles bloqueados](blocked-pixels.webp) · [Medición](analysis.json) · [Configuración](probe.json)

## Prueba controlada en el renderizador real

Gran Río, semilla 712, calidad baja, 1280 × 720, cámara del piloto junto al agua, día 150. Se selecciona un objeto real parcialmente oculto visible en pantalla. Su opacidad QA se fija temporalmente en 0,35 (antes era 0,99467). Un plano magenta transparente se coloca detrás de su volumen. Es un marcador de diagnóstico, no vegetación ni un efecto añadido al juego.

Se oculta el color de las instancias en fundido en ambas condiciones para aislar el efecto de su profundidad. Se dibujan cuatro imágenes: profundidad auxiliar activada/desactivada, cada una con marcador visible/invisible. El resto de la escena, cámara y estado visual permanece congelado. Se restauran visibilidades, atributo de opacidad, render target, autoClear y color de limpieza; el marcador y sus recursos se eliminan.

Los dos fondos sin marcador son RGB idénticos. El marcador produce señal superior a 20 niveles RGB en 68.872 píxeles sin profundidad auxiliar y 43.441 con ella. **25.431 píxeles pierden completamente la señal del marcador** (diferencia menor de 2 niveles respecto al fondo). Se conmuta el conjunto de auxiliares parciales visibles, no exclusivamente uno. No hay errores GL registrados. La comparación visual muestra la silueta de vegetación recortada en el marcador.

El aislamiento no pretende mostrar el aspecto final del juego: falta deliberadamente el color del fundido y el cielo de la pasada separada. Demuestra que el buffer de profundidad actúa como una oclusión opaca. Añadir después el color del objeto con alpha no recupera los fragmentos transparentes que ya fueron rechazados. No es un benchmark ni una medida de calidad artística.

## Relación con los efectos del juego

Los transparentes con prueba de profundidad pueden sufrir directamente este problema. El humo de edificios usa otra ruta: `BuildingEffects` lee `pipeline.smokeDepth`; `BuildingPipeline.captureDepth` renderiza la escena con `withDepthCaptureMaterials`. Ese preparador excluye materiales transparentes, pero conserva los auxiliares opacos con escritura de profundidad. La ruta del humo requiere una prueba específica; este diagnóstico no mide humo real ni todos los efectos del juego.

## Decisión

No promover esta variante. La recomendación sustituye la valoración provisional favorable de los vídeos de ocultación cercana. Eliminar su escritura de profundidad sin más devuelve la acumulación de caras internas que ya se descartó en el fundido convencional. Una alternativa futura necesitaría profundidad aislada o composición adecuada de capas, además de medir pasadas, memoria y coste en Intel UHD. No está justificado integrar la versión actual solo porque elimina el tramado.

La prueba previa junto al río no detectaba esto: el agua actual es opaca y las oclusiones revisadas estaban principalmente en la orilla. El experimento global de materiales y vegetación sigue activo y no depende de activar este fundido.

## Reproducción

```powershell
node tools/experiments/capture-obstruction-transparent-probe.mjs
python tools/experiments/package-fade-transparent-probe.py
```

Vite en 5190. PNG fuente locales; se publican comparación, máscara, registros y código. Ningún cambio de simulación, navegación, modelos autoritativos o main.
