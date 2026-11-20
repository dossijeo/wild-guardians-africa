# Continuidad ordinaria de liquidación a Home y ausencia

Continúa A2/A4/e-R3/f-R4 después del [primer uso GPU preparado](native-prepared-first-use-20261120.md). La misma contratación pagada, autoridad Worker, productor, puertos, Surface y cuerpo completan Task14 → Harvest15 → Carry16 → liquidación17/Idle → expiración del contrato → Home18 → ausencia20. Ambos trabajadores de cada cohorte llegan a Home. Este recorrido queda acreditado; A6/A/B/C y la cadencia global siguen abiertos, D no iniciado y f-R3 solo seguro.

## Investigación y decisiones

Antes de ampliar cada mecanismo se consultó código real de [Godot4.4 NavigationAgent3D](https://github.com/godotengine/godot/blob/4.4-stable/scene/3d/navigation_agent_3d.cpp), [DetourCrowd1.6](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp) y [Comlink4.4.2](https://github.com/GoogleChromeLabs/comlink/blob/v4.4.2/src/comlink.ts); fuentes exactas y SHA archivados. Godot mantiene la pausa del agente ligada a su procesamiento, Detour conserva el agente al cambiar/resetear su destino, y Comlink correlaciona respuestas por identidad. Se adaptan al protocolo ya existente de preparación, cancelación y frontera física de Wild Guardians. No se introduce biblioteca, autoridad, reloj, cola, registro de cuerpos ni protocolo público nuevos.

El caso terminal reutiliza además la solución local comprobada de Farm completada → Home: conservar cuerpo, pose y fases realmente ejecutadas, retirar el corredor anterior y preparar Home. El host ya contenía retainedIdleEndpoint para quiescencia y límite de reloj; ahora aplica esa misma comprobación a la adopción del frame coherente. Las copias originales archivadas permiten contrastar estas decisiones con el producto anterior.

## Cambios y fallos corregidos

1. La expiración con WALK activo selecciona la operación preparada12 del productor existente. Mantiene binding, slot, cancelación y rotación; no autoriza Home directamente desde movimiento. Se conserva el rechazo si falta la capacidad de parada.
2. Un WALK realmente terminado puede solicitar Home sobre su cuerpo nativo y su pose final, sin fabricar REST. El indicador de procedencia completedIdleStroll es interno, análogo al de Farm; el DTO público conserva19 campos/version1 y los exports nativos no cambian. Se verifican identidad, sesión, generación, secuencia, destino, pose, fases y barreras. La liberación conserva los guardas de compañeros; busy permite cancelar la parada obsoleta y reintentar por el mecanismo original. El productor no intenta nuevos ciclos Idle después de vencer el contrato.
3. Roster y consumidor admiten solo la continuidad terminal acreditada del WALK instalado. El lease anterior permanece acotado a su fin real durante Home pendiente; no se amplía su ejecución ni se admite retroactivamente otra ruta.
4. Un floor físico adelantado por el otro actor podía impedir adoptar un frame normal y dejar Home esperando whenFrameSettled. La condición de adopción reutiliza retainedIdleEndpoint, que exige ruta actual y endpoint finito ejecutado. Permanecen los controles del floor global, ownership y ejecución.

El harness optativo retrasa READY genuino y verifica dibujo/adopción, procedencia del cuerpo, ledger único, picking positivo en el endpoint y negativo después de ausencia de ambos actores. Distingue la referencia PREPARADA e inmutable del shader del epoch de ejecución realmente adquirido. Comprueba identidad de rigs mientras están presentes; una raíz retirada requiere el commit auténtico de ausencia y estado Home. Conserva todas las comprobaciones iniciales antes de continuar el recorrido largo; no agranda historiales ni congela compañeros.

## Validación y alcance

52 casos nuevos;275/275 dirigidos de la revisión final en11 archivos, sin omisiones ni cancelaciones. Los292 pases dirigidos anteriores se conservan como evidencia de esa revisión, sin sumarlos ni presentarlos como nueva ejecución final. La selección aceptada se repite con cuatro archivos nuevos: **4932/4933 pases,1 omisión opcional,0 fallos/0 cancelaciones,371 archivos,765.138s**. No es toda la batería del repositorio: las tres exclusiones históricas siguen abiertas. Build nuevo WebGPU Worker/remote en141.904s. El control negativo restaura por lectura el WASM original y tres módulos JS padres en sus URLs reales, con otras dependencias actuales: reproduce el rechazo original de frontera de retorno; no se presenta como ejecución íntegra del padre. Un caso rojo del host reprodujo también la adopción detenida antes de aplicar la condición del endpoint.

La primera selección completa dio4927 pases,5 fallos y1 omisión en4933 casos. Dos expectativas aún exigían rechazar el Home directo desde WALK terminal; se retira ese preludio sustituido, manteniendo íntegra la comprobación REST adquirido → Home con marcador WALK aún sin proyectar. Los otros tres fallos detectaron una regresión real: una declaración inicial/restaurada sin cuerpo devuelve legítimamente referencia de cuerpo nula. La espera por busy se acota al nuevo caso completed-WALK; las declaraciones conservan su transición previa. Las pruebas nativas originales vuelven a comprobar las tres situaciones. Se archivan fuentes exactas de esa versión y su matriz GPU anterior correcta; después de corregir se repiten los dirigidos, las cinco GPU, selección completa y build sobre la revisión final.

Se recompilan standalone y pthread con el script/flags canónicos, fuentes y comandos archivados. Cambian dos fuentes C++ y ambos WASM; se conserva la interfaz exportada de ambos. La copia del loader y el worker protegido se contrastan por bytes. CPU y build se ejecutan después de terminar todas las mediciones GPU; solo esos dos trabajos CPU se solapan.

Cinco ejecuciones GPU secuenciales Edge/NVIDIA Turing sobre las mismas fuentes congeladas: cuatro perfiles llegan a Home/ausencia con dos retiros legítimos; el control mantiene desactivada la continuación y termina en liquidación/Idle. Conservan los IDs invariantes contados en la tabla sin destruirlos/reconstruirlos ni duplicar WGSL idéntico. El banco inicial compartido mantiene refs1→2→2 antes de la retirada, cuerpos2 y pending0. Las esperas READY/commit conservan progreso de fuente y GPU; picking, ausencia, imagen y drenaje reales. Se revisan las13 capturas: liquidación, endpoint y ausencia en cada perfil, más el control.

| Perfil/control | IDs invariantes conservados | Retiros Home | Mayor intervalo amplio ms |
| --- | ---: | ---: | ---: |
| olderMale | 576 | 2 | 190.700 |
| olderFemale | 576 | 2 | 301.075 |
| youngMale | 585 | 2 | 469.900 |
| youngFemale | 585 | 2 | 296.875 |
| settlement-control | 576 | control | 173.835 |

Los intervalos amplios proceden de los historiales conservados y pueden incluir capturas u otros eventos; no son tiempo GPU ni atribución causal. Esta prueba no reconstruye los3.123 recursos, ni acredita aún su recuperación incremental global o ausencia completa de tirones. Permanecen abiertos esos criterios y los huecos históricos. Se archivan cuatro intentos GPU fallidos con sus fuentes exactas, fallos CPU intermedios y correcciones del harness; solo la matriz reconciled valida el estado final.

703 inputs probados,998 archivos de ejecución,64 inputs nativos,16 ajenos y38 A5 externos contrastados. Los cuatro documentos principales reciben únicamente esta entrada, conservando por bytes su cuerpo histórico. [Recibo y artefactos](performance/native-post-settlement-home-20261120-validation.json).

## Siguiente punto

Continuar la siguiente tarea/disponibilidad después de liquidación en la misma autoridad y cuerpo, y las cohortes, fallos/cancelación, device loss, VFX, costes y recuperación global3.123 pendientes del checklist. No repetir el regreso Home/ausencia de estos cuatro perfiles como trabajo pendiente. Investigar código fuente consolidado antes de cada mecanismo, con adaptación a los dueños y fronteras existentes.
