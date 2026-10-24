# Luz gradual del Desierto: candidato conservado

Se conserva el suavizado de la rampa de luz del terreno. Las cuatro bandas discretas creaban cortes de color que se confundian con cambios de material o altura. Tres transiciones smoothstep conservan los extremos oscuros/claros y una lectura estilizada, con mejor continuidad sobre las dunas. La rampa de relleno de tres niveles se suaviza tambien. No se cambia la paleta, geometria, siluetas, normales, intensidad nocturna ni reglas.

## Comparacion visual

24 capturas de campana, semilla 712, calidad media, dia 150/noche 350, tres camaras. Doce parejas verificadas en dos posiciones: poblado y objetivo desplazado +50/+30 m hacia las dunas. Poblacion, camara, objetivo, hora y calidad coinciden; cero errores de captura. Auditorias en comparison-audit.json y dunes/comparison-audit.json.

- Poblado: [antes](desierto-base-overview-day.png), [despues](desierto-candidate-overview-day.png).
- Dunas: [antes](dunes/desierto-base-overview-day.png), [despues](dunes/desierto-candidate-overview-day.png).
- Noche: [antes](desierto-base-overview-night.png), [despues](desierto-candidate-overview-night.png).

El resultado conserva calidez y mejora las transiciones de sombra. No equivale al mockup: falta microtextura convincente, vegetacion y volumen mas rico en otras regiones.

## Rendimiento

ABBA en la misma pagina de la escena QA 26, 30 cuadros de calentamiento y 180 muestras por bloque, ocho bloques. Incluye terreno y horizonte en ambos programas. No es un benchmark temporal de campana.

| Fase | Base GPU ms | Candidato GPU ms | Diferencia |
|---|---:|---:|---:|
| Dia | 10.043 | 10.056 | +0.014 |
| Noche | 10.907 | 11.020 | +0.113 |

Ver paired.json para muestras, CPU, contadores y deriva. No es evidencia de coste cero ni aprobacion del presupuesto global. No se anaden texturas ni geometria. El 404 de consola de esta escena corresponde al favicon ausente, identificado en el pase anterior.

## Reproduccion

WG_GRASS_STUDY=desert-soft-light, WG_GRASS_BIOMES=desierto, ejecutar capture-campaign-grass.mjs. WG_CAMPAIGN_TARGET_OFFSET=50,30 reproduce las dunas. El helper desactiva la integracion al capturar este piloto para evitar doble aplicacion. Para benchmarking usar benchmark-material-study.mjs con WG_MATERIAL_STUDY=desert-soft-light y WG_PAIR_CASES=26.

La integracion y controles de seis biomas estan documentados en ../desert-light-integrated/README.md. Ninguno de los pilotos anteriores de grano/franjas se combina con este cambio.
