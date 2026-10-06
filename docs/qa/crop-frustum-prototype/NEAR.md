# Cámara cercana: descarte conservador de cultivos

Cuatro lotes A/B/B/A sobre `dcf556d`, misma continuación archivada/contratación pagada que el diagnóstico previo. La cámara de home se aproxima al objetivo multiplicando su desplazamiento por .35; se respetan las correcciones de cámara del terreno. Ojo [88.84586636208493,8.811215741103434,10.700786598568309], objetivo [83,3.5,0], iguales en los cuatro lotes. La captura muestra principalmente el centro cercano y parte de la plantación, no una vista lateral centrada en toda la finca.

| Lote | Descarte | Llamadas mediana | Triángulos mediana | GPU mediana ms | CPU render mediana ms | RAF mediana ms |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | no | 517 | 4746471 | 79,17 | 38,25 | 84,20 |
| B1 | sí | 507 | 4716883 | 76,64 | 38,70 | 81,65 |
| B2 | sí | 507 | 4716883 | 76,99 | 44,45 | 82,50 |
| A2 | no | 517 | 4746471 | 76,94 | 47,40 | 83,15 |

Diez llamadas y 29588 triángulos menos (~0,62 %). No hay ganancia GPU consistente en los dos pares: el segundo es prácticamente igual/ligeramente peor. **No se adopta en producción.** Las envolventes hacen posible descartar algunos lotes en esta cámara, pero el coste de render sigue siendo alto y el ahorro es pequeño. Pendientes vistas laterales/centradas en cultivos y agrupación espacial con coste de CPU, llamadas y memoria incluido.

800 muestras GPU/CPU; sin disjoint/consultas pendientes, errores de escena/WebGL o consola. Cuatro estados finales completos iguales, 89 búsquedas de ruta y mismos eventos físicos/contratación. Calidad media, sombras, 1280×720 CSS/1600×900 buffer, Intel UHD/ANGLE D3D11. Paso fijo advanceReal(.1) por RAF (15s calentamiento/20s medidos); sin ritmo variable de producción, audio/HUD/autosave/incursión, móvil, RAM en bytes ni aceptación de cien noches. Los procesos congelados 20608/36076 continuaban activos; sin otros tests/builds propios durante los tiempos.

[Sin descarte](near-disabled.png) y [con descarte](near-enabled.png), mismo estado lógico al cambiar checkbox; no imágenes idénticas. En screenshots x>=520 OR y>=680: 568000 píxeles, 3644 diferentes, máximo80/255 y media del máximo RGB0,04375/255. [Métricas](near-image-difference.json). La inspección visual conserva el aspecto general, pero las diferencias necesitan comparación directa de framebuffer y repetición de referencia; no atribuirlas sin evidencia ni acreditar sombras/imagen completa por la prueba de posiciones GPU.

[Datos](near-native.json), [verificación separada de las envolventes en GPU](GPU.md), [hashes complementarios](additional-proof.json). Botón «Comparar cultivos con cámara cercana A/B/B/A» en el visor habitual, con guardado y referencias congeladas preparados. No cambia imports ni opciones del producto, por lo que no requiere build nuevo del juego.
