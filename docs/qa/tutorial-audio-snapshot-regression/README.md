# Referencia exacta tras el audio de finalización del tutorial

La CI 37409760232 del commit badad02 falló en la referencia SHA-256 de `tests/crop-lifecycle.test.js`. El evento `TutorialCompleted` añadido en 596805a incrementa una vez el contador compartido de secuencia cuando el trabajador entrega físicamente la primera caja.

Se ejecutó de nuevo la misma estrategia: un día, seed 712, olderMale, mixed y middayHiring. La comparación completa con el estado histórico conservado en `../harvest-regression-revision/revised-state.json.gz` arroja 263 diferencias, todas incrementos de una unidad en secuencia, valores created de tareas e identificadores de eventos/ataques/mensaje. No cambia ningún otro campo: economía, cultivos, trabajadores, colas salvo created, azar ni trayectorias. La comparación verifica cada diferencia, no solamente el resultado económico.

`comparison.json` conserva ambas huellas y todos los cambios. `current-state.json.gz` guarda los bytes exactos de la nueva referencia, con gzip mtime cero. La referencia histórica no se modifica. El test mantiene una huella exacta del estado completo, igualdad entre política predeterminada y explícita de doce plantas, contratación adicional pagada y entregas físicas. No se ajustan parámetros de balance ni se relaja la estrategia responsable.

Validación local: 69 pruebas dirigidas correctas (crop-lifecycle, intensive-farm-policy, tutorial-complete-audio y structure-detail-audio); verify:audio-runtime correcto para 21 pistas/550 ventanas y 126 SFX. La CI completa del siguiente push todavía debe confirmar el conjunto.
