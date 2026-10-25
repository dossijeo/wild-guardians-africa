# Integración de bestias y cámara de incursión

Objetivo activo solicitado: integrar codex/beast-models, revisar todos los clips, corregir rig/animación con Blender headless si hace falta y comprobar presentación épica y activación real del escudo desde la cámara de incursión.

## Base y preservación

- Trabajo: codex/global-visual-lab, worktree wild-guardians-global-visual; se conservan siete modificaciones locales preexistentes.
- main d36ea37a7 incorporado por fast-forward; recuperación recovery/beast-integration-20261025 apunta a 9d39f306c.
- Rama fuente local codex/beast-models en 6c68b5833 (no existía remote tracking origin/codex/beast-models al fetch).
- Merge 3c1db05fd. Tres conflictos resueltos conservando finalDaylight y beastUniforms en AfricanToon, y todas las exclusiones de empaquetado más los animales donantes sustituidos.
- Cinco especies: facóquero, hiena, búfalo, león y rinoceronte. Se preservan reparaciones horneadas de pies, cabeza, ropa y movimiento secundario existentes.

## Primeras comprobaciones

89 tests dirigidos pasan: animal-actions, AfricanToon, cámara de incursión/terreno/viaje y colocación de escudo. Vite build pasa. Paquete: 973 archivos y 465.307.142 bytes (menos que antes), con 17 GLB runtime y sin donantes viejos.

La escena beast-replacement antigua no activaba approvedVisuals. Corregida para que las nuevas revisiones utilicen el perfil final de producción. Herramientas de captura/vídeo admiten WG_BEAST_QA_OUT para no sobrescribir evidencia de la rama original.

Vite de integración en puerto 5217. Puerto 5196 ocupado: no se detuvo su proceso. Revisión inicial del rinoceronte en curso. Pendiente revisar todos los clips y transiciones, penetraciones cuerpo/ropa/armas, cámara e interacción del escudo en UI real; pruebas funcionales no equivalen a aprobación visual.

## Siguiente pendiente solicitado por el usuario

Después de terminar las bestias, investigar Manglares en el vídeo del flujo completo: el poblado aparece como una isla rodeada de un lago enorme. Referencia adjunta por el usuario el 25/10/2026, captura al 100% de la transición al mundo. Reproducir misma semilla/partida/cámara y comprobar persistencia tras streaming. Separar generación de agua autoritativa de representación, máscaras, altura y cobertura de chunks antes de corregir. No deberían aparecer lagos enormes en ese bioma. No cambiar ahora el objetivo principal de bestias/cámara/escudo.

## Pendiente posterior: tutorial en orientación vertical

Petición del usuario al revisar la captura portrait: colocar el globo de texto
abajo y al guardián arriba. Actualmente el globo tapa al guardián. Revisar
legibilidad, visibilidad del personaje y convivencia con los controles en
pantalla estrecha. Hacerlo después de la integración de bestias, junto con los
pendientes posteriores; no cambiar ahora el alcance de las pruebas de patas.

## Criterio adicional del usuario: cabeza alta
Revisar postura de cuello/cabeza en todos los clips. Mantener la cara visible y cabeza alta en locomoción; distinguir anticipación breve de ataque de encorvamiento sostenido. Corregir rig/curvas con Blender si se confirma, preservando giro y movimiento. No aceptar solo valores respecto a bind: comprobar orientación visible absoluta.

## Integración y revisión adicional

