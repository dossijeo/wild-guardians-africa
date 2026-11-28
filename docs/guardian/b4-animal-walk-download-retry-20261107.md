# Reintento de caminata precocinada para animales

Un fallo de descarga transitorio ya no deja a la bestia indefinidamente en la presentación CPU si su estado confirmado no cambia. El roster conserva el rig y programa hasta tres reintentos, con esperas de 5, 10 y 20 segundos. Un único temporizador coordina las bestias afectadas; el catálogo existente sigue compartiendo las descargas por especie. Al retirar una bestia se elimina su solicitud y al cerrar el roster se cancela el temporizador. Un cambio de estado permite reiniciar la política anterior sin cambiar la simulación.

La política afecta a fallos de descarga, no a errores de admisión gráfica ni a cancelaciones por poses físicas. Tras agotar los reintentos se conserva el fallback CPU. Las pruebas usan recursos y renderizador simulados; aún no demuestran la transición visual en WebGPU real ni una mejora de rendimiento integrada.
