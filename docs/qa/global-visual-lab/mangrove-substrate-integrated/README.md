# Sustrato completo de Manglares: integración opt-in

`?visualLab=global-lighting&mangroveSubstrate=full` activa solo en Manglares la mezcla calibrada de alturas musgo/barro, las tres texturas existentes de mudPatches y la iluminación separada del suelo. Conserva la receta completa aprobada por el usuario. Default y demás biomas permanecen sin esta opción; no se activa por perfil de calidad ni se sustituye por la variante económica.

## Evidencia

24 capturas reales,12parejas QA completa/integrada: tres cámaras, día/noche, baja/media, semilla712,1280×720. Todas RGB exactas, mismo número de llamadas y triángulos, sin errores. Normal diurna inspeccionada visualmente. Capturas individuales lossless verificadas; pares de presentación redimensionados. No benchmark nuevo: equivalencia de imagen no prueba igualdad de coste. Se mantiene como referencia el coste documentado de la receta completa.

`npm run build`:410módulos, éxito; advertencias existentes de tamaño e importación mixta. `node --test tests/global-mangrove-substrate.test.js tests/global-canyon-sand.test.js`:4pruebas pasan; comprueban opt-in y cachés separadas en materiales Standard/Basic.

## Alcance y pendientes

Integra el material del suelo continuo. Ambas variantes de captura aplican todavía `qa-mangrove-mud-moss-toon-interior.js` para los bordes de parches existentes. Por tanto la URL por sí sola no reproduce aún toda la composición aprobada. Integrar ese ayudante, verificar streaming/liberación de texturas y contrastar escena completa antes de presentar la integración como terminada. No se han alterado edificios, personajes, simulación ni geometría autoritativa.

El código carga clones de las tres texturas existentes mediante el ciclo de vida de BiomeGround; no incorpora assets externos nuevos. La nueva clave de shader distingue la receta. La función de parche se extrajo de la receta QA de cinco opciones activadas, sin sample gates experimentales.

Reproducir con Vite5190: `node tools/experiments/capture-mangrove-substrate-integrated.mjs`, `python tools/experiments/package-mangrove-substrate-integrated.py`. Base=recetaQA, combined=material integrado. Datos captures.json/comparison.json; PNG/WebP locales junto al informe.
