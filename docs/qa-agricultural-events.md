# Sorteo nocturno y persistencia de eventos agrícolas

Pruebas `6793595`, sobre la lógica de eventos y la corrección agrícola `1090300`.
QA-127 y QA-128 verificados en simulación/persistencia; QA-126 verificado
con la continuación visual y corrección `541c551` descritas abajo.

[97 pruebas dirigidas](qa/agricultural-events/directed.txt), cero fallos/omisiones,
3.281,5029 ms. Incluyen eventos, tareas agrícolas, cosechas/cajas, economía,
contratos, snapshots e interpolación de mensajes en inglés/español.

## Cobertura del sorteo

El fixture contiene un centro y 60 plantas pagados (20 mijo, 20 plátano,
20 girasol), con primer riego satisfecho y crecimiento preparado en el 10 %.
Tiene crédito de QA explícito y está en postcampaña para excluir ataques.
Las rutas y el terreno se doblan; no acredita navegación o rentabilidad natural.

Se buscan semillas reales del PRNG con `imul(i,2654435761)`, conservadas en el
estado, y se entra en la noche mediante `Game.tick`, sin sustituir tiradas.
Se alcanzan las 27 combinaciones legales: helada específica/global, plaga
específica y tres positivos específicos/globales, cada uno con tres intensidades.
Se comprueban intensidad, límites del porcentaje negativo y scope legal. Esta
cobertura de ramas no es una medición estadística de la distribución aleatoria.

La selección queda estable durante la noche, con una sola entrada `NightStarted`
y sin mensaje anticipado. También se comprueba una noche sin evento: avanzar
no modifica el RNG ni vuelve a sortear. Al amanecer aparece un solo aviso y
un `AgriculturalEventApplied`; no hay cargos, muertes ni derrota del fixture.

## Guardado y aplicación, QA-127

Las 27 combinaciones recorren `SaveRepository.save/load`, con almacenamiento
en memoria que implementa get/set/remove. Se compara la partida continuada
con la cargada: snapshot completo idéntico después del amanecer, mismos
destinatarios, RNG, efectos, saldo, mensajes y cola de tareas. Se prepara
expresamente tiempo 599,9 para comprobar la frontera, sin afirmar que se haya
renderizado o simulado una campaña completa.

Se verifican los efectos cuantitativos sobre cada planta y la ausencia de
modificaciones en las no seleccionadas. Las selecciones negativas contienen
exactamente `floor(elegibles × fracción)` IDs únicos, dentro de su especie/scope.
La helada resta el progreso aprobado, la plaga programa su penalización de agua,
la noche favorable cruza los checkpoints creando las deudas necesarias y los
otros positivos guardan el bonus correcto de cosecha/tolerancia.

Guardar después de aplicar y volver a invocar la aplicación no cambia ningún
byte del snapshot. Una partida cargada en la pausa de contratación tampoco
avanza ni repite el evento al recibir una petición de avance de 600 s.
No se acredita almacenamiento del navegador, navegación entre ranuras ni UI.

## Elegibilidad, QA-128

Se prueban 2.000 semillas con cuatro mijo vivos, cinco plátano vivos y girasoles
muertos. Toda selección específica elige plátano; las plantas muertas no cuentan.
Con cuatro vivos de cada especie nunca aparece un destinatario específico.
Si se sortea scope específico sin candidato, la implementación no genera evento;
no elige una especie inválida ni convierte esa tirada en un segundo sorteo.
El alcance global sigue siendo posible y se comprueba por separado.

La suite completa de CI de esta nueva cobertura todavía no se atribuye a estas
pruebas. El build/paquete de la misma lógica publicado en `1090300` permanece
documentado en [QA de riego mágico](qa-agriculture-season.md); este commit añade
pruebas sin cambiar el juego.

## Anuncio visible al amanecer, corrección 541c551

La primera captura mostró el aviso desenfocado detrás de la contratación:
[estado previo](qa/agricultural-events/dawn-es.png). El mensaje existía en DOM,
pero esa imagen no acredita que el jugador pudiera leerlo antes de contratar.
Ahora el evento aplicado conserva día e ID del aviso. La contratación muestra
su texto dentro de la modal original, usando su tipografía existente, sin
modificar la selección, el presupuesto ni el efecto agrícola. Avisos antiguos,
no aplicados o retirados del historial no se presentan como eventos del día.

Browser real en origen independiente 5179, Sabana/Mapungubwe, semilla de terreno
712, doce posiciones legales con Navigation original, centro/semillas pagados,
crédito de QA de 5000 monedas y noche preparada expresamente en 599,9 s.
Los candidatos usan tiradas reales del PRNG; no se acredita la probabilidad
estadística ni una campaña natural. Se encontró Buena temporada específica
para mijo, intensidad media: bonus 20 %, sin mensaje ni aplicación en
[el estado previo](qa/agricultural-events/before.json).

La primera ejecución consumió cuatro lecturas de tutorial pendientes en el
fixture tardío. La fixture final marca esos mensajes vistos explícitamente para
centrar la prueba en el amanecer; no cambia el tutorial del juego.

La partida se carga desde la sección Continuar del menú original. Al amanecer,
la contratación sigue en pausa a las 07:05 del día 102 y el aviso es legible
antes de contratar en [inglés](qa/agricultural-events/hiring-notice-en.png) y,
tras guardar, cambiar idioma desde Opciones y cargar la misma ranura, en
[español](qa/agricultural-events/hiring-notice-es.png). Se conserva el aviso
habitual del HUD al cerrar contratación, como muestra la
[recarga anterior](qa/agricultural-events/restored-en.png).

El [estado recargado de la corrección](qa/agricultural-events/notice-restored.json)
conserva tiempo 0, pausa hiring, saldo entero 5140, doce plantas vivas con
crecimiento 14 y bonus 0,2; exactamente un AgriculturalEventApplied del día 102,
con los doce destinatarios y el noticeId correspondiente. No se repite sorteo,
aplicación ni cobro al recrear la WorldScene. Sólo se guarda la ranura
qa-agricultural-events en este origen, sin tocar el origen del usuario en 5173.

[Consola final](qa/agricultural-events/notice-console.json): cero errores y cero
warnings. Pestañas de QA cerradas y Vite detenido. Las capturas iniciales se
conservan como diagnóstico previo, sin confundirlas con el anuncio corregido.

[68 pruebas dirigidas](qa/agricultural-events/notice-tests.txt), cero fallos ni
omisiones, 2.977,7479 ms. [Build/paquete](qa/agricultural-events/notice-build.txt)
aprobados: 554 archivos, 379.689.920 bytes, 794 enlaces relativos y 20 GLB runtime.
La [CI 37112966943](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37112966943)
sobre `6543fbb`, que incluye la corrección `541c551`, terminó correctamente:
**824/824 pruebas**, cero fallos, 301.495,637088 ms. Verificadores, build y paquete
aprobados; [log](qa/agricultural-events/notice-ci-log.txt) y
[metadatos](qa/agricultural-events/notice-ci.json). No acredita las correcciones
posteriores de guardado.
