# Guardado con la hoja del portón detenida a media apertura

En Desierto 983, Stop24 puede dejar la hoja de zarzas inmóvil con una apertura intermedia. El guardado público acepta esa apertura con Home18 pendiente, con ambas rutas adquiridas si dejan el portón fuera de sus reservas, y con el trabajador ya refugiado tras Home19. La autoridad exige una muestra WASM del mismo instante, con apertura y objetivo iguales al valor de Game y con el motor ya detenido. El archivo conserva la identidad de la hoja y su apertura exacta.

La recarga instala la geometría en esa posición. El tramo corto de Home se aleja del portón y conserva su hoja como geometría estática. Si ese tramo ya estaba adquirido, el archivo declara que Home no poseía esa reserva y la autoridad exige la misma condición al preparar el corredor restante. Al terminar la incursión, Farm23 vuelve a adquirir el motor del mismo portón para atravesarlo y llegar a Idle.

## Recarga en NVIDIA

Las tres recargas conservaron la apertura de `structure-1000000` en 0,3158244453326701. En la malla visible se midió 0,3158244164267268 a partir del desplazamiento del vértice 4365. El animal empezó a edad relativa cero en las tres y Home también lo hizo cuando estaba presente. Las tres readquirieron el mismo portón al volver a Farm, confirmaron cuatro golpes al centro, conservaron el saldo y drenaron Draw.

| Corte del guardado | Tiempo | Primer envío | Llegada a Idle | SHA-256 del recibo |
| --- | ---: | ---: | ---: | --- |
| Home pendiente | 10,60 | 20 | 70,05 | `3d74433e267bcba0a8d3d001d8d4c5f8c49f63c6eb608151292973aea551d678` |
| Home y aproximación adquiridos | 10,80 | 17 | 70,30 | `b1ca0679e8105b3a86819c9d842d8c882aee6e9cc4abbe19d4fe0b4c9cb28937` |
| Trabajador refugiado tras Home19 | 10,96 | 23 | 70,61 | `71150403af2ebc171ec56ce24f908b260642f5088e5f36b1843ce0892f033005` |

Los guardados proceden del coordinador público en CPU. El Hosted Worker los leyó con sus opciones persistidas. La sonda `.cache/make-desert-frozen-gate-audit.mjs` lee el vértice de la hoja estática residente y comprueba la referencia del motor que se adquiere al volver. Los recibos están en `E:/wild-guardians-qa/native-menu-20261126/desert-frozen-gate-{pending,active,refuge}-nvidia.json`.

## Regresión

```powershell
node --test tests/native-desert-gated-flight-checkpoint.test.js
```

Los controles de CPU generan sus guardados mediante el coordinador público. Rechazan la apertura adulterada y, en el corte activo, también el identificador alterado y la falta de la declaración de que Home dejó la hoja fuera de sus reservas. Retienen READY después de cargar y al esperar conservan la pose, las fases y la apertura exacta. Los tres confirman cuatro golpes, 520 HP restantes en el centro, un único regreso y el saldo original. Pasaron 72 pruebas de regresión y las seis pruebas del archivo de Desierto en la versión final. El build de producción terminó en 48,47 s y empaquetó los dos WASM de `94c7df129` byte por byte.

## Portón en marcha antes de Stop24

En la preimagen del guardado durante el movimiento del motor, a t=10,52, el trabajador espera en el vano con la asignación Farm23 y su reserva de la hoja. La apertura es 0,24915777866600486. WASM conserva el inicio de apertura en 10,370505332800386 y el final en 10,970505332800386. Stop24 tiene READY retenido y el coordinador devuelve `physics-active`.

Dos controles conservaron esa asignación mientras avanzaba el reloj. Al soltar READY en t=10,60 el trabajador seguía quieto. Al soltarlo en t=11,08 ya había reanudado la marcha y avanzado 0,118 m. Ambos readmitieron Stop24 con el ticket preparado 3 y el adquirido 4. El Host con cola determinista presentó el paquete 2 en cada caso. El recibo de Stop24 identifica el mismo motor y acredita su apertura en el GO, 0,3824911119993354 en el primer recorrido y 1 en el segundo. Desde ahí vuelve a estar disponible el guardado público de Home pendiente.

