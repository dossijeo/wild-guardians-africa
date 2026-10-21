# Revisión de decisiones visuales y de rendimiento

Esta revisión responde a la indicación del usuario de conservar buenos resultados aunque inicialmente resulten caros. Audita informes existentes; no constituye una nueva inspección exhaustiva de capturas ni declara aprobadas visualmente por el usuario todas las candidatas.

| Variante | Evidencia y motivo anterior | Estado revisado |
|---|---|---|
| [Manglares: sustrato completo](mangrove-height-blend/full-review/README.md) | 24 capturas; +3.669 a +4.735 ms GPU según par. El usuario aprueba el aspecto. | Referencia visual aprobada; prioridad de optimización conservando imagen. Revocado abandono anterior. |
| [Cañón: arena seca completa](canyon-sand-dry/moving-performance/README.md) | Corrección de crestas útil; sobrecoste agrupado ~1.16 ms día / .74 ms noche. | Conservar receta completa como alternativa visual. Compararla con normal-only antes de tratar la versión barata como sustitución suficiente. |
| [Gran Río: tierra V2](river-soil-layer-v2/README.md) | Recupera detalle y separación tierra/hierba; presupuesto no aprobado y borde amplio pendiente. | Candidata visual conservada, con coste y limitaciones por resolver; no descartada. Consultar también pruebas posteriores de movimiento. |
| [Sabana: hojas finas](grass-fine/README.md) | Mejor forma, coste nocturno elevado y cobertura escasa. | Conservar geometría como referencia; no volver a matas aisladas como solución al objetivo posterior de cubierta continua. Motivo mixto, no solo rendimiento. |
| [Manglares: dos escalas](mangrove-moss-scales/README.md) | Menos repetición, pero pérdida de relieve; +1.81/+2.12 ms agrupados. | Revisión artística pendiente si se retoma. No afirmar que fue descartada solo por coste ni que equivalga a la receta aprobada. |

No se han eliminado estas recetas por esta revisión. Los enlaces llevan a evidencias conservadas; las cifras de distintas series no son un benchmark entre candidatas.

## Criterio para siguientes iteraciones

Registrar por separado: valoración visual, coste medido, errores funcionales y decisión de integración. Conservar resultados visualmente prometedores como referencias reproducibles. Un límite provisional de +0.5 ms no es motivo suficiente para abandonar una buena dirección artística. Tampoco garantiza que pueda activarse en todos los perfiles.

Optimizar primero Manglares contra la receta completa aprobada, manteniendo semilla, cámara, hora y resolución. Los ahorros fuera del material deben medirse junto con la variante; no sumar diferencias de pruebas independientes. No sacrificar apariencia silenciosamente para aprobar rendimiento.

La revisión inicial no demuestra que todos los descartes históricos hayan sido evaluados correctamente. Queda pendiente revisar visualmente las alternativas completas de Cañón y Gran Río frente a sus sustituciones económicas, y ampliar el inventario si aparecen otros candidatos. Los descartes por fallos visuales concretos no se rehabilitan automáticamente.
