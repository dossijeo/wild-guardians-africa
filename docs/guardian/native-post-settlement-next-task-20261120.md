# Segunda tarea ordinaria sobre el cuerpo liquidado

Continúa A2/A4/A7/e-R3/f-R4 después de [Home y ausencia](native-post-settlement-home-20261120.md). La misma autoridad Worker, contratación pagada, productor, preparador, Surface y cuerpo completan la primera entrega y adquieren una segunda Task14. Se corrige la excepción del picking de la imagen anterior mientras la escena CPU prepara esa candidata. No se declara aceptada la interacción con una escena incompleta ni la cadencia global; A6/A/B/C siguen abiertos, D no iniciado y f-R3 solo seguro.

## Investigación integrada y decisión

Se releyó [DetourCrowd1.6 requestMoveTarget/updateMoveRequest](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp): la petición y el corredor pertenecen al agente existente. El componente de siguiente tarea desde liquidación ya estaba implementado; faltaba su continuidad ordinaria y la consulta de la presentación retenida, por lo que no se rehace su planificación.

Se descargó y leyó el código real de [Three r180 Raycaster](https://github.com/mrdoob/three.js/blob/r180/src/core/Raycaster.js): invoca raycast sobre los objetos vivos y recorre sus hijos; filtrar intersecciones después no convierte una candidata en la imagen presentada. [CubeCamera.update](https://github.com/mrdoob/three.js/blob/r180/src/cameras/CubeCamera.js) conserva destino, cara, mipmap y XR, usa su vista temporal y restaura el estado anterior al retorno normal. No tiene ese finally de error: Wild Guardians utiliza sus operaciones reversibles existentes y añade la restauración en finally. Fuentes, URL y SHA archivados. También se leyó SkinnedMesh instalado, sin presentarlo como copia upstream intacta. No se introduce biblioteca, escena adicional, registro, reloj, cola ni autoridad.

## Cambio acotado

Surface ya activaba los participantes CPU para capturar el paquete GPU inmutable antes de READY, y los conservaba activos hasta el commit. La GPU seguía dibujando el paquete anterior. El primer piloto encontró un fallo real al consultar la segunda tarea con READY retenido: Native first task has no submitted pick clock. Su cuerpo y dibujo seguían siendo la liquidación17; el picker consultaba el reloj de la Task14 aún no presentada. Se conserva ese rechazo de reloj: no se sustituye por cero, tiempo global ni permiso ficticio.

El participante del roster ofrece withSourcePresentation únicamente a una siguiente Task con la liquidación gráfica adquirida anterior. Para una consulta síncrona válida usa su rollback existente, consulta la misma escena/cuerpo/rig y reactiva la candidata en finally. Antes de activar la candidata consulta directamente la fuente que sigue activa. Rechaza promesas, reentrada y consultas después de finalizar/cancelar; las guardas de propiedad permanecen. Surface usa esta operación solo con un participante sin motores de puerta durante preparing/ready. Otros orígenes, puertas y la ventana de adopción no quedan aceptados globalmente por esta corrección. No se crean recursos GPU, cuerpos ni escenas para hacer esa consulta.

La auditoría optativa añade una segunda planta al estado semántico inicial, mismo centro del contratado, con crecimiento a70 segundos de madurar. El primer caso medido liquida a205.96 y termina las comprobaciones iniciales a206.3; la segunda planta madura a230 por Game.advance ordinario, antes del contrato mínimo250. No se crea una tarea desde la página ni se acelera el reloj. Se retiene y libera su READY genuino, conserva todas las comprobaciones de la primera entrega antes de continuar y acredita otra Task14/target900100 con secuencia nueva sobre cuerpo2, misma sesión y Surface, ledger único y referencia preparada frente a epoch adquirido. El control mantiene desactivada la continuación.

## Validación y límites

Siete casos nuevos con WASM real, modelo y bancos originales y picker de Three: selección de la fuente mientras la candidata no tiene reloj presentado, cuerpo/rig/banco conservados, cancelación, restauración ante excepción/promesa/reentrada, consulta antes de activar y rechazo después del commit o sin fuente gráfica adquirida. El renderer/admisión de esos componentes son dobles; no se presentan como un fence hardware. **37/37 dirigidos en cuatro archivos**, sin fallos, omisiones ni cancelaciones. Un control negativo carga solo el roster padre por lectura en su URL real, con dependencias actuales y los mismos WASM; el fallo esperado de la operación ausente se conserva junto al fallo GPU original.

Selección completa aceptada: **4939/4940 pases,1 omisión opcional,0 fallos/0 cancelaciones,372 archivos,705.507s**; siguen abiertas las tres exclusiones históricas, no es toda la batería del repositorio. Build WebGPU Worker/remote nuevo en131.298s y ocho sintaxis. Las mediciones GPU terminan antes de ejecutar CPU y build concurrentes. Los64 inputs nativos permanecen idénticos por bytes; no se recompila WASM/C++.

Cinco GPU Edge/NVIDIA Turing sobre los mismos ocho archivos congelados: los cuatro perfiles completan primera entrega → segunda Task14; control primera liquidación. Se reutiliza el piloto olderMale correcto porque sus hashes coinciden, sin repetirlo. Conservan los IDs invariantes de la tabla, raíces/bones/geometrías/rigs, banco compartido refs1→2→2/pending0, dos cuerpos, referencia preparada del shader y epoch real del commit, progreso de fuente/GPU y drenaje. Se revisan las nueve imágenes: dos por perfil y una del control.

Las consultas devuelven el actor correcto sin la excepción de reloj, pero **conservan incomplete cuando hay preparación pendiente**, la marca puede persistir tras el primer dibujo adquirido, como en olderMale. El recibo no acredita todavía una ventana de interacción lista en ese caso. La guarda nativeDrawReadiness no se rebaja. Esto no acredita acciones de gameplay aceptadas durante esas ventanas ni cierra A7.

| Perfil/control | IDs invariantes | Consulta READY retenido | Consulta tras Task14 | Mayor intervalo amplio ms |
| --- | ---: | --- | --- | ---: |
| olderMale | 581 | incomplete | incomplete | 172.395 |
| olderFemale | 581 | incomplete | ready | 249.540 |
| youngMale | 590 | incomplete | ready | 424.395 |
| youngFemale | 590 | incomplete | ready | 248.615 |
| settlement-control | 576 | — | — | 52.035 |

Los intervalos amplios pertenecen al historial disponible y pueden incluir capturas/inspecciones; no son tiempos GPU ni atribución causal. La cadencia sigue abierta, incluido el469.900ms de Home y el caso global de recuperación incremental3.123; esta prueba no lo reconstruye ni lo da por resuelto.

El piloto fallido, sus cinco fuentes QA exactas y las fuentes de producto originales se conservan. Cinco pruebas rojas iniciales y las iteraciones CPU se archivan: una ejecución aún usó el producto anterior tras fallar el marcador de edición CRLF antes de escribir, y otra tuvo un error del fixture nuevo que confundía actorID con el objeto actor; se corrigió sin atribuirlo al producto. El piloto correcto congela ocho archivos, incluidos los dos JS de producto: su etiqueta QA-only heredada del runner no describe el diff real. Solo la matriz final y las validaciones descritas acreditan esta revisión.

705 inputs probados,998 archivos de ejecución,64 nativos,16 ajenos y38 A5 externos contrastados; cuatro documentos principales conservados por bytes salvo la entrada nueva. [Recibo y artefactos](performance/native-post-settlement-next-task-20261120-validation.json).

## Siguiente punto

La disponibilidad para una segunda Task14 desde liquidación queda comprobada en estos cuatro perfiles. No equivale a terminar su segunda acción/entrega. Evaluar la continuidad Idle autónoma después de liquidación: en estas observaciones el contratado conserva Idle estacionario con idleState null, mientras el compañero Farm sí ejecuta21/22. Mantener pendientes los demás orígenes/cohortes, fallos/cancelación, puertas/device loss/VFX, interacciones, costes y aceptación global3.123/cadencia según checklist; investigar código fuente consolidado antes de ampliar cada mecanismo.

## Segunda entrega de youngMale

El mismo ensayo continuó después de Task14 sin parar la autoridad. La segunda planta maduró tras 65 segundos de simulación en la misma ubicación, con margen para completar la entrega antes del fin de turno a 250. El segundo recorrido empezó con el contrato vigente y liquidó a 247,12. Los tickets 21, 25, 27 y 29 se dibujaron en NVIDIA Turing. La secuencia de asignación enlaza Task14 con Harvest15, la de acción enlaza Harvest15 con Carry16 y la segunda caja enlaza Carry16 con la liquidación17.

La primera entrada de 14 monedas se conservó. La segunda caja pertenecía al segundo cultivo, quedó entregada y dejó una sola entrada nueva de 14 monedas. El trabajador volvió a Idle con el cuerpo 2. Conservaron las dos raíces y las geometrías del recorrido previo y el consumidor confirmó el drenaje. El mayor intervalo en los cuatro tickets de la segunda entrega fue de 37,6 ms a 30 Hz. La comprobación de la entrega repetida cubre youngMale y deja C4 abierto. [Recibo](performance/native-post-settlement-second-delivery-20261121.json).

OlderFemale completó la misma cadena con velocidad de marcha de 1 m/s. Conservó el cuerpo 2 y las dos raíces anteriores. Su segunda caja dejó un abono único de 11 monedas y la primera entrada se conservó. La segunda liquidación ocurrió a 248,12 y el Host midió un máximo de 36,4 ms a 30 Hz en sus cuatro tickets. El consumidor confirmó el drenaje. [Recibo de ambos perfiles](performance/native-post-settlement-second-delivery-20261121.json).
