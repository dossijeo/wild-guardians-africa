# Profundidad del adaptador de ruido fino

Comprobación complementaria al diagnóstico de frametime sobre `60f21f1`. El botón QA «Comparar profundidad con textura de ruido» de `depth-capture.html` lee el depth texture con la receta especializada activa. Primero renderiza el camino analítico; después instala el adaptador RGB de ruido y activa la textura. En el primer par de cada escena la lectura de referencia precede a la instalación del wrapper; en los pares posteriores cambia el uniforme en el mismo programa. El reloj y el estado lógico se mantienen pausados.

| Escena controlada | Meshes preparados antes/después | Píxeles comparados | Diferencias |
| --- | --- | --- | --- |
| Manglares/Saheliana intacto | 928 / 928 | 1440000 | 0 |
| Manglares/Saheliana daño 85 % | 931 / 931 | 1440000 | 0 |
| Gran Cañón/Mapungubwe intacto | 573 / 573 | 1440000 | 0 |
| Gran Cañón/Mapungubwe daño 85 % | 576 / 576 | 1440000 | 0 |

Las lecturas no son constantes y el estado serializado es idéntico antes/después en cada par. Los recuentos specialized/fallback/excluded coinciden; el adaptador no fuerza un fallback nuevo en estos casos. Sin errores de escena; consola final de Gran Cañón sin errores. Los datos contienen una anomalía de depthFunc en RawShaderMaterial ya presente en ambos caminos; no se presenta como corregida por este experimento.

Se trata de daños visuales impuestos, no incursiones simuladas; un trabajador llegando, brote en crecimiento cero y ausencia de VFX de trabajo activos. No acredita profundidad de todos los cultivos/morphs, culturas, partículas, poses animales, móvil ni ahorro del pase. La prueba mide profundidad, no sombras ni igualdad de color. [Fuentes y hashes](depth-proof.json). La candidatura de ruido sigue fuera del juego hasta ampliar su aceptación visual/de coste.
