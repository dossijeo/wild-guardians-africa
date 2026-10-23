# Coste aislado de sombras de helechos

A: mismos helechos sin proyectar sombras. B: proyectan sombras. Ambas variantes usan mapa solar 4096, mismas geometrías, instancias, materiales, cámara y semilla. No es una comparación con producción 1024. Intel UHD, campaña pausada, 1280x720, fondo completo, cámara móvil, viento determinista. A/B/A/B; 60 warmup + 90 muestras GPU y otra pasada de cadencia.

| Fase | GPU A / B ms | Deltas de las dos parejas | CPU A / B ms | Cadencia A / B ms |
|---|---|---|---|---|
| day | 21.31 / 26.17 | +4.33 / +5.40 | 7.93 / 9.66 | 27.22 / 34.64 |
| night | 23.10 / 24.30 | -1.05 / +3.44 | 7.96 / 9.45 | 30.59 / 32.34 |

Verificado: misma selección de instancias y trayectoria en todas las repeticiones. Las diferencias de triángulos/draws incluyen la pasada de sombra adicional. Auditoría y percentiles en summary.json. No sumar CPU y GPU. Dos parejas no eliminan deriva térmica ni variación del sistema; la campaña está pausada. Memoria GPU física y overdraw no medidos. La calidad visual sigue pendiente de alcanzar el mockup.

## Interpretacion tras corregir el contrato VFX

Dia: coste GPU adicional consistente de +4.33/+5.40 ms; cadencia media 27.22 -> 34.64 ms. Noche: -1.05/+3.44 ms, sin conclusion estable. No sumar CPU y GPU. Seleccion de instancias y trayectorias identicas; secuencias de draws/triangulos identicas entre repeticiones de cada variante. 720 queries validas.

Mecanismo observado: sin sombras de helechos, 38 dibujos y 266-267 aciertos durante las ventanas GPU/cadencia y sus transiciones; con ellas, 304 dibujos y cero aciertos. Ningun rechazo untracked. El viento invalida la sombra completa. Estos contadores incluyen calentamiento/transiciones, no solo los 90 frames medidos.

Conservar el candidato visual. Optimizar la frecuencia o separacion de la sombra de cobertura antes de promoverlo; no eliminar densidad ni descartar la apariencia por el coste de esta primera implementacion. El mapa 4096 compartido por ambos tratamientos sigue siendo diagnostico, no presupuesto aprobado para Intel UHD.
