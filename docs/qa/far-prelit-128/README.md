# Atlas precocinado compacto: 128 frente a 256

Candidato experimental; no integrado ni seleccionado como defecto del juego.

Baker nativo: far-vegetation-atlas.html?bake=day&rotations=8&resolution=128 y equivalente night. Ocho vistas por ocho orientaciones mundiales frente al sol fijo. Dos atlas 1024×1024, 128 píxeles por celda. WebP lossless: día 641090 bytes, noche 550008; total 1191098 bytes (1.14 MiB), frente a 3668792 (3.50 MiB) del par de 256. Reducción de descarga 67.5%. RGBA con mipmaps estimado: 10.67 frente a 42.67 MiB, 75% menos texels. No medida de RAM física ni benchmark GPU de resolución.

Visor: lighting=real&population=single&prelit=rotations&yaw=45&haze=1&resolution=128. El defecto sigue siendo 256; prelit=1 conserva su atlas original de 256. Reporte expone prelitResolution para acreditar el candidato cargado.

Prueba nativa a 1280×720: modelo y atlas compacto, y referencia 256 con idéntica cámara [0,14,50], yaw45, mediodía y bruma 30–300. Silueta principal y luz conservadas; 128 suaviza detalles pequeños. Las capturas permiten comparación, no prueban equivalencia exacta. Órbita 22.5° nocturna prueba mezcla entre vistas 7/0; amanecer uNight=0.5 y distancia50 prueba crossfade 0.5 con readiness1. Todos los reportes GL0/errors[], consola vacía.

La captura dawn-transition todavía muestra doble contorno en ciertas ramas/copas al mezclar perspectivas. Por ello no se acepta aún la transición como imperceptible ni se reduce la resolución por defecto. Falta comparar mezcla discreta/angular y elevación de cámara, integración con chunks, horizonte, dispositivo móvil y frametime. Las texturas son artefactos QA fuera de public.
