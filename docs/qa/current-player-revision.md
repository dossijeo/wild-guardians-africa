# Revisión solicitada por el jugador · 2026-10-04

Estas decisiones posteriores tienen prioridad sobre las tablas y comportamientos históricos del plan y los labs. Esta lista registra trabajo abierto; no acredita aceptación completa.

| Petición | Estado |
| --- | --- |
| Eliminar partidas en Continuar, incluyendo copias de recuperación | Publicado; pruebas de borrado de ranura y copias de recuperación; falta recorrido visual |
| Evitar avisos consecutivos de reserva por cada intento de planta/muralla | Publicado; falta recorrido visual |
| Corregir SFX 103 repetido sin cierre real | Se ha corregido un contexto vacío; falta escucha y recorrido completo |
| Avisos de eventos temporales, cerrables, fuera del lateral seguro | Publicado; pruebas de caducidad y cierre manual; falta prueba móvil |
| Trabajador contratado va directamente a primera tarea | Implementado; 120 pruebas de rutas y tareas superadas; recorrido visual pendiente |
| Magias directas sobre terreno/cultivos sin modal ni desactivación | Se admiten puntos finitos sin exigir terreno edificable; interacción visual pendiente |
| Multiplicar deja marcado el beneficio hasta la recogida posterior | Implementado; pruebas de recogida y entrega tras caducidad y restauración |
| Murallas: línea física visible al arrastrar y límite según saldo menos contratación | Arrastre, construcción al soltar y devolución de tramo intacto comprobados en móvil; línea durante pulsación y límite cubiertos en dominio, comprobación visual pendiente |
| Temporizador de modos comienza con última colocación exitosa | Publicado; falta recorrido visual |
| Volver centra cámara en centro de trabajo | Publicado; falta recorrido visual |
| Jornales: ancianos 30, jóvenes 40; ajustar reserva y textos | Implementado: ancianos 30, jóvenes 40 y reserva 30; sustituye los costes anteriores |
| Manos HUD del tutorial también en segunda partida | Comprobadas en partida móvil real tras completar la primera entrega; regresión de perfil global y guías 2D/3D superada |
| Incursión garantizada todas las noches, nueva especie en cada una de las primeras cinco | Implementado; umbrales reducidos, presupuesto creciente y límite inicial; recordatorio de escudo disponible al entrar en la finca implementado |
| Cultivos resisten dos golpes y edificios requieren el doble de golpes | Implementado: daño persistente en cultivos y mitad de daño estructural por golpe |
| Recordatorios útiles periódicos de crecimiento y multiplicación | Implementados con disponibilidad, cultivos elegibles, intervalo y guardado; recorrido de partida móvil pendiente |
| Campaña de 100 noches con plantación intensiva responsable y actividad constante | Pendiente; medir tiempo sin nada útil que hacer y ajustar parámetros reales si falla |
| Mala gestión debe poder causar derrota | Comprobada con abandono en las 30 combinaciones de bioma/cultura y con reinversión que descuida las reservas de personal/mantenimiento; mantener estos casos al calibrar la campaña intensiva |
| Poblado inicial de Gran Cañón dentro del cañón en ambas riberas; trabajadores sobre el agua | Implementado; pruebas geométricas y de navegación; comprobación visual pendiente |

## Gran Cañón

El inicio nuevo distribuye unidades nativas a escala 16 en filas a ambos lados del río. Las casas más anchas se orientan longitudinalmente. Render y colisión comparten la misma transformación. El centro de trabajo y una zona cultivable conectada se validan antes de aceptar el inicio.

Cada edificio dispone de un apoyo local; el cauce conserva su altura natural. El movimiento y la posición visual de trabajadores usan la superficie del agua en este bioma. Construir en el agua continúa siendo inválido. Se conservan las posiciones de las partidas anteriores.

Evidencia: `tests/canyon-village.test.js` comprueba cinco culturas y tres semillas, cauce, alturas, tránsito, colisiones sólidas, guardado/restauración y correspondencia entre geometría visible y hull. Los tests de terreno comparan también los seis biomas con la receta original para las plataformas anteriores.

