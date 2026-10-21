# Gran Río: tierra V2 como opción del laboratorio

`?visualLab=global-lighting&riverSoil=1` activa la capa de tierra únicamente en Gran Río. Conserva Grass Medium01 en zonas herbáceas y mezcla los mapas de color/normal/ARH de Ground079S en desgaste; atenúa POM de hierba conforme al peso de tierra. Reutiliza los tres recursos CC0 existentes de ambientCG, sin nuevas descargas ni geometría. [Procedencia y hashes](../river-soil-layer-v2/asset-provenance.json).

## Evidencia de integración

24capturas/12parejas recetaQA V2 frente a integrada, baja/media, día/noche, tres vistas, semilla7121280×720. Cámara, hora, calls, triángulos, instancias y buffer de cobertura coincidentes; sin errores ni overflow. Nueve parejas RGB exactas. Inversas: media noche291píxeles, baja día154 y baja noche274; causa no aislada. Normal diurna inspeccionada: tierra/poblado, cobertura y sombras conservados. No equivalencia completa demostrada.

Build412módulos correcto, advertencias existentes; seis pruebas de opciones/cachés de Río, Manglares y Cañón pasan. El caso de gate sin global-lighting se volvió a comprobar tras completar la lista de entradas. Materiales Standard/Basic tienen programas separados de la ruta original.

## Alcance

La URL activa solo el material. Las capturas mantienen la cubiertaC/viento8, paleta y máscara de desgaste de cobertura mediante ayudantesQA, iguales en ambos lados; no se atribuye su integración a esta opción. Default y otros biomas no activan tierraV2. No cambia simulación, distribución vegetal, edificios ni geometría autoritativa.

La región despejada del poblado sigue siendo amplia y regular. No se resuelve aquí la transición de cobertura; no usar la integración como prueba de alcanzar los mockups. Variantes de moteado y perturbación de borde quedan conservadas, sin reemplazar silenciosamente V2.

Pendientes: streaming/origen y liberación de las texturas en la ruta integrada, rendimiento comparable y perfil muy bajo en GPU. Los costesQA anteriores siguen documentados, pero no son un benchmark nuevo de esta integración. Las tres texturas se clonan y disponen mediante layerTextures; falta verificar ese ciclo en esta ruta.

Reproducir con `node tools/experiments/capture-river-soil-integrated.mjs` y `python tools/experiments/package-river-soil-integrated.py`, Vite5190. Base=QA V2; combined=integrada. PNG/WebP originales locales, captures.json/comparison.json versionados.
