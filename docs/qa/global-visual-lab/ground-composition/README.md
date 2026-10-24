# Claros de arena en Sabana: descartado por dirección artística

Ensayo posterior a `dd3da8b4`, sin modificar código runtime, configuración ni archivos originales. El script de captura sustituye las tres respuestas de textura únicamente para Sabana y `ground-composition`; Gran Río recibe sus fuentes originales. Los archivos de este ensayo permanecen en documentación, fuera del paquete público del juego.

## Hipótesis y resultado

Se buscó reducir el tapiz uniforme de paja mediante zonas tranquilas, conservando tres mapas de 1024², el shader y la geometría. Tres curvas Bézier editables en Blender componen claros asimétricos; la base de arena existente se adapta en color, se mezcla con su normal y con ARH neutro, y la normal resultante se renormaliza. La máscara solo existe durante la autoría offline. No se añade ruido ni un sampler en ejecución.

**El resultado no mejora suficientemente.** En `savanna-ground-composition-game-day.png` los claros del primer plano parecen recortes ovalados y su repetición crea manchas claras ajenas a las masas de vegetación y caminos. La pequeña suavización de borde no integra la transición entre paja y arena. Por la noche el contraste baja, pero no aparece una composición más convincente. No basta con colorear tres islas suaves sobre una fuente fotográfica: faltan transiciones que sigan tallos y acumulaciones, y una organización a escala del terreno. No se presentan como suelo acabado ni como paridad con los mockups.

Se conserva el sistema anterior. No se retoca a ciegas la intensidad ni se integra un flag nuevo en el runtime. Una revisión futura necesitaría autoría de bordes y distribución espacial; este ensayo no justifica ampliar coste ni generalizar a otros biomas.

## Evidencia y coste

16 capturas WebGL reales: dos biomas, dos variantes, cámaras de juego y baja, día/noche. [`captures.json`](./captures.json) conserva cámaras, objetivos, horas y contadores; [`comparison.json`](./comparison.json) verifica igualdad de cámaras y recursos en los ocho pares. No son renders Blender.

- Sabana, cámara de juego: 86 draws y 1.267.265 triángulos en ambos brazos.
- Gran Río, cámara de juego: 84 draws y 746.779 triángulos en ambos brazos.
- Recuento de texturas idéntico dentro de cada par (73–75 según momento de carga/cámara); no se interpreta como VRAM medida.
- Tres mapas RGBA8 1024² con mipmaps: estimación de 16.777.212 bytes por tripleta, igual en ambos. Las originales se sustituyen, no se cargan además.
- Fuentes comprimidas: 4.724.867 bytes; exportación PNG del ensayo: 6.669.930 bytes (+1.945.063). La base original usa WebP y la candidata PNG, por lo que no es una comparación con compresión equivalente. No se optimizó un resultado ya rechazado.
- **No se ejecutó otra ABBA CPU/GPU:** el ensayo falla primero la evaluación visual. Igualdad de contadores no demuestra igualdad de tiempo GPU. La regresión nocturna del ensayo anterior no se traslada a este sin medir.

El control Gran Río usa los mismos archivos originales; ambas cámaras y horas coinciden. No se declara identidad píxel a píxel, debido a elementos animados. No hay cambios de simulación, vegetación, vecinos ni silueta.

## Reproducción

`blender --background --python tools/experiments/blender-savanna-ground-composition.py` conserva las curvas en `ground-composition.blend`, la máscara y los tres mapas. Con Vite en 5189, ejecutar `node tools/experiments/capture-ground-composition.mjs`. El parámetro del navegador por sí solo no activa una variante: requiere la sustitución de respuestas del script QA.

No se añadieron pruebas de lógica para esta autoría offline. El checkpoint runtime anterior pasó 4/4 pruebas dirigidas y build; este estudio solo añade herramientas y evidencia. Se verificó la ejecución completa Blender/WebGL y la sintaxis del script de captura.
