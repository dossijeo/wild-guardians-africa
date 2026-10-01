# Wild Guardians — Plan Maestro definitivo

**Edición consolidada 2.0 · 1 de octubre de 2026**  
**Diseño:** Gabriel  
**Destino:** documento de referencia para crear e implementar el repositorio del juego.  
**Sustituye:** `Wild_Guardians_Plan_Maestro_de_Trabajo.md`, versión 1.0.

> **Cultivar de día, proteger de noche y sobrevivir a cien noches para liberar al poblado de su maldición.** Después, continuar opcionalmente en un mundo procedural sin ataques y fundar tantos poblados completos como permita la economía.

Este documento consolida las decisiones vigentes, no todas las propuestas que aparecieron durante la conversación. Las correcciones de Gabriel prevalecen sobre las formulaciones anteriores. La arquitectura, los contratos de integración y las pruebas constituyen una **estrategia de implementación**, no funcionalidades que ya estén implementadas por el mero hecho de figurar aquí.

Se han inspeccionado estáticamente **ocho laboratorios**, además del borrador original; se han extraído y comprobado datos de sus recursos. No se ha ejecutado una partida integrada ni una validación visual completa de los modelos originales ausentes. Las comprobaciones acotadas del apartado 26 distinguen un dato no recuperado de una mecánica que haya que rediseñar. No es necesario recibir todos los HTML pesados para empezar el desarrollo.

## Índice

