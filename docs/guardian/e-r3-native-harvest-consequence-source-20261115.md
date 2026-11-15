# Consecuencia nativa Harvest y propietario Carry en la autoridad

Continúa los [datos semánticos de Harvest](e-r3-harvest-consequence-data-20261115.md).
Wild Engine puede preparar la ruta completa de entrega de una cosecha terminada
y sustituir su acción por Carry en un único commit. La proyección en `Game` usa
las mismas reglas económicas ordinarias. Reutiliza `ActiveIntent`, reservas,
reloj común, propuesta pendiente y transactor de admisión existentes.

**Alcance de componente de autoridad.** No está conectada todavía la preparación
gráfica del cultivo que desaparece y la caja portada, ni el transporte directo
de esta nueva asociación a los consumidores GPU. El productor ordinario sigue
pendiente; no se activa la transición en la partida ni se acredita continuidad
visual. e-R3/e-R4/f-R4, los once padres A6 y A/B/C permanecen abiertos.

## Investigación y decisión

Antes de diseñar el relevo se leyó el código real de
[DetourCrowd v1.6.0, `dtCrowd::updateMoveRequest`](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L749-L848):
comprueba que el resultado diferido sigue conectado al corredor vigente antes de
adoptarlo. Se adapta esa comprobación de procedencia al mismo propietario de
Wild Engine: acción/cuerpo exactos, frontera causal actual y propuesta preparada.
Se conservan las pruebas propias de recorrido completo, tiempos, puertas y
reservas; no se adoptan rutas parciales, otra cola ni otra biblioteca. La
preparación semántica sigue la separación entre datos propios y publicación
descrita en el incremento anterior y contrastada con Flecs.

## Preparar, comprobar y transferir

La familia nativa 16 conserva la asociación inmutable de la acción Harvest
emitida. Exige que haya terminado, conserve cuerpo y tarea, y que el cultivo,
centro operativo e ID provisional de caja sigan siendo válidos. Calcula con el
planificador existente una ruta completa hasta el punto de entrega, con Carry,
velocidad y fases originales. Terreno desconocido o recorrido bloqueado retienen
la acción; no crean una ruta Home ni liberan el cuerpo.

La prueba común de reservas admite el relevo solo mediante la asociación nativa
exacta de la acción completada. Los demás llamadores conservan su protección.
Preparar no consume cultivo, ID, pérdida, dinero ni tarea. La revalidación usa
el reloj común actualizado y comprueba la misma proyección flotante y puertas.
El segundo trabajador puede avanzar durante la espera.

El commit enlazado exige el ticket preparado, frontera actual, cuerpo y slot/
generación previstos. En el mismo propietario retira cultivo y tarea, crea el
objetivo inactivo de la caja portada y publica su ruta Carry con una única
asignación. Conserva la procedencia de la acción; no hay un estado intermedio
cancelado ni otro ejecutor. `finishAction` ya no puede liberar por sí solo una
intención que exige recursos, ni siquiera tras completar su duración.

El puente añade el perfil `task-consequence` al transactor común. Antes del
commit vuelve a comprobar la consecuencia semántica y el centro; después lee
el hecho nativo real para proyectar la caja, la pérdida y la tarea en `Game`,
antes de retener recursos o ejecutar listeners. La caja recibe la potencia
original, el valor preparado con las reglas comunes y un único ID. El dinero
se mantiene sin liquidar. Las notificaciones de la nueva frontera observan ya
todo el estado coherente; el camino ordinario conserva su orden anterior.

`Game.tick` proyecta la posición del trabajador y de su caja desde el mismo
cuerpo nativo. No usa un segundo mover JS. La llegada mantiene cuerpo y caja:
liquidación de entrega y siguiente intención todavía necesitan su propia
frontera preparada. El snapshot contiene solo `nativeDelivery` semántico
(`version`, caja, centro), sin permisos ni handles. Hasta implementar su
readmisión al cargar, restaurarlo se rechaza antes de alterar la sesión viva;
no se convierte silenciosamente en movimiento JS.

## Validación y límites

Las pruebas usan el WASM real reconstruido, también pthread. La admisión de
fuente usa un doble explícito de drenaje/paquete retenido: **no es un recibo de
hardware, canal de consumidor ni prueba de recursos GPU**. Los fixtures generan
un checkpoint con centro cercano antes de crear la autoridad fresca; no prueban
la capacidad de trasladar centros durante la partida. Las variantes de terreno
desconocido y realmente bloqueado conservan el centro lejano del fixture anterior.

- 31/31 pruebas dirigidas de propuesta, Game y asociación de acción, sin omisiones.
- Regresión de 40 archivos: 425 pruebas, 424 aprobadas y un fallo de fixture de
  incursión combinado; ver el contraste y los recibos del registro adjunto.
- Builds nativos standalone y pthread aprobados. Compilación de producto y
  contraste del fallo se detallan en el registro de validación.

Evidencia reproducible: [registro de validación](performance/native-harvest-consequence-source-validation-20261115.json).
No se suman los recuentos solapados ni se afirma una suite completa aprobada.
Las pruebas anteriores documentan otros fallos históricos fuera de esta selección.

La nueva frontera aún rechaza cosechar un cultivo con otros propietarios que
necesitarían detenerse. Quedan preparación/retiro gráfico del cultivo, Carry y
caja originales, asociación/época de consumidores, coherencia de publicaciones
durante la preparación, readmisión de entrega, cancelación/drop, liquidación y
siguiente tarea, productor ordinario y recuperación integral. La reconstrucción
anterior de 3123 recursos sigue sin satisfacer el criterio de reutilización;
este incremento no hace otra prueba gráfica ni certifica ausencia de tirones.

## Confirmación de consumidor y pose de la frontera

El perfil nuevo exige además que el recibo de drenaje confirme explícitamente
`nativeTaskConsequenceVersion:1` y la plantilla preparada exacta. Un consumidor
anterior que ignore el nuevo campo no permite efectuar el commit: se abortan los
recursos candidatos y se conservan acción, cuerpo, cultivo e ID. Los consumidores
gráficos reales todavía no implementan esa confirmación. El doble de fuente la
declara expresamente, sin convertirse por ello en evidencia GPU.

La proyección adopta también orientación, fases y presupuesto de carrera de la
pose nativa inicial de Carry antes de ejecutar los listeners. Una prueba que
observa `CropPicked` reprodujo la orientación anterior de Harvest retenida hasta
el retorno asíncrono; ahora el listener observa la nueva frontera completa. Se
prueban asimismo recibos sin versión, de versión incorrecta, sin plantilla o de
otra caja: ninguno aplica efectos. Validación adicional: 55/55 pruebas en cinco
archivos, sin omisiones; los recuentos se solapan con los anteriores.
