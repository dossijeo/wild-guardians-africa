# Caídas físicas horneadas para saturación del presupuesto

Estado: recursos y reproductor preparados; todavía no conectados a los impactos del juego ni aprobados visualmente.

`node tools/guardian/bake_ragdoll_fallback.mjs public/content/guardian/ragdoll-fallback`

Genera quince caídas desde los cinco modelos actuales: frontal, lateral y descendente. Se usa el mismo solver articulado, masas, límites y colisionadores que el ragdoll activo. El horneado exige reposo sostenido durante 0,3 s y falla si no lo consigue en ocho segundos. Guarda muestras a 20 Hz de los catorce cuerpos, con posiciones y cuaterniones. El binario ocupa 388.080 bytes. El manifiesto conserva hashes de fuentes, jerarquías y configuración.

El reproductor `BakedRagdollClip` interpola posiciones y rotaciones por tiempo, normaliza cuaterniones y reutiliza el buffer de salida. No importa Rapier ni modifica navegación. Tres pruebas verifican integridad del binario, correspondencia con archivos fuente actuales, quince clips, valores finitos, interpolación, límites temporales y rechazo de entradas mal dimensionadas.

## Integración aún necesaria

- Adaptar la caída local a posición, escala, orientación y pose actual del animal sin salto inicial.
- Evitar atravesar terreno y obstáculos: una trayectoria horneada sobre plano no resuelve colisiones del mundo.
- Suspender navegación/ataque y reconciliar la posición real igual que el ragdoll activo.
- Usar la recuperación existente desde la pose final, sin volver a la posición de origen.
- Limitar reproducción simultánea, limpiar cancelaciones y comprobar nuevos golpes durante caída/recuperación.
- Validar gráficamente especies y direcciones; medir coste combinado y tamaño descargado.

No se considera resuelto el cuarto impacto por la mera existencia del archivo. El código de combate todavía conserva la reacción ligera cuando se llena el presupuesto físico; este recurso prepara su sustitución por una caída articulada comprobable.

## Adaptación al esqueleto

El banco pasa a versión 2, `snapshotKind: bone-world`: guarda posiciones y orientaciones de huesos después de aplicar la pose física, en lugar de usar directamente los ejes de colisionadores. Los ejes físicos no son intercambiables con los ejes del rig.

`BakedBeastFall` reproduce el banco sobre el modelo colocado en el mundo. Captura la pose animada inicial, mezcla durante 0,18 s hacia la caída, conserva las traslaciones locales de huesos no raíz y transforma orientación/escala/posición mediante la matriz del modelo. Usa los mismos puntos de contacto de piel que la recuperación para compensación vertical. El llamador puede restringir la trayectoria mediante `clipPosition`; este callback no es por sí solo un sistema de colisiones.

Cinco pruebas del banco/reproductor pasan. Incluyen las cinco especies con giro, escala y traslación, pose inicial alterada de brazo, ausencia de salto a tiempo cero, longitudes óseas, restauración y trayectoria horizontal restringida. No prueban naturalidad de la mezcla ni colisiones de extremidades.

Sigue pendiente conectar este reproductor al presupuesto del controlador, reconciliar posición lógica, crear recuperación desde su pose final y ejecutar la matriz gráfica. El cuarto impacto del juego aún conserva la reacción ligera. No se declara implementado el fallback completo.
