# Estratificación y normales de pared — descartado

Ocho capturas reales de Cañón, semilla 712, dos cámaras, día/noche. Referencia: opción global-lighting con sombras de relieve. El ensayo introduce deformación suave de las bandas, compresión de paleta y perturbación de normales por derivadas sobre paredes; no cambia geometría ni siluetas, ni añade texturas.

No adoptar. La vista amplia sigue leyendo bandas pintadas y el primer plano presenta discontinuidades trianguladas más visibles, incluyendo zonas con apariencia de arena sobre la pared. La sombra continua de la ribera tampoco conserva la lectura de la referencia. No se atribuye ese resultado a una mejora de erosión o volumen. La vista baja no aporta detalle geológico convincente. No trasladar el parche al renderer ni corregirlo con un barrido de intensidades.

Los contadores y errores están en captures.json. No se ejecuta benchmark GPU de un resultado artísticamente rechazado. La ganancia de volumen de las sombras se mantiene en la opción integrada, sin esta perturbación de normales.
