> CORRECTION (2026-10-23): the fern QA call `resizeShadowMap(light, 4096)` actually selected 1024 because the API expects a quality name. Claims of a 4096 map in this report are incorrect. See `../holly-fern-shadow-actual2048-20261023/README.md`. Original measurements are retained.

# Sombras 10 Hz con camara movil

A: viento de sombra continuo. B: tiempo de sombra discretizado a10Hz. Color, geometria, densidad y animacion visible identicos. Ambas con mapa4096. Intel UHD,1280x720,media,escena poblada pausada,fondo completo,recorrido horizontal8m. A/B/A/B;60 warmup+90samples GPU y cadencia por separado.

|Fase|GPU A/B ms|Delta parejas ms|Cadencia A/B ms|
|---|---|---|---|
|day|23.08/24.99|+3.91/-0.10|30.58/30.77|
|night|26.33/25.42|-3.85/+2.03|32.05/32.84|

## Conclusion

No hay ahorro de actualizaciones de sombra al mover la camara: ambos tratamientos tienen cero hits y 304-305 dibujos entre calentamiento, medicion y transiciones. No atribuir variaciones de tiempo a reutilizacion que no existe. El shader de profundidad depende de la posicion de camara para LOD/fade y el contrato la registra, de modo que cualquier movimiento invalida. La seleccion de instancias tambien puede cambiar.

La tecnica10Hz es candidata limitada a camara fija, no solucion general. Conservar el aspecto artistico y el experimento; no promoverlo como optimizacion global. Para resolver movimiento hace falta una poblacion de casters conservadora y una deformacion/LOD de profundidad estable, o una capa de sombra separada cuyo coste se mida. Omitir la camara del contrato sin cambiar el shader produciria sombras obsoletas y no es valido.

720queries validas;sin errores GL/cambios de estado;repeticiones con mismos draws/triangulos;misma seleccion de instancias y trayectoria entre A/B. Noche/dia y timings completos en summary.json. No incluye campaÃƒÂ±a activa ni mapa1024.
