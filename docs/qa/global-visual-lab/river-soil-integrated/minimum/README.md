# Gran Río: tierra integrada en calidad muy baja

Comparación de la receta QA V2 con su integración riverSoil=1, semilla 712, 1280×720, calidad muy_baja, tres cámaras y día/noche. Se normalizó elapsed/simElapsed a 2 en ambas rutas; viento y tiempo visual se conservan. No compara la mejora artística contra el juego original: comprueba que la receta aprobada sobreviva a su integración en el perfil mínimo.

Doce capturas, seis parejas. Cámara, objetivo, hora, draws, triángulos, cobertura y memoria de buffers coinciden; cero overflow y errores registrados. Cuatro parejas son RGB exactas: vista normal y oblicua, día/noche. La vista inversa difiere en 154 píxeles diurnos y 29 nocturnos; causa no aislada, no declarar equivalencia completa.

| Vista | Draw calls | Triángulos |
|---|---:|---:|
| Normal | 63 | 753.468 |
| Oblicua | 70 | 792.091 |
| Inversa | 57 | 686.898 |

La inspección de la lámina normal diurna conserva la continuidad de cobertura y la tierra cálida del poblado. La explanada sigue siendo demasiado regular y plana en comparación con la dirección artística; integrar la receta no resuelve ese límite. No se descarta la cubierta por su coste y no se cambian edificios, navegación ni simulación.

Esta ejecución no mide tiempos GPU/CPU. El presupuesto del perfil mínimo sigue pendiente y no puede deducirse de que las capturas funcionen. [Comparación numérica](comparison.json), [día](gran-rio-muy_baja-day-pair.webp), [noche](gran-rio-muy_baja-night-pair.webp).

Reproducir con Vite5190, WG_RIVER_QUALITY=muy_baja y WG_RIVER_OUT apuntando a una carpeta nueva; ejecutar capture-river-soil-integrated.mjs y package-river-soil-integrated.py con esas mismas variables.
