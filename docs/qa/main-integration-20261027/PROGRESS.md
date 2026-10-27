# Integración a main y picos residuales

Objetivo autorizado: integrar cambios listos y después reducir picos del juego real. No se ha fusionado aún a main.

Recuperación: recovery/visual-before-main-20261027 apunta a0737a20ad. Diff de archivos previamente modificados guardado en .codex-tmp/pre-main-uncommitted-20261027.patch; no se borraron ni incluyeron indiscriminadamente. Origin/main inicial d5d48988 (merge PR215); rama inicial145commits propios/1remoto. Integrado origin/main sin conflictos en c1fea7bb6.

Bloqueo de distribución resuelto sin comprimir atlas: cinco .bin de geometría anterior seguían copiándose tras reemplazar sus manifiestos. Confirmados contra origin/main, referencias actuales y escaneo de textos empaquetados. Exclusión explícita en retired-biome-geometry.json; originales conservados para QA y Gran Cañón intacto. Ahorro37,437,830bytes. Incluidas exclusiones locales ya preparadas de tree-candidates/LOD, verificadas por gate.

npm run build y npm run test:web-package pasan:989archivos,484,450,440bytes,855enlaces relativos,17GLB runtime. Gate verifica ausencia de referencias a binarios retirados y presencia del reemplazo por bioma. No se elevan límites ni cambia calidad de atlas. Este resultado sustituye la limitación de tamaño anterior; no certifica por sí solo flujo interactivo/Tauri.

Pendiente: pruebas conjuntas, comprobación de distribución ejecutándose, PR/fusión remota autorizada y perfilado de picos residuales. Siete archivos locales ajenos a este cambio permanecen pendientes de revisión, fuera del commit de empaquetado.

## Cola posterior al merge — instrucciones del usuario 2026-10-27

- Mantener como trabajo principal la atribución y reducción de picos residuales con el juego real.
- Pendiente: anclar el pie del tótem del menú a una capa de suelo cercana que se mueva con él durante el acercamiento, conservando el parallax del fondo lejano. Validar que no parezca flotar.
- Pendiente: revisar overlays de pantalla completa (magia, daño crítico, victoria y similares): duración perceptible de2–3segundos y política que evite acumulación/saturación al encadenar efectos. Conservar respuesta inmediata y legibilidad de juego.
- Aparcado por petición explícita: LOD de trabajadores y bestias. No generar ni sustituir versiones low-poly automáticamente; fuera de la cola activa.

Estas tareas de menú/overlays se ejecutan después del merge, no son requisitos previos que deban retrasarlo. La suite completa de integración sigue en proceso82846; no hay resultado terminal todavía.

## PR216 y validación conjunta

Push1e48e3f13 confirmado en origin; PR216 creada en borrador. Suite completa82846 continúa; primer fallo confirmado asset-surface.test.js presupone tres texturas únicas. Nuevos árboles usan textureSets. Prueba actualizada para verificar solicitudes exactas, compartición dentro de cada set y separación entre sets;3tests del archivo pasan. No se modifica producción para acomodar el test.

Paquete funcional30337 termina sin errores/404: biblioteca cuatro labs, entrada real durante carga, nueva partida Manglares, guardar/salir/continuar, HUD recuperado y workers pthread desde ruta anidada. Inspección visual de carga confirma diseño nuevo. Captura final tras recarga muestra franjas de agua cruzando árboles lejanos: NO dar por válida aún la imagen. Nueva corrida captura inmediatamente y tras30s para distinguir preparación pendiente de artefacto persistente. No medir rendimiento mientras suite completa comparteCPU.

## Suite completa: fallos conservados y primeros ajustes

Proceso82846 terminó exit1:4997tests,4916pass,19fail,62skipped,560.327s. full-suite-failures.json conserva ubicación/detalle. No declarar verde ni mergear todavía. Tres fallos resueltos por contratos de test: atlas múltiples (commit145de98), occupied ahora distingue waitReason contention, y doble de VfxLibrary carecía de enableStableWorldLights. Siete tests de intención/carga pasan tras estos últimos ajustes, sin cambiar producción.

Pendientes de atribuir: contactos/bounds nuevos, hashes/recetas de atlas/hulls, cinco casos legacy de salida Manglares, tres casos de navegación/murallas y catálogoSFX. No actualizar hashes ni expectativas de rutas a ciegas. Proceso89322 de recarga/asentado sigue activo y ya produjo captura inicial; no reiniciado.

## Recetas históricas y datos derivados de atlas

