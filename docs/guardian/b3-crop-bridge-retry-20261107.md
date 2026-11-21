# Recuperación de puentes de crecimiento

Si falla la descarga de los puentes de crecimiento, el roster conserva las etapas normales y vuelve a solicitar la biblioteca una sola vez tras una breve espera, siempre que sigan existiendo cultivos inmaduros. El cierre cancela la espera. Una biblioteca incompleta no se publica: se comprueban todas sus parejas de etapas y se liberan los recursos cargados antes de intentar de nuevo.

Las pruebas cubren una descarga fallida seguida de recuperación y la retirada de la demanda al madurar la planta. No se ha validado todavía en WebGPU real ni medido el coste visual de la transición.
