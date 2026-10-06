# Colisiones antes del terreno: propuesta descartada

Referencia congelada `8c07a45`, archivo ZIP y hashes de ambas versiones de Navigation en `provenance.json`. Se probó mover la comprobación de terreno de `testWalkable` después de sus colisiones con construcciones. La propuesta evita consultas de altura/fluidos cuando una construcción ya bloquea el punto; sigue consultando terreno antes de props.

No se incorpora al runtime: se restauró Navigation exactamente desde el archivo de referencia. La herramienta experimental prepara un candidato separado, exige un directorio nuevo y no modifica el repositorio del juego.

## Evidencia

- Cuatro pruebas dirigidas correctas con el candidato, con log comprimido: rechazo sin muestrear terreno en interiores de centros de las cinco culturas; ignorar un obstáculo sigue comprobando terreno; escudos ignorados por trabajadores no eliminan la restricción de terreno; comparaciones de bounds, tangencias, previews y rotaciones. Estas pruebas instrumentan el candidato; no acreditan todas las rutas nativas.
- Escenario integrado CPU: 32 cultivos, ocho trabajadores pagados mediante crédito QA explícito y cinco animales. Dos pares de calentamiento y ocho pares alternados en procesos Node separados.
- Cada proceso conserva 1.630 pasos, 146 búsquedas y trayectoria serializada completa SHA-256 `dcad397bf6e0b9cffbffac9da7fa696adfd60770d8d24d6d90fe4d8e018d07f9`.
- Mediana del tiempo completo: 3.303,53 → 3.256,93 ms. Mediana del mayor tick: 394,65 → 398,57 ms. La diferencia es pequeña y no acredita mejora de los picos; se descarta el cambio antes de ampliar validaciones/integrarlo.

## Reproducción y límites

Extraer con `git archive` la referencia (src, content, public/content, package.json, tools/check_opening.mjs y tools/check_integrated_load.mjs). Ejecutar `node tools/experiments/obstacle-first-walkability.mjs <referencia> <nuevo-directorio-candidato>`; `--prepare-only` prepara el candidato sin medir.

La preparación reproduce por hash el candidato evaluado. Tiempo total incluye arranque, serialización/hash y procesos de campaña activos en segundo plano. Solo el escenario integrado de Sabana; no mide GPU, FPS, móvil ni RAM, ni compara todas las culturas/biomas. La propuesta no se activa por una ganancia pequeña de tiempo total cuando los picos no mejoran de forma convincente.