Pendiente: inspección visual renderizada del conjunto y recorrido en móvil. El acceso al navegador se ha recuperado y se ha comprobado con una captura del menú; la vista del cañón todavía requiere inspección específica.

## Jornales revisados

`BALANCE.workers`, perfiles de simulación y perfiles del HUD comparten los costes 30/40. La reserva de compras opcionales es el menor jornal (30); la alerta preventiva se activa en 70 (mínimo más un jornal joven). El mínimo al amanecer suma el jornal mínimo, la semilla más barata si no hay cultivos/cajas y un centro de 800 si falta uno operativo. El dinero histórico guardado no se recalcula.

Las expectativas monetarias de los tests se actualizan por la diferencia exacta de los jornales. Se conservan la exigencia de recorridos completos, la entrega física antes del cobro, el redondeo de reparaciones, la idempotencia y las comprobaciones de derrota. `tests/player-wages.test.js` comprueba precios explícitos 30/40, HUD, reserva exacta y conservación de una operación histórica de 100 al confirmar un contrato nuevo de 30.

La estrategia histórica de una planta seguida de jornadas sin trabajadores comprueba el reloj/guardado; no constituye aceptación del balance solicitado de grandes plantaciones. La estrategia histórica de 16 parcelas con cuatro jornadas iniciales sin contratación tampoco sustituye la campaña intensiva responsable pendiente en esta revisión.

## Primera tarea de la jornada

Los contratos nuevos reservan la primera tarea FIFO alcanzable desde su posición real antes de iniciar el desplazamiento. Sin tareas disponibles conservan su aproximación al centro; quienes regresan de una incursión mantienen su vuelta deliberada. Las pruebas incluyen restauración de partida, desplazamiento continuo, riego, cajas y entrega física antes del cobro.

## Multiplicación persistente

Al lanzar Multiplicar se marcan los cultivos vivos alcanzados; los brotes colocados dentro durante los 15 segundos también quedan marcados. El beneficio no se acumula con otros lanzamientos y se consume en la recogida, incorporado al valor de la caja. Caducar, guardar o restaurar no elimina el beneficio. No se abonan monedas hasta completar el transporte y la entrega. Se conserva la compatibilidad con áreas activas antiguas mediante una inicialización única, sin recorrer cultivos por esta magia en cada paso.

## Bloqueo de ruta en la noche 38

La batería completa tras la salida directa de trabajadores detectó dos facóqueros detenidos mutuamente. Se ha reproducido en el terreno real Sabana/712: se encontraba un punto posterior libre pero se conservaba un waypoint anterior ocupado. La corrección incorpora el tramo de reincorporación solo si respeta obstáculos estáticos y separación entre actores. La regresión grabada exige llegada de ambos, límite de velocidad y validez de cada segmento. Una reproducción adicional del guardado completo bloqueado acaba la incursión y llega al amanecer del día 39 con contratación pendiente. La campaña completa con esta corrección todavía debe ejecutarse; no se aumenta su límite ni se sustituye la aceptación intensiva pendiente.

## Incursiones garantizadas y daño

Todas las noches de campaña tienen un grupo de al menos un animal, incluso sin cultivos. Las cinco primeras presentan facóquero, hiena, búfalo, león y rinoceronte, uno por noche con 2/3/4/4/5 golpes disponibles. Durante estas presentaciones se pueden destruir hasta el 20 % de los cultivos presentes al entrar (redondeado hacia arriba), dejando siempre al menos uno vivo. Después de alcanzar ese límite se pueden seguir dañando construcciones. Después se utilizan composiciones aleatorias legales con umbrales de atracción 0/100/300/800/2000 y probabilidad nocturna 100 %. Las incursiones diurnas mantienen su condición y probabilidad; tras liberar la campaña no hay ataques.

Los cultivos acumulan un golpe sin morir y se destruyen al segundo; el daño se guarda y se valida al restaurar. Daños estructurales por especie: 20/25/35/40/60. Las pruebas conservan animaciones completas, presupuesto de golpes, reservas exclusivas y separación de cuerpos. Se han probado las cinco especies en las seis entradas de bioma reales cerca de cámara o finca. Falta la aceptación del balance con grandes plantaciones y el recordatorio de escudo en cada incursión.

