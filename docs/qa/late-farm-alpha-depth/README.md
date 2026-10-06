# Profundidad alpha: nuevo ensayo en finca real

Sobre base `df23ddd`, se prueba exclusivamente en QA una receta Standard/Basic de profundidad para superficies con alpha test conocidas. La [salvaguarda anterior](../../qa-standard-depth.md) sigue activa en producción: este adaptador temporal no cambia ninguna condición del renderer del juego. Conserva materiales authored, callbacks desconocidos, arrays y excepciones de rasterización. Restaura los `customDepthMaterial` y la forma original de las propiedades incluso ante errores; los materiales de color permanecen intactos.

## Coste integrado

Cuatro continuaciones A/B/B/A del mismo guardado histórico Manglares/Saheliana; 18 trabajadoras mayores pagadas, mundo/cámara/calidad media/sombras/shader analítico iguales. 350 pasos de 100 ms por lote, 150 de calentamiento y 200 medidos. Framebuffer 1600×900 en Intel UHD/D3D11. 800 queries resueltas, sin descartes/disjoint/queries ajenas/pérdidas ni pendientes.

| Lote | Alpha experimental | GPU mediana (ms) | CPU render mediana (ms) | Intervalo RAF mediano (ms) |
| --- | --- | ---: | ---: | ---: |
| A1 | No | 62,1370 | 41,80 | 68,20 |
| B1 | Sí | 59,3205 | 44,20 | 69,85 |
| B2 | Sí | 59,2723 | 45,85 | 68,70 |
| A2 | No | 60,4107 | 41,90 | 66,95 |

El ahorro GPU en los pares es ~2,82 ms y ~1,14 ms. **No se adopta**: el adaptador añade un recorrido de elegibilidad/restauración y el render CPU aumenta ~2,40/~3,95 ms, sin mejorar el ritmo RAF. Son observaciones de estos pares, no una causalidad aislada de cada componente CPU. Una integración que reutilice el recorrido de preparación existente requeriría otro ensayo; no se presenta como medida ni resuelta. Las 292.174 asignaciones por lote B incluyen todos los candidatos preparados durante calentamiento y medición, no draw calls ni objetos únicos visibles. No se infiere de esa cifra cuántos lotes estaban vacíos.

Los cuatro lotes mantienen exactamente los envíos en cada paso, no solo sus medianas: 637 llamadas/5.135.701 triángulos con pases sumados en la mediana. También coinciden 89 búsquedas de ruta, 17 entregas, 23 recogidas, dos riegos y tres maduraciones/órdenes automáticas. Hash lógico final `c6cd4533687b41c35d494e322c8f82ab0e613544819fe0f8d7c1ded224300fdd`, saldo 841, 186 plantas vivas, 35 s. Memoria en contadores de Three conservada: 319 geometrías/78 texturas; no acredita bytes RAM/GPU.

Una primera ejecución se interrumpió al recargarse la pestaña por editar otro HTML de QA durante el ensayo. Sus lotes parciales no se utilizan ni reconstruyen como evidencia completa. La tabla corresponde a la ejecución posterior íntegra, sin ediciones mientras estaba activa.

## Imagen y profundidad

La finca completa permite lectura directa de RGBA en cinco renders A/A/B/B/A con reloj/cámara fijos. Las diferencias de color son 53/7/5/2/4 píxeles por los pares guardados; el control original/original presenta diferencias, por lo que no se atribuyen todas al candidato ni se declara equivalencia exacta. Máximo observado 44 niveles de canal. Estado lógico preservado; no se conserva el framebuffer completo, solo métricas/bounds y captura contextual. Esto no es un benchmark GPU.

Se amplía la lectura al attachment real de profundidad, empaquetado a RGBA8 mediante texelFetch y la función de Three, junto al framebuffer final de color. Casos pausados de semilla 712, un trabajador real cargado en estado `arriving`, primer mijo a crecimiento cero, preparación de profundidad solicitada incluso sin VFX activo y sin ataque. Colapso 85 % es una entrada visual controlada, no una incursión simulada.

| Caso | Diferencias de profundidad en los cinco pares | Color original→candidato | Color control original/original |
| --- | --- | ---: | ---: |
| Manglares/Mapungubwe, intacto | 0 en todos | 60 | 63 |
| Manglares/Mapungubwe, colapso 85 % | 0 en todos | 0 | 22 |
| Sabana/Suajili, intacto | 0 en todos | 6 | 18 |
| Sabana/Suajili, colapso 85 % | 0 en todos | 10 | 20 |

Cada par examina 1.440.000 píxeles de profundidad no constante y color, sin errores WebGL/escena ni cambios lógicos. Las pequeñas diferencias de color permanecen sin causa aislada. La igualdad de profundidad en estas vistas actuales **no invalida ni explica** el contraejemplo histórico, no prueba todos los giros, biomas/culturas, fases de crecimiento, skinning/poses, clipping, VFX o móvil. Tampoco prueba la lectura de profundidad de la finca avanzada en sus cuatro lotes: allí se comparó color final, estado y rendimiento.

Pasan **13 pruebas dirigidas** de adaptador, receta stock y captura: restauración ante fallo, preservación de callbacks/recetas y conservación de la salvaguarda de alpha en producción. No se modifica runtime; no necesita un nuevo build para respaldar una optimización aplicada, porque no la hay.

[Informe completo de finca](native.json.gz), [captura](farm.png), [datos y hashes](proof.json). Los cuatro JSON de escenas estáticas y sus capturas están junto a este informe. Gzip mtime cero, hashes de bytes originales y comprimidos. Pendiente: reducir el coste de preparación del candidato, aislar repetibilidad de color, ampliar lectura de profundidad/efectos y repetir coste antes de decidir su incorporación.
