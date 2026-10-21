# Aislamiento del corte tonal del suelo de Gran Cañón

Dos pruebas QA, media,seed712,1280x720,poses24/36/47 del alejamiento, día150/noche350. Cada prueba tiene seis parejas con cámara,hora,draw calls y triángulos iguales y sin errores WebGL.

1. `canyon-horizon-shadow`: activar únicamente receiveShadow en la malla horizon. MeshStandardMaterial en ambos casos; el flag cambia, pero las seis imágenes son idénticas píxel a píxel. No integrar este cambio como solución; no demuestra por sí solo que todo el horizonte reciba correctamente sombras, sino que el flag no resuelve el síntoma en estas vistas.
2. `canyon-shadow-isolation`: sustituir únicamente groundVisibility calculada desde nativeShadowOcclusion por1. El corte oscuro del fondo desaparece en la lámina día36, junto con las sombras útiles de las paredes. MAE día7.03–15.66 y noche1.08–2.07/255, solo descripción de la diferencia. No es mejora artística ni candidata: elimina volumen necesario.

Conclusión acotada: la contribución de sombra explica el contraste abrupto observado en la vista elevada. El diagnóstico anterior que lo describía como diferencia de material cercano/lejano no estaba demostrado. Investigar ahora extensión/proyección y transición de shadow map respecto al límite residente, sin eliminar sombras ni compensar con color. Una textura distinta no resolvería esa causa. La prueba también incluye el relleno cálido QA ya activo, que depende de groundVisibility: el diagnóstico neutraliza ambos términos vinculados a sombra, no separa todavía sombra directa de relleno ambiental.

No benchmarks temporales ni cambios de producción. Reproducir con Vite5190 y capture/package-canyon-horizon-shadow y capture/package-canyon-shadow-isolation. Scripts .mjs/.py en tools/experiments. Láminas control izquierda/diagnóstico derecha. No afirmar objetivo global alcanzado.
