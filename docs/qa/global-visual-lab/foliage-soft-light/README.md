# Transiciones suaves en follaje nativo

Descartado. Ensancha las transiciones de luz media/alta a 0,18/0,16 exclusivamente en pixeles de follaje de materiales nativos tipo 1. Conserva normales, colores base, geometria y sombras proyectadas. No mejora claramente el volumen de las copas; cambia algunos limites de luz, con aporte pequeno a escala de juego.

24 capturas de campana en Sabana, Gran Rio y Manglares, dia/noche, camaras overview/low fuera del poblado (objetivo +50/+30 m). Semilla 712 y calidad media. Las doce parejas coinciden en camara, objetivo, hora, dia, entidades y calidad; cero errores de captura. Auditoria en comparison-audit.json. No crea recursos ni anade geometria. Las variaciones de texturas entre cargas no son ahorro atribuible al piloto.

[Sabana antes](sabana-base-low-day.png) / [despues](sabana-candidate-low-day.png). [Rio antes](gran-rio-base-overview-day.png) / [despues](gran-rio-candidate-overview-day.png). [Manglares antes](manglares-base-low-day.png) / [despues](manglares-candidate-low-day.png).

## Rendimiento

ABBA en misma pagina de fixture, 30 cuadros de calentamiento y 180 muestras por bloque; 24 bloques. El selector del benchmark incluye materiales nativos de vegetacion, no los del terreno. No es un benchmark de campana en movimiento.

| Caso | Fase | Base GPU ms | Candidato GPU ms | Diferencia |
|---|---|---:|---:|---:|
| 1 | day | 16.542 | 17.108 | +0.566 |
| 1 | night | 17.591 | 18.020 | +0.429 |
| 6 | day | 13.442 | 13.159 | -0.284 |
| 6 | night | 13.935 | 14.187 | +0.252 |
| 11 | day | 16.830 | 16.508 | -0.322 |
| 11 | night | 18.021 | 16.762 | -1.259 |

Hay deriva, especialmente Manglares nocturno: una diferencia negativa grande no demuestra aceleracion. Sabana diurna supera +0,5 ms. Datos crudos en paired.json; el 404 inicial corresponde al favicon de la fixture ya identificado. Sin cambios de simulacion en los informes.

## Limites y decision

No integrar. No extrapolar a los otros tres biomas. La camara baja de Rio queda parcialmente obstruida por una planta; usar la vista general para evaluar ese bioma. Las vistas fuera del poblado muestran masas nativas densas: el claro de aldea no debe ser el unico encuadre para diagnosticar cobertura. Mantener ambos en las siguientes evaluaciones.

No se modifican siluetas, simulacion, navegacion, balance ni atlas. Reproducir con WG_GRASS_STUDY=foliage-soft-light, WG_CAMPAIGN_TARGET_OFFSET=50,30 y capture-campaign-grass.mjs. Benchmark con WG_MATERIAL_STUDY=foliage-soft-light, WG_PAIR_CASES=1,6,11 y benchmark-material-study.mjs.
