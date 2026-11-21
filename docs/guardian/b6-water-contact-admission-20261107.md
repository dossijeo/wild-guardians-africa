# Admisión de ondas de pasos

Las ondas instanciadas sobre el agua se admiten antes de aparecer y se ocultan si cambia la revisión estructural de los pases. Si una preparación falla, se reintenta como máximo una vez por segundo mientras queden contactos visibles; cuando el efecto termina no se solicitan recursos de nuevo. Las posiciones y edades de los contactos siguen procediendo del tiempo confirmado de simulación, y el cierre cancela la preparación.

La prueba de contrato cubre fallo transitorio, espera, publicación, invalidación y nueva admisión con un compilador simulado. No verifica el primer dibujo en WebGPU real ni demuestra una mejora de rendimiento; estas comprobaciones quedan para la validación integrada.
