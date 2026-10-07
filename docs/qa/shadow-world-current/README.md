# Sombras nativas · main e14695a

Esta revisión amplía el ensayo de geometrías simples de `../shadow-view-camera`. Utiliza `african-toon.html?case=1`, Sabana/Mapungubwe, con nueve rigs originales preparados (cuatro trabajadores y cinco animales), dieciséis cultivos en dos etapas, diez murallas/puertas y el shader original de destrucción del centro.

Se comparan 36 poses por ensayo: día/noche × tres daños estáticos (0/45/80 %) × foco centro/cultivos × tres ángulos. El tiempo simulado no avanza y se desactiva la ocultación de obstáculos durante cada comparación. Los daños se fijan como fixture visual, sin simular una incursión ni una caída completa. No se usan guardados.

## Resultados y límite

| Ensayo | Pares | Profundidad empaquetada | Hits observados | Color exacto |
| --- | --- | --- | --- | --- |
| Framebuffer normal con antialiasing | 36 | 0 bytes diferentes en todos | 36 | No |
| Render target SRGB, una muestra (solo QA) | 36 | 0 bytes diferentes en todos | 36 | No |

En ambos ensayos, las poses y matrices inversas de vista coinciden exactamente y no hay errores WebGL. Cada sombra reutilizada se compara con un recálculo forzado. El resultado original conserva `depthPassed=true` y `passed=false`: **la igualdad exacta del color permanece sin acreditar**.

Se añaden controles consecutivos sin cambiar la política de sombras (AA y BB). También presentan variación de color: máximos de 160/123 bytes distintos en el framebuffer normal y 168/91 en single-sample. La comparación caché/recálculo llega a 142 y 143 bytes distintos, respectivamente, en imágenes de 768×432. Algunas diferencias tienen amplitud considerable en canales individuales; no se acepta una tolerancia arbitraria ni se atribuye la causa a MSAA. El segundo ensayo descarta que quitar multisampling baste para obtener igualdad.

El primer intento se detuvo ante 67 bytes de color distintos, con profundidad exacta; se conserva en `first-attempt.json`, su captura y sus hashes antes de ampliar los controles. Los informes completos son `default-framebuffer.json` y `single-sample.json`. Sus manifests identifican las fuentes correspondientes. La versión anterior de la fixture default se reconstruyó desde los cambios de instrumentación y se contrastó con el SHA-256 registrado antes de comprimirla; `single-fixture.js.gz` contiene la versión final y `african-toon.html.gz` el escenario anfitrión.

Esto verifica profundidad empaquetada del mundo nativo en una combinación, incluidos recortes de daño y cultivos. No es un benchmark: los readbacks sincronizan la GPU y hay campañas de CPU en segundo plano. No demuestra equivalencia de todo el color, profundidad24 interna byte por byte, las treinta combinaciones, todas las animaciones/colapsos, teléfono físico ni FPS globales. El juego conserva su antialiasing original; solo se añade instrumentación a la página QA. Las dos ejecuciones terminaron y la pestaña 641 se cerró antes de devolver la GPU al subagente de impostores.
