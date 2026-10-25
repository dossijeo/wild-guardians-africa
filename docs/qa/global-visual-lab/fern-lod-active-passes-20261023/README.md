# Manglares activo: atribucion inicial por pasadas

Sobre 702e75e03. LOD aprobado: frondas cercanas nativas y compuesto lejano preiluminado; viento .25. Intel UHD, 1280x720, media, fixture poblada semilla 712. Simulacion y relojes de materiales activos, camara oscilante 8 m, fondos completos. Dos repeticiones de dia y noche. No cambia codigo del renderizador.

## Metodo

Cuatro ventanas consecutivas por fase: GPU de fotograma completo, GPU por pasadas sin consultas anidadas, CPU con hooks inclusivos, cadencia sin temporizadores ni hooks. Cada ventana tiene 60 frames de calentamiento y 60 medidos. Todas avanzan simulacion y no tienen pausas, errores WebGL o pagina. Auditoria de consultas sin disjoint, pendientes, perdida de contexto ni overflow. Las ventanas contienen estados distintos de un mundo activo: no sumar el desglose a la GPU de otra ventana ni tratar las repeticiones como cargas identicas.

## GPU por pasada (ms por fotograma observado)

|Fase/repeticion|GPU completa*|Principal color|Sombras|Profundidad mundo|Cielo|Cadencia media*|
|---|---:|---:|---:|---:|---:|---:|
|day 1|24.69|17.321|3.537|1.703|0.887|30.773|
|night 1|28.225|19.137|3.797|3.948|1.705|44.088|
|day 2|26.914|17.954|3.545|2.538|0.926|31.107|
|night 2|27.286|17.329|3.332|3.527|1.581|34.292|

*GPU completa y cadencia se miden en ventanas independientes. Los segmentos GPU de preparacion sin dibujos son practicamente cero; eso NO indica preparacion CPU gratuita. La mascara de edificios consume unos 0.20 ms aun sin draws, incluyendo trabajo de limpieza/target.

La pasada principal concentra 17.3–19.1 ms; sombras 3.3–3.8 ms. Profundidad del mundo suma 1.7–2.5 ms de dia y 3.5–3.9 de noche. De dia se ejecuta en 30/60 y 43/60 frames; de noche en todos. Los valores de tabla ya incluyen los frames sin pasada, no son coste por invocacion. Esto identifica un coste adicional que se perderia midiendo solo geometria de helechos.

## CPU y limites

En ventanas instrumentadas, groups.update ronda 1.02–1.11 ms. buildings.captureDepth ronda 1.71–2.94 ms de dia y 4.45–4.59 de noche; renderer.depth esta incluido dentro, no se suma. renderer.screen ronda 4.99–5.61 ms. Los tiempos de world.render no incluyen toda la simulacion externa. El primer intervalo nocturno medio de 44.09 ms difiere de 34.29 ms en la segunda repeticion: no ocultar esa variacion como FPS estables.

Inspeccionada la captura nocturna de la primera repeticion: mantiene cobertura y lectura del asentamiento; no es una comparacion visual exacta de dos estados activos. La memoria y cambios de carga se conservan en benchmarks.json; no es una prueba prolongada de fugas.

## Decision

Priorizar desglose de la pasada principal entre suelo, helechos, otras instancias y fondo. Esta prueba NO mide overdraw ni atribuye 17–19 ms al suelo: hacen falta controles de aislamiento o instrumentacion adicional por grupos. Evaluar tambien por que la profundidad de mundo se requiere mas durante actividad nocturna y si sus consumidores necesitan toda la escena en cada actualizacion. No reducir densidad ni quitar efectos antes de atribuir su coste y verificar equivalencia.

Las sombras son relevantes, pero no dominan solas. El resultado es compatible con coste acumulado de escena; refuta tratar el viento/helechos como explicacion suficiente. Mantener el LOD aprobado y continuar su integracion separada de estos diagnosticos.

## Reproduccion

```powershell
node tools/experiments/measure-fern-lod-active-passes-20261023.mjs
python tools/experiments/audit-fern-lod-active-passes-20261023.py docs/qa/global-visual-lab/fern-lod-active-passes-20261023
```