- [1. Autoridad de las reglas y uso del documento](#section-01)
- [2. Experiencia, alcance y contenido final](#section-02)
- [3. Material recibido y estrategia de reutilización](#section-03)
- [4. Flujo de producto y estados de partida](#section-04)
- [5. Reloj, jornada y aceleración](#section-05)
- [6. Mundo procedural, colocación y asociaciones](#section-06)
- [7. Economía canónica](#section-07)
- [8. Agricultura, riego y crecimiento visual](#section-08)
- [9. Contratación y reparto diario de trabajadores](#section-09)
- [10. Colas FIFO, reservas y cajas](#section-10)
- [11. Comportamiento de trabajadores y lesiones](#section-11)
- [12. Centros, murallas, puertas y reparaciones](#section-12)
- [13. Atracción, generación de incursiones y animales](#section-13)
- [14. Las tres magias](#section-14)
- [15. Eventos agrícolas y narrativa ambiental](#section-15)
- [16. Tutorial, narrador e interfaz](#section-16)
- [17. Derrota, victoria y continuidad](#section-17)
- [18. Modo infinito y poblados adicionales](#section-18)
- [19. Sonido: banco real y mezcla de eventos](#section-19)
- [20. VFX, música, tipografía y calidad](#section-20)
- [21. Guardado, carga y aislamiento](#section-21)
- [22. Arquitectura de implementación propuesta](#section-22)
- [23. Orden de ejecución y entregables](#section-23)
- [24. Plan de pruebas y criterios de aceptación](#section-24)
- [25. Correcciones consolidadas y propuestas descartadas](#section-25)
- [26. Comprobaciones acotadas que no se deben rellenar inventando](#section-26)
- [Apéndice A. Los 126 SFX: identidad y mapeo de implementación](#section-27)
- [Apéndice B. VFX: recursos y composiciones auditadas](#section-28)
- [Apéndice C. Casos de prueba para integración](#section-29)
- [Apéndice D. Fuentes, inventario y procedencia](#section-30)
- [Apéndice E. Contenido del paquete y verificaciones realizadas](#section-31)

---

<a id="section-01"></a>

## 1. Autoridad de las reglas y uso del documento

### 1.1. Orden de precedencia

1. **Última corrección explícita de Gabriel sobre cada asunto**, incluidas las decisiones de cierre hasta la 144.
2. Reglas aprobadas que no hayan sido sustituidas.
3. Código y datos del lab correspondiente, para representación, recursos, API y constantes que no contradigan el juego.
4. Borrador maestro anterior, para inventario, alcance y contexto que sigan vigentes.
5. Propuestas técnicas de este documento, identificadas como tales cuando el comportamiento no se deduce inequívocamente de los acuerdos.

Un precio, una duración o una especie dentro de una demostración **no se convierte automáticamente en dato del juego**. Tampoco la existencia de un SFX o un VFX autoriza a crear una nueva mecánica.

Las referencias `[CULT]`, `[HUD]`, etc. remiten al registro de fuentes del apéndice D. Las referencias `D102`, `D136`, etc. remiten a las decisiones de esta conversación, no a los identificadores D01–D32 del primer borrador, que eran una lista distinta de cuestiones abiertas. Los números antiguos no se reutilizan para inventar equivalencias.

### 1.2. Qué está cerrado y qué debe comprobarse

Las reglas de agricultura, contratación, defensa, amenaza, economía base, derrota y expansión tienen una especificación consolidada. Los parámetros de esas reglas se encuentran juntos en `balance_confirmado.json`.

Los contratos cuyo detalle exacto no aparece en los archivos recibidos ni se ha recuperado de forma inequívoca se relacionan al final. No se rellenan con cifras de demostración. La ausencia de un modelo pesado significa **importación pendiente de ese recurso**, no necesidad de inventar otro modelo ni imposibilidad de desarrollar su sistema con una maqueta.

### 1.3. Vocabulario único

**Poblado:** conjunto completo de casas de una cultura, residencia y origen de los trabajadores. **Centro de trabajo:** edificio agrícola que cuesta 800 monedas, organiza su explotación y recibe las cajas. En el borrador se llamó a veces «centro urbano»; en código y documentación de gameplay debe usarse un término inequívoco.

**Planta:** unidad económica y lógica individual. **Grupo de cultivo:** conjunto contiguo de plantas de la misma especie, usado para seleccionar cosechas y reservar objetivos animales. **Tarea:** acción individual asignable a un trabajador. **Incursión:** evento que introduce simultáneamente un grupo de animales. **Presupuesto de amenaza:** puntos para componer una incursión. **Cupo de golpes:** impactos que le quedan a un animal concreto. No confundir estos dos presupuestos.

---

<a id="section-02"></a>

## 2. Experiencia, alcance y contenido final

### 2.1. Núcleo jugable

El jugador gestiona el huerto y sus centros de trabajo; contrata personas, decide qué plantar y cuándo recolectar, coloca defensas y utiliza tres magias temporales. Los empleados realizan físicamente las tareas; los ingresos requieren llevar las cajas al centro. El jugador no dirige soldados ni construye individualmente todas las casas del poblado durante la campaña.

La secuencia recurrente es: **amanecer y consecuencias → contratación → gestión agrícola y expansión diurna → retirada laboral → noche acelerada, interrumpida por una posible incursión → nuevo amanecer**.

La prosperidad agrícola aumenta el riesgo animal. La defensa sirve para conservar producción y logística, y el Escudo permite intervenir durante los ataques. Los animales no forman una horda interminable: llegan, gastan su cupo individual o se quedan sin objetivos libres y se retiran físicamente.

### 2.2. Contenido canónico

| Familia | Contenido |
|---|---|
| Biomas | Sabana, Gran río, Manglares, Volcanes, Gran cañón, Desierto |
| Culturas | Mapungubwe, Saheliana, Suajili, Musgum, Etíope |
| Cultivos | Maíz, Algodón, Girasol, Plátano, Sorgo, Mijo, Yuca, Batata |
| Trabajadores | Hombre joven, mujer joven, hombre mayor, mujer mayor |
| Animales | Facóquero, hiena, búfalo, león, rinoceronte |
| Defensas | Zarzas, madera/empalizada, adobe, adobe reforzado, piedra; sus puertas y estados de daño |
| Magias | Escudo, Crecimiento, Multiplicar |
| Música de referencia | Menú: Balafon's Call; Gameplay A: Balafon and Flute; Gameplay B: Warm Afternoon |

Las culturas son arquitectónicas/visuales, sin bonificaciones económicas ni laborales. El menú admite las **30 combinaciones de bioma y cultura**. No añadir diferencias mecánicas entre biomas que no estén aprobadas. [NEW; BASE]

### 2.3. Fuera de alcance

No añadir ganadería, animales domésticos, perro guardián, combate militar, fabricación de objetos, árbol tecnológico, inventario de comercio, misiones nuevas de NPC ni multijugador. No introducir muerte animal, curación mágica, repulsión o aturdimiento como poderes nuevos solo porque haya recursos con esos nombres.

No hay cosecha automática ni replantación automática. No se añade un sistema de meteorología visual nuevo: los eventos agrícolas se comunican mediante el Espíritu y afectan a la lógica que finalmente corresponda.

---

<a id="section-03"></a>

## 3. Material recibido y estrategia de reutilización

### 3.1. Auditoría ya realizada para esta edición

| Fuente | Resultado comprobado | Destino principal |
|---|---|---|
| CULT | 40 mallas, 107.109 triángulos únicos, 32 pares de transición y ocho especies; tiempos cortos de demostración | Modelos, miniaturas, deformación de crecimiento y morph local |
| TUT | Ocho gestos del avatar, seis imágenes de manos, API separada de tutorial y mundo | Narrador y ayudas gestuales del día 1 |
| HUD | Contratación modal con validación y pago único; cámara e interfaz; contenido agrícola y magias de prueba | Presentación y flujo, no economía de demostración |
| NEW | Seis biomas, cinco culturas, once ilustraciones, dos pasos y evento cancelable de inicio | Nueva partida real |
| VFX | 19 recursos y 18 composiciones; eventos de contacto de demostración | Presentación, nunca autoridad de daño |
| SFX | 126 IDs únicos, 16 categorías, ocho bucles; hashes y tamaños de 126 MP3 verificados | Banco sonoro de referencia y manifiesto |
| BAST | Cinco resistencias; puertas al 60%; módulos, cerramientos y colapso propio | Defensas y su destrucción |
| DEST | Daño normalizado; umbral 0,79 y colapso 3,2 s; cinco entradas de edificios con geometrías proxy | Contrato de destrucción de centros |

La integridad de audio comprueba correspondencia entre bytes embebidos y manifiesto; no equivale a una nueva evaluación auditiva. La inspección de los cubos de DEST tampoco verifica UV, normales o aspecto de las casas originales.

### 3.2. Principio de integración

**No unir los HTML como ocho juegos simultáneos.** Extraer recursos, separar reglas y crear una única simulación con estado económico, reloj, entradas, navegación y guardado comunes. Mantener los labs como referencias y, donde proceda, como demostraciones aisladas de Biblioteca.

Los laboratorios no comparten necesariamente motor: CULT integra Three.js r140, mientras otros usan WebGL propio. Esto es un dato del material recibido, no una recomendación de versión actual. La integración debe adaptar sus técnicas al renderer elegido, no mantener varios bucles de mundo superpuestos. [CULT, cabecera del motor y funciones de crecimiento; DEST; VFX]

### 3.3. Elementos que no se importan literalmente

El HUD incluye **arroz, calabaza y judías**, además de precios, rendimientos y duraciones de prueba. En el juego se sustituyen por la lista y la tabla canónicas; los índices visuales antiguos no son IDs de cultivo. Su descripción de Crecimiento como maduración inmediata y sus cooldowns cortos también se descartan. [HUD, `CROP_TYPES`, `SPELLS`]

Los límites de 240 plantas de CULT y 240 módulos de BAST son límites de sus escenas de ensayo, no límites globales del mundo definitivo. El `maxPerType:99` del HUD no acredita por sí mismo un límite de población del juego. El número de vértices, instancias o recursos simultáneos deberá administrarse técnicamente sin convertir un límite del lab en una regla no aprobada.

Los controles de «golpear», «madurar», «vaciar», avance ×25, rebobinado de daño y exportación de ensayo no pasan al HUD de la partida. Tampoco sus suelos planos, cubos o pequeñas aldeas de demostración sustituyen el terreno o las casas finales.

---

<a id="section-04"></a>

## 4. Flujo de producto y estados de partida

### 4.1. Nueva partida

El recorrido es exactamente **Bioma → Cultura → Comenzar partida**. Seleccionar una tarjeta y confirmar son acciones distintas. Retroceder conserva la elección anterior; la galería permite ver las ilustraciones. No hay tercera página de configuración. [NEW, cabecera de integración y controlador]

La integración escucha `wildguardians:new-game`, valida los identificadores y usa el mecanismo cancelable existente para tomar el control en lugar de ejecutar la simulación del lab. Una pulsación doble no crea dos mundos ni dos ranuras. El nuevo guardado pertenece a una ranura nueva; la partida abierta se autoguarda sobre su propia ranura.

### 4.2. Inicio de campaña

El mundo contiene el poblado inicial de la cultura elegida. El jugador comienza con **1.000 monedas** y coloca el primer centro de trabajo. La excepción de recuperación permite construir un centro aunque todavía no exista ninguno: de lo contrario, el inicio sería imposible.

En el día 1, la contratación no debe dispararse por delante del tutorial de centro y plantación. El controlador de inicio permite completar esa secuencia y abre la contratación cuando corresponde. No crear un segundo sistema de salarios para el tutorial.

### 4.3. Estados técnicos propuestos

Separar estado de pantalla y estado de simulación. Pantallas: menú, nueva partida, carga, partida, Biblioteca y resultado. Fases del mundo: preparación inicial, amanecer, día, noche, incursión activa y cierre de noche. La contratación, tutorial y pausa añaden motivos de suspensión, no mundos nuevos.

La incursión debe ser un estado que puede convivir con la fase diurna o nocturna. El postgame es una marca persistente que deshabilita nuevas incursiones, no otra copia del motor agrícola.

**Invariante:** cerrar un panel solo libera la pausa que ese panel solicitó. No reanudar la simulación si continúa otro motivo activo, como pérdida de foco o pantalla de resultado.

---

<a id="section-05"></a>

## 5. Reloj, jornada y aceleración

### 5.1. Escala de tiempo vigente

| Parámetro | Valor |
|---|---:|
| Ciclo completo día + noche a ×1 | 600 s |
| Ventana diurna de crecimiento | 300 s |
| Ventana nocturna nominal | 300 s |
| Inicio de jornada / amanecer | 07:05 |
| Fin de jornada de hombres | 17:05 |
| Fin de jornada de mujeres / comienzo de noche | 19:05 |
| Noche tranquila | ×5 |
| Incursión activa | ×1 |

Los 300 segundos de luz constituyen **cinco minutos efectivos disponibles**, no diez minutos de crecimiento diario. A ×1, un segundo de simulación equivale a 2,4 minutos del reloj interno. El horario de diez horas de los hombres equivale a 250 segundos de simulación; el femenino de doce horas, a 300.

Sin ataques ni pausas, un ciclo ocupa `300 + 300/5 = 360 s reales`; cien ciclos suman **10 horas**. Es una referencia aritmética, no duración garantizada. El tiempo nocturno a ×1, tutoriales, contratación y pausas alargan la experiencia. No anunciar una campaña de exactamente diez horas.

### 5.2. Qué avanza

Crecimiento, tolerancia hídrica, acciones, jornada, áreas mágicas, cooldowns y comportamiento animal usan el reloj de simulación según sus restricciones. **Por la noche no avanzan ni crecimiento ni necesidades de agua**, aunque los cooldowns sí pueden avanzar con el reloj acelerado.

Música y reproducción de audio conservan velocidad y tono normales. La interfaz puede animarse al leer una explicación aunque la economía esté pausada. Los efectos que representan una duración de gameplay deben visualizar el tiempo restante de esa duración, no agotarse por un temporizador ajeno.

La pérdida de foco/suspensión pausa el juego; no resolver ataques ni producir ganancias offline. Al regresar se retoma desde el estado conservado, sin aplicar todo el tiempo de ausencia como un salto de simulación.

### 5.3. Cruce de límites

Los pasos de simulación se dividen en fronteras relevantes: amanecer, contratación, comienzo de incursión, caducidad de magia, checkpoint de riego, impacto lógico y fin de jornada. No usar una actualización grande que pueda saltarse una modal o aplicar un bonus ya caducado.

Cuando aparece una incursión nocturna, ×5 pasa a ×1. Solo cuando se haya retirado físicamente el último animal vuelve la aceleración, si sigue siendo de noche y ninguna pausa lo impide. La victoria exige cerrar la noche 100; no puede derivarse únicamente de ver «Noche 100» en el HUD.

---

<a id="section-06"></a>

## 6. Mundo procedural, colocación y asociaciones

### 6.1. Persistencia independiente de los chunks

El terreno se genera por chunks y su representación se descarga fuera del área activa. La distancia de dibujado es finita; los animales aparecen en sus bordes, no en un supuesto límite del mundo infinito.

**Descargar representación no borra el estado.** Cultivos, estructuras, cajas, lesiones, incursiones y supresiones de vegetación se conservan aunque la cámara se aleje. El renderer no decide si una planta crece o una caja vale dinero. La simulación de explotaciones fuera de cámara debe preservar los mismos resultados, sin mantener obligatoriamente todos sus modelos en memoria.

Propuesta técnica: coordenadas de chunk más coordenadas locales, IDs persistentes y un registro de modificaciones frente a la semilla. La estrategia exacta de precisión espacial y niveles de detalle se valida con el lab de terreno ausente, sin inventar ahora sus dimensiones.

### 6.2. Colocación válida

La construcción debe respetar terreno, pendientes, agua/lava, objetos grandes y solapamientos. Las reglas geométricas concretas se importan del sistema de mundo y poblados. No convertir el bosque o las rocas grandes en una superficie edificable sin una decisión que lo autorice.

Los props menores sustituibles pueden suprimirse bajo una construcción, y esa supresión es persistente. La previsualización no elimina nada. Cobro, colocación y modificaciones del mundo ocurren una vez al confirmar una posición válida.

La semilla inicial debe permitir colocar centro y cultivos y llegar desde el poblado; se rechaza una distribución inicial imposible, no se obliga al jugador a perder por una mala generación.

### 6.3. Poblado, centro y planta

El **centro** se asocia al poblado más cercano mediante distancia de camino válida. Un poblado nuevo puede cambiar esa asociación logística; los empleados que ya salieron esa mañana conservan su residencia de ese día. No se mudan ni aparecen en otra casa a mitad de jornada. [D127]

Las **plantas existentes** no cambian de centro por construir otro durante el día. Al amanecer se recalculan sus asociaciones y se rehacen las colas. Se elimina por completo la propuesta de migrar tareas entre centros al construir uno nuevo. [Corrección de D128–D129]

Una **planta nueva** se asocia una vez al centro operativo más cercano en ese instante y conserva la asociación hasta la siguiente reconstrucción diaria aplicable. Puede vincularse a un centro recién construido sin plantilla; su tarea espera. Esa asociación no traslada trabajadores de otro centro. [D139]

El criterio definitivo de distancia de cultivo debe conectar con la navegación del mundo. No dar por verificado que el lab usa una ruta real en un caso en el que solo dispone de distancias geométricas.

### 6.4. Pérdida de infraestructura

Un cultivo ya existente que queda sin centro no se borra ni madura automáticamente. Conserva crecimiento y deuda hídrica; puede continuar creciendo únicamente mientras las reglas de agua lo permitan, durante el día. No genera trabajo ni se cosecha sin una base válida. **«Puede crecer» no significa «crece siempre sin agua».**

La destrucción es la excepción que permite reasignación laboral intradía. Tras el ataque se reconstruye la cola real y se aplica esa excepción, sin aprovecharla para rebalancear a todos los empleados sanos de centros supervivientes.

---

<a id="section-07"></a>

## 7. Economía canónica

### 7.1. Tabla de cultivos

Todos los importes son **por planta individual**. El valor de cosecha es ingreso base bruto antes del bonus del trabajador y de Multiplicar, no beneficio neto ni precio de un grupo. [D100–D103]

| Cultivo / ID | Plantar | Cosecha base | Crecimiento efectivo | Jornadas ideales de luz | Riegos totales |
| --- | --- | --- | --- | --- | --- |
| Mijo / `mijo` | 5 | 9 | 2:20 | 0,47 | 2 |
| Girasol / `girasol` | 18 | 32 | 3:00 | 0,60 | 3 |
| Sorgo / `sorgo` | 6 | 11 | 3:40 | 0,73 | 2 |
| Maíz / `maiz` | 8 | 15 | 4:30 | 0,90 | 3 |
| Batata / `batata` | 10 | 20 | 5:30 | 1,10 | 2 |
| Algodón / `algodon` | 100 | 160 | 6:45 | 1,35 | 4 |
| Yuca / `yuca` | 12 | 28 | 8:00 | 1,60 | 2 |
| Plátano / `platano` | 150 | 240 | 9:30 | 1,90 | 6 |

El tiempo es crecimiento efectivo con necesidades atendidas. Se conserva entre días; las noches y las esperas de agua prolongan el tiempo de calendario. No se cambian estos valores por los 70–150 s del lab ni por los 40–68 s del HUD.

### 7.2. Infraestructura, salarios y reparación

Cada centro de trabajo cuesta **800 monedas**, sin escalado por número de centros. Mayor: **100 monedas/día**; joven: **120**. Hombres y mujeres de la misma edad tienen el mismo precio. Los valores finales se sustentan en los acuerdos de economía y recuperación; no en que el HUD casualmente use esas mismas cantidades.

Las defensas cuestan 10/20/35/55/80 monedas por módulo, según material. La reparación se calcula como fracción dañada del coste original y se paga al ejecutarse; a destrucción total, el coste es el 100%. Las nuevas aldeas postgame usan su propia fórmula, sin alterar el precio de los centros.

### 7.3. Nacimiento y cobro de una cosecha

El bonus masculino depende de **quién recoge esa planta**, no de si hay un hombre contratado en cualquier lugar. Multiplicar se comprueba en la posición y en el instante de recogida de esa misma planta. Juventud no aumenta el valor: acelera trabajo.

La implementación debe registrar en la caja el resultado de la recogida para no reevaluarlo al llegar al centro. Llevar una caja fuera de la zona de Multiplicar no revoca un bonus adquirido; activar el poder después de recoger no lo aplica retroactivamente.

La combinación numérica de modificadores y el redondeo deben tener un único contrato contable. La expresión multiplicativa natural es `valorBase × factorTrabajador × factorMultiplicar`; no se presenta un redondeo concreto como acuerdo si no se ha recuperado. Véase apartado 26.

**Solo la entrega válida al centro acredita dinero.** No pagar al dar la orden, al desaparecer la planta y otra vez al depositar la caja. Cada liquidación necesita una identidad que impida cobros duplicados al guardar/cargar.

### 7.4. Presupuesto inicial y números grandes

Un ejemplo puramente contable: centro 800 + un mayor 100 + diez mijos 50 deja **50 monedas**. Cabe en el saldo inicial, pero no demuestra por sí solo que el tutorial sea económicamente sostenible: faltan desplazamientos y duración de acciones reales. El tamaño definitivo del lote tutorial no se inventa a partir de este ejemplo.

El dinero se abrevia cuando crece para no desbordar la interfaz, por ejemplo **150K**, **1,25M** y **2,5M**. El formato es presentación; los cálculos y las comprobaciones usan el saldo íntegro. No decidir si una compra es asequible comparando cadenas abreviadas.

La política exacta de redondeo y escalas superiores se concentra en un formateador. Propuesta técnica: contabilidad determinista con precisión explícita, evitando redondear cada fotograma o introducir créditos negativos mediante tolerancias de coma flotante.

---

<a id="section-08"></a>

## 8. Agricultura, riego y crecimiento visual

### 8.1. Plantación y cuidados

Plantar es una orden del jugador, con cobro y aparición inmediata del brote. El empleado ejecuta después las animaciones de siembra y riego correspondientes. El riego inicial cuenta dentro del total de riegos del ciclo; no añadir uno extra por una decisión de representación.

No añadir una tarea repetida de arado como impuesto nuevo si únicamente existe la animación de cavar. Separar operación económica, necesidad real y presentación de herramientas. El detalle inicial de crecimiento antes del primer riego debe respetar el acuerdo original al conectarlo; su ausencia en el lab visual se identifica al final.

### 8.2. Checkpoints de agua

Para una especie con `R` riegos totales, el primero es inicial y los restantes nacen en `k/R`, con `k=1…R−1`, medidos sobre crecimiento efectivo. Ejemplos: dos riegos, 0% y 50%; tres, 0%, 33⅓% y 66⅔%; cuatro, 0%, 25%, 50% y 75%; seis, 0%, 16⅔%, 33⅓%, 50%, 66⅔% y 83⅓%.

El margen de tolerancia aprobado es una fracción del intervalo normal entre riegos. Tomando `T/R` como intervalo nominal, los valores derivados son los siguientes; no son nuevos parámetros independientes.

| Cultivo | Intervalo nominal T/R | Tolerancia relativa | Margen derivado | Checkpoints, contando el riego inicial |
| --- | --- | --- | --- | --- |
| Mijo | 70 s | 100% | 70 s | 0%, 50% |
| Girasol | 60 s | 60% | 36 s | 0%, 33,3%, 66,7% |
| Sorgo | 110 s | 100% | 110 s | 0%, 50% |
| Maíz | 90 s | 40% | 36 s | 0%, 33,3%, 66,7% |
| Batata | 165 s | 80% | 132 s | 0%, 50% |
| Algodón | 101,25 s | 75% | 75,9375 s | 0%, 25%, 50%, 75% |
| Yuca | 240 s | 120% | 288 s | 0%, 50% |
| Plátano | 95 s | 25% | 23,75 s | 0%, 16,7%, 33,3%, 50%, 66,7%, 83,3% |

Los porcentajes de un tercio y un sexto se muestran redondeados; el cálculo conserva las fracciones exactas. Las tolerancias largas requieren comprobar C04, sin añadir un consumo de agua nocturno.

Cuando nace la necesidad, se genera una tarea única de riego. Durante su margen de tolerancia la planta puede continuar; agotado el margen, el crecimiento se detiene. **No muere por haber esperado agua.** Al recibir el riego pendiente reanuda el desarrollo. Por la noche se congelan tanto el crecimiento como el contador de tolerancia; amanecer no genera por sí solo un riego adicional.

No usar los hitos visuales del morph como calendario de agua. El archivo CULT contiene `MARKS=[0.065,0.27,0.53,0.78,1]`, que sirven al muestreo de modelos; no sustituyen las fracciones `k/R`. [CULT, `stageSample`, `transitionWindow`]

### 8.3. Crecimiento y «date por regado»

Con Crecimiento activo, los checkpoints que **realmente se cruzan durante el efecto** se consideran satisfechos: no nacen tareas de riego, no se guardan deudas para después y pueden cruzarse varios checkpoints en una actualización. El efecto no valida checkpoints futuros no alcanzados.

La magia no resuelve una falta de agua anterior a la activación. Una planta a la que ya le faltaba riego no empieza a crecer por lanzar el poder; debe recibir primero el cuidado del trabajador. Si se riega mientras el área sigue activa, desde ese instante puede beneficiarse del ×1,5 y de los siguientes checkpoints automáticos. [D103]

Propuesta de implementación: cada checkpoint tiene estado explícito (`future`, `due`, `satisfiedManual`, `satisfiedMagic`) o una representación equivalente. No deducir «ya regado» solo del progreso visual, porque se perdería la diferencia entre crecimiento normal y mágico al reanudar.

### 8.4. Madurez y recolección

A 100%, el cultivo permanece estable indefinidamente: no consume agua, no caduca por esperar ni genera otra tarea agrícola automática. El jugador debe ordenar recolectarlo. Un animal puede destruirlo; los eventos agrícolas se rigen por su propio contrato aún por verificar en el punto señalado. [D104]

Tocar una planta madura permite ordenar la cosecha de su **grupo contiguo de la misma especie**. Solo entran las plantas maduras en ese instante. La orden crea tareas individuales: cada planta se recoge una vez y produce su propia caja. Varios trabajadores pueden repartir plantas distintas en paralelo. [D105]

Las tareas nacidas simultáneamente de esa orden se insertan de la planta más cercana al centro asociado a la más lejana; después respetan FIFO. La selección de grupo no autoriza cosecha instantánea, pago por lote ni una animación que elimine todo el campo. No incorporar el botón global de «Recolectar todos» de CULT al juego. [D106]

### 8.5. Representación que debe conservarse

Se reutilizan los cinco estados por especie: **Brote → Planta joven → Planta adulta → Desarrollo → Maduro**. El crecimiento de cada etapa se ancla al suelo. Solo en los cambios de modelo aparece el puente geométrico opaco; no hay dithering ni transparencia en los cultivos. El puente respeta geometría y UV de los extremos, sin afirmar que exista correspondencia botánica exacta de vértices. [CULT]

La configuración de referencia usa un morph máximo de dos segundos simulados dentro de su intervalo local. Al cambiar los tiempos agrícolas se adapta la ventana, no se estira la deformación durante minutos. El lab agrupa instancias por especie/etapa y utiliza atributos específicos para los puentes y las sombras; esos contratos deben conservarse en la adaptación al renderer.

---

<a id="section-09"></a>

## 9. Contratación y reparto diario de trabajadores

### 9.1. Modal de contratación

Se abre después del amanecer, con la excepción guiada del día 1. Pausa la simulación, muestra cuatro perfiles, permite cantidades por perfil, recuerda la selección anterior y comprueba presupuesto. Recordar no es contratar automáticamente.

Se puede confirmar cero trabajadores si las reglas de continuidad permiten seguir; no hay reembolso por inactividad. Editar cantidades no descuenta dinero. Confirmar vuelve a comprobar el saldo, cobra una jornada una vez y constituye el equipo de ese día. La modal no debe saltarse al acelerar el tiempo. [HUD, `openHiringDay`, `confirmHiring`, `dailyClockStep`]

| Perfil | Salario | Velocidad de trabajo relativa | Rendimiento al recoger | Horario base |
|---|---:|---:|---:|---|
| Hombre mayor | 100 | ×1 | +20% | 07:05–17:05 |
| Mujer mayor | 100 | ×1 | Base | 07:05–19:05 |
| Hombre joven | 120 | ×1,5 | +20% | 07:05–17:05 |
| Mujer joven | 120 | ×1,5 | Base | 07:05–19:05 |

Los desplazamientos existen físicamente y consumen parte de la jornada. No teletransportar al empleado porque el centro esté lejos. No interpretar +20% de horas femeninas como −20% de las horas masculinas: diez frente a doce es la referencia acordada.

### 9.2. Algoritmo vigente: centros primero, plantas para los sobrantes

Se consideran **todos los centros operativos del mundo**, sin reparto previo por poblados. El peso de cada centro es el número de plantas vivas asociadas al amanecer: cada planta vale uno, independientemente de especie, valor, madurez o riegos. No contar tareas presentes ni tareas predichas. [D125 corregida; D135–D138]

Si hay al menos tantos empleados como centros, se asigna **uno a cada centro operativo**, incluidos los que tienen cero plantas, cero cajas o cero tareas. Únicamente los restantes se reparten por número de plantas, mediante mayor resto.

Si faltan empleados, se asigna uno por centro empezando por los que tengan más plantas. Los empates se resuelven por antigüedad/ID estable del centro. No concentrar los escasos empleados en un solo centro mientras otro que le sigue en prioridad puede recibir su base.

Si todos los pesos son cero y sobran empleados, no se divide por cero: se aplica el reparto equilibrado entre centros operativos acordado para inactivos. La concreción determinista de ese equilibrio puede usar el mismo orden de antigüedad. Si no hay centro, permanecen en el poblado; la excepción posterior de reconstrucción se aplica sin segunda contratación.

### 9.3. Mayor resto

Con `W` empleados, `N` centros y `R=W−N` sobrantes, para cada centro `i`:

```text
peso_i = plantasVivas_i
cuota_i = R × peso_i / sumaPesos
adicional_i = parteEntera(cuota_i)
resto_i = cuota_i − adicional_i
asignados_i = 1 + adicional_i
```

Las unidades restantes se dan a los mayores restos; en empate, al centro más antiguo. Implementar fracciones exactas o comparar residuos enteros evita desempates accidentales por precisión numérica.

Ejemplo: siete trabajadores, 60/30/10 plantas → base 1/1/1, reparto de cuatro sobrantes 3/1/0 → **4/2/1**. Con seis trabajadores y 100/20/0 plantas → base 1/1/1 y cuotas sobrantes 2,5/0,5/0: si A es más antiguo, queda **4/1/1**; si B gana ese empate, **3/2/1**. El ejemplo anterior sin explicitar la antigüedad no fijaba otra fórmula.

### 9.4. Perfiles, residencia y asignación fija

Una vez conocidos los cupos por centro, distribuir los cuatro perfiles de forma equilibrada, sin enviar hombres a cosechas o mujeres a tareas tardías mediante una optimización oculta de bonificaciones. Conservar cantidades totales contratadas; los sobrantes de perfil se resuelven de forma estable, usando la escala de explotación vigente y no reintroduciendo el tamaño de la cola. [D126, corregida por el cambio de criterio de reparto]

El centro determina el poblado de salida de cada trabajador. Durante toda la jornada conserva centro y residencia; no se rebalancea porque otro centro tenga más tareas, se plante una nueva especie o termine antes su trabajo. No existe máximo artificial de empleados por centro. [D123, D130, D138]

### 9.5. Excepción por destrucción

Tras una incursión, los desplazados por la destrucción de su centro pueden reasignarse a otro operativo de su mismo poblado con necesidad de personal. Si no queda ninguno, regresan al poblado y terminan su jornada ordinaria. Un centro reconstruido o nuevo de sustitución puede recuperar trabajadores desplazados ese día cuando sigan disponibles por esa excepción; no debe duplicarlos ni prorrogar horarios. [D124; D128 corregida]

La reconstrucción de las colas tras un ataque no es una segunda contratación ni un reparto general. Los centros que sobreviven conservan su plantilla. Una lesión incapacita según sus reglas, aunque exista un destino alternativo.

---

<a id="section-10"></a>

## 10. Colas FIFO, reservas y cajas

### 10.1. Una cola por centro

Cada centro mantiene su cola y sus empleados. Se elige la tarea más antigua; para ejecutarla se elige al empleado libre de ese centro más próximo, sin optimizar edad o sexo. Distancias prácticamente iguales se desempatan por ID. [D133]

**FIFO determina la tarea; proximidad determina el trabajador.** No convertirlo en un algoritmo que elige siempre el cultivo más próximo y pospone indefinidamente trabajos antiguos.

Cada tarea se reserva en el mismo instante de asignarse. Otro trabajador no puede tomarla aunque el primero todavía vaya de camino. La reserva dura hasta completar, invalidar o interrumpir la acción. [D134]

### 10.2. Reconstrucción desde el estado

La cola se rehace **al amanecer y cuando regresan los trabajadores después de un ataque**. Se consultan plantas, necesidades reales, cajas y órdenes que deban persistir, no una copia ciega de todos los pasos de ayer.

Las reparaciones manuales no se regeneran automáticamente al rehacer la cola. El jugador debe volver a solicitarlas cuando ese reinicio las haya descartado. Esto es distinto de conservar una reparación ya en cola mientras su objetivo acumula más daño sin que se produzca un reinicio.

No generar una cosecha por el simple hecho de que haya una planta madura: la orden del jugador es indispensable. El detalle de persistencia de una cosecha ya solicitada entre reconstrucciones de cola se conserva como comprobación concreta del apartado 26, sin imponer aquí una bandera nueva como si hubiera sido aprobada.

### 10.3. Cadena física de cosecha

`ir a planta → recoger → crear caja con valor consolidado → transportar → entregar → acreditar`.

La planta desaparece al completarse su recogida. La caja tiene identidad, posición, valor pendiente y estado de portador; no es solo un efecto gráfico. Si el trabajador interrumpe el transporte por ataque, la deja donde estaba. No convertirla en dinero ni devolverla mágicamente al cultivo.

Los animales **no atacan las cajas**. Se pueden recuperar al regreso o al día siguiente. Sin centro operativo no generan una tarea de entrega; se conservan para cuando exista infraestructura válida y se reconstruya la actividad correspondiente. Una caja no cuenta como planta para repartir trabajadores ni como cultivo vivo para calcular atracción.

### 10.4. Final de turno e interrupciones

Si termina el horario antes de iniciar físicamente la acción, el empleado deja de aceptar trabajo y libera su reserva conforme al cierre de jornada. Si ya ejecuta la tarea, termina la acción comprometida antes de marcharse, según el contrato de fin de turno aprobado. El punto exacto en que la cadena de transporte se considera concluida debe preservarse al importar las acciones, sin cobrar anticipadamente.

Una incursión tiene prioridad sobre el trabajo: interrumpe, suelta caja cuando corresponda y dispara huida. Un objetivo destruido no produce una recompensa por una animación que termine después. Reservas de trabajadores y animales son registros distintos.

### 10.5. Rutas inválidas

No atravesar edificios o animales para preservar artificialmente un FIFO perfecto. Registrar explícitamente tareas bloqueadas por falta de acceso y volver a comprobarlas cuando cambie la navegación; la selección exacta ante el primer trabajo inaccesible es una política técnica a comprobar, no permiso para ignorar el resto de las reglas.

Identidad estable y limpieza de reservas son obligatorias. Eliminar una entidad o cancelar una orden no deja un ID reservado para siempre ni permite dos entregas de la misma caja.

---

<a id="section-11"></a>

## 11. Comportamiento de trabajadores y lesiones

### 11.1. Llegada, actividad e inactividad

Los empleados salen del poblado y regresan a él físicamente, caminando en el desplazamiento ordinario. Sus animaciones y herramientas proceden de los labs individuales; no fabricar nombres de clips ni suponer que todos tienen idénticos marcadores.

En espera, alternan **reposo y vigilancia**, y ocasionalmente caminan un poco. Los paseos son locales, dentro de un radio máximo aproximado de **8 m de su centro**; no usan carrera y se interrumpen de inmediato al recibir tarea. Si esperan en el poblado porque carecen de centro, no elegir como ancla un edificio inexistente. [D131–D132]

### 11.2. Carrera de trabajo

El acuerdo recuperado expresa una reserva diaria de carrera equivalente a **tres trayectos largos**, activada cuando el índice de tareas pendientes por trabajador supera **2**. Se recupera al 100% al amanecer, no durante una pausa o paseo.

La distancia real que define «trayecto largo», velocidades en metros por segundo y su correspondencia con los clips se calibran con los modelos de trabajadores y escala del terreno. No sustituir esa reserva por tres carreras cualesquiera ni por un tiempo aleatorio no aprobado.

El criterio de urgencia de carrera usa la carga de trabajo para la locomoción; esto **no cambia** el criterio de reparto matutino, que utiliza plantas. Son sistemas distintos.

### 11.3. Ataque y huida

Al comenzar una incursión, abandonan su tarea y huyen al poblado. La huida usa carrera incluso si se agotó la reserva ordinaria o si el trabajador estaba en recuperación. Al terminar el ataque, vuelven caminando si todavía pueden reincorporarse antes de su salida. No crear una vuelta de trabajo para quien ya está incapacitado o no tiene jornada útil.

El primer golpe del ataque provoca caída y recuperación. Un segundo golpe en el mismo ataque incapacita para el resto de la jornada. El incapacitado deja de ser objetivo animal. La jornada siguiente se conserva la consecuencia de recuperación sin carrera laboral; en la posterior se recupera. No introducir muerte permanente ni indemnización. El detalle individual de recontratación se registra con identidad de persona, no convirtiendo sin aprobación a todo un perfil en lesionado.

La corrección visual final es importante: **el incapacitado también se retira con una animación de carrera ralentizada y desplazamiento lento**, no con el caminar saltarín. No significa que recupere velocidad normal ni que reanude trabajo. La escala exacta de animación/desplazamiento se ajusta sin deslizamiento de pies ni movimiento artificial.

### 11.4. Encuentros con animales

Los trabajadores no son objetivos primarios, pero puede haber agresión al cruzarse. Si solo pasan por delante, el acuerdo recuperado fija **60%** de posibilidad por encuentro válido. Si sus trayectorias causarían interpenetración, el ataque es obligatorio y desplaza al trabajador; referencia de empuje recuperada: **1,5–2 m**.

La tirada no ocurre cada fotograma de proximidad. Se identifica el encuentro para no transformar un 60% en una probabilidad prácticamente segura por repetición. La caída y el empuje respetan terreno y obstáculos; no empujar a través de un muro o bajo el suelo.

Un animal sin golpes ya está retirándose y no ejecuta nuevos ataques. En ese estado la prevención de solapamientos pertenece a navegación/colisión; no se inventa un golpe gratuito que contradiga su cupo.

---

<a id="section-12"></a>

## 12. Centros, murallas, puertas y reparaciones

### 12.1. Datos estructurales

| Defensa / ID | Coste por módulo | PV muro | PV puerta | Colapso |
| --- | --- | --- | --- | --- |
| Zarzas / `zarzas` | 10 | 100 | 60 | ≤20% de vida restante; 1,4 s |
| Madera / `empalizada` | 20 | 200 | 120 | ≤20% de vida restante; 1,4 s |
| Adobe / `adobe` | 35 | 300 | 180 | ≤20% de vida restante; 1,4 s |
| Adobe reforzado / `reforzado` | 55 | 400 | 240 | ≤20% de vida restante; 1,4 s |
| Piedra / `piedra` | 80 | 500 | 300 | ≤20% de vida restante; 1,4 s |
| Centro de trabajo | 800 | 600 | No es un módulo de puerta | ≥79% de daño; 3,2 s |

Una puerta cuesta lo mismo que un módulo del mismo material; al cerrar un recinto no aparece un recargo. Su salud máxima es el **60%** del muro. La progresión de catálogo del juego ordena reforzado antes de piedra, aunque el array fuente los enumere en otro orden. [D117; BAST]

Centro de trabajo: **800 monedas, 600 PV**, cualquiera de las cinco arquitecturas. Al acumular **79% de daño**, inicia colapso irreversible; son **474 PV perdidos**, no 79 PV ni 79% de vida restante. La secuencia de colapso del lab dura **3,2 s** sin aceleraciones de prueba. [D119; DEST, `COLLAPSE_THRESHOLD`, `COLLAPSE_SECONDS`]

### 12.2. Destrucción y correspondencia visual

BAST colapsa al quedar **20% de vida o menos**; su secuencia dura **1,4 s**. DEST dispara al **79% de daño**; no son umbrales numéricamente idénticos. Se conservan ambos valores auditados, sin «unificarlos» redondeando uno al otro.

El renderer recibe salud/daño normalizado del dominio. Los agujeros de DEST son una máscara visual y el lab advierte que **no reconstruye las colisiones**. Es necesario un sistema lógico de obstáculos independiente; raycast de interacción visual no equivale a navegación de trabajadores o animales. [DEST, comentario de cabecera y `raycast`]

DEST ofrece seis fases: intacto, primeros impactos, daño localizado, daño severo, colapso inevitable y cenizas. En su clasificación: `<0,5%`, `<20%`, `<52%`, `<79%`, `<99,98%` y final. Son etiquetas visuales; la economía no usa el nombre de fase para calcular costes. [DEST, `stages`]

### 12.3. Construcción de defensas

El lab traza curvas o líneas, las convierte en módulos y detecta recintos para generar puertas de forma determinista. Se conservan formas, conexiones y correcciones. Valores auditados: módulo base `UNIT=2.18`; puerta de adobe y piedra a escala **1,4**, reforzada a **1,6**. No regresar a la versión en la que la puerta reforzada seguía siendo pequeña. [BAST, constantes y `ensureAutomaticGates`]

Esas unidades pertenecen al lab y deben armonizarse con la escala del mundo. No asumir que la geometría ampliada define por sí sola el espacio transitable del hueco. La eliminación manual abre un paso y no debe regenerar inmediatamente una puerta para cerrarlo. No importar deshacer como reembolso económico ilimitado: es un control del ensayo.

Las puertas cuentan como barreras para animales según el acuerdo de navegación. El detalle de animación/acceso de trabajadores se integra con su geometría real, no con invisibilidad de un obstáculo en el renderer.

### 12.4. Reparación: solicitar no es pagar

Para pedir una reparación debe haber dinero suficiente según el daño actual. La orden entra en FIFO y **no reserva ni descuenta ese importe**. Al llegar el trabajador se comprueban otra vez estado y saldo y se calcula el precio real de esa intervención.

```text
precioActual = costeOriginal × fracciónDeDañoActual
si destrucciónTotal: precioActual = costeOriginal
```

Si el saldo alcanza, cobro y restauración/reconstrucción son una operación única con su VFX de polvo. Si no alcanza, se cancela esa ejecución y se informa de fondos insuficientes sin cobrar parcialmente.

Una orden no se invalida por el mero hecho de que el daño aumente: **puede terminar como reconstrucción al 100% del coste**. Esta es la corrección final de D144 y prevalece sobre la propuesta de cancelarla al colapsar. El objetivo debe conservar una identidad reconstruible aunque su representación sea ruina.

No hay contradicción con rehacer las colas: una orden que sobrevive mientras espera puede recalcular su precio; una orden descartada por la reconstrucción de cola tras ataque no se regenera sola. La huida interrumpe igualmente al reparador.

El lab BAST impide reparar durante su animación de caída y DEST permite un reset de ensayo. Ninguno decide la política final por sí solo. Si la reparación llega cuando el colapso aún está animándose, falta verificar el instante exacto de ejecución; **no se resolverá cancelándola automáticamente**. Véase apartado 26.

### 12.5. Sin centros operativos

No se puede plantar, construir murallas, ordenar cosechas, reparar otras estructuras ni usar magias productivas sin un centro operativo. La única acción constructiva de recuperación es **construir/reconstruir un centro**. Cámara, menús y navegación de interfaz permanecen utilizables. [D140]

La reconstrucción de ese centro no puede depender de que un trabajador tenga ya asignado un centro operativo: sería una dependencia circular. Se implementa por la vía de construcción permitida al jugador. Durante la noche o una incursión se siguen respetando sus bloqueos; no reconstruir instantáneamente bajo los animales.

Con un centro superviviente, la partida no termina por perder otro. Se aplican las consecuencias logísticas locales y las reasignaciones por destrucción que correspondan.

---

<a id="section-13"></a>

## 13. Atracción, generación de incursiones y animales

### 13.1. Atracción

La atracción es la suma del **valor potencial base de las plantas vivas**, maduras o inmaduras. No es el dinero del jugador, la longitud de murallas, el número de empleados ni el valor de cajas ya recogidas. No añadir una memoria de prosperidad reciente: esa alternativa del borrador no se aprobó como sustituta del estado actual.

Con los valores canónicos: veinte mijos representan **180** de atracción; diez plátanos, **2.400**. La influencia de un eventual modificador agrícola sobre «valor potencial» debe resolverse junto con la semántica de esos eventos, no deducirse del SFX o del HUD.

### 13.2. Probabilidad y presupuesto

| Atracción | Especies disponibles | Probabilidad nocturna | Puntos de amenaza |
| --- | --- | --- | --- |
| 0 | Ninguna en una tirada normal | 0% | — |
| 1–499 | Facóquero | 25% | 1–2 |
| 500–1.499 | Facóquero, Hiena | 40% | 3–4 |
| 1.500–3.999 | Facóquero, Hiena, Búfalo | 55% | 5–7 |
| 4.000–9.999 | Facóquero, Hiena, Búfalo, León | 70% | 7–10 |
| ≥10.000 | Facóquero, Hiena, Búfalo, León, Rinoceronte | 85% | 10–14 |

La tirada nocturna es independiente: no hay compensación por noches sin ataque ni obligación de ataque tras varias noches tranquilas. Con atracción cero no hay incursión normal. **Noche 1 tranquila; noche 2, exactamente un facóquero tutorial garantizado incluso con atracción cero.** [D107–D113]

La probabilidad de que exista incursión se separa de la composición cuando existe. El número de animales no se fija por un rango de cantidad independiente; se obtiene gastando puntos de amenaza.

### 13.3. Perfil de fuerza

| Animal | Coste de amenaza | Daño estructural por golpe lógico | Cupo individual de golpes | Máximo por incursión |
| --- | --- | --- | --- | --- |
| Facóquero | 1 | 40 | 2–4 | 3 |
| Hiena | 3 | 50 | 3–5 | 2 |
| Búfalo | 5 | 70 | 4–6 | 2 |
| León | 7 | 80 | 4–7 | 2 |
| Rinoceronte | 10 | 120 | 5–8 | 1 |

Cada animal recibe su cupo al comenzar la incursión y consume uno por impacto lógico exitoso. El cupo no se reinicia al cambiar objetivo. Golpear una barrera de Escudo consume un golpe aunque no dañe la construcción. Un cultivo no protegido se destruye de **un golpe lógico**, sin propagar daño económico a todo el grupo. [D109, D118 y acuerdos de cupo]

### 13.4. Composición aleatoria

Se generan composiciones **sin orden**, con especies desbloqueadas, máximo cinco animales y los límites por especie de la tabla. Su coste debe satisfacer:

```text
ceil(0,75 × presupuesto) ≤ costeComposición ≤ presupuesto
```

Se elige uniformemente entre las composiciones válidas; no entre permutaciones del mismo grupo y no con preferencia automática a la especie más fuerte. No se permiten catorce facóqueros aunque el presupuesto sea catorce. [D111]

Ejemplos: presupuesto tres y hiena desbloqueada → tres facóqueros o una hiena. Presupuesto cinco y búfalo desbloqueado → un búfalo o una hiena y dos facóqueros. Presupuesto siete no habilita un león en una finca que todavía no haya alcanzado 4.000 de atracción. Con presupuesto catorce, un rinoceronte solo cuesta diez y **no alcanza el mínimo de once**; rinoceronte más facóquero sí puede ser válido.

Las tiradas de presupuesto se realizan dentro de los intervalos aprobados. El manifiesto y las pruebas validan que siempre exista al menos una composición legal para cada presupuesto alcanzable.

### 13.5. Cuándo y dónde aparecen

Al iniciar la noche se fijan probabilidad y presupuesto usando la atracción de ese momento y se sortea una hora secreta entre **20:00 y 05:00**. Hay como máximo una incursión nocturna. No repetir la tirada por mover cámara o recargar una partida.

La incursión aparece como **grupo simultáneo** en una misma zona general del borde de chunks activos, con puntos transitables separados. No generar los cuerpos apilados ni introducirlos uno cada varios segundos. Entra corriendo; dentro de la finca caminan entre objetivos; al retirarse vuelven a correr. [D113–D114]

Aparición: aviso breve no bloqueante y velocidad normal. La primera explicación del Espíritu conserva su pausa tutorial cuando aún no se ha visto. Los ataques posteriores no pausan automáticamente para una nueva modal.

### 13.6. Ataque diurno

Cada mañana se sortea un único momento candidato secreto entre **09:00 y 16:00**. En ese instante se comprueba atracción: con al menos **10.000**, se hace una tirada independiente del **10%**; con menos, no hay ataque diurno ese día. No volver a intentarlo continuamente. [D112, D115]

Si ocurre, usa presupuesto **7–10**, la composición legal del nivel desbloqueado y el mismo comportamiento de grupo, huida, lesiones y retirada. Puede coincidir en el mismo día con una incursión nocturna. Al volver los trabajadores se reconstruye la cola, pero no se cobra de nuevo ni se reparte toda la plantilla.

### 13.7. Objetivos y reservas

Los cultivos accesibles son prioritarios; se considera el valor agregado del grupo (`valor de cosecha × plantas`). Si hay que abrir paso, se trata la puerta o muro como obstáculo a resolver; el animal no tiene conocimiento omnisciente del material más débil. Los recorridos deben ser válidos para el tamaño de cada especie.

Sin cultivos elegibles, las construcciones se consideran por su valor agregado, distinguiendo conjuntos defensivos y centros de trabajo. No convertir a los empleados en objetivo principal de una incursión.

**Un objetivo activo solo pertenece a un animal.** Otro ignora cultivos/grupos, tramos/conjuntos defensivos o centros ya reservados. Si no hay objetivos libres válidos, puede retirarse aunque conserve golpes. Al destruirse o invalidarse su objetivo, libera y recalcula. Esta regla puede hacer que varios animales no se amontonen sobre el único grupo de mijo de una finca pequeña; no «corregirlo» rompiendo reservas para gastar todo el presupuesto.

### 13.8. Animaciones y daño

Pesos recuperados de selección: **tajo derecho 45%, tajo cargado 30%, combo 1 15%, combo 2 10%**. Son nombres funcionales que deben mapearse a los clips reales al importar los labs individuales.

**Cada animación completa elegida representa un golpe lógico, incluidos los combos.** Puede tener varios trazos, sonidos o contactos de presentación, pero daño y consumo del cupo ocurren una sola vez por su evento lógico comprometido. El VFX de león del lab emite tres contactos: no conectarlos directamente a tres pérdidas de PV. [VFX, `definitions`, `wgvfx:impact`; regla aprobada de animaciones]

Al agotar cupo, no busca ni ataca nuevos objetivos: se retira físicamente. El fin global de la incursión depende de la salida del último animal, no de que el primero termine. La gestión de una incursión excepcionalmente larga que alcance el amanecer debe conservarse sin saltarse contratación o declarar victoria prematura; su política temporal exacta se señala en el apartado 26.

---

<a id="section-14"></a>

## 14. Las tres magias

| Magia | Desbloqueo | Duración | Recarga | Cobertura de referencia | Efecto |
| --- | --- | --- | --- | --- | --- |
| Escudo | Noche 2 | 20 s | 90 s | Aprox. 5–6 plantas | Barrera física; absorbe golpes que consumen cupo |
| Crecimiento | Día 3 | 30 s | 90 s | Aprox. 9–10 plantas | ×1,5 crecimiento y checkpoints cruzados satisfechos |
| Multiplicar | Día 5 | 15 s | 120 s | Aprox. 6–8 plantas | ×2 cosecha recogida en el área durante el efecto |

Los tamaños relativos aprobados sirven para calibrar el radio con el espaciado real de las plantas: no son límites duros de cantidad de objetivos. No inventar un radio en metros sin la escala integrada del terreno y los modelos.

### 14.1. Reglas comunes

Cada poder tiene cooldown independiente y usa tiempo simulado; con ×5 se recarga más deprisa en tiempo real y con pausa se congela. La recarga se representa mediante el indicador de color correspondiente. El instante exacto de arranque del cooldown se centraliza y debe verificarse si no se recupera del acuerdo original.

La previsualización permite apuntar y cancelar sin gasto. Solo confirmar una colocación legal consume la activación. **No se solapan áreas mágicas activas**, ni entre poderes distintos ni entre dos usos del mismo. La legalidad depende de intersección espacial, no de nombres de poder.

El área queda en el mundo y su VFX permanece durante la duración lógica. Una animación de ensayo de cinco segundos no recorta un Escudo de veinte ni un Crecimiento de treinta. No se añaden maná, cargas comprables o un cuarto poder.

### 14.2. Escudo

Es una **barrera física temporal**, no simplemente reducir a cero el daño dentro de un círculo. Los animales golpean su borde y consumen cupo; no atraviesan la cúpula. El contacto produce su reacción visual. Al terminar, si les quedan golpes y objetivos válidos, continúan la incursión.

No cura estructuras ni devuelve plantas. La interacción al colocar el borde sobre un animal ya presente debe validarse con navegación para evitar solapamientos; no deducir una expulsión mágica de la composición `repel` del VFX.

### 14.3. Multiplicar

Duplica lo que se recoge **durante la ventana activa** y dentro de su área. Dar la orden antes de que termine no reserva el bonus para una recogida posterior. La comprobación es por planta, no por grupo ni por momento de entrega de todas las cajas.

Solo se activa de día y con trabajadores, fuera de una incursión y con infraestructura habilitante. No multiplicar dinero ya ingresado, cajas recogidas antes ni futuros ciclos de plantas que aún no existen.

### 14.4. Crecimiento

Aplica **+50% de velocidad**, es decir ×1,5, no maduración instantánea ni reducción del tiempo a la mitad. Solo se activa de día y fuera de ataques. Respeta el bloqueo por falta de riego previa y el mecanismo de checkpoints «date por regado» del apartado 8.

### 14.5. Matriz de permisos

| Contexto | Gestión agrícola / construir / reparar | Crecimiento / Multiplicar | Escudo |
|---|---|---|---|
| Día, paz, al menos un centro operativo | Permitido según coste/objetivo | Permitido si desbloqueado y listo; Multiplicar requiere trabajadores | Permitido si desbloqueado y listo |
| Noche, haya o no incursión | Bloqueado | Bloqueado | Única acción de gameplay habilitable |
| Incursión diurna | Bloqueado | Bloqueado | Única acción de gameplay habilitable |
| Sin centros, día en paz | Solo construir/reconstruir un centro | Bloqueado | Bloqueado: la única excepción es recuperar un centro |
| Modal de contratación/tutorial/pausa | Simulación suspendida | No consumir una activación | No consumir una activación |

Mover cámara, abrir ajustes o navegar por la interfaz no equivale a construir durante un ataque. El control de permisos debe ser único, usado tanto por los botones como por atajos y comandos internos.

---

<a id="section-15"></a>

## 15. Eventos agrícolas y narrativa ambiental

Los acuerdos recuperados fijan **como máximo un evento por noche**, probabilidad **20%**, reparto **60% negativo / 40% positivo**. Los negativos tienen un tope del 30%; los positivos una escala de +10/+20/+30%. El reparto entre específicos y generales es 60%/40%; los específicos requieren una especie con al menos cinco plantas vivas.

Son una **sorpresa anunciada al amanecer**, no un aviso previo para anticipar su resultado. Los ejemplos narrativos son helada nocturna y plaga que afecta al mijo. No implican añadir nieve, insectos 3D ni lluvias visuales. [Acuerdos recuperados de eventos; BASE, apartado 14]

No se ha recuperado con suficiente precisión **a qué magnitud se aplica ese porcentaje**: destruir plantas, modificar rendimiento pendiente o alterar crecimiento no son lo mismo. Tampoco se debe inventar una distribución de severidad negativa ni asumir equiprobabilidad de los tres niveles positivos. Este es un contrato acotado del apartado 26, no una excusa para posponer agricultura o defensa.

### 15.1. Contrato de integración

El sistema de eventos necesita ID, condición de elegibilidad, especie/objetivos reales, magnitud, modificación lógica, texto y marca de aplicación. El texto debe describir el cambio real. No anunciar «el mijo se ha estropeado» si no había mijo afectado.

Guardar la selección y la aplicación para no repetir premios o pérdidas al recargar. Aplicar consecuencias antes del cálculo diario que dependa del estado resultante. No importar de forma literal `autoEvents` del HUD: son avisos de demostración cada pocos segundos, no el calendario aprobado.

El contenido escrito puede redactarse con lore breve del Espíritu. La estructura y los disparadores se preparan ahora; no activar una operación destructiva cuyo significado no esté acreditado.

---

<a id="section-16"></a>

## 16. Tutorial, narrador e interfaz

### 16.1. El Espíritu siempre narra

El personaje explicativo es el Espíritu, con su retrato animado. No sustituirlo por voces distintas o un aldeano aleatorio. El jugador no necesita un modelo 3D físico del Espíritu dentro del mundo: retrato narrador y áreas mágicas cumplen funciones diferentes.

Las explicaciones mezclan instrucción clara y pequeñas referencias al poblado y la maldición. La revelación de que la campaña libera el mundo y abre la expansión pacífica se conserva como sorpresa; no anunciar desde el inicio todas las recompensas postgame.

### 16.2. Gestos reales de V8

| ID del lab | Nombre | Movimiento descrito en la fuente |
|---|---|---|
| `greeting` | Bienvenida | Inclinación lateral amplia de bienvenida |
| `speak` | Habla | Balanceo amplio y giros alternos |
| `acknowledge` | Aprobación | Doble inclinación lateral, acercamiento y pulsos cálidos |
| `curious` | Curiosidad | Inclinación marcada con mirada sostenida |
| `warning` | Alerta | Acercamiento y actitud vigilante |
| `reveal` | Revelación | Levitación elevada y motas doradas |
| `idle` | Reposo | Balanceo continuo |
| `farewell` | Despedida | Inclinación lenta y retirada serena |

**Entrada y salida** son además estados del controlador. La lista es la de `TUTORIAL_LINES` y `STATE_NAMES` del archivo V8 recibido; no confundir gestos del avatar con posiciones de las manos, ni sustituirla por la lista recordada de otra versión. [TUT, líneas 59–71 y 606–607]

El avatar tiene malla/deformación propia, movimientos secundarios y luz. Conserva el rostro y la barbilla; la boca no tiene sincronización labial. El avance de texto es manual; las estimaciones de lectura controlan el gesto y el reposo, no hacen saltar automáticamente a la siguiente frase. [TUT, `readingSeconds`, `getState`]

### 16.3. Manos del día 1

Las seis imágenes son `press`, `tap`, `pinch`, `point`, `drag` y `open`. Cada mano es un plano situado en el mundo, con cuatro vértices y dos triángulos. La protección considera el plano completo, no solo sus esquinas; debe mantener profundidad y evitar atravesar suelo u obstáculos al mover cámara. [TUT, `HAND_ASSETS`, `HAND_INFO`, geometría y protección]

**Solo se muestran en el tutorial básico del día 1**. En los mensajes posteriores se conserva el Espíritu sin reintroducir manos por cada nuevo evento.

Los pasos del lab señalan objetos de ensayo (`parcela-a`, `carro`, etc.). En el juego se enlazan a objetos o zonas reales del tutorial; no crear un carro jugable solo para mantener un ID de demostración.

### 16.4. Secuencia de enseñanza

Día 1: introducción y lore → colocar centro → plantar → contratar → observar trabajo automático → ordenar primera cosecha y comprender la entrega de cajas. Día 2: defensas. Noche 2: primer ataque y Escudo. Día 3: Crecimiento. Día 5: Multiplicar. Primera doble agresión/recuperación laboral: explicación contextual. Noche 100 completada: liberación de la maldición y continuación opcional.

Las explicaciones modales pausan la simulación. Al pedir una acción, se cierra la lectura y se deja ejecutar el paso. No congelar el mundo mientras se espera que un trabajador camine o que una planta madure.

Cada paso se completa por el estado real correspondiente, no por pulsar «Siguiente». Una acción ya realizada se reconoce; no exigir pagar otro centro o plantar de nuevo. El detalle exacto del lote inicial y perfil guiado no se inventa si falta en el guion recuperado.

### 16.5. Tutorial omitible sin perder información nueva

La partida guarda su progreso tutorial. El perfil global conserva los mensajes/mecánicas ya vistos. Haber completado antes el tutorial permite saltar la introducción, **pero un mensaje nuevo aún no visto se muestra igualmente**, como magia o recuperación de trabajadores.

No usar una sola bandera global `tutorialDisabled` que silencie cualquier explicación futura. Los IDs de mensajes deben ser estables. El conjunto global no altera dinero, plantas ni estado de una ranura diferente.

### 16.6. HUD definitivo

Conservar reloj, dinero, contador de día/supervivencia, menú de pausa, acciones laterales, retratos de contratación, panel contextual y navegación «Volver». En múltiples poblados, los accesos deben conducir a un destino real. La franja inferior se reserva al tutorial; no taparla con paneles desbordados.

Los avisos deben ser breves, agrupados y accionables para llevar la cámara al evento. El HUD recibido tiene `toast()` neutralizado; usar avisos, estados y mensajes contextuales, no restaurar toasts invasivos del lab antiguo. Los gastos no confirmados no animan monedas saliendo y una cosecha ordenada no hace aparecer ingresos prematuros. [HUD, `toast`, `changeMoney`]

Ajustes visibles: SFX, música y calidad muy baja/baja/media/alta, conservados fuera de la partida. No confundir volumen general del reproductor SFX con una ganancia adicional por clip.

---

<a id="section-17"></a>

## 17. Derrota, victoria y continuidad

### 17.1. Derrota tras perder el último centro

Al terminar la incursión, si no queda ningún centro operativo y el saldo es **menor que 800**, se declara Game Over. Con 800 o más no hay derrota inmediata por esta regla: puede financiar el centro cuando la fase permita reconstruir. [D141]

No comprobar «un centro destruido» como derrota si sobrevive otro. No cancelar la partida al inicio del colapso visual sin haber llegado al punto de evaluación aprobado.

### 17.2. Comprobación al amanecer

Antes de contratar se aplican los umbrales acordados:

| Estado | Saldo mínimo |
|---|---:|
| Centro operativo y al menos un cultivo vivo o caja recuperable | 100 |
| Centro operativo, sin cultivos ni cajas | 105 |
| Sin centro, con cultivo vivo o caja recuperable | 900 |
| Sin centro, sin cultivos ni cajas | 905 |

Los sumandos son centro 800, mayor 100 y mijo 5 cuando haga falta empezar de cero. Con 800–899 sin centro puede no perder al terminar el ataque, pero sí en la comprobación matinal si no cambió su situación. [D142–D143]

**Precisión de la especificación:** estos son los umbrales simplificados aprobados. No son una demostración matemática de que cualquier cultivo vivo produzca ingresos suficientes antes del siguiente salario. Un plátano inmaduro puede necesitar varios días y una caja puede ser físicamente inaccesible. Se conserva la regla, y esas situaciones se incluyen en pruebas de balance/recuperabilidad; no se inventa un rescate gratuito ni se cambia el umbral sin decisión posterior.

La pantalla explica causa concreta y permite volver al menú o iniciar otra ranura. Una selección de contratación demasiado cara no equivale a derrota: primero debe poder editarse.

### 17.3. Victoria

Se cuentan noches **completadas**. La noche 1 tranquila cuenta. No dar victoria al entrar en la noche 100 ni ignorar una incursión que todavía no haya terminado.

El Espíritu anuncia la maldición levantada. El jugador puede terminar o seguir con su misma explotación en modo infinito. No hay reinicio de saldo, cambio a otro mapa ni pérdida de construcciones. La transición se guarda para que no vuelva a habilitar ataques al cargar.

La precedencia exacta de un caso simultáneo de derrota económica y cierre de la noche 100 se debe probar junto con el evaluador de cierre; no dejarla al orden accidental de dos callbacks.

---

<a id="section-18"></a>

## 18. Modo infinito y poblados adicionales

### 18.1. Regla de continuación

Tras completar la campaña, **no hay ataques**. Se continúa la agricultura y expansión en el mundo abierto procedural. No sustituirlos por ataques diurnos ni mantener una tirada oculta porque la atracción sea alta. Los demás sistemas no desaparecen sin una regla expresa.

Se construyen poblados completos, no casas sueltas ni un único edificio decorativo. No existe máximo artificial de poblados. Cada uno permite organizar centros próximos y reducir viajes desde residencia.

### 18.2. Coste sin techo de cantidad

Para el poblado número `n`, contando como uno el inicial y con `n≥2`:

```text
C(n) = 50.000 + 25.000 × (n − 2)
```

Segundo 50K, tercero 75K, cuarto 100K, décimo 250K, vigésimo 500K, quincuagésimo 1,25M y centésimo 2,5M. La progresión es lineal; **no** se multiplica por 1,5 indefinidamente. No hay un límite de tres aldeas. [D120]

### 18.3. Cultura y distancia

Cada poblado adicional puede ser de cualquiera de las cinco culturas, sin ventajas jugables distintas. El inicial conserva la selección de Nueva partida. [D121]

La separación mínima evita que se mezclen físicamente sus construcciones; no exige una gran franja vacía. Se pueden colocar poblados vecinos y formar una ciudad que se expande. El algoritmo orgánico de colocación se recupera del lab de poblados, sin sustituirlo por una cuadrícula uniforme.

### 18.4. Previsualización fantasma y confirmación

Elegir cultura y ubicación aproximada muestra el **conjunto completo semitransparente** ya adaptado al terreno. Se puede recolocar o cancelar sin pagar. La validez se indica con un estado visible; una pieza importante inválida invalida el conjunto.

Confirmar vuelve a comprobar geometría, saldo y ordinal de coste. Entonces, en una operación todo-o-nada: cobrar, crear todo el poblado, persistir supresiones menores, recalcular las asociaciones de centros pertinentes y autoguardar. No existen medias aldeas ni reembolsos por una colocación parcial. [D122]

### 18.5. Incorporación laboral

El poblado aparece inmediatamente, pero no crea trabajadores a mitad del día. Al amanecer siguiente participa en la distribución global **a través de sus centros**. Los empleados en marcha siguen con su centro y residencia de esa jornada; las plantas existentes también mantienen su asociación diaria hasta recalcularla.

No cobrar salarios por una nueva población decorativa ni tratar cada casa como una plaza de empleo. Sin límite artificial de centros o aldeas no significa recursos técnicos infinitos: se controla carga activa, memoria y simulación, no se falsean las reglas cuando baja el rendimiento.

---

<a id="section-19"></a>

## 19. Sonido: banco real y mezcla de eventos

### 19.1. Estado del material

El catálogo V12 contiene **126 entradas y 126 MP3**, 16 categorías y ocho bucles; duración total declarada **336,321746 s**. Se ha verificado que cada audio decodificado del HTML coincide con su tamaño y SHA-256 registrado. Los IDs, nombres, categorías, nombres de archivo y metadatos se conservan en el manifiesto extraído. [SFX, `bankData`]

Los archivos son la selección normalizada existente, no copias nuevas recodificadas. El catálogo indica 44,1 kHz, estéreo y 128 kb/s. Sus referencias de mezcla sitúan brisa/noche alrededor de −34 LUFS y viento/agua alrededor de −28 LUFS, con techo general de −2 dBTP y excepciones más discretas. No normalizar de nuevo todos los clips al mismo nivel. [SFX, guía y manifiesto]

Los audios 021 y 022 conservan el intercambio solicitado: **usar ID y archivo del catálogo final**, no el orden de un ZIP anterior.

### 19.2. Autoridad de activación

El sistema lógico emite hechos; la capa de audio decide qué toma apropiada reproduce. No hacer que terminar un audio complete una cosecha ni que una vocalización provoque daño.

Separar buses de música, ambiente, mundo y UI, manteniendo los controles públicos de SFX/música aprobados. Propuesta técnica: prioridad alta para peligro y resultado; límites por emisor y familia para pasos, trabajo y colapsos. Las cifras de concurrencia se miden con la escena integrada, no se inventan como balance.

La normalización de clips no resuelve distancia, simultaneidad ni prioridad. Muchos trabajadores regando no deben sonar como 30 reproducciones idénticas al mismo volumen. Un golpe puede llevar vocalización y contacto material, pero no cinco sonidos de compra por una sola transacción.

### 19.3. Inventario frente a uso de gameplay

El apéndice A tiene **una fila por cada ID real** y un destino propuesto, incluyendo reservas justificadas. Se distingue catalogado, mapeado, integrado y probado. Hoy se ha catalogado y propuesto el mapeo; no se afirma que el juego ya lo reproduzca.

Existen sonidos de recibir daño/muerte animal y lluvia/trueno para los que no se acredita una mecánica correspondiente dentro del alcance. No inventarla para lograr una cifra de «126 usados». Mantenerlos identificados en el catálogo/Biblioteca o como reserva explícita hasta confirmar una ocasión válida.

El criterio de salida debe medir **126 entradas trazadas**, con usos compatibles probados y excepciones declaradas. El objetivo original de hacer sonar todos dentro del gameplay no puede cumplirse honradamente creando muerte o clima que el diseño no incluye. [BASE, 15; SFX]

### 19.4. Pausa, aceleración y cambios de pantalla

Parar o atenuar loops de actividad al interrumpirse la acción; no dejar una regadera sonando durante la huida. Con ×5 no acelerar el tono de música y sonidos. Al cargar, restaurar estados continuos, no volver a reproducir todas las compras históricas. Al salir de Biblioteca o partida, destruir sus reproductores y liberar los recursos correspondientes.

---

<a id="section-20"></a>

## 20. VFX, música, tipografía y calidad

### 20.1. VFX: conservar presentación, no duplicar reglas

VFX Atelier tiene **19 recursos** y **18 composiciones**, enumerados en el apéndice B y el JSON extraído. Son composiciones de prueba: no contienen la IA final ni daño estructural. `wgvfx:impact` declara `preview:true`, espacio `lab-world` y `structuralDamage:'external'`. [VFX]

En el juego, animación y presentación consumen los hechos del dominio. Los varios contactos decorativos de un combo no pueden restar PV varias veces. Separamos marcador visual, sonido de contacto y resolución lógica, con ID del ataque para impedir duplicaciones.

Reutilizar polvo, cavar, riego, cosecha, impactos por material, barridos, rugidos y cúpula. Adaptar el área de protección a la duración de Escudo. Las composiciones `heal`, `repel`, `stun` y `spirit` son recursos de presentación aprovechables **solo sin cambiar las tres magias**; una espiral puede vestir Crecimiento, pero no autoriza curar edificios o repeler animales.

La destrucción de casas pertenece a DEST y la de muros a BAST. No añadir otra lluvia de escombros estructurales desde VFX. Los terrones agrícolas y pequeños impactos no son una segunda simulación de colapso.

### 20.2. Música

Menú: **Balafon's Call**, usando la revisión corregida del menú inventariada. Audio activo por defecto como intención de interfaz; que el dispositivo exija interacción para activarlo no debe impedir cargar la pantalla.

Gameplay A (**Balafon and Flute**) y B (**Warm Afternoon**) son composiciones independientes con sus propios sistemas por capas/secciones. No mezclar stems A/B suponiendo que comparten BPM, tonalidad o fase. No generar más música para poder redactar este plan.

Los labs musicales no están presentes en esta entrega. Se conserva su identidad y finalidad, pero nombres exactos de stems, marcadores, loops y política de alternancia se importan de ellos. Propuesta técnica: interfaz común de estados de calma/noche/peligro y transiciones propias del pack activo, sin fijar compases o tiempos no auditados.

### 20.3. Tipografía y créditos

El borrador original facilitado identifica **Ga Maamli** para títulos y **Banga** para texto, con procedencia en su apartado 18; esta es la nomenclatura documental de referencia, frente a variantes «Ha Maamli» y «Manga» aparecidas de memoria. El lab tipográfico y los binarios no se han recibido aquí: cotejar sus metadatos al importar, sin presentar esa comprobación como realizada. [BASE, 16.3 y 18.4]

Reemplazar tipografías de sistema del HUD/selector por la jerarquía aprobada sin romper altura de líneas, números, acentos, `ñ` o cantidades largas. Las fuentes no se adjuntan en este paquete documental.

### 20.4. Calidad visual

Cuatro perfiles: **muy bajo, bajo, medio y alto**; muy bajo sin iluminación según el diseño. La configuración exacta pertenece al lab de bioma optimizado que falta importar. No copiar automáticamente los dos perfiles del VFX o los tres del cultivo como el menú gráfico final.

Cambiar calidad afecta a representación, no a riegos, colisiones, dinero o cupos. La noche y el Escudo deben seguir siendo legibles sin iluminación avanzada. Conservar correcciones de cámara, objetos que ocultan visión, skybox día/noche y tratamiento del agua del lab de mundo; no sustituirlos por el diorama simplificado del HUD.

---

<a id="section-21"></a>

## 21. Guardado, carga y aislamiento

### 21.1. Ranuras y disparadores

Se pueden iniciar partidas en **tantas ranuras como permita el almacenamiento**, sin límite artificial de número. La partida actual se autoguarda sobre su ranura, no sobre otra elegida arbitrariamente.

Cuatro disparadores aprobados recuperados: **amanecer después de eventos/daños; fin de ataque; vuelta al menú; confirmación de una compra estructural importante**. No añadir un autoguardado cada segundo como regla de producto no solicitada. La escritura segura por transacción es una cuestión de implementación.

### 21.2. Se guarda estado, no una ejecución exacta

Conservar entidades, fase, reloj, saldo, progresos, daños, cajas, contratación pagada, lesiones, asociaciones diarias, magias, cooldowns, incursión activa, cupos restantes, resultados aleatorios y tutorial. No es necesario serializar matrices de GPU, cada partícula ni el fotograma exacto de una animación.

Al cargar se reconstruyen presentación, navegación, reservas coherentes y tareas desde el estado permitido. **La incursión activa continúa**; cargar no la cancela ni vuelve a sortearla. Una animación de ataque necesita saber si su golpe ya ocurrió, aunque reinicie su presentación de forma segura.

### 21.3. Campos mínimos propuestos

`saveVersion`, `slotId`, semilla y versión de generación, bioma, cultura inicial, reloj/fase, noches completadas y postgame; dinero con precisión explícita; poblados y centros con IDs y daño; módulos/puertas/ruinas; plantas con especie, progreso, agua y asociación; cajas con valor, posición y portador; empleados con perfil, centro, residencia diaria, horario, carrera y lesión; áreas mágicas y recargas; incursión y encuentros sorteados; estado de contratación; pasos y mensajes del tutorial; modificaciones de chunks.

Separar ajustes globales y mensajes vistos del contenido de una ranura. No guardar `HTMLCanvasElement`, `AudioNode` o funciones. La reconstrucción de colas al cargar no debe confundirse automáticamente con la regla del amanecer que cambia asociaciones: cargar a mediodía no adelanta el nuevo reparto.

### 21.4. Integridad

Propuesta técnica: escritura de snapshot versionado con comprobación antes de reemplazar el anterior y recuperación del último válido. No afirmar compatibilidad de migración con formatos del lab si no existe conversor.

Contratación, compra, entrega de caja, evento agrícola y victoria deben disponer de marcas de ejecución para no repetirse. Un error de almacenamiento se informa; nunca se confirma «guardado» antes del éxito ni se sobrescribe una partida válida con un estado parcialmente cargado.

La Biblioteca tiene su propio estado desechable. Destruir un edificio o cosechar una planta en una demo no modifica la ranura de la campaña.

---

<a id="section-22"></a>

## 22. Arquitectura de implementación propuesta

### 22.1. Organización del repositorio

```text
wild-guardians/
  src/
    app/               arranque, pantallas y ciclo de vida
    simulation/        reloj, economía, cultivos, trabajadores, tareas, incursiones
    world/             chunks, terreno, obstáculos, colocación, asociaciones
    rendering/         modelos, clips, morph, destrucción, VFX, calidad
    audio/             SFX, ambiente, música y prioridades
    ui/                HUD, contratación, tutorial, menús, resultado
    persistence/       snapshots, validación, reconstrucción y migraciones
    library/           demos y galerías aisladas
  content/
    balance/           valores canónicos
    manifests/         modelos, clips, SFX, VFX, música, fuentes y procedencia
    texts/             textos de interfaz y guion del Espíritu
  assets/              binarios extraídos, deduplicados y cargados por demanda
  tests/               reglas puras, integración, regresión y escenarios
  docs/                plan maestro, auditoría, comprobaciones y QA
  licenses/            documentación de recursos realmente distribuidos
  references/          inventario y ubicación de originales de laboratorio
```

Esta estructura es una propuesta de trabajo, no una tecnología o framework impuesto. Evitar incrustar toda la Biblioteca y sus audios en el paquete inicial. Preservar los originales y sus hashes para comparar correcciones; no reexportar texturas o audio sin una necesidad concreta.

### 22.2. Servicios y responsabilidades

| Sistema | Decide | No decide |
|---|---|---|
| Clock | Avance y fronteras de fase; motivos de pausa | Bonificaciones económicas |
| Permission | Legalidad de comandos por fase, infraestructura y estado | Aspecto de botones |
| Economy | Validación/cobro/ingreso únicos y saldo | Qué animación se reproduce |
| Crops | Progreso, agua, madurez, estado de recogida | IDs de clips |
| Workforce | Contratación, cupos, centro y residencia de jornada | Prioridad visual de avisos |
| Tasks | FIFO, reservas y conclusión de tareas | Generación de dinero sin entrega |
| Navigation | Rutas, accesibilidad y separación física | Presupuesto de amenaza |
| Raid | Tiradas, composición, cupos, objetivos y retirada | Destrucción decorativa por partículas |
| Structures | Salud, umbral y reconstrucción | Política sonora |
| Spells | Áreas, vigencia, recarga y efecto permitido | Crear poderes a partir del catálogo |
| Renderer/VFX | Representar el estado y sus transiciones | Cobrar, herir o madurar por su cuenta |
| Audio | Reproducir y mezclar hechos válidos | Completar tareas |
| Persistence | Conservar/restaurar estado validado | Re-sortear encuentros |

### 22.3. Contratos de identidad

Propuesta: IDs permanentes para planta, caja, centro, trabajador, poblado, tramo y animal. Las ruinas conservan vínculo con la construcción reparable; un evento de destrucción no elimina prematuramente el objetivo de una reparación pendiente válida.

Las transacciones reciben un `commandId` o `eventId`. Los impactos lógicos un `attackId`. Los resultados de entrega un `crateId`. Repetir la misma confirmación no repite su efecto. Los IDs de recursos proceden de manifiestos, no del índice de una tarjeta del HUD.

### 22.4. Interfaces de referencia existentes

CULT expone inspección y control del lab; TUT dispone de `GuardianTutorial` y `GuardianWorld`; NEW, `WildGuardiansNewGameMenu` y sus eventos; VFX, `WGVFXLab`; DEST, `BIOMA`. Son puntos para extraer o probar comportamiento, no la API final del juego.

`GuardianTutorial.getGestures()` permite comprobar los ocho gestos; `GuardianWorld.showGesture(type,targetId,options)` sitúa manos sobre objetos. `WGVFXLab.seek()` es inspección visual y no debe generar golpes reales. `BIOMA.setDamage()` y su `advance()` sirven para probar colapso normalizado, no para decidir PV de centros. [TUT; VFX; DEST]

### 22.5. Eventos del dominio propuestos

`PlacementCommitted`, `CropPlaced`, `WaterBecameDue`, `WaterSatisfied`, `CropMatured`, `HarvestRequested`, `CropPicked`, `CrateDropped`, `CrateDelivered`, `HiringConfirmed`, `WorkerFleeing`, `WorkerHit`, `WorkerIncapacitated`, `RepairRequested`, `RepairApplied`, `StructureHit`, `CollapseStarted`, `StructureRuined`, `RaidSpawned`, `AnimalLogicalHit`, `AnimalRetreating`, `RaidEnded`, `SpellActivated`, `SpellExpired`, `NightCompleted`, `CampaignWon`, `GameOver`, `VillageFounded`.

Estos nombres son una propuesta técnica. Cada evento lleva únicamente el estado necesario y su identidad. El sistema de presentación puede generar varios subeventos decorativos, pero estos nunca vuelven a entrar como comandos económicos o impactos.

---

<a id="section-23"></a>

## 23. Orden de ejecución y entregables

### Fase 0 — Preparar referencias y contratos

Conservar el plan, `balance_confirmado.json`, manifiestos extraídos y hashes. Copiar los assets necesarios cuando estén disponibles, deduplicarlos por contenido y registrar qué lab originó cada corrección. Resolver nomenclatura de IDs, unidad de simulación y una sola entrada al estado.

**Salida:** proyecto arranca y muestra una escena de prueba; reglas y recursos están separados. No se exige importar todos los biomas ni todos los personajes para comenzar.

### Fase 1 — Núcleo sin dependencia de modelos pesados

Implementar reloj, permisos, saldo/transacciones, entidades persistentes, reparto global de centros, FIFO/reservas y snapshots. Usar cajas/cubos para sus representaciones de prueba, identificándolos como tales.

**Salida:** las pruebas de precios, mayor resto, bloqueo nocturno y cobro único pasan. Cambiar un valor de balance no requiere editar diez HTML.

### Fase 2 — Primer día realmente jugable

Conectar NUEVA PARTIDA para una combinación de referencia, centro inicial, ocho especies canónicas —inicialmente una basta para el corte—, primer cuidado, riego, madurez, cosecha por grupo y cajas entregadas. Integrar contratación real y el tutorial día 1 sin copiar el texto de ensayo.

**Salida:** empezar con 1.000, pagar una plantilla, producir un ingreso por transporte y terminar jornada; guardar y continuar en cualquiera de esos pasos sin duplicación.

### Fase 3 — Dos primeros días y primera amenaza

Integrar zarzas/puerta, facóquero, cupo, objetivos reservados, huida, caída/lesión, Escudo y retirada. Sincronizar un golpe lógico con la animación. Hacer noche 1 tranquila y noche 2 garantizada.

**Salida:** el primer corte vertical completo: plantar → trabajar → cobrar → defender → sobrevivir → reparar/reconstruir → continuar. Este es el primer gran hito del proyecto, antes de terminar galerías.

### Fase 4 — Agricultura y logística completas

Integrar los ocho crecimientos/morphs, tolerancias, Multiplicar y Crecimiento con checkpoints satisfechos, cuatro perfiles, varios centros, asignaciones congeladas, centros sin cultivos e inactividad animada. Añadir lesiones y retorno de ataque, cajas abandonadas y regeneración de colas.

**Salida:** las correcciones de D125–D140 se verifican con escenarios multicentro, sin rebalanceo oculto ni asociación intradía de plantas existentes.

### Fase 5 — Defensa, amenaza y economía completas

Cinco materiales/puertas y cinco animales. Implementar tabla de atracción, tiradas independientes, composición por presupuesto y ataques diurnos. Conectar colapso de casas, reparaciones al llegar y evaluadores de derrota.

**Salida:** encuentro legal en todos los presupuestos, sin colisiones evidentes, ataques infinitos por cupos reiniciados ni derrota al perder solo un centro.

### Fase 6 — Mundo completo y escala

Importar terreno/poblados finales, seis biomas, cinco culturas y 30 combinaciones. Preservar cámara, agua, iluminación y geografía. Adaptar navegación a cada tamaño animal y caminos poblado–centro. Descargar representación sin alterar estado.

**Salida:** las 30 combinaciones generan una salida inicial viable; cámara y calidad no cambian resultados de simulación. Las plantaciones lejanas mantienen sus datos.

### Fase 7 — Campaña, eventos y postgame

Completar el contrato acotado de eventos antes de aplicar porcentajes. Integrar su narración, la progresión tutorial y victoria tras cien noches. Añadir fórmula de poblados, elección cultural y preview fantasma todo-o-nada.

**Salida:** campaña terminable y continuación en la misma ranura sin ataques; varios poblados operativos, sin límite artificial de tres ni mudanzas a mitad de jornada.

### Fase 8 — Presentación y audio final

Conectar progresivamente SFX/VFX desde la fase 2 y completar ahora la cobertura trazada, mezcla, tres pistas/paquetes musicales, fuentes y perfiles gráficos. Importar los labs pesados que faltan sin alterar reglas para acomodar demos.

**Salida:** cada sonido activo tiene una ocasión real, no se inventan mecánicas para los reservados, el combo no multiplica daño y no quedan loops huérfanos.

### Fase 9 — Biblioteca, créditos y distribución

Publicar demostraciones seleccionadas de cultivo, Bastión y destrucción, junto con las imágenes que correspondan. Aislar dinero y estado de la partida. Preparar créditos de recursos usados, documentación de origen e instrucciones de ejecutar/construir el proyecto.

**Salida:** la Biblioteca abre y cierra bajo demanda sin cargar todos los modelos al empezar ni modificar una ranura. Procedencia y contenido final coinciden.

### Fase 10 — Validación y ajuste de balance

Ejecutar pruebas automáticas y manuales de primer día, segunda noche, alta prosperidad, cien noches y expansión. Medir memoria, draw calls, CPU de navegación, GPU, audio y tiempo por ciclo sobre dispositivos identificados.

**Salida:** no hay fallos bloqueantes; los cambios numéricos necesarios se registran como balance nuevo, no se ocultan en el renderer. No afirmar «funciona en móvil» por el hecho de que un único lab abra.

### Trabajo paralelo razonable

Catálogos, guion y procedencia pueden avanzar mientras se implementa el núcleo. Audio de acciones se conecta a eventos ya reales. La Biblioteca no debe bloquear el corte vertical. Mundo, economía y navegación se coordinan: no se ajustan salarios sin medir los recorridos que consumirán la jornada.

---

<a id="section-24"></a>

## 24. Plan de pruebas y criterios de aceptación

Las pruebas del apéndice C son casos concretos, no una afirmación de que ya se hayan ejecutado en el juego. El paquete incluye además una verificación aritmética ejecutable para reparto, costes y composiciones; no sustituye integración ni playtesting.

### 24.1. Escenarios obligatorios

Primera partida sin tutorial visto; segunda ranura con tutorial omitido y mensaje nuevo; explotación pequeña; muchos cultivos de una sola especie; varias especies separadas; varios centros con 0/20/100 plantas; más y menos trabajadores que centros; reconstrucción del último centro; ataque durante transporte; varias lesiones; finca en borde de chunks; máxima atracción; fin de noche 100; postgame con poblados contiguos y varias culturas.

La matriz visual comprende escritorio, móvil vertical y móvil horizontal; controles táctiles y ratón/teclado; cuatro calidades; día/noche; foco perdido y contexto gráfico perdido. No se fijan objetivos de FPS sin dispositivo y escena de referencia.

### 24.2. Riesgos de balance que deben medirse, no reescribirse de memoria

**Arranque:** 800 del centro deja 200 para salario, plantas y margen. La tabla debe poder sostener la enseñanza real, no solo una cuenta de costes. **Escalado de amenaza:** los escalones afectan a probabilidad, repertorio y presupuesto; medir el salto conjunto. **Reservas animales:** un único grupo valioso puede hacer retirarse a compañeros; es la regla de exclusividad, no un bug por sí sola.

**Centros nuevos:** pueden recibir plantas nuevas pero no plantilla hasta el siguiente amanecer; la interfaz debe dejarlo comprensible. **Cultivos lentos:** dos jornadas perfectas de plátano exigen pagar trabajo y sobrevivir entre ambas. **Tolerancias largas:** comprobar la frontera con madurez y agua pendiente antes de dar por resuelto el contrato hídrico. **Umbrales de Game Over:** no etiquetar como formalmente viable una ruta sin haber medido cuándo produce el ingreso.

### 24.3. Definición de versión jugable completa

Se puede jugar desde Nueva partida hasta completar cien noches y continuar; las 30 combinaciones están disponibles y transitables; todos los sistemas canónicos conservan sus reglas; compra/contratación/cosecha/reparación se liquidan una vez; no hay traspasos de modelos por navegación defectuosa; estado y azar se conservan; los mensajes se corresponden con hechos; los recursos usados tienen procedencia; el rendimiento está medido con escenarios representativos.

Que un parámetro visual quede calibrado durante integración no significa que el diseño deba reabrirse. En cambio, una ambigüedad que cambia ingresos, riegos o supervivencia se resuelve explícitamente antes de activar ese comportamiento.

---

<a id="section-25"></a>

## 25. Correcciones consolidadas y propuestas descartadas

| Asunto | Regla que prevalece | No volver a introducir |
|---|---|---|
| Día útil agrícola | Cinco minutos de luz por ciclo | Diez minutos diarios de crecimiento |
| Crecimiento por especie | Curva 2:20–9:30 aprobada | ×2 o ×4 uniforme de los tiempos demo |
| Riego con Crecimiento | Checkpoints cruzados se dan por regados; deuda previa no se cura | Regar dos veces por acelerar o borrar cualquier falta anterior |
| Cosecha por grupo | Tareas individuales y entrega de cada caja | Desaparecer todo el grupo al tocar y cobrar instantáneamente |
| Tamaño de incursión | Presupuesto con composición legal | Rangos fijos de número de animales por atracción |
| Combo | Un golpe lógico | Tres daños porque el VFX lance tres contactos |
| Poblados | Sin máximo artificial; coste lineal | Solo segundo/tercero o crecimiento exponencial ×1,5 |
| Reparto laboral | Uno por centro operativo si alcanza; sobrantes por plantas | Cola actual, predicción de riegos o solo centros con cultivos |
| Centro sin plantas | Puede recibir su trabajador base | Excepción de «una planta ficticia» por cajas |
| Poblados y empleo | Reparto directo entre todos los centros | Reparto previo igualitario entre poblados |
| Plantas existentes | Asociación diaria; recalcular al amanecer | Migración de colas al construir un centro a mediodía |
| Plantas nuevas | Centro más cercano al colocarlas | Redistribuir trabajadores para atenderlas |
| Sin centro | Gestión bloqueada; solo recuperación de centro | Permitir plantar o levantar murallas sin infraestructura |
| Reparación | Coste real al llegar; hasta 100% si se destruyó | Cobrar al ordenar o cancelar solo porque se convirtió en ruina |
| Colapso visual | Umbrales 20% vida en BAST y 79% daño en DEST | Igualarlos silenciosamente o cobrar por fase visual |
| Tutorial | Gestos V8 comprobados; seis manos solo día 1 | Confundir manos y expresiones o usar la lista de otra revisión |
| Incapacitado | Retirada lenta con correr ralentizado | Caminar saltarín o volver al trabajo ese día |
| Guardado | Estado persistente y ataque continuable | Captura literal de ejecución o nuevo sorteo al cargar |
| SFX/VFX extra | Inventario trazado con usos y reservas | Inventar muerte, curación o un cuarto poder para usarlos |

El siguiente registro conserva la trazabilidad de las decisiones numeradas visibles de cierre sin volver a formular preguntas.

| Decisión | Contenido vigente consolidado |
| --- | --- |
| D100 | Precios de plantación canónicos de los ocho cultivos; consultar tabla económica. |
| D101 | Valores base de cosecha canónicos; ingresos solo tras entrega física. |
| D102 | Curva de crecimiento efectivo 140/180/220/270/330/405/480/570 s, no multiplicador uniforme del lab. |
| D103 | Riegos por fracción del crecimiento; inicial incluido y Crecimiento satisface los checkpoints cruzados, no la carencia previa. |
| D104 | Madurez estable indefinida, sin nuevos riegos ni deterioro por espera. |
| D105 | Orden por grupo contiguo de especie; ejecución individual por planta. |
| D106 | Lote de tareas de cosecha: distancia al centro como orden inicial, luego FIFO. |
| D107 | Desbloqueos por atracción 500/1.500/4.000/10.000; las especies inferiores permanecen. |
| D108 | Probabilidad nocturna 25/40/55/70/85%, tiradas independientes y excepción tutorial. |
| D109 | Amenaza por especie 1/3/5/7/10; fuerza y número se sustituyen mediante composiciones. |
| D110 | Presupuesto por franja 1–2/3–4/5–7/7–10/10–14. |
| D111 | Composiciones únicas aleatorias: máximo cinco, límites 3/2/2/2/1 por especie y gasto 75–100%. |
| D112 | Ataque diurno de prosperidad: ≥10.000, 10% diario, amenaza 7–10, independiente del nocturno. |
| D113 | Ataque nocturno entre 20:00–05:00; sorteo con fotografía de atracción al inicio de noche. |
| D114 | Grupo simultáneo desde zona común del borde activo, posiciones separadas. |
| D115 | Un único momento candidato diurno secreto cada mañana entre 09:00–16:00. |
| D116 | Todo centro de trabajo cuesta 800 sin escalado. |
| D117 | Defensas cuestan 10/20/35/55/80; PV 100/200/300/400/500, puerta al 60% y mismo precio. |
| D118 | Daño estructural animal 40/50/70/80/120 por golpe lógico; cultivo destruido de uno. |
| D119 | Centro 600 PV; colapso a 79% de daño, 3,2 s. |
| D120 | Poblados sin tope artificial; C(n)=50.000+25.000(n−2), n≥2. |
| D121 | Cualquier cultura para cada poblado adicional; sin diferencias estadísticas. |
| D122 | Poblado fantasma recolocable; confirmación todo-o-nada. |
| D123 | Centro laboral fijo durante jornada; residencia diaria no cambia por expansión. |
| D124 | Destrucción permite reasignar al centro superviviente del mismo poblado; sin destino, retirada. |
| D125 | Corregida: reparto por extensión agrícola, nunca por cola actual ni predictiva; mínimo cubierto por D136 final. |
| D126 | Reparto equilibrado de perfiles sin optimizar sus bonificaciones; cualquier desempate de carga se interpreta con plantas, no tareas. |
| D127 | Centro puede cambiar de poblado asociado por distancia real; empleados mantienen origen de hoy. |
| D128 | Corregida: centro nuevo no roba cultivos existentes a mediodía ni recibe plantilla normal hasta amanecer; excepción desplazados. |
| D129 | Versión vigente: cultivo sin centro conserva estado y necesidades, sin tareas; respetar límites hídricos. Se descartó migrar tareas al crear centro. |
| D130 | Sin máximo artificial de empleados por centro. |
| D131 | Personal inactivo conserva salario y presencia; espera, observa o pasea cerca. |
| D132 | Paseos ambientales caminando hasta aproximadamente 8 m del centro. |
| D133 | FIFO elige tarea y proximidad elige trabajador libre de ese centro. |
| D134 | Reserva de tarea desde aceptación; se libera al completar, invalidarse o interrumpirse según regla. |
| D135 | Tamaño agrícola = número de plantas vivas, una unidad cada una. |
| D136 | Corregida: un trabajador a todo centro operativo si alcanza, incluso vacío; solo los sobrantes por mayor resto ponderado por plantas. |
| D137 | En escasez, un trabajador a los centros con más plantas; empate por antigüedad/ID. |
| D138 | Reparto directo entre centros del mundo; no una cuota previa por poblado. |
| D139 | Planta recién colocada se asocia al centro operativo más cercano en ese instante hasta próxima reconstrucción diaria. |
| D140 | Sin centro operativo no hay gestión de finca; solo construir/reconstruir centro, conservando interfaz. |
| D141 | Fin de incursión sin ningún centro y saldo <800: Game Over inmediato. |
| D142 | Comprobar ruta económica mínima al amanecer antes de contratar. |
| D143 | Umbrales de recuperación 100/105/900/905 según centro y cultivos/cajas. |
| D144 | La orden de reparar no se cancela solo por mayor daño o ruina; coste real y saldo al llegar, hasta 100% del precio. |

---

<a id="section-26"></a>

## 26. Comprobaciones acotadas que no se deben rellenar inventando

### 26.1. Recursos pesados que faltan importar

**Terreno y poblados:** dimensiones de chunk, distancias de carga/dibujado, parámetros exactos de cámara/calidad, límites de pendiente, supresión procedural y layout orgánico. Su funcionalidad está descrita; los números y las correcciones exactas se obtienen de L04/L06.

**Trabajadores y animales:** nombres de clips, duración de acciones, marcadores de contacto, escalas, herramientas y puntos de sujeción, radios/velocidades y equivalencia en metros de tres trayectos largos. Conservar lesiones y cupos definidos sin fabricar nombres o tiempos de animación.

**Música/menú/fuentes:** stems, regiones de loop, lógica de alternancia A/B, revisión corregida del menú y metadatos de Ga Maamli/Banga. No bloquear el núcleo; importar esos datos al conectar presentación.

### 26.2. Detalles de reglas no recuperados inequívocamente

| Ref. | Falta acotada | Lo que sí queda fijado | Qué no hacer mientras se verifica |
|---|---|---|---|
| C01 | Magnitud afectada y selección exacta de severidad de eventos agrícolas | Frecuencia, reparto positivo/negativo, tope y comunicación al amanecer | Destruir plantas o multiplicar dinero por intuición |
| C02 | Redondeo contable y combinación exacta de modificadores, si se exige una regla distinta de multiplicarlos | Precios, salarios, +20% masculino y ×2 de Multiplicar | Importar `Math.round` del HUD como decisión económica |
| C03 | Instante inicial del cooldown y medida final de radios | Duraciones, recargas, tamaños relativos, no solapamiento y reloj simulado | Usar los cooldowns demo ni asumir que cobertura es un máximo de plantas |
| C04 | Crecimiento antes del primer riego y frontera madurez/deuda dentro de tolerancia | Brote instantáneo, riego inicial incluido, checkpoints y tolerancias | Añadir un riego extra o permitir que todos los últimos riegos desaparezcan sin comprobar la frontera |
| C05 | Persistencia de una cosecha ya ordenada al rehacer FIFO | Cosecha no automática; cajas persisten; reparaciones manuales no se regeneran | Interpretar toda madurez como orden de cosecha |
| C06 | Reparador llega durante la caída y entrada exacta del centro en estado no operativo | Colapso irreversible, orden no cancelada solo por mayor daño, precio real al llegar | Cancelar D144 o usar reset de laboratorio como regla final |
| C07 | Incursión que cruza amanecer y precedencia del cierre de noche 100 frente a derrota | Ataque continúa hasta resolución; victoria al completar 100; evaluaciones de derrota establecidas | Saltarse una incursión/contratación o resolver terminales por callbacks desordenados |
| C08 | Cantidad/perfil exactos del lote guiado inicial e identidad de lesionados recontratados | Secuencia del tutorial, presupuesto 1.000 y consecuencias de lesión | Inventar un lote obligatorio o perjudicar a todos los miembros de un perfil por un solo herido |

Estas comprobaciones **no afirman que nunca se hablara del detalle**: indican que no ha quedado acreditado de forma inequívoca en el material revisado y el contexto recuperado de esta edición. Se completan con el fragmento de acuerdo o el lab correspondiente, sin repetir el proceso de 144 decisiones ni abrir funcionalidades nuevas.

### 26.3. Forma de completar el documento

Una comprobación se cierra escribiendo una regla breve o importando un parámetro verificable, indicando fuente y agregando su caso de prueba. No se modifica la tabla económica o la asignación laboral de manera colateral. El resto del plan sigue siendo utilizable y las primeras fases pueden implementarse de inmediato.

---

<a id="section-27"></a>

## Apéndice A. Los 126 SFX: identidad y mapeo de implementación

**Fuente:** SFX, `bankData.items`. Nombres/IDs/archivos/condición de bucle son datos extraídos. **Disparador y uso** son propuestas de integración compatibles con las reglas; «reserva» identifica ausencia de una ocasión de gameplay acreditada. No significa que se haya rechazado o eliminado la toma.

El JSON conserva duración, bytes, SHA-256, sonoridad y pico por entrada. La tabla no repite todos esos números para facilitar lectura. El mapeo no obliga a reproducir simultáneamente todas las alternativas de la misma acción.

### A.1. Ambiente

| N.º | ID / nombre | Archivo | Tipo / destino | Disparador propuesto |
| --- | --- | --- | --- | --- |
| 001 | `amb_wind_soft` — Viento suave | `001_amb_wind_soft.mp3` | Bucle; Uso de gameplay previsto | Fondo de brisa; bucle espacial/ambiental de baja presencia. |
| 002 | `amb_wind_strong` — Viento fuerte | `002_amb_wind_strong.mp3` | Bucle; Uso de gameplay previsto | Variante de viento perceptible; mezcla de ambiente sin monopolizar el paisaje. |
| 003 | `amb_insects` — Insectos | `003_amb_insects.mp3` | Bucle; Uso de gameplay previsto | Insectos ambientales; activar por zona y limitar su densidad. |
| 004 | `amb_birds` — Pájaros | `004_amb_birds.mp3` | Bucle; Uso de gameplay previsto | Aves diurnas; ambiente, no entidades jugables nuevas. |
| 005 | `amb_night` — Ambiente nocturno | `005_amb_night.mp3` | Bucle; Uso de gameplay previsto | Fondo nocturno; fundido al cambiar de fase, sin duplicar el bucle. |
| 006 | `amb_river` — Agua de río | `006_amb_river.mp3` | Bucle; Uso de gameplay previsto | Proximidad a agua fluvial; atenuación según distancia. |
| 007 | `amb_coast_mangrove` — Agua de costa / manglar | `007_amb_coast_mangrove.mp3` | Bucle; Uso de gameplay previsto | Proximidad a costa/manglares; no superponer a máximo con todos los otros ambientes. |
| 008 | `amb_rain` — Lluvia | `008_amb_rain.mp3` | Bucle; Reserva documentada | Reserva de ambiente de lluvia; no crear un sistema meteorológico no aprobado. |
| 009 | `amb_thunder` — Truenos | `009_amb_thunder.mp3` | Puntual; Reserva documentada | Reserva de trueno; no implica evento climático ni daño. |

### A.2. Movimiento de personajes

| N.º | ID / nombre | Archivo | Tipo / destino | Disparador propuesto |
| --- | --- | --- | --- | --- |
| 010 | `step_dry_soil` — Pasos · tierra seca | `010_step_dry_soil.mp3` | Puntual; Uso de gameplay previsto | Apoyo de pie de trabajador sobre tierra seca. |
| 011 | `step_grass` — Pasos · hierba | `011_step_grass.mp3` | Puntual; Uso de gameplay previsto | Apoyo de pie de trabajador sobre hierba. |
| 012 | `step_mud` — Pasos · barro | `012_step_mud.mp3` | Puntual; Uso de gameplay previsto | Apoyo de pie de trabajador sobre barro. |
| 013 | `step_sand` — Pasos · arena | `013_step_sand.mp3` | Puntual; Uso de gameplay previsto | Apoyo de pie de trabajador sobre arena. |
| 014 | `step_stone` — Pasos · piedra | `014_step_stone.mp3` | Puntual; Uso de gameplay previsto | Apoyo de pie de trabajador sobre piedra. |
| 015 | `step_wood` — Pasos · madera | `015_step_wood.mp3` | Puntual; Uso de gameplay previsto | Apoyo de pie de trabajador sobre madera. |
| 016 | `run_surface_set` — Carrera · variaciones por superficie | `016_run_surface_set.mp3` | Puntual; Uso de gameplay previsto | Carrera de personajes; usar la toma aprobada, no inventar variantes de superficie ausentes. |
| 017 | `movement_land` — Pequeño aterrizaje / salto | `017_movement_land.mp3` | Puntual; Alternativa / contextual | Apoyo/aterrizaje de una animación existente, por ejemplo caída; no añade un salto controlable. |

### A.3. Agricultura

| N.º | ID / nombre | Archivo | Tipo / destino | Disparador propuesto |
| --- | --- | --- | --- | --- |
| 018 | `farm_hoe_dig` — Azada / cavar tierra | `018_farm_hoe_dig.mp3` | Puntual; Uso de gameplay previsto | Contacto de azada durante la atención inicial; sincronizar con el clip. |
| 019 | `farm_sow` — Sembrar | `019_farm_sow.mp3` | Puntual; Uso de gameplay previsto | Gesto de siembra inicial que realiza el trabajador. |
| 020 | `farm_seeds_drop` — Semillas cayendo | `020_farm_seeds_drop.mp3` | Puntual; Alternativa / contextual | Detalle de semillas al sembrar; alternativa/capa tenue de farm_sow. |
| 021 | `farm_watering_can` — Regadera vertiendo agua | `021_farm_watering_can.mp3` | Puntual; Uso de gameplay previsto | Vertido de regadera; conservar exactamente la asignación 021 aprobada. |
| 022 | `farm_water_soil` — Agua golpeando tierra | `022_farm_water_soil.mp3` | Puntual; Uso de gameplay previsto | Contacto de agua con tierra; conservar exactamente la asignación 022 aprobada. |
| 023 | `farm_harvest_pick` — Recoger cultivo | `023_farm_harvest_pick.mp3` | Puntual; Uso de gameplay previsto | Contacto de recogida de una planta madura. |
| 024 | `farm_plant_pull` — Arrancar planta | `024_farm_plant_pull.mp3` | Puntual; Uso de gameplay previsto | Extracción de raíz/planta en cosecha; alternativa por especie, no segundo ingreso. |
| 025 | `farm_crop_to_crate` — Colocar cosecha en caja | `025_farm_crop_to_crate.mp3` | Puntual; Uso de gameplay previsto | Depósito de producto en la caja durante la cadena de cosecha. |
| 026 | `farm_crate_move` — Caja de fruta moviéndose | `026_farm_crate_move.mp3` | Puntual; Uso de gameplay previsto | Levantar/dejar una caja; una toma por acción, no por fotograma. |
| 027 | `farm_sack_handle` — Saco manipulándose | `027_farm_sack_handle.mp3` | Puntual; Reserva documentada | Reserva de manejo de saco; no hay un objeto saco jugable aprobado. |
| 028 | `farm_crop_interact` — Interacción genérica con cultivo | `028_farm_crop_interact.mp3` | Puntual; Alternativa / contextual | Interacción ligera con vegetación; variante contextual de agricultura. |

### A.4. Construcción

| N.º | ID / nombre | Archivo | Tipo / destino | Disparador propuesto |
| --- | --- | --- | --- | --- |
| 029 | `build_place` — Colocar elemento / edificio | `029_build_place.mp3` | Puntual; Uso de gameplay previsto | Confirmación de una colocación válida; nunca al mover el fantasma. |
| 030 | `build_tool_hit` — Golpe de herramienta | `030_build_tool_hit.mp3` | Puntual; Alternativa / contextual | Contacto de herramienta de construcción/reparación cuando exista en la animación. |
| 031 | `build_wood` — Construcción · madera | `031_build_wood.mp3` | Puntual; Alternativa / contextual | Textura sonora de obra de madera; alternativa por material. |
| 032 | `build_stone` — Construcción · piedra | `032_build_stone.mp3` | Puntual; Alternativa / contextual | Textura sonora de obra de piedra; alternativa por material. |
| 033 | `build_adobe` — Construcción · adobe / barro | `033_build_adobe.mp3` | Puntual; Alternativa / contextual | Textura sonora de obra de adobe; alternativa por material. |
| 034 | `build_complete` — Construcción terminada | `034_build_complete.mp3` | Puntual; Uso de gameplay previsto | Construcción confirmada y terminada; no cobrar aquí una segunda vez. |
| 035 | `build_repair` — Reparación | `035_build_repair.mp3` | Puntual; Uso de gameplay previsto | Reparación ejecutada tras comprobar y descontar el coste al llegar. |
| 036 | `build_demolish_manual` — Demolición voluntaria | `036_build_demolish_manual.mp3` | Puntual; Uso de gameplay previsto | Eliminación manual permitida de una defensa; no decide reembolsos ni costes. |

### A.5. Murallas y destrucción

| N.º | ID / nombre | Archivo | Tipo / destino | Disparador propuesto |
| --- | --- | --- | --- | --- |
| 037 | `wall_hit_thorns` — Impacto · zarzas | `037_wall_hit_thorns.mp3` | Puntual; Uso de gameplay previsto | Impacto lógico en zarzas. |
| 038 | `wall_hit_wood` — Impacto · madera | `038_wall_hit_wood.mp3` | Puntual; Uso de gameplay previsto | Impacto lógico en madera. |
| 039 | `wall_hit_stone` — Impacto · piedra | `039_wall_hit_stone.mp3` | Puntual; Uso de gameplay previsto | Impacto lógico en piedra. |
| 040 | `wall_hit_adobe` — Impacto · adobe | `040_wall_hit_adobe.mp3` | Puntual; Uso de gameplay previsto | Impacto lógico en adobe. |
| 041 | `wall_hit_reinforced_adobe` — Impacto · adobe reforzado | `041_wall_hit_reinforced_adobe.mp3` | Puntual; Uso de gameplay previsto | Impacto lógico en adobe reforzado. |
| 042 | `wall_crack_small` — Pequeñas grietas | `042_wall_crack_small.mp3` | Puntual; Alternativa / contextual | Pequeña rotura en contacto válido; no se reproduce como daño autónomo. |
| 043 | `wall_debris_small` — Desprendimiento de fragmentos | `043_wall_debris_small.mp3` | Puntual; Alternativa / contextual | Caída de fragmentos decorativos; limitar voces simultáneas. |
| 044 | `wall_structural_creak` — Crujido estructural | `044_wall_structural_creak.mp3` | Puntual; Alternativa / contextual | Crujido al alcanzar daño estructural alto; disparador de estado, no continuo. |
| 045 | `wall_collapse_full` — Colapso completo | `045_wall_collapse_full.mp3` | Puntual; Uso de gameplay previsto | Colapso estructural iniciado por el motor de destrucción; una vez por colapso. |
| 046 | `wall_debris_ground` — Fragmentos cayendo al suelo | `046_wall_debris_ground.mp3` | Puntual; Alternativa / contextual | Contacto final de restos con el suelo; presentación del colapso. |

### A.6. Bestias · comunes

| N.º | ID / nombre | Archivo | Tipo / destino | Disparador propuesto |
| --- | --- | --- | --- | --- |
| 047 | `beast_step_light` — Pasos ligeros | `047_beast_step_light.mp3` | Puntual; Uso de gameplay previsto | Apoyos de bestia ligera; marcadores de animación. |
| 048 | `beast_step_heavy` — Pasos pesados | `048_beast_step_heavy.mp3` | Puntual; Uso de gameplay previsto | Apoyos de bestia pesada; marcadores de animación. |
| 049 | `beast_charge` — Carrera / carga | `049_beast_charge.mp3` | Puntual; Alternativa / contextual | Carga genérica; alternativa cuando no se usa la carga específica de la especie. |
| 050 | `beast_attack` — Ataque | `050_beast_attack.mp3` | Puntual; Alternativa / contextual | Ataque genérico; alternativa a la toma específica, no repetición de daño. |
| 051 | `beast_hit_structure` — Impacto contra estructura | `051_beast_hit_structure.mp3` | Puntual; Alternativa / contextual | Contacto de bestia contra estructura; combinar con material solo si la mezcla lo necesita. |
| 052 | `beast_hit_character` — Impacto contra personaje | `052_beast_hit_character.mp3` | Puntual; Uso de gameplay previsto | Contacto de bestia contra trabajador; una agresión lógica. |
| 053 | `beast_take_damage` — Recibir daño | `053_beast_take_damage.mp3` | Puntual; Reserva documentada | Reserva: recibir daño animal no tiene sistema de salud ofensivo acreditado. |
| 054 | `beast_vocal_neutral` — Vocalización neutra | `054_beast_vocal_neutral.mp3` | Puntual; Alternativa / contextual | Vocalización animal neutra genérica; alternativa, baja frecuencia. |
| 055 | `beast_vocal_aggressive` — Vocalización agresiva | `055_beast_vocal_aggressive.mp3` | Puntual; Alternativa / contextual | Vocalización agresiva genérica; alternativa a la especie. |
| 056 | `beast_retreat` — Huida / retirada | `056_beast_retreat.mp3` | Puntual; Alternativa / contextual | Retirada genérica; alternativa a la especie. |
| 057 | `beast_defeat` — Muerte / derrota | `057_beast_defeat.mp3` | Puntual; Reserva documentada | Reserva: derrota/muerte animal no forma parte del combate aprobado. |

### A.7. Bestias · león

| N.º | ID / nombre | Archivo | Tipo / destino | Disparador propuesto |
| --- | --- | --- | --- | --- |
| 058 | `lion_neutral` — León · vocalización neutra | `058_lion_neutral.mp3` | Puntual; Uso de gameplay previsto | Vocalización neutra del león durante espera o aproximación; limitar frecuencia. |
| 059 | `lion_aggressive` — León · rugido / agresiva | `059_lion_aggressive.mp3` | Puntual; Uso de gameplay previsto | Aviso agresivo/rugido del león; no añade una habilidad de área. |
| 060 | `lion_attack` — León · ataque | `060_lion_attack.mp3` | Puntual; Uso de gameplay previsto | Animación de ataque del león; varios sonidos decorativos no multiplican daño. |
| 061 | `lion_hurt` — León · daño | `061_lion_hurt.mp3` | Puntual; Reserva documentada | Reserva: león herido, sin mecánica de daño al animal acreditada. |
| 062 | `lion_retreat` — León · retirada | `062_lion_retreat.mp3` | Puntual; Uso de gameplay previsto | Retirada del león por cupo agotado o sin objetivo libre. |

### A.8. Bestias · hiena

| N.º | ID / nombre | Archivo | Tipo / destino | Disparador propuesto |
| --- | --- | --- | --- | --- |
| 063 | `hyena_neutral` — Hiena · vocalización neutra | `063_hyena_neutral.mp3` | Puntual; Uso de gameplay previsto | Vocalización neutra de hiena. |
| 064 | `hyena_aggressive` — Hiena · agresiva / risa | `064_hyena_aggressive.mp3` | Puntual; Uso de gameplay previsto | Aviso agresivo de hiena. |
| 065 | `hyena_attack` — Hiena · ataque | `065_hyena_attack.mp3` | Puntual; Uso de gameplay previsto | Ataque de hiena, sincronizado con la acción válida. |
| 066 | `hyena_hurt` — Hiena · daño | `066_hyena_hurt.mp3` | Puntual; Reserva documentada | Reserva: hiena herida, sin mecánica de daño al animal acreditada. |
| 067 | `hyena_retreat` — Hiena · retirada | `067_hyena_retreat.mp3` | Puntual; Uso de gameplay previsto | Retirada de hiena. |

### A.9. Bestias · búfalo

| N.º | ID / nombre | Archivo | Tipo / destino | Disparador propuesto |
| --- | --- | --- | --- | --- |
| 068 | `buffalo_neutral` — Búfalo · vocalización neutra | `068_buffalo_neutral.mp3` | Puntual; Uso de gameplay previsto | Vocalización neutra de búfalo. |
| 069 | `buffalo_aggressive` — Búfalo · agresiva | `069_buffalo_aggressive.mp3` | Puntual; Uso de gameplay previsto | Aviso agresivo de búfalo. |
| 070 | `buffalo_charge` — Búfalo · carga | `070_buffalo_charge.mp3` | Puntual; Uso de gameplay previsto | Carga/ataque de búfalo; no añade un golpe lógico extra. |
| 071 | `buffalo_hurt` — Búfalo · daño | `071_buffalo_hurt.mp3` | Puntual; Reserva documentada | Reserva: búfalo herido, sin mecánica de daño al animal acreditada. |
| 072 | `buffalo_retreat` — Búfalo · retirada | `072_buffalo_retreat.mp3` | Puntual; Uso de gameplay previsto | Retirada de búfalo. |

### A.10. Bestias · rinoceronte

| N.º | ID / nombre | Archivo | Tipo / destino | Disparador propuesto |
| --- | --- | --- | --- | --- |
| 073 | `rhino_neutral` — Rinoceronte · vocalización neutra | `073_rhino_neutral.mp3` | Puntual; Uso de gameplay previsto | Vocalización neutra de rinoceronte. |
| 074 | `rhino_aggressive` — Rinoceronte · agresiva | `074_rhino_aggressive.mp3` | Puntual; Uso de gameplay previsto | Aviso agresivo de rinoceronte. |
| 075 | `rhino_charge` — Rinoceronte · carga | `075_rhino_charge.mp3` | Puntual; Uso de gameplay previsto | Carga/ataque de rinoceronte. |
| 076 | `rhino_hurt` — Rinoceronte · daño | `076_rhino_hurt.mp3` | Puntual; Reserva documentada | Reserva: rinoceronte herido, sin mecánica de daño al animal acreditada. |
| 077 | `rhino_retreat` — Rinoceronte · retirada | `077_rhino_retreat.mp3` | Puntual; Uso de gameplay previsto | Retirada de rinoceronte. |

### A.11. Bestias · facóquero

| N.º | ID / nombre | Archivo | Tipo / destino | Disparador propuesto |
| --- | --- | --- | --- | --- |
| 078 | `warthog_neutral` — Facóquero · vocalización neutra | `078_warthog_neutral.mp3` | Puntual; Uso de gameplay previsto | Vocalización neutra de facóquero. |
| 079 | `warthog_aggressive` — Facóquero · agresiva | `079_warthog_aggressive.mp3` | Puntual; Uso de gameplay previsto | Aviso agresivo de facóquero. |
| 080 | `warthog_charge` — Facóquero · carga | `080_warthog_charge.mp3` | Puntual; Uso de gameplay previsto | Carga/ataque de facóquero. |
| 081 | `warthog_hurt` — Facóquero · daño | `081_warthog_hurt.mp3` | Puntual; Reserva documentada | Reserva: facóquero herido, sin mecánica de daño al animal acreditada. |
| 082 | `warthog_retreat` — Facóquero · retirada | `082_warthog_retreat.mp3` | Puntual; Uso de gameplay previsto | Retirada de facóquero. |

### A.12. Granjero / NPC

| N.º | ID / nombre | Archivo | Tipo / destino | Disparador propuesto |
| --- | --- | --- | --- | --- |
| 083 | `npc_work_effort` — Esfuerzo trabajando | `083_npc_work_effort.mp3` | Puntual; Uso de gameplay previsto | Esfuerzo breve al trabajar; cadencia limitada por trabajador y cámara. |
| 084 | `npc_danger_react` — Reacción al peligro | `084_npc_danger_react.mp3` | Puntual; Uso de gameplay previsto | Reacción al peligro al entrar en huida; no repetir en cada evaluación de IA. |
| 085 | `npc_flee_shout` — Grito breve al huir | `085_npc_flee_shout.mp3` | Puntual; Uso de gameplay previsto | Grito de huida contenido; mantener su normalización y limitar multitud. |
| 086 | `npc_hit` — Recibir golpe | `086_npc_hit.mp3` | Puntual; Uso de gameplay previsto | Recepción de un golpe por un trabajador. |
| 087 | `npc_fall` — Caída | `087_npc_fall.mp3` | Puntual; Uso de gameplay previsto | Caída del trabajador, ligada a la transición de lesión. |
| 088 | `npc_acknowledge` — Confirmación vocal discreta | `088_npc_acknowledge.mp3` | Puntual; Alternativa / contextual | Acuse de tarea/reacción breve de NPC; no usar todos a la vez tras contratación. |

### A.13. Espíritu / jugador

| N.º | ID / nombre | Archivo | Tipo / destino | Disparador propuesto |
| --- | --- | --- | --- | --- |
| 089 | `spirit_appear` — Aparición | `089_spirit_appear.mp3` | Puntual; Uso de gameplay previsto | Entrada del avatar del Espíritu o presencia narrativa; sin entidad física nueva. |
| 090 | `spirit_disappear` — Desaparición | `090_spirit_disappear.mp3` | Puntual; Uso de gameplay previsto | Salida del avatar; conservar toma y detalle final aprobados. |
| 091 | `spirit_move` — Movimiento espiritual | `091_spirit_move.mp3` | Puntual; Alternativa / contextual | Movimiento de presencia/gesto del Espíritu; uso ambiental opcional, no loop obligatorio de cámara. |
| 092 | `spirit_select` — Seleccionar | `092_spirit_select.mp3` | Puntual; Alternativa / contextual | Selección con interacción espiritual; alternativa a ui_click. |
| 093 | `spirit_touch` — Tocar / interactuar | `093_spirit_touch.mp3` | Puntual; Alternativa / contextual | Toque guiado del tutorial o interacción espiritual; no duplicar todos los clics. |
| 094 | `spirit_drag` — Arrastrar | `094_spirit_drag.mp3` | Puntual; Alternativa / contextual | Arrastre guiado/colocación; controlar inicio y fin, no disparar por cada pixel. |
| 095 | `spirit_drop` — Soltar | `095_spirit_drop.mp3` | Puntual; Alternativa / contextual | Soltar una previsualización; no equivale todavía a una compra. |
| 096 | `spirit_valid` — Acción válida | `096_spirit_valid.mp3` | Puntual; Alternativa / contextual | Colocación/interacción válida; feedback distinto de pago. |
| 097 | `spirit_invalid` — Acción inválida | `097_spirit_invalid.mp3` | Puntual; Alternativa / contextual | Colocación/interacción no válida; limitar repetición mientras permanece inválida. |
| 098 | `spirit_power_activate` — Poder activado | `098_spirit_power_activate.mp3` | Puntual; Uso de gameplay previsto | Activación de una de las tres magias; VFX/poder deciden el evento. |
| 099 | `spirit_power_charge` — Poder cargándose | `099_spirit_power_charge.mp3` | Puntual; Alternativa / contextual | Preparación o disponibilidad de magia; variante de presentación, no alarga la activación. |
| 100 | `spirit_tutorial_cue` — Tutorial / indicación especial | `100_spirit_tutorial_cue.mp3` | Puntual; Uso de gameplay previsto | Entrada de explicación del tutorial, sin avance automático de texto. |

### A.14. Interfaz

| N.º | ID / nombre | Archivo | Tipo / destino | Disparador propuesto |
| --- | --- | --- | --- | --- |
| 101 | `ui_click` — Click | `101_ui_click.mp3` | Puntual; Uso de gameplay previsto | Clic UI genérico cuando no se utiliza otra confirmación específica. |
| 102 | `ui_panel_open` — Abrir panel | `102_ui_panel_open.mp3` | Puntual; Uso de gameplay previsto | Abrir panel. |
| 103 | `ui_panel_close` — Cerrar panel | `103_ui_panel_close.mp3` | Puntual; Uso de gameplay previsto | Cerrar panel. |
| 104 | `ui_tab` — Cambiar pestaña | `104_ui_tab.mp3` | Puntual; Uso de gameplay previsto | Cambiar pestaña/selección del menú. |
| 105 | `ui_buy` — Comprar | `105_ui_buy.mp3` | Puntual; Alternativa / contextual | Compra aceptada; alternativa a eco_spend, sin doble cargo. |
| 106 | `ui_sell` — Vender | `106_ui_sell.mp3` | Puntual; Alternativa / contextual | Venta/ingreso al entregar caja; alternativa a eco_crop_sold, no comercio adicional. |
| 107 | `ui_error` — Error | `107_ui_error.mp3` | Puntual; Uso de gameplay previsto | Error, fondos insuficientes o comando no permitido; aviso no invasivo. |
| 108 | `ui_confirm` — Confirmación | `108_ui_confirm.mp3` | Puntual; Uso de gameplay previsto | Confirmación válida de modal, distinta de una simulación de compra. |
| 109 | `ui_objective_complete` — Objetivo completado | `109_ui_objective_complete.mp3` | Puntual; Alternativa / contextual | Paso/tutorial u objetivo realmente completado; no crea misiones nuevas. |
| 110 | `ui_reward` — Recompensa | `110_ui_reward.mp3` | Puntual; Reserva documentada | Feedback de recompensa narrativa ya existente; reserva si no hay evento que lo justifique. |
| 111 | `ui_unlock` — Desbloqueo | `111_ui_unlock.mp3` | Puntual; Uso de gameplay previsto | Desbloqueo de magia o postgame. |
| 112 | `ui_pause` — Pausa | `112_ui_pause.mp3` | Puntual; Uso de gameplay previsto | Pausa solicitada por el jugador. |
| 113 | `ui_resume` — Volver al juego | `113_ui_resume.mp3` | Puntual; Uso de gameplay previsto | Reanudar cuando ya no queden motivos de pausa. |

### A.15. Economía / recursos

| N.º | ID / nombre | Archivo | Tipo / destino | Disparador propuesto |
| --- | --- | --- | --- | --- |
| 114 | `eco_gain` — Ganar recurso | `114_eco_gain.mp3` | Puntual; Alternativa / contextual | Ingreso real de dinero; alternativa a sonidos específicos de venta. |
| 115 | `eco_spend` — Gastar recurso | `115_eco_spend.mp3` | Puntual; Alternativa / contextual | Gasto real; alternativa a compra específica, nunca al solicitar reparación. |
| 116 | `eco_crop_sold` — Cosecha vendida | `116_eco_crop_sold.mp3` | Puntual; Uso de gameplay previsto | Caja entregada en centro y cosecha contabilizada. |
| 117 | `eco_item_pickup` — Objeto recogido | `117_eco_item_pickup.mp3` | Puntual; Alternativa / contextual | Recogida física de caja/producto; no suma dinero. |
| 118 | `eco_big_reward` — Recompensa importante | `118_eco_big_reward.mp3` | Puntual; Reserva documentada | Reserva de gran recompensa monetaria: victoria no concede una cifra de dinero aprobada. |

### A.16. Feedback de gameplay

| N.º | ID / nombre | Archivo | Tipo / destino | Disparador propuesto |
| --- | --- | --- | --- | --- |
| 119 | `game_attack_alert` — Alerta de ataque | `119_game_attack_alert.mp3` | Puntual; Uso de gameplay previsto | Comienzo global de incursión; un aviso por grupo, no uno por animal. |
| 120 | `game_enemy_detected` — Enemigo detectado | `120_game_enemy_detected.mp3` | Puntual; Alternativa / contextual | Detección/localización de enemigo; variante local, sin repetir el aviso global. |
| 121 | `game_building_attacked` — Edificio bajo ataque | `121_game_building_attacked.mp3` | Puntual; Alternativa / contextual | Centro/edificio bajo ataque; limitar recurrencia por estructura. |
| 122 | `game_wall_critical` — Muralla crítica | `122_game_wall_critical.mp3` | Puntual; Alternativa / contextual | Muralla crítica; una transición/aviso agrupado, no cada fotograma. |
| 123 | `game_farmer_hurt` — Granjero herido | `123_game_farmer_hurt.mp3` | Puntual; Alternativa / contextual | Trabajador lesionado; aviso agrupable y enlazable a posición. |
| 124 | `game_attack_over` — Ataque terminado | `124_game_attack_over.mp3` | Puntual; Uso de gameplay previsto | Fin de incursión al retirarse el último animal. |
| 125 | `game_victory` — Victoria / objetivo completado | `125_game_victory.mp3` | Puntual; Uso de gameplay previsto | Victoria al completar la noche 100. |
| 126 | `game_major_loss` — Derrota / pérdida importante | `126_game_major_loss.mp3` | Puntual; Uso de gameplay previsto | Game Over o pérdida importante confirmada; evitar repetir al mostrar y guardar el resultado. |

---

<a id="section-28"></a>

## Apéndice B. VFX: recursos y composiciones auditadas

### B.1. Recursos realmente presentes

**Fuente:** VFX, `embedded-assets.resources`. Las cuadrículas son las del atlas adaptado que usa el lab, no deducciones del nombre original.

| ID | Recurso / origen | Archivo del pack | Atlas en el lab | Uso conservable |
| --- | --- | --- | --- | --- |
| `cloud` | Nube volumétrica animada — Brackeys · Thomas Iché | `flipbooks/cloud_02_8x8.tga` | 8×8; 64 cuadros | Polvo en carreras, pisotones, impactos y agricultura. |
| `burst` | Impacto pesado — Brackeys · CodeManu | `predrawn/big_hit_6x5.png` | 4×3; 12 cuadros | Embestida de rinoceronte, colmillos y pisotón. No se usa como fuego. |
| `impact` | Contacto seco — Brackeys · CodeManu | `predrawn/impact_white_6x4.png` | 5×3; 15 cuadros | Mordida, zarpazo y choque con barrera. Destello corto y localizado. |
| `charge` | Concentración del espíritu — Brackeys · CodeManu | `predrawn/charge_7x6.png` | 4×3; 12 cuadros | Anticipación de la onda protectora; motas que convergen. |
| `aura` | Aura viva — Brackeys · CodeManu | `predrawn/wavy_blue_6x5.png` | 6×5; 30 cuadros | Bendición y activación de protección; paleta adaptada. |
| `vortex` | Remolino de guardián — Brackeys · CodeManu | `predrawn/vortex_6x5.png` | 6×5; 30 cuadros | Onda de repulsión: remolino horizontal, nunca un portal permanente. |
| `dirt` | Tierra en suspensión — Kenney | `PNG (Transparent)/dirt_02.png` | 1×1; 1 cuadros | Salpicadura terrosa, polvo fino y pequeñas rozaduras. |
| `smoke` | Polvo de pisada — Kenney | `PNG (Transparent)/smoke_07.png` | 1×1; 1 cuadros | Polvo bajo durante la carrera y en agricultura. |
| `ring` | Onda limpia — Kenney | `PNG (Transparent)/circle_02.png` | 1×1; 1 cuadros | Salpicaduras, ondas de rugido y refuerzo visual de avisos. |
| `star` | Destello — Kenney | `PNG (Transparent)/star_01.png` | 1×1; 1 cuadros | Puntas de estela, cosecha y motas de espíritu. |
| `glow` | Halo pequeño — Kenney | `PNG (Transparent)/circle_05.png` | 1×1; 1 cuadros | Núcleo luminoso contenido; nunca una nube luminosa gigante. |
| `trail` | Estela suave — Kenney | `PNG (Transparent)/trace_01.png` | 1×1; 1 cuadros | Recorridos cortos del espíritu y pequeñas chispas de contacto. |
| `scratch` | Tres marcas de garra — Kenney | `PNG (Transparent)/scratch_01.png` | 1×1; 1 cuadros | Zarpazo triple del león; dirección y alcance legibles. |
| `slash` | Barrido curvo — Kenney | `PNG (Transparent)/slash_01.png` | 1×1; 1 cuadros | Dos arcos que se cierran en la mordida de la hiena. |
| `hornArc` | Filo de colmillo — Kenney | `PNG (Transparent)/slash_03.png` | 1×1; 1 cuadros | Recorrido de los colmillos del facóquero. |
| `dustRing` | Corona de polvo — Kenney | `PNG (Transparent)/smoke_09.png` | 1×1; 1 cuadros | Pisotón y embestida: expansión sobre el suelo. |
| `speedLine` | Línea de velocidad — Kenney | `PNG (Transparent)/trace_05.png` | 1×1; 1 cuadros | Arranque del rinoceronte, impactos radiales y zarpazos. |
| `stunStar` | Estrella de aturdimiento — Kenney | `PNG (Transparent)/symbol_02.png` | 1×1; 1 cuadros | Estrellas que orbitan sobre la cabeza; no es una recompensa. |
| `heart` | Corazón de recuperación — Kenney | `PNG (Transparent)/symbol_01.png` | 1×1; 1 cuadros | Bendición protectora y curación del espíritu. |

`impact_white_6x4.png` declara en sus notas una cuadrícula original real 6×5 y un atlas adaptado 5×3 de quince cuadros. `big_hit` y `charge` usan doce cuadros adaptados. No calcular la secuencia a partir del sufijo del archivo ignorando el manifiesto.

### B.2. Composiciones de ensayo y destino

| ID | Composición del lab | Duración de demo | Destino en la integración |
| --- | --- | --- | --- |
| `rhino` | Embestida del rinoceronte | 4,5 s | Anticipación, polvo y contacto de rinoceronte; un golpe lógico por acción. |
| `lion` | Combo de tres zarpazos | 4,1 s | Zarpazos visuales del combo; convertir tres contactos de ensayo en presentación de un único golpe lógico. |
| `buffalo` | Pisotón de la sabana | 4,5 s | Polvo/impacto pesado de búfalo; adaptar a su clip real, no añadir pisotón de área como habilidad. |
| `warthog` | Barrido de colmillos | 4,1 s | Barrido de colmillos y polvo; dos barridos visuales no son dos daños. |
| `hyena` | Mordida y retirada | 3,9 s | Mordida y retirada visual; adaptar sin crear un segundo ataque automático. |
| `roar` | Rugido intimidatorio | 4,6 s | Aviso agresivo y sonido del león; cono/ondas solo visuales, no daño de área. |
| `shield` | Cúpula del guardián | 5,1 s | Conservar cúpula y reacción localizada; duración lógica 20 s y barrera real de dominio. |
| `repel` | Pulso de repulsión | 4,6 s | Reserva de composición; no hay poder Repulsión aprobado. Texturas reutilizables en las tres magias. |
| `heal` | Bendición de la tierra | 5 s | Aprovechar aura/hojas en Crecimiento; no cura trabajadores ni construcciones, no añadir corazones sin función. |
| `stun` | Aturdimiento legible | 4,6 s | Reserva de composición; no hay poder Aturdimiento aprobado. |
| `dust` | Pisadas en tierra | 3,6 s | Polvo de pisadas, escalado y limitado por densidad. |
| `dig` | Tierra con peso | 3,5 s | Atención inicial/azada; terrones de suelo, no destrucción de edificio. |
| `water` | Agua sobre la tierra | 4,3 s | Riego del trabajador, agua sin resplandor. |
| `harvest` | Una buena cosecha | 3,9 s | Recogida individual; planta/caja/dinero pertenecen a la simulación. |
| `wood` | Impacto en madera | 3,1 s | Impacto material de madera; no duplicar los restos de BAST. |
| `adobe` | Impacto en adobe | 3,3 s | Impacto material de adobe; no duplicar destrucción estructural. |
| `stone` | Impacto en piedra | 3,3 s | Impacto material de piedra; esquirlas decorativas acotadas. |
| `spirit` | La presencia del guardián | 5,5 s | Presencia narrativa/menú e interacción; no crear un avatar 3D físico en la finca. |

La duración es de **la demo completa**, no duración de un ataque lógico ni de un poder. Conservar anticipación/contacto/disipación como referencia visual y sincronizarlas con las acciones reales.

---

<a id="section-29"></a>

## Apéndice C. Casos de prueba para integración

**Estado:** especificados, no ejecutados dentro de un juego completo. Cada caso debe registrar semilla, condiciones, pasos y resultado. Las verificaciones aritméticas adjuntas se informan por separado.

### C.1. Inicio y UI

| ID | Escenario | Criterio de aceptación |
| --- | --- | --- |
| QA-001 | Nueva partida con cada combinación de seis biomas y cinco culturas | Dos pasos, selección conservada y combinación válida; no se crea una sexta cultura. |
| QA-002 | Doble pulsación en Comenzar | Un mundo y una ranura; el inicio simulado del lab no se ejecuta detrás. |
| QA-003 | Entrar al tutorial con 1.000 monedas y sin centro | Se permite colocar el primer centro por 800; no bloquea la condición de infraestructura. |
| QA-004 | Colocación de centro inválida o cancelada | No se cobra ni se suprimen props; se conserva la partida anterior. |
| QA-005 | Llegar al primer turno del día 1 | Contratación en el momento del guion, no antes de colocar el centro. |
| QA-006 | Pantallas pequeñas vertical/horizontal y texto largo | Precios, retratos, confirmación y texto no se cortan ni pisan la franja del Espíritu. |
| QA-007 | Abrir varias causas de pausa y cerrar solo una | La simulación continúa pausada mientras quede otra causa activa. |
| QA-008 | Mostrar un error de fondos o selección inválida | Feedback legible, sin restaurar toasts invasivos o ejecutar el comando rechazado. |

### C.2. Reloj

| ID | Escenario | Criterio de aceptación |
| --- | --- | --- |
| QA-009 | Avanzar 300 s diurnos a ×1 | Transcurre el periodo 07:05–19:05 y solo esos 300 s alimentan crecimiento. |
| QA-010 | Noche tranquila completa | Se acelera a ×5 sin consumir agua ni crecimiento; reloj interno correcto. |
| QA-011 | Aparecer incursión durante ×5 | Cambio a ×1 antes de procesar movimiento y contactos del ataque. |
| QA-012 | Retirarse primer animal mientras otros siguen presentes | No termina la incursión ni vuelve ×5 todavía. |
| QA-013 | Retirarse último animal durante la noche | Fin único del evento y ×5 si no queda otra pausa. |
| QA-014 | Ocultar pestaña y volver tras muchos minutos | No hay ganancias, daño, riego ni avance offline. |
| QA-015 | Gran paso de tiempo cruza contratación o checkpoint | La simulación se divide y no omite el evento ni cobra dos jornadas. |
| QA-016 | Ataque nocturno cruza amanecer | Aplicar el contrato C07 cuando se cierre; no perder ataque, contratación ni control de terminales. |

### C.3. Agricultura

| ID | Escenario | Criterio de aceptación |
| --- | --- | --- |
| QA-017 | Plantar las ocho especies | Precio canónico, ID estable y brote; no aparecen arroz, calabaza ni judías del HUD. |
| QA-018 | Mijo y plátano continuamente atendidos con día/noche | Tiempos efectivos 140 y 570 s; la noche no los acorta. |
| QA-019 | Crear riegos inicial y posteriores | Exactamente R checkpoints lógicos, inicial incluido, sin cobrar agua adicional ni duplicar tarea. |
| QA-020 | Checkpoint del plátano con margen de tolerancia | Margen derivado 23,75 s de tiempo diurno; no usar un porcentaje fijo de todo el ciclo. |
| QA-021 | Agotar tolerancia por falta de agua | Se detiene crecimiento, no muere la planta; un riego posterior reanuda. |
| QA-022 | Llegar la noche con deuda de agua y 10 s de margen restante | Margen permanece igual hasta el día siguiente. |
| QA-023 | Llegar al 100% y dejar varias jornadas | Madura estable sin agua ni deterioro, hasta orden de cosecha o ataque. |
| QA-024 | Primer cuidado y deuda que cruza madurez con tolerancia larga | Cubrir C04 explícitamente; no añadir riegos ni eliminar deuda por intuición. |
| QA-025 | Seleccionar un grupo con plantas maduras e inmaduras | Solo maduras generan tareas; plantas se recogen una a una. |
| QA-026 | Dos órdenes de cosecha del mismo grupo | Una tarea reservable por planta, sin dos cajas ni doble ingreso. |
| QA-027 | Orden de grupo emitida al mismo instante | Se inserta de cerca a lejos del centro y después respeta FIFO. |
| QA-028 | Recogida individual con dos trabajadores | Plantas y reservas distintas, posible ejecución paralela sin compartir objetivo. |
| QA-029 | Aplicar Crecimiento sobre cultivo con riego previo pendiente | No cura la carencia ni avanza crecimiento hasta atención manual. |
| QA-030 | Cruzar uno o varios checkpoints dentro de Crecimiento | Cada checkpoint cruzado queda satisfecho una vez; no aparece tarea atrasada al terminar. |
| QA-031 | Riego manual llega mientras Crecimiento sigue activo | Reanuda con ×1,5 y satisface automáticamente los siguientes checkpoints cruzados durante el efecto. |
| QA-032 | Terminar Crecimiento justo al cruzar un checkpoint | Orden temporal determinista; no regar dos veces por un mismo umbral. |
| QA-033 | Cosecha con Multiplicar solicitado antes pero recogido después de caducar | No recibe ×2; manda el instante de recogida. |
| QA-034 | Cosecha dentro del área activa por hombre | Aplicar +20% del recolector y ×2 según C02, fijando el valor una sola vez. |
| QA-035 | Cargar guardado de una planta en pleno morph | Misma fase/progreso y malla correcta; no reiniciar el crecimiento. |
| QA-036 | Comparar estados originales y transición de cada especie | Cuarenta modelos, puentes locales opacos y UV correctas; sin dithering de cultivos. |

### C.4. Trabajadores y colas

| ID | Escenario | Criterio de aceptación |
| --- | --- | --- |
| QA-037 | Confirmar plantilla mayor/joven del mismo sexo o sexo distinto | 100/120 de salario por edad, no por sexo, pago único por jornada. |
| QA-038 | Editar cantidades o recordar selección impagable | No se descuenta; confirmar se bloquea hasta que el coste sea asumible. |
| QA-039 | Confirmar cero trabajadores con partida recuperable | Jornada continúa sin plantilla; no reembolso ni producción ficticia. |
| QA-040 | 6 contratados y centros con 100/20/0 plantas | Reparto 4/1/1 con desempate por antigüedad; el centro vacío conserva su base. |
| QA-041 | Menos trabajadores que centros y números de plantas distintos | Uno a cada centro mayor hasta agotarlos; nunca dos en uno antes de ese reparto. |
| QA-042 | Empate de plantas con personal escaso | Desempate determinista por antigüedad/ID. |
| QA-043 | Todos los centros tienen cero plantas | Personal repartido equilibradamente; queda esperando tareas reales. |
| QA-044 | Mismo número de plantas con especies, precios y riegos diferentes | Mismo peso de reparto; no optimiza carga ni bonus ocultamente. |
| QA-045 | Poblados con tamaños muy distintos | Reparto directo por centros del mundo, no 50/50 por poblado. |
| QA-046 | Cuatro perfiles con cupos desiguales | Mezcla equilibrada dentro de lo posible; no asignación por bonus de cosecha. |
| QA-047 | Dos trabajadores libres y una tarea antigua | FIFO escoge tarea; la ejecuta el libre de ese centro más cercano. |
| QA-048 | Dos agentes evalúan la misma planta/caja | Reserva atómica al aceptar; solo un propietario. |
| QA-049 | Crear muchas tareas nuevas en centro con plantilla fija | No mueve trabajadores de otro centro durante la jornada. |
| QA-050 | Nuevo centro al mediodía junto a cultivos existentes | No migra plantas ni tareas; reasociación al siguiente amanecer. |
| QA-051 | Nueva planta junto a centro recién construido | Se vincula al centro más cercano ahora; espera si ese centro no tiene plantilla. |
| QA-052 | Nuevo poblado cambia centro de residencia territorial | Trabajador de hoy conserva residencia de salida y vuelve allí. |
| QA-053 | Destruir centro y quedar otro operativo del mismo poblado | Tras ataque se reasignan trabajadores desplazados según necesidad definida, sin cobrar otra jornada. |
| QA-054 | Destruir último centro del poblado y no quedar destino | Regresan; no teletransportar a un poblado ajeno ni prolongar turno. |
| QA-055 | Construir sustituto y haber desplazados aún disponibles | Aplicar excepción de destrucción, sin reasignar empleados normales de otros centros. |
| QA-056 | Rehacer cola al amanecer o regreso de ataque | Usar necesidades reales; no regenerar reparaciones manuales. |
| QA-057 | Rehacer cola con cosecha ya ordenada | Aplicar C05 expresamente; madurez sola nunca se convierte en orden automática. |
| QA-058 | Finalizar turno camino de tarea aún no ejecutada | Se libera reserva y no comienza tarea nueva fuera del turno. |
| QA-059 | Finalizar turno durante ejecución física | Completa esa tarea según la regla de jornada y se retira. |
| QA-060 | Inactividad sin tarea | Alterna reposo/vigilar y paseos caminando a máximo aproximado 8 m. |
| QA-061 | Aparecer tarea durante paseo | Cancela paseo y sale desde posición actual, sin teletransporte. |
| QA-062 | Carrera de trabajo agotada | No sigue corriendo por urgencia ordinaria; restaura reserva al amanecer. |
| QA-063 | Urgencia de cola bajo/por encima de 2 por trabajador | Solo afecta carrera ordinaria, nunca distribución de plantilla. |

### C.5. Cajas y contabilidad

| ID | Escenario | Criterio de aceptación |
| --- | --- | --- |
| QA-064 | Recoger una planta sin entregar la caja | No aumenta el dinero; valor fijado y planta retirada una vez. |
| QA-065 | Entregar una caja y repetir callback/carga | Un solo ingreso y caja entregada no recuperable otra vez. |
| QA-066 | Ataque sorprende portador | Caja cae en su posición y no es objetivo animal. |
| QA-067 | Volver tras ataque con cajas sueltas | Tarea de transporte reservable individualmente cuando exista centro válido. |
| QA-068 | Caja sin centro operativo | Persiste sin convertirse en ingresos ni tarea hasta infraestructura válida. |
| QA-069 | Centro con cero plantas y cajas | Usa su trabajador base; no crea una planta ficticia para calcular el reparto. |
| QA-070 | Mostrar 150.000 y cantidades de millones | HUD abreviado sin desbordamiento; saldo real no pierde precisión. |
| QA-071 | Combinación de bonus produce una fracción monetaria | C02 decide redondeo una vez; no importar Math.round del lab silenciosamente. |

### C.6. Defensas y reparación

| ID | Escenario | Criterio de aceptación |
| --- | --- | --- |
| QA-072 | Cerrar perímetro de cada material | Se genera la puerta determinista; misma compra y 60% de PV. |
| QA-073 | Golpear zarzas intactas dos veces a 40 PV | Al quedar 20 PV comienza el colapso; no exige un tercer golpe. |
| QA-074 | Golpear centro de 600 PV con cada especie | Colapso tras 12/10/7/6/4 golpes desde intacto sin reparación. |
| QA-075 | Entrar al umbral de BAST o DEST | Respeta 20% de vida/79% de daño respectivamente, sin unificación silenciosa. |
| QA-076 | Ordenar reparación con fondos suficientes | Se encola pero todavía no se cobra ni reserva dinero ficticio. |
| QA-077 | Ordenar reparación con fondos insuficientes en ese instante | Se rechaza la solicitud, sin tarea inválida añadida. |
| QA-078 | Daño aumenta antes de llegada del reparador | Coste se recalcula al llegar, no se mantiene la cotización inicial. |
| QA-079 | Objetivo pasa a ruina antes de ejecutar orden todavía válida | No se cancela solo por destruirse; coste 100% y se reconstruye si alcanza. |
| QA-080 | Saldo disminuye por otras compras antes de reparar | Revalida saldo al llegar; si no alcanza, cancela sin cargo. |
| QA-081 | Ataque interrumpe una reparación en camino | Huida y reconstrucción de cola; esa reparación manual no se regenera sola. |
| QA-082 | Trabajador llega durante animación de colapso | Resolver C06 sin cancelar D144 ni confundir reset del lab con permiso de reparación. |
| QA-083 | Reparación exitosa repetida por callback | Pago y restauración únicos, VFX de polvo sin doble transformación. |
| QA-084 | Trazar muralla o usar atajo durante noche/ataque | Rechazo común por permisos; no bloquear animales creando nuevas piezas. |
| QA-085 | Colocación atraviesa props grandes o terreno inválido | Sin compra parcial ni solapamiento visible. |
| QA-086 | Destruir estructura y descargar/cargar chunk | Estado y ruina persisten; colisiones no resucitan con el render. |

### C.7. Incursiones e IA

| ID | Escenario | Criterio de aceptación |
| --- | --- | --- |
| QA-087 | Atracción en 0/1/499/500/1499/1500/3999/4000/9999/10000 | Tabla exacta, sin dependencia del saldo ni valor de cajas. |
| QA-088 | Noche 1 y noche 2 con atracción cero | Primera tranquila; segunda un facóquero tutorial garantizado. |
| QA-089 | Varias noches consecutivas con resultado igual | Tiradas independientes, sin sistema de compensación oculto. |
| QA-090 | Presupuesto 3 con hiena desbloqueada | Composiciones válidas: tres facóqueros o una hiena. |
| QA-091 | Enumerar cada presupuesto de cada nivel | Al menos una composición, ≤5 animales, límites por especie y gasto 75–100%. |
| QA-092 | Permutar orden de generación del mismo grupo | No duplica su probabilidad; se elige composición, no orden de animales. |
| QA-093 | Intentar introducir especie todavía bloqueada | No aparece aunque el presupuesto permita pagarla. |
| QA-094 | Generar el grupo | Aparece simultáneamente en puntos separados de una misma zona del borde activo. |
| QA-095 | Mover cámara durante aproximación | Animal no desaparece ni reinicia su cupo por salir del dibujo. |
| QA-096 | Elegir objetivos con reservas ya tomadas | Ignora objetivos reservados; no comparte cultivo/grupo/tramo/conjunto/centro activo. |
| QA-097 | Destruir objetivo y conservar golpes | Busca otro libre o se retira si ninguno es válido. |
| QA-098 | Llegar al objetivo dentro de finca y retirarse | Entra corriendo, se mueve caminando dentro y sale corriendo. |
| QA-099 | Ejecutar cualquiera de los dos combos | Exactamente un golpe lógico y consumo de un cupo; varios contactos VFX son decorativos. |
| QA-100 | Agotar último golpe | No ejecuta un ataque extra por colisión con trabajador; salida mantiene separación física. |
| QA-101 | Encontrar Escudo | No lo atraviesa; golpea borde, gasta cupo y no daña lo protegido. |
| QA-102 | Tirada diurna con candidato antes/después de cruzar 10.000 | Solo importa atracción al candidato; única tirada de 10%, sin sondeo repetido. |
| QA-103 | Ataque diurno y nocturno el mismo día | Pueden coexistir en el calendario como eventos independientes. |
| QA-104 | Finalizar última incursión | Aviso de fin único, liberar estado/reservas y reconstruir necesidades al regreso. |

### C.8. Lesiones

| ID | Escenario | Criterio de aceptación |
| --- | --- | --- |
| QA-105 | Trabajador pasa por delante sin trayectoria de atravesar animal | Una tirada de 60% por encuentro; no una por frame. |
| QA-106 | Trayectoria del trabajador cruzaría el volumen del animal | Agresión obligada cuando el animal puede atacar y empuje 1,5–2 m hacia posición válida. |
| QA-107 | Huida con cupo de carrera ordinario agotado | Corre igualmente; la emergencia ignora esa limitación. |
| QA-108 | Primer golpe al trabajador | Interrumpe tarea, caída/recuperación y huida con estado persistente. |
| QA-109 | Segundo golpe dentro de la misma incursión | Incapacitado el resto de esa jornada y excluido de nuevas agresiones. |
| QA-110 | Retirada de incapacitado | Clip de correr ralentizado y desplazamiento lento coherente, no caminar saltarín. |
| QA-111 | Trabajador en recuperación en la jornada siguiente | Trabaja con restricción ordinaria de carrera; huida sigue disponible. |
| QA-112 | Recontratar un perfil que contiene un lesionado | Aplicar identidad según C08; no incapacitar a toda la categoría ni curarlo por cambiar cantidad. |

### C.9. Magias

| ID | Escenario | Criterio de aceptación |
| --- | --- | --- |
| QA-113 | Apuntar, mover y cancelar magia | No activa el efecto ni consume cooldown. |
| QA-114 | Superponer áreas de poderes iguales o diferentes | Colocación inválida mientras hay intersección de áreas activas. |
| QA-115 | Campo atraviesa cambio día/noche | Respetar permisos de activación y regla nocturna de cultivos; VFX no avanza agricultura por sí mismo. |
| QA-116 | Pausa, ×1 y ×5 durante recarga | Cooldown sigue el tiempo simulado y conserva estado al guardar. |
| QA-117 | Multiplicar sin trabajadores o durante noche/ataque | Activación bloqueada. |
| QA-118 | Escudo vence con animales aún con cupo | Continúan con objetivos válidos; no desaparecen automáticamente. |
| QA-119 | Plantar un Escudo con borde sobre un animal | Validar geometría y no teletransportar ni introducir poder Repulsión. |
| QA-120 | Duración de VFX demo distinta del efecto lógico | La presentación persiste/reconfigura hasta durar 20/30/15 s según magia; no dicta gameplay. |

### C.10. Tutorial y eventos

| ID | Escenario | Criterio de aceptación |
| --- | --- | --- |
| QA-121 | Mostrar los ocho gestos del Espíritu | Se usan identificadores reales de V8; manos y entrada/salida siguen sistemas separados. |
| QA-122 | Mano tutorial junto a obstáculo con cámara girando | Protección del plano completo; no corta suelo ni pared. |
| QA-123 | Mensaje posterior al día 1 | Espíritu sí, manos básicas no. |
| QA-124 | Omitir introducción ya completada en otra ranura | Mensajes todavía no vistos de magia/lesión siguen apareciendo. |
| QA-125 | Esperar acción de trabajador tras explicación | Lectura cerrada y simulación activa; no deadlock del tutorial. |
| QA-126 | Evento agrícola nocturno sorteado | Máximo uno, anunciado al amanecer como sorpresa; severidad y destinatario se guardan. |
| QA-127 | Cargar antes/después de aplicar un evento | No se vuelve a sortear ni a aplicar dos veces. |
| QA-128 | Evento específico sin cinco plantas de una especie elegible | No escogerla; resolver selección/fallback dentro de C01. |

### C.11. Finales y expansión

| ID | Escenario | Criterio de aceptación |
| --- | --- | --- |
| QA-129 | Fin de ataque con cero centros y 799 monedas | Game Over inmediato tras concluir incursión. |
| QA-130 | Fin de ataque con cero centros y 800 monedas | No derrota inmediata por D141; recuperación solo en fase legal. |
| QA-131 | Amanecer en cada combinación de centro y recursos | Umbrales 100/105/900/905 exactos antes de contratar. |
| QA-132 | Selección recordada cuesta más que saldo pero ruta mínima existe | No Game Over por la selección; permitir ajustarla. |
| QA-133 | Saldo en umbral con único cultivo lento | Medir viabilidad real de varios días; conservar regla aprobada y registrar riesgo, no presumir demostración matemática. |
| QA-134 | Llegar al inicio de noche 100 | Aún no victoria; hay que completar la noche y resolver lo que corresponda. |
| QA-135 | Completar noche 100 | Narración de maldición levantada y continuación opcional en la misma partida. |
| QA-136 | Continuar postgame cientos de noches | Cero ataques nocturnos y diurnos; no relanzar tutorial del facóquero. |
| QA-137 | Construir poblados 2/3/4/10/20/50/100 | Costes 50K/75K/100K/250K/500K/1,25M/2,5M sin límite artificial. |
| QA-138 | Previsualizar poblado con una sola casa inválida | Conjunto inválido entero, sin pago parcial ni cambios persistentes. |
| QA-139 | Cambiar cultura o recolocar fantasma | No cobra ni borra props, no añade nuevas páginas de configuración inicial. |
| QA-140 | Confirmar poblado con saldo gastado desde previsualización | Revalida y rechaza sin crear medias aldeas. |
| QA-141 | Colocar poblados contiguos sin solapar | Permitido; no radio mínimo artificial entre centros de poblado. |
| QA-142 | Confirmar poblado y guardar/cargar | Coste, ordinal, edificios, cultura y supresiones aparecen una sola vez. |
| QA-143 | Construir un poblado durante jornada | Nueva asociación territorial no cambia la residencia ni centro de trabajadores de hoy. |

### C.12. Guardado y presentación

| ID | Escenario | Criterio de aceptación |
| --- | --- | --- |
| QA-144 | Guardar desde cada disparador aprobado | Snapshot del slot actual; sin sobrescribir otra ranura. |
| QA-145 | Cargar durante una incursión | Mismos animales, golpes restantes, daño y resultado programado; no nueva tirada. |
| QA-146 | Cargar durante jornada con empleados pagados | No nueva contratación ni nuevo cobro; mantiene asignaciones del día. |
| QA-147 | Guardar caja transportada y volver a cargar | Una caja, un portador y valor único; no crear dinero al restaurar la animación. |
| QA-148 | Guardar colapso o cooldown en curso | Estado no reversible accidentalmente; restaurar duración/estado coherente. |
| QA-149 | Abrir Biblioteca y volver | No cambia progreso ni ejecuta economía de la partida detrás de los labs. |
| QA-150 | Salir a menú y entrar repetidamente | Liberar audio, WebGL, listeners y timers de la escena anterior. |
| QA-151 | Cargar recursos faltantes o audio sin permiso inicial | Error o fallback controlado; no pantalla infinita ni mundo corrupto. |
| QA-152 | Mapear los 126 SFX | Cada ID tiene destino o reserva explícita; 021/022 conservan los bytes intercambiados aprobados. |
| QA-153 | Reproducir acción con variantes genéricas/específicas | Evitar disparar todas juntas; un ingreso o golpe sigue siendo uno. |
| QA-154 | Comparar audio a ×1/×5 | Tono y velocidad de reproducción iguales; cambia cadencia lógica, no pitch. |
| QA-155 | Acumular muchos agricultores, animales y colapsos | Mezcla con prioridad y límites, sin explosión de voces o partículas. |
| QA-156 | Alternar Gameplay A/B | No fusionar stems incompatibles; se usa la política del lab musical al importarlo. |
| QA-157 | Importar fuentes y créditos | Comprobar nombres y licencias reales; no distribuir archivos tipográficos en este paquete documental. |
| QA-158 | Escena grande lejos del origen y tras descargar chunks | Colocaciones estables, colisiones y persistencia; perf se mide, no se infiere de MAX_PLANTS=240. |
| QA-159 | Semilla y comandos repetidos | Mismos resultados del dominio; diversidad visual no altera azar de eventos económicos. |

---

<a id="section-30"></a>

## Apéndice D. Fuentes, inventario y procedencia

### D.1. Fuentes utilizadas

**CHAT:** decisiones y correcciones de Gabriel en la conversación del 1 de octubre de 2026, incluidas las aprobaciones de D100–D144 y acuerdos anteriores recuperados. Cuando un detalle no se ha recuperado inequívocamente se señala en el apartado 26. No se usa una propuesta rechazada como fuente de una regla vigente.

| Ref. | Archivo examinado | Ámbito / limitación |
| --- | --- | --- |
| BASE | `Wild_Guardians_Plan_Maestro_de_Trabajo.md` | Borrador anterior, prevalecen correcciones de CHAT |
| CULT | `Bioma_Cultivos_Lab_V3_Morph_Local(2).html` | Código/datos inspeccionados; no playtesting integrado |
| TUT | `Guardian_Tutorial_V8_Avatar_y_Manos_3D(1).html` | Código/datos inspeccionados; no playtesting integrado |
| HUD | `Wild_Guardians_HUD_Lab_Contratacion_Diaria.html` | Código/datos inspeccionados; no playtesting integrado |
| NEW | `Wild_Guardians_Nueva_Partida_V2.html` | Código/datos inspeccionados; no playtesting integrado |
| VFX | `Wild_Guardians_VFX_Atelier_V4.html` | Código/datos inspeccionados; no playtesting integrado |
| SFX | `Wild_Guardians_SFX_Lab_V12_Catalogo.html` | Código/datos inspeccionados; no playtesting integrado |
| BAST | `Bastion_Lab_V4_1_Puerta_Reforzada_Mas_Grande.html` | Código/datos inspeccionados; no playtesting integrado |
| DEST | `BIOMA_Destruccion_Lab_LOGICA_LITE.html` | Geometría sustituida por cubos; lógica sí auditada |

Los hashes completos y tamaños están en `fuentes_auditadas.json`. Las líneas citadas son las del archivo de origen; para localizar con precisión usar además el símbolo o nombre de función, porque algunos HTML contienen enormes líneas de datos embebidos.

**Localizadores principales:** CULT `SPECIES`, `STAGES`, `MARKS`, `prepareModels`, `prepareBridges`, `transitionWindow`, `stageSample`; TUT `TUTORIAL_LINES`, `HAND_INFO`, `STATE_NAMES`, `GuardianTutorial`, `GuardianWorld`; HUD `CROP_TYPES`, `HIRING_RULES`, `openHiringDay`, `confirmHiring`, `dailyClockStep`, `toast`; NEW comentario de integración y controlador; VFX `embedded-assets`, `definitions`, `wgvfx:impact`, `WGVFXLab`; SFX `bankData`, guía de normalización; BAST `MATERIALS`, `LARGE_GATE_SCALES`, `ensureAutomaticGates`, `beginCollapse`, `repair`; DEST `BUILDINGS`, `COLLAPSE_THRESHOLD`, `stages`, `setDamage`, `stepCollapse`.

### D.2. Inventario completo de referencia: 23 laboratorios

Los nombres de los no recibidos proceden del inventario del borrador BASE. «No recibido» no significa inexistente o defectuoso; significa que no se ha auditado su binario en esta entrega.

| Ref. | Lab del inventario original | Fuente auditada | Situación |
| --- | --- | --- | --- |
| L01 | `BIOMA_Destruccion_Lab_V1_6_6.html` | DEST | Lógica equivalente recibida como LOGICA_LITE; faltan casas originales. |
| L02 | `Bastion_Lab_V4_1_Puerta_Reforzada_Mas_Grande.html` | BAST | Recibido; datos y lógica inspeccionados. |
| L03 | `Bioma_Cultivos_Lab_V3_Morph_Local.html` | CULT | Recibido como (2); geometría y puentes extraídos. |
| L04 | `Bioma_Lab_V4_0_Materiales_Luz_Optimizado.html` | — | No recibido: importar mundo/chunks/cámara/luz/calidad. |
| L05 | `Guardian_Tutorial_V8_Avatar_y_Manos_3D.html` | TUT | Recibido como (1); gestos, manos y APIs inspeccionados. |
| L06 | `Poblados_Lab_V5_Mapungubwe_Saheliano_Suajili_Musgum_Etiope.html` | — | No recibido: importar layout orgánico y edificios. |
| L07 | `Quata_Character_Lab_Amara_Joven_ToolSafe_Suave_v5.html` | — | No recibido: modelo/rig/clips/herramientas. |
| L08 | `Quata_Character_Lab_Amara_Mayor_ToolSafe_Suave_v5.html` | — | No recibido: modelo/rig/clips/herramientas. |
| L09 | `Quata_Character_Lab_Ganadero_Mayor_ToolSafe_Suave_v5.html` | — | No recibido: modelo/rig/clips/herramientas. |
| L10 | `Quata_Character_Lab_Kofi_Joven_Skin_Corregido_v7.html` | — | No recibido: modelo/rig/clips/skin corregido. |
| L11 | `Quata_Character_Lab_Facoquero_Bestiario_GroundFix_v2.html` | — | No recibido: importar contacto de patas/clips. |
| L12 | `Quata_Character_Lab_Hiena_Bestiario_GroundFix_v2.html` | — | No recibido: importar contacto de patas/clips. |
| L13 | `Quata_Character_Lab_Bufalo_Bestiario_Corregido_v3.html` | — | No recibido: modelo y animaciones. |
| L14 | `Quata_Character_Lab_Leon_Bestiario_Corregido_v2.html` | — | No recibido: modelo y animaciones. |
| L15 | `Quata_Character_Lab_Rinoceronte_Bestiario_Pies_Alineados_v3.html` | — | No recibido: modelo/clips y pies alineados. |
| L16 | `Wild_Guardians_Africa_Menu_V2_8_CORREGIDO_Balafons_Call.html` | — | No recibido: diorama, navegación y canción del menú. |
| L17 | `Wild_Guardians_Gameplay_A_Balafon_and_Flute_Lab_V1_OFFLINE.html` | — | No recibido: stems, secciones y motor musical A. |
| L18 | `Wild_Guardians_Gameplay_B_Warm_Afternoon_Lab_V1_OFFLINE.html` | — | No recibido: stems, secciones y motor musical B. |
| L19 | `Wild_Guardians_HUD_Lab_Contratacion_Diaria.html` | HUD | Recibido; conservar UI y contratación, sustituir demos de economía. |
| L20 | `Wild_Guardians_Nueva_Partida_V2.html` | NEW | Recibido; once ilustraciones y API de inicio. |
| L21 | `Wild_Guardians_SFX_Lab_V12_Catalogo.html` | SFX | Recibido; 126 entradas y bytes comprobados. |
| L22 | `Wild_Guardians_Tipografia_Autocontenido.html` | — | No recibido: verificar fuentes y aplicación visual. |
| L23 | `Wild_Guardians_VFX_Atelier_V4.html` | VFX | Recibido; 19 recursos, 18 composiciones. |

### D.3. Procedencia para preparar los créditos

Este inventario reproduce documentación incorporada o facilitada; **no es una auditoría jurídica actualizada de plataformas o licencias**. Al distribuir, comprobar que se acreditan exactamente los recursos incluidos. El paquete documental no contiene fuentes tipográficas ni redistribuye los HTML originales.

| Familia | Recurso / autoría registrada | Referencia aportada | Licencia indicada en las fuentes |
|---|---|---|---|
| Skybox diurno | Kloppenheim 05; Greg Zaal | `https://polyhaven.com/a/kloppenheim_05` | CC0 1.0, según BASE |
| Skybox nocturno | Qwantani Night (Pure Sky); Greg Zaal y Jarod Guest; modificación oscura para el juego | `https://polyhaven.com/a/qwantani_night_puresky` | CC0 1.0, según BASE |
| Flipbook de polvo | Cloud 02; Thomas Iché, dentro de Brackeys VFX Bundle | `https://brackeysgames.itch.io/brackeys-vfx-bundle` | CC0, según texto embebido |
| Spritesheets VFX | Big Hit, Impact White, Charge, Wavy Blue, Vortex; CodeManu | `https://codemanu.itch.io/vfx-free-pack` | CC0, según bundle embebido |
| Partículas | Los trece archivos Kenney enumerados en B.1 | `https://kenney.nl/assets/particle-pack` | CC0, según texto embebido |
| Títulos | Ga Maamli; Afotey Clement Nii Odai, Ama Diaka y David Abbey-Thompson | `https://fonts.google.com/specimen/Ga+Maamli` | OFL-1.1, según BASE; binario no auditado aquí |
| Texto | Banga; David Sargent | `https://github.com/d-sargent/banga` | OFL-1.1, según BASE; binario no auditado aquí |
| Motor embebido en cultivo | Three.js r140 | Cabecera técnica de CULT | MIT, según fuente incorporada |
| SFX generados | ElevenLabs | Historial de producción del proyecto | Conservar documentación de generación/uso; no atribuir automáticamente CC0 |
| Música generada | Suno | Packs y canción proporcionados por el usuario | Conservar documentación de generación/uso; no atribuir automáticamente CC0 |
| Imágenes y modelos | Imágenes de ChatGPT y modelos aportados por Gabriel | Historial y originales | Verificar proveedor 3D exacto antes del crédito final; BASE registra duda de nombre |

El crédito genérico del bundle menciona más autores, pero no implica que sus recursos concretos estén incorporados. Dar crédito por los seleccionados que se distribuyan y conservar las licencias originales pertinentes. Las condiciones de una jam o portal se revisarán cuando se vaya a publicar, no se presuponen por este documento.

---

<a id="section-31"></a>

## Apéndice E. Contenido del paquete y verificaciones realizadas

El paquete es documental y técnico; no contiene el videojuego ni redistribuye los laboratorios originales.

| Archivo | Finalidad |
|---|---|
| `Wild_Guardians_Plan_Maestro_Definitivo.md` | Este documento completo, utilizable de forma independiente |
| `balance_confirmado.json` | Valores canónicos; parámetros no acreditados identificados como `null` |
| `fuentes_auditadas.json` | Archivos examinados, tamaños y SHA-256 |
| `cultivos_geometria_extraida.json` | Inventario de cuarenta modelos, triángulos y puentes, sin binarios |
| `sfx_catalogo_extraido.json` | 126 IDs, nombres, archivos, duración, métricas y hashes |
| `sfx_mapeo_implementacion.json` | 126 destinos propuestos, con alternativas y reservas explícitas |
| `vfx_catalogo_extraido.json` | 19 recursos, 18 composiciones y licencia textual incorporada |
| `vfx_mapeo_implementacion.json` | Adaptación visual por composición sin crear poderes extra |
| `casos_prueba_integracion.json` | 159 casos de aceptación por ejecutar sobre el juego |
| `verificar_reglas.py` | Algoritmos de referencia y comprobaciones reproducibles, sin dependencias externas |
| `resultado_verificaciones.json` | Resultado de la ejecución realizada para esta edición |
| `README.md` | Guía de uso del paquete |

**Resultados ya obtenidos:** se cotejaron SHA-256 y tamaño de los 126 MP3 embebidos; se confirmaron 126 IDs únicos, 16 categorías y ocho bucles. Se verificaron 40 mallas de cultivos, 107.109 triángulos únicos y 32 pares de transición. El VFX contiene 19 recursos y 18 composiciones.

El script de referencia ejecutó **5.000 escenarios de reparto**, comprobó las composiciones legales en los **20 contextos/presupuestos** nocturnos y diurnos configurados, y las fórmulas de crecimiento, tolerancia, puertas, colapsos, poblados y umbrales económicos. Resultado: **123.048 aserciones correctas**. Son muchas comprobaciones repetidas de invariantes, no esa cantidad de pruebas independientes de gameplay.

En el mapeo SFX hay **78 usos de gameplay previstos**, **36 alternativas/contextuales** y **12 reservas documentadas**. Los 126 siguen inventariados; no se afirma que ya estén conectados al motor ni que deban sonar todos en una partida.

**No verificado por estas pruebas:** fidelidad visual de modelos ausentes, funcionamiento de una partida completa, colisiones reales, rendimiento móvil, mezcla sonora integrada, rentabilidad a cien noches y contratos C01–C08. Las pruebas no prueban viabilidad económica a largo plazo por el mero hecho de que coincidan los umbrales de derrota.

Para repetir la parte numérica, desde la carpeta del paquete:

```bash
python verificar_reglas.py
```

El script comprueba los manifiestos y algoritmos de referencia; el cotejo original de bytes de los HTML se documenta en el manifiesto de extracción y no se repite sin esos originales.

**Primer trabajo de desarrollo recomendado:** implementar el núcleo de la fase 1 y el corte vertical de los dos primeros días. La lista corta del apartado 26 se resuelve en paralelo con sus sistemas respectivos; no hace falta esperar a que los 23 labs quepan como adjuntos ni seguir inventando decisiones de diseño.

