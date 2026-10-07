# Revisión: preparación de impostores después de cerrar su propietario

Contraejemplo encontrado en la rama de impostores, todavía fuera del gameplay normal de main. La fuente y sus hashes están en sources.json. reproduction.txt.gz conserva el script realmente ejecutado: necesita esa copia de la rama en la ruta importada (adaptar las dos URLs locales para reproducir en otra máquina).

La prueba llama a las implementaciones reales attachBiomeFarVegetation y prepareNativeFarGpu, con un renderer/GL simulado y texturas Three reales. Detiene attachSpecies antes de comenzar la preparación, cierra solo el propietario de impostores, mantiene abierto el mundo y después reanuda la preparación. La promesa de attachment rechaza correctamente, pero quedan dos listeners de contexto y un listener de dispose por textura registrados después de haber retirado los anteriores.

Resultado: owner null, mundo abierto, listeners inmediatamente tras dispose 0 y después de preparación tardía 2. No acredita fuga de GPU/RAM física, ni un fallo en main, ni una ejecución WebGL real. Sí reproduce una carrera del contrato de ownership: el adapter tardío usa ownsWorld:false y su cierre no retira la cache creada después de release del propietario.

Se envió el contraejemplo al subagente para corregirlo antes de su PR. La corrección debe evitar preparar recursos del propietario cancelado y limpiar el trabajo tardío sin eliminar caches/listeners de un propietario nuevo. Quedan por verificar cancelación previa, durante preparación y reemplazo de propietario; este informe conserva el fallo previo y no declara esas regresiones resueltas.
