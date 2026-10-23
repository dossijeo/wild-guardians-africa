> CORRECTION (2026-10-23): the fern QA call `resizeShadowMap(light, 4096)` actually selected 1024 because the API expects a quality name. Claims of a 4096 map in this report are incorrect. See `../holly-fern-shadow-actual2048-20261023/README.md`. Original measurements are retained.

# Manglares: comparativa con el mockup de helechos

Referencia proporcionada por el usuario: reference.jpg. Las capturas del lado derecho son del renderizador real, sin retoque de imagen. Semilla 712, 1280x720, calidad media, impostores y montanas activos. Tres vistas diurnas y nocturnas por variante. No equivalen a una campaÃƒÂ±a activa ni a un benchmark.

## Resultado artÃƒÂ­stico

Se conserva como candidato de investigaciÃƒÂ³n `clumps`: frondas radiales curvas, mayor separaciÃƒÂ³n entre centros, luz directa con normales del GLB, bases mÃƒÂ¡s oscuras y puntas verdes mÃƒÂ¡s legibles. `open` alarga y estrecha las frondas reduciendo su arco: permite distinguirlas, pero pierde masa y parece demasiado horizontal. No sustituye automÃƒÂ¡ticamente la versiÃƒÂ³n aprobada.

La comparaciÃƒÂ³n NO alcanza todavÃƒÂ­a la equivalencia artÃƒÂ­stica pedida. El mockup muestra foliolos mÃƒÂ¡s finos, sombras proyectadas claramente separadas y un suelo mÃƒÂ¡s cÃƒÂ¡lido y uniforme. El GLB suministrado es un helecho de foliolos anchos; sus tarjetas conservan esa forma. Aumentar contraste no resuelve esta diferencia de silueta. El agua y los modelos originales se han conservado; por ello tampoco se presenta como una coincidencia global de la imagen.

## Iteraciones

- Raised: descartada; excesiva altura y tallos tipo zancos.
- Smooth: 32 triÃƒÂ¡ngulos por mata en lugar de 16, para suavizar la curvatura.
- Lit/contrast: sombras solares reales mediante customDepthMaterial y alpha cutout; luz mÃƒÂ¡s contrastada.
- Olive: demasiado seca/marrÃƒÂ³n; descartada.
- Leaflight: verde mÃƒÂ¡s legible, pero masa demasiado uniforme con separaciÃƒÂ³n de 0.5 m.
- Clumps: separaciÃƒÂ³n de 0.65 m en media y 0.75 m en baja; se mantiene el descarte gradual de hasta 30% en el borde. Candidato visual, no integrado.
- Contact: sesgo del receptor de suelo al 25%; no aporta mejora visual suficiente para justificar cambiarlo. No seleccionado.
- Open: frondas mÃƒÂ¡s largas, estrechas y bajas; pierde la densidad visual buscada. No seleccionado.

## Costes y lÃƒÂ­mites

Las variantes nuevas usan una shadow map de 4096 como diagnÃƒÂ³stico, frente a 1024 de referencia. No se ha demostrado que ese coste sea viable en Intel UHD. Las sombras animadas pueden invalidar la cachÃƒÂ© y requieren una poblaciÃƒÂ³n conservadora independiente de la cÃƒÂ¡mara para evitar desapariciones fuera de vista. No promover esta implementaciÃƒÂ³n sin medirlo. La memoria estimada de los dos mapas de hoja RGBA8 con mipmaps es 10.67 MiB; no es una mediciÃƒÂ³n de VRAM fÃƒÂ­sica.

El benchmark terminado de `../holly-fern-edge-cost-20261023/RESULTS.md` corresponde a la variante anterior sin estas sombras: NO puede atribuirse a este candidato. Sus resultados no demuestran una mejora general de FPS.

Todos los cambios nuevos estÃƒÂ¡n aislados en mÃƒÂ³dulos/rutas QA. No se ha modificado src, la simulaciÃƒÂ³n ni main. Las capturas comprueban ausencia de errores GL y disponibilidad del fondo completo, pero falta validaciÃƒÂ³n en movimiento y benchmark del candidato final.

## ReproducciÃƒÂ³n

Con Vite en el puerto 5190, PowerShell desde el worktree:

```powershell
$env:WG_CARD_TREATMENTS='cards'
node tools/experiments/capture-holly-fern-relief-clumps-20261023.mjs
node tools/experiments/capture-holly-fern-relief-open-20261023.mjs
```

Siguiente paso: mejorar la lectura de foliolos y la sombra localizada sin depender de aumentar globalmente la resoluciÃƒÂ³n de sombras. Mantener la masa aprobada y comparar siempre con el mockup antes de medir y seleccionar.
