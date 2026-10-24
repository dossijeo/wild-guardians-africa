# Hierba fina: menos segmentos, coste todavía no aprobado

Se mantienen las 72 hojas y la distribución del piloto grass-fine. Cada hoja pasa de tres secciones triangulares a dos: 720 triángulos por mata frente a 1.152 (-37,5 %). Fuente propia Blender cerrada, cero bordes abiertos/no manifold, sin tarjetas ni texturas; GLB 68.840 bytes. No cambia ningún modelo original ni lógica de juego.

La cámara baja conserva una lectura muy parecida. Esta malla sustituye a la anterior como base de investigación, pero no se integra: reducir triángulos no asegura el presupuesto GPU. La siguiente prueba debe aislar el coste del material y conservar sombra, calidez y lectura nocturna.

## Evidencia visual y geometría

Ocho capturas, Sabana caso 1, semilla 712, calidad media, 1280 × 720 DPR 1, cámaras de juego/baja, día 150/noche 350. comparison.json comprueba cámaras/objetivos/horas iguales con la referencia sin hierba.

- [Antes](savanna-global-lighting-low-day.png) / [versión reducida](savanna-grass-fine-lite-low-day.png) / [malla anterior](../grass-fine/savanna-grass-fine-low-day.png)
- [Noche reducida](savanna-grass-fine-lite-game-night.png)

103 instancias en juego: +74.160 triángulos; 128 en baja: +92.160. Un draw y una geometría adicionales, cero texturas. Ahorro geométrico respecto al piloto: 44.496/55.296 triángulos en juego/baja. geometry-comparison.json contiene diferencias de imagen descriptivas; el reloj visual del agua no se bloqueó entre sesiones, por lo que no son una medida aislada de error geométrico ni una puntuación de calidad.

## Medición temporal

Misma página alternando visibilidad, todos los assets residentes, detalle original vacío. 180 frames medidos tras 30 de calentamiento por muestra. Cámara estable y simulación sin cambios en cada reporte. Solo coste incremental de render con cámara fija.

| Ronda | Base GPU ms | Candidato GPU ms | Delta |
| --- | ---: | ---: | ---: |
| Día ABBA | 18,222 | 19,212 | +0,990 |
| Noche ABBA | 19,481 | 19,618 | +0,137 |
| Día BAAB | 19,770 | 19,296 | -0,474 |
| Noche BAAB | 18,876 | 19,792 | +0,916 |

Variación temporal considerable, incluyendo 2 ms entre referencias diurnas de la primera ronda. No interpretar el valor negativo como aceleración; dos fases exceden +0,5 ms. Se conservan reportes CPU/GPU crudos y dispositivo en paired.json y paired-baab.json. No aprobar ni integrar esta versión basándose en la reducción geométrica.

## Límites y reproducción

Solo Sabana. Distribución QA residente sobre 2.267 candidatos, límite 128, sin streaming/actualización de ocupación ni transición de distancia. Referencia y benchmarks registraron un 404 sin URL identificada; capturas del candidato sin errores registrados. No se afirma sesión libre de errores.

Generador tools/experiments/blender-grass-fine-lite.py. Ejecutar WG_MATERIAL_STUDY=grass-fine-lite con node tools/experiments/capture-material-study.mjs o node tools/experiments/benchmark-grass-study.mjs sobre servidor 5190; WG_PAIR_ORDER=1,0,0,1 para BAAB y WG_PAIR_OUTPUT para conservar ambos archivos. Ninguna modificación runtime.
