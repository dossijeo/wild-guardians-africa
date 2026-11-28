# Control de la pose retenida de Task25

El controlador de rutas conserva el cuerpo de la Task en el registro de su asignación después de admitir Task14. Una reanudación tras una suspensión conserva esa identidad si su recibo demuestra el mismo cuerpo y la misma asignación de origen. El reloj de parada reconoce el selector de Task25 y utiliza los campos de pose del protocolo común.

La preparación comprueba el cuerpo de origen junto a la familia, la ruta y la asignación. El controlador sólo instala la pose después de recibir la revocación exacta y el reloj que la cubre. Un recibo incompleto o un cuerpo distinto se rechazan antes de cambiar los registros. La pose instalada conserva la fase de locomoción calculada en WASM.

En Chromium 128, `SyncPointManager` obtiene el estado por espacio de nombres y búfer de comandos antes de consultar o liberar el contador de sincronización. Las esperas inválidas no ejecutan su callback. Wild Guardians aplica la misma separación entre identidad y progreso en el controlador existente, mediante la identidad de asignación, la revocación y el reloj causal. [Código de Chromium](https://github.com/chromium/chromium/blob/128.0.6613.119/gpu/command_buffer/service/sync_point_manager.cc#L407-L428) · [Validación de la espera](https://github.com/chromium/chromium/blob/128.0.6613.119/gpu/command_buffer/service/sync_point_manager.cc#L462-L478).

Las tres pruebas ejercitan WASM, los cambios de intención ordenados y el controlador de rutas. Verifican el rechazo antes del reloj de revocación, el rechazo por falta de proyección, el rechazo de otro cuerpo y de una Task sin admisión, y la continuidad de la misma Task tras una reanudación nativa. La confirmación en los fixtures usa el ABI nativo y la instalación directa del recibo en el controlador.

Quedan conectar los recibos y la pose al consumidor real en Surface y Host, y verificar el disparo desde Game y la adopción de Home por el mismo cuerpo. Los criterios e-R3, f-R4 y C4 siguen abiertos.

Las dos pruebas iniciales fallaron por la ausencia de la entrada Task25 en el controlador. La selección final pasó 330 pruebas en 26 archivos y la compilación de producto terminó correctamente. Los módulos WASM se conservaron. [Evidencia de validación](performance/native-task-stop-control-20261120/manifest.json).