## Petición adicional: cámara de incursión

Implementado: viaje suave de 1,2 segundos hacia el primer animal cuando entra en la finca, una vez por incursión y siguiendo su posición durante el viaje. El desplazamiento conserva orientación y distancia y respeta la altura del terreno. Un gesto manual o Volver lo interrumpe sin reiniciarlo; menús y ocultación congelan el viaje. El foco de la incursión se guarda para no repetirlo tras restaurar.

La cuota inicial de cultivos y el contador de destrucciones se guardan con la incursión. Pruebas con 1/2/5/10 cultivos confirman daño real, conservación de al menos una planta, gasto del presupuesto restante y restauración determinista. El límite solo corresponde a las primeras cinco presentaciones; las incursiones posteriores mantienen el peligro normal.

Evidencia de cámara: 38 pruebas de recorrido, control manual, pausas, restauración y cámara en seis biomas. La prueba de navegador con WorldScene real en Sabana/Mapungubwe parte de una vista alejada y termina con el foco en las coordenadas de la bestia, rig cargado y sin errores. Captura: `docs/qa/raid-camera/sabana-arrival.png`. El recorrido completo con HUD móvil sigue pendiente.

## Regresiones de combate con el daño revisado

64 pruebas superadas de colapso, límites económicos, transporte de cajas, VFX y audio. Los oráculos de daño usan 20/25/35/40/60 y conservan golpes animados completos. Las pruebas de pérdida del último centro parten ahora de un centro previamente dañado, para seguir verificando los límites 799/800 y la derrota antes de victoria con un presupuesto legal de incursión. La prueba de colapso desde 600 HP permanece independiente y exige todos los golpes reales. El transporte que cruza el amanecer espera la salida física del último animal antes de contratar.

La protección introductoria se ha comprobado con las cinco especies y 1/2/5/10 cultivos: 28 pruebas superadas, incluida destrucción real, gasto completo de golpes y guardado/restauración determinista.

## Salida de incursión en Gran Cañón/Musgum

Una campaña adversa detectó un facóquero agotado en la noche 10: la cuadrícula no conectaba su salida fraccionaria con la finca, aunque el pasillo físico hasta el punto de entrada era transitable. Si la ruta de salida falla, se busca un regreso al punto de entrada original y se añade el tramo final solo si es libre de obstáculos. La búsqueda adicional es acotada y usa la caché existente; no altera velocidades, presupuesto, posiciones ni el límite de duración del test.

La regresión conserva el guardado real y exige pasos de máximo 0,38 metros, colisiones válidas, restauración durante el regreso y salida antes de abrir contratación. 46 pruebas de incursiones y rutas pasan. La campaña adversa Gran Cañón/Musgum termina ahora en derrota económica tras 23 noches resueltas; la matriz completa se vuelve a ejecutar.

La estrategia adversa de una sola siembra inicial, jornal pagado cada día y ausencia de replantación, reparación o magias sustituye la expectativa obsoleta de victoria por abandonar la finca. Antes de corregir el pasillo de salida pasaban 29 de 30 combinaciones; la combinación restante pasa con la corrección. La batería completa actual está en ejecución. Este caso no acredita el balance intensivo responsable de 100 noches, que sigue pendiente.

## Recordatorios de magia

Escudo se recuerda una vez por incursión cuando un animal en movimiento o ataque entra en la envolvente de la finca y el poder está disponible. El aviso tiene prioridad sobre explicaciones informativas, conserva las pendientes y desaparece si el poder se usa o la incursión termina. La marca de incursión se guarda, evitando repeticiones tras cargar.

Crecimiento requiere plantas creciendo, con el primer riego completado y sin riego pendiente. Multiplicar requiere cultivos vivos sin beneficio previo y trabajadores disponibles. Se excluyen plantas cubiertas por otra zona mágica. Cada tipo deja 120 segundos simulados entre avisos, con al menos 75 segundos entre recordatorios pacíficos; los textos iniciales también reinician ese intervalo. La elegibilidad pacífica se comprueba cada dos segundos simulados, sin recorrer la plantación por cada fotograma.

