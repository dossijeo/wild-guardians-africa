# Reintento del registro de presentación del tutorial

El puente de tutorial del Worker conserva la identidad de la presentación mientras el comando autoritativo está pendiente. Si el comando falla de forma transitoria, permite un nuevo intento tras un segundo, en vez de darlo por registrado para siempre; un rechazo tardío no invalida otro mensaje posterior. La presentación sigue devolviéndose inmediatamente y la simulación conserva la autoridad del registro.

Las pruebas de contrato cubren el fallo, el límite de reintentos y el cambio de mensaje. La integración visual y la disponibilidad del Worker durante una partida WebGPU quedan pendientes de validación en navegador.
