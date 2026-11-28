# Selección de Attack durante presentación histórica

La selección de Attack aún exige que el token del último fotograma comunicado
coincida con la secuencia y las generaciones actuales del Worker gráfico. Si
una publicación llega mientras el clic viaja al Worker, `assertPickFrame`
rechaza el clic antes de identificar una bestia. En la captura
`.cache/historical-islet-gated-attack.json`, dos clics se rechazaron por cambios
de secuencia 114→115 y 132→133. No se produjo un ataque confirmado. El token
indica un fotograma renderizado, pero no garantiza qué fotograma presentó el
compositor del navegador.

La validación autoritativa del objetivo sigue siendo necesaria, pero no prueba
que una bestia encontrada posteriormente sea la que el jugador señaló. Por
eso no se debe repetir automáticamente el raycast sobre otra escena ni ignorar
las versiones de cámara, viewport, oclusores o selección.

Una vía pendiente es conservar por un intervalo acotado los parámetros
inmutables del fotograma de selección: fase y mezcla de clips, pose raíz,
trayectorias y versiones de recursos. El skinning para el raycast podría
ejecutarse bajo demanda al recibir el clic, sin deformar vértices cada frame.
También harían falta una época independiente de geometría y oclusores,
retención segura de recursos, poses de todos los personajes que puedan ocluir
y rechazo cuando falten datos o el token caduque. La generación actual de
seleccionables mezcla cambios estructurales y movimiento visual, y no ofrece
esa certificación. No se ha integrado una API parcial de pose como solución.

Las pruebas deben cubrir, entre otros casos, la sustitución de A por B bajo el
cursor, oclusores nuevos, cambios de cámara o viewport, recursos liberados,
objetivos eliminados y acciones duplicadas. Una prueba QA que envíe un objetivo
por ID puede aislar la física y el comando autoritativo, pero no valida esta
selección por píxel ni el fotograma percibido por el jugador.
