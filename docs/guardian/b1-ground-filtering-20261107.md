# Filtrado de los atlas de terreno WebGPU

Los proveedores del desierto, manglar, volcanes, sabana, gran río y cañones configuran los atlas de color, normal y materiales con anisotropía 8 antes de subirlos. Es el mismo valor solicitado por `BiomeGround` en la ruta anterior; los filtros lineales y mipmaps existentes cumplen los requisitos del sampler WebGPU. Las máscaras de cada chunk no cambian de filtrado.

Las pruebas comprueban la configuración previa a la subida para los seis biomas y conservan las pruebas de recursos y generación WGSL. No hay comparación de imagen ni medición del coste GPU en dispositivo: no se afirma que el cambio resuelva por sí solo el aspecto pixelado ni que mejore el rendimiento. La selección efectiva y el coste del sampler requieren comprobación integrada.