- Capturas y vídeos completos de las cinco especies en WorldScene con approvedVisuals, seis clips (más restpose cuando existe), día/noche y vistas frontal/trasera. La primera ronda está completada; se regeneran los vídeos afectados por la corrección posterior de cabeza. Son muestras deterministas a 30 fps, no benchmarks de rendimiento.
- Movimiento, ataque y primer impacto en la escena de incursión de Gran Cañón comprobados para las cinco especies con el perfil visual aprobado. La prueba de UI separada carga una partida con Wild Engine y utiliza botones y clics reales; no llama directamente a cast().
- Cámara: llegada suave a un máximo de 18 unidades, conservando orientación, límites de terreno y una vista previa más cercana. 44 pruebas específicas de cámara pasaron inicialmente; la batería ampliada final contiene 156 pruebas y pasa íntegramente.
- Escudo activado mediante UI para las cinco especies a 1280×720. Rinoceronte también a 390×844. Primera prueba vertical falló porque el punto proyectado caía sobre Construir; el test ahora comprueba elementFromPoint y descarta puntos tapados por HUD, además de cerrar los mensajes con su botón real. No se modificaron las reglas de colocación para hacer pasar la prueba. Pendiente revisar vídeo vertical y repetir UI tras los assets finales.

## Cabeza alta: corrección offline

León y búfalo: 15° en cabeza / 10° en cuello; hiena: 8° / 5,33°; facóquero: 5° / 3,33°. El rinoceronte conserva su corrección previa de 22° / 5°. Se aplica sobre el eje lateral del torso animado, preservando giros y balanceo, sin bloquear la mirada al mundo. Se mantiene la inclinación corporal intencionada de los ataques.

La primera prueba modificaba solo Head: su efecto visible era insuficiente porque parte importante de la cabeza/melena está ponderada a Neck. Se sustituyó por una corrección coordinada de ambos huesos, con rotación local de Head relativa al cuello corregido. No se cambiaron pesos ni huesos. Las imágenes A/B definitivas usan la misma codificación de texturas originales en ambos lados; los vídeos finales prueban los assets comprimidos de producción.

`tools/experiments/lift-beast-head.mjs` modifica únicamente las salidas de rotación de Neck/Head y conserva el BIN original. `audit-beast-head.mjs` comprueba geometría, materiales e imágenes idénticos, canales ajenos intactos y matrices del resto del cuerpo/ropa sin diferencias en 129 fases de cada clip. El león conserva 1.392 canales ajenos a cabeza/cuello. Los rangos de mirada son diagnósticos respecto al bind, no una medida anatómica absoluta.

Se conserva un mínimo de radio de colisión previo en la calibración: levantar la cabeza reducía ligeramente la proyección de la hiena y no debe alterar navegación/escudo. Duraciones, contactos y reglas no cambian. Los nuevos cuatro GLB runtime añaden aproximadamente 95 KiB en conjunto, sin coste de cálculo de pose añadido en ejecución.

## Patas y apoyo: segunda revisión

Corregidos el margen duplicado de altura y los pesos mixtos de pantorrilla en
los vértices bajos del pie. Commit `11835eb4d`, publicado en la rama experimental.
La comparación binaria prueba que la reparación de pesos no modifica ninguna
curva de animación, hueso, textura, normal ni posición de vértice.

Las cinco especies pasan la auditoría de 129 fases por clip, con apoyo estricto
en Walking. Las 125 pruebas dirigidas posteriores pasan; build y paquete
también: 973 archivos, 465.403.353 bytes y 17 GLB runtime. La batería anterior de
156 corresponde a la revisión previa a los pesos; no se presenta como una
ejecución posterior a esta corrección.

Ver `FOOT-SUPPORT.md` para medidas y límites, incluidas pequeñas diferencias
sobre pendiente y ausencia de IK individual. Las capturas finales de pies usan
los assets comprimidos instalados, sin sustituciones de modelo.

PR de revisión en borrador: https://github.com/dossijeo/wild-guardians-africa/pull/215.
Los cinco vídeos finales están regenerados con los últimos assets y todas las
incursiones y pruebas de escudo pasan de nuevo. Rinoceronte comprobado además
en 390×844: interacción correcta, presentación limitada por el HUD estrecho.
La revisión visual se apoya en vídeos completos, hojas de contacto y secuencias
cercanas de locomoción; no equivale a una prueba exhaustiva de colisiones.
Índice final: `README.md`, con hashes y resultados en `FINAL-VALIDATION.json`.
No fusionar a main automáticamente.
