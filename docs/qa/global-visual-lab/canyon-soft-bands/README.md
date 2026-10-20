# Franjas atenuadas sobre roca estratificada

20/10/2026. Candidato QA, todavia no integrado. Fuente [Cliff Side CC0](../canyon-stratified/SOURCE.md). Una textura de color, proyeccion dominante, sin mapa normal adicional. Conserva geometria y siluetas originales.

## Resultado artistico

Reducir la mezcla de franja ancha de 0,72 a 0,24 y de fina de 0,32 a 0,10 evita que las lineas claras dominen las fracturas. Las sombras y el naranja calido permanecen. Las terrazas aun muestran triangulos regulares y la repeticion de textura puede reconocerse; no se afirma equivalencia al mockup.

[Antes lateral](canyon-canyon-color-only-side-day.png) / [despues lateral](canyon-canyon-soft-bands-side-day.png). [Noche baja](canyon-canyon-soft-bands-low-night.png). [Juego](canyon-canyon-soft-bands-game-day.png).

Doce capturas finales, seis parejas con misma semilla 712, caso 21, calidad media, 1280 x 720, camaras/objetivos/horas 150/350 iguales. comparison.json no encuentra diferencias en draws, triangulos, geometria o texturas respecto a color solo. El candidato requiere una textura frente a global-lighting sin roca. Binding de terreno y horizonte heredado del piloto dominante.

## Error de anclaje documentado

inactive-anchor/ conserva doce capturas del primer intento. El codigo fuente contiene dos expresiones iguales: replace cambio solo la funcion antigua y no produjo el efecto pretendido. Se corrigio con replaceAll para alcanzar ambas funciones. No considerar ese primer intento una prueba artistica ni atribuirle la mejora. El candidato final se volvio a capturar y medir.

## Coste y siguiente paso

ABBA lateral en misma pagina frente a global-lighting SIN roca, 180 muestras/30 calentamiento por tramo. paired.json conserva datos completos. GPU dia 15,929 -> 15,863 ms (-0,066), noche 17,531 -> 17,992 (+0,461). La base diurna varia 15,102 a 16,755 ms; no interpretar el delta negativo como aceleracion. Resultado dentro de +0,5 ms en esta ronda, sin invalidar las rondas anteriores de mayor coste. Un 404 sin URL se registra en base/benchmark; ninguna excepcion de shader registrada.

Recomendacion: conservar esta direccion para prueba en campana real y mas angulos/semillas, seguida de integracion del recurso compartido y su ciclo de vida si la evidencia se mantiene. No promover aun al comportamiento por defecto ni declarar calidad global alcanzada. La comparacion artistica usa color solo como base; la temporal usa global-lighting, son preguntas diferentes.

Reproduccion: WG_MATERIAL_STUDY=canyon-soft-bands y WG_STUDY_BASELINE=canyon-color-only para capture-material-study.mjs; summarize-ground-frequency.py canyon-soft-bands canyon-color-only. Benchmark-material-study.mjs con WG_PAIR_CASES=21, WG_PAIR_VIEW=side.
