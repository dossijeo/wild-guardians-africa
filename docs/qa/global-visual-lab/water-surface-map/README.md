# Mapa compartido de pendientes — dirección conservada

La apariencia irregular se obtiene con dos lecturas de una textura RG8 256×256, compartida entre materiales, en lugar de ocho hashes por píxel. La textura contiene datos numéricos de pendientes periódicas generados en código; no es un asset externo. Mipmaps y filtrado suavizan la frecuencia a distancia. Memoria nominal: 128 KiB de nivel base y ~171 KiB con mipmaps; no es una medición de VRAM del driver. No añade geometría ni draws.

16 capturas QA de Gran Río y Manglares, día/noche y dos tiempos de animación. Se conserva la dirección de la variante analítica sin volver a las franjas anchas. [Mediciones ABBA](PERFORMANCE.md). Las diferencias negativas no se presentan como aceleración demostrada; la ronda inicial de Gran Río/Manglares queda dentro de +0,5 ms en las cuatro fases.

La [ruta integrada](../water-integrated/README.md) usa el mismo generador y muestreo, con propiedad de textura y liberación por referencias. La aplicación QA usa assets.own para su vida de página. Los scripts desactivan la integración mediante una respuesta local interceptada antes de aplicar QA, para no aplicar dos variantes a la vez. El material definitivo es experimental, no la dirección final aprobada de los seis biomas.

La ronda ampliada cubre Sabana y Cañón además de Gran Río/Manglares: las ocho medias por fase quedan dentro de +0,5 ms. El mayor incremento es +0,250 ms en Sabana nocturna. Hay deriva en las muestras, incluida una repetición nocturna de Sabana a 19,370 ms frente a 17,269 ms; no afirmar coste exacto ni aceleración. El mapa satisface el umbral en esta ronda, no una garantía universal.
