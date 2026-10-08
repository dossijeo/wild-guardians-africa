# Integración posterior de las siete miniaturas

Tras el piloto conservado, Image/canvas nativo descodifica los siete pares a
192×192 con cero diferencias de alpha. `native-report.json` contiene las métricas
RGB propias del navegador; no se fuerzan a coincidir con Sharp. La captura
`native-comparison.jpg` conserva composición y legibilidad en el encuadre probado.
La consola nativa registrada no tiene warnings ni errores.

Los alias de `content/manifests/image-runtime.json` seleccionan los siete WebP
optimizados. Los originales se conservan en el repositorio y se excluyen de la
distribución mediante el mecanismo existente. Los recibos de piloto mantienen
`acceptedForRuntime:false` para conservar su estado histórico; esta integración
posterior es la decisión de aceptación para estas miniaturas.

Cincuenta pruebas existentes de imágenes y paquete pasan, incluidos hashes,
dimensiones/alpha y rutas relativas en HTML/JSON/CSS. Build termina en 16,01s;
el paquete valida 701 archivos, 403.013.440 bytes, 859 referencias relativas y
20 GLB runtime sin duplicar originales. Las imágenes ahorran 30.282 bytes antes
del coste adicional de manifiestos/bundle; no se atribuye ese mismo ahorro al
paquete neto ni a memoria o rendimiento.

`nested-runtime.json` verifica las 47 variantes actuales mediante HTTP, hash y
dimensiones en `/nested/itch/audio-qa/`, sin fallback de raíz del servidor.
Incluye las siete nuevas y la yuca integrada previamente. Consola sin errores.
No acredita un recorrido completo de la modal, móvil físico o Tauri; esas
regresiones más amplias permanecen pendientes.

La validación nativa cerró las pestañas temporales 790/791 y el servidor 4188.
La prueba ABBA de carga se realizó separadamente; esto no es un benchmark GPU.
