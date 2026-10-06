# ImageBitmap en worker — prueba aislada

Se añade una opción QA para convertir las tres texturas nativas de la acacia mediante un worker de módulo. Cada petición crea un worker, obtiene el archivo mediante fetch, convierte el Blob y transfiere el bitmap. El worker termina al completar, fallar o cancelar. Esta ruta permanece desactivada por defecto y no modifica el cargador del juego.

## Comparación ABBAABBA

`abba-report.json` conserva ocho lotes completos, con cesión de un frame entre conversiones. Se reutilizan imágenes CPU y programas; se liberan las texturas nativas GPU entre lotes. No se purga la caché HTTP. Los intervalos registrados son cadencia del navegador, no tiempo GPU.

| Medida | HTML, cuatro lotes | Bitmap en worker, cuatro lotes |
| --- | ---: | ---: |
| Mediana de preparación total | 803,2 ms | 4110,05 ms |
| Mediana del máximo lote de subida de textura | 361,45 ms | 32,15 ms |
| Frames registrados por lote | 6–9 | 147–399 |
| Máximo intervalo observado | 665,1 ms | 764,9 ms |

El render progresa durante la conversión del worker, con medianas de intervalo de 16,6–16,7 ms en esos cuatro lotes. Sin embargo, la espera total empeora y persisten pausas. No se acepta esta variante como optimización de producción. Hace falta separar tiempos de arranque, fetch, conversión y transferencia para identificar la espera, sin atribuirla todavía a una causa concreta. El entorno no es un ensayo aislado de carga del sistema y no se mide RAM.

## Imagen y recursos

Una preparación posterior independiente (`worker-ready-report.json`) termina en 951,4 ms: las tres texturas nativas son ImageBitmap, hay tres programas, cobertura preparada y cero errores WebGL. `console.json` no contiene avisos ni errores capturados. Este ensayo adicional no pertenece a los ocho lotes.

`worker-ready.png` coincide exactamente con `../far-native-texture-profile/detail.png` en los 633600 píxeles RGB del recorte de mundo [400, 0, 1280, 720], excluyendo el panel QA. `summary.json` recoge la comparación y las estadísticas. Esto verifica esta vista diurna cercana; no acredita todos los biomas, móvil, iluminación nocturna ni presupuesto de memoria.

Los tests cubren transferencia, propiedad del bitmap, cancelación previa y durante la petición, llegada tardía y errores del worker/transferencia. Los bitmaps se conservan hasta liberar la prueba y los originales HTML siguen retenidos; no se afirma ahorro de memoria.
