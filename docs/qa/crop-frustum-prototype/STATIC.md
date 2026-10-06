# Repetibilidad de imagen al activar descarte de cultivos

Diagnóstico complementario sobre main `6924ce6`, candidato todavía fuera del producto. Preparar una sola continuación pagada hasta el estado final de 35s y acercar la cámara como en el ensayo previo; después pulsar «Comparar píxeles A/A/B/B/A». La preparación conserva sus muestras en el JSON, pero no es un benchmark pareado y sus tiempos no se usan para concluir rendimiento.

Cada comparación dibuja y lee directamente RGBA del framebuffer WebGL de 1600×900 (1440000 píxeles), sin incluir el HUD HTML. A1/A2 desactivado, B1/B2 activado, A3 desactivado de nuevo. No se avanza la simulación entre lecturas; se mantiene la ruta normal de render, cámaras, VFX, profundidad y caché de sombras. `serialize(state)` debe coincidir después de cada lectura.

| Par | Primera secuencia: píxeles distintos / máximo canal | Repetición: píxeles distintos / máximo canal |
| --- | --- | --- |
| A1/A2 | 0 / 0 | 0 / 0 |
| A2/B1 | 0 / 0 | 0 / 0 |
| B1/B2 | 8 / 19 | 0 / 0 |
| B2/A3 | 10 / 30 | 0 / 0 |
| A2/A3 | 2 / 30 | 0 / 0 |

Las diferencias pequeñas de la primera secuencia están confinadas a coordenadas del borde derecho; también aparecen entre dos renders con el candidato activado y al volver al original. La segunda secuencia es idéntica en los cinco pares. No atribuir la causa concreta a VFX, orden, caché o hardware sin otro aislamiento. La lectura A2/B1 es idéntica en ambas secuencias; este escenario no demuestra una pérdida visible al activar el descarte.

Los cinco frames mantienen 570 llamadas/4796154 triángulos en A y 560/4773506 en B. Son frames estáticos particulares con pases sumados, no las medianas del benchmark anterior. El estado lógico mantiene SHA256 `c6cd4533687b41c35d494e322c8f82ab0e613544819fe0f8d7c1ded224300fdd`. Sin errores de escena/WebGL y consola final vacía. No se capturan ni conservan todas las imágenes RGBA; se retienen métricas de diferencias, cajas afectadas y estados en los informes.

[Primera secuencia](static-first.json), [repetición](static-repeat.json), [captura de contexto](static-repeat.png), [fuentes/hashes](static-proof.json). Las diferencias de screenshots de ensayos previos no equivalen a estas lecturas: distinta resolución/muestreo y captura del documento. Se conservan sin reinterpretarlas como una regresión acreditada ni eliminarlas.

Alcance: una cámara cercana centrada en el edificio, una finca/bioma/cultura/estado y el pipeline actual de Intel UHD/ANGLE D3D11. No demuestra imagen idéntica en todas las cámaras, luces, sombras, morphs, ataques o móvil; tampoco aporta ahorro de frametime. El candidato conserva su estado experimental porque la reducción de envíos es pequeña y el benchmark previo no acredita ganancia GPU consistente. Próximo ensayo: vista lateral/centrada en la plantación y agrupación espacial, con coste real y preservación visual verificados.
