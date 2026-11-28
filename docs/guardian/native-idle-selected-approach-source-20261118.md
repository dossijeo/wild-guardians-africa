# Fuente nativa de aproximación seleccionada con remaining — 2026-11-18

Continuación de `7efb3279c`, A6-04.f-R3/e-R3. Se implementa el siguiente contrato pendiente en el propietario nativo 22 existente. La integración DTO/puente/Game/control/roster/Surface y su admisión gráfica aún no se habilitan. A6/A/B/C abiertos; D no iniciado.

## Investigación y reglas originales

Se leyó código real de [DetourCrowd v1.6.0, requestMoveTarget/updateMoveRequest](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L638-L849): mantiene la solicitud seleccionada separada del camino derivado e instala el corredor después de procesar su resultado. Se adapta esa separación al draft/ruta/reservas/reloj existentes. No se incorpora Detour ni su corredor parcial/reposición de destino; el extremo sigue siendo el ancla exacta y la fuente nativa debe continuar vigente.

Se contrasta `src/simulation/idle.js`: **remaining se conserva durante WALK**; al llegar `cancelWalk` consume el sorteo privado original y crea un REST nuevo. No se conserva el remaining anterior después de la llegada. Se aclara así el diagnóstico previo: la fórmula insuficiente era la del estado WALK de ejecución, no la renovación REST original. Las pruebas observan nudos semánticos sin importar overshoot de un tick arbitrario, con margen de 4 ns por encima del umbral original de fase 1 ns antes del reintento; el límite nativo coincidente sigue siendo cero exacto.

## Contrato implementado

- `nav_idle_stroll_cycle_approach_version() === 1` y `nav_idle_stroll_cycle_approach_proposal_stage(actor,session,decisionSequence)` admiten solo la aproximación ya seleccionada por el 21 actual y terminado. No reciben remaining/RNG/destino elegibles desde JS. La solicitud nativa exacta conserva sus valores.
- Se amplía el array semántico interno del mismo 22 a 21 posiciones: marcador 2 en [0] y WALK remaining en [20]. El encabezado de ruta sigue en 24 campos. Los datos conocidos siguen en sus índices; el binding nuevo serializa 73 valores y la fuente retenida 48. Los casos heredados mantienen marcador 1 y las longitudes 72/47 originales.
- La entrada antigua mantiene -8 ante aproximación seleccionada y el marcador 2 es rechazado por los lectores tipados antiguos. La capacidad nueva no registra un WALK restaurado ni fabrica 20/23 previos; un cold/Farm request o un 21 sin esa selección no puede invocarla.
- Reutiliza consulta/caché de navegación, timing, preflight/reserva, ticket, revalidación, commit y publicación existentes. Solo la aproximación seleccionada permite el recorrido exterior original de `nav.path`; el paseo local conserva su restricción de radio. El destino debe ser el ancla nativa exacta.
- El draft conserva la secuencia del 21 y de su decisión, RNG/retry/remaining y origen temporal. Si cambia topología se vuelve a validar el camino, sin elegir de nuevo el objetivo ni consumir RNG. Cancelar, esperar, revalidar o usar un ticket incorrecto no consume la solicitud ni mueve el cuerpo. Retirar ancla/cuerpo revoca el candidato.
- Al adquirir 22 se retira el 21. El WALK y su variante retenida exponen el remaining conservado; al llegar se observa el `cancelWalk` original una sola vez y puede adquirirse un 21 real desde el 22 llegado. No se retiene una cadena creciente de permisos ni se crea otro dueño de actor/cuerpo.

## Validación

- **20 pruebas nuevas**: cuatro perfiles normal/pthread, selección desde REST/WATCH, remaining cero en reintentos coincidentes, streams 0/1/ffffffff, cancelación/retiming/ticket, identidades falsas, cuerpo/ancla retirados, topología bloqueada/reparada, época grande, lectores antiguos y fuente retenida tras suspensión/Home. La cadena ABI completa WALK fallido→21→aproximación 22→21 llegado pasa en los ocho montajes.
- Baseline WASM anterior en solo lectura: **4 fallos esperados por capacidad ausente, 16 casos filtrados, 0 pases**. Pasan **550 dirigidas en 28 archivos** y **3.227 de 3.228 seleccionadas en 274 archivos**: una comparación opcional omitida y siete exclusiones históricas; no es toda la suite del repositorio. Build **49,84 s**.
- Ocho registros numéricos originales: WALK remaining **11,149999856948853**, no el valor de nacimiento 7,599999904632568; se mantiene al ejecutar y retener. La llegada produce REST **11,399999856948853** con el siguiente RNG privado original. Game y RNG global se mantienen intactos en el montaje ABI; un compañero nativo avanza.
- Compilación normal/pthread con fuentes/exports y flags del script canónico. Se instalan solo tres salidas propias; el dummy worker generado de 299 bytes es idéntico al archivo ajeno preservado y no se copia. **456 inputs finales /64 nativos compilados /16 ajenos exactos**, seis archivos nativos cambiados (tres fuentes/script y tres salidas), sin editar WASM manualmente.
- GPU NVIDIA: regresión heredada 22→21 conserva 648/649 IDs inmutables iniciales, 100/98 recursos preparados, cero tardíos, picking/adopción/drain. Ventana máxima **56.320 ms**, 1 hueco >50; global **85.125 ms**, 3 huecos >50.
- GPU NVIDIA adicional Farm23→aproximación 22→REST21 pasa con 102/70/98 recursos preparados, cero tardíos/duplicados y retirada. Ventana máxima **159.355 ms**, 4 huecos >50; global **159.355 ms**, 6 huecos >50. Todas las muestras se conservan, sin atribuir causa ni declarar aceptación.

[Evidencia, registros ABI, compilación, selección de pruebas y regresiones GPU](performance/native-idle-selected-approach-source-validation-20261118.json).


## Alcance y siguiente punto

Las pruebas nuevas usan commits ABI de confianza y cohort nativo real, no un recibo GPU. No demuestran dibujo/admisión gráfica del nuevo marcador 2 ni productor ordinario. Las regresiones GPU de formatos heredados demuestran que estos siguen funcionando; no son evidencia de la aproximación nueva.

Sigue adaptar el descriptor y el puente existentes a semantic2/remaining, después proyección/guardado, control y actor residente/Surface/GPU. El estado WALK guardado debe transportar su valor real: el validador/restaurador actual de aproximación fría todavía presupone `idleSeconds*2`. No se habilita el producto por existir dos exports. REST/WATCH exterior guardado, productor/cohort, recuperación incremental de 3.123 recursos y cadencia/plataforma conservan sus pendientes.
