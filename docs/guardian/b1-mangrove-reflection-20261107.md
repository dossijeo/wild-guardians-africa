# Suelo WebGPU del manglar: reflejo ambiental experimental

El material experimental reproduce ahora el término de reflexión especular del suelo original: toma el reflejo del entorno con el nivel de mip determinado por la rugosidad y aplica Fresnel, atenuación por rugosidad y AO del atlas. Reutiliza los dos nodos de textura ambiental, el estado día/noche y la transición de carga ya administrados por el entorno del agua. No descarga ni conserva otra copia de esas texturas. El material no libera recursos del entorno; el propietario del mundo los libera después de los materiales que los utilizan.

El reflejo aparece gradualmente cuando las texturas están disponibles. Esto evita una muestra provisional falsa; esa transición de carga no es idéntica a la inicialización del renderizador anterior. La ruta de suelo texturizado sigue limitada a la opción experimental: no cambia el backend ni la presentación de producción.

Las pruebas comprueban la generación WGSL con mips, la estabilidad del grafo al cambiar parámetros y la propiedad de los recursos compartidos. No constituyen una comparación de imagen o una ejecución GPU real. Siguen pendientes el barro independiente, AO de contacto, la paridad general de iluminación, el resto de biomas y las pruebas visuales y de rendimiento.
