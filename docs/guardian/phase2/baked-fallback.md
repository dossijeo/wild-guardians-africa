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
