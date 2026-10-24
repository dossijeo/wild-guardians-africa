# Normales existentes amplificadas

Descartado: el mapa contiene grano fino, no ondulaciones de arena. Aumentarlo de .010 a .28 aporta motas sin resolver el volumen amplio.

## Evidencia

12 capturas de campana real, semilla 712, calidad media, camaras settlement/overview/low, dia 150 y noche 350. Las seis parejas coinciden en camara, objetivo, hora, dia, poblacion y calidad; cero errores HTTP/JavaScript en captura. Ver [auditoria](comparison-audit.json) y [registros](captures.json). Cero draw calls y triangulos adicionales. La diferencia de -7 texturas entre cargas independientes no demuestra ahorro: el piloto no crea ni elimina texturas.

[Antes dia](desierto-base-low-day.png) · [Despues dia](desierto-candidate-low-day.png) · [Antes noche](desierto-base-overview-night.png) · [Despues noche](desierto-candidate-overview-night.png).

Sin medicion temporal: descartado visualmente antes de esa puerta.

## Alcance y limites

Solo modulo QA, sin cambios en runtime, simulacion, navegacion, balance, siluetas o atlas. Mallas residentes del Desierto; horizonte sin este detalle. El registro de materiales se intercepta despues de AfricanToon: el primer intento antes de ese registro fallaba por anclajes GLSL ausentes; fue corregido y las capturas finales se completaron. No se ha validado recorrido largo, continuidad al horizonte ni seis biomas; no promover estos pilotos. El siguiente pase debe evaluar las grandes bandas de sombreado y sombras con terreno fuera del poblado, conservando calidez y legibilidad.
