# Manglares: comparativa con el mockup de helechos

Referencia proporcionada por el usuario: reference.jpg. Las capturas del lado derecho son del renderizador real, sin retoque de imagen. Semilla 712, 1280x720, calidad media, impostores y montanas activos. Tres vistas diurnas y nocturnas por variante. No equivalen a una campaña activa ni a un benchmark.

## Resultado artístico

Se conserva como candidato de investigación `clumps`: frondas radiales curvas, mayor separación entre centros, luz directa con normales del GLB, bases más oscuras y puntas verdes más legibles. `open` alarga y estrecha las frondas reduciendo su arco: permite distinguirlas, pero pierde masa y parece demasiado horizontal. No sustituye automáticamente la versión aprobada.

La comparación NO alcanza todavía la equivalencia artística pedida. El mockup muestra foliolos más finos, sombras proyectadas claramente separadas y un suelo más cálido y uniforme. El GLB suministrado es un helecho de foliolos anchos; sus tarjetas conservan esa forma. Aumentar contraste no resuelve esta diferencia de silueta. El agua y los modelos originales se han conservado; por ello tampoco se presenta como una coincidencia global de la imagen.

## Iteraciones

- Raised: descartada; excesiva altura y tallos tipo zancos.
- Smooth: 32 triángulos por mata en lugar de 16, para suavizar la curvatura.
- Lit/contrast: sombras solares reales mediante customDepthMaterial y alpha cutout; luz más contrastada.
- Olive: demasiado seca/marrón; descartada.
- Leaflight: verde más legible, pero masa demasiado uniforme con separación de 0.5 m.
- Clumps: separación de 0.65 m en media y 0.75 m en baja; se mantiene el descarte gradual de hasta 30% en el borde. Candidato visual, no integrado.
- Contact: sesgo del receptor de suelo al 25%; no aporta mejora visual suficiente para justificar cambiarlo. No seleccionado.
- Open: frondas más largas, estrechas y bajas; pierde la densidad visual buscada. No seleccionado.

## Costes y límites

Las variantes nuevas usan una shadow map de 4096 como diagnóstico, frente a 1024 de referencia. No se ha demostrado que ese coste sea viable en Intel UHD. Las sombras animadas pueden invalidar la caché y requieren una población conservadora independiente de la cámara para evitar desapariciones fuera de vista. No promover esta implementación sin medirlo. La memoria estimada de los dos mapas de hoja RGBA8 con mipmaps es 10.67 MiB; no es una medición de VRAM física.

El benchmark terminado de `../holly-fern-edge-cost-20261023/RESULTS.md` corresponde a la variante anterior sin estas sombras: NO puede atribuirse a este candidato. Sus resultados no demuestran una mejora general de FPS.

Todos los cambios nuevos están aislados en módulos/rutas QA. No se ha modificado src, la simulación ni main. Las capturas comprueban ausencia de errores GL y disponibilidad del fondo completo, pero falta validación en movimiento y benchmark del candidato final.

## Reproducción

Con Vite en el puerto 5190, PowerShell desde el worktree:

```powershell
$env:WG_CARD_TREATMENTS='cards'
node tools/experiments/capture-holly-fern-relief-clumps-20261023.mjs
node tools/experiments/capture-holly-fern-relief-open-20261023.mjs
```

Siguiente paso: mejorar la lectura de foliolos y la sombra localizada sin depender de aumentar globalmente la resolución de sombras. Mantener la masa aprobada y comparar siempre con el mockup antes de medir y seleccionar.