El cargador civil, sobre una copia de la que se retiró la incursión para aislar Farm23, reconstruyó la apertura inicial y la hora final de apertura. Al recomponer desde el corte, 30 valores de pose de las 36 muestras nativas cambiaron en los últimos bits, incluidos la fase de marcha y los ejes X y Z. La apertura calculada a partir del motor rebasado difirió también en el último bit a t=10,54. En otro control, el guardado público original a t=10,00 reprodujo el mismo nacimiento de la incursión y llegó a t=10,52 con los seis nudos, el motor y las 36 muestras futuras exactos. La recarga en el corte deberá reconstruir ese programa de Farm y del motor, readmitir su reserva y publicar los recursos del mundo antes de volver a preparar Stop24 para el mismo `RaidSpawned`.

Los controles usan Game, el WASM de `58fbcb47d`, ambos puertos y el Host con cola GPU determinista. Los recibos `desert-moving-gate-stop-hold.json` y `desert-moving-gate-stop-through-aperture.json` están en `E:/wild-guardians-qa/native-menu-20261126`, con SHA-256 `434c38fd763156de1083e0d4b6dd3c4c31912813fda39359fb2fdbdc774aa842` y `069cc3511b12d161adf1f6893fc5c1392dce713085f481cd645bb6f88d9265a9`. Los controles locales `.cache/desert-moving-gate-stop-{observe,control}.mjs` usan la partida `gated-flight-physical-input.json` con el nacimiento a +0,50 s. El argumento `--through-aperture` prolonga la retención hasta t=11,08. Este contraste todavía deja pendiente la recarga en t=10,52 y su validación física.

### Reconstrucción en el dueño de Farm

Un standalone privado extrae del `RouteSlot` de Farm el origen, las fases, el presupuesto y los tiempos originales. Verifica también que el mismo slot, cuerpo y generación poseen el cruce. Tras adquirir Stop24, la extracción ya no encuentra ese permiso. El corte solo contiene valores del programa. En el control frío, un cuerpo nuevo enlazado a Farm aporta la pose real del corte y el mundo aporta el portón registrado y su apertura. El candidato vuelve a probar el recorrido, el barrido del motor y la reserva con esos dueños actuales.

El contraste reconstruyó los seis nudos completos y las 36 muestras del control de t=10,52 con igualdad exacta. Diez cambios de origen, fase, tiempo, motor, espera o identidad se rechazaron. Un muro nuevo cerca del destino también invalidó la reconstrucción. La inspección verifica que tanto el positivo como los rechazos conservan el cuerpo enlazado, la solicitud, el motor residente, el registro de reservas y la frontera del mundo. Esto acredita la reconstrucción del candidato en CPU. La vinculación del candidato al guardado público, su adquisición gráfica a la hora del corte y el Stop24 de la partida recargada siguen pendientes.

La fuente del control está en `.cache/desert-farm-gate-native-source`. El standalone de `.cache/desert-farm-gate-owner-proof/standalone/spatial-savanna.wasm` tiene SHA-256 `10b34195352e1220bedb0c24b2434c4858c6fcfa36b7a6539a1004787493d5b6`. Su ABI conserva las importaciones y exportaciones anteriores y suma dos entradas privadas de control. Los binarios de producto conservan sus huellas. El recibo `desert-farm-gate-owner-proof.json` tiene SHA-256 `c276845df176486ad28a1262bf8838fd36c5bb745f3073663cc7d0a4023aa21a` y se reproduce con `.cache/desert-farm-gate-cut-conformance.mjs`, el loader `.cache/desert-farm-gate-cut-probe.mjs` y el recibo anterior `desert-moving-gate-stop-hold.json`. La selección con el standalone privado pasó 25 pruebas de Farm, motores y proxies.

### Adquisición desde el corte de Farm

El candidato privado usa la transacción de Farm23. La reconstrucción conserva el origen matemático de t=10 en el `RouteSlot`. Los recursos de Draw empiezan en t=10,52 con la pose, las fases y la apertura de esa frontera y los cinco nudos restantes. La prueba de adquisición coteja esa hora con el binding nativo de Farm. El control con la comparación anterior falla por `Committed native resume differs from its proposed assignment`.

Los controles nativos cancelaron el ticket 1 mientras la hoja conservaba su apertura y la reserva seguía vacía. Un recibo ajeno y un GO después de adelantar la hora del corte se rechazaron. Con reloj en esa misma frontera, READY 2 adquirió el ticket 3 y conservó todas las muestras comprobadas. Stop24 tomó ese cuerpo a t=10,60 con la hoja al 38,25 % y, en el otro orden, a t=11,08 con la hoja abierta y la marcha ya reanudada. En ambos casos produjo una petición Home para el `RaidSpawned` 29208 con el mismo cuerpo y la pose de la parada.

