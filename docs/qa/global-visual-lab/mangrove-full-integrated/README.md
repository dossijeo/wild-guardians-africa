# Manglares completo: sustrato y bordes integrados

La opción `?visualLab=global-lighting&mangroveSubstrate=full` prepara ahora los bordes de los parches de barro al construir cada chunk. Ya no necesita instalar el ayudante QA para obtener esa parte de la composición. Usa los mismos vértices/triángulos existentes, interpola color/normal del suelo y calcula distancia al contorno una vez; no añade consultas a navegación ni trabajo por fotograma. El interior conserva su iluminación AfricanToon aprobada y el borde mezcla con musgo.

## Comprobación

24 capturas reales/12parejas recetaQA completa frente a integrada, tres cámaras día/noche baja/media, semilla712,1280×720. Las12parejas son RGB exactas, con mismos calls/triángulos, sin errores. El candidato no instala ningún ayudante de material QA. Datos captures.json/comparison.json y capturas PNG/WebP locales.

Build correcto:411módulos; advertencias existentes de tamaño/importación mixta. Tres pruebas pasan en global-mangrove-mud-edges y global-mangrove-substrate: conservación de posiciones, reemplazo y liberación del material previo sin liberar texturas compartidas, retención del mapa de suelo y construcción de shader Standard/Basic. La ruta Basic usa la normal disponible vToonLowNormal; no se ha validado todavía ese perfil muy bajo en GPU.

El material previo se libera inmediatamente tras sustituirlo; MudPatches mantiene propiedad de sus texturas compartidas. El material nuevo queda en el ciclo de vida normal del chunk y retiene la máscara de BiomeGround. No conserva listas globales de bindings ni wrappers de terrain().

## Pendientes

[Streaming integrado completado](streaming/README.md):18parejas RGB exactas en dos circuitos ±192m; geometrías y tres texturas liberadas una vez al cierre. No prueba de fugas prolongadas. También pendiente benchmark del conjunto integrado, muy_baja en GPU y cambios de calidad en caliente. No afirmar validación integral ni igualdad de coste a partir de capturas. Conservar calidad aprobada y registrar costes por separado.

Reproducir: `node tools/experiments/capture-mangrove-full-integrated.mjs`, `python tools/experiments/package-mangrove-full-integrated.py`, `node tools/experiments/capture-mangrove-integrated-streaming.mjs`, con Vite5190. Base/original es recetaQA, combined/candidate es integrada.
