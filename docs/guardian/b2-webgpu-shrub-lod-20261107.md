# LOD 3D de arbustos en WebGPU

El propietario de vegetación aplica a los matorrales las distancias de autoría del perfil normal (16 y 38 unidades, con descarte a 95), calculadas con el centro y radio aproximados de cada instancia. Usa las geometrías y UV del manifiesto del bioma y los materiales, sombras, selección, supresión y admisión ya existentes. Si faltan niveles, conserva el último nivel disponible y si solo existe el primero mantiene ese modelo. Los árboles y las demás categorías conservan sus rutas anteriores.

Las instancias descartadas intencionalmente por distancia se distinguen de las todavía no publicadas. Los chunks sin mallas visibles también reciben cambios de cámara para poder reconstruirse al acercarse. Una sustitución se admite antes de retirar el lote anterior y una petición obsoleta se cancela. Estas operaciones no cambian la simulación ni las colisiones.

Verificación: 90 pruebas de `tests/webgpu-biome-props.test.js`, incluida geometría real de sabana, fallback ante un nivel ausente, cancelación, descarte/restauración y publicación coordinada. No se ha medido rendimiento ni comprobado la transición visual en una GPU real. Las pruebas de árboles reales se actualizaron para comprobar que el primer lote usa texturas originales y permanece visible durante la admisión de la textura cercana; también comprueban la sustitución posterior por el LOD lejano.
