# Sombras reales del jardín de carga

Comparación QA del mismo jardín, cámara (4.8,3.1,6.4), semilla 712, 1280×720, cuatro plantas, progreso 75 %, día 150/noche 350. `garden` es control sin sombras proyectadas; `shadow` reutiliza NativeShadow y los MeshDepthMaterial originales con crecimiento y viento. Shadow map 512×512, cámara ortográfica ±6, near 1/far 100, PCF nativo existente. No cambia modelos ni simulación.

## Resultado visual

Las hojas proyectadas sobre la tierra dan un apoyo y volumen claramente superiores a la oclusión circular anterior. Se conserva candidata para optimizar; no descartar solo por coste. La noche mantiene las sombras solares ponderadas por la luz existente, por lo que son mucho más discretas que de día. No simula una nueva luz lunar ni la sombra del haz artístico del mockup.

El factor de distancia vertical pasa de 1.65 a 2.15 en ambas variantes: cinco plantas caben en la captura 390×844, incluido el ejemplar añadido con un clic real. El callback de cancelar y el valor accesible 75 siguen correctos. No cubre todavía 18 plantas, todos los tamaños de pantalla ni la cancelación real durante carga.

## Coste observado, Intel UHD / ANGLE D3D11

240 queries GPU válidas, cero disjoint: 40 fotogramas RAF de calentamiento y 30 muestras por bloque ABBA, separados sin/con viento. Cámara fija y reloj de viento idéntico por bloque. CPU mide solo d.render; no sumar CPU+GPU ni convertir a FPS del juego. Los contadores abarcan cielo, bruma, escena y shadow map.

| Caso | Sin sombra | Con sombra |
| --- | --- | --- |
| Estático: medianas GPU por bloque | 2.868 / 2.920 ms | 4.803 / 4.630 ms |
| Estático: mediana CPU | 0.35–0.40 ms | 0.50–0.60 ms |
| Viento: medianas GPU por bloque | 6.040 / 4.024 ms | 5.091 / 3.896 ms |
| Viento: draws / triángulos | 6 / 16002 | 7 / 29882 |

En estático la caché evita redibujar el mapa, pero permanece el coste de muestreo/iluminación. Con viento, el control deriva notablemente: NO concluir que las sombras aceleran el render ni atribuir un delta fiable. Cuatro observaciones de GPU solo detectan este test y procesos auxiliares de 3–6 %, pero no monitorizan toda la ejecución. Falta repetir secuencias, medir carga real/concurrencia y perfiles modestos. El target de 512² añade aproximadamente 1.75–2 MiB de attachments RGBA8+depth24 (estimación, no medida de VRAM).

## Hallazgo de aislamiento

El primer ensayo incorporaba proxies de chunks de la partida preparada al render de carga mediante installAssetShadows: 23 draws / 672812 triángulos con viento. Sus tiempos quedan invalidados en ../loading-shadow-20261021/INVALID-COMPARISON.md. Esta sesión QA retira ese hook antes de instalar las sombras del diorama; no regresa a gameplay. Una integración debe acotar el hook por escena y restaurar propietarios/recursos, no copiar esta desactivación permanente.

Sin errores JS, consola o WebGL en ambas ejecuciones finales. Capturas con `-ui` muestran interfaz real; PNG restantes son canvas. Interacción en JSON. Prueba después de preparar una partida, no durante arranque. Solo rutas QA, producción intacta.

## Reproducción y siguiente paso

Vite 5190. `node tools/experiments/capture-loading-shadow-20261021.mjs`, con WG_LOADING_VARIANT=shadow o garden. WG_LOADING_BENCH=1 añade ABBA únicamente en shadow. Reemplaza salidas de esa variante.

Recomendación: conservar sombras como candidata artística; optimizar el muestreo del receptor y comprobar estados de crecimiento, capacidad y transición a partida antes de integrarlas. Continúan pendientes el coste de carga real y la validación del conjunto global de biomas.
