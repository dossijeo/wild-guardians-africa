# Admisión y relevo de control para Task25

Task25 utiliza la misma transacción de admisión que Stroll12 y Farm24. La autoridad conserva la plantilla que preparó el consumidor y exige un recibo de ese tipo para iniciar el cierre. Después de la espera, revalida la propuesta nativa. Confirma la pose y publica el recibo final si la revalidación conserva los propietarios de los recursos.

El canal directo distingue la plantilla, la aceptación de la espera y la atestación confirmada. Rechaza un recibo que mezcle familias. La liberación de Task25 exige una única atestación proyectada para la frontera confirmada y el mismo conjunto de actores y cuerpos. El recibo acompaña al único paquete que preparó la parada.

Chromium consulta el progreso del cerrojo sobre el estado del búfer identificado por el token y retira las esperas sólo al avanzar el contador correspondiente. Wild Guardians conserva la frontera del canal y el permiso de presentación existentes. El nuevo tipo pasa por esas comprobaciones de identidad y vigencia. [Código de Chromium](https://github.com/chromium/chromium/blob/128.0.6613.119/gpu/command_buffer/service/sync_point_manager.cc#L259-L295) · [Resolución de tokens](https://github.com/chromium/chromium/blob/128.0.6613.119/gpu/command_buffer/service/sync_point_manager.cc#L407-L428).

Las dos pruebas nuevas usan autoridad WASM y un canal directo real. El recorrido válido avanza la Task durante la preparación y confirma la pose actual sin cambios de chunks. La prueba adversa mezcla un campo de Farm24 en el recibo de espera y verifica que el cuerpo siga en marcha y que la reserva se cancele. El receptor de la prueba representa la espera de la GPU con un doble.

Quedan habilitar el tipo de paquete en Surface y Host, validar su primer dibujo y conectar el disparo ordinario desde Game. Los criterios e-R3, f-R4 y C4 permanecen abiertos.

Las dos pruebas iniciales fallaron porque faltaba la entrada Task25. La selección final pasó 245 pruebas en 20 archivos y la compilación de producto terminó correctamente. Se conservaron los binarios WASM. [Evidencia de validación](performance/native-task-stop-admission-20261120/manifest.json).
