# Prioridades de rendimiento

Sugerencias del usuario del 3 de octubre de 2026. Se medirán con la misma cámara,
calidad y dispositivo, conservando diferencias visuales y tiempos CPU/GPU por
separado. No se atribuye una mejora de FPS al recuento de trabajo evitado.

1. **Invalidación de paisaje (implementada):** separar entidades y supresiones de
   props del streaming del suelo. Conservar navegación, guardado, agua de assets,
   contactos, LOD, ocultación y sombras. Plantar y lanzar magia no deben retirar
   todos los chunks ni forzar el horizonte.
2. **Caras (props auditados):** [informe conservador](qa-face-sides.md), 120 props/360 LOD;
   sin candidato cerrado acreditado en todos sus LOD, materiales conservados.
   Pendiente prueba visual y GPU por prop/LOD y otras categorias.
    experimentar por categorías con FrontSide en geometría cerrada;
   mantener hojas, planos y superficies abiertas. Revisar shadowSide y edificios
   dañados con cámara girada; comparar GPU e imágenes.
3. **Caché de sombras (implementada):** [evidencia y límites](qa-shadow-cache.md).
   Invalida por poses, crecimiento/viento, geometría, luz, contexto y materiales.
   Separar casters estáticos/dinámicos queda como mejora posterior.
4. **Coste del shader (diagnóstico medido):** [evidencia y límites](qa-fine-noise.md). diagnóstico de ruido fino desactivado conservando bandas,
   paleta y contornos. Evaluar ruido de textura/receta barata/calidad/distancia
   con comparación visual. [Lectura HDR en extremos día/noche implementada](qa-hdr-endpoints.md).
   PCF compartido ya implementado; no duplicar ese trabajo.
5. **Bounds y selección por luz (implementados):** [evidencia de las cinco culturas](qa-village-bounds.md);
   [envolvente conservadora de centros y colapso](qa-center-bounds.md) y
   [selección de chunks contra la luz](qa-light-volume.md), conservando casters
   fuera de cámara que siguen dentro del volumen de sombra.
6. **Cultivos (subidas implementadas):** matrices estables, atributos de crecimiento/morph
   separados, subidas únicamente de rangos cambiados. El viento usa reloj, sin
   reenviar matrices. Registro de materiales/agua implementado: [evidencia y límites](qa-material-registry.md).
   [Caché de obstrucciones implementada](qa-obstruction-cache.md), conservando fades
   y reempaquetado al cambiar LOD; otros recorridos CPU siguen pendientes.
7. **Profundidad VFX:** estudiar ruta específica conservando alpha test, clipping,
   skinning, morph, crecimiento y agujeros DEST. No explica una vista sin efectos.
8. **Resolución (diagnóstico medido y selector implementado):** [DPR 1 manteniendo calidad media](qa-resolution.md),
   36 % menos de píxeles; [selector persistente separado del HUD](qa-resolution-settings.md).
   Intercambia nitidez por rendimiento; variación GPU y alcance preservados.

Origen relativo y cambios 1/6 publicados; [alcance y evidencia de acciones](qa-performance-actions.md). Estas prioridades no
sustituyen la auditoría funcional completa del Plan Maestro ni acreditan móvil.
