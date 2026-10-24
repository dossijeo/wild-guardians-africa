# Charcas: transición cromática de orilla, estudio QA

Este estudio no modifica el juego por defecto ni añade un flag runtime. `qa-pond-bank-gradient.js` se aplica solo desde los scripts QA a las charcas de Sabana ya residentes; Gran Río permanece intacto. No hay cambios de simulación, contorno, posición de vértices ni triángulos.

## Hipótesis artística y lectura

El agua existente ya tiene reflexión, Fresnel, sombras e iluminación nocturna. El déficit no era ausencia de esos efectos: su color casi uniforme junto al borde separa demasiado el plano cian del terreno. Se prueba una mezcla discreta hacia verde terroso en la orilla, conservando el color central y la iluminación existente. La máscara interpolada procede del centro y contorno del abanico original: es una **coordenada artística de proximidad al borde, no profundidad física**.

Las 16 capturas reales comparan dos cámaras y día/noche en Sabana y Gran Río. En la vista alta el borde se integra algo mejor con la arena; en la baja el cambio es tenue porque domina la reflexión. La noche conserva legibilidad y no aparece un aro luminoso. Es una mejora pequeña y localizada, muy lejos de resolver la calidad global o reproducir el mockup. La máscara puede variar de anchura en un polígono irregular y no representa una pendiente submarina. No se generaliza a ríos, manglares ni otras geometrías.

## Recursos y límites del prototipo

Se detectaron siete instancias de la charca, cada una con un abanico de 42 vértices. Comparten una geometría derivada y conservan siete materiales como sus fuentes. La coordenada nueva añade 168 bytes; el clon QA conserva además posición/normal (1.008 bytes). El contador de geometrías aumenta en uno porque el original queda retenido. No se añade ninguna textura ni draw: Sabana conserva 86 draws / 1.267.265 triángulos en cámara de juego; el control Gran Río 84 / 746.779. Los contadores varían con el encuadre, pero coinciden por pareja.

No hay descarga de arte nueva: solo el pequeño módulo de experimento y el programa shader derivado. Estas cifras no son una medición de VRAM total. La variante conserva los materiales originales en memoria durante la prueba; una eventual implementación debe administrar propiedad y liberación correctamente, además de aplicar el efecto a chunks que entren después. **No es todavía una implementación de streaming lista para integrar.**

`captures.json` registra cámaras/horas, recursos y errores de shader/navegador (ninguno). `mesh-audit.json` registra la selección geométrica. La superficie no se subdivide ni se añaden capas transparentes. La prueba mantiene la receta de luz, brillo, sombra y Fresnel originales; solo sustituye el color base cerca del borde.

## Reproducción

Con Vite en 5189: `node tools/experiments/capture-pond-bank-gradient.mjs`. El parámetro `visualLab=pond-bank-gradient` por sí solo no activa el estudio: lo instala el script QA después de cargar la escena. La comparación utiliza perfil media, 1280×720 y los mismos casos 1/6 del laboratorio.

La ABBA usa `benchmark-pond-bank-gradient.mjs`, `WG_ABBA_VARIANTS=0,pond-bank-gradient,pond-bank-gradient,0`, `WG_ABBA_CASES=1,6`, `WG_ABBA_RAW=1`, `WG_ABBA_OUTPUT=docs/qa/global-visual-lab/pond-bank-gradient/abba.json` y `WG_QA_URL=http://127.0.0.1:5189`. El reporte crudo conserva cada corrida, cámaras y muestras GPU.

## ABBA aislada y decisión

Host reservado y sin campañas locales concurrentes. Medias de dos corridas por brazo, 180 muestras GPU por corrida; cámaras estables, temporizadores válidos y sin errores. El benchmark añade su propio draw/triángulo a los contadores de las capturas.

| Bioma/hora | GPU A → B (ms) | CPU envío A → B (ms) |
|---|---:|---:|
| Sabana día | 18,358 → 18,320 | 5,348 → 5,174 |
| Sabana noche | 18,912 → 19,110 | 4,827 → 4,721 |
| Gran Río día, control | 14,657 → 15,097 | 5,958 → 5,978 |
| Gran Río noche, control | 15,563 → 15,444 | 5,820 → 5,483 |

La diferencia nocturna de Sabana es +0,199 ms. El control sin cambios varía +0,440 ms de día y −0,119 de noche: esta muestra corta no permite atribuir una mejora o regresión pequeña al shader. No aparece una diferencia del tamaño de la regresión del ensayo de matas, pero tampoco se demuestra coste cero. No se descuentan los tiempos del control como si fueran una calibración exacta.

**Conservar como estudio QA, sin adopción ni generalización.** Merece retomar una integración de orilla discreta, pero primero necesita una mejora visual más convincente a distancia normal, una máscara cuya anchura no dependa del abanico y gestión correcta de residencia/liberación. La versión anterior permanece por defecto. Los tres scripts pasan comprobación sintáctica; las capturas compilan y ejecutan el shader real. No hay cambios runtime posteriores al build correcto del checkpoint dd3da8b4.
