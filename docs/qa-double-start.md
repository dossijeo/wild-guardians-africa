# Doble activación de inicio: QA-002

Entrada de producción `cecc534`; fixture y evidencia `0e4d782`.
Caso verificado: dos activaciones entregadas, un mundo y una ranura adicional;
el inicio simulado original queda cancelado.

Los intentos de doble clic físico anteriores se interrumpían al desmontarse el
iframe y no demostraban la segunda entrega. Este ensayo usa un
[fixture de observación](../tests/browser/double-start.html) que importa
src/app/main.js sin sustituir sus handlers. Se navega mediante la UI real del
menú y el selector hasta Sabana/Mapungubwe. Un botón público de QA ejecuta
dos button.click() síncronos sobre el confirmButton original. Son activaciones
DOM programáticas (isTrusted=false), no dos clics físicos acreditados.
No se invoca startGame directamente ni se envían mensajes de inicio fabricados.

El contador del botón registra dos eventos; el selector emite dos eventos
wildguardians:new-game y el adaptador original cancela ambos. El menú original
reenvía dos mensajes que llegan al documento del juego. Su listener conserva
la validación de origin/source y startGame conserva su bloqueo de carga.
Tras retirar el iframe, las solicitudes de su antiguo documento se descartan.
No se desactiva ninguna de esas protecciones para hacer pasar la prueba.

## Fallo y reintento

En el primer intento se arma un fallo único de fetch del JSON de bioma desde
el fixture. Es inyección controlada de un rechazo, no caída real del servidor:
la carga falla antes de construir WorldScene. Los dos mensajes llegan; no se
crea ningún canvas de juego ni ranura, y vuelve el menú original. Las ocho
ranuras previas conservan todos sus datos.

Al reabrir Juego nuevo, las dos activaciones se repiten sin el fallo:

- Dos clics y dos eventos cancelados del selector; dos mensajes al juego.
- Una sola creación de canvas#world, un canvas vivo y cero iframes de menú.
- Una ranura nueva Sabana/Mapungubwe, 1000 monedas, cero construcciones,
  tiempo cero y pausas intro/tutorial-reading.
- Ocho ranuras previas intactas; total de ranuras pasa de ocho a nueve.
- Cero eventos wildguardians:game-started del lab y consola sin errores/avisos.

El contador MutationObserver conserva cada canvas añadido, aunque se retire
después. La fuente de producción crea WorldScene una vez por ese canvas en
esta ruta; no se cuenta el diorama propio del menú como mundo de partida.
La API pública del selector conserva su campo heredado simulation:true:
el ensayo acredita la cancelación del evento antes de los temporizadores del
lab, no una modificación de ese metadato del original.

La prueba se ejecuta en el origen QA 5180, separado de la partida del usuario
en 5173. Solo crea la ranura normal del nuevo juego de ensayo. No fabrica una
semilla fija ni acredita las otras 29 combinaciones de QA-001. El rechazo de
fetch temprano no cubre todos los fallos de modelos, shaders o carga parcial
de QA-151, que continúa parcial.

[Informe del fallo](qa/double-start/failed-report.json),
[informe final](qa/double-start/final-report.json),
[DOM de partida](qa/double-start/started-dom.txt),
[captura final](qa/double-start/started.png) y
[consola](qa/double-start/console.json).

## Texto del selector

Durante el ensayo se detectó una indicación española que aún hablaba de
«iniciar la simulación». `b112d8d` la cambia a iniciar la partida, conserva
su traducción inglesa y actualiza prepare_selector para futuras extracciones.
Los originales de referencia no se modifican, ni tampoco los handlers de inicio.
10/10 pruebas de i18n aprobadas (cero fallos/omisiones, 251,8926 ms), build
aprobado (139 módulos, 5,48 s; aviso de tamaño existente) y paquete web aprobado:
559 archivos, 379783623 bytes, 796 enlaces relativos, 20 GLB de runtime,
ningún duplicado original. Este cambio de texto no se atribuye como corrección
de la doble activación: el comportamiento probado ya era correcto.