El productor ordinario y ambos puertos también entregaron el programa a un Host con cola GPU determinista. READY 1 adquirió Farm23 con el ticket 2. El envío 1 escribió la edad cero del trabajador y el reloj del portón de t=10,52. Este control aisló Farm en una copia civil. Los ensayos nativos verificaron Stop24 y la petición Home por separado. Quedan la escritura y recarga públicas con la incursión activa, los materiales de Surface y la comprobación física.

El candidato se conserva en `.cache/desert-farm-gate-stage-source`. El standalone privado `desert-farm-gate-stage-final/standalone/spatial-savanna.wasm` tiene SHA-256 `9d2765a88bd285e34d149f946cbfe23ccd3622fff043adc99abc01e1358a2eff`. Los recibos `desert-farm-gate-stage-{hold,through-aperture,host}.json` se reproducen con `.cache/desert-farm-gate-stage-probe.mjs` y los controles `desert-farm-gate-stage-{conformance,host}.mjs`. Sus SHA-256 son `80fd657a709f38dd80dc1fa74da98e57102e9e945fc2ac7c8ad5da7e8c16ff14`, `60dbc9dc36609fc46f515339d33ce25c8b4a15390979b42139af1c1ecf606fd0` y `4b3ddcfbb7f8d03867dd6f443238c654ccf2ab3774ae5cb98233ed24601c3e87`.

Pasaron 66 pruebas de regresión de Farm, motores, proxies y admisión causal con el candidato privado. La fuente, binario y recibos están identificados en `.cache/desert-farm-gate-stage-manifest.json`.

### Guardado público con Farm23 y el motor aún adquiridos

En el corte de Desierto 983 a 10,52 s, el guardado público conserva el origen del programa de Farm, la pose ejecutada y los tiempos del motor. El archivo conserva `RaidSpawned` 29208 y el corredor pendiente hacia el centro. La nueva autoridad reconstruye la reserva con su propio cuerpo y su propio ticket. La tabla gráfica comienza en el instante guardado y WASM sigue evaluando el programa desde su origen de 10,00 s.

Con Farm READY retenido, el control de CPU solicita dos pasos y ejecuta cero. El primer envío escribe edad cero para Farm y la hora exacta de 10,52 s para la hoja, abierta a 0,24915777866600486. Después de retener el nuevo Stop24, la hoja alcanza 0,3824911119993354 y se detiene a 10,60 s. El mismo trabajador vuelve a Idle a 61,80 s, conserva su contrato y el saldo, y el centro queda con 520 HP después de los cuatro golpes. Un tiempo de motor adulterado que pasa la validación de formato se rechaza en WASM antes de solicitar recursos a Draw.

```powershell
node --test --test-name-pattern="public raid checkpoint reacquires" tests/native-desert-gated-flight-checkpoint.test.js
```

El control usa Game, los dos puertos y el Host con cola GPU determinista. Pasaron 468 pruebas de checkpoint, movimiento, Farm, admisión y Stop24. La prueba anterior de las dos rutas adquiridas toma pasos de 0,01 s al acercarse a su corte. Con pasos de 0,02 s, el primer dibujo que cumple el criterio puede llegar cuando WASM ya confirmó la llegada de Home. La prueba sigue exigiendo ambas edades positivas y que la autoridad autorice el guardado antes de Home19.

La receta de compilación conserva las importaciones y las exportaciones previas y añade las dos entradas de Farm para capturar y readmitir el corte. Standalone `f15890f9a03978a2940c109caacc32f7ec24d2c938c694be60e06ca7d3d51065`, pthread `ee153bb61562e8e5f49d6e680be83a0118228a6ae2ddc0850455d9b2975757ff`. El archivo de disco y el recibo de CPU están en `E:/wild-guardians-qa/native-menu-20261126/desert-farm-flight-disk-{cut.save,cycle}.json`.

### Recarga del motor y Stop24 en NVIDIA

En la primera pasada, el dibujo de Farm y el reloj de la hoja coincidieron con el guardado. Stop24 falló en el roster porque el `RaidSpawned` original de 10,50 s precedía al nuevo GO de Farm a 10,52 s. El roster conserva ahora el nacimiento confirmado al preparar el Farm frío. Solo esa identidad permite que el nacimiento preceda al nuevo GO. El control con el rig original reproduce el fallo de la preimagen y rechaza otra identidad con el mismo tiempo. Pasaron 40 pruebas de rigs, admisión y Stop24.