Los avisos permiten cierre, caducan con el lector existente, no muestran manos ni añaden pausas. Español e inglés están incluidos. 54 pruebas de tutorial, traducciones y guardado pasan; build correcto. La presentación nativa del aviso de Multiplicar en inglés se revisó a 844×390 y 390×844, con cierre manual comprobado y capturas en docs/qa/magic-reminders. Son pruebas del panel aislado con HUD real, no aceptación del recorrido de una partida móvil completa.

## Fuente reproducible del balance revisado

El generador cargaba solo el JSON histórico y podía reponer jornales, atracción y daño antiguos al regenerar. Ahora aplica content/balance/player_revisions.json sobre el original: inicio 1500, jornales 30/40, daños 20/25/35/40/60 y umbrales nocturnos 0/100/300/800/2000 con incursión garantizada. Game.newGame toma el importe inicial de ese balance generado; las partidas existentes conservan su libro monetario. verify:balance comprueba reproducción sin escribir archivos y se ejecuta en GitHub Actions. Pasan 39 pruebas de economía, reglas y guardados, además del verificador de balance. El CI d4acd5a superó las 1662 pruebas completas antes de este ajuste de fuente.

## Simulación de plantación intensiva en curso

tools/check_intensive_farm.mjs contrata desde el primer día, busca parcelas transitables nuevas sin un cupo fijo de cultivos y reinvierte entregas reales. La política responsable reserva jornales conforme crece la finca (estimación inicial de 12 cultivos por trabajador), conserva dinero de mantenimiento y solicita reparaciones por la cola FIFO normal. La entrada de animales utiliza la pose de cámara nativa centrada en el centro de trabajo. La siembra se limita a una colocación por segundo simulado para representar una interacción posible del jugador. No hay órdenes manuales de cosecha ni alteraciones de dinero, crecimiento, navegación, RNG, presupuestos o daño.

Se registran por jornada saldo, personal, reservas, siembras, entregas, pérdidas, cola pendiente, reparación, acciones y periodos sin acciones útiles. La auditoría independiente verifica el libro monetario desde 1500, cada cobro al entregar, una caja por planta, madurez y todos los riegos obligatorios, más restauración. Para 100 días exige victoria real tras resolver la incursión final; una derrota no se transforma en aceptación.

Dos pruebas superadas: apertura intensiva de tres jornadas con cámara real y derrota por reinvertir sin reservas, con más de cien cultivos vivos y numerosas entregas reales. Un diagnóstico previo de 20 noches con entradas por borde alcanzó 312 cultivos vivos, 1984 entregas y seis reparaciones completadas; no sustituye la aceptación con entrada inmediata por cámara. Esa campaña completa está en ejecución. El ajuste de parámetros del juego y de tiempo sin acciones útiles sigue pendiente del resultado; tampoco queda aceptada aún la campaña mixta o la matriz de culturas/biomas.

## Colocación inicial guiada en móvil

La selección del primer centro y del primer cultivo centra ahora la cámara en el mismo punto legal utilizado por la mano 3D. Antes, ese punto podía quedar fuera de la vista inicial del móvil. No se cambia la cámara para herramientas sin guía, posteriores construcciones o tutorial omitido.

Recorrido real en Gran cañón / Mapungubwe a 390×844: Continuar mostró la pantalla de carga antes del HUD; se seleccionó y colocó el centro señalado (1500→700), se comprobó el orden ascendente de los ocho cultivos, se plantó mijo en el punto guiado (700→695), la contratación apareció automáticamente tras caducar el modo plantar y se contrató una mujer joven (695→655). La contratación cabía en pantalla y no tenía botón de cierre. Capturas en docs/qa/mobile-first-day. Pasan 15 pruebas de guía, pausa y cámara, y build. Esto no acepta todavía el recorrido completo del día, el riego visual ni las manos en una segunda partida.

