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
7. **Profundidad VFX (ampliación opaca implementada):** [rutas nativas y medición](qa-standard-depth.md),
   además de [cultivos, exterior DEST y sólidos VFX](qa-depth-capture.md).
   Terreno, horizonte y actores opacos usan recetas de profundidad conocidas.
   Alpha sin ruta acreditada conserva su shader original tras detectar diferencias
   en manglares; interiores/ceniza siguen pendientes. No explica una vista sin efectos.
8. **Resolución (diagnóstico medido y selector implementado):** [DPR 1 manteniendo calidad media](qa-resolution.md),
   36 % menos de píxeles; [selector persistente separado del HUD](qa-resolution-settings.md).
   Intercambia nitidez por rendimiento; variación GPU y alcance preservados.

Origen relativo y cambios 1/6 publicados; [alcance y evidencia de acciones](qa-performance-actions.md). Estas prioridades no
sustituyen la auditoría funcional completa del Plan Maestro ni acreditan móvil.

## Revisión integrada del 3 de octubre

Sobre `79f99c5`, las 33 pruebas dirigidas de props residentes, subidas de cultivos,
caché de sombras, calidad, profundidad y composición African Toon pasan sin
fallos ni omisiones. Esta repetición comprueba regresiones; no añade una nueva
medición GPU ni demuestra una mejora de FPS.

La evidencia de navegador ya registrada distingue los resultados:

| Prioridad | Resultado comprobado | Límite |
| --- | --- | --- |
| Paisaje | Retirar un prop conserva 25/25 terrenos y reemplaza un slot | No mide el tiempo de cada acción de campaña |
| Sombras | 1 pasada y 209 reutilizaciones frente a 210 pasadas en escena detenida | Viento y actores en movimiento invalidan el mapa |
| Ruido fino | GPU media 44,40 → 39,11 ms en el diagnóstico | Cambia el detalle; no se desactiva por defecto |
| Cultivos | 210 frames sin subir matrices ni crecimiento con reloj fijo | No elimina todos los recorridos CPU de plantas |
| Profundidad VFX | Captura media 29,07 → 21,76 ms; cero diferencias en las seis vistas finales | Alpha sin receta acreditada conserva la pasada completa |
| Resolución | DPR 1 conserva HUD y reduce de 1600×900 a 1280×720 | Pierde nitidez del mundo; no promete FPS proporcionales |

Los siguientes experimentos pendientes son una receta de ruido más barata con
comparación visual, caras por categoría/LOD y profundidad de interiores/ceniza.
La separación de sombras estáticas/dinámicas requiere una prueba independiente.
No se convierten estos diagnósticos en cambios visuales globales sin validarlos.

## Comprobación sobre la implementación actual

Sobre `0db52e8` pasan **51/51 pruebas dirigidas**, cero fallos/omisiones,
1.074,6846 ms: props residentes, buffers de cultivos, sombras, bounds del
poblado, registros de materiales, obstrucciones, ruido, HDR, profundidad,
calidad y composición Toon. [Salida completa](qa/performance-actions/integrated-current.txt).
Incluye las modificaciones posteriores de apuntado de magia y expiración
del Escudo; es una comprobación de regresión, no una nueva medición GPU.

La [CI de esa base](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37110777079)
aprueba 787/787 pruebas y el paquete web. Los experimentos pendientes
indicados arriba conservan su estado: no quedan acreditados por esta suite.
