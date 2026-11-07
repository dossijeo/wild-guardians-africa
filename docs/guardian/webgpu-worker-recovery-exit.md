# Salida de recuperación de bestias en Worker

El Worker de simulación ya utiliza caídas y recuperaciones precocinadas como
alternativa cuando no hay capacidad para otro cuerpo Rapier. Tras liberar la
recuperación, el rig aplica `BeastRecoveryExit`, una mezcla visual existente
que antes no se publicaba en el canal de poses compacto. La presentación podía
pasar directamente a caminar y omitir esa mezcla.

Mientras dura, el Worker envía la pose con `visualTransition: recovery-exit`.
El receptor solo acepta ese marcador para una bestia existente que ya no esté
en `magicDown`. No altera la posición lógica, las colisiones ni la navegación.
Un nuevo Attack se permite conforme a las reglas existentes: su impacto
provisional desplaza la mezcla, y una pose física confirmada tiene prioridad.
Al terminar la mezcla, el rig normal o su animación GPU recuperan el control.

Las pruebas cubren el rig real del Worker, la validación de identidades, la
entrega ordenada al renderer y la prioridad de un nuevo impacto. Usan un
renderer simulado; falta validar la transición en WebGPU real, con pendientes,
muros y otras bestias. No se garantiza ausencia de penetraciones visuales ni
se atribuye una mejora de rendimiento. La caída provisional QA y su corrección
de terreno siguen desactivadas: aún no certifican contactos con muros o cuerpos.
La mezcla de salida es visual y no se guarda como checkpoint; si se restaura
la partida durante sus 300 ms, se retoma directamente la pose lógica guardada.