Continuación del recorrido: el brote creció y su primera caja llegó al centro antes de la noche (655→664), con el mensaje nativo de primera entrega. Se guardó y volvió al menú; al iniciar otra partida apareció la opción de omitir el tutorial básico, acreditando el perfil completado. Sin omitirlo, la mano 2D volvió a señalar Construir en móvil. Capturas first-delivery-portrait y second-game-hud-hand-portrait documentan el estado posterior a la entrega y la guía de la segunda partida. No se ha revisado todavía el detalle visual del chorro de riego ni la primera incursión móvil.

tests/guided-opening.test.js verifica 30 combinaciones (seis biomas × cinco culturas) con el terreno, vegetación y poblado nativos de la semilla 712: utiliza el punto del primer brote ofrecido por la mano, paga semilla y contrato, comprueba que el trabajador permanece fuera del cultivo al regar, completa todos los riegos manuales y la entrega física antes de la noche, con una sola caja y un único cobro. Las 30 pasan, sin cambiar dinero, tiempos, rutas ni crecimiento. Una regresión adicional comprueba que un perfil global completado no oculta las guías de una nueva partida y que omitirlas explícitamente sí las desactiva. Las diez pruebas de secuencia y pausa pasan. Esto cubre la apertura guiada; no sustituye la campaña intensiva de 100 noches ni una comparación visual de todas las culturas.

## Gesto de muralla en móvil

En una segunda partida real de Gran cañón / Mapungubwe, a 390×844, un arrastre sobre suelo libre construyó dos módulos de adobe al soltar (655→585), sin confirmación intermedia. Tocar un tramo abrió su estado 300/300 PV y el botón de devolución de 35 monedas; eliminarlo dejó un único tramo y saldo 620. Captura wall-selected-portrait registra el panel de selección. La comprobación no captura la línea mientras el dedo sigue pulsado ni demuestra visualmente el límite monetario; las pruebas de gesto y presupuesto cubren ambos comportamientos lógicos.

Se corrigió la caducidad del modo durante un segundo arrastre: los diez segundos desde la última colocación no cancelan un gesto que sigue pulsado. Al construir al soltar se reinicia el plazo; cancelar el gesto no lo reinicia y libera la protección. Siguen vigentes las cancelaciones por cambio de herramienta o permisos. Pasan 32 pruebas de gestos, presupuesto, reserva, devolución proporcional y usabilidad, además de build.

## Inspección actual de regadera

Visor work-vfx.html con mujer joven, Sabana/Suajili, terreno y modelos nativos, centro/semilla/contrato pagados. La UI avanzó hasta el riego real a 29,30 s simulados y congeló la presentación en 1,075 s del VFX: 45 gotas, cuatro sprites, trabajador a 0,83 m del cultivo. El diagnóstico compara la boquilla animada Can_Nozzle con el emisor transformado del runtime y mide 0,000002738 m de separación; error vacío. Captura watering-young-female.png y árbol accesible watering-young-female-diagnostic.txt en mobile-first-day. Siete pruebas actuales de emisor y aproximación pasan.

Esta inspección corresponde a un perfil y un fotograma en el visor integrado con WorldScene; no acredita todavía los cuatro perfiles durante todo el clip, otras culturas/biomas ni el detalle del chorro dentro del HUD móvil. Las posiciones del trabajador y del cultivo se conservaron durante la inspección; la pausa QA sirve para observar la animación, sin sustituir el contrato o el trabajo por estados preparados.

## Primera incursión, amanecer y lanzamiento directo

La partida real Gran cañón / Mapungubwe se reanudó durante la primera incursión: el facóquero estaba visible en el encuadre y apareció la explicación de Escudo. Se terminó la noche sin derrota y se abrió la contratación del día 2 a 07:05, saldo 629, con la mujer joven anterior preseleccionada. La captura dawn-hiring-landscape.png comprueba el panel a 844×390, sin botón de cierre, cuatro perfiles y confirmación visible. La inspección del animal anterior ocurrió a 1280×720: no acredita aún el encuadre nocturno en móvil horizontal.

