# Ondulaciones suaves con desgaste

No integrar: menos repeticion visible y poblado mas limpio, pero el aporte es demasiado pequeno en las camaras de campana. Conservar solo como ensayo, sin aprobar calidad ni presupuesto global.

## Evidencia

12 capturas de campana real, semilla 712, calidad media, camaras settlement/overview/low, dia 150 y noche 350. Las seis parejas coinciden en camara, objetivo, hora, dia, poblacion y calidad; cero errores HTTP/JavaScript en captura. Ver [auditoria](comparison-audit.json) y [registros](captures.json). Cero draw calls y triangulos adicionales. La diferencia de -7 texturas entre cargas independientes no demuestra ahorro: el piloto no crea ni elimina texturas.

[Antes dia](desierto-base-low-day.png) Â· [Despues dia](desierto-candidate-low-day.png) Â· [Antes noche](desierto-base-overview-night.png) Â· [Despues noche](desierto-candidate-overview-night.png).

## Rendimiento

Escena QA 26, misma pagina, ABBA por fase, 30 cuadros de calentamiento y 180 muestras por bloque. Es una escena estatica, no un benchmark temporal de campana.

| Fase | Base GPU ms | Candidato GPU ms | Diferencia |
|---|---:|---:|---:|
| day | 10.200 | 10.187 | -0.013 |
| night | 10.664 | 11.100 | +0.436 |

[Datos completos](paired.json). Hay deriva entre bloques; diferencias negativas no prueban aceleracion. El 404 de consola fue identificado en una recarga como /favicon.ico; no es un fallo del shader. Las respuestas de recursos observadas no presentan errores y los informes internos no registran errores de rendering ni cambios de simulacion.

## Alcance y limites

Solo modulo QA, sin cambios en runtime, simulacion, navegacion, balance, siluetas o atlas. Mallas residentes del Desierto; horizonte sin este detalle. El registro de materiales se intercepta despues de AfricanToon: el primer intento antes de ese registro fallaba por anclajes GLSL ausentes; fue corregido y las capturas finales se completaron. No se ha validado recorrido largo, continuidad al horizonte ni seis biomas; no promover estos pilotos. El siguiente pase debe evaluar las grandes bandas de sombreado y sombras con terreno fuera del poblado, conservando calidez y legibilidad.
