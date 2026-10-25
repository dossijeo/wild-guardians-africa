# Invalidación de ocupación: filtro de eventos

20/10/2026 · Sabana · semilla 712. El helper original invalidaba todos los tiles ante cualquier evento cuyo nombre contuviera Crop, Structure, Wall, Placement, Village o Repair. Esto incluía golpes y maduración, que no cambian la ocupación.

El adaptador `qa-continuous-grass-occupancy.js` reutiliza `markGroundDetailEvent` del renderizador: altas, recogida o destrucción de cultivos; colocación de estructuras; construcción o retirada de muros; ruina/reparación relevante; fundación de poblados. Sustituye el observador anterior y mantiene su liberación mediante `dispose`. No modifica reglas ni fuentes de eventos. Sigue reconstruyendo los tiles globalmente cuando hay una invalidación válida; no implementa todavía invalidación espacial parcial.

**Aplicación:** el lanzador de revisión interactiva activa este adaptador antes de montar el panel. Las sesiones ya abiertas y el helper base de las comparativas históricas no se modifican. No se cambia el shader, la geometría, el viento 8× ni el comportamiento predeterminado del juego.

## Verificación real del renderizador

La herramienta `verify-continuous-grass-occupancy.mjs` inicia el juego real en un navegador aislado y pausado. Inyecta eventos de prueba y un cultivo temporal creado con el constructor oficial `createPlant`. No simula una compra válida ni una partida completa: verifica el contrato de invalidación y exclusión del renderizador. El centro del cultivo es un identificador de fixture; no se crea un poblado ni se alteran reglas de colocación.

| Comprobación | Media | Baja |
|---|---:|---:|
| Invalidaciones por CropHit, CropMatured, StructureHit antes | 3 | 3 |
| Las mismas con filtro | 0 | 0 |
| Módulos antes de la ocupación | 10.741 | 4.620 |
| Módulos con cultivo temporal | 10.646 | 4.557 |
| Raíces dentro del radio de exclusión 2,2 m | 0 | 0 |
| Restauración exacta de posiciones y orden | Sí | Sí |
| Selecciones adicionales en 20 renders inmóviles | 0 | 0 |

[Resultado media](occupancy-media.json), [resultado baja](occupancy-baja.json). Sin errores de navegador o WebGL en las ejecuciones finales. Las primeras pruebas incompletas revelaron que la escena inicial no tenía cultivos ni centros en estado; se sustituyó la estructura mínima inválida por el constructor oficial con un identificador de centro de fixture.

No se midieron tiempos GPU porque permanecía abierta la revisión interactiva. Los conteos prueban que se evitan reconstrucciones innecesarias, no cuantifican una ganancia de milisegundos. Tampoco prueban límites de puntas movidas por viento: la exclusión se verifica sobre raíces de módulos. `engineQueries: 0` del audit histórico sigue siendo metadata de arquitectura, no un contador instrumentado por esta prueba.

La selección tras movimiento y streaming conserva la implementación anterior. Esta entrega no añade pruebas de navegación, todas las colocaciones de edificios, agua dinámica ni largas campañas; no debe usarse para afirmar esas coberturas.

## Reproducir

Servidor del worktree en 5190. Ejecutar `node tools/experiments/verify-continuous-grass-occupancy.mjs`; repetir con `WG_COVER_QUALITY=baja`. El lanzador `node tools/experiments/review-continuous-grass.mjs` incorpora el filtro en su siguiente apertura. Sin integración en main.