En NVIDIA Turing, el dibujo 17 presentó Farm23 y su motor con el ticket 2, el reloj de la hoja a 10,52 s y la edad de movimiento en cero. La apertura confirmada era 0,24915777866600486. El arnés retuvo el nuevo READY de Stop24 hasta verificar ese dibujo. GO 4 tomó el mismo cuerpo y la misma hoja a 10,52 s. Home18 tomó el ticket 6 y Home19 retiró el cuerpo con el ticket 9. Se confirmó un `RaidEnded` a 62,61 s y el regreso civil readquirió el portón con Farm23, ticket 29. El mismo trabajador volvió a Idle a 73,57 s. Game conservó el saldo, el contrato, el único nacimiento de la incursión y los cuatro golpes que dejaron el centro en 520 HP. Draw devolvió `{disposed:true}` sin errores de preparación ni de recursos.

Una corrida previa llegó a Idle pero el arnés comparó un nombre de propuesta con `kind:24` y se detuvo antes del drenaje. La corrida final usa el tipo real, el mismo archivo guardado y el reloj normal de Hosted tras Stop24. Acredita el reloj del motor y el dibujo enviado. La medida directa del vértice de la hoja sigue correspondiendo a las tres recargas estáticas anteriores.

| Archivo | SHA-256 |
| --- | --- |
| `desert-farm-flight-disk-cut.save.json` | `aa6ac32744dc2bccbe7a21bd9a66b91c584a2630e44227cc6bc13d2e7ccf02a6` |
| `desert-farm-flight-disk-nvidia-final.json` | `2db525de368a2bb7c222f333f7b04f135ac6031982146f171aad3699b1371015` |

Ambos archivos están en `E:/wild-guardians-qa/native-menu-20261126`. El arnés local `.cache/desert-farm-flight-disk-nvidia.mjs` carga `desert-farm-flight-disk-nvidia-input.json` mediante `QA_FLEE_INPUT`, pasa el guardado por `QA_ACTIVE_FLIGHT_REPLAY_SAVED` y usa `QA_FLEE_PENDING_FARM=true`, `QA_FLEE_EXPECT_ANIMAL=true` y `QA_FLEE_EXPECT_CIVIL_RETURN=true`. La ejecución usa Edge con el backend Worker y Draw remoto y conserva tres cambios locales heredados de escena, precarga y destrucción en el checkout. La selección dirigida y la prueba física se completaron. El empaquetado web completo quedó sin ejecutar porque la copia inicial de `public` ocupa 2,65 GB y los destinos disponibles tenían menos espacio libre.

### Guardado antes de arrancar el motor y después de abrir

La rama anterior devolvía `physics-active` en dos cortes con READY de Stop24 retenido. A 10,20 s Farm todavía se acercaba a la hoja cerrada. A 11,08 s la hoja estaba abierta y el mismo cuerpo había retomado la marcha. En ambos cortes la reserva nativa de Farm seguía vigente. El guardado ya acepta los dos casos con el mismo contrato de disco. WASM exige que los tiempos de la hoja coincidan con la espera del corredor reservado y que la muestra ejecutada coincida con la pose confirmada. La recarga rechaza un motor con tiempos desplazados, incluso cuando su apertura inicial se mantiene en cero.

En el corte posterior a la apertura, recalcular la fase final desde la pose recortada daba `16,2929914073781`. El programa original de WASM daba `16,292991407378103`. READY y GO transportan ahora el origen de las fases y las distancias del programa reconstruido. El receptor verifica las sumas en el mismo orden y rechaza la fase que difiere en el último bit. Sigue empezando el reloj gráfico en el corte.

El control `node --test tests/native-desert-gated-flight-checkpoint.test.js` conserva el STOP original retenido y compara con la recarga durante el nuevo READY. Coinciden pose, fases y apertura en seis publicaciones para el motor programado, hasta que arranca, y dos para las otras fases. Las tres historias terminan en Idle, conservan saldo y contrato, y registran los mismos cuatro golpes. La selección amplia aprobó 470 de 471; el único rojo esperaba que el corte nuevo siguiera sin admitir guardado. Con la expectativa actualizada, los dos casos anteriores de Home pendiente pasan en el control dirigido.

El build de producción terminó en 1 min 2 s usando dos volúmenes para la copia de recursos. El paquete contiene los mismos WASM que el checkout, standalone `fda937e3a835499085a356898e3069f31ad962ec1afe4a5175c2f0dcba638199` y pthread `d8e47a7f1dd8c40109b7f956f2ddb02c4550283db61f0a785ef835c500d9d930`. El verificador de publicación sigue en rojo por tamaño del paquete. La salida tiene 1.443 archivos y 887.594.674 bytes. Incluso al descontar los 19 archivos locales de `public` quedan 1.424 archivos y 860.967.662 bytes, por encima de sus límites de 1.000 archivos y 500.000.000 bytes. El build y el verificador dejaron sus recibos en `.cache/desert-farm-gate-phases-{product-build,package-check}.log`.

