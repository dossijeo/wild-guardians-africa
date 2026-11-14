# Apoyo de los cascos del facóquero

Corrección localizada de Walking sobre el modelo activo 53c8f76ba3af3c972206a86e9fb4c9c25be3bb890077caa99c9c0b1bc3240b89.glb.

La suela original conserva aproximadamente 45° (izquierda) y 37° (derecha) de inclinación durante la marcha. El ajuste vertical anterior y su prueba utilizaban los vértices más bajos del talón, que forman una línea horizontal aunque el resto del casco esté levantado.

La corrección toma una cara amplia de cada suela, expresa su normal en el espacio del hueso y orienta el pie de apoyo hacia el suelo. Se desvanece suavemente cuando ese pie se eleva entre 3,5 y 14 cm respecto al otro. Conserva posiciones de tobillos, rodillas y cadera, y la articulación del pie durante el vuelo. El ajuste vertical existente vuelve a evaluarse después. Solo afecta a Walking del facóquero; Running, ataques y ragdoll conservan sus poses. No modifica el GLB original.

La calibración usa índices de vértices de este asset concreto: revisarla si se cambia su topología. Dos huesos y temporales reutilizados; no añade geometría, materiales ni draw calls. No se ha realizado una comparativa de FPS en esta corrección.

## Validación

- GLB real, 120 fases: al menos la suela de apoyo queda horizontal; el pie elevado conserva inclinación.
- Repetición del mismo fotograma: sin acumulación de rotación.
- Cambio a ataque: sin corrección de suela en esa pose.
- Prueba existente actualizada: distancia al suelo medida con todos los vértices rígidos del casco, separada de la comprobación de orientación. Los biseles sobresalen ligeramente respecto al plano amplio de la suela.
- Escena real WorldScene, sabana, semilla 712: inspección lateral izquierda/derecha en fases 0,2 y 0,7 y reproducción continua desde los controles visibles.
- Capturas: left-swing.png y right-support.png.

La escena incorpora selección de fase, cámaras a altura de cascos y reproducción/pausa. Abrir /tests/browser/beast-replacement.html?species=warthog&biome=sabana.

Limitación: orienta el apoyo al plano horizontal del actor. No incorpora IK independiente para adaptar cada pie a pendientes o escalones; no se declara validada esa matriz de terreno.
