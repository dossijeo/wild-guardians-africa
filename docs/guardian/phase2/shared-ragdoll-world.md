# Colisiones entre ragdolls activos

## Cambio

Antes, cada animal activo tenía un mundo Rapier separado; por tanto, dos animales derribados no podían intercambiar contactos. El controlador ahora mantiene un mundo con hasta tres ragdolls. Cada animal tiene un grupo de colisión distinto que excluye sus propias piezas y permite contacto con los otros animales y el escenario. Los huesos vecinos conservan restricciones y límites anatómicos.

El solver avanza una vez por paso fijo compartido. Durante la recuperación los cuerpos de ese animal pasan a control cinemático y siguen sus huesos; se retiran al terminar de levantarse. El mundo se libera al salir el último actor. Un golpe durante la recuperación reutiliza el mundo y conserva la pose. No se ha trasladado el solver a un worker.

`BeastPhysicsEnvironment` comparte mosaicos de terreno de 8 m, muros y volúmenes sólidos. No duplica el suelo al admitir animales cercanos. Conserva los colisionadores mientras hacen falta y elimina los alejados en admisiones/retiradas. Los obstáculos destruidos durante una caída no se actualizan hasta esa sincronización; queda pendiente probar y mejorar ese caso.

## Pruebas

- Once pruebas del solver/rig pasan: cinco especies, contacto de piel, estabilidad, recuperación y nuevo choque de dos hienas lanzadas en sentidos opuestos. Se detectan contactos entre sus colisionadores, mantienen orden espacial y velocidades inferiores al límite de inestabilidad del ensayo. Reutilizar una plaza recupera su grupo de colisión.
- Siete pruebas del controlador pasan, incluida concurrencia (42 cuerpos en un único mundo), golpes durante recuperación, cuarta caída horneada y limpieza.
- Prueba de entorno: tres actores coincidentes comparten los mismos colisionadores; treinta encuentros separados no acumulan terreno; al vaciarlo no quedan colisionadores.
- La herramienta gráfica añade **Choque entre dos bestias**. Usa dos órdenes Attack reales con origen de prueba dirigido para enfrentar sus trayectorias; omite recarga únicamente en esta herramienta. No es evidencia del equilibrio normal de Attack.
- Inspección pausada desde dos ángulos: 28 cuerpos y un mundo durante la caída. [Captura](shared-ragdoll-contact.png).
- Ciclo continuo posterior: dos hienas, 8,0884 s simulados, 176 fotogramas, sin errores registrados; cero estados de derribo, cero cuerpos y cero mundos al acabar. [Recuperación](shared-ragdoll-recovered.png), [datos](shared-ragdoll-continuous.json).

## Rendimiento y límites

En Intel UHD a 1600×900, el ensayo continuo registró frametime p95 100 ms, p99 133,1 ms; CPU física p95 4,1 ms y máximo 12,4 ms; creación máxima 10,3 ms. No hubo compilación simultánea en este ensayo. Sigue sin ser una comparación A/B ni una aprobación de fluidez: falta aislar causas de los picos y medir una incursión representativa.

La caída horneada no participa todavía en este intercambio de fuerzas; tampoco los animales animados normalmente. Los que se levantan conservan ahora colisionadores cinemáticos que pueden desplazar a un ragdoll dinámico, pero su pose de recuperación no responde a fuerzas ni evita por sí sola obstáculos estáticos. No se declara resuelta toda la separación entre bestias. Falta la matriz gráfica de especies, masas, muros y pendientes y comprobar el coste de tres cuerpos articulados en contacto sostenido. Las capturas estáticas no acreditan por sí solas naturalidad de toda la transición.


Detalle de la conservación y seguimiento de cuerpos al levantarse: [recuperación con colisionadores](recovery-colliders.md).