Se confirmó el contrato (629→589) y se seleccionó Escudo desde Magias. Un toque en suelo libre a 844×390 lo lanzó sin modal intermedia; al reabrir Magias la tarjeta estaba deshabilitada con 71 segundos de recarga, demostrando activación. El lanzamiento ocurrió de día, después de la incursión, por lo que no prueba todavía protección efectiva en combate móvil ni colocación sobre cultivos. La tarjeta contenía una instrucción obsoleta de previsualización y confirmación: ahora reutiliza el texto de aplicación directa ya traducido en el catálogo. Dieciocho pruebas de tarjetas, revisiones UI y recordatorios pasan, además de build.


## Retirada del flujo obsoleto de confirmación de magias

La inspección de main.js encontró pendingSpell y spellConfirmPanel conservados aunque ningún camino asignaba una previsualización. Se retiraron esa variable, el panel de confirmar/cancelar y sus condicionales de limpieza/refresco/Escape. onPick mantiene el lanzamiento directo antes de procesar la selección de plantas, utilizando el punto de terreno o la entidad seleccionada, sin cancelar el poder al tocar un cultivo. Se conserva Game.previewSpell como validación y el visor de previsualización QA independiente.

Pasan 24 pruebas de tarjetas, validación de poderes, avisos, guardado y recordatorios, además de build. Esta limpieza no añade una nueva aceptación visual: el navegador integrado agotó el tiempo de sincronización al retomar la pestaña de juego, que sigue presente en el inventario. La inspección móvil de magias sobre plantas sigue pendiente; no se deduce de las pruebas de dominio ni del lanzamiento sobre suelo libre comprobado anteriormente.


## Magia centrada en el cultivo seleccionado

La rama de lanzamiento directo prefería el punto de intersección del terreno incluso cuando pick había identificado una planta viva. Una planta alta puede ocultar suelo varios metros detrás de ella, de modo que el radio mágico no la cubra. Ahora castPickedSpell, usado por onPick, prioriza las coordenadas lógicas del cultivo seleccionado. Los toques en suelo libre conservan su punto; una estructura sin intersección de suelo conserva el fallback anterior. No hay confirmación ni cancelación del modo mágico al tocar cultivos.

La regresión construye un rayo 3D dirigido a un cultivo elevado y acredita que su punto de suelo queda fuera del radio de cada uno de los tres poderes. El lanzamiento de producción crea el área sobre la planta, activa cooldown y un único evento; Multiplicar marca su siguiente cosecha. También cubre replay del mismo comando, planta muerta, suelo libre, cielo vacío y rechazo de recarga sin mutar snapshot. Pasan 24 pruebas de colocación, validación, tarjetas y recordatorios, además de build. La geometría del rayo es sintética y la partida utiliza navegación plana de prueba: no es una nueva aceptación visual con GLB ni móvil.

Una pestaña nueva recuperó el menú real tras los errores de sincronización de la anterior. Queda pendiente verificar visualmente este centrado durante el recorrido móvil, junto con el resto de requisitos abiertos.


Continuación en la pestaña recuperada, a 390×844: se cargó la partida real Gran cañón/Mapungubwe del día 2 (589 monedas), se eligió mijo y se colocó un brote con cobro normal (584). Se abrió Magia, se eligió Escudo disponible y se tocó el brote visible. No apareció confirmación; al reabrir Magia la tarjeta estaba deshabilitada con cooldown, acreditando activación. shield-crop-cooldown-portrait.png y shield-crop-cooldown-ax.txt registran la recarga durante esa jornada. La primera captura posterior al toque no muestra una barrera inequívoca; no se usa para afirmar visibilidad del área ni protección.

El gesto sobre el brote y la recarga se comprobaron en la UI; el centrado numérico en la entidad lo acredita la prueba de producción, no una lectura de estado privado del navegador. El cultivo seguía vivo y el trabajador llegó; no se preparó el reloj ni se alteró economía. Se pausó a las 20:16, se guardó y volvió al menú, y se restauró el viewport del navegador. Esta inspección no cubre Escudo bajo golpes de animales, Crecimiento/Multiplicar en móvil ni una campaña completa.
