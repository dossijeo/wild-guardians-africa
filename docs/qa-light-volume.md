# Selección de props contra el volumen de luz

Publicado `c8d4675`: los lotes globales y las excepciones de recorte incluyen
únicamente chunks cuya envolvente intersecta el frustum de la luz direccional.
La selección de color mantiene su frustum independiente. Se actualizan las
matrices globales de luz/target antes de seleccionar, fuera de la proyección
relativa; los buffers enviados siguen usando el origen móvil.

La envolvente conserva terreno y todos los modelos nativos de cada instancia,
incluido el LOD sólido de sombras aunque exceda los límites del LOD0. Supresiones
y cambios de props invalidan el cache de bounds existente. No se eliminan
casters simplemente por quedar fuera de la pantalla. Sin luz direccional válida,
o con agrupación desactivada, se conserva la ruta anterior.

## Pruebas

El test conserva un caster fuera de cámara pero dentro de la luz, descarta un
chunk remoto y sus excepciones recortadas, y cambia el foco de la luz sin cambiar
la selección de color. También prueba un LOD final artificialmente mayor y repite
la selección trasladando el conjunto a ±48 millones con buffers relativos.

[Suite completa](qa/light-volume/tests.txt): 637/637, sin fallos ni omitidas.
[Dirigidas](qa/light-volume/targeted.txt): 20/20, incluida la comprobación adicional
de traslación remota. [Build y paquete](qa/light-volume/build.txt): 554 archivos,
379,667,908 bytes, 794 enlaces relativos, 20 GLB runtime sin duplicados originales.

## Medición en navegador

Sabana/Mapungubwe/712, media, misma cámara, simulación detenida, 1600 × 900 internos,
viewport 1280 × 720, Intel UHD/ANGLE. 30 frames de calentamiento y 180 consultas
GPU válidas por muestra. Caché desactivada **solo para este diagnóstico**, con
sombras y PCF activos, para medir el trabajo cuando el mapa debe regenerarse.

| Selección | Chunks dentro/fuera | Triángulos de todos los pases/frame | GPU media (ms) |
| --- | --- | --- | --- |
| [Activada A1](qa/light-volume/on1.json) | 22/3 | 2,767,020 | 56.41 |
| [Desactivada B1](qa/light-volume/off1.json) | 25/0 | 2,837,376 | 57.69 |
| [Desactivada B2](qa/light-volume/off2.json) | 25/0 | 2,837,376 | 47.52 |
| [Activada A2](qa/light-volume/on2.json) | 22/3 | 2,767,020 | 49.63 |

Props de sombra: 791,625 → 721,269 triángulos; las cuatro muestras mantienen
275 calls y generan 210 mapas incluyendo calentamiento. El trabajo enviado baja
70,356 triángulos por mapa. Las medias GPU no demuestran un ahorro de tiempo:
hay mucha variación, y la suite Node corrió simultáneamente. No se promete FPS.

[Ensayo con caché activada](qa/light-volume/cached.json): 210 hits, cero mapas
regenerados, 111 calls y 1,560,185 triángulos/frame. Por tanto esta mejora no
ahorra esos 70,356 triángulos adicionales en frames que ya reutilizan el mapa.
Todas las muestras conservan simulación, pestaña visible y cero errores.

[Captura seleccionada](qa/light-volume/on.png) y [sin selección](qa/light-volume/off.png)
conservan las sombras observadas, pero no son idénticas: en la región (0,35)–(1280,680)
cambian 925 de 825,600 píxeles, diferencia máxima 38/255. Dos capturas sin cambiar
la selección también difieren en 1,800 píxeles, máximo 59/255. Se guardan ambos
resultados, sin atribuir su causa ni afirmar identidad exacta.

Esta vista no cubre todos los biomas/culturas, incursiones móviles ni hardware
móvil. La elección sigue siendo por chunk: puede conservar geometría individual
fuera de la luz dentro de un chunk cuya envolvente sí intersecta el volumen.
