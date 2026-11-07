# Plantación inicial de trabajadores

El Worker solicita bajo demanda un banco `Plant` para cada perfil durante la primera fase de la tarea `initial`. Esta pose no muestra herramientas rígidas en los cuatro modelos revisados. El personaje mantiene el rig CPU si falla la carga o admisión; el tramo que cruza a `Water` no se certifica y vuelve a la presentación ordinaria, sin cambiar la tarea ni la simulación.

El participante de efectos incluye `dig` junto a `water`: solo certifica muestras de tarea, objetivo, posición y fase estables, con terreno y efectos disponibles. El roster exige `workSynchronized` antes de hacer avanzar la pose. El efecto sigue avanzando en CPU por fotograma en el Worker gráfico y conserva las barreras y la recuperación de terreno del riego.

Las pruebas comparan una campaña preparada con Wild Engine/WASM frente a una autoridad de referencia, cubren el límite Plant→Water y una interrupción real por Despertar. Una prueba conecta roster y VFX sobre el mismo reloj, y otra genera WGSL para la pose, sombras y selección. `node tools/guardian/build-worker-gpu-walk.mjs --clip=Plant --check` reproduce los cuatro bancos de 206.540 bytes cada uno. No se ha ejecutado la escena en GPU real ni medido rendimiento, memoria o paridad visual; la fase posterior `Water` de la tarea inicial mantiene el rig CPU.
