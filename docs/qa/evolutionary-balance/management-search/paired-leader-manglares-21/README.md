# Campaña pareada de 21 noches: censura técnica en Manglares

Configuración congelada: `config.json`, estrategia evolucionada y control `good-current-magic`, semilla 123, bioma Manglares, fuente `12784ea0b6296e40e6c862fae2d6589295011222`.

El primer caso completó 16 noches y devolvió `status: error` en la jornada 17 tras alcanzar el límite técnico de 2400 segundos simulados de incursión. No fue una derrota económica ni militar. Quedó un facóquero retirándose con tres golpes aún disponibles, sin ruta a la salida. El reporte y el snapshot parcial están en `evolved-manglares-123-21.json.gz` (SHA-256 `40185dd79f1063cb17df9c97584f1f7bca7aa10febaa6ace94320c0d231cb615`). Los datos hasta la noche 14 coincidieron con la campaña previa de 14 noches, pero no se debe extrapolar una victoria posterior.

El runner comenzó el control y se detuvo voluntariamente al diagnosticar el fallo; su `jsonl` contiene sólo dos jornadas y **no** constituye una comparación pareada. Se conserva el resultado negativo para reproducibilidad. La causa física y el arreglo experimental están documentados en la rama `codex/wild-engine-native-exit-connector` y su PR #48. La campaña debe repetirse completa con un nuevo hash de fuente después de incorporar ese arreglo al entorno de simulación.
