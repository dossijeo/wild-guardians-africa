# Islas de hierba visible — prueba artística descartada

Mata propia preparada en Blender: 18 hojas volumétricas cerradas, 180 triángulos, un material con colores de vértice, sin texturas ni planos cruzados. GLB de 17.780 bytes. Fuente y generador incluidos, sin assets externos. No se cambian siluetas originales.

La distribución forma grupos de cinco alrededor de posiciones estables y respeta agua, pendiente, desgaste y exclusiones de ocupación. Se filtran 2.267 candidatos por frustum y distancia, con máximo 384 instancias visibles. La cámara normal envía 103 matas: +18.540 triángulos y +1 draw; la baja, 146 matas: +26.280 triángulos y +1 draw. Frente a los +151.140 triángulos del cojín anterior, el presupuesto se concentra en lo visible. No equivale a una medición de velocidad GPU.

Ocho capturas del renderer real, semilla 712, cámara normal/baja, día/noche y calidad media. Las parejas conservan cámara y hora. La mata aparece ahora en la vista de juego, pero lee como tallos angulosos dispersos, no como la masa fina y suave del mockup. La distribución añade grupos demasiado evidentes sin resolver el tapiz plano. No adoptar ni aumentar densidad. No hay benchmark GPU de esta propuesta artísticamente descartada.

La prueba es una instantánea de chunks residentes; no implementa actualización de ocupación ni streaming, y el corte por distancia es brusco. Después de capturar se corrigió el cálculo de visibilidad para aplicar la matriz global de la malla cuando se recentra el origen; las capturas originales se realizaron con origen cero. No se presenta como validación de movimiento o recentering. Un 404 de primera carga sin URL identificada aparece en la referencia; no hay errores registrados en el candidato.

La siguiente propuesta vegetal necesita otra forma de hoja y composición, no un barrido de tamaños de esta malla. El culling demuestra ahorro de geometría enviada, pero no rescata su dirección artística.
