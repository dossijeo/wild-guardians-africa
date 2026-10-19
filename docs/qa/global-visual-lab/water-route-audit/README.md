# Diagnóstico de la ruta de agua

Sabana, semilla 712, calidad media, 1280×720, hora 150. El diagnóstico fuerza un render después de cada modificación: la fixture no anima continuamente por defecto. La primera ejecución sin redibujar no era evidencia válida y fue reemplazada.

`diagnostic-fluid.png` pinta magenta las superficies procedurales: cubren la charca visible. `hidden-fluid.png` las oculta y expone el fondo/orilla del asset y un hueco central. Por tanto se descarta la hipótesis de que otro plano opaque el agua procedural. No modificar mallas ni elevar superficies para resolverla.

El raycast alcanza la superficie procedural de asset a y=9,52995, por encima del terreno y=9,08495; hay dos instancias recortadas por chunks, por lo que dos intersecciones no demuestran doble dibujo del mismo píxel. La materialización actual sí funciona; la apariencia plana requiere revisar la escala de normales y el material. Doce mallas de fluido detectadas, sin errores JS en el diagnóstico. Esto no es un test de rendimiento ni una modificación del juego.
