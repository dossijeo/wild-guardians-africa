# Preparación GPU de reparación de trabajadores

El generador reproduce el clip de reparación `Dig` de los cuatro modelos y exporta las matrices del rig y de las cuatro piezas de `Prop_Hoe`. Emplea el tiempo lógico de reparación existente (3,8 segundos escalados por perfil) para obtener las mismas muestras que la ruta CPU. La generación comprueba que las mallas esqueléticas compartan matrices, que no se omitan herramientas rígidas visibles y que repetir cada muestra produzca los mismos valores.

Regenerar con `node tools/guardian/build-worker-gpu-walk.mjs --clip=Dig`; comparar con los archivos versionados mediante `--clip=Dig --check`. Cada banco contiene 70 muestras y 143.640 bytes. Las comparaciones de muestras pasan para los cuatro perfiles.

Los bancos aún no están conectados a la partida: falta integrar carga, admisión, reproducción temporal, cambios de tarea y propiedad del efecto de reparación. La comprobación de muestras no es una prueba visual, de interpolación, de rendimiento ni una validación de la acción completa. La ruta CPU sigue siendo la autoridad de presentación para `Dig` hasta que esas piezas estén integradas y comprobadas.
