# Recuperación de recursos VFX

Los efectos de agricultura, combate, escudos y el aura del guardián comparten un atlas visual. Si su descarga o preparación falla temporalmente, la presentación vuelve a solicitarlo mientras exista un efecto que lo necesite; limita los intentos a uno por segundo y detiene las solicitudes cuando el efecto desaparece o se cierra el Worker. Una solicitud explícita de preparación puede reintentarlo inmediatamente.

Los perfiles de emisores de riego siguen la misma política mientras haya una tarea de riego activa. Se conserva la comprobación de identidad de perfiles y el estado autoritativo no cambia. El efecto se crea a partir del estado y tiempo confirmados cuando sus recursos llegan; si la tarea o efecto ya terminó, no se inventa otro. La recuperación de checkpoints sigue rechazando perfiles ausentes o incompatibles.

Las pruebas usan fallos de descarga y reloj simulados para comprobar espera, reintento, cancelación, carga de atlas y riego sin alterar la simulación. No demuestran primera aparición en WebGPU real ni mejora de tiempos de fotograma.
