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
