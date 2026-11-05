# Efectos de trabajo en el Worker WebGPU: estado QA

La escena WebGPU experimental reproduce efectos visuales de trabajo a partir de
`workVfxPlans` y del estado y eventos confirmados. Reutiliza el atlas y la
simulación visual existentes; tierra, agua, maíz y hojas utilizan geometrías y
materiales compartidos entre efectos. El riego interpola los recorridos de
boquilla precalculados y verifica su correspondencia con los modelos mediante
su hash. La posición procede del trabajador confirmado y la altura, del suelo
residente. No se modifican tareas ni resultados de simulación.

Los recursos se cargan cuando son necesarios. Si fallan los datos de riego,
se registra `workFailure` y continúan los demás efectos. La vía de `WorkVfx`
heredada sigue ejecutándose: todavía no existe una confirmación de preparación
de recursos y cobertura suficiente para retirarla con fallback seguro.

Las pruebas dirigidas comparan matemáticamente el emisor WebGPU con el método
real `WorldScene.wateringSource`, con suelo simulado; comprueban planes de
trabajo, partículas rígidas, tiempo confirmado sin avance y fallo de carga.
No son una prueba de juego real ni de GPU. Faltan capturas comparativas en
WebGPU, validar herramientas, materiales e iluminación, cobertura de tipos de
trabajo, pausas y recuperación gráfica. No se ha medido ahorro ni se ha
demostrado paridad visual; la integración sigue siendo experimental.
