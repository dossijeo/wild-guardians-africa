# Manglares: revisión del encuentro con el suelo lejano

Revisión de evidencia existente, sin nueva ejecución ni cambios al renderer.
Referencia de código al revisar: eb93a72bd. Las capturas son anteriores a ese
commit; no se presentan como capturas nuevas del HEAD.

Se inspeccionaron individualmente a 1280×720 day-4.png y night-4.png de
manglares-resident-mask-low. La captura conserva una cubierta densa de helechos,
árboles y suelo hasta el fondo. No se identifica en estas dos vistas una pared
rayada elevada comparable a la que motivó groundStep=16 en Sabana y Gran Río.
No es una demostración de ausencia de juntas en todas las posiciones.

Decisión: conservar la precisión actual de Manglares. No generalizar el aumento
de geometría de los otros biomas sin aislar antes un defecto visible.
La caché fixed512 y los helechos holly aparecen en las URLs originales de ambas
fases; no se modifica su receta ni se reduce su densidad.

La telemetría original registra calidad baja, semilla 712, simulación activa y
recorrido de ida/vuelta de 40 segundos por fase. Las fases tienen 1295/1051
observaciones, sin errores registrados y con finalGlError=0. El verificador de
trayectoria archivado indica cero frames desviados. La noche continúa el estado
diurno. Estos recuentos tienen sobrecoste de grabación y no son benchmarks FPS.

Limitaciones: esta inspección no valida el perfil medio con sombras solares,
ni todas las vistas intermedias, ni cambios de calidad o sesiones prolongadas.
El agua del fondo no se ha aislado mediante ocultación de mallas en este pase;
no se clasifica una región azul como hueco de terreno solo por su color.
El cierre global de seis biomas sigue pendiente de una síntesis de evidencia
con alcance y condiciones homogéneos.

## Fuentes inspeccionadas y huellas SHA-256

- `manglares-resident-mask-low/day-4.png`: `26310eadb0950a1338ee77a90ffd90758367c7845ca1f445a28708558e54bd2a`
- `manglares-resident-mask-low/night-4.png`: `a0f1ebb18b4eb4907aa4ec7246c4329693cd5a2040c9af1b09552988970e6004`
- `manglares-resident-mask-low/active-play.json`: `674e7ae4847a6b1b29278a57c2d4df6ca917990a466f7dc045d721a0e1ee6a3f`
- `manglares-resident-mask-low/summary.json`: `283eaba2d571f2c971cb63c6893520633ecfe712334019c21e097e479b9b4d8f`
- `manglares-resident-mask-low/path-check.json`: `b7c70b71ccac00f78545cda698e380a744a1c4751e81dc564e6562c1670cc512`