NVIDIA Turing verificó las dos recargas con Hosted, Preparer y Draw. Farm presentó edad cero y la hora guardada. En el caso programado, Stop24 envió el valor cero de la hoja junto al cuerpo detenido. Con la hoja abierta, el paquete de Stop24 conservó el binding instalado de Farm y no emitió una mutación de motor. La primera pasada de ese caso se detuvo por la expectativa incorrecta del arnés de recibir una mutación. La repetición verificó la retención exacta y continuó hasta el drenaje. Ambos recorridos llegaron a Home19 con el mismo actor, confirmaron los cuatro golpes hasta 520 HP y conservaron contrato y saldo al volver a Idle.

| Corte | Farm23 / Stop24 | Apertura en Stop24 | Idle | SHA-256 del recibo |
| --- | --- | ---: | ---: | --- |
| 10,20 s antes del motor | dibujos 17 / 22, tickets 2 / 4 | 0 | 73,50 s | `c73b299d631126fe6aca185b959492befd42831b06d66df88bf6111cdfd70b29` |
| 11,08 s con la hoja abierta | dibujos 15 / 17, tickets 2 / 4 | 1 | 73,68 s | `99c0fea803b426c7b1effcaa635543ed75e4f02ba4231959ded94450a2cf30e7` |

Los recibos `desert-farm-scheduled-nvidia.json` y `desert-farm-open-nvidia-final.json` están en `E:/wild-guardians-qa/native-menu-20261126`. El mismo directorio conserva los archivos `.save.json` con SHA-256 `b17eb4536d666cf5027ff2d6bfae8f440c6eeb71854913c8c7353a1d29410132` y `2f1147bf3edcab4dccafbc8449a09ec155f0078e66561c07e732790969d3dee3`. Se reproduce con `.cache/desert-farm-gate-phases-nvidia.mjs`, la configuración de la prueba anterior y los inputs `.cache/desert-farm-{scheduled,open}-nvidia-input.json`. El arnés mantiene el reloj suspendido hasta observar ambos dibujos. Pasó con los cambios gráficos locales de las recargas previas. Esta comprobación acredita el estado visible y el ciclo funcional del caso, con C4 aún abierto.

El inventario `.cache/desert-farm-gate-phases-release-inventory.json` cuantifica el bloqueo del paquete. `content/character-preview` ocupa 200.349.121 bytes e incluye datos usados por los bancos de marcha del producto. `assets/web` ocupa otros 176.658.400 bytes. El límite de publicación sigue abierto y requiere preservar el contenido que usan el juego y la transición visual.

### Compresión de animaciones en el paquete web

El build de producción agrupa los 70 clips horneados en nueve bancos por perfil. Cada clip es un miembro gzip independiente. El Worker pide solo el rango del clip y también admite servidores que devuelven el banco entero. El verificador decodifica cada miembro con el lector real y compara sus metadatos y SHA-256 con los originales. Los 140 archivos individuales ocupaban 28.966.876 bytes en total. Los 18 archivos de los bancos ocupan 17.281.620 bytes. Los archivos individuales siguen disponibles en desarrollo. Las 33 fixtures bajo `public/qa` salen del build de producto y el servidor de QA conserva su copia.

Pasaron 31 pruebas dirigidas de lectura, cancelación, validación de origen y ciclo de vida gráfico. Un Worker de Edge sin GPU, servido desde `/nested/itch/game/`, creó texturas de Idle, GetUp, Walking y Weapon_Combo_2 con respuestas HTTP 206 y 200. Las dos pasadas devolvieron los mismos hashes. El build completo de WebGPU Worker con Draw remoto terminó en 49,68 s, antes de la etapa de empaquetado. Los recibos están en `.cache/baked-animation-bank-{vite,browser,package-check}.log`.

La salida quedó en 1.287 archivos y 845.779.815 bytes, 156 archivos y 41.814.859 bytes menos que el build anterior del mismo checkout. Las comprobaciones de recursos y enlaces pasaron hasta llegar a los límites de publicación. Quedan 287 archivos y 345.779.815 bytes sobre el presupuesto. Una prueba de gzip individual sobre la salida anterior, contando cada archivo crudo cuando era menor, todavía habría ocupado 707.856.460 bytes. La compresión genérica de los archivos actuales no cierra por sí sola este presupuesto.
