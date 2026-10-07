# Coste HQ y recorrido continuo de Gran Cañón

La comparación nativa de Sabana completó A/B/B/A, 60 frames de calentamiento y 120 muestras por bloque. A usa el cilindro anterior y su textura original; B usa cuatro arcos HQ con el atlas nuevo. Un único fondo está visible en cada brazo. Mundo pausado, misma cámara, 25 chunks/revisión25 y estado lógico sin cambios; 54 llamadas de dibujo en ambos, 685.275→685.243 triángulos. No hay cambios de shader/UV dentro de los bloques medidos. Los dos fondos residen simultáneamente solo en esta fixture: sus contadores de recursos no demuestran RAM final de producción.

| Brazo | Muestras | GPU mediana | GPU P95 | CPU render mediana | CPU render P95 |
| --- | --- | --- | --- | --- | --- |
| Fondo anterior A | 240 | 14,629 ms | 16,786 ms | 7,100 ms | 9,400 ms |
| Cuatro arcos HQ B | 240 | 14,118 ms | 15,735 ms | 7,300 ms | 9,900 ms |

EXT_disjoint_timer_query: 480 muestras válidas, sin disjoint, descartes, errores GL, pendientes ni pérdida de contexto. RAF mediana16,6ms en los cuatro bloques; no se convierte en una promesa de FPS. En esta muestra el coste GPU HQ no empeora, mientras CPU render tiene una diferencia pequeña al alza y variabilidad entre bloques. No prueba una ganancia general: solo un bioma/encuadre diurno, calidad media, buffer1280×720 con DPR efectivo1, navegador local visible. Las campañas CPU27148/49032 seguían activas. Pendientes otros biomas/encuadres, móvil e integración final.

Primer intento preservado en initial-hidden-to-visible-negative.json.gz: en navegador oculto no avanzaba de forma suficiente; al mostrarlo se completó, pero también cambió el tamaño de viewport. No se usa como benchmark válido. Se repitió completo con viewport explícito fijo; before/after coinciden y se restauró el override al cerrar. El panel #report vuelve a mostrar la pose al terminar: el recibo completo se recupera con #export, no se infiere finalización de ese panel.

Gran Cañón: recorrido nativo de 161 poses, pasos0,5m y dos RAF por pose: pan +20m, retorno, elevación+20m y descenso, comenzando a elevación80/yaw0/día. El estado lógico coincide antes/después, el ojo vuelve exactamente al inicio y anchorY permanece2,36 en todas las poses. Captura final revisada, sin vídeo ni comparación multiframe de píxeles: esto acredita anclaje numérico continuo, no ausencia universal de artefactos temporales.

Cuarta silueta de Cañón: cuatro capturas a yaw275/elevación120 y180, día/noche, siguen mostrando solamente meseta y cielo. No se aprueba ese encuadre. La auditoría posterior del subagente sitúa la cima visible D en25,489m (alpha/altura/composición), por debajo de la meseta. Debe corregirse esa silueta/composición antes de integrar; elevar la cámara no soluciona una montaña enterrada. Fuentes del negativo permanecen conservadas en la rama.

Fuente congelada68dcda06; receipt.json vincula hashes de fixtures, renderizador y muestras/capturas. `node docs/qa/hq-mountain-cost-path/verify.mjs` valida hashes, todos los invariantes registrados, cobertura de muestras GPU y recorrido, y reproduce cuantiles por bloque/brazo. Los archivos originales son recibos nativos comprimidos sin modificar. No valida mecanismos que la fixture no registra. Tabs718/719 dispuestas/cerradas, visibilidad y viewport restaurados. No se promueven aún assets públicos ni se acredita la PR final.