Confirmado git380a0a2cd^ contiene exactamente el manifiesto SHA256fe553e32... esperado por native-inputs.zip. Conservado como tools/sources/far-atlases/reviewed-native-manifest.json; tests de reconstrucción/piloto solar verifican ese archivo histórico, no sustituyen sus hashes por los generados. Tests actuales far-atlas-assets siguen verificando44outputs aprobados y RGB transparente.9tests pasan.

Regenerado hull conservador desde alpha de44atlas actuales con herramienta existente (margen16pixels,umbral0),guardado aparte en generated-atlas-hulls.json. Test comprueba hashes reales y cobertura de cada pixel alpha en todas las celdas; ya no exige silueta idéntica al arte anterior.4tests pasan. No modifica geometría/runtime ni se usa para afirmar mejora de rendimiento.

CatálogoSFX regenerado con auditor oficial; diff conserva126originales,101asignaciones/25sin asignar y clasificaciones,actualiza líneas y hashes de código tras cambios de raids.3tests pasan. No cambia audio ni cuenta como validación auditiva nueva.

Quedan9fallos originales por resolver:1contactos/bounds,5legacy raid-safe-exit y3navegación/murallas. No eliminar aserciones de rutas ni rebajar validación sin diagnóstico.

## Límites de árboles: regresión real corregida
El importador conservaba min/max del árbol sustituido. ContactPrototypes usa esos datos para el radio de contacto; no era una expectativa obsoleta. Recalculados los límites exactos LOD0 de los cinco packs aprobados, sin alterar geometría, texturas ni Gran Cañón. Herramienta refresh-approved-tree-bounds.mjs reproducible e importador de promoción corregido. Los tres tests de contactos originales pasan sin modificar sus aserciones. Quedan ocho fallos originales; reproducidos los de wall-shortening (estado unknown=3) y puerta de granja (0 puertas), pendientes de diagnóstico. No se han cambiado sus expectativas ni declarado integración lista.

## Diagnóstico diferencial de navegación
La prueba original wall-shortening pasa con WASM de origin/main y falla con el actual, manteniendo JavaScript y snapshot. Diagnóstico conservado en wall-policy-diagnostic.json: tres de cuatro perfiles pasan de cultivos protegidos (1) a abiertos (0); el cuarto mantiene protección y obtiene ruta física. En los tres abiertos, la consulta específica de ataque a muralla retorna unknown antes de examinar candidatos. Ampliar residencia de 9 a81chunks no cambia el resultado. Esto encaja con agua transitable, pero falta verificar rutas directas a cultivos y adaptar la prueba conservando cobertura de acortamiento contra perímetros verdaderamente sellados. No se ha eliminado ninguna aserción del test original ni declarado corrección final.

## Rutas y salidas verificadas con agua transitable
Wall-shortening: confirmadas rutas nativas directas a cultivos para los tres perfiles abiertos y a pared para el cuarto. Test actualizado comprueba destino real, extremo de ruta y cada segmento con segmentClear; exige exactamente3rutas de cultivo y1de pared. Pasa. Raid-safe-exit: las cinco culturas completan incursión, recarga y salida física tanto en terreno actual como legacy;14tests pasan. La regresión de objetivo inalcanzable se conserva en una prueba independiente de la política del agua: retirada física tras recarga, sin consumir golpes ni dañar el centro; también pasa. No se cambia producción. Quedan dos fallos originales: alternativa de ataque occupied y puerta de granja; continúa pendiente la comprobación visual de franjas de agua y validación final conjunta.

## Últimos dos fallos originales atribuidos
El snapshot occupied ahora selecciona nativamente plant-10755 con ruta física válida; se conserva por separado el contrato blocked/occupied mediante respuestas explícitas del planificador, verificando selección alternativa real plant-10708 y todos los segmentos. La cotización de granja conserva56piezas y560coste; cinco módulos no edificables dejan una abertura transitable, por lo que0puertas es correcto. Se verifica cruce nativo found bajo las paredes propuestas y se mantienen aserciones de cotización sin mutación, sin rutas ni previews ni cambios de sectores. Cuatro pruebas dirigidas pasan (16otras omitidas por filtro). Todos los19fallos originales tienen corrección o adaptación razonada y validación dirigida; falta suite completa actual y revisión visual antes del merge.

## Revisión visual de transición al mundo
Inspeccionadas juntas package-reload-settle.png y package-reload-settle-settled.png: misma partida/cámara, la primera presenta franjas de agua delante de impostores cercanos;30s después, con modelos3D presentes, desaparecen. Esto demuestra un defecto transitorio en esa ejecución, no certifica la causa técnica ni justifica dejarlo sin revisar. Añadida exportación de snapshot IndexedDB al harness después de guardar y antes de continuar para reproducir exactamente cada futura captura (archivo companion fixture). node --check pasa. Suite final23449 sigue viva; no se reinicia ni se interpreta como finalizada.
