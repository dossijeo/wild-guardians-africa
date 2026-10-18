# Suite completa tras el traslado a Wild Engine

Base: `52932c3dacb0523fe647c6b3e983cce4a6626c07` (`main`), Node
`v20.11.0`, WASM espacial SHA-256
`f0032bf7d6d5bb3336f2f9480fc2dc109906b9d2743315853320420863b07643`.
Comando: `npm test` (`node --test tests`) en Windows. La ejecución terminó en
476,60 s con 4.499 pruebas: 4.437 aprobadas, 4 fallidas y 58 omitidas.

Dos archivos de pruebas no llegaban a cargar por un import generado durante
el renombrado: buscaban `src/world/wild-engine-adapter.js`, mientras el
adaptador histórico sigue siendo
`src/world/hierarchical-wasm-adapter.js`. Se corrigieron los imports de las
dos pruebas y cuatro herramientas de benchmark. Las dos pruebas dirigidas
ahora cargan y completan sus diez casos (10/10), incluidos puertas para
trabajadores, brechas, rutas físicas y actualización incremental. No se
modificó el navegador ni el binario WASM. La suite completa aún no se ha
repetido después de este ajuste; no se reclama como verde.

Los otros dos fallos son las expectativas de victoria de
`tests/active-farm.test.js`. Repetidas por separado sobre la misma base,
ambas granjas legalmente simuladas pierden en el día 8 tras siete noches:
el único centro es destruido, quedan cero cultivos vivos y 215 monedas.
Las ocho incursiones terminan y `GameOver` se emite una sola vez; no hay
`CampaignWon`. Se entregan 24 cajas antes de la derrota. La variante de
ocho cultivos no alcanza el día 20 en que empezaría a diversificar. Es un
resultado de balance y estrategia, no una prueba de que la campaña de 100
noches esté superada. Las aserciones de supervivencia se conservan para
seguir mostrando esa carencia; no se cambió daño, economía ni presión.

Los registros de aceptación QA-014 (teléfono físico) y QA-156 (escucha
perceptiva y alternancia de campaña completa) siguen parciales. Las pruebas
automatizadas y de escritorio existentes no demuestran esas dos condiciones.
