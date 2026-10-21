# Manglares: deformación suave de coordenadas

QA media,seed712,1280x720,tres poses,día/noche. Control conserva Moss002/substrato aprobado. Candidata desplaza UV mediante dos ondas suaves en coordenadas globales del mundo, antes de derivadas y muestreos de color/normal/ARH. Máscaras de cobertura siguen en coordenadas originales. No modifica assets, geometría, siluetas ni simulación. Seis parejas comparables con cámara,hora,draw calls y triángulos iguales; sin errores WebGL.

Evaluación de la lámina día0: el volumen y paleta se conservan, pero las filas regulares siguen siendo reconocibles y ahora se curvan. El patrón de bultos repetido no se convierte en agrupaciones naturales como en la referencia. No se promueve esta variante ni se sustituye la actual. Se documenta por insuficiencia artística, no por rendimiento. No procede un benchmark largo de una solución que no supera el criterio visual.

Coste estructural: sin texturas, pasadas ni lecturas de textura añadidas; dos sin y operaciones vectoriales por fragmento en rama pureMoss. No hay tiempos GPU/CPU medidos y no afirmar coste cero. La normal se muestrea en UV desplazadas, pero su base tangente no incorpora el Jacobiano de la deformación; otra limitación antes de aceptar iluminación físicamente coherente. La máscara de mezcla por altura también cambia localmente al cambiar los detalles muestreados.

Siguiente investigación: variación espacial de orientación/muestreo con mezcla sin costuras, aplicando correctamente la transformación a normales. Debe conservar el relieve y color del musgo querido, evitar desenfoque y validar coste real si mejora visualmente. Variante original conservada; no cambios de producción.

Reproducir Vite5190: `node tools/experiments/capture-mangrove-uv-warp.mjs`; `python tools/experiments/package-mangrove-uv-warp.py`. Capturas sin rendimiento, MAE describe diferencia, no calidad. Control izquierda/candidata derecha.
