# Iluminación HDR de agua y lava

Se recupera la rama completa de fluido del shader African Toon V4.1.4 del
usuario. Mantiene sus cuatro tintas, normal ondulada, Fresnel, entorno con
LOD por rugosidad, BRDF del sol y mezcla de noche. La lava usa su emisión
original ×2,15. La graduación final conserva la rama de fluido de African Toon,
con exposición 1 del lab; se retira el brillo provisional extra ×1,4 y la
segunda curva ACES de Three.

Los dos entornos de 256×128 se calculan desde los HDR originales mediante la
compresión acotada de radiancia de Bioma Lab V4.0, con exposición 1,33/0,62 y
mipmaps. Las pruebas comparan cada byte contra la función original. No hay
convolución GGX ni reflejo de otros objetos de la escena: es el entorno del
panorama, como en el lab. El cielo y los fluidos comparten giro; toon y agua
comparten los objetos uniform de fase de noche, claridad y dirección solar.
La fase temporal sigue siendo elapsed×0,65 y los recursos del entorno se
liberan al cerrar WorldScene.

La adaptación conserva literalmente las funciones de entorno/BRDF y la rama
de fluido del fragment aportado. Las sombras proceden de la máscara PCF de
Three y se convierten a visibilidad con el factor 0,93 original; no se afirma
identidad de sus bordes con el filtro de sombras propio del lab. La salida
original ya contiene gamma: se convierte a lineal con la función inversa
sRGB de Three antes de su conversión final, evitando otra curva tonal.

Verificación: regresión integrada 516/516 en 280,428 s, sin omisiones, y
31 pruebas dirigidas finales. Build y paquete web aprobados; CI anterior
`ea332c2` aprobada en ejecución 37017349462. Pruebas de fuente, bytes HDR,
uniforms compartidos, exposición, ausencia del brillo adicional y liberación
de entornos. CUA con WorldScene real en Sabana, Manglar y Volcanes,
Mapungubwe/712/calidad media: agua superior y rasante, día/noche, transición
0,5, lava día/noche. Consola sin errores/avisos; el visor ahora consulta también
getError de WebGL tras cada dibujo. Las capturas llevan prefijo
`test-results/native-fluid-hdr-`.

La primera vista rasante de Sabana estaba tapada por un árbol. El control
«Rasante sin props (QA)» oculta instancias sólidas y poblados solamente en el
visor aislado; no implementa ocultamiento automático en la partida. Se repitió
la vista despejada y se guardaron las capturas diurna/nocturna. La cámara del
visor enfoca el interior de un triángulo del fluido, con transformaciones
reales de cada instancia.

Quedan terreno y horizonte nativos, materiales de los props sólidos, oclusión
automática, calidad muy baja sin iluminación avanzada, rendimiento móvil y
los demás pendientes del Plan Maestro. Esta revisión no acredita toda la
fidelidad visual del mundo ni sus 30 combinaciones en todos los perfiles.
