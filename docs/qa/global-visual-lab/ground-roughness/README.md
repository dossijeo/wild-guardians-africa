# Rugosidad del terreno: mejora conservada en global-lighting

En Sabana y Gran Río, el suelo producía reflejos blanquecinos amplios a contraluz que ocultaban color y fibras. El canal de rugosidad del atlas compartido tiene media 0,528 y el 55 % de píxeles bajo 128/255 (roughness-map-audit.json, con hashes). Esta observación motivó el ensayo; no demuestra que el atlas original esté mal empaquetado.

Se eleva a 0,86 el mínimo de rugosidad del suelo mapeado de Sabana, Gran Río y Cañón. Se conservan albedo, normales, oclusión, parallax y geometría. El terreno queda más mate, mantiene la calidez y se distingue mejor bajo el contraluz. Cañón recibe una corrección más sutil en el suelo. Musgo, roca volcánica y Desierto permanecen fuera. No cambia agua ni materiales de edificios/vegetación.

## Evidencia

72 capturas QA, seis biomas, cámaras de juego/baja/lateral, día 150 y noche 350, semilla 712, media, 1280 × 720 DPR 1. comparison.json verifica 36 parejas con cámara/objetivo/hora iguales.

- [Sabana antes](savanna-global-lighting-side-day.png) / [después](savanna-ground-roughness-side-day.png)
- [Gran Río antes](grand-river-global-lighting-side-day.png) / [después](grand-river-ground-roughness-side-day.png)
- [Cañón antes](canyon-global-lighting-side-day.png) / [después](canyon-ground-roughness-side-day.png)
- [Integración, campaña y streaming](../roughness-integrated/README.md)

Todas las parejas: +0 draw calls, +0 triángulos, +0 texturas. El contador de geometrías de Gran Río varió en -6 entre cargas: no es ahorro del parche ni prueba de ausencia de fugas. Doce registros QA contienen un error de recurso 404 sin URL identificada, conservado. No se afirma sesión completa libre de errores.

## GPU lateral

Misma página, alternancia ABBA de shaders, 180 frames tras 30 de calentamiento por muestra. Cámara estable y simulación sin cambios en todos los reportes. Solo coste incremental del ajuste, no de toda la opción global-lighting.

| Bioma/fase | Base ms | Candidato ms | Delta ms |
| --- | ---: | ---: | ---: |
| Sabana día | 21,330 | 21,710 | +0,380 |
| Sabana noche | 20,628 | 20,671 | +0,043 |
| Gran Río día | 16,135 | 16,249 | +0,113 |
| Gran Río noche | 16,269 | 16,060 | -0,210 |
| Cañón día | 16,427 | 15,950 | -0,476 |
| Cañón noche ABBA | 16,048 | 16,896 | +0,848 |
| Cañón noche BAAB | 16,144 | 15,855 | -0,289 |

La primera noche de Cañón supera +0,5 ms; sus dos muestras candidatas difieren casi 2 ms. El salto no se repite al invertir el orden. No afirmar aceleración ni ausencia garantizada de coste: conservar esta incertidumbre y mantener la mejora como opción experimental. Datos crudos CPU/GPU, temporizadores y dispositivo en paired-side.json y paired-canyon-baab.json. Se acepta aquí una mejora visual clara con evidencia de coste variable, no una aprobación global de rendimiento.

## Reproducción

Servidor 5190, WG_MATERIAL_STUDY=ground-roughness con capture-material-study.mjs. WG_PAIR_CASES=1,6,21 y WG_PAIR_VIEW=side con benchmark-material-study.mjs. WG_PAIR_PHASES=night, WG_PAIR_ORDER=1,0,0,1 y WG_PAIR_OUTPUT permiten repetir sin sobrescribir. roughness-qa-route.mjs desactiva solo la llamada integrada para reproducir la referencia anterior; falla si desaparece su ancla. Los scripts están en tools/experiments.
