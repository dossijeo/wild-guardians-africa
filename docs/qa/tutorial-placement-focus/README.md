# Encuadre de la primera colocación guiada

Elegir la herramienta de centro mientras aún se lee la introducción no proporcionaba un destino de cámara: la mano aparece después, al avanzar el tutorial. Ahora la primera aparición de cada destino de guía también centra la cámara. El centrado no se repite cada frame, al ocultar/reabrir un panel ni tras mover la cámara manualmente. Elegir explícitamente la herramienta conserva su centrado previo. La memoria de destinos pertenece a cada escena mediante WeakMap; no se guarda en la partida ni retiene escenas descartadas.

## Evidencia

- 38 pruebas dirigidas y 116 ampliadas correctas de tutorial, manos, cámara, incursiones y superficies de interfaz.
- Regresión específica: herramienta seleccionada en introducción, ninguna cámara desplazada todavía; al aparecer la guía del centro, un único desplazamiento. Cien actualizaciones posteriores y ocultar/mostrar la guía no repiten el centrado. El estado serializado permanece idéntico. Otro caso comprueba destinos nuevos, escenas nuevas y reselección explícita.
- Aplicación real en navegador integrado, Sabana/Mapungubwe horizontal de 1280 × 720: centro y brote señalados en (640,364), dentro del encuadre. El centro se coloca sin arrastrar previamente y cobra 800 monedas. Después de arrastrar la cámara, el punto del brote queda en (480,364), sin regresar al centro. `native.json` conserva diagnóstico; `center-guide.jpg` y `plant-guide.jpg` muestran ambas guías.
- Build y paquete correctos: 587 archivos, 388.198.159 bytes, 859 enlaces relativos y 20 GLB distribuidos. Catálogo SFX regenerado sin cambios de asignación.

La regresión de herramienta elegida durante la introducción está probada con los métodos reales de escena y estado en Node; la captura de navegador corresponde a selección durante el paso de centro, después del avance automático de la introducción. No presentar esa captura como reproducción del retraso original. Esta verificación tampoco acredita todas las culturas, orientaciones ni un dispositivo móvil físico.
