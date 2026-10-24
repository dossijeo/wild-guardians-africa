> CORRECTION (2026-10-23): the fern QA call `resizeShadowMap(light, 4096)` actually selected 1024 because the API expects a quality name. Claims of a 4096 map in this report are incorrect. See `../holly-fern-shadow-actual2048-20261023/README.md`. Original measurements are retained.

# Sombras locales con transicion radial

Variante QA del proxy guarded. Mantiene la geometria/color/densidad visibles. Solo la geometria de profundidad se contrae gradualmente entre24 y40m del centro de la region (media,farDistance48). Se seleccionan casters hasta40m en vez de60m. La posicion del centro usa la misma rejilla8m. Viento de sombra10Hz, mapa4096 diagnostico.

Seis capturas reales comparables con resident: misma camara,target,hora y cantidades near/far visibles. Casters en las tres vistas:7524,9253,5830 frente a18670,19813,18397. Cero errores GL,overflow o untracked. Comparativas diurna/nocturna incluidas. Lectura de las matas cercanas conservada; sombras distantes deliberadamente mas tenues, no equivalencia exacta.

Es un compromiso de alcance de sombra, no una optimizacion de calidad identica. No se reduce vegetacion visible. No hay benchmark de esta variante: menos casters no prueba mas FPS. Falta medir y grabar los cruces del centro en rejilla: la transicion espacial puede saltar al cambiar de celda. Tampoco demuestra conservatividad en otros angulos solares/relieves ni compatibilidad completa del LOD.

Mantener como candidata y conservar la region amplia para comparacion. No integrar hasta resolver transiciones y coste. Las validaciones de ciclo de cultivo pertenecen a guarded anterior, no se atribuyen automaticamente a esta variante.

Reproduccion: Vite5190; WG_CARD_TREATMENTS=cards; node tools/experiments/capture-holly-fern-shadow-local-fade-20261023.mjs.
