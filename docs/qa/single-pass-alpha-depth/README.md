# Profundidad alpha dentro de un único recorrido

Candidato experimental sobre `230aac1`. La selección Standard/Basic conocida se integra en `withDepthCaptureMaterials`, reutilizando el recorrido y el Map de materiales por captura. No se añade otro recorrido ni se asigna `customDepthMaterial` temporal a los objetos. El adaptador QA únicamente activa la opción y cuenta las especializaciones. **La opción `stockAlpha` sigue apagada por defecto**; el juego mantiene la salvaguarda anterior. El experimento de lotes vacíos también permanece apagado.

Se conservan materiales authored, mapas/alpha tests, flags de rasterización y guardas ante recetas desconocidas, arrays, overrides, clipping, alpha hash y polygon offset. Se restauran materiales y propiedades ante errores. Pasan 26 pruebas dirigidas de captura, receta Standard, sombras y adaptador. Build correcto (204 módulos, 9,11 s); advertencia habitual de bundle principal >500 kB.

## Finca avanzada real

Cuatro continuaciones pagadas A/B/B/A del mismo guardado Manglares/Saheliana: 18 trabajadoras mayores, simulación/navegación actuales, cámara/calidad media/sombras/ruido analítico iguales. 350 pasos de 100 ms por lote, 150 de calentamiento y 200 medidos. Framebuffer 1600×900; Intel UHD/D3D11. 800 consultas GPU completas sin errores, disjoint ni pendientes. No hubo ediciones ni builds/tests propios durante la medición; seguían activos los dos procesos congelados de campaña, por lo que el ruido de CPU no está aislado.

| Lote | Alpha experimental | GPU mediana (ms) | CPU render mediana (ms) | Intervalo RAF mediano (ms) |
| --- | --- | ---: | ---: | ---: |
| A1 | No | 63,4365 | 39,45 | 69,15 |
| B1 | Sí | 60,5744 | 41,85 | 67,35 |
| B2 | Sí | 58,4988 | 39,80 | 63,00 |
| A2 | No | 60,8019 | 41,65 | 65,35 |

GPU menor ~2,86/~2,30 ms; intervalo RAF menor ~1,80/~2,35 ms en los pares. CPU mayor ~2,40 ms en el primero y menor ~1,85 ms en el segundo. Son observaciones de esta ejecución, no una mejora general de FPS ni prueba de que desapareció todo el coste CPU. El resultado es más favorable que el [adaptador con segundo recorrido](../late-farm-alpha-depth/README.md), pero no se comparan campañas separadas como si fueran el mismo ensayo controlado.

Los estados iniciales/finales, 89 búsquedas de ruta, eventos y envíos coinciden exactamente en los cuatro lotes y por paso. Mediana 637 llamadas/5.135.701 triángulos sumando pases. Final: hash `c6cd4533687b41c35d494e322c8f82ab0e613544819fe0f8d7c1ded224300fdd`, 17 entregas, 23 recogidas, dos riegos y tres maduraciones/órdenes automáticas. Cada lote B acumula 292.174 especializaciones aceptadas durante toda la ejecución; no son objetos únicos ni llamadas de dibujo. Contadores de Three iguales: 319 geometrías/78 texturas, sin medición de RAM en bytes.

## Preparación aislada

Misma escena nativa pausada Manglares/Mapungubwe, 20 calentamientos y 20 muestras de 25 llamadas por lote, callback de dibujo vacío. A/B/B/A: **9,40 / 21,45 / 19,70 / 9,35 ms por 25 llamadas**. La opción añade ~0,48/~0,41 ms por captura en esos pares, aun sin segundo recorrido. Especializa 842 candidatos alpha por llamada (61→903 materiales especializados; 867→25 fallback). No atribuir esta prueba a FPS ni equiparar esos candidatos a meshes dibujados. Estado lógico/materiales conservados.

## Imagen y profundidad

Finca completa A/A/B/B/A con reloj/cámara fijos: diferencias RGBA 24/10/39/33/4 píxeles, máximo 40 niveles de canal. Los controles originales y candidato/candidato también cambian; causa sin aislar, no se declara equivalencia exacta de color. Estado lógico conservado. Esta lectura no mide rendimiento.

Escena pausada Manglares/Mapungubwe, semilla 712, trabajador real cargado `arriving`, primer mijo a crecimiento cero. Captura de profundidad forzada, sin ataque ni VFX de trabajo activo. Cinco pares de lectura de color final y attachment real de profundidad empaquetado por caso:

| Caso | Diferencias de profundidad | Color A1/A2 · A2/B1 · B1/B2 · B2/A3 · A2/A3 |
| --- | --- | --- |
| Intacto | 0 en los cinco pares | 41 · 3 · 5 · 11 · 9 |
| Colapso visual controlado 85 % | 0 en los cinco pares | 7 · 30 · 39 · 30 · 7 |

Cada par examina 1.440.000 píxeles con profundidad no constante. No hubo errores ni cambios lógicos. Estos diez pares no prueban todos los biomas/culturas, poses, crecimiento, giros, efectos o móvil; tampoco explican ni invalidan el contraejemplo histórico de profundidad alpha. El daño es una entrada visual de QA, no una incursión real.

## Decisión y pendientes

Mantener opt-in QA. El ahorro integrado justifica ampliar la validación visual, pero faltan cobertura de alpha en otras vistas/estados/biomas, explicación de las diferencias de color y del contraejemplo histórico, efectos que realmente consumen profundidad y móvil. También queda reducir el coste de preparación por captura antes de valorar su activación. No se marca completa la optimización general ni la aceptación de 100 noches.

[Medición íntegra](native.json.gz), [lectura estática de finca](pixels.json.gz), [CPU aislada](cpu-mangrove.json), [intacto](mangrove-intact.json), [colapso](mangrove-collapse.json), [captura de finca](farm.png) y [proveniencia/hashes](proof.json). Gzip con mtime cero; se conservan hashes de bytes comprimidos y originales.
